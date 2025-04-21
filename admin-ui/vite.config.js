import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    // 设置构建输出目录为Express静态文件目录
    outDir: path.resolve(__dirname, '../public/admin'),
    // 如果需要将资源文件放在子目录
    assetsDir: 'assets',
    // 生产环境移除console和debugger
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  // 开发时的代理设置，用于API请求转发
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Express服务器地址
        changeOrigin: true
      }
    }
  }
})