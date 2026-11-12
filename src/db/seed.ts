import "dotenv/config";
import { seedDemoData } from "../lib/seed";
import { pool } from "../db";

async function main() {
  console.log("Seeding demo data…");
  await seedDemoData();
  console.log("Done. Demo login: admin@alarabi.com / 123456");
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
