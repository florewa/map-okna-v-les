import vue from '@vitejs/plugin-vue';
import path from 'path';
import { defineConfig } from 'vite';
import vueDevTools from 'vite-plugin-vue-devtools';
import zipPack from 'vite-plugin-zip-pack';
import svgLoader from 'vite-svg-loader';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    svgLoader({
      svgoConfig: {
        plugins: [
          {
            name: 'removeStyleElement',
          },
        ],
      },
    }),
    zipPack({
      outDir: '.',
      outFileName: 'dist.zip',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "@/shared/assets/styles/helpers" as *;',
      },
    },
  },
});
