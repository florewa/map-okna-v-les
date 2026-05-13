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
const DRAG_THRESHOLD = 5;

const wrapperRef = ref<HTMLElement | null>(null);

const scale = ref(1);
const minScale = ref(1);

const translateX = ref(0);
const translateY = ref(0);

const isDragging = ref(false);

const areaRect = ref({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
});

const getInitialUserLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const x = parseFloat(params.get('x') ?? '');
  const y = parseFloat(params.get('y') ?? '');
  if (!isNaN(x) && !isNaN(y)) return { x, y };
  return { x: 300, y: 295 };
};

const userLocation = ref(getInitialUserLocation());

/* =========================
   GRAPH + DIJKSTRA
========================= */

interface GraphNode {
  id: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

// Узлы графа — ключевые перекрестки и изгибы дорог (масштаб 370x419)
const GRAPH_NODES: GraphNode[] = [
  // --- Основные дороги и перекрестки ---
  { id: 'parking', x: 311, y: 282 },
  { id: 'junc_rec', x: 227, y: 282 }, // Перекресток у ресепшена
  { id: 'loop_split_r', x: 206, y: 282 }, // Развилка кольца справа
  { id: 'loop_top', x: 170, y: 265 }, // Верхняя часть кольца
  { id: 'loop_bot', x: 170, y: 299 }, // Нижняя часть кольца
  { id: 'loop_split_l', x: 133, y: 282 }, // Развилка кольца слева
  { id: 'junc_top_r', x: 227, y: 170 }, // Перекресток сверху справа
  { id: 'junc_top_l', x: 130, y: 170 }, // Перекресток сверху слева
  { id: 'junc_bot_l', x: 80, y: 282 }, // Дорога влево от кольца
  { id: 'junc_terrace', x: 49, y: 282 }, // Поворот у террасы вниз

  // Дорога к ресторану
  { id: 'corner_rest_1', x: 51, y: 369 },
  { id: 'corner_rest_2', x: 79, y: 391 },
  { id: 'end_rest', x: 137, y: 390 },

  // Дорога к пруду
  { id: 'start_pond', x: 123, y: 170 },
  { id: 'junc_pond', x: 76, y: 131 },
  { id: 'end_pond', x: 85, y: 90 },

  // Верхняя дорога и дома справа
  { id: 'top_right_end', x: 283, y: 174 },
  { id: 'top_houses', x: 188, y: 169 },
  { id: 'v_right_mid', x: 224, y: 340 },
  { id: 'v_right_bot', x: 224, y: 373 },

  // --- Координаты самих зон (точки старта/финиша) ---
  { id: 'z_parking', x: 336, y: 282 },
  { id: 'z_reception', x: 254, y: 296 },
  { id: 'z_restaurant', x: 137, y: 409 },
  { id: 'z_terrace', x: 87, y: 336 },
  { id: 'z_sport', x: 14, y: 321 },
  { id: 'z_playground', x: 14, y: 270 },
  { id: 'z_pond', x: 96, y: 56 },

  { id: 'z_1', x: 245, y: 230 },
  { id: 'z_2', x: 245, y: 202 },
  { id: 'z_3', x: 209, y: 188 },
  { id: 'z_4', x: 206, y: 218 },
  { id: 'z_5', x: 198, y: 247 },
  { id: 'z_6', x: 246, y: 321 },
  { id: 'z_7', x: 246, y: 355 },
  { id: 'z_8', x: 246, y: 394 },
  { id: 'z_9', x: 200, y: 394 },
  { id: 'z_10', x: 200, y: 355 },
  { id: 'z_11', x: 200, y: 321 },
  { id: 'z_12', x: 109, y: 300 },
  { id: 'z_13', x: 73, y: 300 },
  { id: 'z_14', x: 80, y: 265 },
  { id: 'z_15', x: 122, y: 256 },
  { id: 'z_16', x: 240, y: 151 },
  { id: 'z_17', x: 214, y: 151 },
  { id: 'z_18', x: 187, y: 151 },
  { id: 'z_19', x: 159, y: 151 },
  { id: 'z_20', x: 129, y: 151 },
  { id: 'z_21', x: 56, y: 135 },
  { id: 'z_22', x: 48, y: 176 },
  { id: 'z_23', x: 115, y: 188 },
  { id: 'z_24', x: 144, y: 188 },
  { id: 'z_25', x: 174, y: 188 },
  { id: 'z_26', x: 270, y: 152 },
  { id: 'z_27', x: 299, y: 160 },
  { id: 'z_28', x: 283, y: 194 },
];

// Рёбра графа — соединения между узлами
const GRAPH_EDGES: GraphEdge[] = [
  // Основные дороги
  { from: 'parking', to: 'junc_rec' },
  { from: 'junc_rec', to: 'loop_split_r' },
  { from: 'loop_split_r', to: 'loop_top' },
  { from: 'loop_split_r', to: 'loop_bot' },
  { from: 'loop_top', to: 'loop_split_l' },
  { from: 'loop_bot', to: 'loop_split_l' },
  { from: 'loop_split_l', to: 'junc_bot_l' },
  { from: 'junc_bot_l', to: 'junc_terrace' },

  // Дорога к ресторану
  { from: 'junc_terrace', to: 'corner_rest_1' },
  { from: 'corner_rest_1', to: 'corner_rest_2' },
  { from: 'corner_rest_2', to: 'end_rest' },

  // Вертикаль к ресепшену и верхнему ряду
  { from: 'junc_rec', to: 'junc_top_r' },

  // Верхняя дорога
  { from: 'junc_top_r', to: 'top_right_end' },
  { from: 'junc_top_r', to: 'top_houses' },
  { from: 'top_houses', to: 'junc_top_l' },

  // Дорога к пруду
  { from: 'junc_top_l', to: 'start_pond' },
  { from: 'start_pond', to: 'junc_pond' },
  { from: 'junc_pond', to: 'end_pond' },

  // Дома 6-11 (справа внизу)
  { from: 'junc_rec', to: 'v_right_mid' },
  { from: 'v_right_mid', to: 'v_right_bot' },

  // --- Привязка зон к дорогам ---
  { from: 'z_parking', to: 'parking' },
  { from: 'z_reception', to: 'junc_rec' },
  { from: 'z_restaurant', to: 'end_rest' },
  { from: 'z_terrace', to: 'corner_rest_1' },
  { from: 'z_sport', to: 'junc_terrace' },
  { from: 'z_playground', to: 'junc_terrace' },
  { from: 'z_pond', to: 'end_pond' },

  { from: 'z_1', to: 'junc_top_r' },
  { from: 'z_2', to: 'junc_top_r' },
  { from: 'z_3', to: 'junc_top_r' },
  { from: 'z_4', to: 'junc_rec' },
  { from: 'z_5', to: 'loop_split_r' },
  { from: 'z_6', to: 'v_right_mid' },
  { from: 'z_7', to: 'v_right_mid' },
  { from: 'z_8', to: 'v_right_bot' },
  { from: 'z_9', to: 'v_right_bot' },
  { from: 'z_10', to: 'v_right_mid' },
  { from: 'z_11', to: 'v_right_mid' },
  { from: 'z_12', to: 'junc_bot_l' },
  { from: 'z_13', to: 'junc_bot_l' },
  { from: 'z_14', to: 'junc_bot_l' },
  { from: 'z_15', to: 'loop_split_l' },
  { from: 'z_16', to: 'junc_top_r' },
  { from: 'z_17', to: 'top_houses' },
  { from: 'z_18', to: 'top_houses' },
  { from: 'z_19', to: 'top_houses' },
  { from: 'z_20', to: 'junc_top_l' },
  { from: 'z_21', to: 'junc_pond' },
  { from: 'z_22', to: 'start_pond' },
  { from: 'z_23', to: 'junc_top_l' },
  { from: 'z_24', to: 'top_houses' },
  { from: 'z_25', to: 'top_houses' },
  { from: 'z_26', to: 'top_right_end' },
  { from: 'z_27', to: 'top_right_end' },
  { from: 'z_28', to: 'top_right_end' },
];

// Сопоставление id зоны → id узла графа
const ZONE_TO_NODE: Record<string, string> = {
  'zone-1': 'z_1',
  'zone-2': 'z_2',
  'zone-3': 'z_3',
  'zone-4': 'z_4',
  'zone-5': 'z_5',
  'zone-6': 'z_6',
  'zone-7': 'z_7',
  'zone-8': 'z_8',
  'zone-9': 'z_9',
  'zone-10': 'z_10',
  'zone-11': 'z_11',
  'zone-12': 'z_12',
  'zone-13': 'z_13',
  'zone-14': 'z_14',
  'zone-15': 'z_15',
  'zone-16': 'z_16',
  'zone-17': 'z_17',
  'zone-18': 'z_18',
  'zone-19': 'z_19',
  'zone-20': 'z_20',
  'zone-21': 'z_21',
  'zone-22': 'z_22',
  'zone-23': 'z_23',
  'zone-24': 'z_24',
  'zone-25': 'z_25',
  'zone-26': 'z_26',
  'zone-27': 'z_27',
  'zone-28': 'z_28',
  'zone-parking': 'z_parking',
  'zone-terrace': 'z_terrace',
  'zone-sport': 'z_sport',
  'zone-playground': 'z_playground',
  'zone-reception': 'z_reception',
  'zone-restaurant': 'z_restaurant',
  'zone-pond': 'z_pond',
};

// Начальный узел = парковка (где стоит пользователь)
const USER_NODE_ID = 'parking';

function dist(a: GraphNode, b: GraphNode): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dijkstra(startId: string, endId: string): string[] {
  const nodeMap = new Map<string, GraphNode>();
  GRAPH_NODES.forEach((n) => nodeMap.set(n.id, n));

  // Строим adjacency list (двунаправленный граф)
  const adj = new Map<string, { id: string; weight: number }[]>();
  GRAPH_NODES.forEach((n) => adj.set(n.id, []));
  GRAPH_EDGES.forEach((e) => {
    const a = nodeMap.get(e.from);
    const b = nodeMap.get(e.to);
    if (!a || !b) return;
    const w = dist(a, b);
    adj.get(e.from)!.push({ id: e.to, weight: w });
    adj.get(e.to)!.push({ id: e.from, weight: w });
  });

  // Дейкстра (простая реализация через Set)
  const distances = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const unvisited = new Set<string>();

  GRAPH_NODES.forEach((n) => {
    distances.set(n.id, Infinity);
    prev.set(n.id, null);
    unvisited.add(n.id);
  });
  distances.set(startId, 0);

  while (unvisited.size > 0) {
    // Ближайший непосещённый
    let u = '';
    let minDist = Infinity;
    unvisited.forEach((id) => {
      const d = distances.get(id) ?? Infinity;
      if (d < minDist) {
        minDist = d;
        u = id;
      }
    });

    if (!u || u === endId) break;
    unvisited.delete(u);

    const neighbors = adj.get(u) ?? [];
    for (const { id: v, weight } of neighbors) {
      if (!unvisited.has(v)) continue;
      const alt = (distances.get(u) ?? Infinity) + weight;
      if (alt < (distances.get(v) ?? Infinity)) {
        distances.set(v, alt);
        prev.set(v, u);
      }
    }
  }

  // Восстанавливаем путь
  const path: string[] = [];
  let cur: string | null = endId;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  if (path[0] !== startId) return []; // Нет пути
  return path;
}

/* =========================
   ROUTE STATE
========================= */

const routePath = ref<{ x: number; y: number }[]>([]);

const routePolylinePoints = computed(() =>
  routePath.value.map((p) => `${p.x},${p.y}`).join(' '),
);

const hasRoute = computed(() => routePath.value.length >= 2);

const buildRouteTo = (zoneId: string) => {
  const targetNodeId = ZONE_TO_NODE[zoneId];
  if (!targetNodeId) return;

  const nodeIds = dijkstra(USER_NODE_ID, targetNodeId);
  if (!nodeIds.length) return;

  const nodeMap = new Map<string, GraphNode>();
  GRAPH_NODES.forEach((n) => nodeMap.set(n.id, n));

  routePath.value = nodeIds
    .map((id) => nodeMap.get(id))
    .filter((n): n is GraphNode => !!n)
    .map((n) => ({ x: n.x, y: n.y }));
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

  { id: 'zone-terrace', x: 58.83, y: 321.16, width: 57.48, height: 31.48 },
  { id: 'zone-sport', x: 0, y: 307.39, width: 28, height: 28 },
  { id: 'zone-playground', x: 0, y: 256.39, width: 28, height: 28 },
  { id: 'zone-reception', x: 217, y: 286.39, width: 75.47, height: 19.48 },
  { id: 'zone-restaurant', x: 99, y: 399.39, width: 77.47, height: 19.48 },
  { id: 'zone-pond', x: 56, y: 2, width: 80, height: 96 },
];

/* =========================
   MAP CONTROL
========================= */

const clampScale = (value: number) =>
  Math.min(MAX_SCALE, Math.max(minScale.value, value));

const clampTranslate = (x: number, y: number, currentScale: number) => {
  const { left, top, width, height } = areaRect.value;

  const scaledWidth = MAP_WIDTH * currentScale;
  const scaledHeight = MAP_HEIGHT * currentScale;

  let minX: number, maxX: number, minY: number, maxY: number;

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

const zoomAtCenter = (delta: number) => {
  const { left, top, width, height } = areaRect.value;
  zoomTo(scale.value + delta, left + width / 2, top + height / 2);
};

defineExpose({
  isZoomInDisabled: computed(() => scale.value >= MAX_SCALE),
  isZoomOutDisabled: computed(() => scale.value <= minScale.value),
  zoomIn: () => zoomAtCenter(ZOOM_STEP),
  zoomOut: () => zoomAtCenter(-ZOOM_STEP),
  buildRouteTo,
});

/* =========================
   POINTER EVENTS
========================= */

let dragPointerId: number | null = null;
let lastX = 0;
let lastY = 0;
let dragStartX = 0;
let dragStartY = 0;
let pinchLastDist = 0;

const pointers = new Map<number, PointerEvent>();

const getDistance = (a: PointerEvent, b: PointerEvent) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

const onPointerDown = (e: PointerEvent) => {
  pointers.set(e.pointerId, e);

  if (pointers.size === 1) {
    dragPointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    isDragging.value = false;
  } else if (pointers.size === 2) {
    dragPointerId = null;
    isDragging.value = false;
    const [a, b] = [...pointers.values()];
    pinchLastDist = getDistance(a, b);
  }
};

const onPointerMove = (e: PointerEvent) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, e);

  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const dist = getDistance(a, b);
    const distDelta = dist - pinchLastDist;
    pinchLastDist = dist;

