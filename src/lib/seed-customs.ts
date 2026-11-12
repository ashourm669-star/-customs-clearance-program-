import { db } from "@/db";
import { banks, clients, contracts, shipments, tariffCodes, commercialInvoices } from "@/db/schema";
import { eq } from "drizzle-orm";

const source = "https://customs.gov.eg/";
const circulars = [
  { title: "منشور 32 بتاريخ 13 نوفمبر 2025 — عدم السماح باستيراد السكر المكرر للاتجار إلا بموافقة استيرادية معتمدة", url: "https://customs.gov.eg/Legislations/Manshorat?categoryId=4", reference: "مصلحة الجمارك — منشور 32/2025" },
  { title: "منشور 31 بتاريخ 18 نوفمبر 2025 — إضافة بند إلى الملحق 3 للسلع التي تستورد بشروط خاصة", url: "https://customs.gov.eg/Legislations/Manshorat?categoryId=4", reference: "مصلحة الجمارك — منشور 31/2025" },
  { title: "منشور 30 بتاريخ 18 نوفمبر 2025 — السلع الخاضعة للرقابة النوعية ورسوم فحصها", url: "https://customs.gov.eg/Legislations/Manshorat?categoryId=4", reference: "مصلحة الجمارك — منشور 30/2025" },
];

