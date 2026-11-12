export type OfficialReference = { title: string; description: string; url: string; kind: "law" | "tariff" | "circular" | "portal" };

/**
 * روابط رسمية فقط. لا تحتوي على نصوص التعريفة نفسها لأن الجدول الرسمي
 * يصدر بقرار جمهوري ويتحدث دورياً، ويجب استيراده من المصدر المعتمد.
 */
export const OFFICIAL_REFERENCES: OfficialReference[] = [
  { title: "التعريفة الجمركية المتكاملة — مصلحة الجمارك", description: "الاستعلام الرسمي عن البند وفئة الضريبة الجمركية وضريبة الجدول.", url: "https://customs.gov.eg/Services/Inquiries/Tarrif", kind: "tariff" },
  { title: "قانون الجمارك رقم 207 لسنة 2020", description: "القانون النافذ واللائحة التنفيذية والتعديلات اللاحقة.", url: "https://www.elmodawanaeg.com/%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%B1%D9%82%D9%85-%D9%A2%D9%A0%D9%A7-%D9%84%D8%B3%D9%86%D8%A9-%D9%A2%D9%A0%D9%A2%D9%A0-%D8%A8%D8%A5%D8%B5%D8%AF%D8%A7%D8%B1-%D9%82%D8%A7%D9%86%D9%88%D9%86/", kind: "law" },
  { title: "المنشورات والتعليمات الجمركية", description: "أحدث المنشورات الصادرة (تحديثات التعريفة والشروط الرقابية).", url: "https://customs.gov.eg/Legislations/Manshorat?categoryId=4", kind: "circular" },
  { title: "أسعار تحويل العملات — مصلحة الجمارك", description: "أسعار الصرف المعتمدة جمركياً، تُستخدم في تقييم الشحنات.", url: "https://customs.gov.eg/Services/Inquiries/CurrencyRates", kind: "portal" },
  { title: "نظام التسجيل المسبق للشحنات ACI", description: "منصة التسجيل المسبق وإقرارات ACID.", url: "https://www.nafeza.gov.eg/", kind: "portal" },
  { title: "الهيئة العامة للرقابة على الصادرات والواردات", description: "الموافقات والرقابة النوعية على الواردات.", url: "https://www.goeic.gov.eg/", kind: "portal" },
  { title: "الهيئة القومية لسلامة الغذاء", description: "شروط استيراد الأغذية والمستندات المطلوبة.", url: "https://www.nfsa.gov.eg/", kind: "portal" },
  { title: "هيئة الدواء المصرية", description: "تسجيل الأدوية والمستلزمات الطبية وشروط الاستيراد.", url: "https://www.edaegypt.gov.eg/", kind: "portal" },
];
