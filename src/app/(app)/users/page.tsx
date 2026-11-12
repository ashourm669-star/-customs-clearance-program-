import { requireUser } from "@/lib/auth";
import { listUsers } from "@/lib/queries";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const actor = await requireUser();
  const users = await listUsers();
  return <UsersClient initialUsers={users} actor={{ id: actor.id, role: actor.role, name: actor.name }} />;
}
