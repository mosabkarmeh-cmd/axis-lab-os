import * as core from "../../server-core.ts";

const {
  CUSTOMERS,
  ORDERS,
  MATERIALS,
  REMNANTS,
  EXPENSES,
} = core;

// Helper: Comprehensive Normalization for Arabic Dialects, Typos & Workshop Slang
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

export type AiStats = {
    customersCount: number;
    ordersCount: number;
    pendingOrdersCount: number;
    totalRevenue: number;
    totalPaid: number;
    totalDebt: number;
    machinesCount: number;
    activeJobsCount: number;
    lowStockMaterials: string[];
};

export const getLocalChatResponse = (message: string, stats: AiStats, userExchangeRate?: number) => {
    const rate = userExchangeRate || 15000;
    const msgNorm = normalizeArabicAndDialect(message);

    const {
      customersCount,
      ordersCount,
      pendingOrdersCount,
      totalRevenue,
      totalPaid,
      totalDebt,
      machinesCount,
      activeJobsCount,
      lowStockMaterials
    } = stats;

    // 1. Dynamic Database Customer Lookup
    const matchedCustomer = CUSTOMERS.find(c => {
      const normName = normalizeArabicAndDialect(c.name);
      return msgNorm.includes(normName) || normName.includes(msgNorm) || (c.phone && message.includes(c.phone));
    });

    if (matchedCustomer) {
      const custOrders = ORDERS.filter(o => o.customerId === matchedCustomer.id || o.customerName === matchedCustomer.name);
      const custTotalInvoiced = custOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const custTotalPaid = custOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const custTotalDebt = Math.max(0, custTotalInvoiced - custTotalPaid);
      
      return `📊 **كشف الحساب المالي والإنتاجي التفصيلي للعميل: "${matchedCustomer.name}"** (محلي ومدمج 100%):

• **إجمالي الطلبيات المسجلة**: ${custOrders.length} طلبات
• **إجمالي قيمة الأعمال والطلبات**: $${custTotalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(custTotalInvoiced * rate).toLocaleString()} ل.س)
• **إجمالي المقبوض والمسدد فعلياً**: $${custTotalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(custTotalPaid * rate).toLocaleString()} ل.س)
• **الرصيد المتبقي بذمته المعلقة**: **$${custTotalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}** (${Math.round(custTotalDebt * rate).toLocaleString()} ل.س)
• **حالة الحساب المالي**: ${custTotalDebt > 0 ? "🔴 ذمة مالية معلقة غير مسددة بالكامل." : "🟢 الحساب مسدد بالكامل، عميل متميز!"}
• **رقم الهاتف المسجل**: \`${matchedCustomer.phone || "غير مسجل"}\`
• **العنوان الجغرافي**: \`${matchedCustomer.address || "غير مسجل"}\`

📈 **آخر طلبات العميل**:
${custOrders.slice(0, 5).map(o => `- طلب رقم \`${o.id}\` بقيمة **$${o.totalPrice}** - الحالة: ${o.status === 'completed' ? '✓ مكتمل' : '⏳ قيد المعالجة'}`).join('\n') || "لا توجد طلبات سابقة مسجلة."}`;
    }

    // 2. Financial Analysis & Accounts (مبيعات / أرباح / مصروفات)
    if (
      msgNorm.includes("مبيعات") || 
      msgNorm.includes("ارباح") || 
      msgNorm.includes("مصروف") || 
      msgNorm.includes("ميزانيه") || 
      msgNorm.includes("فلوس") || 
      msgNorm.includes("كشف") || 
      msgNorm.includes("مالي") || 
      msgNorm.includes("ايراد") || 
      msgNorm.includes("ديون") || 
      msgNorm.includes("ذمم") ||
      msgNorm.includes("حسابات")
    ) {
      const totalExpenses = EXPENSES.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";
      const recoveryRate = totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : "0";

      return `💰 **تقرير الأداء المالي والربحي الشامل للورشة** (محلي ومغلق بدون إنترنت):

