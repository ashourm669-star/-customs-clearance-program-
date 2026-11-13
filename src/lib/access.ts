import { can, type PermissionKey } from "@/lib/permissions";

type AccessUser = { role: string; permissions?: string[] | null };

const PAGE_RULES: Array<[string, PermissionKey]> = [
  ["/dashboard", "dashboard"], ["/shipments", "shipments"], ["/tracking", "tracking"],
  ["/customs", "customs"], ["/documents", "documents"], ["/invoices", "invoices"],
  ["/clients", "clients"], ["/carriers", "carriers"], ["/integrations", "integrations"],
  ["/reports", "reports"], ["/users", "users"],
];
const API_RULES: Array<[string, PermissionKey]> = [
  ["/api/integrations", "integrations"],
  ["/api/shipments", "shipments"], ["/api/tracking", "tracking"],
  ["/api/documents", "documents"], ["/api/customs", "customs"],
  ["/api/fx/", "customs"], ["/api/invoices", "invoices"],
  ["/api/clients", "clients"], ["/api/carriers", "carriers"],
  ["/api/export", "reports"], ["/api/users", "users"],
  ["/api/settings/company", "settings"], ["/api/settings/database", "settings"],
];

function matches(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function permissionForPath(inputPath: string): PermissionKey | null {
  const path = inputPath.split("?")[0];
  // A carrier sync is a sensitive integration, not ordinary carrier CRUD.
  if (/^\/api\/carriers\/[^/]+\/sync\/?$/.test(path)) return "integrations";
  const rule = (path.startsWith("/api/") ? API_RULES : PAGE_RULES).find(([prefix]) => matches(path, prefix));
  return rule?.[1] ?? null;
}

export function canAccessPath(user: AccessUser, path: string) {
  const permission = permissionForPath(path);
  if (!permission) return true;
  if (permission === "users" && user.role !== "admin") return false;
  return can(user.role, permission, user.permissions);
}

export function firstAllowedPath(user: AccessUser) {
  const first = PAGE_RULES.find(([path]) => canAccessPath(user, path));
  return first?.[0] ?? "/settings";
}

export function activityVisibleTo(user: AccessUser, entity: string) {
  if (entity === "app_settings") return ["admin", "manager"].includes(user.role) && can(user.role, "settings", user.permissions);
  const paths: Record<string, string> = {
    shipments: "/shipments", shipment_events: "/shipments", shipment_items: "/customs",
    clients: "/clients", carriers: "/carriers", documents: "/documents",
    invoices: "/invoices", commercial_invoices: "/customs", contracts: "/customs",
    tariff_codes: "/customs", banks: "/customs", integration_logs: "/integrations",
    users: "/users", app_settings: "/settings",
  };
  return canAccessPath(user, paths[entity] ?? "/reports");
}
