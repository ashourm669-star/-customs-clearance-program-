import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await ensureDatabase();
  const user = await getSession();
  if (user) redirect("/dashboard");
  return <LoginForm />;
}
