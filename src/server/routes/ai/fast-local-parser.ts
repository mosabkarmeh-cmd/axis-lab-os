import type { Request, Response } from "express";
import * as core from "../../server-core.ts";
import { normalizeArabicAndDialect } from "./local-chat.ts";
const { CUSTOMERS, SETTINGS } = core;

export function handleFastLocalParserAction(action: unknown, payload: any, req: Request, res: Response): boolean {
  switch (String(action)) {
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
    
    default:
      return false;
  }
  return true;
}
