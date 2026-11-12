import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { documents as documentsTable } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getShipmentById, listEventsForShipment, listInvoices, listCarriers } from "@/lib/queries";
import { ShipmentDetail } from "./shipment-detail";

export const dynamic = "force-dynamic";

export default async function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shipmentId = Number(id);
  if (!Number.isFinite(shipmentId)) notFound();

  const user = await requireUser();
  const shipment = await getShipmentById(shipmentId);
  if (!shipment) notFound();

  const [events, docRows, invoices, carriers] = await Promise.all([
    listEventsForShipment(shipmentId),
    db.select().from(documentsTable).where(eq(documentsTable.shipmentId, shipmentId)),
    listInvoices(),
    listCarriers(),
  ]);

  const documents = docRows
    .map((row) => ({
      id: row.id,
      shipmentId: row.shipmentId,
      shipmentReference: shipment.reference,
      clientName: shipment.clientName,
      name: row.name,
      type: row.type,
      status: row.status,
      sizeKb: row.sizeKb,
      uploadedBy: row.uploadedBy,
      createdAt: (row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)).toISOString(),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const invoice = invoices.find((item) => item.shipmentId === shipmentId) ?? null;
  const carrier = carriers.find((item) => item.id === shipment.carrierId) ?? null;

  return (
    <div>
      <Link href="/shipments" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-[#0f9d8b]">
        <ArrowRight className="size-4" />
        رجوع إلى ملفات التخليص
      </Link>
      <ShipmentDetail
        shipment={shipment}
        initialEvents={events}
        initialDocuments={documents}
        invoice={invoice}
        carrier={carrier}
        userName={user.name}
      />
    </div>
  );
}
