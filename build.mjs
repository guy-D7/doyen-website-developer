// Static site generator for Doyen Website Developer.
// Run: npm run build  ->  outputs to ./dist
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { services, audiences, why, process as steps, faqs, futureTopics, portfolioCategories } from './content.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const projects = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/projects.json'), 'utf8'));
const warnings = [];
const basePath = (process.env.SITE_BASE_PATH || '').replace(/^\/+|\/+$/g, '');
const basePrefix = basePath ? `/${basePath}` : '';

// ---------- config handling ----------
const PLACEHOLDER_URL = 'https://YOUR-DOMAIN.com';
let siteUrl = (cfg.siteUrl || '').trim().replace(/\/+$/, '');
if (!siteUrl) {
  siteUrl = PLACEHOLDER_URL;
  warnings.push('siteUrl is empty: using https://YOUR-DOMAIN.com in canonicals, sitemap and robots.txt. Set siteUrl in site.config.json before launch.');
}
if (!cfg.email) warnings.push('email is empty: contact page shows a visible placeholder.');
if (!cfg.phone) warnings.push('phone is empty: contact page shows a visible placeholder.');
if (!cfg.formAction) warnings.push('formAction is empty: the contact form falls back to email (mailto) if email is set. Add a form endpoint for production.');
if (!cfg.socialProfiles?.length) warnings.push('socialProfiles is empty: sameAs is omitted from structured data (correct until real profiles exist).');
if (projects.some((p) => p.placeholder)) warnings.push('Portfolio projects are placeholders: their pages are noindex and excluded from the sitemap until placeholder is set to false in data/projects.json.');

const NAME = cfg.siteName;
const cities = cfg.locations.map((l) => l.city);
const cityPair = `${cities[0]} and ${cities[1]}`;
const url = (p) => siteUrl + p;
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const today = new Date().toISOString().slice(0, 10);

const emailHtml = cfg.email
  ? `<a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>`
  : `<span class="placeholder">[Add your email address in site.config.json]</span>`;
const phoneHtml = cfg.phone
  ? `<a href="tel:${esc(cfg.phone.replace(/[^+\d]/g, ''))}">${esc(cfg.phone)}</a>`
  : `<span class="placeholder">[Add your phone number in site.config.json]</span>`;

// ---------- components ----------
const btn = (href, label, kind = 'primary') => `<a class="btn btn--${kind}" href="${href}">${esc(label)}</a>`;
const ctaPair = () => `<div class="actions">${btn('/contact/', 'Start a Project')}${btn('/portfolio/', 'View Portfolio', 'ghost')}</div>`;

const ctaBand = (title, text) => `
<section class="cta-band" aria-labelledby="cta-title">
  <div class="container">
    <h2 id="cta-title">${esc(title)}</h2>
    <p>${esc(text)}</p>
    ${ctaPair()}
  </div>
</section>`;

const breadcrumbHtml = (crumbs) => `
<nav class="breadcrumb" aria-label="Breadcrumb"><ol>${crumbs
  .map((c, i) => (i === crumbs.length - 1 ? `<li><span aria-current="page">${esc(c.name)}</span></li>` : `<li><a href="${c.path}">${esc(c.name)}</a></li>`))
  .join('')}</ol></nav>`;

const faqHtml = (items, headingId = 'faq-title') =>
  items.map(([q, a, more]) => `<div class="faq-item"><h3>${esc(q)}</h3><p><strong>${esc(a)}</strong>${more ? ' ' + esc(more) : ''}</p></div>`).join('');

const nav = [
  ['Home', '/'],
  ['About', '/about/'],
  ['Portfolio', '/portfolio/'],
  ['Services', '/services/'],
  ['Contact', '/contact/']
];

function header(current) {
  return `
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="${esc(NAME)} home"><span class="brand-mark" aria-hidden="true"></span><span class="brand-text">Doyen<span class="brand-sub"> Website Developer</span></span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav id="site-nav" class="site-nav" aria-label="Primary">
      <ul>${nav.map(([n, p]) => `<li><a href="${p}"${current === p ? ' aria-current="page"' : ''}>${n}</a></li>`).join('')}</ul>
      ${btn('/contact/', 'Start a Project')}
    </nav>
  </div>
</header>`;
}

