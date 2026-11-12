const numberFormatter = new Intl.NumberFormat("en-US");

export function formatMoney(value: number | null | undefined, currency = "EGP"): string {
  const amount = Number(value ?? 0);
  return `${numberFormatter.format(amount)} ${currency === "EGP" ? "ج.م" : currency}`;
}

export function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(Number(value ?? 0));
}

export function formatWeight(kg: number | null | undefined): string {
  const value = Number(kg ?? 0);
  if (value >= 1000) return `${numberFormatter.format(Math.round(value / 100) / 10)} طن`;
  return `${numberFormatter.format(value)} كجم`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60_000],
    ["hour", 3_600_000],
    ["day", 86_400_000],
    ["month", 30 * 86_400_000],
    ["year", 365 * 86_400_000],
  ];
  if (abs < 60_000) return "الآن";
  let chosen: [Intl.RelativeTimeFormatUnit, number] = units[0];
  for (const unit of units) {
    if (abs >= unit[1]) chosen = unit;
  }
  return rtf.format(Math.round(diff / chosen[1]), chosen[0]);
}

export function iso(value: Date | string | null): string | null {
  if (!value) return null;
  return (typeof value === "string" ? new Date(value) : value).toISOString();
}

export function todayInputValue(value?: string | Date | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
}
