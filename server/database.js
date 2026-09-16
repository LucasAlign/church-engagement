import pg from 'pg';
import { migrateLegacyData } from './legacy-data.js';

const { Pool } = pg;
export const COLLECTIONS = new Set([
  'churches', 'contacts', 'interactions', 'tasks', 'givingRecords',
  'ministryEngagements', 'careCommunities', 'advocates', 'connections',
  'impactReports', 'churchNotes', 'notableCongregants', 'users',
]);

export function createDatabase(connectionString = process.env.DATABASE_URL, env = process.env) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const isLocal = /(?:localhost|127\.0\.0\.1)/.test(connectionString);
  const allowInvalidCertificate = env.DATABASE_SSL_ALLOW_INVALID_CERT === 'true';
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: !allowInvalidCertificate },
  });

  return {
    async initialize() {
      await pool.query(`
        create table if not exists records (
          collection text not null,
          id text not null,
          data jsonb not null,
          updated_at timestamptz not null default now(),
          primary key (collection, id)
        )
      `);
      await pool.query('create index if not exists records_collection_idx on records (collection)');
      const migrated = await migrateLegacyData(pool);
      if (migrated > 0) console.log(`Migrated ${migrated} legacy database records.`);
    },

    async readAll() {
      const { rows } = await pool.query('select collection, data from records order by collection, id');
      const result = Object.fromEntries([...COLLECTIONS].map(collection => [collection, []]));
      for (const row of rows) {
        if (COLLECTIONS.has(row.collection)) result[row.collection].push(row.data);
      }
      return result;
    },

    async upsert(collection, id, data) {
      await pool.query(
        `insert into records (collection, id, data, updated_at)
         values ($1, $2, $3::jsonb, now())
         on conflict (collection, id)
         do update set data = excluded.data, updated_at = now()`,
        [collection, id, JSON.stringify(data)],
      );
    },

    async upsertMany(records) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        for (const { collection, id, data } of records) {
          await client.query(
            `insert into records (collection, id, data, updated_at)
             values ($1, $2, $3::jsonb, now())
             on conflict (collection, id)
             do update set data = excluded.data, updated_at = now()`,
            [collection, id, JSON.stringify(data)],
          );
        }
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async delete(collection, id) {
      await pool.query('delete from records where collection = $1 and id = $2', [collection, id]);
    },

    async deleteAll() {
      await pool.query('truncate table records');
    },

    async close() {
      await pool.end();
    },
  };
}
