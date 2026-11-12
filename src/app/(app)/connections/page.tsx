"use client";

import { KeyRound, ShieldCheck, Database, ExternalLink } from "lucide-react";
import { ResourcePage } from "@/components/resource-page";
import { SectionCard } from "@/components/ui";
import { pageConfigs } from "@/lib/ui-config";

export default function ConnectionsPage() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: KeyRound, title: "١. احصل على مفتاح API", text: "حساب مطوّر لدى الناقل، أو حساب TrackingMore لدعم الحاويات وبوالص AWB." },
          { icon: Database, title: "٢. سجّل الربط هنا", text: "اختر الناقل، المزوّد TrackingMore أو API مباشر، ثم الصق المفتاح وكود الناقل." },
          { icon: ShieldCheck, title: "٣. ابحث عن أي بوليصة", text: "من صفحة «استعلام بوليصة / AWB» سيجلب النظام البيانات الحقيقية ويعرضها ويحفظها." },
        ].map((item) => (
          <div key={item.title} className="card flex items-start gap-3 p-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600"><item.icon size={17} /></div>
            <div>
              <p className="text-[11px] font-bold text-slate-700">{item.title}</p>
              <p className="mt-1 text-[10px] leading-5 text-slate-500">{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      <SectionCard title="ملاحظات مهمة عن الربط الحقيقي" subtitle="شفافية كاملة في مصادر البيانات">
        <div className="space-y-2 p-4 text-[11px] leading-6 text-slate-600">
          <p>• لا توجد بيانات مختلقة: لو مفيش مفتاح API، النظام بيرجّع رابط التتبع الرسمي للناقل فقط وبيقولك صراحة إن الجلب الداخلي غير مفعّل.</p>
          <p>• المفاتيح تُحفظ على السيرفر في قاعدة البيانات، والواجهة تعرضها بشكل مُخفي (••••••••) فقط.</p>
          <p>• التعرف على الناقل تلقائي من بادئة البوليصة: MSCU / MRKU / CMAU / ONEU ... للحاويات، و 077 / 176 / 157 / 235 ... لبوالص الطيران.</p>
          <p>• كل استعلام بيتم تسجيله في سجل أحداث نافذة مع الطلب والرد، ويمكن إنشاء ملف شحنة من البيانات الراجعة.</p>
          <a href="https://www.trackingmore.com/docs/trackingmore" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-teal-700 hover:underline">
            وثائق TrackingMore API v4 <ExternalLink size={12} />
          </a>
        </div>
      </SectionCard>

      <ResourcePage config={pageConfigs.carrierConnections} />
    </div>
  );
}
