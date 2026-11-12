"use client";

import { useState } from "react";
import Link from "next/link";
import { FileSearch } from "lucide-react";
import { ResourcePage } from "@/components/resource-page";
import { ShipmentDrawer } from "@/components/shipment-drawer";
import { pageConfigs } from "@/lib/ui-config";
import type { Row } from "@/components/data-provider";

export default function ShipmentsPage() {
  const [selected, setSelected] = useState<Row | null>(null);
  return (
    <>
      <ResourcePage
        config={pageConfigs.shipments}
        onRowClick={setSelected}
        extraActions={
          <>
            <Link href="/clearance" className="btn-primary"><FileSearch size={15} /> ملف تخليص جديد</Link>
            <Link href="/lookup" className="btn-ghost">استعلام بوليصة</Link>
            <Link href="/tariff" className="btn-ghost">البند الجمركي</Link>
          </>
        }
      />
      <ShipmentDrawer shipment={selected} onClose={() => setSelected(null)} />
    </>
  );
}
