import { config } from '../config/env.js';
import pg from 'pg';

async function rollback() {
  const pool = new pg.Pool({ connectionString: config.databaseUrl });

  // Get the last applied migration
  const { rows } = await pool.query(
    'SELECT name FROM _migrations ORDER BY id DESC LIMIT 1',
  );

  if (rows.length === 0) {
    console.log('No migrations to roll back.');
    await pool.end();
    return;
  }

  const lastMigration = rows[0].name;
  console.log(`Rolling back: ${lastMigration}`);

  // For initial schema, we just drop everything (destructive)
  console.log('WARNING: Rollback will drop all PorchPilot tables.');

  try {
    await pool.query('BEGIN');
    await pool.query(`
      DROP TABLE IF EXISTS tracking_events CASCADE;
      DROP TABLE IF EXISTS shipments CASCADE;
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS email_accounts CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    await pool.query("DELETE FROM _migrations WHERE name = $1", [lastMigration]);
    await pool.query('COMMIT');
    console.log(`  ✓ Rolled back ${lastMigration}`);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('  ✗ Rollback failed:', err);
    process.exit(1);
  }

  await pool.end();
}

rollback().catch(console.error);