import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";

const connection = await mysql.createPool({
  host:     process.env.MYSQL_HOST     || "localhost",
  user:     process.env.MYSQL_USER     || "",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
  connectTimeout: 30000,
});

console.log(`[DB] MySQL — host: ${process.env.MYSQL_HOST || "localhost"}, database: ${process.env.MYSQL_DATABASE}`);

export const db = drizzle(connection, { schema, mode: "default" });