    const centerX = (a.clientX + b.clientX) / 2;
    const centerY = (a.clientY + b.clientY) / 2;
    zoomTo(scale.value + distDelta * 0.01, centerX, centerY);
    return;
  }

  if (dragPointerId === null || e.pointerId !== dragPointerId) return;

  if (!isDragging.value) {
    const moved = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
    if (moved < DRAG_THRESHOLD) return;
    isDragging.value = true;
  }

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;

  const { x, y } = clampTranslate(
    translateX.value + dx,
    translateY.value + dy,
    scale.value,
  );

  translateX.value = x;
  translateY.value = y;

  lastX = e.clientX;
  lastY = e.clientY;
};

const onPointerUp = (e: PointerEvent) => {
  pointers.delete(e.pointerId);

  if (e.pointerId === dragPointerId) {
    dragPointerId = null;
    isDragging.value = false;
  }

  try {
    wrapperRef.value?.releasePointerCapture(e.pointerId);
  } catch {
    console.log('123');
  }

  if (pointers.size === 1) {
    const [remaining] = [...pointers.values()];
    dragPointerId = remaining.pointerId;
    lastX = remaining.clientX;
    lastY = remaining.clientY;
    dragStartX = remaining.clientX;
    dragStartY = remaining.clientY;
    isDragging.value = false;
  }
};