export async function seedCustomsReference() {
  await db.insert(banks).values([
    { name: "البنك الأهلي المصري", nameEn: "National Bank of Egypt", code: "NBE", swift: "NBEGEGCX", currency: "EGP", accountName: "العربي للخدمات الجمركية واللوجستية", status: "manual", notes: "بيانات مرجعية — أضف حساب الشركة الحقيقي قبل استخدامها في التحصيل." },
    { name: "البنك التجاري الدولي", nameEn: "Commercial International Bank", code: "CIB", swift: "CIBEEGCX", currency: "EGP", accountName: "العربي للخدمات الجمركية واللوجستية", status: "manual", notes: "السويفت مرجع عام؛ لا يوجد ربط بنكي فعلي في هذه النسخة." },
    { name: "بنك الإسكندرية", nameEn: "Alexandria Bank", code: "ALEX", swift: "ALEXEGX", currency: "EGP", status: "manual", notes: "أضف بيانات الحساب المعتمد." },
  ]).onConflictDoNothing();

  const codes = [
    { code: "1509100010", nameAr: "زيت زيتون بكر ممتاز", nameEn: "Virgin olive oil", chapter: "15", category: "زيوت ودهون نباتية", unit: "كجم" },
    { code: "8471300000", nameAr: "حاسبات محمولة / لابتوب", nameEn: "Portable automatic data processing machines", chapter: "84", category: "آلات وأجهزة ميكانيكية", unit: "قطعة" },
    { code: "8528720000", nameAr: "شاشات وأجهزة عرض", nameEn: "Reception apparatus for television", chapter: "85", category: "آلات كهربائية وإلكترونيات", unit: "قطعة" },
    { code: "9403300000", nameAr: "أثاث مكتبي", nameEn: "Office furniture", chapter: "94", category: "أثاث ومصنوعات خشبية", unit: "قطعة" },
    { code: "6109100000", nameAr: "تيشيرت / قمصان قطنية", nameEn: "T-shirts of cotton", chapter: "61", category: "ملابس ومصنوعات نسيجية", unit: "قطعة" },
    { code: "3901200000", nameAr: "إيثيلين بوليمر كثافة أقل من 0.94", nameEn: "Polyethylene having a specific gravity of less than 0.94", chapter: "39", category: "بوليمرات ومواد كيماوية", unit: "كجم" },
    { code: "3004100000", nameAr: "مستحضرات أدوية تحتوي على بنسلين", nameEn: "Medicaments containing penicillins", chapter: "30", category: "منتجات صيدلانية", unit: "كجم" },
    { code: "8708990000", nameAr: "أجزاء أخرى من سيارات / مركبات", nameEn: "Other parts and accessories of motor vehicles", chapter: "87", category: "سيارات وقطع غيار", unit: "قطعة" },
    { code: "9018900000", nameAr: "أدوات وأجهزة طبية أخرى", nameEn: "Other medical instruments and appliances", chapter: "90", category: "أجهزة طبية", unit: "قطعة" },
    { code: "7323930000", nameAr: "أدوات منزلية من ستانلس ستيل", nameEn: "Table and kitchen articles of stainless steel", chapter: "73", category: "مصنوعات حديد وصلب", unit: "قطعة" },
    { code: "0901110000", nameAr: "بن أخضر غير محمص", nameEn: "Coffee, not roasted, not decaffeinated", chapter: "09", category: "بن وأغذية زراعية", unit: "كجم" },
    { code: "1701990000", nameAr: "سكر آخر بخلاف سكر القصب", nameEn: "Other refined sugar", chapter: "17", category: "سكر ومصنوعاته", unit: "كجم" },
  ];

  for (const item of codes) {
    await db.insert(tariffCodes).values({
      ...item,
      dutyBps: null,
      vatBps: 1400,
      importStatus: "verification_required",
      authorities: item.code.startsWith("30") ? ["هيئة الدواء المصرية — تحقق من متطلبات التسجيل"] : item.code.startsWith("39") ? ["الجهات البيئية / الرقابية حسب نوع المادة — تحقق من المنشورات"] : ["مصلحة الجمارك", "الهيئة العامة للرقابة على الصادرات والواردات — حسب طبيعة الصنف"],
      conditions: ["تصنيف الصنف ورمز المنشأ والمادة الخام أمران مستقلان؛ تحقق من البند الفعلي", "نسبة الجمارك غير معتمدة في هذا السجل المرجعي", "راجع التعريفة الرسمية والمنشورات النافذة وقت تقديم الإقرار"],
      sourceUrl: source,
      sourceReference: "سجل تصنيف مرجعي — ليس نسخة رسمية كاملة للتعريفة",
      verified: 0,
      notes: "الأسماء والأكواد للتجربة والبحث فقط. لا تُستخدم هذه النسب لتقدير التزام قانوني قبل اعتمادها.",
    }).onConflictDoNothing();
  }

  for (const circular of circulars) {
    await db.insert(tariffCodes).values({
      code: `CIRC-2025-${circular.title.slice(7, 9)}`,
      nameAr: circular.title,
      nameEn: "Egyptian customs regulatory circular",
      chapter: "التشريعات",
      category: "منشورات رسمية",
      unit: "—",
      dutyBps: null,
      vatBps: null,
      importStatus: "conditional",
      authorities: ["مصلحة الجمارك"],
      conditions: [circular.title, "اقرأ النص الرسمي والمنشورات اللاحقة قبل الإفراج"],
      sourceUrl: circular.url,
      sourceReference: circular.reference,
      verified: 0,
      notes: "مرجع تشريعي فقط؛ لا يحدد نسبة جمركية لبند بعينه.",
    }).onConflictDoNothing();
  }

  const savedClients = await db.select({ id: clients.id, name: clients.name }).from(clients).orderBy(clients.id).limit(3);
  const savedBanks = await db.select({ id: banks.id }).from(banks).orderBy(banks.id).limit(1);
  if (savedClients.length) {
    await db.insert(contracts).values([
      { number: "CT-2026-0041", clientId: savedClients[0].id, name: "توريد زيوت ومواد غذائية", type: "sale", incoterm: "CIF", paymentMethod: "bank_transfer", bankId: savedBanks[0]?.id ?? null, currency: "USD", amount: 128000, startDate: new Date("2026-01-01"), endDate: new Date("2027-01-01"), paymentTerms: "50% مقدماً و50% بعد استلام المستندات — شروط تجريبية", notes: "عقد تجريبي للعرض؛ ليس مستنداً تجارياً معتمداً." },
      { number: "CT-2026-0042", clientId: savedClients[1]?.id ?? savedClients[0].id, name: "توريد أجهزة ومعدات", type: "service", incoterm: "FOB", paymentMethod: "letter_of_credit", bankId: savedBanks[0]?.id ?? null, currency: "EUR", amount: 215000, startDate: new Date("2026-01-01"), endDate: new Date("2027-01-01"), paymentTerms: "اعتماد مستندي غير قابل للإلغاء — بيانات تجريبية", notes: "عقد تجريبي للعرض." },
      { number: "CT-2026-0043", clientId: savedClients[2]?.id ?? savedClients[0].id, name: "توريد منسوجات قطنية", type: "sale", incoterm: "CFR", paymentMethod: "bank_transfer", currency: "EUR", amount: 74000, startDate: new Date("2026-01-01"), endDate: new Date("2027-01-01"), paymentTerms: "تحويل بنكي بعد الإفراج — بيانات تجريبية", notes: "عقد تجريبي للعرض." },
    ]).onConflictDoNothing();
  }

  const existingInvoices = await db.select({ id: commercialInvoices.id }).from(commercialInvoices).limit(1);
  if (!existingInvoices.length) {
    const samples = await db.select().from(shipments).where(eq(shipments.reference, "CLR-2026-1001")).limit(1);
    const sample = samples[0];
    if (sample) {
      await db.insert(commercialInvoices).values({
        shipmentId: sample.id, clientId: sample.clientId, number: "CI-2026-1001", date: new Date("2026-01-10"),
        supplierName: "Italian Olive Export SRL", originCountry: "إيطاليا", currency: "USD", subtotal: 128000,
        freight: 4200, insurance: 1800, total: 134000, incoterm: "CIF", paymentMethod: "bank_transfer",
        bankName: "Intesa Sanpaolo", bankSwift: "BCITITMM", bankAccount: "IT00X0542811101000000123456",
        sourceText: "CI-2026-1001\nItalian Olive Export SRL\nInvoice date: 2026-01-10\nInvoice number: CI-2026-1001\nCountry of origin: Italy\nCurrency: USD\nSubtotal: 128000\nFreight: 4200\nInsurance: 1800\nGrand total: 134000\nIncoterm: CIF\nPayment terms: bank transfer\nDescription: Virgin olive oil\nQuantity: 1000\nUnit price: 128\nAmount: 128000",
        sourceFilename: "demo-commercial-invoice.txt", reviewStatus: "needs_review",
      });
    }
  }

  console.log("[seed] customs reference data ready (duty rates intentionally unverified)");
}
