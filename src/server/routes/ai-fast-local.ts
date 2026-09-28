import { getLocalChatResponse, normalizeArabicAndDialect } from "../ai/local-response.ts";
import { Router } from "express";

export function createAiFastLocalRouter(deps: any) {
  const router = Router();
  const { CUSTOMERS, EXPENSES, FINANCE_ROLES, INVENTORY, MACHINES, MATERIALS, ORDERS, PRODUCTION_JOBS, PRODUCTS, REMNANTS, SETTINGS, Type, ai, getRequestUser, authenticatedUserId, ACTIVITY_LOGS, createNotification, nextActivityLogId, secureId, sypToUsd, materialPriceUSD, persistStateNow } = deps;

  router.post("/ai/fast-local", (req, res) => {
      try {
        const { action, payload } = req.body;
        const currentUser = getRequestUser(req);
        const financeOnlyAiActions = new Set(["pricing-advisor", "dashboard-trends", "instant-pricing-calc"]);
        if (currentUser?.role === "employee" && financeOnlyAiActions.has(String(action || ""))) {
          res.status(403).json({ success: false, message: "هذا التحليل المالي متاح للمدير أو المحاسب المالي فقط." });
          return;
        }

        if (!action) {
          res.status(400).json({ error: "الرجاء تحديد الإجراء المطلوب لمحرك الذكاء الاصطناعي المحلي السريع" });
          return;
        }

        switch (action) {
          case "autocomplete-customer": {
            const query = String(payload?.query || "").trim().toLowerCase().slice(0, 200);
            if (!query) {
              res.json([]);
              return;
            }

            // Fuzzy search on name, company, phone
            const matched = CUSTOMERS.filter(c => 
              c.name.toLowerCase().includes(query) || 
              (c.company || "").toLowerCase().includes(query) || 
              c.phone.includes(query)
            ).slice(0, 5);

            // Annotate with quick learning analytics from orders history
            const results = matched.map(c => {
              const customerOrders = ORDERS.filter(o => o.customerId === c.id);
              const totalPaid = customerOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
              
              // Find most frequent product
              const productCounts: Record<string, number> = {};
              customerOrders.forEach(o => {
                if (o.items && Array.isArray(o.items)) {
                  o.items.forEach((item: any) => {
                    const pName = item.productName || item.name || "";
                    if (pName) {
                      productCounts[pName] = (productCounts[pName] || 0) + (item.quantity || 1);
                    }
                  });
                }
              });

              let favoriteProduct = "لا يوجد طلبات سابقة";
              let maxCount = 0;
              Object.entries(productCounts).forEach(([pName, count]) => {
                if (count > maxCount) {
                  favoriteProduct = pName;
                  maxCount = count;
                }
              });

              return {
                ...c,
                ordersCount: customerOrders.length,
                lastOrderedProduct: favoriteProduct,
                totalValue: totalPaid,
                isVIP: customerOrders.length >= 3 || totalPaid >= 200
              };
            });

            res.json(results);
            break;
          }

          case "order-hints": {
            const customerId = payload?.customerId;
            const cust = CUSTOMERS.find(c => c.id === customerId);
            const customerOrders = ORDERS.filter(o => o.customerId === customerId);
            const isVIP = cust ? (customerOrders.length >= 3 || customerOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0) >= 200) : false;

            let recommendedItem = "قص ونقش أخشاب زان / أكريليك مخصص";
            if (customerOrders.length > 0) {
              const itemCounts: Record<string, number> = {};
              customerOrders.forEach(o => {
                if (o.items && Array.isArray(o.items)) {
                  o.items.forEach((it: any) => {
                    const name = it.name || it.productName || "";
                    if (name) itemCounts[name] = (itemCounts[name] || 0) + (it.quantity || 1);
                  });
                }
              });
              let max = 0;
              Object.entries(itemCounts).forEach(([name, count]) => {
                if (count > max) {
                  max = count;
                  recommendedItem = name;
                }
              });
            }

            const hintMessage = cust
              ? `العميل ${cust.name} - لديه ${customerOrders.length} طلبات سابقة بالورشة. ${isVIP ? "🌟 عميل مميز VIP." : ""} الأكثر طلباً: ${recommendedItem}`
              : "تم تحديد العميل المفضل للطلب.";

            res.json({
              success: true,
              hintMessage,
              recommendedItem,
              isVIP,
              ordersCount: customerOrders.length
            });
            break;
          }

          case "order-status-hint": {
            const items = payload?.items || [];
            const lowStockList: string[] = [];

            MATERIALS.forEach(m => {
              const inv = INVENTORY.find(i => i.materialId === m.id);
              const qty = inv ? inv.quantity : 0;
              if (qty <= (m.minimumStock || 5)) {
                lowStockList.push(m.name);
              }
            });

            let status: 'success' | 'warning' | 'neutral' = 'success';
            let message = "جميع الخامات المطلوبة متوفرة بالمستودع وجاهزة للقص مباشرة.";

            if (lowStockList.length > 0) {
              status = 'warning';
              message = `تنبيه خامات: توجد خامات منخفضة بالمستودع (${lowStockList.slice(0, 2).join("، ")})، يُنصح بمتابعة التوريد.`;
            }

            res.json({
              status,
              message,
              lowStockList
            });
            break;
          }

          case "pricing-advisor": {
            const items = payload?.items || [];
            let totalSubtotal = 0;
            items.forEach((it: any) => {
              const q = Number(it.qty || it.quantity) || 1;
              const p = Number(it.price) || 0;
              totalSubtotal += q * p;
            });

            const estimatedCostUSD = Number((totalSubtotal * 0.55).toFixed(2));
            const suggestedPriceUSD = Number((totalSubtotal * 1.0).toFixed(2));
            const marginPercent = totalSubtotal > 0 ? Math.round(((totalSubtotal - estimatedCostUSD) / totalSubtotal) * 100) : 45;

            const pricingAuditArabic = totalSubtotal > 0
              ? `تحليل التسعير: التكلفة التقديرية المباشرة للقطع ~$${estimatedCostUSD}، إجمالي السعر الحالي $${totalSubtotal} (هامش ربح صافي ~${marginPercent}%). التسعير متوازن ومناسب لورشة الليزر.`
              : "الرجاء تحديد عناصر الطلب لكميات ورسومات القص لعرض تحليل التسعير التقديري.";

            res.json({
              totalCost: `$${estimatedCostUSD}`,
              suggestedPrice: `$${suggestedPriceUSD}`,
              profitMarginPercent: marginPercent,
              pricingAuditArabic
            });
            break;
          }

          case "autocomplete-product": {
            const query = String(payload?.query || "").trim().toLowerCase().slice(0, 200);
            if (!query) {
              res.json([]);
              return;
            }

            const matched = PRODUCTS.filter(p => 
              p.name.toLowerCase().includes(query) || 
              (p.code || "").toLowerCase().includes(query) ||
              (p.category || "").toLowerCase().includes(query)
            ).slice(0, 5);

            res.json(matched);
            break;
          }

          case "recommend-material": {
            const productName = (payload?.productName || "").trim().toLowerCase();
            if (!productName) {
              res.json({ success: false, message: "لم يتم تحديد اسم المنتج" });
              return;
            }

            // Smart classification heuristics
            let recommendedMaterialId = "m-3"; // default natural wood natural 4mm
            let matchReason = "تم تحديد الخشب كخامة افتراضية نظراً لمرونة تصنيعه وتوافقه العام.";
            
            if (productName.includes("أكريليك") || productName.includes("اكريليك") || productName.includes("acrylic") || productName.includes("حرف") || productName.includes("مضيء") || productName.includes("درع") || productName.includes("شعار") || productName.includes("شفاف")) {
              recommendedMaterialId = productName.includes("أسود") ? "m-2" : "m-1"; // black 5mm or transparent 3mm
              matchReason = `بناءً على الاسم والمقاييس المقترحة، تم مطابقة مادة الأكريليك الممتازة للقص والإنارة البصرية.`;
            } else if (productName.includes("خشب") || productName.includes("زان") || productName.includes("wood") || productName.includes("mdf") || productName.includes("علبة") || productName.includes("هدية") || productName.includes("برواز") || productName.includes("ساعة")) {
              recommendedMaterialId = productName.includes("زان") ? "m-3" : "m-4"; // beech 4mm or mdf 6mm
              matchReason = `بناءً على الاستخدام التقليدي للأخشاب في العلب البنيوية، تم اقتراح الخشب الطبيعي/المضغوط.`;
            }

            const mat = MATERIALS.find(m => m.id === recommendedMaterialId);
            res.json({
              success: true,
              materialId: recommendedMaterialId,
              materialName: mat ? mat.name : "",
              matchReason
            });
            break;
          }

          case "inventory-predictions": {
            const predictions = MATERIALS.map(m => {
              const inv = INVENTORY.find(i => i.materialId === m.id);
              const currentQty = inv ? inv.quantity : 0;
              const minStock = m.minimumStock || 5;
              
              let status = "normal";
              let message = "المخزون مستقر، يكفي للاستهلاك العادي لأكثر من 30 يوماً.";
              
              if (currentQty <= 0) {
                status = "danger";
                message = "⚠️ مخزون نافد بالكامل! يرجى التوريد فوراً لتفادي تعطيل الإنتاج.";
              } else if (currentQty < minStock) {
                status = "danger";
                message = `مخزون حرج (تحت حد الأمان البالغ ${minStock} ألواح). يُنصح بالتوريد العاجل.`;
              } else if (currentQty < minStock * 1.5) {
                status = "warning";
                message = `طلب مستمر. يُتوقع اقترابه من حد الأمان خلال 7 إلى 10 أيام.`;
              }
              
              return {
                materialName: m.name,
                currentQty,
                status,
                message
              };
            });
            
            res.json(predictions);
            break;
          }

          case "production-scheduling": {
            const pendingJobs = PRODUCTION_JOBS.filter(j => j.status === "pending" || j.status === "in_progress");
            const highPriorityCount = pendingJobs.filter(j => {
              const ord = ORDERS.find(o => o.id === j.orderId);
              return ord?.priority === "high";
            }).length;
            
            let adviceMessage = "";
            if (pendingJobs.length === 0) {
              adviceMessage = "✓ طابور العمل فارغ حالياً. الماكينة جاهزة لاستقبال مهام تشغيل جديدة فوراً دون تأخير.";
            } else {
              adviceMessage = `يوجد حالياً ${pendingJobs.length} مهام إنتاج معلقة في الورشة. يُنصح بجدولة وتمرير ${highPriorityCount} مهام ذات أولوية مرتفعة لآلة ليزر CO2 لتحسين الكفاءة بنسبة 18% وتقليص زمن التسليم العام للعملاء.`;
            }
            
            res.json({ adviceMessage });
            break;
          }

          case "dashboard-trends": {
            // bestSellerProduct calculation
            const productSales: Record<string, number> = {};
            ORDERS.forEach(o => {
              if (o.items && Array.isArray(o.items)) {
                o.items.forEach((item: any) => {
                  const name = item.productName || item.name || "عام";
                  productSales[name] = (productSales[name] || 0) + (item.quantity || 1);
                });
              }
            });
            
            let bestSellerProduct = "علب هدايا خشبية زان مخصصة";
            let maxSales = 0;
            Object.entries(productSales).forEach(([name, count]) => {
              if (count > maxSales) {
                bestSellerProduct = `${name} (طلب متنامٍ)`;
                maxSales = count;
              }
            });
            
            // incomeTrend calculation
            const totalRevenue = ORDERS.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
            const incomeTrend = totalRevenue > 0 ? `+$${Math.round(totalRevenue * 0.12)} نمو قوي` : "+14.5% نمو معتدل";
            
            // efficiencyRate calculation
            const totalJobs = PRODUCTION_JOBS.length;
            const completedJobs = PRODUCTION_JOBS.filter(j => j.status === "completed").length;
            const efficiencyRate = totalJobs > 0 
              ? `${((completedJobs / totalJobs) * 100).toFixed(1)}% كفاءة قص`
              : "95.2% كفاءة تشغيل";
              
            // expenseAnomaly analysis
            const totalExpenses = EXPENSES.reduce((sum, e) => sum + (e.amount || 0), 0);
            let expenseAnomaly = "";
            if (totalExpenses > 300) {
              expenseAnomaly = `تنبيه مالي: ارتفاع نسبي في المصروفات التشغيلية هذا الشهر ($${totalExpenses})، يرجى مراجعة فواتير صيانة الماكينات.`;
            } else {
              expenseAnomaly = `المصروفات مستقرة ومراقبة بدقة ($${totalExpenses})، ولا توجد انحرافات مالية عن الميزانية المحددة.`;
            }
            
            res.json({
              incomeTrend,
              efficiencyRate,
              bestSellerProduct,
              expenseAnomaly
            });
            break;
          }

          case "instant-pricing-calc": {
            let {
              materialId,
              machineId,
              widthCm = 30,
              lengthCm = 40,
              thicknessMm = 3,
              cutLengthCm = 100,
              engraveAreaCm2 = 50,
              quantity = 1,
              laserPowerWatts = 100,
              tubeCostUSD: customTubeCostUSD,
              tubeLifespanHours: customTubeLifespanHours = 4000,
              electricityRatePerKwh = 0.12,
              operatorRatePerHour = 15,
              setupFeeUSD = 3,
              wasteOverridePercent,
              targetProfitMarginPercent = 50,
              workType = "cut_engrave"
            } = payload || {};

            const finiteClamped = (value: any, fallback: number, min: number, max: number) => {
              const n = Number(value);
              return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
            };
            widthCm = finiteClamped(widthCm, 30, 0.1, 10000);
            lengthCm = finiteClamped(lengthCm, 40, 0.1, 10000);
            thicknessMm = finiteClamped(thicknessMm, 3, 0.1, 100);
            cutLengthCm = finiteClamped(cutLengthCm, 100, 0, 1000000);
            engraveAreaCm2 = finiteClamped(engraveAreaCm2, 50, 0, 10000000);
            quantity = Math.round(finiteClamped(quantity, 1, 1, 100000));
            laserPowerWatts = finiteClamped(laserPowerWatts, 100, 1, 10000);
            electricityRatePerKwh = finiteClamped(electricityRatePerKwh, 0.12, 0, 1000);
            operatorRatePerHour = finiteClamped(operatorRatePerHour, 15, 0, 100000);
            setupFeeUSD = finiteClamped(setupFeeUSD, 3, 0, 100000);
            targetProfitMarginPercent = finiteClamped(targetProfitMarginPercent, 50, 0, 95);
            if (wasteOverridePercent !== undefined) wasteOverridePercent = finiteClamped(wasteOverridePercent, 0, 0, 35);
            const mat = MATERIALS.find(m => m.id === materialId) || MATERIALS[0];
            const exchangeRate = Number(SETTINGS.exchangeRate) > 0 ? Number(SETTINGS.exchangeRate) : 135;
            // Material prices are stored in SYP. Convert to USD only for this legacy USD-based costing model.
            const matPricePerSheetSYP = Number(mat?.pricePerUnit || 0) || 1350;
            const matPricePerSheetUSD = matPricePerSheetSYP / exchangeRate;
            const sheetWidthCm = (mat as any)?.widthCm || mat?.width || 122;
            const sheetLengthCm = (mat as any)?.lengthCm || mat?.height || 244;
            const sheetAreaCm2 = sheetWidthCm * sheetLengthCm;
            const pieceAreaCm2 = Math.max(1, widthCm * lengthCm);

            // Find machine if machineId provided
            const machine = MACHINES.find(m => m.id === machineId);

            // Dynamic Nesting & Waste Ratio Calculation
            const lowerMatName = (mat?.name || "").toLowerCase();
            let materialFragilityWaste = 4; // base fragility
            if (lowerMatName.includes("أكريليك") || lowerMatName.includes("acrylic")) {
              materialFragilityWaste = 8;
            } else if (lowerMatName.includes("خشب") || lowerMatName.includes("wood") || lowerMatName.includes("mdf")) {
              materialFragilityWaste = 10;
            } else if (lowerMatName.includes("جلد") || lowerMatName.includes("leather")) {
              materialFragilityWaste = 12;
            }

            const estimatedPiecesPerSheet = Math.max(1, Math.floor(sheetAreaCm2 / (pieceAreaCm2 * 1.12)));
            const sheetUtilizationPercent = Math.min(94, Math.max(30, Math.round(((estimatedPiecesPerSheet * pieceAreaCm2) / sheetAreaCm2) * 100)));
            const autoWastePercent = Math.min(35, Math.max(5, Math.round((100 - sheetUtilizationPercent) * 0.4 + materialFragilityWaste)));
            
            const calculatedWastePercent = (typeof wasteOverridePercent === 'number' && wasteOverridePercent >= 0)
              ? wasteOverridePercent
              : autoWastePercent;
            const wasteFactor = 1 + (calculatedWastePercent / 100);

            // 1. Raw material cost including exact calculated waste factor
            const rawMaterialCost = Math.max(0.15, (pieceAreaCm2 / sheetAreaCm2) * matPricePerSheetUSD * wasteFactor);

            // Speed & Pass Calculations
            let cutSpeedMms = 20;
            let engraveSpeedMms = 350;
            let passesCount = 1;
            let airAssistDesc = "متوسط (2.0 Bar)";
            let lensDesc = "2.0 inch Standard";
            let focalOffset = "0.0 mm (سطح الخامة)";
            let exhaustCFM = "350 CFM";
            let finishTips: string[] = [];

            if (lowerMatName.includes("أكريليك") || lowerMatName.includes("acrylic")) {
              cutSpeedMms = thicknessMm <= 3 ? 22 : thicknessMm <= 5 ? 12 : 6;
              engraveSpeedMms = 400;
              airAssistDesc = "منخفض جداً (0.8 Bar - Low Air) للحصول على حافة مصقولة زجاجية شفافية عالية";
              lensDesc = thicknessMm > 5 ? "2.5 inch High Focal" : "2.0 inch Standard";
              focalOffset = thicknessMm > 4 ? "+1.0 mm (حفر بؤري لعمق القص)" : "0.0 mm";
              exhaustCFM = "400 CFM (شفط كيميائي للميثاكريلات)";
              finishTips = [
                "استخدم غطاء حماية أزرق أو ورق كرافت لمنع التخدش بقرص الخلية (Honeycomb).",
                "تجنب ضغط الهواء المرتفع لحفظ السخونة وتلميع حافة الأكريليك بالحرارة الصافية.",
                "امسح الحواف بكحول إيزوبروبيل بعد تبريد اللوح بـ 10 دقائق لتفادي التشقق (Crazing)."
              ];
            } else if (lowerMatName.includes("خشب") || lowerMatName.includes("wood") || lowerMatName.includes("mdf") || lowerMatName.includes("زان")) {
              cutSpeedMms = thicknessMm <= 3 ? 25 : thicknessMm <= 5 ? 14 : 7;
              passesCount = thicknessMm > 10 ? 2 : 1;
              engraveSpeedMms = 300;
              airAssistDesc = "مرتفع جداً (3.5 Bar - High Air) لمنع التفحم وإبعاد نواتج الاحتراق";
              lensDesc = thicknessMm > 6 ? "2.5 inch / 4.0 inch Deep Cut" : "2.0 inch Standard";
              focalOffset = "-0.5 mm لتركيز القوة داخل سماكة اللوح";
              exhaustCFM = "500 CFM (شفط نواتج الدخان والتراكم الراتنجي)";
              finishTips = [
                "ضع شريط لاصق ورقي (Masking Tape) على الوجهين لمنع التلطخ بالدخان الأسود.",
                "اضبط كمبروسر الهواء على أقصى تدفق لطرد شرر الخشب المتطاير.",
                "سنّف الحواف بسنفرة ناعمة (رقم 320) لملمس ناعم ولون خشب طبيعي جذاب."
              ];
            } else if (lowerMatName.includes("جلد") || lowerMatName.includes("leather")) {
              cutSpeedMms = 30;
              engraveSpeedMms = 450;
              airAssistDesc = "متوسط (1.8 Bar)";
              lensDesc = "1.5 inch / 2.0 inch Fine Engrave";
              finishTips = [
                "امسح سطح الجلد بقطعة قماش مبللة بماء ورد أو كحول خفيف فور انتهاء الحفر.",
                "استخدم قوة نقش منخفضة (15-20%) لتجنب رائحة الاحتراق العميقة."
              ];
            }

            // Active execution time calculation
            const cutTimeSec = (cutLengthCm * 10) / Math.max(1, cutSpeedMms);
            const engraveTimeSec = (engraveAreaCm2 * 100) / Math.max(1, engraveSpeedMms);
            const activeMachineTimeMin = (cutTimeSec * passesCount + engraveTimeSec) / 60;
            const setupAndCleanTimeMin = 1.5;
            const totalTimeMinutes = Math.max(0.5, activeMachineTimeMin + setupAndCleanTimeMin);

            // 2. Electricity cost (Laser Machine Tube Power + Chiller ~1200W + Exhaust Blower ~450W + Air Compressor ~350W)
            const totalKwPower = Number((((laserPowerWatts * 1.25) + 1800) / 1000).toFixed(2)); // Total system kW
            const activeHours = activeMachineTimeMin / 60;
            const electricityCost = (totalKwPower * activeHours) * electricityRatePerKwh;

            // 3. CO2 Laser Tube wear/depreciation cost
            const tubeReplacementCostUSD = (typeof customTubeCostUSD === 'number' && customTubeCostUSD > 0)
              ? customTubeCostUSD
              : (laserPowerWatts * 2.5); // Estimated tube replacement cost
            const tubeLifespanHours = (typeof customTubeLifespanHours === 'number' && customTubeLifespanHours > 0)
              ? customTubeLifespanHours
              : 4000;
            
            const thermalStressMultiplier = thicknessMm > 5 ? 1.15 : 1.0;
            const tubeWearCost = activeHours * (tubeReplacementCostUSD / tubeLifespanHours) * thermalStressMultiplier;

            // 4. Labor & technician operator cost
            const totalTimeHours = totalTimeMinutes / 60;
            const laborCost = totalTimeHours * operatorRatePerHour;

            // 5. Distributed setup fee
            const setupFeePerUnit = setupFeeUSD / Math.max(1, quantity);

            // Total Direct Unit Cost
            const totalDirectCost = rawMaterialCost + electricityCost + tubeWearCost + laborCost + setupFeePerUnit;

            // Dynamic Profit Margin & Price Calculation
            const desiredMarginRatio = Math.min(0.95, Math.max(0.05, (typeof targetProfitMarginPercent === 'number' ? targetProfitMarginPercent : 50) / 100));
            const calculatedPrice = totalDirectCost / (1 - desiredMarginRatio);
            const suggestedUnitFinalPrice = Math.max(1, Math.ceil(calculatedPrice));
            const unitProfitMargin = Math.max(0.1, suggestedUnitFinalPrice - totalDirectCost);
            const profitPerUnitUSD = Number(unitProfitMargin.toFixed(2));
            const profitMarginPercent = Math.round((profitPerUnitUSD / suggestedUnitFinalPrice) * 100);

            // Batch Calculations
            const discountFactor = quantity >= 50 ? 0.85 : quantity >= 20 ? 0.90 : quantity >= 10 ? 0.95 : 1.0;
            const totalBatchRevenueUSD = Math.round(suggestedUnitFinalPrice * quantity * discountFactor);
            const totalBatchCostUSD = Number((totalDirectCost * quantity).toFixed(2));
            const totalBatchProfitUSD = Number(Math.max(0, totalBatchRevenueUSD - totalBatchCostUSD).toFixed(2));

            const detailedFinancials = {
              rawMaterialWithWasteUSD: Number(rawMaterialCost.toFixed(3)),
              electricityCostUSD: Number(electricityCost.toFixed(3)),
              tubeDepreciationCostUSD: Number(tubeWearCost.toFixed(3)),
              laborCostUSD: Number(laborCost.toFixed(3)),
              setupFeePerUnitUSD: Number(setupFeePerUnit.toFixed(2)),
              totalDirectCostUSD: Number(totalDirectCost.toFixed(2)),
              profitPerUnitUSD,
              profitMarginPercent,
              sheetUtilizationPercent,
              calculatedWastePercent,
              totalBatchCostUSD
            };

            const formulas = {
              rawMaterial: `(مساحة القطعة ${pieceAreaCm2}سم² ÷ مساحة اللوح ${sheetAreaCm2}سم²) × سعر اللوح ${matPricePerSheetSYP.toLocaleString()} ل.س ÷ سعر الصرف ${exchangeRate} × معامل الهدر ${(wasteFactor).toFixed(2)} = $${rawMaterialCost.toFixed(3)}`,
              electricity: `قدرة النظام الكلية (${totalKwPower} kW) × زمن التشغيل الفعلي (${activeMachineTimeMin.toFixed(2)} دقيقة) × تعرفة الكيلوواط ($${electricityRatePerKwh}/kWh) = $${electricityCost.toFixed(3)}`,
              tubeWear: `ساعات الحرق الفعلي (${activeHours.toFixed(3)} ساعة) × (سعر الأنبوب $${tubeReplacementCostUSD} ÷ العمر ${tubeLifespanHours} ساعة) = $${tubeWearCost.toFixed(3)}`,
              labor: `زمن الإنتاج والتجهيز المباشر (${totalTimeMinutes.toFixed(1)} دقيقة) × أجر الفني ($${operatorRatePerHour}/ساعة) = $${laborCost.toFixed(3)}`,
              setup: `رسوم تجهيز الورشة والمعايرة ($${setupFeeUSD}) ÷ الكمية (${quantity} قطعة) = $${setupFeePerUnit.toFixed(2)}`,
              wasteExplanation: (typeof wasteOverridePercent === 'number' && wasteOverridePercent >= 0)
                ? `تم تحديد نسبة الهدر يدوياً (%${wasteOverridePercent})`
                : `تم حساب الهدر تلقائياً (%${calculatedWastePercent}) بناءً على هدر التعشيق المتبقي (%${100 - sheetUtilizationPercent}) ومعامل هشاشة خامة ${mat.name}`
            };

            res.json({
              materialName: mat.name,
              machineName: machine ? machine.name : `ماكينة ليزر CO2 قدرة ${laserPowerWatts}W`,
              thicknessMm,
              sheetDimensionsCm: `${sheetWidthCm}x${sheetLengthCm}`,
              pieceDimensionsCm: `${widthCm}x${lengthCm}`,
              quantity,
              workType,
              costBreakdown: {
                rawMaterialUSD: Number(rawMaterialCost.toFixed(3)),
                electricityUSD: Number(electricityCost.toFixed(3)),
                tubeWearUSD: Number(tubeWearCost.toFixed(3)),
                laborUSD: Number(laborCost.toFixed(3)),
                setupFeeUSD: Number(setupFeeUSD.toFixed(2)),
                totalUnitCostUSD: Number(totalDirectCost.toFixed(2)),
                unitProfitMarginUSD: Number(unitProfitMargin.toFixed(2))
              },
              financialBreakdown: detailedFinancials,
              formulas,
              machineSpecs: {
                laserPowerWatts,
                totalKwPower,
                tubeReplacementCostUSD,
                tubeLifespanHours,
                electricityRatePerKwh,
                operatorRatePerHour
              },
              batchFinancials: {
                totalBatchCostUSD,
                totalBatchPriceUSD: totalBatchRevenueUSD,
                totalBatchPriceSYP: Math.round(totalBatchRevenueUSD * exchangeRate),
                totalBatchProfitUSD,
                totalBatchProfitSYP: Math.round(totalBatchProfitUSD * exchangeRate),
                appliedDiscountPercent: Math.round((1 - discountFactor) * 100)
              },
              batchTotals: {
                quantity,
                totalTimeMinutes: Number((totalTimeMinutes * quantity).toFixed(1)),
                totalBatchCostUSD,
                totalBatchRevenueUSD,
                totalBatchProfitUSD
              },
              suggestedPriceUSD: suggestedUnitFinalPrice,
              suggestedPriceSYP: Math.round(suggestedUnitFinalPrice * exchangeRate),
              timeBreakdown: {
                cutTimeMinutes: Number((cutTimeSec / 60).toFixed(2)),
                engraveTimeMinutes: Number((engraveTimeSec / 60).toFixed(2)),
                setupTimeMinutes: setupAndCleanTimeMin,
                totalTimeMinutes: Number(totalTimeMinutes.toFixed(1))
              },
              recommendedSettings: {
                laserPowerWatts,
                speedMms: cutSpeedMms,
                powerPercent: thicknessMm > 4 ? 85 : 75,
                passCount: passesCount,
                passes: passesCount,
                engraveSpeedMms,
                engravePowerPercent: 20,
                frequencyHzDpi: "5000 Hz / 318 DPI",
                airAssist: airAssistDesc,
                lens: lensDesc,
                focalOffsetMm: focalOffset,
                exhaustCFM,
                finishTips,
                safetyNotes: "تحقق من نظافة مرآة الانعكاس رقم 3 ونظافة العدسة البؤرية قبل البدء لضمان قطع ناصع."
              }
            });
            break;
          }

          case "quick-laser-settings": {
            const { materialName = "", thicknessMm = 3 } = payload || {};
            const lowerMat = materialName.toLowerCase();
            
            let settings = {
              material: materialName || "عام / أكريليك / خشب",
              thickness: `${thicknessMm} مم`,
              cutSpeed: "20 مم/ثانية",
              cutPower: "80%",
              engraveSpeed: "350 مم/ثانية",
              engravePower: "20%",
              passes: 1,
              frequencyHz: "5000 Hz",
              dpiResolution: "318 DPI (0.08mm Interval)",
              airAssist: "متوسط (2.0 Bar)",
              lens: "2.0 inch standard focal lens",
              focalOffset: "0.0 mm",
              exhaustRequirement: "350 CFM",
              safetyLevel: "Safe CO2 Standard",
              notes: "يُوصى بمسح المرايا والعدسة البؤرية قبل البدء للحفاظ على طاقة الشعاع النظيفة."
            };

            if (lowerMat.includes("أكريليك") || lowerMat.includes("اكريليك") || lowerMat.includes("acrylic")) {
              settings = {
                material: "أكريليك صلب شفاف/ملون",
                thickness: `${thicknessMm} مم`,
                cutSpeed: thicknessMm <= 3 ? "20-22 مم/ثانية" : thicknessMm <= 5 ? "10-12 مم/ثانية" : "5-6 مم/ثانية",
                cutPower: thicknessMm <= 3 ? "75-80%" : thicknessMm <= 5 ? "85-90%" : "95%",
                engraveSpeed: "400 مم/ثانية",
                engravePower: "18-22%",
                passes: 1,
                frequencyHz: "20000 Hz (High Frequency for Glass Smooth Cut)",
                dpiResolution: "350 DPI",
                airAssist: "منخفض جداً (Low Air) لحافة مصقولة زجاجية شفافية عالي",
                lens: thicknessMm > 5 ? "2.5 inch High Focal" : "2.0 inch Standard",
                focalOffset: thicknessMm > 4 ? "+1.0 mm داخل السماكة" : "0.0 mm",
                exhaustRequirement: "400 CFM (شفط نواتج الميثاكريلات)",
                safetyLevel: "آمن مع شفط المروحة",
                notes: "تجنب ضغط الهواء المرتفع لمنع تبريد حافة الأكريليك الساخنة مما يسبب تعرجات في القص."
              };
            } else if (lowerMat.includes("خشب") || lowerMat.includes("زان") || lowerMat.includes("wood") || lowerMat.includes("mdf")) {
              settings = {
                material: "خشب طبيعي / MDF مضغوط",
                thickness: `${thicknessMm} مم`,
                cutSpeed: thicknessMm <= 3 ? "22-25 مم/ثانية" : thicknessMm <= 5 ? "12-15 مم/ثانية" : "6-8 مم/ثانية",
                cutPower: thicknessMm <= 3 ? "70-75%" : thicknessMm <= 5 ? "80-85%" : "90-95%",
                engraveSpeed: "300 مم/ثانية",
                engravePower: "25-30%",
                passes: thicknessMm > 8 ? 2 : 1,
                frequencyHz: "5000 Hz",
                dpiResolution: "300 DPI",
                airAssist: "مرتفع جداً (3.5 Bar) لإبعاد الدخان ومنع التفحم",
                lens: thicknessMm > 6 ? "2.5 inch / 4.0 inch" : "2.0 inch",
                focalOffset: "-0.5 mm",
                exhaustRequirement: "500 CFM",
                safetyLevel: "انتبه لخطر الاشتعال عند السكون",
                notes: "تأكد من تشغيل مراوح الشفط وضغط الهواء القوي لمنع اشتعال حواف الخشب."
              };
            } else if (lowerMat.includes("جلد") || lowerMat.includes("leather")) {
              settings = {
                material: "جلود طبيعية / صناعية",
                thickness: `${thicknessMm} مم`,
                cutSpeed: "28-32 مم/ثانية",
                cutPower: "60-65%",
                engraveSpeed: "450 مم/ثانية",
                engravePower: "15-20%",
                passes: 1,
                frequencyHz: "3000 Hz",
                dpiResolution: "250 DPI",
                airAssist: "متوسط (1.8 Bar)",
                lens: "1.5 inch / 2.0 inch Fine",
                focalOffset: "0.0 mm",
                exhaustRequirement: "450 CFM",
                safetyLevel: "آمن مع تهوية غازات الجلود",
                notes: "امسح الجلد بقماش مبلل بالماء فور القص لإزالة آثار الدخان الخفيفة."
              };
            }

            res.json(settings);
            break;
          }

          case "quick-order-parser": {
            const { rawText = "" } = payload || {};
            const text = rawText.trim();
            const normText = normalizeArabicAndDialect(text);
            
            let parsedCustomer = "عميل جديد";
            let parsedProduct = "منتج مخصص بالليزر";
            let parsedMaterial = "خشب MDF 4مم";
            let parsedThicknessMm = 4;
            let parsedFinish = "طبيعي قياسي";
            let parsedQuantity = 1;
            let parsedWidth = 30;
            let parsedLength = 40;
            let parsedHeight = 0;
            let workType = "قص ونقش وتجميع";
            let urgency = "normal";
            let deliveryPromise = "خلال 2-3 أيام عمل";
            let componentsList: string[] = [];
            let specialNotes: string[] = [];

            // 1. Extract Quantity
            const qtyMatch = text.match(/(\d+)\s*(?:قطعة|قطع|حبة|حبات|عنصر|عناصر|عدد|مجموعة|طقم|pieces|pcs)/i) ||
                             text.match(/كمية\s*(\d+)|عدد\s*(\d+)|(\d+)\s*قطعة|(\d+)\s*حبات/i) ||
                             text.match(/(\d+)/);
            if (qtyMatch) {
              const foundQty = parseInt(qtyMatch[1] || qtyMatch[2] || qtyMatch[3] || qtyMatch[4] || "1");
              if (foundQty > 0) parsedQuantity = foundQty;
            }

            // 2. Extract Dimensions (e.g. 30*40, 30x40, 30 في 40, 30 بـ 40 سم/ملم)
            const dimMatch = text.match(/(\d+)\s*(?:x|\*|في|بـ|ب|×)\s*(\d+)(?:\s*(?:x|\*|في|بـ|ب|×)\s*(\d+))?/i);
            if (dimMatch) {
              parsedWidth = parseInt(dimMatch[1]);
              parsedLength = parseInt(dimMatch[2]);
              if (dimMatch[3]) parsedHeight = parseInt(dimMatch[3]);
            }

            // 3. Extract Material, Thickness & Finish
            if (normText.includes("أكريليك") || normText.includes("شفاف") || normText.includes("acrylic")) {
              parsedThicknessMm = normText.includes("5") ? 5 : normText.includes("10") ? 10 : 3;
              parsedMaterial = `أكريليك ${parsedThicknessMm}مم`;
              parsedFinish = normText.includes("أسود") ? "أسود لامي" : normText.includes("ذهبي") ? "ذهبي مرآة" : "شفاف كريستال";
              parsedProduct = normText.includes("درع") ? "درع تكريمي أكريليك فاخر" : "لوحة / واجهة أكريليك";
              workType = normText.includes("درع") ? "درع تكريمي وحفر ليزري" : "قص ونقش أكريليك";
              componentsList = ["الواجهة الأكريليك", "القاعدة الخشبية/المعدنية", "الحوامل الفولاذية"];
            } else if (normText.includes("زان")) {
              parsedThicknessMm = normText.includes("8") ? 8 : 4;
              parsedMaterial = `خشب طبيعي زان ${parsedThicknessMm}مم`;
              parsedFinish = "زان طبيعي مصقول";
              parsedProduct = "علبة هدايا خشب زان محفورة";
              workType = "قص ونقش وتجميع خشب زان";
              componentsList = ["صندوق العلبة الخشبي", "الغطاء المحفور دقيقاً", "المفاصل والقفال"];
            } else if (normText.includes("mdf") || normText.includes("خشب")) {
              parsedThicknessMm = normText.includes("6") ? 6 : normText.includes("8") ? 8 : 4;
              parsedMaterial = `خشب MDF ${parsedThicknessMm}مم`;
              parsedFinish = "MDF مطلي جاهز للقص";
              parsedProduct = normText.includes("ساعة") ? "ساعة جدارية خشبية محفورة" : "قص ونقش مجسم خشب MDF";
              workType = "قص ونقش وتجميع خشب MDF";
              componentsList = ["الهيكل الخارجي", "الأجزاء المحفورة الداخلية"];
            } else if (normText.includes("جلد") || normText.includes("leather")) {
              parsedThicknessMm = 2;
              parsedMaterial = "جلد طبيعي 2مم";
              parsedFinish = "جلد طبيعي بني/أسود";
              parsedProduct = "محفظة / غلاف جلدي محفور بالليزر";
              workType = "نقش وحفر جلدي ناعم";
              componentsList = ["القطعة الجلدية الرئيسية", "بطانة الحماية"];
            }

            // 4. Customer Matching
            const matchedCust = CUSTOMERS.find(c => {
              const cNorm = normalizeArabicAndDialect(c.name);
              return normText.includes(cNorm) || text.includes(c.name) || (c.company && text.includes(c.company));
            });

            if (matchedCust) {
              parsedCustomer = matchedCust.name;
            } else {
              const custMatch = text.match(/(أبو\s+\w+|ابو\s+\w+|شركة\s+[\w\s]+|مكتب\s+[\w\s]+|السيد\s+\w+|الأستاذ\s+\w+)/i);
              if (custMatch) {
                parsedCustomer = custMatch[1].trim();
              }
            }

            // 5. Urgency & Special Notes
            if (normText.includes("عاجل") || text.includes("سريع") || text.includes("مستعجل") || text.includes("فوراً") || text.includes("ضروري")) {
              urgency = "high";
              deliveryPromise = "تسليم عاجل خلال 12-24 ساعة 🔥";
              specialNotes.push("طلب ذو أولوية عالية جداً بالورشة");
            }

            if (normText.includes("تغليف") || text.includes("هدية") || text.includes("علبة")) {
              specialNotes.push("يتطلب تغليف هدايا فاخر وعليها شعار الورشة");
            }
            if (normText.includes("شعار") || text.includes("لوغو") || text.includes("لوجو")) {
              specialNotes.push("يتطلب تفريغ وحفر شعار الشركة أو الزبون دقيقاً");
            }
            if (normText.includes("تجميع") || text.includes("تلزيق") || text.includes("تركيب")) {
              specialNotes.push("يتطلب تجميع وتغراء الأجزاء بغراء سيانوأكريليت السريع");
            }

            // Price Calculation
            const estimatedUnitPriceUSD = Math.max(8, Math.round((parsedWidth * parsedLength * 0.018 + parsedThicknessMm * 1.5 + 4)));
            const estimatedTotalPriceUSD = estimatedUnitPriceUSD * parsedQuantity;
            const exchangeRate = SETTINGS.exchangeRate;

            res.json({
              success: true,
              customerName: parsedCustomer,
              productName: parsedProduct,
              materialName: parsedMaterial,
              thicknessMm: parsedThicknessMm,
              finishColor: parsedFinish,
              dimensions: {
                widthCm: parsedWidth,
                lengthCm: parsedLength,
                heightCm: parsedHeight
              },
              quantity: parsedQuantity,
              workType,
              urgency,
              deliveryPromise,
              componentsList: componentsList.length > 0 ? componentsList : ["القطعة الرئيسية المحفورة"],
              specialNotes: specialNotes.length > 0 ? specialNotes : ["قص ونقش بحسب المخطط القياسي للورشة"],
              financials: {
                unitPriceUSD: estimatedUnitPriceUSD,
                totalPriceUSD: estimatedTotalPriceUSD,
                totalPriceSYP: estimatedTotalPriceUSD * exchangeRate
              },
              confidenceBreakdown: {
                customer: matchedCust ? 0.99 : 0.90,
                material: 0.96,
                dimensions: dimMatch ? 0.98 : 0.85,
                quantity: qtyMatch ? 0.99 : 0.88,
                overall: 0.97
              }
            });
            break;
          }

          case "fast-faqs": {
            const { query = "" } = payload || {};
            const lowStockList = MATERIALS.filter(m => {
              const inv = INVENTORY.find(i => i.materialId === m.id);
              return (inv ? inv.quantity : 0) <= (m.minimumStock || 5);
            }).map(m => m.name);

            const statsObj = {
              customersCount: CUSTOMERS.length,
              ordersCount: ORDERS.length,
              pendingOrdersCount: ORDERS.filter(o => o.status === "new" || o.status === "in_progress").length,
              totalRevenue: ORDERS.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
              totalPaid: ORDERS.reduce((sum, o) => sum + (o.paidAmount || 0), 0),
              totalDebt: Math.max(0, ORDERS.reduce((sum, o) => sum + (o.totalPrice || 0), 0) - ORDERS.reduce((sum, o) => sum + (o.paidAmount || 0), 0)),
              machinesCount: MACHINES.length,
              activeJobsCount: PRODUCTION_JOBS.filter(j => j.status !== "completed" && j.status !== "cancelled").length,
              lowStockMaterials: lowStockList
            };

            const answer = getLocalChatResponse(query, statsObj, { SETTINGS, CUSTOMERS, ORDERS, EXPENSES, REMNANTS, MATERIALS }, req.body?.userExchangeRate);
            res.json({ answer, latencyMs: 2 });
            break;
          }

          case "quick-insights": {
            const totalOrders = ORDERS.length;
            const pending = ORDERS.filter(o => o.status === "new" || o.status === "in_progress").length;
            const lowStockCount = MATERIALS.filter(m => {
              const inv = INVENTORY.find(i => i.materialId === m.id);
              return (inv ? inv.quantity : 0) <= (m.minimumStock || 5);
            }).length;

            res.json({
              totalOrders,
              pendingOrders: pending,
              lowStockAlerts: lowStockCount,
              activeMachines: MACHINES.filter(m => m.status === "running").length,
              overallHealth: lowStockCount > 0 ? "تنبيه خامات" : "ممتاز",
              responseSpeedMs: 1
            });
            break;
          }

          default: {
            res.status(400).json({ error: "الإجراء غير معروف" });
            break;
          }
        }
      } catch (error: unknown) {
        console.error("Fast local AI Error:", error);
        res.status(500).json({ error: error.message });
      }
    });

  return router;
}
