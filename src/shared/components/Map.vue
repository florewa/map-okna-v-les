<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import MapSvg from '@/shared/assets/images/map.svg?component';
import MapPin from '@/shared/components/MapPin.vue';

const props = defineProps<{
  fitArea?: HTMLElement | null;
}>();

const emit = defineEmits<{
  (e: 'point-click', pointId: string): void;
}>();

const MAP_WIDTH = 370;
const MAP_HEIGHT = 419;

const MAX_SCALE = 4;
const ZOOM_STEP = 0.4;
const EDGE_PADDING = 16;

/* =========================
   REAL ROAD SVG PATH
========================= */

const wrapperRef = ref<HTMLElement | null>(null);

const scale = ref(1);
const minScale = ref(1);

const translateX = ref(0);
const translateY = ref(0);

const areaRect = ref({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
});

const userLocation = ref({
  x: 311,
  y: 282,
});
const roadPathRef = ref<SVGPathElement | null>(null);

const ROAD_PATH = `
M311.196 282.174H227.424
H206.262
C206.262 291.552 198.66 299.154 189.282 299.154
H150.894
C141.516 299.154 133.914 291.552 133.914 282.174
C133.914 275.443 137.832 269.626 143.511 266.879
C145.744 265.8 148.248 265.195 150.894 265.195
H189.282
C198.66 265.195 206.262 272.797 206.262 282.174

C227.585 271.975 227.858 262.654 227.965 248.254

V218.686
V202.444
C227.734 198.251 227.606 195.144 227.424 193.586
C227.194 191.601 227.101 189.816 226.987 188.172
C226.491 181.046 225.952 176.283 214.736 169.962

H188.298
H174.171
H159.963
H144.988
H130.24
H123.825

C81.1052 159.134 74.8078 139.858 76.999 131.573

L75.837 137.233
L66.6811 176.606
L63.877 187.312

C60.7389 192.71 60.064 197.76 58.1214 207.12
C55.0728 222.921 51.0218 250.904 49.0956 282.174

H80.7608
H109.798
H133.914

M166.151 299.154
C165.166 300.548 160.688 306.635 147.695 318.84
C134.702 331.046 133.914 348.826 135.287 357.613

L136.99 373.593

H224.718

V354.622
V321.391

C222.995 318.93 215.552 305.601 202.362 293.002
`;

const isZoomInDisabled = computed(() => scale.value >= MAX_SCALE);

const isZoomOutDisabled = computed(() => scale.value <= minScale.value);

/* =========================
   MAP CONTROL
========================= */

const clampScale = (value: number) => {
  return Math.min(MAX_SCALE, Math.max(minScale.value, value));
};

const clampTranslate = (x: number, y: number, currentScale: number) => {
  const { left, top, width, height } = areaRect.value;

  const scaledWidth = MAP_WIDTH * currentScale;
  const scaledHeight = MAP_HEIGHT * currentScale;

  let minX: number;
  let maxX: number;

  let minY: number;
  let maxY: number;

  if (scaledWidth >= width) {
    minX = left + width - scaledWidth;
    maxX = left;
  } else {
    minX = left + (width - scaledWidth) / 2;
    maxX = minX;
  }

  if (scaledHeight >= height) {
    minY = top + height - scaledHeight;
    maxY = top;
  } else {
    minY = top + (height - scaledHeight) / 2;
    maxY = minY;
  }

  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  };
};

const fitMap = async () => {
  await nextTick();

  const area = props.fitArea;

  if (!area) return;

  const rect = area.getBoundingClientRect();

  areaRect.value = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };

  const fittedScale = Math.min(
    (rect.width - EDGE_PADDING * 2) / MAP_WIDTH,
    (rect.height - EDGE_PADDING * 2) / MAP_HEIGHT,
  );

  minScale.value = fittedScale;
  scale.value = fittedScale;

  const { x, y } = clampTranslate(0, 0, fittedScale);

  translateX.value = x;
  translateY.value = y;
};

const zoomTo = (nextScale: number, centerX: number, centerY: number) => {
  const clampedScale = clampScale(nextScale);

  const ratio = clampedScale / scale.value;

  const rawX = centerX - ratio * (centerX - translateX.value);

  const rawY = centerY - ratio * (centerY - translateY.value);

  const { x, y } = clampTranslate(rawX, rawY, clampedScale);

  translateX.value = x;
  translateY.value = y;

  scale.value = clampedScale;
};

defineExpose({
  isZoomInDisabled,
  isZoomOutDisabled,
});

/* =========================
   POINTER EVENTS
========================= */

const activePointers = new Map<number, { x: number; y: number }>();

let activePointerId: number | null = null;

