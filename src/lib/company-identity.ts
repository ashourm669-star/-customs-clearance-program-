export const LOCKED_COMPANY_FIELDS = {
  commercial_register: "364",
  tax_id: "439942616",
  customs_license: "مرخص من مصلحة الجمارك",
} as const;

export const LOCKED_COMPANY_KEYS = new Set<string>(Object.keys(LOCKED_COMPANY_FIELDS));
