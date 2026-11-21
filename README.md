# Doyen Website Developer

Portfolio and lead-generation website for Doyen Website Developer, a freelance website designer and developer in Bengaluru.

## Structure

```
src/index.html        Main site source (Home, Services, Live Projects, About, Contact in one file)
public/               Everything that gets served
  work/               Live project builds (noindex)
  assets/             Images, logo, mascot
  404.html, icons, og-image.jpg, site.webmanifest
tailwind/             Tailwind theme for each page
scripts/build.mjs     Build: CSS + one HTML file per URL + sitemap.xml + robots.txt
site.config.json      siteUrl (canonicals, social previews, sitemap, structured data)
vercel.json           Vercel settings, redirects and headers
```

## Deploy (Vercel)

Import the repo in Vercel. `vercel.json` sets everything: Vercel runs `npm ci` and `npm run build`, then serves `public/`.

## Local preview

```
npm ci
npm run build
npm start          # serves public/ at http://localhost:3000
```

## Editing

- Edit `src/index.html` (not `public/index.html`, which the build generates).
- Page titles and descriptions for `/services`, `/portfolio`, `/about` and `/contact` live in `scripts/build.mjs` and in the router inside `src/index.html`. Keep the two in sync.
- When you connect your own domain, change `siteUrl` in `site.config.json`, then redeploy.

## After the first deploy

1. Add the site to Google Search Console and Bing Webmaster Tools, and submit `/sitemap.xml`.
2. Link the site from your Google Business Profile.
