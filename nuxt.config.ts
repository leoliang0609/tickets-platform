export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Tickets Platform',
      htmlAttrs: { lang: 'zh-Hant' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  }
})