const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
  zoomTo(scale.value + delta, e.clientX, e.clientY);
};

const handlePinClick = (id: string) => {
  if (isDragging.value) return;
  emit('point-click', id);
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
    resizeObserver = new ResizeObserver(() => fitMap());
    resizeObserver.observe(element);
  },
  { immediate: true },
);

onMounted(async () => {
  await fitMap();
  window.addEventListener('resize', fitMap);

  // Авто-маршрут из URL
  const params = new URLSearchParams(window.location.search);
  const zoneId = params.get('zone');
  if (zoneId) {
    setTimeout(() => buildRouteTo(zoneId), 450);
  }

  const el = wrapperRef.value;
  if (!el) return;

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
  el.addEventListener('wheel', onWheel, { passive: false });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', fitMap);
  resizeObserver?.disconnect();

  const el = wrapperRef.value;
  if (!el) return;

  el.removeEventListener('pointerdown', onPointerDown);
  el.removeEventListener('pointermove', onPointerMove);
  el.removeEventListener('pointerup', onPointerUp);
  el.removeEventListener('pointercancel', onPointerUp);
  el.removeEventListener('wheel', onWheel);
});

const logCoords = (e: MouseEvent) => {
  // Получаем координаты относительно SVG (viewBox 370x419)
  const svg = e.currentTarget as SVGSVGElement;
  const point = svg.createSVGPoint();
  point.x = e.clientX;
  point.y = e.clientY;
  const cursorPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());

  console.log(
    `x: ${Math.round(cursorPoint.x)}, y: ${Math.round(cursorPoint.y)}`,
  );
};
</script>

