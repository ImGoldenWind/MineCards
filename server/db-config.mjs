import fs from "node:fs";

function boolEnv(name, fallback = false) {
  const value = process.env[name];

  if (value === undefined) return fallback;

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function sslOptions() {
  if (!boolEnv("DB_SSL")) return undefined;

  const caPath = process.env.DB_SSL_CA_PATH;

  return {
    minVersion: "TLSv1.2",
    ...(caPath ? { ca: fs.readFileSync(caPath, "utf8") } : {}),
  };
}

export function databaseConfig({ includeDatabase = true, multipleStatements = false } = {}) {
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    ...(includeDatabase ? { database: process.env.DB_NAME ?? "minecards" } : {}),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements,
    charset: "utf8mb4",
    ssl: sslOptions(),
  };
}
