import type { Request, Response } from "express";
import * as core from "../../server-core.ts";
import { getLocalChatResponse } from "./local-chat.ts";
const { ORDERS, CUSTOMERS, MATERIALS, INVENTORY, MACHINES, PRODUCTION_JOBS } = core;

export function handleFastLocalLaserAction(action: unknown, payload: any, req: Request, res: Response): boolean {
  switch (String(action)) {
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
    
              const answer = getLocalChatResponse(query, statsObj, req.body?.userExchangeRate);
              res.json({ answer, latencyMs: 2 });
              break;
            }
    
    default:
      return false;
  }
  return true;
}
