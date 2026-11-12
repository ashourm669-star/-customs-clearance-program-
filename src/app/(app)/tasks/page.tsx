"use client";
import { ResourcePage } from "@/components/resource-page";
import { pageConfigs } from "@/lib/ui-config";

export default function TasksPage() {
  return <ResourcePage config={pageConfigs.tasks} />;
}
