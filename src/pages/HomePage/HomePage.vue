<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import Legend from '@/shared/components/Legend.vue';
import Map from '@/shared/components/Map.vue';
import Modal from '@/shared/components/Modal.vue';

interface ZoneData {
  title: string;
  description: string;
  images: string[];
}

const mapRef = ref<InstanceType<typeof Map> | null>(null);
const mapAreaRef = ref<HTMLElement | null>(null);
const legendComp = ref<InstanceType<typeof Legend> | null>(null);
const legendOpen = ref(false);
const floatOffset = ref(0);

watch(legendOpen, async (open) => {
  if (open) {
    await nextTick();
    floatOffset.value = (legendComp.value?.legendRef?.offsetHeight ?? 0) + 8;
  } else {
    floatOffset.value = 0;
  }
});

const floatStyle = computed(() => ({
  transform: floatOffset.value ? `translateY(-${floatOffset.value}px)` : '',
  transition: 'transform 0.3s ease-out',
}));

const resetWayStyle = computed(() => ({
  transform: floatOffset.value
    ? `translateX(-50%) translateY(-${floatOffset.value}px)`
    : 'translateX(-50%)',
  transition: 'transform 0.3s ease-out',
}));

const isZoomInDisabled = computed(
  () => mapRef.value?.isZoomInDisabled ?? false,
);

const isZoomOutDisabled = computed(
  () => mapRef.value?.isZoomOutDisabled ?? true,
);

const hasRoute = computed(() => mapRef.value?.hasRoute ?? false);

const zoomIn = () => mapRef.value?.zoomIn();
const zoomOut = () => mapRef.value?.zoomOut();
const resetRoute = () => mapRef.value?.resetRoute();

const zonesData = ref<Record<string, ZoneData>>({});
const activeZone = ref<ZoneData | null>(null);
const activeZoneId = ref<string | null>(null);

onMounted(async () => {
  const res = await fetch('/data.json');
  const json = await res.json();
  zonesData.value = json.zones ?? json;
});

const handlePointClick = (id: string) => {
  const zone = zonesData.value[id];
  if (zone) activeZone.value = zone;
  activeZoneId.value = id;
};

const closeModal = () => {
  activeZone.value = null;
};

const handleBuildRoute = () => {
  const zoneId = activeZoneId.value;
  closeModal();
  if (zoneId) {
    setTimeout(() => mapRef.value?.buildRouteTo(zoneId), 300);
  }
};
</script>

<template>
  <div class="page">
    <Map
      ref="mapRef"
      :fit-area="mapAreaRef"
      @point-click="handlePointClick"
    />

    <Modal
      :visible="!!activeZone"
      :title="activeZone?.title ?? ''"
      :description="activeZone?.description ?? ''"
      :images="activeZone?.images ?? []"
      @close="closeModal"
      @route="handleBuildRoute"
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
        <div
          class="controls"
          :style="floatStyle"
        >
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
        </div>

        <Transition name="reset-way-anim">
          <button
            v-if="hasRoute"
            class="reset-way"
            :style="resetWayStyle"
            @click="resetRoute"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clip-path="url(#clip0_98_2141)">
                <path
                  d="M3.00003 2.99997L11.0001 11M3.00003 11L11.0001 2.99997"
                  stroke="white"
                  stroke-width="1.61626"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_98_2141">
                  <rect
                    width="14"
                    height="14"
                    fill="white"
                  />
                </clipPath>
              </defs>
            </svg>
            <span> Сбросить маршрут </span>
          </button>
        </Transition>

        <Legend
          ref="legendComp"
          v-model="legendOpen"
          class="legend"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page {
  inline-size: 100%;
  block-size: 100dvh;
  user-select: none;
  -webkit-user-select: none;
}
.ui {
  position: fixed;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}
.top-bar {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  padding-inline: 20px;
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
  pointer-events: none;
}
.bottom-area {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-inline: 16px;
  padding-bottom: 8px;
  pointer-events: none;
}
.controls {
  position: absolute;
  right: 16px;
  bottom: calc(100% + 10px);
  display: flex;
  gap: 8px;
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

.reset-way {
  position: absolute;
  bottom: 20px;
  left: 50%;
  border-radius: 12px;
  padding: 10px;
  background: #91b341;
  font-weight: 600;
  font-size: 12px;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  pointer-events: auto;
  touch-action: manipulation;
  white-space: nowrap;
}

.reset-way-anim-enter-active,
.reset-way-anim-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.reset-way-anim-enter-from,
.reset-way-anim-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
