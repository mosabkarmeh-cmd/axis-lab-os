import express from "express";
import * as core from "../../server-core.ts";

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
// API - AXIS LAB Conversational AI Assistant (Context-Aware Workspace Chat)
  app.post("/api/ai/chat", async (req, res) => {
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: "يرجى كتابة رسالة للتحدث مع الذكاء الاصطناعي" });
      return;
    }

    try {
      // Compile current ERP state to inject as context
      const lowStockMaterials = MATERIALS.filter(m => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        return qty <= (m.minimumStock || 5);
      }).map(m => m.name);

      const activeJobsCount = PRODUCTION_JOBS.filter(j => j.status !== "completed" && j.status !== "cancelled").length;
      const machinesCount = MACHINES.length;
      const customersCount = CUSTOMERS.length;
      const ordersCount = ORDERS.length;
      const pendingOrdersCount = ORDERS.filter(o => o.status === "new" || o.status === "in_progress").length;
      const totalRevenue = ORDERS.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const totalPaid = ORDERS.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const totalDebt = Math.max(0, totalRevenue - totalPaid);

      const statsObj = {
        customersCount,
        ordersCount,
        pendingOrdersCount,
        totalRevenue,
        totalPaid,
        totalDebt,
        machinesCount,
        activeJobsCount,
        lowStockMaterials
      };

      const systemContextPrompt = `
You are the AXIS LAB Intelligent ERP Companion (مساعد AXIS AI).
An advanced, local-first artificial intelligence system designed for CO2 Laser cutting & engraving workshops.
Your goal is to assist workshop operators, managers, accountants, and designers with operational, technical, and financial decisions.

Here is the FRESH, REAL-TIME state of the AXIS LAB database:
- Active Customers count: ${customersCount}
- Total Orders recorded: ${ordersCount}
- Pending/Processing Orders: ${pendingOrdersCount}
- Total Financial Revenue (Sales): $${totalRevenue.toFixed(2)}
- Total Payments Received: $${totalPaid.toFixed(2)}
- Total Remaining Debts (الذمم المدينة للزبائن): $${totalDebt.toFixed(2)}
- Machinery count: ${machinesCount} active laser CO2 systems
- Active Jobs in queue: ${activeJobsCount}
- Materials with Low Inventory (⚠️ قاربت على النفاد): ${lowStockMaterials.length > 0 ? lowStockMaterials.join(", ") : "None, all materials are well-stocked"}

Role Guidelines:
1. Always communicate in clear, helpful, highly professional Arabic (اللغة العربية الفصحى المبسطة بلكنة ورشات سورية وشرق أوسطية لطيفة ومهذبة).
2. UNDERSTAND ALL ARABIC DIALECTS & TYPOS:
   - Seamlessly comprehend Levantine/Syrian slang (e.g., "شلون", "بدنا", "قديه", "شو", "مصاري", "بدي", "عنا", "الزبون").
   - Automatically correct workshop typos and misspellings (e.g., "مداف" -> MDF, "اكربليك" -> أكريليك, "ليزؤ" -> ليزر, "مكينة" -> ماكينة).
   - Interpret informal workshop text or voice-to-text queries gracefully.
3. Answer based strictly on the provided real data. If asked about numbers, use the real figures injected above.
4. If asked about laser parameters, suggest appropriate speed/power based on standard CO2 laser calibration:
   - Acrylic 3mm: Speed 18-22 mm/s, Power 75-85%
   - MDF Wood 5mm: Speed 12-15 mm/s, Power 80-90%
   - Cardboard: Speed 50-80 mm/s, Power 30-40%
   - Engraving: Speed 250-400 mm/s, Power 15-25%
5. Be proactive. If materials are low, remind the operator. If debts are high, warn the accountant.
6. Do not include any HTML; you may use standard Markdown for bolding, bullet lists, or tables.
`;

      const formattedContents = [];
      // Add history if present
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          formattedContents.push({
            role: turn.sender === "user" ? "user" : "model",
            parts: [{ text: turn.text }]
          });
        }
      }
      // Add current message
      formattedContents.push({
        role: "user",
        parts: [{ text: `${systemContextPrompt}\n\nUser Question: "${message}"` }]
      });

      if (!process.env.GEMINI_API_KEY) {
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
      const lowStockMaterials = MATERIALS.filter(m => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        return qty <= (m.minimumStock || 5);
      }).map(m => m.name);

      const activeJobsCount = PRODUCTION_JOBS.filter(j => j.status !== "completed" && j.status !== "cancelled").length;
      const machinesCount = MACHINES.length;
      const customersCount = CUSTOMERS.length;
      const ordersCount = ORDERS.length;
      const pendingOrdersCount = ORDERS.filter(o => o.status === "new" || o.status === "in_progress").length;
      const totalRevenue = ORDERS.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const totalPaid = ORDERS.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const totalDebt = Math.max(0, totalRevenue - totalPaid);

      const statsObj = {
        customersCount,
        ordersCount,
        pendingOrdersCount,
        totalRevenue,
        totalPaid,
        totalDebt,
        machinesCount,
        activeJobsCount,
        lowStockMaterials
      };

      res.json({ text: getLocalChatResponse(message, statsObj) });
    }
  });
}
