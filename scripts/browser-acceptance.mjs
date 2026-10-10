// Real-browser acceptance: language switching in shell and embedded modules, state survival, map, exports.
// Not part of `make smoke` (needs Playwright + Chromium). Run: make browser   (env: PLAYWRIGHT_DIR, CHROMIUM)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const pwDir = process.env.PLAYWRIGHT_DIR || '/home/achim/accessibility-observatory-pilot/pr20-7ea6f41/';
let chromium;
try { ({ chromium } = createRequire(pwDir)('playwright')); } catch { console.error(`Playwright not found (set PLAYWRIGHT_DIR). Looked in ${pwDir}`); process.exit(2); }
const port = 4300 + Math.floor(Math.random() * 400);
const server = spawn(process.execPath, [join(root, 'scripts/serve.mjs')], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const base = `http://127.0.0.1:${port}/`;
const shots = process.env.SHOTS; if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = []; const errors = [];
const check = async (name, fn) => { try { await fn(); results.push([name, true]); console.log('ok   ', name); } catch (e) { results.push([name, false]); console.log('FAIL ', name, '\n     ', e.message.split('\n')[0]); } };
const assert = (c, m) => { if (!c) throw new Error(m); };
const markers = /\[(de|en)[:?]/;
async function open(url, { w = 1280, h = 900, mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${url}: ${e.message}`));
  await page.goto(base + url); await page.waitForTimeout(700);
  return { page, ctx };
}
const frameOf = page => page.frames().find(f => f !== page.mainFrame());
const settle = (page, ms = 1200) => page.waitForTimeout(ms);
const text = async ctxt => ctxt.evaluate(() => document.body.innerText);
const shot = async (page, name) => { if (shots) await page.screenshot({ path: join(shots, name + '.jpg'), type: 'jpeg', quality: 72, fullPage: true }); };

await check('default language is German, switch persists across reload and URL stays shareable', async () => {
  const { page, ctx } = await open('');
  assert(await page.evaluate(() => document.documentElement.lang) === 'de', 'default de');
  await page.click('button[data-lang="en"]'); await settle(page, 300);
  assert(await page.evaluate(() => document.documentElement.lang) === 'en', 'en after click');
  await page.goto(base); await page.waitForTimeout(700);
  assert(await page.evaluate(() => document.documentElement.lang) === 'en', 'en persisted');
  await page.goto(base + '?lang=de'); await page.waitForTimeout(700);
  assert(await page.evaluate(() => document.documentElement.lang) === 'de', '?lang overrides');
  await ctx.close();
});

for (const stage of ['start', 'concept', 'practice', 'measure', 'cities', 'map', 'export']) {
  await check(`native step ${stage}: DE → EN → DE with no missing translations`, async () => {
    const { page, ctx } = await open(`?stage=${stage}&lang=de`);
    for (const lang of ['de', 'en', 'de']) {
      if (await page.evaluate(() => document.documentElement.lang) !== lang) { await page.click(`button[data-lang="${lang}"]`); await settle(page, 500); }
      const t = await text(page); assert(!markers.test(t), `marker in ${lang}`); assert(!/ß/.test(t), 'ß in text'); assert(t.length > 300, 'page rendered');
    }
    await ctx.close();
  });
}

for (const stage of ['evidence', 'place', 'observe', 'explore']) {
  await check(`embedded ${stage}: initial DE, live EN and back, no reload (except explore), no markers`, async () => {
    const { page, ctx } = await open(`?stage=${stage}&lang=de&place=kanonengasse`); await settle(page, 2000);
    const f = frameOf(page); assert(f, 'frame present');
    await f.evaluate(() => { window.__keep = 7; });
    const de1 = await text(f); assert(!markers.test(de1), 'marker in de'); assert(await f.evaluate(() => document.documentElement.lang) === 'de', 'frame lang de');
    await page.click('button[data-lang="en"]'); await settle(page, 2000);
    const f2 = frameOf(page); const en = await text(f2);
    assert(await f2.evaluate(() => document.documentElement.lang) === 'en', 'frame lang en'); assert(!markers.test(en), 'marker in en'); assert(en !== de1, 'text changed');
    if (stage !== 'explore') assert(await f2.evaluate(() => window.__keep) === 7, 'frame was reloaded by the switch');
    await page.click('button[data-lang="de"]'); await settle(page, 2000);
    const de2 = await text(frameOf(page)); assert(!markers.test(de2), 'marker after back to de');
    assert(de2.slice(0, 120) === de1.slice(0, 120), 'back to the same German');
    await page.reload(); await settle(page, 2000);
    assert(await frameOf(page).evaluate(() => document.documentElement.lang) === 'de', 'reload keeps language in frame');
    await ctx.close();
  });
}

await check('in-module navigation keeps the language: X-Ray street switch, Rain Walk references, Data Charter tabs', async () => {
  for (const lang of ['de', 'en']) {
    let { page, ctx } = await open(`?stage=place&lang=${lang}&place=kanonengasse`); await settle(page, 1800);
    let f = frameOf(page); assert(!(await f.$('.street-switch')), 'embedded x-ray must not offer its own street switch (the shell owns the place)');
    assert(await f.evaluate(() => document.documentElement.lang) === lang, `x-ray ${lang}`); await ctx.close();
    ({ page, ctx } = await open(`?stage=observe&lang=${lang}&place=kanonengasse`)); await settle(page, 1800); f = frameOf(page);
    await f.click('a[data-keep-lang="references.html"]'); await settle(page, 1200); f = frameOf(page);
    assert(/references/.test(f.url()) && await f.evaluate(() => document.documentElement.lang) === lang, `rain walk references keep ${lang}`);
    assert(!markers.test(await text(f)), 'markers on references'); await ctx.close();
    ({ page, ctx } = await open(`?stage=evidence&lang=${lang}`)); await settle(page, 2000); f = frameOf(page);
    const tabs = f.locator('button.tool:visible'); assert(await tabs.count() >= 1, 'charter has a visible tab button');
    await tabs.nth(await tabs.count() - 1).click(); await settle(page, 600); assert(!markers.test(await text(frameOf(page))), 'markers after charter tab'); assert(await frameOf(page).evaluate(() => document.documentElement.lang) === lang, 'charter keeps lang'); await ctx.close();
  }
});

await check('Street Lab: a placed (synthetic) intervention survives DE → EN → DE and a reload, per place', async () => {
  const { page, ctx } = await open('?stage=explore&lang=de&place=kanonengasse'); await settle(page, 2500);
  let f = frameOf(page);
  const garden = () => f.locator('button[aria-pressed]').filter({ hasText: /Versickerungsmulde|Rain garden|Garten|garden/i }).first();
  assert(await garden().count(), 'rain-garden toggle found'); await garden().click(); await settle(page, 300);
  assert(await garden().getAttribute('aria-pressed') === 'true', 'garden on');
  for (const lang of ['en', 'de']) { await page.click(`button[data-lang="${lang}"]`); await settle(page, 2500); f = frameOf(page); assert(await garden().getAttribute('aria-pressed') === 'true', `garden kept after switch to ${lang}`); }
  await page.reload(); await settle(page, 2500); f = frameOf(page); assert(await garden().getAttribute('aria-pressed') === 'true', 'garden kept after reload');
  await page.click('[data-place="klybeck"]'); await settle(page, 2500); f = frameOf(page); assert(await garden().getAttribute('aria-pressed') === 'false', 'edits do not leak to another place'); await ctx.close();
});

await check('Data Charter map actually renders (MapLibre canvas) and shows its source attribution; works in both languages', async () => {
  for (const lang of ['de', 'en']) {
    const { page, ctx } = await open(`?stage=evidence&lang=${lang}`); await settle(page, 3500);
    const f = frameOf(page); assert(await f.$('canvas.maplibregl-canvas'), `map canvas present (${lang}); the page must not fall back to "map unavailable"`);
    assert(/swisstopo|Basel-Stadt/.test(await f.innerText('.maplibregl-ctrl-attrib')), 'attribution visible'); await ctx.close();
  }
});

await check('selected place survives language switching and reload', async () => {
  const { page, ctx } = await open('?stage=place&lang=de&place=klybeck'); await settle(page, 1800);
  assert(/klybeck/i.test(frameOf(page).url()), 'frame is klybeck');
  await page.click('button[data-lang="en"]'); await settle(page, 1500);
  assert(/klybeck/i.test(page.url()) && /lang=en/.test(page.url()), 'url keeps place and language');
  assert(/klybeck/i.test(frameOf(page).url()), 'still klybeck in frame');
  await page.reload(); await settle(page, 1800);
  assert(/klybeck/i.test(frameOf(page).url()), 'reload keeps klybeck');
  await ctx.close();
});

await check('Rain Walk observation persists across language switch, reload, and stays per place', async () => {
  const { page, ctx } = await open('?stage=observe&lang=de&place=kanonengasse'); await settle(page, 1800);
  let f = frameOf(page);
  const note = 'Pfütze vor Hausnummer 12 (Test)';
  await f.fill('#note', note); await f.fill('#observed', '2026-10-10T10:00');
  await f.click('#capture button[type=submit]'); await settle(page, 500);
  await page.click('button[data-lang="en"]'); await settle(page, 1500); f = frameOf(page);
  await f.click('[data-tab="review"]'); await settle(page, 300);
  assert((await text(f)).includes(note), 'observation visible after live switch');
  await page.reload(); await settle(page, 1800); f = frameOf(page);
  await f.click('[data-tab="review"]'); await settle(page, 300);
  assert((await text(f)).includes(note), 'observation visible after reload (en)');
  await page.click('button[data-lang="de"]'); await settle(page, 1500); f = frameOf(page);
  await f.click('[data-tab="review"]'); await settle(page, 300);
  assert((await text(f)).includes(note), 'observation visible after switch back');
  await page.click('[data-place="klybeck"]'); await settle(page, 1800); f = frameOf(page);
  await f.click('[data-tab="review"]'); await settle(page, 300);
  assert(!(await text(f)).includes(note), 'observation does not leak to another place');
  await ctx.close();
});

for (const lang of ['de', 'en']) {
  await check(`export ${lang}: place-isolated Markdown and JSON with language and provenance`, async () => {
    const { page, ctx } = await open(`?stage=export&lang=${lang}&place=kanonengasse`);
    const [d1] = await Promise.all([page.waitForEvent('download'), page.click('#export-md')]);
    const md = readFileSync(await d1.path(), 'utf8');
    assert(!/klybeck/i.test(md), 'no klybeck in kanonengasse markdown');
    assert(!markers.test(md) && !/ß/.test(md), 'markers or ß in markdown');
    const [d2] = await Promise.all([page.waitForEvent('download'), page.click('#export-json')]);
    const json = JSON.parse(readFileSync(await d2.path(), 'utf8'));
    assert(!/klybeck/i.test(JSON.stringify(json)), 'no klybeck in kanonengasse json'); assert(json.ui_language === lang, 'ui_language'); assert(JSON.stringify(json).length > 500, 'json content');
    await ctx.close();
  });
}

await check('map: city switch, real layer toggle, click-to-inspect, share link (button + restore), table paging, compare', async () => {
  const { page, ctx } = await open('?stage=map&lang=en&city=basel'); await settle(page, 1200);
  const cities = await page.$$eval('[data-map-city]', els => els.map(e => e.dataset.mapCity)); assert(cities.length === 4, `four cities listed, got ${cities}`);
  for (const c of cities) {
    await page.click(`[data-map-city="${c}"]`); await settle(page, 900);
    assert(await page.$(`.mapview[data-city="${c}"]`), `view for ${c}`);
    const drawn = await page.$$eval(`.mapview[data-city="${c}"] .mapsvg [data-f]`, els => els.length);
    const gaps = await page.$$eval('.gaps li', els => els.length);
    assert(drawn > 0 || gaps > 0, `${c}: neither features nor a stated gap`);
    assert(await page.$eval('.attribution', e => e.innerText.includes('©')).catch(() => false) || drawn === 0, `${c}: drawn map shows attribution`);
  }
  await page.click(`[data-map-city="${cities[0]}"]`); await settle(page, 900);
  // a real layer toggle: switch the tree register on and off and watch the drawn group appear and disappear
  const toggle = page.locator('[data-layer-toggle="basel.trees.01"]'); assert(await toggle.count(), 'tree layer checkbox');
  assert(!(await page.$('[data-layer-group="basel.trees.01"]')), 'trees initially off');
  await toggle.check(); await settle(page, 700); assert(await page.$('[data-layer-group="basel.trees.01"]'), 'trees drawn after toggle on');
  assert(/trees\.01/.test(page.url()), 'layer state in the url');
  await page.locator('[data-layer-toggle="basel.trees.01"]').uncheck(); await settle(page, 700); assert(!(await page.$('[data-layer-group="basel.trees.01"]')), 'trees gone after toggle off');
  const first = await page.$('.mapsvg [data-f]'); assert(first, 'a feature');
  await first.dispatchEvent('click'); await settle(page, 300);
  const insp = await page.innerText('#inspect'); assert(/Licence|Lizenz/.test(insp) && /Method|Methode/.test(insp), 'inspect shows provenance');
  await page.click('#map-share'); await settle(page, 300); assert((await page.innerText('#map-share-note')).trim().length > 0, 'share button gives feedback');
  const url = page.url(); assert(/sel=/.test(url) && /city=/.test(url) && /layers=/.test(url), 'state in url');
  await page.goto(url); await settle(page, 1200);
  assert(/Licence/.test(await page.innerText('#inspect')), 'selection restored from link');
  await page.click('[data-map-mode="table"]'); await settle(page, 300);
  assert((await page.$$('[data-layer-row]')).length > 0, 'table lists layers');
  const firstPage = await page.$$eval('[data-pick]', els => els.map(e => e.dataset.pick));
  const perLayer = {}; for (const k of firstPage) { const l = k.replace(/:\d+$/, ''); perLayer[l] = (perLayer[l] ?? 0) + 1; }
  assert(firstPage.length > 0 && Math.max(...Object.values(perLayer)) <= 50, `table is paged (at most 50 rows per layer), got ${JSON.stringify(perLayer)}`);
  await page.click('[data-table-page$=":1"]:not([disabled])'); await settle(page, 400);
  const secondPage = await page.$$eval('[data-pick]', els => els.map(e => e.dataset.pick));
  assert(secondPage.length > 0 && secondPage.some(k => !firstPage.includes(k)), 'next page shows other objects');
  await page.click('[data-map-mode="map"]'); await settle(page, 600);
  await page.selectOption('#map-compare', cities[1]); await settle(page, 1200);
  assert((await page.$$('.mappanel')).length === 2, 'two panels');
  await shot(page, 'map-compare-en'); await ctx.close();
});

await check('keyboard focus survives a re-render (layer toggle, city button, mode button) and the view is not a live region', async () => {
  const { page, ctx } = await open('?stage=map&lang=de&city=basel'); await settle(page, 1200);
  assert(await page.getAttribute('#view', 'aria-live') === null, '#view must not be aria-live');
  await page.focus('[data-layer-toggle="basel.trees.01"]'); await page.keyboard.press('Space'); await settle(page, 700);
  assert(await page.evaluate(() => document.activeElement?.dataset?.layerToggle) === 'basel.trees.01', 'focus kept on the layer checkbox');
  await page.focus('[data-map-mode="table"]'); await page.keyboard.press('Enter'); await settle(page, 700);
  assert(await page.evaluate(() => document.activeElement?.dataset?.mapMode) === 'table', 'focus kept on the mode button');
  await page.focus('[data-stage="cities"]'); await page.keyboard.press('Enter'); await settle(page, 700);
  assert(await page.evaluate(() => document.activeElement?.dataset?.stage) === 'cities', 'focus kept on the step button');
  assert((await page.innerText('#live')).trim().length > 0, 'the polite status line announces the step'); await ctx.close();
});

await check('export after a live language switch reports the new language and the same place', async () => {
  const { page, ctx } = await open('?stage=export&lang=de&place=kanonengasse');
  await page.click('button[data-lang="en"]'); await settle(page, 500);
  const [d] = await Promise.all([page.waitForEvent('download'), page.click('#export-json')]);
  const json = JSON.parse(readFileSync(await d.path(), 'utf8'));
  assert(json.ui_language === 'en', 'ui_language en after switch'); assert(/kanonengasse/i.test(JSON.stringify(json)), 'place kept'); await ctx.close();
});

await check('reduced motion: the stylesheet switches animation, transition and smooth scrolling off, and nothing runs', async () => {
  const run = async reducedMotion => {
    const ctx = await browser.newContext({ reducedMotion }); const page = await ctx.newPage(); await page.goto(base + '?stage=concept&lang=de'); await page.waitForTimeout(800);
    await page.addStyleTag({ content: '.probe{transition:opacity 5s;animation:none}' }); await page.evaluate(() => { const e = document.createElement('div'); e.className = 'probe'; document.body.append(e); });
    const v = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.probe')); return { transition: s.transitionDuration, anims: document.getAnimations().length, rule: [...document.styleSheets].some(sh => { try { return [...sh.cssRules].some(r => r.media && /prefers-reduced-motion/.test(r.media.mediaText) && /animation/.test(r.cssText)); } catch { return false; } }) }; });
    await ctx.close(); return v;
  };
  const reduced = await run('reduce'); const normal = await run('no-preference');
  assert(reduced.rule, 'a prefers-reduced-motion rule that disables animation exists in the stylesheet');
  assert(reduced.transition === '0s', `transitions are off under reduced motion, got ${reduced.transition}`);
  assert(normal.transition !== '0s', `control run: the same element does transition without the preference (got ${normal.transition}); otherwise the check proves nothing`);
  assert(reduced.anims === 0, 'no running animations under reduced motion');
});

await check('map brief: selecting an object exports a city-isolated brief in the active language', async () => {
  const { page, ctx } = await open('?stage=map&lang=de&city=zurich&layers=zurich.boundary.01,zurich.sealing.01'); await settle(page, 1200);
  await (await page.$('.mapsvg [data-layer="zurich.sealing.01"][data-f]')).dispatchEvent('click'); await settle(page, 300);
  assert((await page.innerText('.attribution')).includes('©'), 'attribution visible on the map');
  const [d] = await Promise.all([page.waitForEvent('download'), page.click('#brief-json')]);
  const rec = JSON.parse(readFileSync(await d.path(), 'utf8'));
  assert(rec.city.id === 'zurich' && rec.ui_language === 'de', 'city and language');
  assert(rec.selection.layer_id === 'zurich.sealing.01', 'the sealing layer is selected'); assert(!/berlin|basel|copenhagen|kopenhagen/i.test(JSON.stringify(rec)), 'no other city named in a zurich brief'); assert(rec.related_indicator === null, 'no Basel charter guidance in a Zürich brief');
  assert(rec.unresolved_checks.length >= 1 && rec.status === 'requires-investigation', 'unresolved checks kept');
  const [m] = await Promise.all([page.waitForEvent('download'), page.click('#brief-md')]);
  const md = readFileSync(await m.path(), 'utf8'); assert(/Untersuchungsnotiz/.test(md) && !markers.test(md), 'german markdown'); await ctx.close();
});

await check('map → place: a Basel place link opens Inspect-a-place for that place; other cities offer none', async () => {
  const { page, ctx } = await open('?stage=map&lang=de&city=basel'); await settle(page, 1200);
  assert(await page.$('[data-place-mark="klybeck"]'), 'place marker on the Basel map');
  await page.click('[data-goto-place="klybeck"]'); await settle(page, 1800);
  assert(/stage=place/.test(page.url()) && /place=klybeck/.test(page.url()), 'url'); assert(/klybeck/i.test(frameOf(page).url()), 'frame shows klybeck');
  await page.goto(base + '?stage=map&lang=de&city=berlin'); await settle(page, 1200);
  assert(!(await page.$('[data-place-mark]')) && !(await page.$('[data-placelinks]')), 'no Basel places on the Berlin map'); await ctx.close();
});

await check('map keyboard: svg focusable, + and arrows change the view', async () => {
  const { page, ctx } = await open('?stage=map&lang=de&city=basel'); await settle(page, 1200);
  await page.focus('.mapsvg'); const before = await page.getAttribute('.mapsvg', 'viewBox');
  await page.keyboard.press('+'); await page.keyboard.press('ArrowRight');
  assert(before !== await page.getAttribute('.mapsvg', 'viewBox'), 'viewBox changed'); await ctx.close();
});

await check('map failure state: a missing snapshot shows an error, the rest of the page works', async () => {
  const { page, ctx } = await open('?stage=map&lang=en&city=basel');
  await page.route('**/content/maps/basel/*.geojson', r => r.abort()); await page.reload(); await settle(page, 1500);
  assert(await page.$('.maperror'), 'error shown'); assert(await page.$('.layers'), 'layer list still there'); await ctx.close();
});

for (const [w, h, label] of [[390, 844, 'mobile'], [1280, 900, 'desktop']]) {
  await check(`${label}: no horizontal overflow on any step`, async () => {
    for (const stage of ['start', 'concept', 'practice', 'measure', 'cities', 'map', 'place', 'export']) {
      const { page, ctx } = await open(`?stage=${stage}&lang=de`, { w, h, mobile: w < 600 }); await settle(page, 1200);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert(over <= 1, `${stage} overflows by ${over}px at ${w}`); await ctx.close();
    }
  });
}

let axeSource = null; try { axeSource = readFileSync(createRequire(pwDir).resolve('axe-core/axe.min.js'), 'utf8'); } catch {}
await check('accessibility (axe, WCAG 2 A/AA incl. contrast): no serious or critical violations on the native steps, both languages', async () => {
  assert(axeSource, 'axe-core could not be resolved from PLAYWRIGHT_DIR: the accessibility check cannot run (counted as a failure, not skipped)');
  const bad = [];
  for (const lang of ['de', 'en']) for (const [stage, extra] of [['start', ''], ['concept', ''], ['practice', ''], ['measure', ''], ['cities', ''], ['map', '&city=zurich'], ['export', '']]) {
    const { page, ctx } = await open(`?stage=${stage}&lang=${lang}${extra}`); await settle(page, 1000);
    await page.addScriptTag({ content: axeSource });
    const res = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'], resultTypes: ['violations'] }));
    for (const v of res.violations.filter(v => ['serious', 'critical'].includes(v.impact))) bad.push(`${stage}/${lang}: ${v.id} (${v.nodes.length}) ${v.nodes[0].target.join(' ')}`);
    await ctx.close();
  }
  assert(!bad.length, bad.slice(0, 8).join(' | '));
});

await check('keyboard: Tab reaches the language switch and the step buttons with a visible focus style', async () => {
  const { page, ctx } = await open('?lang=de');
  const seen = new Set();
  for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); seen.add(await page.evaluate(() => document.activeElement?.dataset?.lang ? 'lang' : document.activeElement?.dataset?.stage ? 'stage' : '')); }
  assert(seen.has('lang') && seen.has('stage'), 'lang and stage buttons focusable');
  await page.focus('[data-stage]'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth}`; });
  assert(/^solid [2-9]/.test(outline), `focus outline visible, got "${outline}"`);
  await ctx.close();
});

