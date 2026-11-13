export const PERMISSIONS = [
  { key: "dashboard", label: "لوحة التحكم" },
  { key: "shipments", label: "ملفات التخليص" },
  { key: "tracking", label: "استعلام البوالص والتتبع" },
  { key: "customs", label: "المنظومة الجمركية والبنود" },
  { key: "documents", label: "المستندات والصور" },
  { key: "invoices", label: "الفواتير والتحصيل" },
  { key: "clients", label: "العملاء" },
  { key: "carriers", label: "شركات الشحن" },
  { key: "integrations", label: "مزامنة الربط الخارجي" },
  { key: "reports", label: "التقارير والتصدير" },
  { key: "users", label: "إدارة المستخدمين" },
  { key: "settings", label: "إعدادات المنشأة" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];
export const ALL_PERMISSIONS: string[] = PERMISSIONS.map((item) => item.key);

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS,
  manager: ["dashboard", "shipments", "tracking", "customs", "documents", "invoices", "clients", "carriers", "integrations", "reports", "settings"],
  agent: ["shipments", "tracking", "customs", "documents", "clients"],
  viewer: ["tracking", "documents", "reports"],
};

/** A non-empty explicit selection REPLACES role defaults; it is not an additive grant. */
export function permissionsFor(role: string, custom?: string[] | null): string[] {
  if (role === "admin") return ALL_PERMISSIONS;
  if (Array.isArray(custom) && custom.length > 0) {
    return [...new Set(custom.filter((value) => ALL_PERMISSIONS.includes(value) && value !== "users"))];
  }
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer;
}

export function can(role: string, permission: string, custom?: string[] | null): boolean {
  return permissionsFor(role, custom).includes(permission);
}
