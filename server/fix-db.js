const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fix() {
  const dbPath = path.resolve(__dirname, 'cloudops.db');
  console.log('Opening DB at', dbPath);
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('Running backfill query...');
  const result = await db.run(`
    INSERT OR IGNORE INTO cloud_accounts (id, tenant_id, provider, account_name, subscription_id, region, status, created_at)
    SELECT id, tenant_id, 'azure', name, subscription_id, 'global', status, created_at
    FROM azure_subscriptions
  `);
  
  console.log('Done! Changes:', result.changes);
  await db.close();
}

fix().catch(console.error);
