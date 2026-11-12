export const PERMISSIONS = [
  { key: "shipments", label: "ملفات التخليص" },
  { key: "customs", label: "المنظومة الجمركية والبنود" },
  { key: "documents", label: "المستندات والصور" },
  { key: "invoices", label: "الفواتير والتحصيل" },
  { key: "clients", label: "العملاء" },
  { key: "carriers", label: "شركات الشحن والربط" },
  { key: "reports", label: "التقارير" },
  { key: "users", label: "إدارة المستخدمين" },
  { key: "settings", label: "الإعدادات" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];
export const ALL_PERMISSIONS: string[] = PERMISSIONS.map((p) => p.key);

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS,
  manager: ["shipments", "customs", "documents", "invoices", "clients", "carriers", "reports", "settings"],
  agent: ["shipments", "customs", "documents", "clients"],
  viewer: ["shipments", "documents", "reports"],
};

export function permissionsFor(role: string, custom?: string[] | null): string[] {
  const base = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer;
  return custom && custom.length ? Array.from(new Set([...base, ...custom])) : base;
}

export function can(role: string, permission: string, custom?: string[] | null): boolean {
  return permissionsFor(role, custom).includes(permission);
}
