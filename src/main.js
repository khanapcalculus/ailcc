import { createPinia } from 'pinia'
import { createApp } from 'vue'
import VueKonva from 'vue-konva'
import App from './App.vue'
import router from './router'

// Create pinia store
const pinia = createPinia()

// Create app instance
const app = createApp(App)

// Use plugins
app.use(pinia)
app.use(router)
app.use(VueKonva)

// Mount app
app.mount('#app')
