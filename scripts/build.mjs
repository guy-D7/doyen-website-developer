// Build for Vercel (runs on every deploy):
//   1. compiles Tailwind CSS for each page      -> public/assets/css/*.css
//   2. writes one HTML file per page/URL        -> public/index.html, public/{services,portfolio,about,contact}/index.html
//      each with its own title, description, canonical, visible section and a single <h1>,
//      so search engines can index five pages instead of one
//   3. writes sitemap.xml and robots.txt for the configured domain
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const { siteUrl } = JSON.parse(readFileSync('site.config.json', 'utf8'));
const SITE = siteUrl.replace(/\/+$/, '');
const today = new Date().toISOString().slice(0, 10);

// 1. CSS
mkdirSync('public/assets/css', { recursive: true });
writeFileSync('tailwind/input.css', '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
for (const f of readdirSync('tailwind').filter(f => f.endsWith('.config.cjs'))) {
  execFileSync('npx', ['tailwindcss', '-c', `tailwind/${f}`, '-i', 'tailwind/input.css', '-o', `public/assets/css/${f.replace('.config.cjs', '')}.css`, '--minify'], { stdio: 'inherit' });
}

// 2. Pages (titles/descriptions match the in-page router in src/index.html)
const ROUTES = {
  home:      { path: '/' },
  services:  { path: '/services',  title: 'Website Design Services in Bengaluru — E-commerce, Local &amp; B2B | Doyen',
               desc: 'Website design and development for e-commerce stores, restaurants, clinics, B2B companies, hotels and events — see what your website should fix for your type of business.',
               h1: 'Website Design &amp; Development Services' },
  portfolio: { path: '/portfolio', title: 'Live Projects — Website Portfolio | Doyen Website Developer',
               desc: 'Eight live, fully working websites — event agency, D2C fashion, streetwear, B2B logistics, restaurant, homestay, expo and clinic — each with the problem it solves.',
               h1: 'Live Projects: Websites That Solve Real Problems' },
  about:     { path: '/about',     title: 'About Doyen Deb — Website Designer &amp; Developer in Bengaluru',
               desc: 'Doyen Deb is a freelance website designer and developer in Bengaluru (Bangalore), also serving Jamshedpur and clients across India and worldwide, remotely.',
               h1: 'Website Designer &amp; Developer in Bengaluru', image: '/doyen-deb.jpg', profile: true },
  contact:   { path: '/contact',   title: 'Contact — Book a 15-min Call | Doyen Website Developer',
               desc: 'Tell me about your business and get a reply within 24 hours. Book a 15-minute call, or message me on WhatsApp or email.',
               h1: 'Start a Conversation' },
};
const template = readFileSync('src/index.html', 'utf8').replaceAll('%SITE%', SITE);
const must = (html, re, label) => { if (!re.test(html)) throw new Error(`build: could not find ${label}`); };
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const [id, r] of Object.entries(ROUTES)) {
  if (id === 'home') { writeFileSync('public/index.html', template); continue; }
  const url = SITE + r.path;
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${r.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${r.desc}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${r.title}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${r.desc}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    // a page can share its own image (About shares Doyen's photo, so previews and AI answers show the right face)
    .replace(/(<meta (?:property|name)="(?:og|twitter):image" content=")[^"]*/g, m => r.image ? m.replace(/content="[^"]*/, `content="${SITE}${r.image}`) : m)
    .replace(/(<meta property="og:image:width" content=")[^"]*/, m => r.image ? m.replace(/content="[^"]*/, 'content="600') : m)
    .replace(/(<meta property="og:image:height" content=")[^"]*/, m => r.image ? m.replace(/content="[^"]*/, 'content="600') : m)
    .replace(/(<meta property="og:image:alt" content=")[^"]*/, m => r.image ? m.replace(/content="[^"]*/, 'content="Doyen Deb, freelance website designer and developer in Bengaluru') : m)
    // this URL's section is the visible one in the raw HTML
    .replace('<section id="page-home" class="page active">', '<section id="page-home" class="page">')
    .replace(`<section id="page-${id}" class="page">`, `<section id="page-${id}" class="page active">`)
    // exactly one <h1> per URL: the hero heading steps down, this page's heading steps up
    .replace(/<h1 id="hero-h1"([^>]*)>([\s\S]*?)<\/h1>/, '<h2 id="hero-h1"$1>$2</h2>');
  const h = new RegExp(`<h2 ([^>]*)>${esc(r.h1)}</h2>`);
  must(html, h, `${id} heading`);
  must(html, new RegExp(`<section id="page-${id}" class="page active">`), `${id} section`);
  html = html.replace(h, `<h1 $1>${r.h1}</h1>`);
  // FAQ structured data only where the FAQ is visible (home)
  html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (m, a, json, b) => {
    const data = JSON.parse(json);
    data['@graph'] = data['@graph'].filter(n => n['@type'] !== 'FAQPage');
    // About is Doyen's profile page: tell crawlers the page is about the Person node
    if (r.profile) data['@graph'].push({ '@type': 'ProfilePage', '@id': `${url}#profile`, url, name: r.title.replace(/&amp;/g, '&'),
      mainEntity: { '@id': `${SITE}/#doyen` }, primaryImageOfPage: { '@id': `${SITE}/#doyen-photo` }, dateModified: today });
    return `${a}\n${JSON.stringify(data, null, 2)}\n    ${b}`;
  });
  mkdirSync(`public${r.path}`, { recursive: true });
  writeFileSync(`public${r.path}/index.html`, html);
}

// 3. sitemap + robots (the /work/ showcase builds are noindex, so they stay out of the sitemap)
writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.values(ROUTES).map(r => `  <url><loc>${SITE}${r.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
writeFileSync('public/robots.txt', `# All pages are open to search engines and AI search crawlers.
User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
# Profile for AI assistants: ${SITE}/llms.txt
`);
writeFileSync('public/llms.txt', readFileSync('src/llms.txt', 'utf8').replaceAll('%SITE%', SITE).replaceAll('%DATE%', today));
console.log(`build: ${Object.keys(ROUTES).length} pages for ${SITE}`);
