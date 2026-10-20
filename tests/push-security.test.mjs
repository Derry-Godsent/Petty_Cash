import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const migrations = await Promise.all(['202610200002_private_links.sql', '202610200003_push_notifications.sql'].map(file => readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')));
const owner = 'a'.repeat(64), viewer = 'b'.repeat(64);
const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/device:token', keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) } };
async function setup() {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role');
  for (const migration of migrations) await db.exec(migration);
  await db.exec('set role anon');
  await rpc(db, 'pc_create', owner, viewer);
  return db;
}
async function rpc(db, name, ...args) {
  const result = await db.query(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) as result`, args);
  return result.rows[0].result;
}
async function worker(db) { await db.exec('reset role; set role service_role'); }
async function client(db) { await db.exec('reset role; set role anon'); }

test('valid viewer can opt in/out, but cannot inspect endpoints, drain queue or register arbitrary delivery URLs', async () => {
  const db = await setup();
  try {
    await rpc(db, 'pc_push_subscribe', viewer, subscription);
    assert.equal(await rpc(db, 'pc_push_status', viewer, subscription.endpoint), true);
    assert.equal(await rpc(db, 'pc_push_status', owner, subscription.endpoint), false);
    for (const endpoint of ['http://fcm.googleapis.com/x', 'https://127.0.0.1/secret', 'https://fcm.googleapis.com.evil.test/x', 'https://fcm.googleapis.com@evil.test/x', 'https://fcm.googleapis.com:443/x']) {
      await assert.rejects(rpc(db, 'pc_push_subscribe', viewer, { ...subscription, endpoint }), /Invalid push subscription/);
    }
    await assert.rejects(rpc(db, 'pc_push_subscribe', 'c'.repeat(64), subscription), /invalid or has been replaced/);
    for (const table of ['pc_push_subscriptions', 'pc_push_jobs']) await assert.rejects(db.query(`select * from ${table}`), /permission denied/);
    await assert.rejects(db.query('select * from pc_push_claim(10)'), /permission denied/);
    await rpc(db, 'pc_push_unsubscribe', owner, subscription.endpoint);
    assert.equal(await rpc(db, 'pc_push_status', viewer, subscription.endpoint), true);
    await rpc(db, 'pc_push_unsubscribe', viewer, subscription.endpoint);
    assert.equal(await rpc(db, 'pc_push_status', viewer, subscription.endpoint), false);
  } finally { await db.close(); }
});

test('updates create coalesced durable work; leases and revisions protect concurrent changes', async () => {
  const db = await setup();
  try {
    await rpc(db, 'pc_push_subscribe', viewer, subscription);
    await rpc(db, 'pc_save_settings', owner, { companyName: 'Office' });
    await worker(db);
    const { rows: jobs } = await db.query('select * from pc_push_claim(10)');
    assert.equal(jobs.length, 1);
    assert.equal((await db.query('select * from pc_push_claim(10)')).rows.length, 0);
    await client(db);
    await rpc(db, 'pc_add', owner, { id: '11111111-1111-4111-8111-111111111111', date: '2026-10-20', amount: 10, type: 'expense', description: 'Taxi', category: 'Transport' });
    await worker(db);
    await rpc(db, 'pc_push_finish', jobs[0].book_id, jobs[0].revision, jobs[0].lease_id, false);
    const next = (await db.query('select * from pc_push_claim(10)')).rows;
    assert.equal(next.length, 1, 'concurrent change was not lost');
    await rpc(db, 'pc_push_finish', next[0].book_id, next[0].revision, next[0].lease_id, false);
    assert.equal((await db.query('select * from pc_push_claim(10)')).rows.length, 0);
  } finally { await db.close(); }
});

test('replacing viewer link removes old subscriptions immediately; writes rolled back do not notify', async () => {
  const db = await setup();
  try {
    await rpc(db, 'pc_push_subscribe', viewer, subscription);
    await rpc(db, 'pc_replace_viewer', owner, 'c'.repeat(64));
    await worker(db);
    assert.equal((await db.query('select * from pc_push_subscriptions')).rows.length, 0);
    assert.equal((await db.query('select * from pc_push_claim(10)')).rows.length, 0);
    await client(db);
    await db.exec('begin');
    await rpc(db, 'pc_save_settings', owner, { companyName: 'Unsaved' });
    await db.exec('rollback');
    await worker(db);
    assert.equal((await db.query('select * from pc_push_claim(10)')).rows.length, 0);
  } finally { await db.close(); }
});
