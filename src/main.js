/**
 * Vue 应用入口
 * 职责：创建 Vue 应用实例，注册 Pinia（状态管理）与 Router（路由）。
 * 说明：@import 引入全局样式；框架按需加载，避免打包体积过大。
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import { initErrorCapture, vueErrorHandler } from './utils/errorCapture'
import './assets/css/main.css'

// 前端可观测性：全局错误采集
initErrorCapture()

// 创建应用实例
const app = createApp(App)

// Vue 组件错误捕获
app.config.errorHandler = vueErrorHandler

// 创建 Pinia 实例并注册持久化插件（store 状态自动同步到 localStorage）
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)

// 挂载到 #app 节点
app.mount('#app')