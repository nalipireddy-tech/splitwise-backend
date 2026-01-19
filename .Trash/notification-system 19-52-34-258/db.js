const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "notification_db",
  password: "charitha",
  port: 5432
});

module.exports = pool;

