CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP TABLE IF EXISTS inventory_audit_log;
DROP TABLE IF EXISTS staff_users;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS medicines;
DROP TABLE IF EXISTS compositions;

CREATE TABLE compositions (
    id SERIAL PRIMARY KEY,
    chemical_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE medicines (
    id SERIAL PRIMARY KEY,
    composition_id INTEGER NOT NULL REFERENCES compositions(id) ON DELETE RESTRICT,
    brand_name VARCHAR(255) NOT NULL UNIQUE,
    price_per_strip NUMERIC(10,2) NOT NULL CHECK (price_per_strip >= 0),
    strip_size INTEGER NOT NULL CHECK (strip_size > 0)
);

CREATE TABLE inventory (
    medicine_id INTEGER PRIMARY KEY REFERENCES medicines(id) ON DELETE CASCADE,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    shelf_location VARCHAR(50) NOT NULL
);

CREATE INDEX idx_medicines_composition_id ON medicines(composition_id);
CREATE INDEX idx_medicines_brand_trgm ON medicines USING GIN (brand_name gin_trgm_ops);
CREATE INDEX idx_inventory_stock ON inventory(stock_quantity);

COMMENT ON TABLE compositions IS 'Exact active chemical composition/signature used for substitute matching.';
COMMENT ON TABLE medicines IS 'Brand-level medicine catalog.';
COMMENT ON TABLE inventory IS 'Current kiosk-visible stock and physical shelf location.';


CREATE TABLE staff_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_audit_log (
    id BIGSERIAL PRIMARY KEY,
    staff_user_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
    medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    old_price_per_strip NUMERIC(10,2) NOT NULL,
    new_price_per_strip NUMERIC(10,2) NOT NULL,
    old_stock_quantity INTEGER NOT NULL,
    new_stock_quantity INTEGER NOT NULL,
    old_shelf_location VARCHAR(50) NOT NULL,
    new_shelf_location VARCHAR(50) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_username ON staff_users(username);
CREATE INDEX idx_inventory_audit_medicine ON inventory_audit_log(medicine_id);
CREATE INDEX idx_inventory_audit_staff ON inventory_audit_log(staff_user_id);
CREATE INDEX idx_inventory_audit_changed_at ON inventory_audit_log(changed_at DESC);
