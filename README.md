# Doyen Website Developer: website

[Live site](https://guy-d7.github.io/doyen-website-developer/)

Static site, no runtime dependencies (JS ≈ 1.7 KB, CSS ≈ 11 KB). Deploy the `dist/` folder to Netlify, Vercel, Cloudflare Pages or any static host.

```
npm install        # only needed for PNG icons / OG images (sharp)
npm run build      # generates dist/
npm run audit      # 700+ automated checks against the brief
```

## Before launch (all values are editable in `site.config.json`)
1. `siteUrl`: your real domain (canonicals, sitemap, robots.txt and schema all read this).
2. `email`, `phone`: currently shown as highlighted placeholders. Nothing is invented.
3. `formAction`: a form endpoint (Formspree, Netlify Forms, etc.). Until set, the form opens the visitor's email app.
4. `socialProfiles`: `[{ "name": "LinkedIn", "url": "https://..." }]`. Real profiles only; they feed `sameAs`.
5. Replace the 3 placeholder projects in `data/projects.json`, then set `"placeholder": false`. Real project pages become indexable and join the sitemap automatically.
6. Replace `/privacy/` and `/terms/` placeholder text.
7. Submit `sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Files
- `content.mjs`: all page copy (services, FAQs, process, audiences)
- `build.mjs`: layout, metadata, JSON-LD, sitemap, robots, OG images
- `src/styles.css`, `src/main.js`: design system and minimal JS
- Future `/blog`, `/resources`, `/guides`: add pages to the `pages` array in `build.mjs`; topic list is in `content.mjs` (`futureTopics`).

## Notes
- Schema uses Organization (not LocalBusiness: no address/office exists), WebSite, Person, WebPage, BreadcrumbList, Service, FAQPage (only where the FAQ is visible) and CreativeWork.
- robots.txt explicitly allows OAI-SearchBot, Googlebot and Bingbot; no GPTBot rule is added.
- No rankings, results, prices, reviews or credentials are claimed anywhere.
