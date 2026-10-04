import express from "express";
import * as core from "../../server-core.ts";
import { getLocalChatResponse } from "./local-chat.ts";
import { getAiAccessScope } from "./access.ts";

const {
  ai,
  ORDERS,
  CUSTOMERS,
  MATERIALS,
  INVENTORY,
  MACHINES,
  PRODUCTION_JOBS,
} = core;

export function registerAiChatRoutes(app: express.Express) {
  app.post("/api/ai/chat", async (req, res) => {
    const { message, history } = req.body;
    const access = getAiAccessScope(req);

    if (!message) {
      res.status(400).json({ error: "يرجى كتابة رسالة للتحدث مع الذكاء الاصطناعي" });
      return;
    }

    try {
      const lowStockMaterials = MATERIALS
        .filter(material => {
          const inv = INVENTORY.find(item => item.materialId === material.id);
          const qty = inv ? inv.quantity : 0;
          return qty <= (material.minimumStock || 5);
        })
        .map(material => material.name);

      const activeJobsCount = PRODUCTION_JOBS
        .filter(job => job.status !== "completed" && job.status !== "cancelled")
        .length;
      const machinesCount = MACHINES.length;
      const customersCount = CUSTOMERS.length;
      const ordersCount = ORDERS.length;
      const pendingOrdersCount = ORDERS
        .filter(order => order.status === "new" || order.status === "in_progress")
        .length;
      const totalRevenue = ORDERS.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
      const totalPaid = ORDERS.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
      const totalDebt = Math.max(0, totalRevenue - totalPaid);

      const statsObj = {
        customersCount,
        ordersCount,
        pendingOrdersCount,
        totalRevenue: access.canViewFinancials ? totalRevenue : 0,
        totalPaid: access.canViewFinancials ? totalPaid : 0,
        totalDebt: access.canViewFinancials ? totalDebt : 0,
        machinesCount,
        activeJobsCount,
        lowStockMaterials,
        canViewFinancials: access.canViewFinancials,
        canViewCustomerPrivateData: access.canViewCustomerPrivateData,
      };

      const financialContext = access.canViewFinancials
        ? [
            `- Total Financial Revenue (Sales): $${totalRevenue.toFixed(2)}`,
            `- Total Payments Received: $${totalPaid.toFixed(2)}`,
            `- Total Remaining Debts (الذمم المدينة للزبائن): $${totalDebt.toFixed(2)}`,
          ].join("\n")
        : "- Financial figures are restricted for this role; never disclose revenue, profit, costs, prices, payments, debts, or other financial figures.";

      const systemContextPrompt = `
You are the AXIS LAB Intelligent ERP Companion (مساعد AXIS AI).
An advanced, local-first artificial intelligence system designed for CO2 Laser cutting & engraving workshops.
Your goal is to assist workshop operators, managers, accountants, and designers with operational, technical, and financial decisions.

Here is the FRESH, REAL-TIME state of the AXIS LAB database:
- Active Customers count: ${customersCount}
- Total Orders recorded: ${ordersCount}
- Pending/Processing Orders: ${pendingOrdersCount}
${financialContext}
- Machinery count: ${machinesCount} active laser CO2 systems
- Active Jobs in queue: ${activeJobsCount}
- Materials with Low Inventory (⚠️ قاربت على النفاد): ${lowStockMaterials.length > 0 ? lowStockMaterials.join(", ") : "None, all materials are well-stocked"}

Role Guidelines:
1. Always communicate in clear, helpful, highly professional Arabic (اللغة العربية الفصحى المبسطة بلكنة ورشات سورية وشرق أوسطية لطيفة ومهذبة).
2. UNDERSTAND ALL ARABIC DIALECTS & TYPOS:
   - Seamlessly comprehend Levantine/Syrian slang (e.g., "شلون", "بدنا", "قديه", "شو", "مصاري", "بدي", "عنا", "الزبون").
   - Automatically correct workshop typos and misspellings (e.g., "مداف" -> MDF, "اكربليك" -> أكريليك, "ليزؤ" -> ليزر, "مكينة" -> ماكينة).
   - Interpret informal workshop text or voice-to-text queries gracefully.
3. Answer based strictly on the provided real data.
4. If asked about laser parameters, provide appropriate speed/power suggestions based on standard CO2 laser calibration.
5. Be proactive about operational issues and low stock.
6. Never disclose data outside the caller's role scope. Never reconstruct hidden financial, cost, price, profit, payment, debt, or customer-private data.
7. Do not include any HTML; standard Markdown is allowed.
`;

      const formattedContents: Array<{
        role: "user" | "model";
        parts: Array<{ text: string }>;
      }> = [];

      if (access.role !== "employee" && Array.isArray(history)) {
        for (const turn of history) {
          if (!turn || typeof turn.text !== "string") continue;
          formattedContents.push({
            role: turn.sender === "user" ? "user" : "model",
            parts: [{ text: turn.text }],
          });
        }
      }

      formattedContents.push({
        role: "user",
        parts: [{ text: systemContextPrompt + "\n\nUser Question: \"" + String(message) + "\"" }],
      });

      if (!process.env.GEMINI_API_KEY || access.role === "employee") {
        res.json({ text: getLocalChatResponse(message, statsObj) });
        return;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: formattedContents,
      });

      res.json({ text: response.text || "لم يتمكن المساعد من توليد رد مناسب." });
    } catch (error: unknown) {
      console.warn("AI Chat API Error, falling back to local chat responder:", error);

      const lowStockMaterials = MATERIALS
        .filter(material => {
          const inv = INVENTORY.find(item => item.materialId === material.id);
          const qty = inv ? inv.quantity : 0;
          return qty <= (material.minimumStock || 5);
        })
        .map(material => material.name);

      const activeJobsCount = PRODUCTION_JOBS
        .filter(job => job.status !== "completed" && job.status !== "cancelled")
        .length;
      const machinesCount = MACHINES.length;
      const customersCount = CUSTOMERS.length;
      const ordersCount = ORDERS.length;
      const pendingOrdersCount = ORDERS
        .filter(order => order.status === "new" || order.status === "in_progress")
        .length;
      const totalRevenue = ORDERS.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
      const totalPaid = ORDERS.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
      const totalDebt = Math.max(0, totalRevenue - totalPaid);

      const statsObj = {
        customersCount,
        ordersCount,
        pendingOrdersCount,
        totalRevenue: access.canViewFinancials ? totalRevenue : 0,
        totalPaid: access.canViewFinancials ? totalPaid : 0,
        totalDebt: access.canViewFinancials ? totalDebt : 0,
        machinesCount,
        activeJobsCount,
        lowStockMaterials,
        canViewFinancials: access.canViewFinancials,
        canViewCustomerPrivateData: access.canViewCustomerPrivateData,
      };

      res.json({ text: getLocalChatResponse(message, statsObj) });
    }
  });
}
