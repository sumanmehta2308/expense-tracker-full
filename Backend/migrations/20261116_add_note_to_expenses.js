export async function up(pool) {
  await pool.query(`
    ALTER TABLE expenses
    ADD COLUMN note VARCHAR(255) NULL AFTER category
  `);
  console.log("Migration UP: 'note' column added to 'expenses' table.");
}

export async function down(pool) {
  await pool.query(`
    ALTER TABLE expenses
    DROP COLUMN note
  `);
  console.log("Migration DOWN: 'note' column removed from 'expenses' table.");
}
