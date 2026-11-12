"use client";
import { ResourcePage } from "@/components/resource-page";
import { pageConfigs } from "@/lib/ui-config";

export default function UsersPage() {
  return <ResourcePage config={pageConfigs.users} />;
}
