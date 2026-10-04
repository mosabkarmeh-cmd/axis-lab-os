import type { Request, Response } from "express";
import type { FastLocalPayload } from "./fast-local-types.ts";
import * as core from "../../server-core.ts";
const { ORDERS, CUSTOMERS, PRODUCTS, MATERIALS } = core;

export function handleFastLocalLookupAction(action: unknown, payload: FastLocalPayload, req: Request, res: Response): boolean {
  switch (String(action)) {
            case "autocomplete-customer": {
              const query = (payload?.query || "").trim().toLowerCase();
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
                    o.items.forEach((item) => {
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
    
    
            case "autocomplete-product": {
              const query = (payload?.query || "").trim().toLowerCase();
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
    
    default:
      return false;
  }
  return true;
}