function footer() {
  return `
<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <p class="footer-brand">${esc(NAME)}</p>
      <p>Website development and digital presence services for startups and small businesses.</p>
      <p class="muted">${cities.map(esc).join(' | ')}, India</p>
    </div>
    <nav aria-label="Footer">
      <h2 class="footer-h">Explore</h2>
      <ul>${nav.map(([n, p]) => `<li><a href="${p}">${n}</a></li>`).join('')}</ul>
    </nav>
    <nav aria-label="Services">
      <h2 class="footer-h">Services</h2>
      <ul>${services.map((s) => `<li><a href="/services/#${s.slug}">${esc(s.name)}</a></li>`).join('')}</ul>
    </nav>
    <div>
      <h2 class="footer-h">Contact</h2>
      <address>
        <p>Email: ${emailHtml}</p>
        <p>Phone: ${phoneHtml}</p>
        ${cfg.socialProfiles?.length ? `<p>${cfg.socialProfiles.map((s) => `<a href="${esc(s.url)}" rel="me noopener">${esc(s.name)}</a>`).join(' · ')}</p>` : ''}
      </address>
    </div>
  </div>
  <div class="container footer-bottom">
    <p>© ${new Date().getFullYear()} ${esc(NAME)}. All rights reserved.</p>
    <p><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p>
  </div>
</footer>`;
}

// ---------- structured data ----------
const ids = { org: url('/#organization'), site: url('/#website'), person: url('/#founder') };

function orgNode() {
  const n = {
    '@type': 'Organization',
    '@id': ids.org,
    name: NAME,
    url: url('/'),
    description: cfg.description,
    logo: { '@type': 'ImageObject', url: url('/icon-512.png') },
    image: url('/og/home.png'),
    areaServed: [
      ...cfg.locations.map((l) => ({ '@type': 'City', name: l.city, containedInPlace: { '@type': 'AdministrativeArea', name: l.region } })),
      { '@type': 'Country', name: 'India' }
    ],
    knowsAbout: ['Website development', 'Business websites', 'E-commerce websites', 'Landing pages', 'UI/UX design', 'SEO-ready websites', 'Branding', 'Social media content'],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Website and digital presence services',
      itemListElement: services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.name, url: url(`/services/#${s.slug}`) } }))
    }
  };
  if (cfg.founder?.name) n.founder = { '@id': ids.person };
  if (cfg.email) n.email = cfg.email;
  if (cfg.phone) n.telephone = cfg.phone;
  if (cfg.socialProfiles?.length) n.sameAs = cfg.socialProfiles.map((s) => s.url);
  return n;
}
const siteNode = () => ({ '@type': 'WebSite', '@id': ids.site, url: url('/'), name: NAME, description: cfg.description, publisher: { '@id': ids.org }, inLanguage: 'en-IN' });
const personNode = () =>
  cfg.founder?.name
    ? { '@type': 'Person', '@id': ids.person, name: cfg.founder.name, jobTitle: cfg.founder.jobTitle, worksFor: { '@id': ids.org }, ...(cfg.socialProfiles?.length ? { sameAs: cfg.socialProfiles.map((s) => s.url) } : {}) }
    : null;

function buildGraph(page) {
  const g = [orgNode(), siteNode()];
  if (page.person && personNode()) g.push(personNode());
  if (!page.noindex) {
    g.push({
      '@type': page.webPageType || 'WebPage',
      '@id': url(page.path) + '#webpage',
      url: url(page.path),
      name: page.title,
      description: page.description,
      isPartOf: { '@id': ids.site },
      about: { '@id': ids.org },
      inLanguage: 'en-IN',
      ...(page.path !== '/' ? { breadcrumb: { '@id': url(page.path) + '#breadcrumb' } } : {})
    });
    if (page.path !== '/' && page.crumbs) {
      g.push({
        '@type': 'BreadcrumbList',
        '@id': url(page.path) + '#breadcrumb',
        itemListElement: page.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: url(c.path) }))
      });
    }
    (page.extraGraph || []).forEach((x) => g.push(x));
  }
  return { '@context': 'https://schema.org', '@graph': g };
}

const faqSchema = (items, pageUrl) => ({
  '@type': 'FAQPage',
  '@id': pageUrl + '#faq',
  mainEntity: items.map(([q, a, more]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: more ? `${a} ${more}` : a } }))
});

// ---------- layout ----------
function layout(page) {
  const canonical = url(page.path);
  const ogImage = url(`/og/${page.og || 'home'}.png`);
  const robots = page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1';
  const graph = JSON.stringify(buildGraph(page));
  return `<!doctype html>
<html lang="en-IN" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="${esc(cfg.themeColor)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:site_name" content="${esc(NAME)}">
<meta property="og:locale" content="en_IN">
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:title" content="${esc(page.ogTitle || page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(page.ogAlt || `${NAME}: ${page.h1 || page.title}`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.ogTitle || page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${ogImage}">
<script>document.documentElement.className='js'</script>
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">${graph}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
${header(page.nav ?? page.path)}
<main id="main">
${page.body}
</main>
${footer()}
<script src="/main.js" defer></script>
</body>
</html>
`;
}

// ---------- pages ----------
const pages = [];
const serviceLink = (slug, label) => `<a href="/services/#${slug}">${esc(label)}</a>`;

