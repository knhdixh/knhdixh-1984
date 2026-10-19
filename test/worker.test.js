import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const env = { ASSETS: { fetch: async () => new Response('static') } };
const call = (path, init) => worker.fetch(new Request('https://app.test' + path, init), env);

test('health endpoint', async () => {
  const res = await call('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test('unknown API route is a JSON 404, other paths go to static assets', async () => {
  assert.equal((await call('/api/nope')).status, 404);
  assert.equal(await (await call('/')).text(), 'static');
});

test('cross-origin writes are rejected', async () => {
  const res = await call('/api/health', { method: 'POST', headers: { Origin: 'https://evil.test' } });
  assert.equal(res.status, 403);
});

test('workers.dev redirects to the canonical host, keeping path and query', async () => {
  const res = await worker.fetch(new Request('https://knhdixh-1984.example.workers.dev/x?y=1'),
    { ...env, CANONICAL_HOST: '1984.knhdixh.com' });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://1984.knhdixh.com/x?y=1');
});

test('page links every extension and the userscript', async () => {
  const fs = await import('node:fs');
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const store = html.match(/href="https:\/\/chromewebstore\.google\.com\/detail\/[^"]+"/g) || [];
  assert.equal(new Set(store).size, 6);
  assert.match(html, /id="install" href="https:\/\/gist\.githubusercontent\.com\/[^"]+\/raw\/anti-visibility-cloak\.user\.js"/);
  assert.match(html, /id="gist" href="https:\/\/gist\.github\.com\/[^"]+"/);
  assert.match(html, /timer gaps can still occur/i);
});
