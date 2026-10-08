const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../server/.env") });
const crypto = require("crypto");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 210000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function createStaff() {
  const username = process.env.DEFAULT_STAFF_USERNAME || "admin";
  const password = process.env.DEFAULT_STAFF_PASSWORD || "Admin@123";
  const fullName = process.env.DEFAULT_STAFF_NAME || "Pharmacy Administrator";
  const role = process.env.DEFAULT_STAFF_ROLE || "admin";

  if (password.length < 8) throw new Error("Default staff password must be at least 8 characters.");

  try {
    await pool.query(
      `INSERT INTO staff_users (username, full_name, role, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           password_hash = EXCLUDED.password_hash,
           is_active = TRUE`,
      [username, fullName, role, hashPassword(password)]
    );
    console.log(`Staff account ready: ${username}`);
    console.log("Use the configured DEFAULT_STAFF_PASSWORD to sign in.");
  } finally {
    await pool.end();
  }
}

createStaff().catch((error) => {
  console.error("Unable to create staff account:", error.message);
  process.exit(1);
});
