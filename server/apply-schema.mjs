import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "../database/schema.sql");
const sql = await fs.readFile(schemaPath, "utf8");

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  multipleStatements: true,
  charset: "utf8mb4",
});

try {
  await connection.query(sql);
  console.log(`Applied database schema from ${schemaPath}`);
} finally {
  await connection.end();
}
