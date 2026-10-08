require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const compositions = [
  {
    chemical_name: "Paracetamol 500mg",
    medicines: [
      { brand_name: "Paracip 500", price_per_strip: 18.00, strip_size: 15, stock_quantity: 65, shelf_location: "B-04" },
      { brand_name: "Crocin Advance", price_per_strip: 42.00, strip_size: 15, stock_quantity: 28, shelf_location: "B-05" },
      { brand_name: "Calpol 500", price_per_strip: 30.00, strip_size: 15, stock_quantity: 42, shelf_location: "B-06" },
      { brand_name: "Pacimol 500", price_per_strip: 16.50, strip_size: 15, stock_quantity: 0, shelf_location: "B-07" },
    ],
  },
  {
    chemical_name: "Amoxicillin 500mg",
    medicines: [
      { brand_name: "Moxikind-CV 625", price_per_strip: 155.00, strip_size: 10, stock_quantity: 0, shelf_location: "C-01" },
      { brand_name: "Novamox 500", price_per_strip: 92.00, strip_size: 10, stock_quantity: 18, shelf_location: "C-02" },
      { brand_name: "Amoxil 500", price_per_strip: 128.00, strip_size: 10, stock_quantity: 9, shelf_location: "C-03" },
      { brand_name: "Mox 500", price_per_strip: 70.00, strip_size: 10, stock_quantity: 31, shelf_location: "C-04" },
    ],
  },
  {
    chemical_name: "Atorvastatin 10mg",
    medicines: [
      { brand_name: "Lipitor 10", price_per_strip: 180.00, strip_size: 10, stock_quantity: 0, shelf_location: "D-01" },
      { brand_name: "Atorva 10", price_per_strip: 75.00, strip_size: 10, stock_quantity: 22, shelf_location: "D-02" },
      { brand_name: "Avas 10", price_per_strip: 95.00, strip_size: 10, stock_quantity: 15, shelf_location: "D-03" },
      { brand_name: "Atorlip 10", price_per_strip: 62.00, strip_size: 10, stock_quantity: 27, shelf_location: "D-04" },
    ],
  },
];

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE inventory, medicines, compositions RESTART IDENTITY CASCADE");

    for (const composition of compositions) {
      const compositionResult = await client.query(
        `INSERT INTO compositions (chemical_name)
         VALUES ($1)
         RETURNING id`,
        [composition.chemical_name]
      );

      const compositionId = compositionResult.rows[0].id;

      for (const medicine of composition.medicines) {
        const medicineResult = await client.query(
          `INSERT INTO medicines
             (composition_id, brand_name, price_per_strip, strip_size)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [
            compositionId,
            medicine.brand_name,
            medicine.price_per_strip,
            medicine.strip_size,
          ]
        );

        await client.query(
          `INSERT INTO inventory
             (medicine_id, stock_quantity, shelf_location)
           VALUES ($1, $2, $3)`,
          [
            medicineResult.rows[0].id,
            medicine.stock_quantity,
            medicine.shelf_location,
          ]
        );
      }
    }

    await client.query("COMMIT");
    console.log("Database seeded successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
