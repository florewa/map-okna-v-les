<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { INACTIVITY_TIMEOUT } from '@/shared/consts';
import { useInactivityStore } from '@/stores/useInactivityStore.ts';

const inactivityStore = useInactivityStore();

const route = useRoute();
const router = useRouter();

onMounted(() => {
  inactivityStore.init({
    timeout: INACTIVITY_TIMEOUT * 1000,
    ignoredPaths: ['/'],
    onInactivity: () => {
      router.push('/');
    },
  });
});

onBeforeUnmount(() => {
  inactivityStore.destroy();
});
</script>

<template>
  <main class="main">
    <RouterView v-slot="{ Component }">
      <template v-if="Component">
        <transition
          name="fade"
          mode="out-in"
        >
          <suspense>
            <component
              :is="Component"
              :key="route.fullPath"
            />
          </suspense>
        </transition>
      </template>
    </RouterView>
  </main>
</template>

<style scoped></style>
