import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/202610200002_private_links.sql', import.meta.url), 'utf8');
const owner = 'a'.repeat(64), viewer = 'b'.repeat(64), otherOwner = 'c'.repeat(64), otherViewer = 'd'.repeat(64);
const entry = { id: '11111111-1111-4111-8111-111111111111', date: '2026-10-20', description: 'Taxi', category: 'Transport', amount: 25.5, type: 'expense' };
async function setup() {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; grant usage on schema public to anon, authenticated');
  await db.exec(migration);
  await db.exec('set role anon');
  return db;
}
async function rpc(db, name, ...args) {
  const params = args.map((_, index) => `$${index + 1}`).join(',');
  const result = await db.query(`select public.${name}(${params}) as result`, args);
  return result.rows[0].result;
}

test('registration-free owner writes and viewer reads the exact same cashbook, including settings', async () => {
  const db = await setup();
  try {
    const book = await rpc(db, 'pc_create', owner, viewer);
    assert.equal(book.role, 'owner');
    assert.equal((await rpc(db, 'pc_create', owner, viewer)).id, book.id);
    await rpc(db, 'pc_add', owner, entry);
    await rpc(db, 'pc_save_settings', owner, { companyName: 'Office', senderName: 'Ama' });
    const shared = await rpc(db, 'pc_open', viewer);
    assert.equal(shared.id, book.id);
    assert.equal(shared.role, 'viewer');
    assert.equal(shared.settings.companyName, 'Office');
    assert.equal(shared.transactions.length, 1);
    assert.equal(shared.transactions[0].amount, 25.5);
    assert.ok(!JSON.stringify(shared).includes(owner));
    assert.ok(!JSON.stringify(shared).includes(viewer));
    await rpc(db, 'pc_add', owner, entry);
    assert.equal((await rpc(db, 'pc_open', viewer)).transactions.length, 1, 'same request ID is idempotent');
  } finally { await db.close(); }
});

test('viewer cannot write, delete, clear, change settings or replace their link, even via direct RPC', async () => {
  const db = await setup();
  try {
    await rpc(db, 'pc_create', owner, viewer);
    await rpc(db, 'pc_add', owner, entry);
    for (const [fn, ...args] of [
      ['pc_add', entry], ['pc_delete', entry.id], ['pc_save_settings', { companyName: 'Hacked' }],
      ['pc_clear'], ['pc_replace_viewer', 'e'.repeat(64)],
    ]) await assert.rejects(rpc(db, fn, viewer, ...args), /view-only/);
    assert.equal((await rpc(db, 'pc_open', owner)).transactions.length, 1);
    for (const table of ['pc_books', 'pc_entries']) {
      await assert.rejects(db.query(`select * from public.${table}`), /permission denied/);
      await assert.rejects(db.query(`delete from public.${table}`), /permission denied/);
    }
    await assert.rejects(rpc(db, 'pc_authorize', viewer, true), /permission denied/);
    await assert.rejects(rpc(db, 'pc_open', 'bad-token'), /Invalid access link/);
    await assert.rejects(rpc(db, 'pc_open', 'f'.repeat(64)), /invalid or has been replaced/);
  } finally { await db.close(); }
});

test('owner cannot delete another cashbook entry; replacing viewing link revokes old access', async () => {
  const db = await setup();
  try {
    await rpc(db, 'pc_create', owner, viewer);
    await rpc(db, 'pc_create', otherOwner, otherViewer);
    await rpc(db, 'pc_add', owner, entry);
    await rpc(db, 'pc_delete', otherOwner, entry.id);
    assert.equal((await rpc(db, 'pc_open', viewer)).transactions.length, 1);
    await rpc(db, 'pc_replace_viewer', owner, 'e'.repeat(64));
    await assert.rejects(rpc(db, 'pc_open', viewer), /invalid or has been replaced/);
    assert.equal((await rpc(db, 'pc_open', 'e'.repeat(64))).role, 'viewer');
    await rpc(db, 'pc_clear', owner);
    assert.equal((await rpc(db, 'pc_open', 'e'.repeat(64))).transactions.length, 0);
  } finally { await db.close(); }
});

test('migration preserves legacy rows, revokes old table access, validates new writes and can be rerun', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      grant usage on schema public to anon, authenticated;
      create table public.transactions (id text);
      insert into transactions values ('legacy');
      grant all on transactions to anon, authenticated;`);
    await db.exec(migration);
    await db.exec(migration);
    assert.equal((await db.query('select * from transactions')).rows[0].id, 'legacy');
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from transactions'), /permission denied/);
    await rpc(db, 'pc_create', owner, viewer);
    await assert.rejects(rpc(db, 'pc_add', owner, { ...entry, amount: 0 }), /check constraint/);
  } finally { await db.close(); }
});

test('a viewer capability cannot be reused as a new owner key to create ambiguous access', async () => {
  const db = await setup();
  try {
    await rpc(db, 'pc_create', owner, viewer);
    await assert.rejects(rpc(db, 'pc_create', viewer, otherViewer), /already in use/);
    await rpc(db, 'pc_create', otherOwner, otherViewer);
    await assert.rejects(rpc(db, 'pc_replace_viewer', otherOwner, viewer), /already in use/);
    assert.equal((await rpc(db, 'pc_open', viewer)).role, 'viewer');
  } finally { await db.close(); }
});
