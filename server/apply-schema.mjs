import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { databaseConfig } from "./db-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "../database/schema.sql");
const sql = await fs.readFile(schemaPath, "utf8");

const connection = await mysql.createConnection(
  databaseConfig({ includeDatabase: false, multipleStatements: true }),
);

try {
  await connection.query(sql);
  console.log(`Applied database schema from ${schemaPath}`);
} finally {
  await connection.end();
}