• **إجمالي المبيعات والطلبيات**: $${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalRevenue * rate).toLocaleString()} ل.س)
• **إجمالي المبالغ المحصلة (المقبوضات)**: $${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalPaid * rate).toLocaleString()} ل.س)
• **إجمالي الذمم المعلقة بذمة العملاء**: $${totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalDebt * rate).toLocaleString()} ل.س)
• **إجمالي النفقات والمصروفات التشغيلية**: $${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalExpenses * rate).toLocaleString()} ل.س)
• **صافي الأرباح التشغيلية**: **$${netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}** (${Math.round(netProfit * rate).toLocaleString()} ل.س)
• **هامش الربح التشغيلي**: **%${profitMargin}**
• **نسبة تحصيل الديون والسيولة**: %${recoveryRate}

📈 **توصية استشارية مالية**:
- ${netProfit > 0 ? "الوضع المالي للورشة مستقر بمسار ربحي واعد ومتزن." : "يُنصح بفحص المصروفات التشغيلية فوراً لتفادي تآكل هامش الأرباح."}
- تبلغ الديون المتبقية بذمة العملاء %${((totalDebt / totalRevenue) * 100).toFixed(1)} من إجمالي أعمالك. يرجى توجيه موظف الحسابات لمتابعة كشوف حسابات العملاء المعلقة باللون الأحمر لتعزيز السيولة بالورشة.`;
    }

    // 3. Inventory, Low Stock & Leftovers (مستودع / خامات / مواد / بقايا / فاقد)
    if (
      msgNorm.includes("مخزن") || 
      msgNorm.includes("مخزون") || 
      msgNorm.includes("خامات") || 
      msgNorm.includes("مواد") || 
      msgNorm.includes("مستودع") || 
      msgNorm.includes("بقايا") || 
      msgNorm.includes("بواقي") || 
      msgNorm.includes("لوح") || 
      msgNorm.includes("الواح")
    ) {
      const leftoversList = REMNANTS.filter(r => r.quantity > 0).slice(0, 5);

      return `📦 **تقرير إدارة المستودع، الخامات، وبقايا الألواح** (تحديث فوري):

• **حالة الخامات والمواد الأولية**:
  ${lowStockMaterials.length > 0 
    ? `⚠️ **تحذير خامات منخفضة**: المواد التالية قاربت على النفاد وتحتاج لشراء فوري: **${lowStockMaterials.join(" - ")}**` 
    : "✓ **حالة المخزون ممتازة**: جميع الخامات والمواد الأساسية متوفرة بكميات كافية وفوق حد الأمان."}

• **أمثلة على بقايا المواد (Remnants) المتوفرة للاستغلال**:
  ${leftoversList.map(r => {
    const matName = MATERIALS.find(m => m.id === r.materialId)?.name || "خامة";
    return `- **${matName}**: أبعاد \`${r.width}x${r.height} مم\` - الكمية: \`${r.quantity}\` (${r.status === 'ready' ? 'جاهز للاستخدام' : 'مستهلك جزئياً'})`;
  }).join('\n') || "لا توجد بقايا ألواح مسجلة حالياً."}

💡 **نصيحة تقليل الهدر**:
- يُفضل دائماً البحث في قائمة "بقايا الألواح المتاحة" لتنفيذ تصاميم العملاء الصغيرة قبل استهلاك لوح جديد كامل لتوفير التكلفة وزيادة الربحية.`;
    }

    // 4. Laser Parameter Tuning (معايرة الماكينات والسرعة والقدرة)
    if (
      msgNorm.includes("ماكينه") || 
      msgNorm.includes("ماكينات") || 
      msgNorm.includes("ليزر") || 
      msgNorm.includes("سرعه") || 
      msgNorm.includes("طاقه") || 
      msgNorm.includes("قوه") || 
      msgNorm.includes("قص") || 
      msgNorm.includes("معايره") ||
      msgNorm.includes("معايرة") ||
      msgNorm.includes("سرعة") ||
      msgNorm.includes("طاقة") ||
      msgNorm.includes("قوة") ||
      msgNorm.includes("بارامتر")
    ) {
      return `⚙️ **دليل معايرة وقدرات ليزر CO2 لورشة AXIS LAB** (الماكينات المتاحة: ${machinesCount}):

إليك البارامترات القياسية المعتمدة للقص والنقش النظيف حسب نوع وسماكة المادة:

