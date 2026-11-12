import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import { users } from "./schema";
import { hashPassword } from "../lib/password";

async function main() {
  const email = process.argv[2] ?? "ashourm669@gmail.com";
  const password = process.argv[3] ?? "123456";
  const result = await db
    .update(users)
    .set({ passwordHash: hashPassword(password) })
    .where(eq(users.email, email))
    .returning({ email: users.email, name: users.name });
  console.log("password reset:", result, "new password:", password);
  await pool.end();
}
main();