// HOME
{
  const featured = projects.slice(0, 3);
  const p = {
    path: '/',
    title: `${NAME} | Website Development in ${cities[0]} & ${cities[1]}`,
    description: 'Modern, fast, mobile-friendly websites for startups and small businesses. Business websites, e-commerce, landing pages and UI/UX from Jamshedpur and Bangalore.',
    h1: 'Websites Built Around Your Business.',
    og: 'home',
    person: true,
    nav: '/',
    extraGraph: [faqSchema(faqs, url('/'))],
    body: `
<section class="hero">
  <div class="container hero-inner">
    <p class="eyebrow">${cities.map(esc).join(' | ')}</p>
    <h1>Websites Built Around Your Business.</h1>
    <p class="lede">${esc(NAME)} creates modern, fast, mobile-friendly websites for startups and small businesses — from business websites and landing pages to e-commerce experiences.</p>
    ${ctaPair()}
  </div>
</section>

<section class="section" aria-labelledby="about-answer-title">
  <div class="container narrow">
    <h2 id="about-answer-title">About ${esc(NAME)}</h2>
    <p class="answer">${esc(NAME)} is a website development and digital presence service focused on helping startups and small businesses build modern, fast, mobile-friendly and SEO-ready websites. It serves businesses in ${esc(cityPair)} and can work with clients beyond these locations.</p>
    <p>Whether you need a first website, a redesign of a slow or dated one, or a store to sell online, the work starts with your business: what you sell, who buys it and what you want visitors to do. <a href="/about/">Read more about Doyen and how projects work</a>.</p>
  </div>
</section>

<section class="section section--alt" aria-labelledby="what-title">
  <div class="container">
    <h2 id="what-title">What I do</h2>
    <p class="section-lede">Core services include business website development, e-commerce websites, landing pages, UI/UX design, SEO-ready development, branding and social media content.</p>
    <ul class="cards">
      ${services
        .map((s) => `<li class="card"><h3><a href="/services/#${s.slug}">${esc(s.name)}</a></h3><p>${esc(s.short)}</p><a class="more" href="/services/#${s.slug}">About ${esc(s.name.toLowerCase())}<span class="sr-only"> services</span></a></li>`)
        .join('')}
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="who-title">
  <div class="container">
    <h2 id="who-title">Who I help</h2>
    <p class="section-lede">Startups and small businesses are the focus, across a range of situations.</p>
    <dl class="audience">
      ${audiences.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}
    </dl>
  </div>
</section>

<section class="section section--alt" aria-labelledby="work-title">
  <div class="container">
    <h2 id="work-title">Featured portfolio</h2>
    <p class="section-lede">Selected projects, with the thinking behind each one.</p>
    <ul class="cards cards--3">
      ${featured.map(projectCard).join('')}
    </ul>
    <p><a href="/portfolio/">Browse the full website design and development portfolio</a></p>
  </div>
</section>

<section class="section" aria-labelledby="why-title">
  <div class="container">
    <h2 id="why-title">Why Doyen</h2>
    <ul class="cards cards--4">
      ${why.map(([t, d]) => `<li class="card card--plain"><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}
    </ul>
  </div>
</section>

<section class="section section--dark" aria-labelledby="process-title">
  <div class="container">
    <h2 id="process-title">How projects work</h2>
    <ol class="steps">
      ${steps.map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}
    </ol>
  </div>
</section>

<section class="section" aria-labelledby="local-title">
  <div class="container narrow">
    <h2 id="local-title">Website Development in Jamshedpur &amp; Bangalore</h2>
    <p class="answer">${esc(NAME)} serves businesses in ${esc(cityPair)} and can work with clients beyond these locations.</p>
    <p>Working across two cities means understanding both an established industrial hub and a fast-moving startup ecosystem. Projects are run through video calls, messages and shared files, so clients elsewhere in India, or abroad, can work together just as smoothly. Meeting in person is possible where it is practical.</p>
    <p>Looking for local support? <a href="/contact/">Tell me about your business</a> or see <a href="/services/">how the website services are structured</a>.</p>
  </div>
</section>

<section class="section section--alt" aria-labelledby="faq-title">
  <div class="container narrow">
    <h2 id="faq-title">Frequently asked questions</h2>
    ${faqHtml(faqs)}
    <p><a href="/contact/">Ask about your project</a></p>
  </div>
</section>

${ctaBand('Ready to talk about your website?', 'Tell me about your business and what you need. You will get a clear, custom quote with no pressure.')}
`
  };
  pages.push(p);
}

function projectCard(pr) {
  return `<li class="card">
    <p class="tag">${esc(pr.category)}${pr.placeholder ? ' · <span class="badge">Placeholder</span>' : ''}</p>
    <h3><a href="/portfolio/${pr.slug}/">${esc(pr.name)}</a></h3>
    <p>${esc(pr.short)}</p>
    <p class="muted"><span class="sr-only">Services used: </span>${pr.services.map(esc).join(' · ')}</p>
    <a class="more" href="/portfolio/${pr.slug}/">View ${esc(pr.name)} project</a>
  </li>`;
}

// ABOUT
pages.push({
  path: '/about/',
  title: `${NAME} | About`,
  description: `Learn who ${NAME} is, who it works with and how projects run. Website development for startups and small businesses in ${cities[0]} and ${cities[1]}.`,
  h1: `About ${NAME}`,
  og: 'about',
  person: true,
  webPageType: 'AboutPage',
  crumbs: [{ name: 'Home', path: '/' }, { name: 'About', path: '/about/' }],
  body: `
<section class="page-head"><div class="container">
  ${breadcrumbHtml([{ name: 'Home', path: '/' }, { name: 'About', path: '/about/' }])}
  <h1>About ${esc(NAME)}</h1>
  <p class="answer">${esc(NAME)} is a website development and digital presence service focused on helping startups and small businesses build modern, fast, mobile-friendly and SEO-ready websites.</p>
</div></section>

<section class="section"><div class="container narrow prose">
  <h2>Who I am</h2>
  <p>I'm ${esc(cfg.founder?.name || 'the person behind Doyen')}, ${cfg.founder?.jobTitle ? 'the ' + esc(cfg.founder.jobTitle.toLowerCase()) + ' of ' : 'behind '}${esc(NAME)}. I design and build websites for people running real businesses, working directly with each client rather than passing projects between teams.</p>
  <p>${esc(NAME)} is based in ${esc(cityPair)}.</p>

  <h2>What I do</h2>
  <p>I build business websites, e-commerce websites and landing pages, and design the interfaces and experience behind them. I also help with branding and social media content so that a business looks consistent everywhere. <a href="/services/">Explore website development services</a> for the full breakdown.</p>

  <h2>Who I work with</h2>
  <p>Mostly startups, local businesses, professional services, D2C brands, e-commerce businesses and creators. What they share is that the website has to do real work: explain the offer, build trust and make it easy to get in touch.</p>

  <h2>My approach</h2>
  <p>I begin with the business, not the template. Before any design, we agree what the website must achieve, who it is for and what visitors should do next. Everything else follows from that.</p>

  <h2>How I think about websites</h2>
  <p>A website is a working part of a business, not a brochure. It should load quickly on a phone, say clearly what you do, and be easy to find and to act on. I avoid decoration that doesn't help a visitor and claims I can't back up.</p>

  <h2>How design, technology and business fit together</h2>
  <p>Design decides what people notice and understand. Technology decides how fast and reliably it works, and whether search engines can read it. Business goals decide what matters most. Good websites keep all three in balance, so I handle them together rather than as separate steps.</p>

  <h2 id="how-projects-work">How projects work</h2>
  <p>Projects move through six stages: discover, plan, design, develop, launch and improve. You review the work at each stage and agree the scope and quote before design begins.</p>
  <ol class="mini-steps">${steps.map(([t, d]) => `<li><strong>${esc(t)}.</strong> ${esc(d)}</li>`).join('')}</ol>
  <p>You can see examples of finished work in the <a href="/portfolio/">website design and development portfolio</a>.</p>

  <h2>Locations</h2>
  <p>${esc(NAME)} serves businesses in ${esc(cityPair)} and can work with clients beyond these locations. No physical office address is listed, and projects are managed online.</p>
</div></section>

<section class="section section--alt"><div class="container narrow">
  <h2>Quick answers about ${esc(NAME)}</h2>
  <div class="faq-item"><h3>Who is ${esc(NAME)}?</h3><p>${esc(NAME)} is a website development and digital presence service for startups and small businesses.</p></div>
  <div class="faq-item"><h3>What does ${esc(NAME)} do?</h3><p>It builds business websites, e-commerce websites and landing pages, and provides UI/UX design, SEO-ready development, branding and social media content.</p></div>
  <div class="faq-item"><h3>Where is ${esc(NAME)} located?</h3><p>It is based in ${esc(cityPair)}, India, and also works with clients elsewhere.</p></div>
  <div class="faq-item"><h3>Does ${esc(NAME)} work with small businesses?</h3><p>Yes. Startups and small businesses are the main focus.</p></div>
  <div class="faq-item"><h3>How can someone contact ${esc(NAME)}?</h3><p>Use the <a href="/contact/">contact form to start a project</a>. Email: ${emailHtml}. Phone: ${phoneHtml}.</p></div>
</div></section>

${ctaBand('Have a project in mind?', 'Share a few details and I will get back to you about the next step.')}
`
});

// SERVICES
{
  const projByCat = (cat) => projects.filter((p) => p.category === cat);
  const svcFaqItems = services.map((s) => [s.faq.q, s.faq.a]);
  const extraFaq = [faqs[1], faqs[2]].map(([q, a, more]) => [q, a, more]);
  const all = [...svcFaqItems, ...extraFaq];
  pages.push({
    path: '/services/',
    title: `Website Development & Digital Services | ${NAME}`,
    description: 'Two clear website service tiers for startups and small businesses: Website Essentials and Website Growth, covering business sites, e-commerce, landing pages and UI/UX.',
    h1: 'Website Development & Digital Services',
    og: 'services',
    webPageType: 'CollectionPage',
    crumbs: [{ name: 'Home', path: '/' }, { name: 'Services', path: '/services/' }],
    extraGraph: [
      ...services.map((s) => ({
        '@type': 'Service',
        '@id': url(`/services/#${s.slug}`),
        name: s.name,
        description: s.what,
        serviceType: s.name,
        provider: { '@id': ids.org },
        areaServed: [...cfg.locations.map((l) => ({ '@type': 'City', name: l.city })), { '@type': 'Country', name: 'India' }],
        audience: { '@type': 'Audience', audienceType: 'Startups and small businesses' }
      })),
      faqSchema(all, url('/services/'))
    ],
    body: `
<section class="page-head"><div class="container">
  ${breadcrumbHtml([{ name: 'Home', path: '/' }, { name: 'Services', path: '/services/' }])}
  <h1>Website Development &amp; Digital Services</h1>
  <p class="lede">${esc(NAME)} provides website development and digital presence services for startups and small businesses in ${esc(cityPair)} and beyond. Projects fit one of two tiers, with a custom quote for each.</p>
</div></section>

<section class="section" aria-labelledby="tiers-title"><div class="container">
  <h2 id="tiers-title">What is included in each service tier?</h2>
  <p class="answer">There are two service tiers: Website Essentials for establishing a professional online presence, and Website Growth for businesses that need stronger UX, e-commerce and conversion infrastructure. Pricing is custom and quoted per project.</p>
  <div class="tiers">
    <article class="tier" id="website-essentials" aria-labelledby="t1">
      <p class="tag">Tier 1</p>
      <h3 id="t1">Website Essentials</h3>
      <p><strong>Everything you need to establish a professional online presence.</strong></p>
      <p class="muted">For local businesses, small businesses, professionals, startups and service businesses.</p>
      <ul class="checks">${['Custom business website', 'Responsive design', 'Mobile-first development', 'SEO foundations', 'Contact forms', 'Analytics setup', 'Performance optimization', 'Basic conversion optimization', 'Social links', 'Deployment'].map((i) => `<li>${i}</li>`).join('')}</ul>
      ${btn('/contact/', 'Get a Custom Quote')}
    </article>
    <article class="tier tier--accent" id="website-growth" aria-labelledby="t2">
      <p class="tag">Tier 2</p>
      <h3 id="t2">Website Growth</h3>
      <p><strong>Everything in Website Essentials, plus stronger UX, commerce and search foundations.</strong></p>
      <p class="muted">For growing businesses, D2C brands, e-commerce businesses and anyone needing stronger UX and conversion infrastructure.</p>
      <ul class="checks">${['Everything in Website Essentials', 'Advanced UI/UX', 'E-commerce', 'Advanced landing pages', 'Conversion optimization', 'Advanced technical SEO foundations', 'Structured data', 'Analytics', 'Search Console setup', 'Performance optimization', 'Content architecture', 'Ongoing improvement recommendations'].map((i) => `<li>${i}</li>`).join('')}</ul>
      ${btn('/contact/', 'Get a Custom Quote')}
    </article>
  </div>
</div></section>

<section class="section section--alt" aria-labelledby="how-title"><div class="container narrow">
  <h2 id="how-title">How long do website projects take, and what technology is used?</h2>
  <p class="answer">Project length depends on scope, content readiness and how quickly feedback is given; a timeline is agreed before work begins.</p>
  <p>A focused landing page generally takes less time than a multi-page business website or a store with many products. Having your text, images and branding ready speeds things up.</p>
  <p>Technology is chosen to fit your needs rather than used by default. Depending on the project, this may include:</p>
  <ul>${cfg.platforms.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  <p>For the full process, see <a href="/about/#how-projects-work">how projects work</a>.</p>
</div></section>

<section class="section" aria-labelledby="each-title"><div class="container">
  <h2 id="each-title">Services in detail</h2>
  ${services
    .map((s) => {
      const related = projByCat(s.category);
      return `
  <article class="service" id="${s.slug}" aria-labelledby="h-${s.slug}">
    <h3 id="h-${s.slug}">${esc(s.name)}</h3>
    <div class="service-grid">
      <div>
        <h4>What it is</h4><p>${esc(s.what)}</p>
        <h4>Who it is for</h4><p>${esc(s.who)}</p>
        <h4>Why it matters</h4><p>${esc(s.why)}</p>
        <h4>How Doyen approaches it</h4><p>${esc(s.approach)}</p>
      </div>
      <div>
        <h4>What is included</h4>
        <ul class="checks">${s.included.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <h4>Related work</h4>
        <p>${related.length ? related.map((r) => `<a href="/portfolio/${r.slug}/">${esc(r.name)}</a>`).join(', ') : `<a href="/portfolio/">See the ${esc(s.category.toLowerCase())} portfolio</a>`}</p>
      </div>
    </div>
    <div class="faq-item"><h4>${esc(s.faq.q)}</h4><p><strong>${esc(s.faq.a.split('. ')[0].replace(/\.$/, ''))}.</strong>${s.faq.a.includes('. ') ? ' ' + esc(s.faq.a.split('. ').slice(1).join('. ')) : ''}</p></div>
    <p>${btn('/contact/', 'Get a Custom Quote')}</p>
  </article>`;
    })
    .join('')}
</div></section>

<section class="section section--alt" aria-labelledby="cost-title"><div class="container narrow">
  <h2 id="cost-title">Common questions about cost and timing</h2>
  ${faqHtml(extraFaq)}
</div></section>

${ctaBand('Not sure which tier fits?', 'Describe your business and goals and I will recommend a sensible starting point and quote.')}
`
  });
}