1. 🪵 **خشب MDF سماكة 5 مم**:
   - **القص**: السرعة \`12-15 مم/ثانية\` | الطاقة \`80-90%\` | مساعدة الهواء: **قوية جداً** (لتجنب تفحم الحواف).
2. 💎 **أكريليك شفاف/ملون 3 مم**:
   - **القص**: السرعة \`18-22 مم/ثانية\` | الطاقة \`75-85%\` | مساعدة الهواء: **منخفضة** (للحصول على حافة مصقولة كالزجاج).
3. 💼 **جلود طبيعية وصناعية**:
   - **القص**: السرعة \`20-25 مم/ثانية\` | الطاقة \`65-70%\` | مساعدة الهواء: **متوسطة** لمنع الاحتراق.
4. 📦 **كرتون مقوى وورق**:
   - **القص**: السرعة \`50-80 مم/ثانية\` | الطاقة \`30-40%\` | مساعدة الهواء: **خفيفة** جداً.
5. 🖼️ **النقش البصري (Engraving) لجميع المواد**:
   - **النقش**: السرعة \`250-400 مم/ثانية\` | الطاقة \`15-25%\` | دقة بؤرية عالية.`;
    }

    // 5. Troubleshooting & Maintenance (مشاكل الماكينات والصيانة)
    if (
      msgNorm.includes("صيانه") || 
      msgNorm.includes("مشكله") || 
      msgNorm.includes("مشاكل") || 
      msgNorm.includes("ضعف") || 
      msgNorm.includes("اهتزاز") || 
      msgNorm.includes("تقطيع") || 
      msgNorm.includes("حرق") || 
      msgNorm.includes("عدسه") || 
      msgNorm.includes("مرايا") || 
      msgNorm.includes("حراره") || 
      msgNorm.includes("صيانة") || 
      msgNorm.includes("مشكلة")
    ) {
      return `🛠️ **دليل استكشاف أخطاء وصيانة ماكينات القص CO2**:

1. 📉 **ضعف في جودة أو عمق القص (عدم اختراق المادة)**:
   - **المرايا والعدسة (Mirrors & Lens)**: فحص اتساخ المرايا والعدسة البؤرية. قم بتنظيفها فوراً باستخدام كحول آيزوبروبيلي وقطنة ناعمة. اتساخ المرايا يمتص طاقة الشعاع ويؤدي لشرخها.
   - **مسار الشعاع (Beam Alignment)**: تأكد من تمركز شعاع الليزر في منتصف فتحة رأس الليزر وفي كل زوايا الماكينة.
   - **أنبوب الليزر (Laser Tube)**: تأكد من أن درجة حرارة ماء التبريد في مبرد المياه (Chiller) تتراوح بين \`18-22 درجة مئوية\`. ارتفاع حرارة الماء يقلل من قدرة الأنبوب بشكل كبير ويسرع من تلفه.

2. 🔥 **احتراق حواف الأخشاب وتفحمها بشكل مفرط**:
   - تأكد من عمل ضاغط الهواء (Air Compressor) بكفاءة كاملة وضخ تدفق هواء قوي لإبعاد ألسنة اللهب والدخان عن نقطة التركيز البؤري.

3. 📉 **اهتزاز خطوط القص أو عدم انتظام الدوائر**:
   - **القشاط والسكك (Belts & Rails)**: قم بتنظيف السكك المنزلقة بقطعة قماش ناعمة ومذيب للزيوت القديمة، ثم تزييتها بزيت خفيف جداً. فحص شد قشاط محاور الحركة لمنع انزلاق الخطوات (Step Loss).`;
    }

    // 6. Security, Hazards & Ventilation (سلامه / امان / غازات / حريق)
    if (
      msgNorm.includes("سلامه") || 
      msgNorm.includes("امان") || 
      msgNorm.includes("حريق") || 
      msgNorm.includes("خطر") || 
      msgNorm.includes("حمايه") || 
      msgNorm.includes("غاز") || 
      msgNorm.includes("تهويه") || 
      msgNorm.includes("سام") ||
      msgNorm.includes("سلامة") ||
      msgNorm.includes("أمان") ||
      msgNorm.includes("حماية") ||
      msgNorm.includes("تهوية")
    ) {
      return `🛡️ **دليل السلامة والأمن المهني والبيئي لورشة AXIS LAB**:

التزامك بقواعد السلامة يضمن حماية فريق العمل والمعدات الغالية في الورشة:

1. 🚫 **يمنع قص مادة الـ PVC**: يمنع منعاً باتاً قص الفينيل أو البلاستيك الذي يحتوي على مركبات الكلور. غاز الكلور الناتج سام جداً للمشغل ويتحد مع الرطوبة لينتج حمض الهيدروكلوريك الحارق الذي يدمر الماكينة والمرايا مسبباً الصدأ السريع!
2. 🥽 **نظارات الحماية الواقية**: ارتداء نظارات حماية مخصصة لليزر CO2 ذات طول موجي (\`10600 نانومتر\`) لحماية شبكية وعين المشغل من الانعكاسات غير المرئية للشعاع.
3. 🧯 **مكافحة الحرائق المباشرة**: احتفظ بمطفأة حريق غاز ثنائي أكسيد الكربون (CO2) بجانب الماكينة، ولا تترك ماكينة الخشب تعمل دون إشراف بشري أبداً أثناء عملية القص.
4. 🌬️ **التهوية وسحب الغازات**: تأكد من عمل مراوح الشفط والتهوية بكفاءة عالية لطرد أبخرة الأكريليك والأخشاب السامة خارج صالة العمل.`;
    }

    // 7. General Forecast & Prediction (توقعات وتنبؤات ذكية)
    if (
      msgNorm.includes("توقع") || 
      msgNorm.includes("تنبؤ") || 
      msgNorm.includes("مستقبل") || 
      msgNorm.includes("الشهر") || 
      msgNorm.includes("القادم") ||
      msgNorm.includes("تحليل")
    ) {
      const averageOrderVal = ordersCount > 0 ? (totalRevenue / ordersCount) : 0;
      const forecastedRevenue = averageOrderVal * (ordersCount * 1.15);
      return `🔮 **تنبؤات ومؤشرات التنمية الذكية لورشة AXIS LAB** (استدلال محلي):

استناداً إلى تحليل نشاط الورشة وتاريخ الطلبات والعملاء الحالي:
• **متوسط قيمة الطلب الفردي (Ticket Size)**: $${averageOrderVal.toFixed(2)} (${Math.round(averageOrderVal * rate).toLocaleString()} ل.س)
• **معدل نمو الطلبات المتوقع**: زيادة بنسبة **%15** في حجم الطلبيات للربع السنوي القادم.

📈 **توقعات الشهر القادم**:
- **تقدير المبيعات**: **$${forecastedRevenue.toFixed(2)}** (${Math.round(forecastedRevenue * rate).toLocaleString()} ل.س)
- **المواد الأكثر استهلاكاً**: الأكريليك الشفاف 3مم، خشب MDF 5مم.
- **توصية تشغيلية**: يُقترح تأمين كميات احتياطية من ألواح الأكريليك وتأكيد صيانة رؤوس الليزر والمرايا قبل انطلاق موسم الأعياد واللوحات الدعائية لضمان استمرارية التشغيل دون انقطاع.`;
    }

    // 8. Welcome / Fallback Response
    return `أهلاً بك في نظام تشغيل وإدارة ورش القص ليزر CO2 - **AXIS LAB**! 🧠
أنا مساعدك الذكي المدمج والداخلي بالكامل (يعمل 100% محلياً ودون الحاجة لإنترنت لسرعة الاستجابة وحفظ خصوصية بيانات الورشة).

يمكنك طرح أي سؤال حول ورشتك وسأجيبك فوراً محلياً:
• 💰 **الحسابات والأرباح والديون**: اكتب "الأرباح والمبيعات" أو "الميزانية المالية".
• 📦 **حالة المخزن وتوفير الخامات**: اكتب "تقرير المخزن" أو "البقايا".
• 👥 **كشف حساب عميل معين**: اكتب اسم أي عميل مسجل مثل (اسم العميل) لمعرفة ديونه ونشاطه.
• ⚙️ **معايرة ليزر CO2 وسرعة وقدرة الماكينة**: اكتب "معايرة الليزر" أو "قص MDF".
• 🛠️ **مشاكل الماكينات والصيانة**: اكتب "ضعف القص" أو "صيانة المرايا".
• 🛡️ **الأمان والسلامة التشغيلية**: اكتب "دليل السلامة والأمان".`;
};
