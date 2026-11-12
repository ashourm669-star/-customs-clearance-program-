import { eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { shipmentEvents, shipments } from "@/db/schema";

export type NafezaResult = {
  ok: boolean;
  status: "sent" | "unconfigured" | "unauthorized" | "error";
  reference: string | null;
  message: string;
  httpStatus: number | null;
  payload: unknown;
};

type ShipmentForAci = {
  id: number;
  reference: string;
  blNumber: string | null;
  clientName?: string | null;
  port: string | null;
  origin: string | null;
  destination: string | null;
  goodsDescription: string | null;
  hsCode: string | null;
  invoiceValue: number | null;
  currency: string | null;
  grossWeight: number | null;
  packageCount: number | null;
};

/**
 * Nafeza submission is available ONLY for a licensed API integration with
 * its exact documented token and declaration endpoints. No guessed endpoints,
 * scraped login pages, simulated ACIDs, or fabricated success responses.
 */
export async function sendNafezaDeclaration(identifier: string, actor: string): Promise<NafezaResult> {
  const tokenUrl = process.env.NAFEZA_TOKEN_URL;
  const submitUrl = process.env.NAFEZA_DECLARATIONS_URL;
  const clientId = process.env.NAFEZA_CLIENT_ID;
  const clientSecret = process.env.NAFEZA_CLIENT_SECRET;

  const rows = await db
    .select({
      id: shipments.id,
      reference: shipments.reference,
      blNumber: shipments.blNumber,
      port: shipments.port,
      origin: shipments.origin,
      destination: shipments.destination,
      goodsDescription: shipments.goodsDescription,
      hsCode: shipments.hsCode,
      invoiceValue: shipments.invoiceValue,
      currency: shipments.currency,
      grossWeight: shipments.grossWeight,
      packageCount: shipments.packageCount,
    })
    .from(shipments)
    .where(ilike(shipments.blNumber, identifier.trim()))
    .limit(1);

  const shipment: ShipmentForAci | undefined = rows[0];
  if (!shipment) {
    return {
      ok: false,
      status: "error",
      reference: null,
      message: "لا يوجد ملف بهذه البوليصة. أنشئ الملف أو استورد بيانات التتبع أولاً.",
      httpStatus: null,
      payload: null,
    };
  }

  const declaration = {
    declarant: { name: actor, license: "EG-CB-10942" },
    transportDocumentReference: shipment.blNumber,
    fileReference: shipment.reference,
    portOfEntry: shipment.port,
    originCountry: shipment.origin,
    destination: shipment.destination,
    goods: {
      description: shipment.goodsDescription,
      hsCode: shipment.hsCode,
      invoiceValue: shipment.invoiceValue,
      currency: shipment.currency,
      grossWeightKg: shipment.grossWeight,
      packageCount: shipment.packageCount,
    },
  };

  if (!submitUrl || !clientId || !clientSecret || !tokenUrl) {
    return {
      ok: false,
      status: "unconfigured",
      reference: null,
      message:
        "لا يوجد ربط معتمد مع نافذة. يتطلب NAFEZA_TOKEN_URL وNAFEZA_DECLARATIONS_URL الموثقين من نافذة وNAFEZA_CLIENT_ID وNAFEZA_CLIENT_SECRET. رقم ACID يصدر من نافذة فقط.",
      httpStatus: null,
      payload: declaration,
    };
  }

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    const tokenText = await tokenResponse.text();
    if (!tokenResponse.ok) {
      return {
        ok: false,
        status: tokenResponse.status === 401 || tokenResponse.status === 403 ? "unauthorized" : "error",
        reference: null,
        message: `رفضت نافذة طلب التوكن (HTTP ${tokenResponse.status}). تحقق من بيانات المنشأة.`,
        httpStatus: tokenResponse.status,
        payload: tokenText.slice(0, 300),
      };
    }
    const tokenJson = JSON.parse(tokenText) as { access_token?: string };
    if (!tokenJson.access_token) {
      return {
        ok: false,
        status: "error",
        reference: null,
        message: "رد نافذة لا يحتوي access_token.",
        httpStatus: tokenResponse.status,
        payload: tokenText.slice(0, 300),
      };
    }

    const response = await fetch(submitUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
      body: JSON.stringify(declaration),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const text = await response.text();
    let payload: unknown = text;
    try {
      payload = JSON.parse(text);
    } catch {
      // keep raw text
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status === 401 || response.status === 403 ? "unauthorized" : "error",
        reference: null,
        message: `رفضت نافذة الإقرار (HTTP ${response.status}). ${text.slice(0, 200)}`,
        httpStatus: response.status,
        payload,
      };
    }

    const aci =
      (payload as { acid?: string; reference?: string; declarationId?: string })?.acid ??
      (payload as { reference?: string })?.reference ??
      (payload as { declarationId?: string })?.declarationId ??
      null;

    await db.insert(shipmentEvents).values({
      shipmentId: shipment.id,
      title: "قبول إقرار ACID من منصة نافذة (حقيقي)",
      description: `المرجع: ${aci ?? "لم يُرجع رقم ACID"} · الجهة: ${new URL(submitUrl).host} · بواسطة ${actor}.`,
      type: "customs",
      location: "منصة نافذة",
      occurredAt: new Date(),
    });

    if (["draft", "documents_pending"].includes((rows[0] as { status?: string })?.status ?? "")) {
      await db.update(shipments).set({ status: "under_review", updatedAt: new Date() }).where(eq(shipments.id, shipment.id));
    }

    return {
      ok: true,
      status: "sent",
      reference: aci,
      message: `تم قبول الإقرار من نافذة برقم ${aci ?? "—"}.`,
      httpStatus: response.status,
      payload,
    };
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      status: "error",
      reference: null,
      message: timeout ? "انتهت مهلة الاتصال بمنصة نافذة." : "تعذّر الوصول إلى منصة نافذة.",
      httpStatus: null,
      payload: error instanceof Error ? error.message : null,
    };
  }
}