let lastX = 0;
let lastY = 0;

const onPointerDown = (e: PointerEvent) => {
  const target = e.target as HTMLElement;

  if (target.closest('.map-hotspot')) {
    return;
  }

  activePointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
  });

  activePointerId = e.pointerId;

  lastX = e.clientX;
  lastY = e.clientY;

  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};

const onPointerMove = (e: PointerEvent) => {
  if (activePointerId !== e.pointerId) return;

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;

  const rawX = translateX.value + dx;
  const rawY = translateY.value + dy;

  const { x, y } = clampTranslate(rawX, rawY, scale.value);

  translateX.value = x;
  translateY.value = y;

  lastX = e.clientX;
  lastY = e.clientY;
};

const onPointerUp = (e: PointerEvent) => {
  activePointers.delete(e.pointerId);

  activePointerId = null;
};

const onWheel = (e: WheelEvent) => {
  e.preventDefault();

  const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;

  zoomTo(scale.value + delta, e.clientX, e.clientY);
};

/* =========================
   POINTS
========================= */

const mapPoints = [
  { id: 'zone-parking', x: 302, y: 245, width: 68, height: 74 },

  { id: 'zone-1', x: 236.42, y: 221.33, width: 17.95, height: 17.95 },
  { id: 'zone-2', x: 236.42, y: 193.29, width: 17.95, height: 17.95 },
  { id: 'zone-3', x: 200.53, y: 179.83, width: 17.95, height: 17.95 },
  { id: 'zone-4', x: 197.16, y: 209.0, width: 17.95, height: 17.95 },
  { id: 'zone-5', x: 188.94, y: 238.53, width: 17.95, height: 17.95 },

  { id: 'zone-6', x: 237.92, y: 312.39, width: 17.95, height: 17.95 },
  { id: 'zone-7', x: 237.92, y: 346.21, width: 17.95, height: 17.95 },
  { id: 'zone-8', x: 237.92, y: 385.09, width: 17.95, height: 17.95 },
  { id: 'zone-9', x: 191.93, y: 385.09, width: 17.95, height: 17.95 },
  { id: 'zone-10', x: 191.93, y: 346.21, width: 17.95, height: 17.95 },
  { id: 'zone-11', x: 191.93, y: 312.39, width: 17.95, height: 17.95 },

  { id: 'zone-12', x: 100.7, y: 291.62, width: 17.95, height: 17.95 },
  { id: 'zone-13', x: 64.81, y: 291.62, width: 17.95, height: 17.95 },
  { id: 'zone-14', x: 71.92, y: 256.48, width: 17.95, height: 17.95 },
  { id: 'zone-15', x: 113.79, y: 247.51, width: 17.95, height: 17.95 },

  { id: 'zone-16', x: 231.94, y: 142.82, width: 17.95, height: 17.95 },
  { id: 'zone-17', x: 205.76, y: 142.82, width: 17.95, height: 17.95 },
  { id: 'zone-18', x: 178.84, y: 142.82, width: 17.95, height: 17.95 },
  { id: 'zone-19', x: 150.06, y: 142.82, width: 17.95, height: 17.95 },
  { id: 'zone-20', x: 120.15, y: 142.82, width: 17.95, height: 17.95 },

  { id: 'zone-21', x: 47.99, y: 126.0, width: 17.95, height: 17.95 },
  { id: 'zone-22', x: 39.01, y: 167.12, width: 17.95, height: 17.95 },
  { id: 'zone-23', x: 106.69, y: 179.83, width: 17.95, height: 17.95 },
  { id: 'zone-24', x: 135.85, y: 179.83, width: 17.95, height: 17.95 },
  { id: 'zone-25', x: 165.01, y: 179.83, width: 17.95, height: 17.95 },

  { id: 'zone-26', x: 261.1, y: 143.94, width: 17.95, height: 17.95 },
  { id: 'zone-27', x: 290.26, y: 151.79, width: 17.95, height: 17.95 },
  { id: 'zone-28', x: 274.93, y: 185.07, width: 17.95, height: 17.95 },

  {
    id: 'zone-terrace',
    x: 58.83,
    y: 321.16,
    width: 57.48,
    height: 31.48,
  },

  {
    id: 'zone-sport',
    x: 0,
    y: 307.39,
    width: 28,
    height: 28,
  },

  {
    id: 'zone-playground',
    x: 0,
    y: 256.39,
    width: 28,
    height: 28,
  },

  {
    id: 'zone-reception',
    x: 217,
    y: 286.39,
    width: 75.47,
    height: 19.48,
  },

  {
    id: 'zone-restaurant',
    x: 99,
    y: 399.391,
    width: 77.469,
    height: 19.477,
  },
];
/* =========================
   ROUTE BUILDER
========================= */

