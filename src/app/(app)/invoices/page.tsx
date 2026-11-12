"use client";
import { ResourcePage } from "@/components/resource-page";
import { pageConfigs } from "@/lib/ui-config";

export default function InvoicesPage() {
  return <ResourcePage config={pageConfigs.invoices} />;
}