// PORTFOLIO index
pages.push({
  path: '/portfolio/',
  title: `Website Design & Development Portfolio | Doyen`,
  description: `Website design and development projects by ${NAME}: business websites, e-commerce, landing pages, UI/UX and branding, each explained in detail.`,
  ogTitle: `Website Design & Development Portfolio | ${NAME}`,
  h1: 'Website Design & Development Portfolio',
  og: 'portfolio',
  webPageType: 'CollectionPage',
  crumbs: [{ name: 'Home', path: '/' }, { name: 'Portfolio', path: '/portfolio/' }],
  body: `
<section class="page-head"><div class="container">
  ${breadcrumbHtml([{ name: 'Home', path: '/' }, { name: 'Portfolio', path: '/portfolio/' }])}
  <h1>Website Design &amp; Development Portfolio</h1>
  <p class="lede">Each project is explained in detail: the challenge, the decisions made and the outcome, without exaggerated claims.</p>
  <p class="muted">Categories: ${portfolioCategories.map(esc).join(' · ')}</p>
</div></section>
<section class="section"><div class="container">
  ${portfolioCategories
    .map((cat) => {
      const list = projects.filter((p) => p.category === cat);
      return list.length ? `<h2 id="${slugify(cat)}">${esc(cat)}</h2><ul class="cards cards--3">${list.map(projectCard).join('')}</ul>` : '';
    })
    .join('')}
  <p>Interested in something similar? <a href="/services/">See the website services and tiers</a> or <a href="/contact/">start a project</a>.</p>
</div></section>
${ctaBand('Want to see your project here?', 'Tell me what you are building and I will explain how I would approach it.')}
`
});

