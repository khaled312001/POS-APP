import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";

export const pool = mysql.createPool({
  host:     process.env.MYSQL_HOST     || "127.0.0.1",
  port:     Number(process.env.MYSQL_PORT || 3306),
  user:     process.env.MYSQL_USER     || "",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
  connectTimeout: 30000,
  typeCast(field, next) {
    if (field.type === "JSON") {
      const val = field.string();
      try { return val ? JSON.parse(val) : null; } catch { return val; }
    }
    return next();
  },
});

console.log(
  `[DB] MySQL — host: ${process.env.MYSQL_HOST || "127.0.0.1"}, port: ${process.env.MYSQL_PORT || 3306}, database: ${process.env.MYSQL_DATABASE}`,
);

export const db = drizzle(pool, { schema, mode: "default" });
