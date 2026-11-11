// Portable embedded Postgres starter for QuantFoundry (v3.1 harness portability).
// Usage: node scripts/pg-embedded.mjs
// Starts a real Postgres 18 binary from node_modules on port 5433,
// user qf / password qf / db quantfoundry. Prints DATABASE_URL when ready.
import EmbeddedPostgres from 'embedded-postgres';

const pg = new EmbeddedPostgres({
  databaseDir: `${process.cwd()}/.pgdata`,
  user: 'qf',
  password: 'qf',
  port: 5433,
  persistent: true,
});

try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('quantfoundry');
  console.log('PG_READY postgresql://qf:qf@127.0.0.1:5433/quantfoundry?schema=public');
} catch (e) {
  // Already initialised (persistent dir): just ensure started and db exists.
  if (String(e.message).includes('already') || String(e.code) === 'EAGAIN') {
    await pg.start().catch(() => {});
    await pg.createDatabase('quantfoundry').catch(() => {});
    console.log('PG_READY postgresql://qf:qf@127.0.0.1:5433/quantfoundry?schema=public');
  } else {
    console.error('PG_FAIL', e.message);
    process.exit(1);
  }
}