// PROJECT pages
for (const pr of projects) {
  const svc = services.find((s) => s.slug === pr.serviceSlug) || services[0];
  const pth = `/portfolio/${pr.slug}/`;
  const row = (t, v) => `<h2>${t}</h2><p>${esc(v)}</p>`;
  pages.push({
    path: pth,
    title: `${pr.name} | ${pr.category} | ${NAME}`,
    description: pr.placeholder ? `Placeholder project page for ${NAME}. Replace with real project details.` : pr.short.slice(0, 155),
    h1: pr.name,
    og: pr.placeholder ? 'portfolio' : `project-${pr.slug}`,
    noindex: !!pr.placeholder,
    ogType: 'article',
    crumbs: [{ name: 'Home', path: '/' }, { name: 'Portfolio', path: '/portfolio/' }, { name: pr.name, path: pth }],
    nav: '/portfolio/',
    extraGraph: [
      {
        '@type': 'CreativeWork',
        '@id': url(pth) + '#project',
        name: pr.name,
        description: pr.short,
        genre: pr.category,
        creator: { '@id': ids.org },
        about: pr.services.join(', ')
      }
    ],
    body: `
<section class="page-head"><div class="container">
  ${breadcrumbHtml([{ name: 'Home', path: '/' }, { name: 'Portfolio', path: '/portfolio/' }, { name: pr.name, path: pth }])}
  <p class="tag">${esc(pr.category)}</p>
  <h1>${esc(pr.name)}</h1>
  ${pr.placeholder ? '<p class="notice">Placeholder content. Replace this project in <code>data/projects.json</code> with real details and set <code>placeholder</code> to <code>false</code> to publish it. Do not add results you cannot verify.</p>' : ''}
  <dl class="facts">
    <div><dt>Client / business</dt><dd>${esc(pr.client)}</dd></div>
    <div><dt>Location</dt><dd>${esc(pr.location)}</dd></div>
    <div><dt>Services</dt><dd>${pr.services.map(esc).join(', ')}</dd></div>
    <div><dt>Technology / platform</dt><dd>${esc(pr.technology)}</dd></div>
  </dl>
</div></section>
<section class="section"><div class="container narrow prose">
  ${row('Overview', pr.overview)}
  ${row('Challenge', pr.challenge)}
  ${row('Objective', pr.objective)}
  ${row('Solution', pr.solution)}
  ${row('Design', pr.design)}
  ${row('Development', pr.development)}
  ${row('SEO and performance considerations', pr.seo)}
  <h2>Features</h2>
  <ul>${pr.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  ${row('Outcome', pr.outcome)}
  <h2>Gallery</h2>
  <div class="gallery">
    ${[1, 2, 3].map((n) => `<figure class="shot"><div class="shot-box" role="img" aria-label="Placeholder for ${esc(pr.name)} screenshot ${n}"></div><figcaption>Screenshot ${n}: add a descriptive caption</figcaption></figure>`).join('')}
  </div>
  <p>Related service: <a href="/services/#${svc.slug}">${esc(svc.name)}</a>. <a href="/portfolio/">Back to the portfolio</a>.</p>
</div></section>
${ctaBand('Planning something similar?', 'Share a few details about your project and I will explain how I would approach it.')}
`
  });
}

