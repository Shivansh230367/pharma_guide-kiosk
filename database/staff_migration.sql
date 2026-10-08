CREATE TABLE IF NOT EXISTS staff_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_audit_log (
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

CREATE INDEX IF NOT EXISTS idx_staff_username ON staff_users(username);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_medicine ON inventory_audit_log(medicine_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_staff ON inventory_audit_log(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_changed_at ON inventory_audit_log(changed_at DESC);
