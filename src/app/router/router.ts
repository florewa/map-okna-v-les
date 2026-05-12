import { createRouter, createWebHistory } from 'vue-router';

import { HomePage } from '@/pages';

export const router = createRouter({
  history: createWebHistory(import.meta.env.API_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

router.beforeEach((_to, _from, next) => {
  next();
});
