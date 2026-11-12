"use client";
import { ResourcePage } from "@/components/resource-page";
import { pageConfigs } from "@/lib/ui-config";

export default function DocumentsPage() {
  return <ResourcePage config={pageConfigs.documents} />;
}
