<script setup lang="ts">
import { computed, ref } from 'vue';

import Legend from '@/shared/components/Legend.vue';
import Map from '@/shared/components/Map.vue';

const mapRef = ref<InstanceType<typeof Map> | null>(null);
const mapAreaRef = ref<HTMLElement | null>(null);

const isZoomInDisabled = computed(
  () => mapRef.value?.isZoomInDisabled ?? false,
);

const isZoomOutDisabled = computed(
  () => mapRef.value?.isZoomOutDisabled ?? true,
);

const zoomIn = () => mapRef.value?.zoomIn();
const zoomOut = () => mapRef.value?.zoomOut();

const handlePointClick = (id: string) => {
  console.log('Клик по точке:', id);
  // Логика при клике на прозрачные зоны объектов
};
</script>

<template>
  <div class="page">
    <Map
      ref="mapRef"
      :fit-area="mapAreaRef"
      @point-click="handlePointClick"
    />

    <div class="ui">
      <header class="top-bar">
        <img
          src="/images/logo.svg"
          alt=""
          class="logo"
        />
      </header>

      <div
        ref="mapAreaRef"
        class="map-area"
      ></div>

      <div class="bottom-area">
        <div class="controls">
          <button
            type="button"
            class="control-button"
            :disabled="isZoomInDisabled"
            @click="zoomIn"
          >
            <img
              src="/images/plus.svg"
              alt=""
            />
          </button>

          <button
            type="button"
            class="control-button"
            :disabled="isZoomOutDisabled"
            @click="zoomOut"
          >
            <img
              src="/images/minus.svg"
              alt=""
            />
          </button>
        </div>

        <Legend class="legend" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page {
  inline-size: 100%;
  block-size: 100dvh;
  background-image: url('/images/pattern.svg');
  background-repeat: repeat;
  background-position: center;
  background-size: 400px;
}
.ui {
  position: fixed;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}
.top-bar {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  padding-inline: 16px;
  pointer-events: auto;
}
.logo {
  display: block;
  width: clamp(189px, 22vw, 300px);
  height: auto;
  user-select: none;
  pointer-events: none;
}
.map-area {
  flex: 1;
  min-height: 0;
}
.bottom-area {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-inline: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  pointer-events: none;
}
.controls {
  position: absolute;
  right: 16px;
  bottom: calc(100% + 6px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: auto;
}
.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: #91b341;
  transition: opacity 0.2s ease;
  touch-action: manipulation;
  &:disabled {
    opacity: 0.5;
  }
  img {
    width: 20px;
    height: 20px;
    pointer-events: none;
    user-select: none;
  }
}
.legend {
  width: 100%;
  pointer-events: auto;
}
</style>