// CONTACT
pages.push({
  path: '/contact/',
  title: `Contact ${NAME} | Start a Project`,
  description: `Start your website project with ${NAME}. Share your business and goals and get a custom quote. Based in ${cities[0]} and ${cities[1]}, working across India.`,
  h1: 'Start Your Project',
  og: 'contact',
  webPageType: 'ContactPage',
  crumbs: [{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact/' }],
  body: `
<section class="page-head"><div class="container">
  ${breadcrumbHtml([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact/' }])}
  <h1>Start Your Project</h1>
  <p class="lede">Tell me about your business and what you need. I'll reply to discuss your goals and, if it is a good fit, send a custom quote. ${esc(NAME)} works with businesses in ${esc(cityPair)} and beyond.</p>
</div></section>
<section class="section"><div class="container contact-grid">
  <form class="form" id="contact-form" method="post" action="${esc(cfg.formAction || '#')}" data-email="${esc(cfg.email || '')}" data-configured="${cfg.formAction ? 'true' : 'false'}">
    <div class="field"><label for="name">Name <span class="req">(required)</span></label><input id="name" name="name" type="text" autocomplete="name" required></div>
    <div class="field"><label for="business">Business name</label><input id="business" name="business" type="text" autocomplete="organization"></div>
    <div class="field"><label for="email">Email <span class="req">(required)</span></label><input id="email" name="email" type="email" autocomplete="email" required></div>
    <div class="field"><label for="phone">Phone</label><input id="phone" name="phone" type="tel" autocomplete="tel"></div>
    <div class="field"><label for="website">Current website</label><input id="website" name="website" type="url" inputmode="url" autocomplete="url" placeholder="https://"></div>
    <div class="field"><label for="service">Service required</label>
      <select id="service" name="service"><option value="">Select a service</option>${services.map((s) => `<option>${esc(s.name)}</option>`).join('')}<option>Not sure yet</option></select></div>
    <div class="field"><label for="budget">Budget range</label>
      <select id="budget" name="budget"><option value="">Select a range</option>${cfg.budgetRanges.map((b) => `<option>${esc(b)}</option>`).join('')}</select></div>
    <div class="field"><label for="message">Project description <span class="req">(required)</span></label><textarea id="message" name="message" rows="6" required></textarea></div>
    <button class="btn btn--primary" type="submit">Send project details</button>
    <p id="form-status" class="form-status" role="status" aria-live="polite"></p>
  </form>
  <aside class="contact-side" aria-labelledby="direct-title">
    <h2 id="direct-title">Contact details</h2>
    <address>
      <p><strong>Email</strong><br>${emailHtml}</p>
      <p><strong>Phone</strong><br>${phoneHtml}</p>
      <p><strong>Locations</strong><br>${cities.map(esc).join(' and ')}, India</p>
    </address>
    <h2>What happens next?</h2>
    <p>I read every enquiry, reply to discuss your goals, and, if we are a fit, send a custom quote. See <a href="/services/">how the service tiers work</a> or <a href="/portfolio/">look at the portfolio</a> first.</p>
  </aside>
</div></section>
`
});

// 404, privacy, terms (noindex, excluded from sitemap)
const utility = (path_, title, h1, text, file) => ({ path: path_, file, title, description: text.replace(/<[^>]+>/g, '').slice(0, 155), h1, noindex: true, og: 'home', body: `<section class="page-head"><div class="container narrow"><h1>${esc(h1)}</h1><p class="lede">${text}</p></div></section>` });
pages.push(
  utility('/404.html', `Page not found | ${NAME}`, 'Page not found', `That page doesn't exist. Try the <a href="/">home page</a>, the <a href="/services/">services</a> or <a href="/contact/">get in touch</a>.`, '404.html'),
  utility('/privacy/', `Privacy Policy | ${NAME}`, 'Privacy Policy', 'Placeholder: replace this with your real privacy policy before launch, covering what the contact form and any analytics collect.'),
  utility('/terms/', `Terms | ${NAME}`, 'Terms', 'Placeholder: replace this with your real terms before launch.')
);

// ---------- write output ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const write = (rel, data) => {
  const f = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
};

for (const p of pages) {
  const rel = p.file || (p.path === '/' ? 'index.html' : path.join(p.path, 'index.html'));
  const html = layout(p).replace(/\b(href|src|action)="\/(?!\/)/g, `$1="${basePrefix}/`);
  write(rel, html);
}

// static assets
for (const f of ['styles.css', 'main.js']) fs.copyFileSync(path.join(ROOT, 'src', f), path.join(DIST, f));

// robots.txt
write(
  'robots.txt',
  `# Public pages are open to all legitimate crawlers.
User-agent: *
Allow: /

# Explicitly allowed so the site is eligible for ChatGPT Search discovery.
# (OAI-SearchBot is OpenAI's search crawler and is separate from GPTBot.)
User-agent: OAI-SearchBot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: ${url('/sitemap.xml')}
`
);

// sitemap.xml (indexable pages only; placeholder projects excluded automatically)
const indexable = pages.filter((p) => !p.noindex);
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${url(p.path)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`
);

// manifest
write(
  'site.webmanifest',
  JSON.stringify({ name: NAME, short_name: cfg.shortName, description: cfg.description, start_url: `${basePrefix}/`, display: 'browser', background_color: '#faf7f0', theme_color: cfg.themeColor, icons: [{ src: `${basePrefix}/icon-192.png`, sizes: '192x192', type: 'image/png' }, { src: `${basePrefix}/icon-512.png`, sizes: '512x512', type: 'image/png' }] }, null, 2)
);

// _headers (Netlify / Cloudflare Pages style caching + security basics)
write(
  '_headers',
  `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
/styles.css
  Cache-Control: public, max-age=31536000, immutable
/main.js
  Cache-Control: public, max-age=31536000, immutable
`
);

// icons + OG images
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1f2328"/><text x="32" y="45" font-family="Georgia,serif" font-size="40" font-weight="700" text-anchor="middle" fill="#faf7f0">D</text><circle cx="49" cy="46" r="5" fill="#8fe3c0"/></svg>`;
write('favicon.svg', faviconSvg);

const ogPages = [
  ['home', 'Websites Built Around Your Business.', `Website development for startups and small businesses`],
  ['about', `About ${NAME}`, 'Who I am and how projects work'],
  ['services', 'Website Development & Digital Services', 'Website Essentials and Website Growth'],
  ['portfolio', 'Website Design & Development Portfolio', 'Projects explained in detail'],
  ['contact', 'Start Your Project', 'Get a custom quote']
];
const wrap = (t, n) => {
  const words = t.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  lines.push(cur);
  return lines;
};
const ogSvg = (title, sub) => {
  const lines = wrap(title, 24).slice(0, 3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#faf7f0"/>
<rect x="0" y="0" width="24" height="630" fill="#8fe3c0"/>
<text x="90" y="110" font-family="Helvetica, Arial, sans-serif" font-size="28" letter-spacing="3" fill="#1f2328">${esc(NAME.toUpperCase())}</text>
${lines.map((l, i) => `<text x="90" y="${250 + i * 84}" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#1f2328">${esc(l)}</text>`).join('')}
<text x="90" y="${250 + lines.length * 84 + 20}" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="#4a5058">${esc(sub)}</text>
<rect x="90" y="540" width="14" height="14" rx="7" fill="#8fe3c0"/>
<text x="118" y="553" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#1f2328">${cities.map(esc).join(' | ')}</text>
</svg>`;
};
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { warnings.push('sharp not installed: PNG icons and OG images were not generated. Run npm install.'); }
if (sharp) {
  for (const [id, t, s] of ogPages) {
    await sharp(Buffer.from(ogSvg(t, s))).png().toFile(path.join(DIST, `og/${id}.png`).replace(/^/, '')).catch(async () => {
      fs.mkdirSync(path.join(DIST, 'og'), { recursive: true });
      await sharp(Buffer.from(ogSvg(t, s))).png().toFile(path.join(DIST, `og/${id}.png`));
    });
  }
  for (const [file, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    await sharp(Buffer.from(faviconSvg)).resize(size, size).png().toFile(path.join(DIST, file));
  }
}

console.log(`Built ${pages.length} pages (${indexable.length} indexable) -> dist/`);
warnings.forEach((w) => console.log('  ! ' + w));
