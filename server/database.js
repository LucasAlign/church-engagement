import pg from 'pg';

const { Pool } = pg;
export const COLLECTIONS = new Set([
  'churches', 'contacts', 'interactions', 'tasks', 'givingRecords',
  'ministryEngagements', 'careCommunities', 'advocates', 'connections',
  'impactReports', 'churchNotes', 'notableCongregants', 'users',
]);

export function createDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString, ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false } });

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

    async deleteAll() {
      await pool.query('truncate table records');
    },

    async close() {
      await pool.end();
    },
  };
}
