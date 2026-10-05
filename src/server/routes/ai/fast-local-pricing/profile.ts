export interface MaterialProcessProfile {
  cutSpeedMms: number;
  engraveSpeedMms: number;
  passesCount: number;
  airAssistDesc: string;
  lensDesc: string;
  focalOffset: string;
  exhaustCFM: string;
  finishTips: string[];
}

export function getMaterialProcessProfile(lowerMaterialName: string, thicknessMm: number): MaterialProcessProfile {
  let cutSpeedMms = 20;
  let engraveSpeedMms = 350;
  let passesCount = 1;
  let airAssistDesc = "متوسط (2.0 Bar)";
  let lensDesc = "2.0 inch Standard";
  let focalOffset = "0.0 mm (سطح الخامة)";
  let exhaustCFM = "350 CFM";
  let finishTips: string[] = [];

let cutSpeedMms = 20;
              let engraveSpeedMms = 350;
              let passesCount = 1;
              let airAssistDesc = "متوسط (2.0 Bar)";
              let lensDesc = "2.0 inch Standard";
              let focalOffset = "0.0 mm (سطح الخامة)";
              let exhaustCFM = "350 CFM";
              let finishTips: string[] = [];
    
              if (lowerMatName.includes("أكريليك") || lowerMatName.includes("acrylic")) {
                cutSpeedMms = thicknessMm <= 3 ? 22 : thicknessMm <= 5 ? 12 : 6;
                engraveSpeedMms = 400;
                airAssistDesc = "منخفض جداً (0.8 Bar - Low Air) للحصول على حافة مصقولة زجاجية شفافية عالية";
                lensDesc = thicknessMm > 5 ? "2.5 inch High Focal" : "2.0 inch Standard";
                focalOffset = thicknessMm > 4 ? "+1.0 mm (حفر بؤري لعمق القص)" : "0.0 mm";
                exhaustCFM = "400 CFM (شفط كيميائي للميثاكريلات)";
                finishTips = [
                  "استخدم غطاء حماية أزرق أو ورق كرافت لمنع التخدش بقرص الخلية (Honeycomb).",
                  "تجنب ضغط الهواء المرتفع لحفظ السخونة وتلميع حافة الأكريليك بالحرارة الصافية.",
                  "امسح الحواف بكحول إيزوبروبيل بعد تبريد اللوح بـ 10 دقائق لتفادي التشقق (Crazing)."
                ];
              } else if (lowerMatName.includes("خشب") || lowerMatName.includes("wood") || lowerMatName.includes("mdf") || lowerMatName.includes("زان")) {
                cutSpeedMms = thicknessMm <= 3 ? 25 : thicknessMm <= 5 ? 14 : 7;
                passesCount = thicknessMm > 10 ? 2 : 1;
                engraveSpeedMms = 300;
                airAssistDesc = "مرتفع جداً (3.5 Bar - High Air) لمنع التفحم وإبعاد نواتج الاحتراق";
                lensDesc = thicknessMm > 6 ? "2.5 inch / 4.0 inch Deep Cut" : "2.0 inch Standard";
                focalOffset = "-0.5 mm لتركيز القوة داخل سماكة اللوح";
                exhaustCFM = "500 CFM (شفط نواتج الدخان والتراكم الراتنجي)";
                finishTips = [
                  "ضع شريط لاصق ورقي (Masking Tape) على الوجهين لمنع التلطخ بالدخان الأسود.",
                  "اضبط كمبروسر الهواء على أقصى تدفق لطرد شرر الخشب المتطاير.",
                  "سنّف الحواف بسنفرة ناعمة (رقم 320) لملمس ناعم ولون خشب طبيعي جذاب."
                ];
              } else if (lowerMatName.includes("جلد") || lowerMatName.includes("leather")) {
                cutSpeedMms = 30;
                engraveSpeedMms = 450;
                airAssistDesc = "متوسط (1.8 Bar)";
                lensDesc = "1.5 inch / 2.0 inch Fine Engrave";
                finishTips = [
                  "امسح سطح الجلد بقطعة قماش مبللة بماء ورد أو كحول خفيف فور انتهاء الحفر.",
                  "استخدم قوة نقش منخفضة (15-20%) لتجنب رائحة الاحتراق العميقة."
                ];
              }

  return {
    cutSpeedMms,
    engraveSpeedMms,
    passesCount,
    airAssistDesc,
    lensDesc,
    focalOffset,
    exhaustCFM,
    finishTips,
  };
}
