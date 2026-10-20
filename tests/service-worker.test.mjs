import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const code = (await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')).replace('__APP_ASSETS__', '[]');
function worker(clients = []) {
  const handlers = {}, shown = [], opened = [];
  runInNewContext(code, {
    URL, Promise,
    self: {
      location: { origin: 'https://cash.example' },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      registration: { showNotification: async (title, options) => { shown.push({ title, options }); } },
      clients: { matchAll: async () => clients, openWindow: async path => { opened.push(path); } },
    },
  });
  return { handlers, shown, opened };
}
test('push shows generic lock-screen text without financial or capability data', async () => {
  const { handlers, shown } = worker();
  let pending;
  handlers.push({ data: { json: () => ({ amount: 500, url: 'https://evil.test/#access=secret' }) }, waitUntil: promise => { pending = promise; } });
  await pending;
  assert.equal(shown[0].title, 'Petty Cash');
  assert.equal(shown[0].options.body, 'Cashbook updated');
  assert.equal(shown[0].options.data.url, '/');
  assert.ok(!JSON.stringify(shown).includes('secret'));
});
test('notification click opens only the app root or focuses an existing same-origin window', async () => {
  for (const existing of [false, true]) {
    let focused = false, pending, closed = false;
    const { handlers, opened } = worker(existing ? [{ url: 'https://cash.example/', focus: async () => { focused = true; } }] : []);
    handlers.notificationclick({ notification: { data: { url: 'https://evil.test' }, close: () => { closed = true; } }, waitUntil: promise => { pending = promise; } });
    await pending;
    assert.equal(closed, true);
    assert.equal(focused, existing);
    assert.deepEqual(opened, existing ? [] : ['/']);
  }
});