if (shots) for (const [name, url, w, h] of [
  ['start-de-desktop', '?lang=de', 1280, 900], ['start-en-mobile', '?lang=en', 390, 844],
  ['concept-de-desktop', '?stage=concept&lang=de', 1280, 900], ['concept-en-mobile', '?stage=concept&lang=en', 390, 844],
  ['practice-de-desktop', '?stage=practice&lang=de', 1280, 900],
  ['measure-en-desktop', '?stage=measure&lang=en', 1280, 900], ['measure-de-mobile', '?stage=measure&lang=de', 390, 844],
  ['evidence-de-desktop', '?stage=evidence&lang=de', 1280, 900], ['evidence-en-desktop', '?stage=evidence&lang=en', 1280, 900],
  ['cities-de-desktop', '?stage=cities&lang=de', 1280, 900], ['cities-en-mobile', '?stage=cities&lang=en', 390, 844],
  ['map-basel-de-desktop', '?stage=map&lang=de&city=basel&layers=basel.boundary.01,basel.sealing.01', 1280, 900], ['map-basel-en-mobile', '?stage=map&lang=en&city=basel&layers=basel.boundary.01,basel.sealing.01', 390, 844],
  ['map-berlin-en-desktop', '?stage=map&lang=en&city=berlin&layers=berlin.boundary.01,berlin.sealing.01', 1280, 900],
  ['map-copenhagen-de-desktop', '?stage=map&lang=de&city=copenhagen&layers=copenhagen.catchments.01,copenhagen.cloudburst-basins.01,copenhagen.cloudburst-roads.01', 1280, 900],
  ['map-zurich-de-mobile', '?stage=map&lang=de&city=zurich&layers=zurich.boundary.01,zurich.heat.01', 390, 844],
  ['map-compare-basel-zurich-en-desktop', '?stage=map&lang=en&city=basel&layers=basel.boundary.01,basel.sealing.01&compare=zurich&layers2=zurich.boundary.01,zurich.sealing.01', 1280, 900],
  ['map-table-de-desktop', '?stage=map&lang=de&city=zurich&mapview=table', 1280, 900],
  ['place-en-desktop', '?stage=place&lang=en&place=kanonengasse', 1280, 900], ['place-de-mobile', '?stage=place&lang=de&place=kanonengasse', 390, 844],
  ['observe-de-desktop', '?stage=observe&lang=de&place=kanonengasse', 1280, 900], ['observe-en-mobile', '?stage=observe&lang=en&place=kanonengasse', 390, 844],
  ['explore-en-desktop', '?stage=explore&lang=en&place=kanonengasse', 1280, 900], ['explore-de-mobile', '?stage=explore&lang=de&place=kanonengasse', 390, 844],
  ['export-de-desktop', '?stage=export&lang=de&place=kanonengasse', 1280, 900], ['export-en-mobile', '?stage=export&lang=en&place=kanonengasse', 390, 844]]) {
  const { page, ctx } = await open(url, { w, h, mobile: w < 600 }); await settle(page, 2000); await shot(page, name); await ctx.close();
}
await browser.close(); server.kill();
const failed = results.filter(r => !r[1]);
if (errors.length) { console.log('\nPage errors:'); for (const e of [...new Set(errors)]) console.log(' ', e); }
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed${errors.length ? `, ${new Set(errors).size} page error(s)` : ''}`);
process.exit(failed.length || errors.length ? 1 : 0);
