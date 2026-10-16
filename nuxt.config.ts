// Vision Group CRM — Nuxt 4 front end.
// Every CRM file is prefixed crm-; framework-required names (this file, package.json) keep their names.
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // Internal staff tool: rendered in the browser, while the Nitro server keeps the
  // session and calls Strapi (backend-for-frontend). The Strapi JWT never reaches the browser.
  ssr: false,
  devtools: { enabled: false },
  // Port comes from PORT in .env (default 3000).
  // `npm run dev` uses it here; in production `npm start` loads .env and Nitro reads the same PORT.
  devServer: {
    port: Number(process.env.PORT) || 3879,
    host: process.env.HOST || 'localhost',
  },
  css: ['~/assets/crm-theme.css'],
  app: {
    head: {
      title: 'Vision Group CRM',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#16181D' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap' },
        { rel: 'icon', type: 'image/svg+xml', href: '/crm-icon.svg' },
      ],
    },
  },
  runtimeConfig: {
    // NUXT_STRAPI_URL — base URL of the existing Strapi CMS, e.g. https://cms.visiongroup.co.ug
    strapiUrl: 'https://cms-vgad.visiongroup.co.ug',
    // NUXT_CRM_SESSION_SECRET — at least 32 random characters; encrypts the session cookie
    crmSessionSecret: '7066433c8121d2ba1a41fbd9b51d687e05bf3aa74095f93675e5f3223a357d8e',
    // NUXT_CRM_GATEWAY_SECRET — 32+ characters, the SAME value as CRM_GATEWAY_SECRET in Strapi.
    // Server-only: vouches for the signed-in sales person when Nuxt calls the CMS.
    crmGatewaySecret: '7066433c8121d2ba1a41fbd9b51d687e05bf3aa74095f93675e5f3223a357d8e',
    // NUXT_VGAMS_MODULE — module name sent to /api/vgams-users/login (SFA sends 'sfa')
    vgamsModule: 'crm',
    public: { appName: 'Vision Group CRM' },
  },
  // All CRM data calls go through one server-side proxy that adds the signed-in sales person's identity.
  serverHandlers: [{ route: '/api/crm/**', handler: '~~/server/crm-proxy.ts' }],
  routeRules: { '/': { redirect: '/crm' } },
  typescript: { strict: true },
})