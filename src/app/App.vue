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

<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<style scoped></style>
