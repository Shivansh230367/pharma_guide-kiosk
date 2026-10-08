# PharmaGuide — Self-Service Pharma Inquiry & Alternative Discovery Kiosk

A touchscreen-first academic project using PostgreSQL, Node.js/Express, React and Tailwind CSS.

## Architecture

React/Tailwind kiosk -> Express REST API -> PostgreSQL

Core logic:
1. Brand search uses PostgreSQL `pg_trgm` similarity so small spelling errors can resolve.
2. A medicine points to one composition.
3. Alternatives are selected only from the same `composition_id`.
4. Inventory is joined live; only alternatives with `stock_quantity > 0` are shown.
5. Unit price = `price_per_strip / strip_size`.
6. Savings per pill = searched unit price - alternative unit price.
7. Percentage saved = savings per pill / searched unit price * 100.

## Requirements

- Node.js 18+
- PostgreSQL 14+
- npm

## 1. Create the database

```bash
createdb pharma_kiosk
```

Or create an empty database named `pharma_kiosk` in pgAdmin.

## 2. Configure backend

```bash
cd server
copy .env.example .env
```

On Linux/macOS use:

```bash
cp .env.example .env
```

Edit `.env` and set a valid PostgreSQL username/password.

## 3. Install backend dependencies

```bash
cd server
npm install
```

## 4. Create tables

From `server/`:

```bash
npm run db:init
```

If `psql` is not on PATH, run `database/schema.sql` from pgAdmin Query Tool instead.

## 5. Seed sample data

```bash
npm run db:seed
```

The seed includes Paracetamol, Amoxicillin and Atorvastatin composition groups. Several products intentionally have zero stock.

## 6. Start API

```bash
npm run dev
```

API:
- `GET http://localhost:4000/api/health`
- `GET http://localhost:4000/api/search?query=Crocin%20Advance`

Try a typo:
- `GET http://localhost:4000/api/search?query=Crocin%20Advnce`

## 7. Start React kiosk

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally:

`http://localhost:5173`

## Optional frontend environment variable

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## Touchscreen/kiosk deployment

The UI deliberately uses large controls and `min-h-12`/`min-h-16` targets.

For a physical kiosk:
- Launch Chrome/Edge in kiosk mode.
- Disable browser navigation UI.
- Run the OS account as a restricted kiosk account.
- Use the in-app fullscreen button once during startup because browser fullscreen requires a user gesture.
- Keep the staff inventory/admin surface separate from the public kiosk.
- Never put database credentials in React or expose PostgreSQL directly to the browser.

Example Chrome kiosk launch on Windows:

```text
chrome.exe --kiosk http://localhost:5173 --noerrdialogs --disable-session-crashed-bubble
```

## Important academic-project safety note

Composition equality in this project is based on the exact `chemical_name` row selected by the pharmacy database. In a production pharmacy system, substitution must additionally account for strength, dosage form, release mechanism, route, combination ingredients, prescription rules and pharmacist/doctor approval. The kiosk should present alternatives for pharmacist review rather than independently instructing a patient to substitute a medicine.

## Staff inventory administration

The project includes a protected staff portal at `/staff`. Authorized staff can search medicines and update:

- price per strip
- stock quantity
- shelf location

Every successful update is written to `inventory_audit_log` with the staff account, previous values, new values, and timestamp. The public kiosk has no update endpoint.

### Add staff authorization to an existing database

1. Add a long random secret to `server/.env`:

```env
STAFF_AUTH_SECRET=replace-with-a-long-random-secret
```

In Git Bash, a convenient value is:

```bash
openssl rand -hex 32
```

2. Run the migration:

```bash
"/c/Program Files/PostgreSQL/18/bin/psql.exe" -U postgres -d pharma_kiosk -f database/staff_migration.sql
```

3. Create the first administrator account:

```bash
node database/create_staff.js
```

Default development credentials are:

```text
Username: admin
Password: Admin@123
```

Change the default password before any real deployment. You can override the account during creation with:

```env
DEFAULT_STAFF_USERNAME=pharmacyadmin
DEFAULT_STAFF_PASSWORD=your-strong-password
DEFAULT_STAFF_NAME=Pharmacy Administrator
DEFAULT_STAFF_ROLE=admin
```

4. Restart the backend after changing `.env`.

5. Open `http://localhost:5173/staff` to sign in.

For production, use HTTPS, a strong unique `STAFF_AUTH_SECRET`, unique staff accounts, and a proper password-management process.
