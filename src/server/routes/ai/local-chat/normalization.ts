export const normalizeArabicAndDialect = (str: string): string => {
    if (!str) return "";
    let s = str.toLowerCase().trim();

    // 1. Remove Tashkeel & Normalize Hamzas
    s = s.replace(/[\u064B-\u0652]/g, "")
         .replace(/[أإآءئؤ]/g, "ا")
         .replace(/ة/g, "ه")
         .replace(/ى/g, "ي");

    // 2. Fix Common Laser Workshop Typos & Misspellings
    s = s.replace(/اكربليك|اكليلك|اكربلك|اكرايلك|أكربليك|اكلايرك/g, "أكريليك")
         .replace(/مداف|ام دي اف|امدياف|امدي اف/g, "mdf")
         .replace(/خشاب|أخشاب/g, "خشب")
         .replace(/تسميكه|تسميكت|سمك|سماكت/g, "سماكة")
         .replace(/حاسبة|احسبلي|احسب|حسابات/g, "حساب")
         .replace(/عطلان|خراب|عم يعلق|مو شغال|ما بيكبس/g, "صيانة")
         .replace(/ليزؤ|ليزار|ليزير/g, "ليزر")
         .replace(/مكينة|مكنة|ماكينة|مكينات|مكاين/g, "ماكينة");

    // 3. Dialect Conversions (Levantine/Syrian/Gulf/Egyptian slang)
    s = s.replace(/\b(شلون|كيفك|شلونك|شلونها|كيفية|كيفا)\b/g, "كيف")
         .replace(/\b(بدنا|بدي|عايز|محتاج|عايزين|نبي|ابي|ابغي|بدياه|بدياهم)\b/g, "احتاج")
         .replace(/\b(قديش|قديه|قداش|شقد|شكد|قدية|بكم|بكام)\b/g, "كم")
         .replace(/\b(شو|ايش|شنو|ماهو|شنهي)\b/g, "ما")
         .replace(/\b(مصاري|فلوس|مصريات|غروش|دراهم|مصرياتنا)\b/g, "مالية")
         .replace(/\b(زبون|زباينا|زبائن|عالم|عملاء)\b/g, "عميل")
         .replace(/\b(شغل|شغلات|طلبيات|طلبيه|طلباتنا)\b/g, "طلبات")
         .replace(/\b(بواقي|قصاصات|قصاصة|فتافيت|فضلات|بواقينا)\b/g, "بقايا")
         .replace(/\b(عاجل|مستعجل|ضروري|فوراً|قوام|بسرعة)\b/g, "عاجل");

    return s;
  };

