import Link from "next/link";
import { AlertTriangle, Bell, BookOpen, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAlerts } from "@/lib/queries";
import { Badge, EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { OFFICIAL_REFERENCES } from "@/lib/customs-references";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  await requireUser();
  const alerts = await getAlerts();
  return (
    <div className="space-y-5">
      <PageHeader title="الإشعارات والتنبيهات" description="تنبيهات حقيقية محسوبة من بياناتك: مستندات معلّقة، شحنات متأخرة، وفواتير تحتاج تحصيلاً." />
      <div className="card overflow-hidden">
        {alerts.length === 0 ? (
          <EmptyState title="لا توجد تنبيهات" description="كل المستندات والفواتير والملفات في وضع سليم." icon={<CheckCircle2 className="size-7 text-emerald-500" />} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <Link href={alert.href} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50">
                  <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${alert.tone === "rose" ? "bg-rose-50 text-rose-600" : alert.tone === "amber" ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600"}`}>
                    {alert.tone === "rose" ? <AlertTriangle className="size-4" /> : alert.tone === "amber" ? <Clock className="size-4" /> : <Bell className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900">{alert.title}</p>
                    <p className="text-[11px] text-slate-500">{alert.body}</p>
                  </div>
                  <Badge tone={alert.tone === "rose" ? "rose" : alert.tone === "amber" ? "amber" : "sky"}>{alert.tone === "rose" ? "عاجل" : alert.tone === "amber" ? "متابعة" : "جديد"}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SectionCard title="مراجع رسمية للتعريفة والتشريع" description="المصادر المعتمدة التي تُحدَّث دورياً — استورد منها جدول التعريفة إلى النظام" bodyClassName="divide-y divide-slate-100">
        {OFFICIAL_REFERENCES.map((reference) => (
          <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0a2239]"><BookOpen className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-900">{reference.title}</p>
              <p className="text-[10px] leading-5 text-slate-500">{reference.description}</p>
            </div>
            <ExternalLink className="mt-1 size-3.5 shrink-0 text-slate-400" />
          </a>
        ))}
      </SectionCard>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-6 text-amber-900">
        <p className="font-extrabold">كيف تصبح التعريفة كاملة داخل النظام؟</p>
        <p className="mt-1">
          نزّل جدول التعريفة الرسمي (Excel/CSV) من مصلحة الجمارك، ثم من <Link href="/customs" className="font-bold underline">المنظومة الجمركية ← التعريفة ← استيراد</Link> ارفعه. سيستورد النظام كل البنود (حتى 20 ألف بند) مع فئاتها وشروطها، وبعد مراجعتها اضبط «نسب معتمدة = نعم» ليبدأ حساب الرسوم عليها.
        </p>
      </div>
    </div>
  );
}
