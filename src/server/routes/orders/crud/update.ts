import express from "express";
import * as core from "../../../server-core.ts";
import { getActorId, orderForResponse } from "../response.ts";
import { asOrderItem, type OrderItem } from "../crud-shared.ts";

const {
  ORDERS,
  CUSTOMERS,
  INVOICES,
  ACTIVITY_LOGS,
  nextActivityLogId,
  persistMutationWithFastDurability,
  sypToUsd,
} = core;

export function registerOrderUpdateRoutes(app: express.Express) {
  // API - Update Order (Edit details)
  app.put("/api/orders/:id", async (req, res) => {
    const { notes, priority, items, paidAmount, customerId, deliveryDateExpected, taxPercent, discount } = req.body;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    if (order.currencyFinalizedAt && (items !== undefined || paidAmount !== undefined || taxPercent !== undefined || discount !== undefined)) {
      res.status(409).json({ error: "الطلب نهائي ومثبت مالياً؛ لا يمكن تعديل البنود أو المبالغ بعد التسليم الكامل." });
      return;
    }

    // 1. Snapshot previous state for precise audit diff
    const oldState = {
      customerId: order.customerId,
      totalPrice: order.totalPrice || 0,
      paidAmount: order.paidAmount || 0,
      remaining: order.remaining || 0,
      discount: order.discount || 0,
      taxPercent: order.taxPercent || 0,
      priority: order.priority || "normal",
      notes: order.notes || "",
      itemsCount: order.items ? order.items.length : 0,
      itemsTotalQty: order.items ? order.items.reduce((acc: number, cur: OrderItem) => acc + Number(cur.quantity || 1), 0) : 0,
    };

    if (customerId) order.customerId = customerId;
    if (priority) order.priority = priority;
    if (notes !== undefined) order.notes = notes;
    if (deliveryDateExpected) order.deliveryDateExpected = deliveryDateExpected;
    if (paidAmount !== undefined) {
      order.paidAmount = Number(paidAmount) || 0;
    }

    if (taxPercent !== undefined) order.taxPercent = Number(taxPercent) || 0;
    if (discount !== undefined) order.discount = Number(discount) || 0;

    if (items && items.length > 0) {
      order.items = items.map((rawItem, idx: number) => {
        const it = asOrderItem(rawItem);
        const qty = Number(it.quantity) || 1;
        const comp = it.completedQuantity !== undefined ? Number(it.completedQuantity) : (it.isCompleted ? qty : 0);
        return {
          id: it.id || `item-${Date.now()}-${idx}`,
          productName: it.productName,
          quantity: qty,
          completedQuantity: Math.max(0, Math.min(qty, comp)),
          isCompleted: comp >= qty,
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: qty * (Number(it.unitPrice) || 0),
          notes: it.notes || ""
        };
      });
    }

    const itemsSubtotal = order.items.reduce((acc: number, cur: OrderItem) => acc + Number(cur.totalPrice || 0), 0);
    const taxRate = order.taxPercent !== undefined ? order.taxPercent : 0;
    const discountAmt = order.discount !== undefined ? order.discount : 0;
    order.totalPrice = Math.max(0, itemsSubtotal + (itemsSubtotal * (taxRate / 100)) - discountAmt);

    order.remaining = Math.max(0, order.totalPrice - order.paidAmount);

    // Sync matching Invoice
    const matchingInv = INVOICES.find(inv => inv.orderId === order.id);
    if (matchingInv) {
      const exchangeRate = Number(order.exchangeRateAtCreation) > 0
        ? Number(order.exchangeRateAtCreation)
        : 135;

      matchingInv.totalPriceSYP = Math.round(order.totalPrice);
      matchingInv.paidAmountSYP = Math.round(order.paidAmount);
      matchingInv.remainingSYP = Math.round(order.remaining);
      matchingInv.totalPriceUSD = Number(sypToUsd(order.totalPrice, exchangeRate).toFixed(2));
      matchingInv.paidAmountUSD = Number(sypToUsd(order.paidAmount, exchangeRate).toFixed(2));
      matchingInv.remainingUSD = Number(sypToUsd(order.remaining, exchangeRate).toFixed(2));

      // Preserve the invoice's public USD fields as the canonical USD-facing values.
      matchingInv.totalPrice = matchingInv.totalPriceUSD;
      matchingInv.paidAmount = matchingInv.paidAmountUSD;
      matchingInv.remaining = matchingInv.remainingUSD;
      matchingInv.subtotal = Number(sypToUsd(itemsSubtotal, exchangeRate).toFixed(2));
      matchingInv.discount = Number(sypToUsd(discountAmt, exchangeRate).toFixed(2));
      matchingInv.taxPercent = taxRate;
      matchingInv.exchangeRateAtIssue = Number(matchingInv.exchangeRateAtIssue) > 0
        ? matchingInv.exchangeRateAtIssue
        : exchangeRate;
      matchingInv.status = order.remaining === 0
        ? "paid"
        : order.paidAmount > 0
          ? "partially_paid"
          : "unpaid";

      if (customerId) matchingInv.customerId = customerId;
      if (deliveryDateExpected) matchingInv.dueDate = deliveryDateExpected;

      matchingInv.items = order.items.map((item: OrderItem, idx: number) => {
        const quantity = Number(item.quantity) || 1;
        const unitPriceSYP = Math.round(Number(item.unitPrice) || 0);
        const totalSYP = Math.round(Number(item.totalPrice) || quantity * unitPriceSYP);
        return {
          id: item.id || `invitem-${Date.now()}-${idx}`,
          invoiceId: matchingInv.id,
          productName: item.productName,
          quantity,
          unitPriceSYP,
          totalSYP,
          unitPrice: Number(sypToUsd(unitPriceSYP, exchangeRate).toFixed(2)),
          total: Number(sypToUsd(totalSYP, exchangeRate).toFixed(2)),
          discount: 0,
          tax: 0,
          createdAt: new Date().toISOString(),
        };
      });
    }

    // 2. Compute detailed financial & operational differences
    const changeDetails: string[] = [];

    if (Math.abs(oldState.totalPrice - order.totalPrice) > 0.001) {
      const diff = order.totalPrice - oldState.totalPrice;
      const diffSign = diff > 0 ? `+` : ``;
      changeDetails.push(`تغير إجمالي السعر من ${Math.round(oldState.totalPrice).toLocaleString()} ل.س إلى ${Math.round(order.totalPrice).toLocaleString()} ل.س (الفرق ${diffSign}${Math.round(diff).toLocaleString()} ل.س)`);
    }

    if (Math.abs(oldState.paidAmount - order.paidAmount) > 0.001) {
      const diff = order.paidAmount - oldState.paidAmount;
      const diffSign = diff > 0 ? `+` : ``;
      changeDetails.push(`تغير الواصل/المقدم من ${Math.round(oldState.paidAmount).toLocaleString()} ل.س إلى ${Math.round(order.paidAmount).toLocaleString()} ل.س (الفرق ${diffSign}${Math.round(diff).toLocaleString()} ل.س)`);
    }

    if (Math.abs(oldState.remaining - order.remaining) > 0.001) {
      changeDetails.push(`تعديل المبلغ المتبقي ليصبح ${Math.round(order.remaining).toLocaleString()} ل.س (سابقاً ${Math.round(oldState.remaining).toLocaleString()} ل.س)`);
    }

    if (Math.abs(oldState.discount - order.discount) > 0.001) {
      const diff = order.discount - oldState.discount;
      const diffSign = diff > 0 ? `+` : ``;
      changeDetails.push(`تغير الخصم المالي من $${oldState.discount.toFixed(2)} إلى $${order.discount.toFixed(2)} (الفرق ${diffSign}$${diff.toFixed(2)})`);
    }

    if (Math.abs(oldState.taxPercent - order.taxPercent) > 0.001) {
      changeDetails.push(`تغيرت نسبة الضريبة من ${oldState.taxPercent}% إلى ${order.taxPercent}%`);
    }

    if (oldState.priority !== order.priority) {
      const pMap: Record<string, string> = { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة/طارئة" };
      changeDetails.push(`تغير الأولوية من [${pMap[oldState.priority] || oldState.priority}] إلى [${pMap[order.priority] || order.priority}]`);
    }

    if (oldState.customerId !== order.customerId) {
      const oldCust = CUSTOMERS.find(c => c.id === oldState.customerId)?.name || "غير محدد";
      const newCust = CUSTOMERS.find(c => c.id === order.customerId)?.name || "غير محدد";
      changeDetails.push(`تغير العميل من "${oldCust}" إلى "${newCust}"`);
    }

    const currentTotalQty = order.items ? order.items.reduce((acc: number, cur: OrderItem) => acc + Number(cur.quantity || 1), 0) : 0;
    if (oldState.itemsCount !== (order.items?.length || 0) || oldState.itemsTotalQty !== currentTotalQty) {
      changeDetails.push(`تعديل بنود وعناصر الطلب (عدد البنود: ${order.items?.length || 0} / الكمية الإجمالية: ${currentTotalQty})`);
    }

    const finalDetailsText = changeDetails.length > 0 
      ? changeDetails.join(" | ") 
      : "تحديث وحفظ بيانات وملاحظات الطلب في النظام";

    // 3. Append entry into Order Status/Audit History
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: `[تعديل ماليات وبيانات الطلب #${order.orderNumber}] ${finalDetailsText}`,
      changedAt: new Date().toISOString()
    });

    // 4. Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_ORDER",
      entityType: "Order",
      entityId: order.id,
      details: finalDetailsText,
      createdAt: new Date().toISOString()
    });

    await persistMutationWithFastDurability();
    res.locals.axisPersistScheduled = true;
    res.json(orderForResponse(req, order));
  });
}
