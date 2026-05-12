import '@/shared/assets/styles/main.scss';

import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import { queryClient } from '@/shared/api';
import { motionPlugin } from '@/shared/lib/motion';

import App from './App.vue';
import { router } from './router';

const app = createApp(App);

app
  .use(VueQueryPlugin, {
    enableDevtoolsV6Plugin: true,
    queryClient,
  })
  .use(motionPlugin)
  .use(router)
  .use(createPinia());

app.mount('#app');
