import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // VM-specific resilience
  queueLimit: 0, // Unlimited queue (VM may be slow)
  // Connection timeout (for establishing new connections)
  connectTimeout: 60000, // 60s timeout for establishing connection
  // mysql2/promise automatically handles reconnection on connection loss
});

// Note: mysql2/promise pools handle errors at query time
// Connection errors are caught in try/catch blocks where queries are executed

export default db;
