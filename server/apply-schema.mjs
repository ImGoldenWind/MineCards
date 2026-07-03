import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { databaseConfig } from "./db-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "../database/schema.sql");
const rawSql = await fs.readFile(schemaPath, "utf8");

function boolEnv(name, fallback = false) {
  const value = process.env[name];

  if (value === undefined) return fallback;

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function escapeIdentifier(identifier) {
  return `\`${identifier.replaceAll("`", "``")}\``;
}

const dbName = process.env.DB_NAME ?? "minecards";
const shouldCreateDatabase = boolEnv("DB_CREATE_DATABASE", true);
const databaseIdentifier = escapeIdentifier(dbName);
const sql = shouldCreateDatabase
  ? rawSql
      .replace(
        /CREATE DATABASE IF NOT EXISTS\s+`?minecards`?/i,
        `CREATE DATABASE IF NOT EXISTS ${databaseIdentifier}`,
      )
      .replace(/USE\s+`?minecards`?\s*;/i, `USE ${databaseIdentifier};`)
  : rawSql
      .replace(
        /CREATE DATABASE IF NOT EXISTS\s+`?minecards`?\s+CHARACTER SET\s+utf8mb4\s+COLLATE\s+utf8mb4_unicode_ci\s*;/i,
        "",
      )
      .replace(/USE\s+`?minecards`?\s*;/i, "");

const connection = await mysql.createConnection(
  databaseConfig({
    includeDatabase: !shouldCreateDatabase,
    multipleStatements: true,
  }),
);

try {
  await connection.query(sql);
  console.log(`Applied database schema from ${schemaPath} to ${dbName}`);
} finally {
  await connection.end();
}
