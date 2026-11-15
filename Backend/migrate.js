import "dotenv/config";
import pool from "./src/config/db.js";
import * as migration from "./migrations/20261116_add_note_to_expenses.js";

const direction = process.argv[2] || "up";

async function run() {
  try {
    if (direction === "down") {
      await migration.down(pool);
    } else {
      await migration.up(pool);
    }
  } catch (err) {
    console.error("Migration Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();
