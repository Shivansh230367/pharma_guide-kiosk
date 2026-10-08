# Self-Service Pharma Inquiry & Alternative Discovery Kiosk

A touchscreen-friendly pharmacy kiosk that helps users search medicines,
understand their composition, check availability, and discover lower-cost
alternative brands with the same active composition.

The project also includes a secure Staff Portal for authorized pharmacy
employees to manage inventory information.

---

## Features

### Customer Kiosk

- Medicine brand-name search
- Typo-tolerant fuzzy search
- Medicine composition lookup
- Alternative brand discovery
- Real-time inventory status
- Shelf-location information
- Price-per-unit comparison
- Potential savings calculation
- Touchscreen-friendly interface

### Smart Search

The backend uses PostgreSQL `pg_trgm` to support approximate medicine-name
matching.

Search ranking prioritizes:

1. Exact matches
2. Prefix matches
3. Partial matches
4. Fuzzy matches

This allows searches containing common spelling mistakes to still return
useful results.

### Alternative Discovery

Medicines are connected through their active chemical composition.

For the selected medicine, the system:

1. Identifies its composition.
2. Finds other brands containing the same composition.
3. Checks their current inventory.
4. Compares their unit prices.
5. Calculates potential savings.

### Staff Portal

Authorized staff can:

- Log in securely
- Search medicines
- Update stock quantities
- Update shelf locations
- Update medicine prices
- Perform authorized inventory operations

The public kiosk is read-only and cannot modify inventory.

---

## Technology Stack

| Layer | Technology |
|------|------------|
| Frontend | React |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Database Driver | `pg` |
| Fuzzy Search | PostgreSQL `pg_trgm` |
| Authentication | Server-side staff authentication |
| Version Control | Git |

---

## System Architecture

```text
                    ┌──────────────────────┐
                    │   Pharmacy Customer  │
                    │      Touchscreen     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     React + Vite     │
                    │    Tailwind CSS UI   │
                    └──────────┬───────────┘
                               │
                              REST
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Node.js + Express  │
                    │      REST API        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      PostgreSQL      │
                    │                      │
                    │  compositions       │
                    │  medicines           │
                    │  inventory           │
                    │  staff               │
                    │  audit records       │
                    └──────────────────────┘
```

---

## Database Design

The application uses PostgreSQL to store medicine, composition, inventory,
staff, and audit information.

The core medicine relationship is:

```text
compositions
      │
      │ 1:N
      ▼
medicines
      │
      │ 1:1
      ▼
inventory
```

### Main Tables

**compositions**

Stores the active chemical composition of medicines.

**medicines**

Stores medicine brand names, their relationship with compositions, strip
pricing, and strip size.

**inventory**

Stores current stock quantity and shelf location for each medicine.

Staff-related tables are used for authentication and audit information.

---

## Project Structure

```text
pharma-kiosk-staff-enabled/
│
├── client/
│   ├── src/
│   │   ├── KioskSearch.jsx
│   │   ├── StaffPortal.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
├── database/
│   ├── schema.sql
│   ├── seed.js
│   ├── staff_migration.sql
│   ├── create_staff.js
│   └── package.json
│
├── docs/
│   └── architecture.md
│
├── .gitignore
└── README.md
```

---

## Requirements

Before running the project, install:

- Node.js
- npm
- PostgreSQL

The project uses PostgreSQL as its primary database.

---

## Installation

### 1. Clone the Repository

```bash
git clone <your-github-repository-url>
cd pharma-kiosk-staff-enabled
```

### 2. Install Frontend Dependencies

```bash
cd client
npm install
```

### 3. Install Backend Dependencies

```bash
cd ../server
npm install
```

### 4. Install Database Dependencies

```bash
cd ../database
npm install
```

---

## Database Setup

Create a PostgreSQL database named:

```text
pharma_kiosk
```

Run the database schema:

```bash
psql -U postgres -d pharma_kiosk -f schema.sql
```

Apply the staff-related database migration:

```bash
psql -U postgres -d pharma_kiosk -f staff_migration.sql
```

Seed the sample medicine data:

```bash
node seed.js
```

Create the initial staff account:

```bash
node create_staff.js
```

---

## Environment Configuration

Create the required `.env` files using the provided `.env.example`
configuration.

Example:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pharma_kiosk
STAFF_SESSION_SECRET=your-secret
DEFAULT_STAFF_USERNAME=admin
DEFAULT_STAFF_PASSWORD=your-password
```

Use your own secure values.

**Do not commit `.env` files or real credentials to GitHub.**

The repository's `.gitignore` excludes environment files from version
control.

---

## Running the Application

### Start the Backend

From the `server` directory:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

### Start the Frontend

Open another terminal:

```bash
cd client
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

---

## Application Pages

### Customer Kiosk

```text
http://localhost:5173/
```

The kiosk allows customers to search medicines, view their composition,
check availability, and discover available alternatives.

### Staff Portal

```text
http://localhost:5173/staff
```

The Staff Portal is restricted to authorized pharmacy staff.

Staff can search medicines and update inventory information such as stock,
shelf location, and price.

---

## Example Workflow

```text
Customer searches for a medicine
              │
              ▼
      Medicine is identified
              │
              ▼
     Composition is retrieved
              │
              ▼
Other brands with the same composition
              │
              ▼
       Inventory is checked
              │
              ▼
    Available alternatives shown
              │
              ▼
       Unit prices compared
              │
              ▼
       Potential savings shown
```

---

## Security

The application separates public kiosk functionality from staff
functionality.

### Public Kiosk

Kiosk users can:

- Search medicines
- View compositions
- View availability
- View alternatives
- Compare prices

Kiosk users cannot modify medicine or inventory information.

### Staff Portal

Authorized staff authentication is required before performing protected
inventory operations.

The backend performs authorization checks rather than relying only on
frontend restrictions.

Sensitive configuration values are stored in environment variables and
excluded from version control.

---

## Fuzzy Medicine Search

The project uses PostgreSQL's `pg_trgm` extension for approximate
medicine-name matching.

Searches are ranked using:

1. Exact match
2. Prefix match
3. Partial/contains match
4. Fuzzy similarity match

This allows the system to remain useful when a user makes a small spelling
mistake while entering a medicine name.

---

## Price Comparison

Medicine prices are compared at the unit level.

For example:

```text
Price per strip = ₹100
Strip size      = 10 tablets

Price per tablet = ₹10
```

Potential savings are calculated using the difference between the searched
medicine's unit price and the alternative medicine's unit price.

```text
Savings = Original Unit Price - Alternative Unit Price
```

Percentage savings:

```text
Savings % = (Savings / Original Unit Price) × 100
```

---

## Medical Safety Note

This project is an academic software demonstration.

Matching medicines based only on composition is not sufficient for real-world
medical substitution.

A production pharmacy system should also consider factors such as:

- Strength
- Dosage form
- Route of administration
- Release mechanism
- Combination ingredients
- Prescription requirements
- Patient-specific factors
- Pharmacist approval

The application should therefore not be treated as a medical prescribing
system.

---

## Future Improvements

Possible future enhancements include:

- Barcode scanning
- Medicine expiry tracking
- Low-stock alerts
- Multi-branch inventory
- Advanced role-based access control
- Detailed audit-history interface
- Pharmacy management system integration
- Automated testing
- Docker deployment
- CI/CD pipeline

---

## License

This project is developed for academic and educational purposes.
