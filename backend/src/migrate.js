import 'dotenv/config';
import { initSchema, pool } from './db.js';

await initSchema();
console.log('Database schema is up to date.');
await pool.end();
