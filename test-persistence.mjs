import { createPersistenceQueue } from './src/data/persistenceQueue.js';

let failures = 0;
const check = (condition, message) => {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${message}`);
  if (!condition) failures += 1;
};

const values = new Map();
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};

const failedQueue = createPersistenceQueue({
  storage,
  send: async () => { throw new Error('network unavailable'); },
  autoFlush: false,
});
failedQueue.enqueuePut('churches', { id: 'ch_1', name: 'First edit' });
failedQueue.enqueuePut('churches', { id: 'ch_1', name: 'Latest edit' });
check(failedQueue.pendingCount() === 1, 'multiple edits to one record retain one latest pending save');

const failedResult = await failedQueue.flush();
check(!failedResult.ok, 'a failed network save is reported as pending');
check(failedQueue.pendingCount() === 1 && values.size === 1, 'a failed save remains durably queued');

const sent = [];
const reloadedQueue = createPersistenceQueue({
  storage,
  send: async operation => { sent.push(operation); },
  autoFlush: false,
});
check(reloadedQueue.pendingCount() === 1, 'a new browser session reloads the pending edit');
const recoveredResult = await reloadedQueue.flush();
check(recoveredResult.ok, 'the queued edit automatically succeeds when the API returns');
check(sent[0]?.record?.name === 'Latest edit', 'the recovered save sends the latest edited value');
check(reloadedQueue.pendingCount() === 0 && values.size === 0, 'acknowledged saves are removed from durable storage');

const unavailableStorageQueue = createPersistenceQueue({
  storage: {
    getItem: () => null,
    setItem: () => { throw new Error('storage unavailable'); },
    removeItem: () => {},
  },
  send: async () => { throw new Error('network unavailable'); },
  autoFlush: false,
});
unavailableStorageQueue.enqueuePut('churches', { id: 'ch_2', name: 'Visible warning' });
check(
  unavailableStorageQueue.getStatus().durable === false && unavailableStorageQueue.getStatus().pending === 1,
  'local-storage failure remains visible instead of claiming the edit is safe',
);

process.exitCode = failures ? 1 : 0;
