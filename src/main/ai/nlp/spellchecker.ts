/**
 * AXIS LAB — Arabic Spellchecker Engine (Hunspell-AR & Workshop Domain Rules)
 * Advanced spellchecking, stem/affix stripping, dialect normalization, and error correction for laser cutting workshops.
 */

export interface WordCorrection {
  original: string;
  corrected: string;
  type: "dictionary" | "prefix-stripping" | "levenshtein" | "dialect" | "exact";
  suggestions?: string[];
}

export interface SpellCheckResult {
  originalText: string;
  correctedText: string;
  correctedWordsCount: number;
  corrections: WordCorrection[];
  confidence: number;
  normalizedText: string;
}

// Arabic Affixes (Hunspell-AR pattern rules)
const ARABIC_PREFIXES = ["بال", "كال", "فال", "لل", "ال", "وبال", "وكال", "وفال", "و", "ف", "ب", "ك", "ل"];
const ARABIC_SUFFIXES = ["هما", "هما", "كم", "كن", "هم", "هن", "نا", "ها", "وا", "ين", "ون", "ات", "ية", "يه", "ي", "ك", "ه"];

// Workshop & AXIS LAB Core Lexicon (Standard Dictionary)
const VALID_WORKSHOP_WORDS = new Set([
  "أكريليك", "اكاديمي", "خشب", "أخشاب", "ام_دي_اف", "مداف", "زان", "سوان", "بلوط", "تيك", "جلد", "أجلاد",
  "ماكينة", "ماكينات", "ليزر", "عدسة", "بؤرة", "تيوب", "مبرد", "شفاط", "طاولة", "كومبريسور",
  "طلب", "طلبيات", "عميل", "عملاء", "فاتورة", "فواتير", "دفعة", "دفعات", "حساب", "حسابات", "محاسبة",
  "إنتاج", "قص", "حفر", "نقش", "تفريق", "تجميع", "صيانة", "مخزون", "بقايا", "هدر", "خامات",
  "تصميم", "ملف", "ملفات", "إصدار", "مكونات", "تكلفة", "سعر", "مربح", "خصم", "ضريبة", "مصروفات"
]);

// Slang and Levantine Dialect to Modern Standard Arabic Mapping
const DIALECT_MAP: Record<string, string> = {
  // Acrylic typos & dialects
  "اكربليك": "أكريليك",
  "اكليلك": "أكريليك",
  "اكربلك": "أكريليك",
  "اكرايلك": "أكريليك",
  "أكربليك": "أكريليك",
  "اكلايرك": "أكريليك",
  "اكريلك": "أكريليك",
  "أكريلك": "أكريليك",

  // Wood & MDF typos
  "مداف": "MDF",
  "ام دي اف": "MDF",
  "امدياف": "MDF",
  "امدي اف": "MDF",
  "ام دي": "MDF",
  "خشاب": "أخشاب",
  "خسب": "خشب",
  "زانن": "زان",

  // Laser Machine terms
  "ليزؤ": "ليزر",
  "ليزار": "ليزر",
  "ليزير": "ليزر",
  "مكينة": "ماكينة",
  "مكنة": "ماكينة",
  "مكينات": "ماكينات",
  "مكاين": "ماكينات",

  // Financial & Workshop Operations
  "حاسبة": "حساب",
  "احسبلي": "حساب",
  "احسب": "حساب",
  "حسابات": "حساب",
  "مصاري": "مالية",
  "فلوس": "مالية",
  "مصريات": "مالية",
  "ديون": "ذمم مالية",
  "مصاريف": "مصروفات",

  // Regional & Levantine Expressions
  "شلون": "كيف",
  "شلونك": "كيف حالك",
  "شلونها": "كيف حالة",
  "قديه": "كم",
  "قديش": "كم",
  "قداش": "كم",
  "شقد": "كم",
  "شكد": "كم",
  "بكم": "كم",
  "شو": "ما هو",
  "شنو": "ما هو",
  "ايش": "ما هو",
  "بدي": "أريد",
  "بدنا": "نريد",
  "عايز": "أريد",
  "عايزين": "نريد",
  "نبي": "نريد",
  "ابي": "أريد",
  "زبون": "عميل",
  "زباينا": "عملاء الورشة",
  "عالم": "عملاء",
  "شغل": "عملية إنتاج",
  "طلبيات": "طلبات",
  "طلبيه": "طلب",
  "بواقي": "بقايا المواد",
  "قصاصات": "بقايا المواد",
  "فضلات": "بقايا المواد"
};

