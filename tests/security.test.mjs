import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../supabase/migrations/202610200001_secure_cashbook.sql', import.meta.url), 'utf8');
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';

async function setup() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  await db.exec(migration);
  return db;
}
async function asUser(db, id) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec('set role authenticated');
}
async function insert(db, id, owner, team = null) {
  return db.query(`insert into public.transactions (id, user_id, date, description, category, amount, type, team_code)
    values ($1,$2,'2026-10-20','Taxi','Transport',25.50,'expense',$3) returning id`, [id, owner, team]);
}

test('personal cashbook and settings are isolated; forged ownership and unauthenticated reads fail', async () => {
  const db = await setup();
  try {
    await asUser(db, alice);
    await insert(db, 'alice-row', alice);
    await db.query('insert into settings(user_id, sender_name) values ($1, $2)', [alice, 'Alice']);
    await asUser(db, bob);
    assert.equal((await db.query('select * from transactions')).rows.length, 0);
    assert.equal((await db.query('select * from settings')).rows.length, 0);
    await assert.rejects(insert(db, 'forged', alice), /row-level security/);
    await assert.rejects(db.query('insert into settings(user_id) values ($1)', [alice]), /row-level security/);
    assert.equal((await db.query("delete from transactions where id='alice-row' returning id")).rows.length, 0);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from transactions'), /permission denied/);
  } finally { await db.close(); }
});

test('saved invite enables team reads and deletes but not other teams or owner reassignment', async () => {
  const db = await setup();
  try {
    await asUser(db, alice);
    await db.query('insert into settings(user_id, team_code) values ($1,$2)', [alice, 'TEAM-SECRET']);
    await insert(db, 'shared-row', alice, 'TEAM-SECRET');
    await assert.rejects(insert(db, 'wrong-team', alice, 'TEAM-OTHER'), /row-level security/);
    await asUser(db, bob);
    assert.equal((await db.query('select * from transactions')).rows.length, 0);
    await db.query('insert into settings(user_id, team_code) values ($1,$2)', [bob, 'TEAM-SECRET']);
    assert.equal((await db.query('select * from transactions')).rows.length, 1);
    assert.equal((await db.query("update transactions set user_id=$1 where id='shared-row' returning id", [bob])).rows.length, 0);
    assert.equal((await db.query("delete from transactions where id='shared-row' returning id")).rows.length, 1);
  } finally { await db.close(); }
});

test('migration is repeatable, preserves legacy rows and removes old permissive policies', async () => {
  const db = await setup();
  try {
    await db.exec("insert into transactions(id,user_id,date,description,category,amount,type) values ('legacy','user_legacy','2026-10-20','Old','Other',0,'expense')").catch(() => {});
    // Legacy invalid rows can already exist before the validation constraint.
    await db.exec(`alter table transactions drop constraint cashbook_valid_transaction;
      insert into transactions(id,user_id,date,description,category,amount,type) values ('legacy','user_legacy','2026-10-20','Old','Other',0,'expense');
      create policy unsafe_old_policy on transactions for all to public using (true) with check (true);`);
    await db.exec(migration);
    assert.equal((await db.query("select * from transactions where id='legacy'")).rows.length, 1);
    assert.equal((await db.query("select * from pg_policies where policyname='unsafe_old_policy'")).rows.length, 0);
    await asUser(db, alice);
    assert.equal((await db.query('select * from transactions')).rows.length, 0);
    await assert.rejects(db.query(`insert into transactions(id,user_id,date,description,category,amount,type)
      values ('invalid',$1,'2026-10-20','Old','Other',0,'expense')`, [alice]), /check constraint/);
  } finally { await db.close(); }
});
