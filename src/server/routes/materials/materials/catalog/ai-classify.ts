import express from "express";
import { Type } from "@google/genai";
import * as core from "../../../../server-core.ts";

const { ai } = core;

export function registerMaterialAiClassificationRoute(app: express.Express) {
app.post("/api/materials/ai-classify", async (req, res) => {
    try {
      const { name, thickness, color, notes } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: "اسم المادة مطلوب للتصنيف الذكي" });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ success: false, message: "مفتاح Gemini API غير مكوّن في الإعدادات." });
        return;
      }

      const prompt = `Classify this material for a laser cutting workshop:
- Name: ${name}
- Thickness: ${thickness || "unknown"} mm
- Color: ${color || "unknown"}
- Notes: ${notes || "none"}`;

      const systemInstruction = `You are a material classification assistant for AXIS LAB, a specialized laser cutting and engraving workshop.
Analyze the material's physical properties such as its name, thickness, color, and descriptions.
Identify its standard category and subcategory based on these inputs:
Standard Categories (must be EXACTLY one of these Arabic strings):
- 'الأكريليك' (for acrylic, plexiglass, Perspex, polymer panels)
- 'الأخشاب' (for wood, MDF, plywood, veneer, natural timber)
- 'الجلود' (for leather, cowskin, suede, synthetic leather, fabric)
- 'عام' (for metals, paper, cardboards, glass, rubber, or other general materials)

Standard subCategory (Provide a descriptive short Arabic subcategory string describing the material finish or variant, e.g. 'شفاف', 'ملون', 'مرآة', 'معتم', 'MDF', 'طبيعي', 'معاكس', 'سوداني', 'سويدي', 'صناعي', 'ورق مقوى', 'معدن', 'عام').

Be intelligent! If the name contains wood words like "خشب", "زان", "MDF", classify category as 'الأخشاب' and subCategory as 'MDF' or 'طبيعي'. If it contains "أكريليك", "شفاف", "acrylic", classify category as 'الأكريليك' and subCategory as 'شفاف' or 'ملون' or 'مرآة'. If it contains "جلد", "leather", classify category as 'الجلود' and subCategory as 'طبيعي' or 'صناعي'. Otherwise, use 'عام' and 'عام'.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, description: "Exactly one of: 'الأكريليك', 'الأخشاب', 'الجلود', 'عام'" },
              subCategory: { type: Type.STRING, description: "Short descriptive subcategory in Arabic e.g. 'شفاف', 'ملون', 'مرآة', 'MDF', 'طبيعي', 'عام'" },
              confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 1" },
              explanation: { type: Type.STRING, description: "A brief, friendly explanation in Arabic explaining why this classification was chosen" },
            },
            required: ["category", "subCategory", "confidence", "explanation"],
          },
        },
      });

      const resultText = response.text;
      if (!resultText) throw new Error("Empty response from Gemini API");
      const resultJson = JSON.parse(resultText.trim());
      res.json({ success: true, classification: resultJson });
    } catch (error: unknown) {
      console.error("AI Material classification error:", error);
      res.status(500).json({
        success: false,
        message: "فشل تصنيف المادة بالذكاء الاصطناعي",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
