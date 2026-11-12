export type LiveEvent = {
  title: string;
  description: string | null;
  location: string | null;
  occurredAt: string;
  type: "integration" | "customs" | "status" | "document" | "payment" | "note";
  source: "dcsa" | "provider";
};
