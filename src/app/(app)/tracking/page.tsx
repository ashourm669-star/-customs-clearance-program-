import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listCarriers } from "@/lib/queries";
import { TrackingClient } from "./tracking-client";

export const dynamic = "force-dynamic";

export default async function TrackingPage() {
  const user = await requireUser();
  const carriers = await listCarriers();
  const providerConfigured = Boolean(process.env.TRACKING_API_URL && process.env.TRACKING_API_KEY);

  return (
    <div>
      <PageHeader
        title="تتبع بوليصة / AWB"
        description="ابحث برقم بوليصة الشحن أو AWB أو رقم الحاوية أو رقم ملف التخليص، داخل قاعدة بياناتك أو لدى مزوّد التتبع."
      />
      <TrackingClient
        userName={user.name}
        providerConfigured={providerConfigured}
        carriers={carriers.map((carrier) => ({ id: carrier.id, name: carrier.name, status: carrier.integrationStatus }))}
      />
    </div>
  );
}
