import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';

const source = readFileSync(new URL('../v4-1/sw.js', import.meta.url), 'utf8');
const ROOT = 'https://example.test/shinka-dungeon/v4-1/';

function runFetch(path, { mode = 'navigate', method = 'GET' } = {}) {
  const listeners = new Map();
  const cached = [];
  const network = [];
  const ctx = createContext({
    URL,
    Promise,
    self: {
      registration: { scope: ROOT },
      addEventListener(name, listener) { listeners.set(name, listener); }
    },
    caches: {
      async open() {
        return {
          async match(url) {
            const key = typeof url === 'string' ? url : url.url;
            cached.push(key);
            return 'cached:' + key;
          }
        };
      }
    },
    fetch(request) {
      network.push(request.url);
      return Promise.resolve('network:' + request.url);
    }
  });
  new Script(source, { filename: 'sw.js' }).runInContext(ctx);
  const request = { url: new URL(path, ROOT).href, mode, method };
  let response;
  const event = { request, respondWith(result) { response = result; } };
  listeners.get('fetch')(event);
  return { response, cached, network, url: request.url };
}

test('pilot 12-battle forge navigation is fetched as its own page', async () => {
  const testCase = runFetch('six-paths-pilot.html?mode=long-journey&pace=quick&setup=forge&fresh=1');
  assert.equal(await testCase.response, 'network:' + testCase.url);
  assert.deepEqual(testCase.cached, []);
  assert.deepEqual(testCase.network, [testCase.url]);
});

test('other uncached HTML pages are never silently replaced by the old game', async () => {
  const t = runFetch('six-paths-pilot.html?fresh=1&talisman=wolf');
  assert.equal(await t.response, 'network:' + t.url);
  assert.deepEqual(t.cached, []);
});

test('planning and main PWA navigations remain cache-first', async () => {
  for (const [page, cachedPage] of [
    ['planning.html?foo=1', 'planning.html'],
    ['index.html', 'index.html'],
    ['./', 'index.html']
  ]) {
    const t = runFetch(page);
    assert.equal(await t.response, 'cached:' + new URL(cachedPage, ROOT).href);
    assert.deepEqual(t.network, []);
  }
});

test('signed runtime resources remain cache-first', async () => {
  const t = runFetch('planning-game.js', { mode:'same-origin' });
  assert.equal(await t.response, 'cached:' + t.url);
  assert.deepEqual(t.network, []);
});
