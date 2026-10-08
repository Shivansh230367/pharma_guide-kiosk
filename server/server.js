require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = Number(process.env.PORT || 4000);
const authSecret = process.env.STAFF_AUTH_SECRET;

if (!authSecret) {
  console.warn("WARNING: STAFF_AUTH_SECRET is not set. Staff authentication is disabled until it is configured.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

const money = (value) => Number(Number(value).toFixed(2));

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 210000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(String(password), salt, 210000, 64, "sha512").toString("hex");
  return safeEqual(actual, expected);
}

function signStaffToken(payload) {
  if (!authSecret) throw new Error("STAFF_AUTH_SECRET is not configured");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", authSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyStaffToken(token) {
  if (!authSecret || !token) return null;
  const [body, signature] = String(token).split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", authSecret).update(body).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireStaff(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const staff = verifyStaffToken(token);

  if (!staff) {
    return res.status(401).json({ error: "Staff authorization required." });
  }

  req.staff = staff;
  next();
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (error) {
    res.status(503).json({ status: "error", message: "Database unavailable" });
  }
});

app.get("/api/search", async (req, res) => {
  const query = String(req.query.query || "").trim();

  if (!query) return res.status(400).json({ error: "Query is required.", message: "Enter a medicine brand name." });
  if (query.length > 100) return res.status(400).json({ error: "Query is too long." });

  const client = await pool.connect();
  try {
    const medicineResult = await client.query(
      `SELECT m.id, m.brand_name, m.price_per_strip, m.strip_size,
              c.id AS composition_id, c.chemical_name,
              COALESCE(i.stock_quantity, 0) AS stock_quantity,
              COALESCE(i.shelf_location, 'Not assigned') AS shelf_location,
              similarity(lower(m.brand_name), lower($1)) AS similarity_score,
              CASE WHEN lower(m.brand_name) = lower($1) THEN 0
                   WHEN lower(m.brand_name) LIKE lower($1) || '%' THEN 1
                   WHEN lower(m.brand_name) LIKE '%' || lower($1) || '%' THEN 2
                   ELSE 3 END AS match_rank
       FROM medicines m
       JOIN compositions c ON c.id = m.composition_id
       LEFT JOIN inventory i ON i.medicine_id = m.id
       WHERE lower(m.brand_name) = lower($1)
          OR lower(m.brand_name) LIKE '%' || lower($1) || '%'
          OR similarity(lower(m.brand_name), lower($1)) >= 0.25
       ORDER BY match_rank ASC, similarity_score DESC
       LIMIT 1`, [query]
    );

    if (medicineResult.rows.length === 0) {
      const suggestions = await client.query(
        `SELECT brand_name, similarity(lower(brand_name), lower($1)) AS similarity_score
         FROM medicines WHERE similarity(lower(brand_name), lower($1)) >= 0.15
         ORDER BY similarity_score DESC LIMIT 5`, [query]
      );
      return res.status(404).json({
        error: "Medicine not found.",
        suggestions: suggestions.rows.map((row) => ({ brand_name: row.brand_name, match_score: money(Number(row.similarity_score) * 100) }))
      });
    }

    const searched = medicineResult.rows[0];
    const searchedUnitPrice = Number(searched.price_per_strip) / searched.strip_size;

    const alternativesResult = await client.query(
      `SELECT m.id, m.brand_name AS substitute_brand, m.price_per_strip, m.strip_size,
              i.stock_quantity, i.shelf_location, c.chemical_name
       FROM medicines m
       JOIN compositions c ON c.id = m.composition_id
       JOIN inventory i ON i.medicine_id = m.id
       WHERE m.composition_id = $1 AND m.id <> $2 AND i.stock_quantity > 0
       ORDER BY (m.price_per_strip / m.strip_size) ASC, m.brand_name ASC`,
      [searched.composition_id, searched.id]
    );

    const alternatives = alternativesResult.rows.map((row) => {
      const unitPrice = Number(row.price_per_strip) / row.strip_size;
      const savingsPerPill = searchedUnitPrice - unitPrice;
      const percentageSaved = searchedUnitPrice > 0 ? (savingsPerPill / searchedUnitPrice) * 100 : 0;
      return {
        substitute_brand: row.substitute_brand,
        price_per_strip: money(row.price_per_strip), strip_size: row.strip_size,
        unit_price: money(unitPrice), savings_per_pill: money(savingsPerPill),
        percentage_saved: money(percentageSaved), stock_quantity: row.stock_quantity,
        shelf_location: row.shelf_location, chemical_name: row.chemical_name
      };
    });

    return res.json({
      searched_item: {
        id: searched.id, brand_name: searched.brand_name, chemical_name: searched.chemical_name,
        composition_id: searched.composition_id, price_per_strip: money(searched.price_per_strip),
        strip_size: searched.strip_size, unit_price: money(searchedUnitPrice),
        stock_quantity: searched.stock_quantity, shelf_location: searched.shelf_location,
        in_stock: searched.stock_quantity > 0, match_score: money(Number(searched.similarity_score) * 100)
      },
      alternatives, alternative_count: alternatives.length, searched_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({ error: "Unable to search medicines.", message: "Please try again." });
  } finally { client.release(); }
});

// ---------------- Staff authorization ----------------
app.post("/api/staff/login", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!username || !password) return res.status(400).json({ error: "Username and password are required." });
  if (!authSecret) return res.status(503).json({ error: "Staff authentication is not configured on the server." });

  try {
    const result = await pool.query(
      `SELECT id, username, full_name, role, password_hash, is_active
       FROM staff_users WHERE lower(username) = lower($1) LIMIT 1`, [username]
    );
    const user = result.rows[0];

    if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid staff credentials." });
    }

    const token = signStaffToken({
      sub: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
    });

    await pool.query(`UPDATE staff_users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

    return res.json({
      token,
      staff: { id: user.id, username: user.username, full_name: user.full_name, role: user.role }
    });
  } catch (error) {
    console.error("Staff login error:", error);
    return res.status(500).json({ error: "Unable to sign in." });
  }
});

app.get("/api/staff/me", requireStaff, async (req, res) => {
  res.json({ staff: req.staff });
});

app.get("/api/staff/medicines", requireStaff, async (req, res) => {
  const query = String(req.query.query || "").trim();
  if (!query) return res.status(400).json({ error: "Medicine search query is required." });
  if (query.length > 100) return res.status(400).json({ error: "Query is too long." });

  try {
    const result = await pool.query(
      `SELECT m.id, m.brand_name, m.price_per_strip, m.strip_size,
              c.chemical_name, COALESCE(i.stock_quantity, 0) AS stock_quantity,
              COALESCE(i.shelf_location, 'Not assigned') AS shelf_location,
              similarity(lower(m.brand_name), lower($1)) AS match_score
       FROM medicines m
       JOIN compositions c ON c.id = m.composition_id
       LEFT JOIN inventory i ON i.medicine_id = m.id
       WHERE lower(m.brand_name) = lower($1)
          OR lower(m.brand_name) LIKE '%' || lower($1) || '%'
          OR similarity(lower(m.brand_name), lower($1)) >= 0.15
       ORDER BY CASE WHEN lower(m.brand_name) = lower($1) THEN 0
                     WHEN lower(m.brand_name) LIKE lower($1) || '%' THEN 1
                     ELSE 2 END,
                match_score DESC
       LIMIT 20`, [query]
    );

    res.json({ medicines: result.rows.map((row) => ({
      id: row.id, brand_name: row.brand_name, chemical_name: row.chemical_name,
      price_per_strip: money(row.price_per_strip), strip_size: row.strip_size,
      stock_quantity: row.stock_quantity, shelf_location: row.shelf_location,
      match_score: money(Number(row.match_score) * 100)
    })) });
  } catch (error) {
    console.error("Staff medicine search error:", error);
    res.status(500).json({ error: "Unable to search medicines." });
  }
});

app.patch("/api/staff/medicines/:id", requireStaff, async (req, res) => {
  const medicineId = Number(req.params.id);
  const { price_per_strip, stock_quantity, shelf_location } = req.body || {};

  if (!Number.isInteger(medicineId) || medicineId <= 0) return res.status(400).json({ error: "Invalid medicine ID." });

  const price = Number(price_per_strip);
  const stock = Number(stock_quantity);
  const shelf = String(shelf_location || "").trim();

  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: "Price must be a non-negative number." });
  if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ error: "Stock must be a non-negative whole number." });
  if (!shelf || shelf.length > 50) return res.status(400).json({ error: "Shelf location is required and must be 50 characters or fewer." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const beforeResult = await client.query(
  `SELECT m.id, m.brand_name, m.price_per_strip, m.strip_size,
          COALESCE(i.stock_quantity, 0) AS stock_quantity,
          COALESCE(i.shelf_location, 'Not assigned') AS shelf_location
   FROM medicines m
   LEFT JOIN inventory i ON i.medicine_id = m.id
   WHERE m.id = $1
   FOR UPDATE OF m`,
  [medicineId]
);

    if (beforeResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Medicine not found." });
    }

    const before = beforeResult.rows[0];

    await client.query(
      `UPDATE medicines SET price_per_strip = $1 WHERE id = $2`, [price, medicineId]
    );
    await client.query(
      `INSERT INTO inventory (medicine_id, stock_quantity, shelf_location)
       VALUES ($1, $2, $3)
       ON CONFLICT (medicine_id)
       DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity,
                     shelf_location = EXCLUDED.shelf_location`,
      [medicineId, stock, shelf]
    );

    const afterResult = await client.query(
      `SELECT m.id, m.brand_name, m.price_per_strip, m.strip_size,
              COALESCE(i.stock_quantity, 0) AS stock_quantity,
              COALESCE(i.shelf_location, 'Not assigned') AS shelf_location
       FROM medicines m LEFT JOIN inventory i ON i.medicine_id = m.id
       WHERE m.id = $1`, [medicineId]
    );
    const after = afterResult.rows[0];

    await client.query(
      `INSERT INTO inventory_audit_log
       (staff_user_id, medicine_id, old_price_per_strip, new_price_per_strip,
        old_stock_quantity, new_stock_quantity, old_shelf_location, new_shelf_location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [req.staff.sub, medicineId, before.price_per_strip, after.price_per_strip,
       before.stock_quantity, after.stock_quantity, before.shelf_location, after.shelf_location]
    );

    await client.query("COMMIT");

    res.json({
      message: "Medicine updated successfully.",
      medicine: {
        id: after.id, brand_name: after.brand_name, price_per_strip: money(after.price_per_strip),
        strip_size: after.strip_size, stock_quantity: after.stock_quantity,
        shelf_location: after.shelf_location
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Medicine update error:", error);
    res.status(500).json({ error: "Unable to update medicine." });
  } finally { client.release(); }
});

app.get("/api/staff/audit", requireStaff, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.id, l.changed_at, s.username, s.full_name, m.brand_name,
              l.old_price_per_strip, l.new_price_per_strip,
              l.old_stock_quantity, l.new_stock_quantity,
              l.old_shelf_location, l.new_shelf_location
       FROM inventory_audit_log l
       JOIN staff_users s ON s.id = l.staff_user_id
       JOIN medicines m ON m.id = l.medicine_id
       ORDER BY l.changed_at DESC LIMIT 50`
    );
    res.json({ audit: result.rows.map((row) => ({
      ...row,
      old_price_per_strip: money(row.old_price_per_strip),
      new_price_per_strip: money(row.new_price_per_strip)
    })) });
  } catch (error) {
    console.error("Audit error:", error);
    res.status(500).json({ error: "Unable to load audit history." });
  }
});

app.use((_req, res) => res.status(404).json({ error: "Route not found." }));

app.listen(port, () => console.log(`Pharma kiosk API running on http://localhost:${port}`));