<template>
  <Teleport to="body">
    <div
      ref="wrapperRef"
      class="map-canvas"
      :class="{ 'is-dragging': isDragging }"
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
          @click="logCoords"
        >
          <!-- Маршрут через граф -->
          <polyline
            v-if="hasRoute"
            :points="routePolylinePoints"
            class="navigation-route"
          />

          <!-- Пруд — кликабельная зона -->
          <path
            d="M73.8296 22.3391C78.0799 5.81492 96.2621 -4.76692 112.9 2.14979C127.668 10.7489 136.031 17.9659 131.78 34.4901L120.377 73.934C116.127 90.4582 98.9529 97.8129 82.4287 93.5625C65.9045 89.3122 55.9327 71.7644 60.1831 55.2402L73.8296 22.3391Z"
            class="pond-hotspot"
            @click.stop="handlePinClick('zone-pond')"
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
  user-select: none;
  -webkit-user-select: none;
  z-index: 1;
  cursor: grab;

  &.is-dragging {
    cursor: grabbing;
  }
}

.map {
  position: absolute;
  top: 0;
  left: 0;
  width: $map-width;
  height: $map-height;
  transform-origin: top left;
  isolation: isolate;
  touch-action: none;
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

  .pond-hotspot {
    fill: transparent;
    pointer-events: all;
    cursor: pointer;
  }
}

.navigation-route {
  fill: none;
  stroke: #91b341;
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 8px rgba(145, 179, 65, 0.6));
}

.map-hotspot {
  position: absolute;
  z-index: 50;
  touch-action: manipulation;
  cursor: pointer;
}

.user-pin {
  position: absolute;
  z-index: 30;
  transform: translate(-50%, -100%);
  pointer-events: none;
}
</style>
