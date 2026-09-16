import { createDatabase } from './database.js';

if (process.env.CONFIRM_WIPE !== 'WIPE_ENGAGE_DATA') {
  console.error('Refusing to wipe data. Set CONFIRM_WIPE=WIPE_ENGAGE_DATA and run again.');
  process.exitCode = 1;
} else {
  const database = createDatabase();
  try {
    await database.initialize();
    await database.deleteAll();
    console.log('All Engage application records were deleted. The database schema was preserved.');
  } finally {
    await database.close();
  }
}
