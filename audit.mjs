// Automated audit of ./dist against the brief. Run after `npm run build`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : files.push(p); } })(DIST);
const html = files.filter((f) => f.endsWith('.html'));
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL:', m); } };
const get = (s, re) => (s.match(re) || [])[1];
const titles = new Set(), descs = new Set();
const basePrefix = (process.env.SITE_BASE_PATH || '').replace(/^\/+|\/+$/g, '');
const basePath = basePrefix ? `/${basePrefix}` : '';
const route = (f) => '/' + path.relative(DIST, f).replace(/index\.html$/, '').replace(/\\/g, '/');
const exists = (u) => { const p = u.split('#')[0]; if (!p || p === '/') return true; const c = [path.join(DIST, p), path.join(DIST, p, 'index.html')]; return c.some((x) => fs.existsSync(x) && fs.statSync(x).isFile()); };
const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');

for (const f of html) {
  const s = fs.readFileSync(f, 'utf8'), r = route(f), noindex = /name="robots" content="noindex/.test(s);
  const h1s = (s.match(/<h1[\s>]/g) || []).length;
  ok(h1s === 1, `${r}: expected 1 H1, found ${h1s}`);
  const title = get(s, /<title>([^<]*)<\/title>/), desc = get(s, /name="description" content="([^"]*)"/);
  ok(title && title.length <= 75, `${r}: title missing/too long (${title?.length})`);
  ok(desc && desc.length >= 50 && desc.length <= 170, `${r}: description length ${desc?.length}`);
  ok(!/[<>]/.test(desc || '') && !/&lt;/.test(desc || ''), `${r}: HTML inside meta description`);
  if (!noindex) { ok(!titles.has(title), `${r}: duplicate title`); ok(!descs.has(desc), `${r}: duplicate description`); titles.add(title); descs.add(desc); }
  ok(/rel="canonical" href="https?:\/\/[^"]+"/.test(s), `${r}: canonical`);
  for (const t of ['og:title', 'og:description', 'og:type', 'og:url', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) ok(s.includes(`"${t}"`), `${r}: missing ${t}`);
  ok(/<html lang="en-IN"/.test(s) && s.includes('name="viewport"'), `${r}: lang/viewport`);
  ok(s.includes('class="skip-link"') && s.includes('<main id="main">'), `${r}: skip link / main`);
  // heading order (no skipped levels)
  const levels = [...s.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  let prev = 0, skip = false; for (const l of levels) { if (prev && l > prev + 1) skip = true; prev = l; }
  ok(!skip, `${r}: heading level skipped (${levels.join('')})`);
  ok(!/<img(?![^>]*\balt=)/.test(s), `${r}: img without alt`);
  ok(!/click here/i.test(s), `${r}: "click here" anchor`);
  // JSON-LD
  const ld = [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  ok(ld.length === 1, `${r}: JSON-LD block count ${ld.length}`);
  try {
    const g = JSON.parse(ld[0][1])['@graph'];
    const types = g.map((n) => n['@type']);
    ok(types.includes('Organization') && types.includes('WebSite'), `${r}: Organization/WebSite`);
    ok(!JSON.stringify(g).match(/aggregateRating|"review"|LocalBusiness/), `${r}: forbidden schema (rating/review/LocalBusiness)`);
    const faq = g.find((n) => n['@type'] === 'FAQPage');
    if (faq) for (const q of faq.mainEntity) ok(s.includes(`>${q.name.replace(/&/g, '&amp;')}<`), `${r}: FAQ schema question not visible: ${q.name}`);
    if (!noindex && r !== '/') ok(types.includes('BreadcrumbList'), `${r}: breadcrumb schema`);
  } catch (e) { ok(false, `${r}: JSON-LD invalid ${e.message}`); }
  // links
  for (const m of s.matchAll(/href="(\/[^"]*)"/g)) {
    const link = basePath && (m[1] === `${basePath}/` || m[1].startsWith(`${basePath}/`)) ? m[1].slice(basePath.length) : m[1];
    ok(exists(link) || link === '/', `${r}: broken link ${m[1]}`);
  }
  // sitemap consistency
  const inMap = sitemap.includes(`<loc>`) && new RegExp(`<loc>[^<]*${r === '/' ? '/' : r.replace(/[/.]/g, '\\$&')}</loc>`).test(sitemap);
  if (r !== '/404.html') ok(noindex ? !inMap : inMap, `${r}: sitemap/noindex mismatch`);
  // keyword-stuffing guard
  const text = s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').toLowerCase();
  for (const k of ['website developer jamshedpur', 'website development jamshedpur', 'website developer bangalore', 'web designer bangalore']) ok((text.match(new RegExp(k, 'g')) || []).length <= 2, `${r}: possible stuffing of "${k}"`);
  ok(!/\b(best|#1|top-rated|leading)\b/.test(text.replace(/best (platform|for)/g, '')), `${r}: unsupported superlative`);
}
// robots.txt
ok(/User-agent: OAI-SearchBot\s+Allow: \//.test(robots), 'robots: OAI-SearchBot allow');
ok(!/Disallow:\s*\//.test(robots), 'robots: no blanket Disallow');
ok(!/User-agent:\s*GPTBot/i.test(robots), 'robots: no GPTBot rule added');
ok(/Sitemap: https?:\/\/.+\/sitemap\.xml/.test(robots), 'robots: Sitemap line');
for (const p of ['/', '/about/', '/portfolio/', '/services/', '/contact/']) ok(sitemap.includes(`${p}</loc>`), `sitemap includes ${p}`);
for (const f of ['favicon.svg', 'site.webmanifest', 'og/home.png', 'icon-512.png', '404.html', 'privacy/index.html', 'terms/index.html']) ok(fs.existsSync(path.join(DIST, f)), `file ${f}`);
// weight
const js = fs.statSync(path.join(DIST, 'main.js')).size, css = fs.statSync(path.join(DIST, 'styles.css')).size;
ok(js < 5000, `JS size ${js}B`); ok(css < 30000, `CSS size ${css}B`);
console.log(`\nAudit: ${passes} passed, ${fails} failed. JS ${js}B, CSS ${css}B.`);
process.exit(fails ? 1 : 0);
