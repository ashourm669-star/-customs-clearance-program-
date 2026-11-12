import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { banks, commercialInvoices, contracts, shipmentItems, shipments, tariffCodes } from "@/db/schema";
import { iso } from "@/lib/format";
import { calculateItem } from "@/lib/customs";

export async function getCustomsData(shipmentId?: number) {
  const [tariffs, contractRows, bankRows, invoiceRows, itemRows, shipmentRows] = await Promise.all([
    db.select().from(tariffCodes).orderBy(asc(tariffCodes.code)),
    db.select().from(contracts).orderBy(desc(contracts.createdAt)),
    db.select().from(banks).orderBy(asc(banks.name)),
    db.select().from(commercialInvoices).orderBy(desc(commercialInvoices.createdAt)),
    db.select().from(shipmentItems).where(shipmentId ? eq(shipmentItems.shipmentId, shipmentId) : undefined).orderBy(asc(shipmentItems.id)),
    db.select({ id: shipments.id, reference: shipments.reference, clientId: shipments.clientId }).from(shipments).orderBy(desc(shipments.createdAt)),
  ]);
  const tariffMap = new Map(tariffs.map((tariff) => [tariff.id, tariff]));
  return {
    tariffs: tariffs.map((row) => ({ ...row, createdAt: iso(row.createdAt) as string, legalUpdatedAt: iso(row.legalUpdatedAt) })),
    contracts: contractRows.map((row) => ({ ...row, createdAt: iso(row.createdAt) as string, startDate: iso(row.startDate), endDate: iso(row.endDate) })),
    banks: bankRows.map((row) => ({ ...row, createdAt: iso(row.createdAt) as string })),
    invoices: invoiceRows.map((row) => ({ ...row, createdAt: iso(row.createdAt) as string, date: iso(row.date) })),
    shipments: shipmentRows,
    items: itemRows.map((row) => {
      const tariff = row.tariffId ? tariffMap.get(row.tariffId) : undefined;
      const calculation = calculateItem({
        description: row.description,
        quantity: Number(row.quantity),
        unitValue: Number(row.unitValue),
        currency: row.currency,
        invoiceValue: Number(row.invoiceValue),
        freight: Number(row.freight),
        insurance: Number(row.insurance),
        dutyBps: row.dutyBps ?? tariff?.dutyBps ?? null,
        vatBps: row.vatBps ?? tariff?.vatBps ?? null,
      });
      return { ...row, tariffName: tariff?.nameAr ?? row.description, tariffNameEn: tariff?.nameEn ?? null, authorities: tariff?.authorities ?? [], calculation };
    }),
  };
}

export type CustomsData = Awaited<ReturnType<typeof getCustomsData>>;