const routeStart = ref(0);
const routeEnd = ref(0);
const totalRoadLength = ref(0);

const routeStyle = computed(() => {
  const visibleLength = routeEnd.value - routeStart.value;

  return {
    strokeDasharray: `${visibleLength} ${totalRoadLength.value}`,
    strokeDashoffset: `${-routeStart.value}`,
  };
});

const buildRoute = async (targetX: number, targetY: number) => {
  await nextTick();

  const road = roadPathRef.value;

  if (!road) return;

  const totalLength = road.getTotalLength();

  totalRoadLength.value = totalLength;

  let startLength = 0;
  let endLength = 0;

  let minStartDistance = Infinity;
  let minEndDistance = Infinity;

  for (let i = 0; i <= totalLength; i += 1) {
    const point = road.getPointAtLength(i);

    const startDist = Math.hypot(
      point.x - userLocation.value.x,
      point.y - userLocation.value.y,
    );

    const endDist = Math.hypot(point.x - targetX, point.y - targetY);

    if (startDist < minStartDistance) {
      minStartDistance = startDist;
      startLength = i;
    }

    if (endDist < minEndDistance) {
      minEndDistance = endDist;
      endLength = i;
    }
  }

  if (endLength < startLength) {
    [startLength, endLength] = [endLength, startLength];
  }

  routeStart.value = startLength;
  routeEnd.value = endLength;
};

const handlePinClick = async (id: string) => {
  emit('point-click', id);

  const point = mapPoints.find((p) => p.id === id);

  if (!point) return;

  await buildRoute(point.x + point.width / 2, point.y + point.height / 2);
};

/* =========================
   INIT
========================= */

let resizeObserver: ResizeObserver | null = null;

watch(
  () => props.fitArea,
  (element) => {
    resizeObserver?.disconnect();

    if (!element) return;

    resizeObserver = new ResizeObserver(() => {
      fitMap();
    });

    resizeObserver.observe(element);
  },
  {
    immediate: true,
  },
);

onMounted(async () => {
  await fitMap();

  window.addEventListener('resize', fitMap);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', fitMap);

  resizeObserver?.disconnect();
});
</script>

<template>
  <Teleport to="body">
    <div
      ref="wrapperRef"
      class="map-canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
    >
      <div
        class="map"
        :style="{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        }"
      >
        <MapSvg class="map-image" />

        <div
          v-for="point in mapPoints"
          :key="point.id"
          class="map-hotspot"
          :style="{
            left: `${point.x}px`,
            top: `${point.y}px`,
            width: `${point.width}px`,
            height: `${point.height}px`,
          }"
          @click.stop="handlePinClick(point.id)"
        ></div>

        <svg
          class="map-overlay-svg"
          viewBox="0 0 370 419"
        >
          <path
            ref="roadPathRef"
            :d="ROAD_PATH"
            class="real-road-path"
          />
          <path
            v-if="routeEnd > routeStart"
            :d="ROAD_PATH"
            class="navigation-route"
            :style="routeStyle"
          />
        </svg>

        <div
          class="user-pin"
          :style="{
            left: `${userLocation.x}px`,
            top: `${userLocation.y}px`,
          }"
        >
          <MapPin />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
$map-width: 370px;
$map-height: 419px;

.map-canvas {
  position: fixed;
  inset: 0;

  overflow: hidden;

  touch-action: none;
}

.map {
  position: absolute;

  top: 0;
  left: 0;

  width: $map-width;
  height: $map-height;

  transform-origin: top left;

  isolation: isolate;
}

.map-image {
  display: block;

  width: 100%;
  height: 100%;

  pointer-events: none;
  user-select: none;

  * {
    pointer-events: none;
  }
}

.map-overlay-svg {
  position: absolute;
  inset: 0;

  width: 100%;
  height: 100%;

  pointer-events: none;

  z-index: 5;
}

.real-road-path {
  fill: none;

  stroke: transparent;

  stroke-width: 20;

  pointer-events: none;
}

.navigation-route {
  fill: none;

  stroke: #91b341;
  stroke-width: 4;

  stroke-linecap: round;
  stroke-linejoin: round;

  filter: drop-shadow(0 0 8px rgba(145, 179, 65, 0.5));
}

@keyframes drawRoute {
  to {
    stroke-dashoffset: 0;
  }
}

.map-hotspot {
  position: absolute;

  z-index: 50;

  touch-action: manipulation;

  &::before {
    content: '';

    position: absolute;

    inset: -16px;
  }
}

.user-pin {
  position: absolute;

  z-index: 30;

  transform: translate(-50%, -100%);

  pointer-events: none;
}
</style>
