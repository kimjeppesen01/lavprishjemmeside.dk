// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// PUBLIC_SITE_URL / PUBLIC_API_URL for multi-domain (default: lavprishjemmeside.dk)
const siteUrl = typeof process.env.PUBLIC_SITE_URL !== 'undefined' ? process.env.PUBLIC_SITE_URL : 'https://lavprishjemmeside.dk';

export default defineConfig({
  site: siteUrl,
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap({
    filter: (page) => !page.includes('/admin/') && !page.includes('/404')
  })]
});