import { createPinia } from 'pinia'
import SshPre from 'simple-syntax-highlighter'
import { createApp } from 'vue'
import WaveUI from 'wave-ui'
import Alert from '@/documentation/components/alert.vue'
import Example from '@/documentation/components/example.vue'
import TitleLink from '@/documentation/components/title-link.vue'
import App from './app.vue'
import router from './router'
import 'wave-ui/dist/wave-ui.css'
import 'simple-syntax-highlighter/dist/sshpre.css'

import '@mdi/font/css/materialdesignicons.min.css'

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)
app.use(WaveUI, {
  colors: {
    light: {
      primary: '#3f73a6',
      secondary: '#2c3e50',
      lightgrey: '#eee',
    },
    dark: {
      primary: '#82afc9',
      secondary: '#fff',
      lightgrey: '#444',
    },
  },
  theme: 'auto',
})

app.component('TitleLink', TitleLink)
app.component('Example', Example)
app.component('SshPre', SshPre)
app.component('Alert', Alert)

app.mount('#app')