/**
 * Strips Arabic Diacritics (Tashkeel) and unifies Alif / Yaa / Taa Marboota
 */
export function normalizeArabicText(text: string): string {
  if (!text) return "";
  return text
    .trim()
    // Remove Tashkeel (harakat)
    .replace(/[\u064B-\u0652]/g, "")
    // Remove Tatweel (kashida)
    .replace(/\u0640/g, "")
    // Normalize Alifs (أ, إ, آ, ء -> ا)
    .replace(/[أإآءئؤ]/g, "ا")
    // Normalize Ta Marboota (ة -> ه)
    .replace(/ة/g, "ه")
    // Normalize Yaa (ى -> ي)
    .replace(/ى/g, "ي");
}

/**
 * Calculates Levenshtein Distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Hunspell-AR Arabic Spellchecker Engine
 */
export class HunspellArabicSpellChecker {
  private dictionary: Set<string>;
  private dialectMap: Record<string, string>;

  constructor() {
    this.dictionary = VALID_WORKSHOP_WORDS;
    this.dialectMap = DIALECT_MAP;
  }

  /**
   * Checks if a word is valid or attempts stemming / correction
   */
  public checkWord(word: string): { isCorrect: boolean; correction?: string; type?: WordCorrection["type"] } {
    const clean = word.replace(/[.,!?،؟()"']/g, "");
    const normalized = normalizeArabicText(clean);

    if (!normalized) {
      return { isCorrect: true };
    }

    // 1. Direct Dialect / Workshop Typo Mapping
    if (this.dialectMap[clean] || this.dialectMap[normalized]) {
      return {
        isCorrect: false,
        correction: this.dialectMap[clean] || this.dialectMap[normalized],
        type: "dialect"
      };
    }

    // 2. Direct Dictionary Hit
    if (this.dictionary.has(clean) || this.dictionary.has(normalized)) {
      return { isCorrect: true, type: "exact" };
    }

    // 3. Affix Stripping (Hunspell-AR stem matching)
    for (const prefix of ARABIC_PREFIXES) {
      if (normalized.startsWith(prefix) && normalized.length - prefix.length >= 3) {
        const stemmed = normalized.substring(prefix.length);
        if (this.dictionary.has(stemmed)) {
          return { isCorrect: true, type: "prefix-stripping" };
        }
      }
    }

    // 4. Levenshtein Distance Suggestion (Best Match)
    let bestMatch = "";
    let minDistance = 3;

    for (const dictWord of Array.from(this.dictionary)) {
      const dictNorm = normalizeArabicText(dictWord);
      const dist = levenshteinDistance(normalized, dictNorm);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = dictWord;
      }
    }

    if (bestMatch && minDistance <= 2) {
      return {
        isCorrect: false,
        correction: bestMatch,
        type: "levenshtein"
      };
    }

    return { isCorrect: true };
  }

  /**
   * Spellchecks full text prompt and returns structured results
   */
  public spellCheck(rawText: string): SpellCheckResult {
    if (!rawText || typeof rawText !== "string") {
      return {
        originalText: "",
        correctedText: "",
        correctedWordsCount: 0,
        corrections: [],
        confidence: 1.0,
        normalizedText: ""
      };
    }

    const words = rawText.split(/(\s+)/);
    const corrections: WordCorrection[] = [];

    const correctedWords = words.map(part => {
      // Keep whitespace intact
      if (/^\s+$/.test(part)) return part;

      const wordCheck = this.checkWord(part);
      if (!wordCheck.isCorrect && wordCheck.correction) {
        corrections.push({
          original: part,
          corrected: wordCheck.correction,
          type: wordCheck.type || "dictionary"
        });
        return wordCheck.correction;
      }

      return part;
    });

    const correctedText = correctedWords.join("");
    const normalizedText = normalizeArabicText(correctedText);
    const confidence = Math.max(0.65, Number((1.0 - (corrections.length * 0.08)).toFixed(2)));

    return {
      originalText: rawText,
      correctedText,
      correctedWordsCount: corrections.length,
      corrections,
      confidence,
      normalizedText
    };
  }
}

export const hunspellAr = new HunspellArabicSpellChecker();

/**
 * Helper function for quick spellchecking
 */
export function spellCheckArabic(rawText: string): SpellCheckResult {
  return hunspellAr.spellCheck(rawText);
}
