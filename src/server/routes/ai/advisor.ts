import express from "express";
import { Type } from "@google/genai";
import * as core from "../../server-core.ts";

type AiItem = {
  name?: string;
  productName?: string;
  quantity?: number | string;
  qty?: number | string;
  price?: number | string;
  notes?: string;
};

function asAiItem(value: unknown): AiItem {
  return value && typeof value === "object" ? value as AiItem : {};
}

const { ai } = core;

export function registerAiAdvisorRoutes(app: express.Express) {
// API - AI Laser Order Advisor and Parameter Estimator
  app.post("/api/ai/order-advisor", async (req, res) => {
    const { items, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "الرجاء إضافة عناصر للطلب لتحليلها بالذكاء الاصطناعي" });
      return;
    }

    const fallbackAdvisor = () => {
      const itemsParameters = items.map(rawItem => {
        const item = asAiItem(rawItem);
        const text = (item.name || item.productName || "").toLowerCase();
        let speed = "15-25 mm/s";
        let power = "80%";
        let lens = "2.0\" focal lens";
        let air = "مساعد هواء متوسط لمنع الاحتراق";

        if (text.includes("أكريليك") || text.includes("اكريليك") || text.includes("acrylic") || text.includes("شفاف")) {
          speed = "18 mm/s";
          power = "75%";
          lens = "2.0\" HQ lens";
          air = "مساعد هواء منخفض لمنع الغواش والتغبيش";
        } else if (text.includes("خشب") || text.includes("mdf") || text.includes("زان") || text.includes("wood")) {
          speed = "12 mm/s";
          power = "85%";
          lens = "2.5\" Deep-Cut lens";
          air = "مساعد هواء قوي جداً لتجنب الشحار وتفحم الحواف";
        } else if (text.includes("جلد") || text.includes("leather")) {
          speed = "25 mm/s";
          power = "60%";
          lens = "1.5\" engraving lens";
          air = "مساعد هواء متوسط لقص نقي وخالٍ من الرائحة الكثيفة";
        }

        return {
          itemName: item.name || item.productName || "عنصر غير مسمى",
          speed,
          power,
          lens,
          air
        };
      });

      return {
        pricingAnalysis: "تحليل مالي تقديري من المحرك المحلي للورشة: الأسعار المدخلة تبدو متزنة وتغطي تكاليف الخامات ومعدل استهلاك أنبوب الليزر CO2 بشكل ممتاز.",
        itemsParameters,
        productionStrategy: "توجيه الإنتاج المحلي: يوصى بترتيب القص لتبدأ من الأشكال الداخلية والفتحات أولاً (Inside Loops)، ثم الانتقال إلى الحدود الخارجية (Outside Profile) لضمان عدم إزاحة الخامة بعد تحررها.",
        warnings: "تحذير الأمان والسلامة: يرجى ارتداء النظارات الواقية المخصصة ليزر CO2 طول موجي 10600 نانومتر، والتأكد من تشغيل ساحب الغازات الخارجي قبل بدء القص لتجنب استنشاق الأبخرة الكثيفة.",
        estimatedTimeTotal: `${Math.max(5, items.length * 4)} - ${Math.max(10, items.length * 8)} دقيقة`
      };
    };

    try {
      if (!process.env.GEMINI_API_KEY) {
        res.json(fallbackAdvisor());
        return;
      }

      const itemsStr = items.map((it, idx) => `
Item #${idx + 1}:
- Name/Material: "${it.name}"
- Quantity: ${it.qty}
- Input Price: $${it.price}
- Custom Notes: "${it.notes || "None"}"
`).join("\n");

      const prompt = `
You are the AXIS LAB AI Production Advisor for CO2 Laser Cutting & Engraving workshops.
Analyze the following draft order to provide optimal laser machining settings, pricing advice, nesting tips, and safety warnings.

Customer Request Details:
${itemsStr}

Order General Notes:
"${notes || "None"}"

Tasks:
1. Pricing Evaluation: Analyze if the input prices are reasonable based on typical material costs (Acrylic, MDF wood, Leather, Paper, general) and processing complexities. Provide detailed feedback in Arabic.
2. Optimal CO2 Laser Settings: Provide standard speed/power parameters for cutting/engraving each material listed in the items.
3. Nesting & Production Strategy: Suggest how to arrange these shapes on raw sheets to minimize kerf waste and utilize leftovers (remnants).
4. Safety / Material Warnings: Mention any critical workshop hazards (e.g. cutting PVC releases toxic chlorine gas, acrylic needs protective mask film, wood requires high air assist to prevent charring/fire).
5. Estimated production duration.

Return your response STRICTLY as a single JSON object with this exact typescript-like interface:
{
  "pricingAnalysis": "A 2-3 sentence analysis in Arabic explaining if the pricing is appropriate.",
  "itemsParameters": [
    {
      "itemName": "Name of the item as provided",
      "speed": "Cutting speed in mm/s (e.g., '15 - 20 mm/s')",
      "power": "Laser power level in % (e.g., '70 - 80%')",
      "lens": "Suggested focal lens (e.g., '2.0\" focal lens')",
      "air": "Air assist recommendation in Arabic (e.g., 'هواء قوي لمنع الاحتراق')"
    }
  ],
  "productionStrategy": "Nesting / sheet layout advice in Arabic (2-3 sentences).",
  "warnings": "Material warnings, safety, or prep advices in Arabic (2-3 sentences).",
  "estimatedTimeTotal": "Overall estimated laser cutting time (e.g., '12-15 دقيقة')"
}

Do not include any markdown format tags like \`\`\`json or \`\`\` in your response. Just return raw JSON.
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          pricingAnalysis: {
            type: Type.STRING,
            description: "A 2-3 sentence analysis in Arabic explaining if the pricing is appropriate."
          },
          itemsParameters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                itemName: { type: Type.STRING, description: "Name of the item as provided" },
                speed: { type: Type.STRING, description: "Cutting speed in mm/s (e.g., '15 - 20 mm/s')" },
                power: { type: Type.STRING, description: "Laser power level in % (e.g., '70 - 80%')" },
                lens: { type: Type.STRING, description: "Suggested focal lens (e.g., '2.0\" focal lens')" },
                air: { type: Type.STRING, description: "Air assist recommendation in Arabic (e.g., 'هواء قوي لمنع الاحتراق')" }
              },
              required: ["itemName", "speed", "power", "lens", "air"]
            }
          },
          productionStrategy: {
            type: Type.STRING,
            description: "Nesting / sheet layout advice in Arabic (2-3 sentences)."
          },
          warnings: {
            type: Type.STRING,
            description: "Material warnings, safety, or prep advices in Arabic (2-3 sentences)."
          },
          estimatedTimeTotal: {
            type: Type.STRING,
            description: "Overall estimated laser cutting time (e.g., '12-15 دقيقة')"
          }
        },
        required: ["pricingAnalysis", "itemsParameters", "productionStrategy", "warnings", "estimatedTimeTotal"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: unknown) {
      console.warn("Order Advisor API Error, falling back to local advisor:", error);
      res.json(fallbackAdvisor());
    }
  });
}
