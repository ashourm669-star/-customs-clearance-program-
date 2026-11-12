import { eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  carrierConnections, carriers, clients, documents, nafezaEvents,
  ports, shipments, tasks,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { buildTrackingUrl, detectCarrier, fetchCarrierData } from "@/lib/carrier-providers";

export const dynamic = "force-dynamic";

type Entity = Record<string, any>;

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    if (!user) return Response.json({ error: "غير مصرح" }, { status: 401 });
    await ensureDatabase();
    const body = await request.json();
    const documentNumber = String(body.documentNumber ?? "").trim().slice(0, 80);
    if (documentNumber.length < 3) {
      return Response.json({ error: "أدخل رقم بوليصة أو AWB صحيح (٣ أحرف على الأقل)" }, { status: 400 });
    }

    const pattern = `%${documentNumber}%`;
    const matches = (await db.select().from(shipments).where(
      or(
        ilike(shipments.transportRef, pattern),
        ilike(shipments.declarationNumber, pattern),
        ilike(shipments.acidNumber, pattern),
        ilike(shipments.refNo, pattern),
      ),
    ).limit(20)) as Entity[];

    const requestPayload = {
      documentNumber,
      requestedAt: new Date().toISOString(),
      requestedBy: user.name,
      searchedFields: ["transportRef", "declarationNumber", "acidNumber", "refNo"],
    };

    async function logLookup(status: string, message: string, response: Entity, shipmentId: number | null = null) {
      try {
        await db.insert(nafezaEvents).values({
          shipmentId,
          eventType: "manifest",
          reference: documentNumber,
          channel: "استعلام بوليصة / AWB",
          carrier: response.detectedCarrierCode ?? null,
          status,
          message,
          payload: JSON.stringify({ request: requestPayload, response }),
        });
      } catch (error) {
        console.error("lookup log error", error);
      }
    }

    if (matches.length > 0) {
      const enriched = await Promise.all(matches.map(async (shipment) => {
        const [client] = shipment.clientId ? await db.select().from(clients).where(eq(clients.id, shipment.clientId)).limit(1) : [];
        const [carrier] = shipment.carrierId ? await db.select().from(carriers).where(eq(carriers.id, shipment.carrierId)).limit(1) : [];
        const [port] = shipment.portId ? await db.select().from(ports).where(eq(ports.id, shipment.portId)).limit(1) : [];
        const [docs, relatedTasks] = await Promise.all([
          db.select().from(documents).where(eq(documents.shipmentId, shipment.id)),
          db.select().from(tasks).where(eq(tasks.shipmentId, shipment.id)),
        ]);
        return {
          ...shipment,
          clientName: client?.name ?? null,
          carrierName: carrier?.name ?? null,
          carrierCode: carrier?.code ?? null,
          portName: port?.name ?? null,
          documentsCount: docs.length,
          tasksCount: relatedTasks.length,
        };
      }));
      await logLookup("accepted", `تم العثور على ${matches.length} شحنة محلياً برقم ${documentNumber}`, { found: matches.length, source: "local" }, matches[0].id);
      return Response.json({
        found: true,
        source: "local",
        mode: "local-database",
        message: `تم العثور على ${matches.length} ملف شحنة مسجّل في قاعدة بيانات الشركة`,
        results: enriched,
      });
    }

    const detected = detectCarrier(documentNumber);
    const [allCarriers, allConnections] = await Promise.all([
      db.select().from(carriers),
      db.select().from(carrierConnections),
    ]);
    const matchedCarrier = detected
      ? allCarriers.find((c) => c.code === detected.carrierCode)
      : undefined;
    const connection = (matchedCarrier
      ? allConnections.find((c) => c.carrierId === matchedCarrier.id && c.enabled)
      : undefined)
      ?? allConnections.find((c) => c.enabled && c.provider !== "official" && (c.apiKey || process.env.TRACKINGMORE_API_KEY || process.env.CARRIER_API_KEY));

    const envConfigured = Boolean(
      (process.env.CARRIER_LOOKUP_URL || process.env.CARRIER_API_URL) && process.env.CARRIER_API_KEY,
    ) || Boolean(process.env.TRACKINGMORE_API_KEY);
    const activeConnection: Entity | undefined = connection ?? (
      envConfigured
        ? { provider: process.env.TRACKINGMORE_API_KEY ? "trackingmore" : "custom", apiKey: null, apiUrl: null, providerCode: null, trackingUrlTemplate: null }
        : undefined
    );
    const templateConnection = matchedCarrier
      ? allConnections.find((c) => c.carrierId === matchedCarrier.id)
      : undefined;
    const trackingUrl = buildTrackingUrl(activeConnection?.trackingUrlTemplate ?? templateConnection?.trackingUrlTemplate, documentNumber);
    const carrierInfo = matchedCarrier
      ? { code: matchedCarrier.code, name: matchedCarrier.name, type: matchedCarrier.type }
      : null;
    const activeProvider = String(activeConnection?.provider ?? "official");
    const hasCredentials = Boolean(
      activeConnection?.apiKey || process.env.TRACKINGMORE_API_KEY || process.env.CARRIER_API_KEY,
    );

    if (activeConnection && activeProvider !== "official" && hasCredentials) {
      const providerResult = await fetchCarrierData({
        provider: activeProvider,
        apiKey: activeConnection.apiKey,
        apiUrl: activeConnection.apiUrl,
        providerCode: activeConnection.providerCode,
        documentNumber,
        carrierCode: matchedCarrier?.code ?? detected?.carrierCode ?? "UNKNOWN",
        isAir: detected?.isAir ?? /^\d{3}-?\d{8}$/.test(documentNumber.replace(/\s/g, "")),
      });
      await logLookup(
        providerResult.ok ? "accepted" : "rejected",
        `${providerResult.message} · ${documentNumber}`,
        { source: "carrier-api", provider: providerResult.provider, ok: providerResult.ok, detectedCarrierCode: detected?.carrierCode ?? null, normalized: providerResult.normalized },
      );
      return Response.json({
        found: providerResult.ok,
        source: "carrier",
        mode: "live",
        message: providerResult.message,
        provider: providerResult.provider,
        detected,
        carrier: carrierInfo,
        trackingUrl,
        normalized: providerResult.normalized,
        carrierData: providerResult.raw,
      });
    }

    await logLookup("rejected", `رقم ${documentNumber} غير مسجل محلياً${trackingUrl ? " ويحتاج مفتاح API لجلب بياناته" : ""}`, {
      found: 0, source: trackingUrl ? "official-site" : "none",
      detectedCarrierCode: detected?.carrierCode ?? null,
      trackingUrl,
      note: "No external credentials configured; no shipment data was fabricated.",
    });

    return Response.json({
      found: false,
      source: trackingUrl ? "official" : "none",
      mode: "no-credentials",
      message: trackingUrl
        ? `تم التعرف على الناقل (${matchedCarrier?.name ?? "غير محدد"})، لكن جلب البيانات داخل البرنامج يحتاج مفتاح API خاص بهذا الناقل أو مزوّد تتبع.`
        : "رقم البوليصة غير مسجّل في قاعدة بيانات الشركة، ولم يتم التعرف على الناقل من رقم المستند.",
      hint: "افتح صفحة «ربط الناقلين»، اختر المزوّد (TrackingMore أو API الناقل) وأدخل المفتاح، وسيجلب النظام البيانات الحقيقية تلقائياً عند البحث.",
      trackingUrl,
      detected,
      carrier: carrierInfo,
      documentNumber,
    });
  } catch (error) {
    console.error("lookup error", error);
    return Response.json({ error: "تعذر تنفيذ الاستعلام" }, { status: 500 });
  }
}
