/**
 * AXIS LAB — AI Pipeline Orchestrator
 * Integrates hunspell-ar spellchecker, dialect normalization, workshop intent extraction, and fast execution logic.
 */

import { hunspellAr, spellCheckArabic, SpellCheckResult } from "./nlp/spellchecker";

export interface AIProcessRequest {
  query: string;
  context?: Record<string, any>;
  enableSpellCheck?: boolean;
}

export type WorkshopIntent = "orders" | "production" | "materials" | "accounting" | "general";

export interface AIProcessResponse {
  answer: string;
  processedQuery: string;
  detectedIntent: WorkshopIntent;
  spellCheckDetails?: SpellCheckResult;
  latencyMs: number;
  engine: "local-fast" | "hybrid-gemini";
}

/**
 * Main AI Orchestrator Pipeline
 */
export class AIOrchestrator {
  /**
   * Detects workshop domain intent from the query
   */
  private detectIntent(query: string): WorkshopIntent {
    const q = query.toLowerCase();
    if (q.includes("طلب") || q.includes("زبون") || q.includes("عميل") || q.includes("طلبيات")) {
      return "orders";
    }
    if (q.includes("قص") || q.includes("ماكينة") || q.includes("ليزر") || q.includes("إنتاج") || q.includes("شغل")) {
      return "production";
    }
    if (q.includes("خامة") || q.includes("أكريليك") || q.includes("خشب") || q.includes("مخزون") || q.includes("بقايا") || q.includes("MDF")) {
      return "materials";
    }
    if (q.includes("حساب") || q.includes("فاتورة") || q.includes("دفعة") || q.includes("مالية") || q.includes("مصروف")) {
      return "accounting";
    }
    return "general";
  }

  /**
   * Processes incoming user query through Hunspell-AR NLP Spellchecker and Pipeline
   */
  public async processQuery(request: AIProcessRequest): Promise<AIProcessResponse> {
    const startTime = performance.now();
    const enableSpellCheck = request.enableSpellCheck !== false;

    // Step 1: Run Hunspell-AR Spellchecking & Dialect Normalization
    let spellCheckResult: SpellCheckResult | undefined;
    let cleanQuery = request.query;

    if (enableSpellCheck) {
      spellCheckResult = hunspellAr.spellCheck(request.query);
      cleanQuery = spellCheckResult.correctedText;
    }

    // Step 2: Detect Workshop Domain Intent
    const intent = this.detectIntent(cleanQuery);

    // Step 3: High-speed local processing
    const latencyMs = Math.round(performance.now() - startTime);

    let intentLabel = "عام";
    if (intent === "orders") intentLabel = "الطلبات والعملاء";
    if (intent === "production") intentLabel = "الإنتاج والماكينات";
    if (intent === "materials") intentLabel = "المواد والمخزون";
    if (intent === "accounting") intentLabel = "الحسابات والفواتير";

    const correctionsNotice = spellCheckResult && spellCheckResult.correctedWordsCount > 0
      ? ` (تم تصحيح ${spellCheckResult.correctedWordsCount} كلمة إملائياً)`
      : "";

    return {
      answer: `تمت معالجة الاستفسار بنجاح ضمن نطاق [${intentLabel}]${correctionsNotice}: "${cleanQuery}"`,
      processedQuery: cleanQuery,
      detectedIntent: intent,
      spellCheckDetails: spellCheckResult,
      latencyMs: Math.max(1, latencyMs),
      engine: "local-fast"
    };
  }
}

export const aiOrchestrator = new AIOrchestrator();
