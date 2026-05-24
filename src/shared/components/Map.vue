<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import MapSvg from '@/shared/assets/images/map.svg';
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
const MAP_TOP_OFFSET = 6;
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
  costMultiplier?: number;
}

// Узлы графа — только сами дороги и точные съезды к домам
const GRAPH_NODES: GraphNode[] = [
  // --- Парковка и кольцо ---
  { id: 'parking', x: 311.2, y: 282.2 },
  { id: 'junc_rec', x: 227.4, y: 282.2 },
  { id: 'loop_r', x: 206.3, y: 282.2 },
  { id: 'loop_rt', x: 202.4, y: 273.0 },
  { id: 'loop_tr', x: 195.0, y: 267.0 },
  { id: 'loop_t_end', x: 189.3, y: 265.2 },
  { id: 'loop_t_start', x: 150.9, y: 265.2 },
  { id: 'loop_tl', x: 143.5, y: 266.9 },
  { id: 'loop_lt', x: 137.8, y: 269.6 },
  { id: 'loop_l', x: 133.9, y: 282.2 },
  { id: 'loop_lb', x: 137.8, y: 294.0 },
  { id: 'loop_bl', x: 143.5, y: 297.0 },
  { id: 'loop_b_start', x: 150.9, y: 299.2 },
  { id: 'loop_b_end', x: 189.3, y: 299.2 },
  { id: 'loop_br', x: 198.7, y: 297.0 },
  { id: 'loop_rb', x: 202.4, y: 294.0 },

  // --- Дорога влево (Терраса) и Ресторан ---
  { id: 'junc_z12', x: 109.8, y: 282.2 },
  { id: 'junc_z14', x: 80.8, y: 282.2 },
  { id: 'junc_terrace', x: 49.1, y: 282.2 },
  { id: 'rest_1', x: 48.3, y: 295.0 },
  { id: 'rest_2', x: 48.0, y: 319.9 },
  { id: 'rest_3', x: 48.2, y: 333.1 },
  { id: 'rest_4', x: 49.2, y: 354.0 },
  { id: 'rest_5', x: 51.5, y: 369.0 },
  { id: 'rest_6', x: 58.1, y: 385.0 },
  { id: 'rest_7', x: 79.0, y: 391.4 },
  { id: 'end_rest', x: 137.9, y: 390.5 },

  // --- Спуск к зоне 13 ---
  { id: 'z13_1', x: 80.8, y: 287.9 },
  { id: 'z13_2', x: 80.3, y: 291.2 },
  { id: 'z13_3', x: 78.4, y: 297.6 },
  { id: 'z13_4', x: 75.5, y: 302.5 },
  { id: 'z13_end', x: 73.8, y: 304.1 },

  // --- Дорога вверх ---
  { id: 'up_1', x: 228.0, y: 248.3 },
  { id: 'up_2', x: 228.0, y: 230.7 },
  { id: 'up_3', x: 228.0, y: 218.7 },
  { id: 'up_4', x: 227.8, y: 202.4 },
  { id: 'up_5', x: 227.4, y: 193.6 },
  { id: 'up_6', x: 227.0, y: 188.2 },
  { id: 'junc_top_r', x: 214.7, y: 170.0 },

  // --- Верхняя дорога ---
  { id: 'top_r1', x: 241.3, y: 170.7 },
  { id: 'top_r2', x: 270.1, y: 171.6 },
  { id: 'top_r3', x: 283.8, y: 174.4 },
  { id: 'top_r4', x: 299.3, y: 179.6 },
  { id: 'top_r4b', x: 320.5, y: 208.0 },
  { id: 'top_r5', x: 338.5, y: 230.7 },
  { id: 'top_l1', x: 188.3, y: 170.0 },
  { id: 'top_l2', x: 174.2, y: 170.0 },
  { id: 'top_l3', x: 160.0, y: 170.0 },
  { id: 'top_l4', x: 145.0, y: 170.0 },
  { id: 'top_l5', x: 130.2, y: 170.0 },
  { id: 'junc_top_l', x: 123.8, y: 170.0 },

  // --- Петля к пруду (Зоны 21, 22, 23) ---
  { id: 'z23_junc', x: 116.7, y: 170.0 },
  { id: 'left_bot_c1', x: 92.5, y: 170.0 },
  { id: 'left_bot_c2', x: 71.2, y: 174.7 },
  { id: 'loop_left_bot', x: 63.9, y: 187.3 },
  { id: 'z22_junc', x: 66.7, y: 176.6 },
  { id: 'z21_junc', x: 75.8, y: 137.2 },
  { id: 'pond_junc', x: 77.0, y: 131.6 },
  { id: 'end_pond', x: 85.4, y: 90.5 },
  { id: 'pond_c1', x: 90.0, y: 155.0 },
  { id: 'pond_c2', x: 110.0, y: 165.0 },

  // --- Нижняя правая и левая дороги ---
  { id: 'br_c1', x: 202.4, y: 293.0 },
  { id: 'br_c1b', x: 208.5, y: 298.5 },
  { id: 'br_c2', x: 215.6, y: 305.6 },
  { id: 'br_c2b', x: 221.5, y: 314.0 },
  { id: 'br_1', x: 224.7, y: 321.4 },
  { id: 'br_2', x: 224.7, y: 354.6 },
  { id: 'br_3', x: 224.7, y: 373.6 },
  { id: 'bl_c1', x: 166.2, y: 299.2 },
  { id: 'bl_c1b', x: 157.0, y: 308.5 },
  { id: 'bl_c2', x: 147.7, y: 318.8 },
  { id: 'bl_c2b', x: 140.5, y: 337.5 },
  { id: 'bl_c3', x: 135.3, y: 357.6 },
  { id: 'bl_1', x: 137.0, y: 373.6 },

  // ==========================================
  // ТОЧНЫЕ КООРДИНАТЫ СЪЕЗДОВ К КАЖДОМУ ДОМУ
  // ==========================================
  { id: 'z1_stub', x: 237.8, y: 230.7 },
  { id: 'z2_stub', x: 237.8, y: 202.4 },
  { id: 'z3_stub', x: 217.3, y: 188.2 },
  { id: 'z4_stub', x: 212.9, y: 218.7 },
  { id: 'z5_stub', x: 206.3, y: 248.3 },
  { id: 'z6_stub', x: 242.2, y: 321.4 },
  { id: 'z7_stub', x: 242.2, y: 354.6 },
  { id: 'z8_stub', x: 242.2, y: 393.5 },
  { id: 'z9_stub', x: 206.3, y: 393.5 },
  { id: 'z10_stub', x: 206.3, y: 354.6 },
  { id: 'z11_stub', x: 206.3, y: 321.4 },
  { id: 'z12_stub', x: 109.8, y: 294.2 },
  { id: 'z14_stub', x: 80.8, y: 271.8 },
  { id: 'z15_stub', x: 129.3, y: 257.5 },
  { id: 'z16_stub', x: 241.3, y: 158.4 },
  { id: 'z17_stub', x: 214.7, y: 158.4 },
  { id: 'z18_stub', x: 188.3, y: 158.4 },
  { id: 'z19_stub', x: 160.0, y: 159.5 },
  { id: 'z20_stub', x: 130.2, y: 159.5 },
  { id: 'z21_stub', x: 65.0, y: 137.2 },
  { id: 'z22_stub', x: 56.6, y: 176.6 },
  { id: 'z23_stub', x: 116.7, y: 181.5 },
  { id: 'z24_stub', x: 145.0, y: 181.5 },
  { id: 'z25_stub', x: 174.2, y: 181.5 },
  { id: 'z26_stub', x: 270.1, y: 161.0 },
  { id: 'z27_stub', x: 299.3, y: 168.4 },
  { id: 'z28_stub', x: 283.8, y: 186.4 },
];

const GRAPH_EDGES: GraphEdge[] = [
  // Кольцо и основа (верхняя дуга чуть дороже → Dijkstra предпочитает нижний путь для левых зон)
  { from: 'parking', to: 'junc_rec' },
  { from: 'junc_rec', to: 'loop_r' },
  { from: 'loop_r', to: 'loop_rt', costMultiplier: 1.05 },
  { from: 'loop_rt', to: 'loop_tr', costMultiplier: 1.05 },
  { from: 'loop_tr', to: 'loop_t_end', costMultiplier: 1.05 },
  { from: 'loop_t_end', to: 'loop_t_start', costMultiplier: 1.05 },
  { from: 'loop_t_start', to: 'loop_tl', costMultiplier: 1.05 },
  { from: 'loop_tl', to: 'loop_lt', costMultiplier: 1.05 },
  { from: 'loop_lt', to: 'loop_l', costMultiplier: 1.05 },
  { from: 'loop_l', to: 'loop_lb' },
  { from: 'loop_lb', to: 'loop_bl' },
  { from: 'loop_bl', to: 'loop_b_start' },
  { from: 'loop_b_start', to: 'loop_b_end' },
  { from: 'loop_b_end', to: 'loop_br' },
  { from: 'loop_br', to: 'loop_rb' },
  { from: 'loop_rb', to: 'loop_r' },

  // Влево и к ресторану
  { from: 'loop_l', to: 'junc_z12' },
  { from: 'junc_z12', to: 'junc_z14' },
  { from: 'junc_z14', to: 'junc_terrace' },
  { from: 'junc_terrace', to: 'rest_1' },
  { from: 'rest_1', to: 'rest_2' },
  { from: 'rest_2', to: 'rest_3' },
  { from: 'rest_3', to: 'rest_4' },
  { from: 'rest_4', to: 'rest_5' },
  { from: 'rest_5', to: 'rest_6' },
  { from: 'rest_6', to: 'rest_7' },
  { from: 'rest_7', to: 'end_rest' },

  // К 13 зоне
  { from: 'junc_z14', to: 'z13_1' },
  { from: 'z13_1', to: 'z13_2' },
  { from: 'z13_2', to: 'z13_3' },
  { from: 'z13_3', to: 'z13_4' },
  { from: 'z13_4', to: 'z13_end' },

  // Вверх и по верху
  { from: 'junc_rec', to: 'up_1' },
  { from: 'up_1', to: 'up_2' },
  { from: 'up_2', to: 'up_3' },
  { from: 'up_3', to: 'up_4' },
  { from: 'up_4', to: 'up_5' },
  { from: 'up_5', to: 'up_6' },
  { from: 'up_6', to: 'junc_top_r' },
  { from: 'junc_top_r', to: 'top_r1' },
  { from: 'top_r1', to: 'top_r2' },
  { from: 'top_r2', to: 'top_r3' },
  { from: 'top_r3', to: 'top_r4' },
  { from: 'top_r4', to: 'top_r4b' },
  { from: 'top_r4b', to: 'top_r5' },
  { from: 'junc_top_r', to: 'top_l1' },
  { from: 'top_l1', to: 'top_l2' },
  { from: 'top_l2', to: 'top_l3' },
  { from: 'top_l3', to: 'top_l4' },
  { from: 'top_l4', to: 'top_l5' },
  { from: 'top_l5', to: 'junc_top_l' },

  // Петля пруда
  { from: 'junc_top_l', to: 'z23_junc' },
  { from: 'z23_junc', to: 'left_bot_c1' },
  { from: 'left_bot_c1', to: 'left_bot_c2' },
  { from: 'left_bot_c2', to: 'loop_left_bot' },
  { from: 'loop_left_bot', to: 'z22_junc' },
  { from: 'z22_junc', to: 'z21_junc' },
  { from: 'z21_junc', to: 'pond_junc' },
  { from: 'pond_junc', to: 'end_pond' },
  { from: 'pond_junc', to: 'pond_c1' },
  { from: 'pond_c1', to: 'pond_c2' },
  { from: 'pond_c2', to: 'junc_top_l' },

  // Низы
  { from: 'loop_rb', to: 'br_c1' },
  { from: 'br_c1', to: 'br_c1b' },
  { from: 'br_c1b', to: 'br_c2' },
  { from: 'br_c2', to: 'br_c2b' },
  { from: 'br_c2b', to: 'br_1' },
  { from: 'br_1', to: 'br_2' },
  { from: 'br_2', to: 'br_3' },
  { from: 'loop_b_start', to: 'bl_c1' },
  { from: 'bl_c1', to: 'bl_c1b' },
  { from: 'bl_c1b', to: 'bl_c2' },
  { from: 'bl_c2', to: 'bl_c2b' },
  { from: 'bl_c2b', to: 'bl_c3' },
  { from: 'bl_c3', to: 'bl_1' },
  { from: 'bl_1', to: 'br_3' },
  { from: 'bl_1', to: 'end_rest' },

  // ==========================================
  // ПРИСОЕДИНЕНИЕ СЪЕЗДОВ К ДОРОГАМ
  // ==========================================
  { from: 'up_2', to: 'z1_stub' },
  { from: 'up_4', to: 'z2_stub' },
  { from: 'up_6', to: 'z3_stub' },
  { from: 'up_3', to: 'z4_stub' },
  { from: 'up_1', to: 'z5_stub' },
  { from: 'br_1', to: 'z6_stub' },
  { from: 'br_2', to: 'z7_stub' },
  { from: 'br_3', to: 'z8_stub' },
  { from: 'br_3', to: 'z9_stub' },
  { from: 'br_2', to: 'z10_stub' },
  { from: 'br_1', to: 'z11_stub' },
  { from: 'junc_z12', to: 'z12_stub' },
  { from: 'junc_z14', to: 'z14_stub' },
  { from: 'loop_tl', to: 'z15_stub' },
  { from: 'top_r1', to: 'z16_stub' },
  { from: 'junc_top_r', to: 'z17_stub' },
  { from: 'top_l1', to: 'z18_stub' },
  { from: 'top_l3', to: 'z19_stub' },
  { from: 'top_l5', to: 'z20_stub' },
  { from: 'z21_junc', to: 'z21_stub' },
  { from: 'z22_junc', to: 'z22_stub' },
  { from: 'z23_junc', to: 'z23_stub' },
  { from: 'top_l4', to: 'z24_stub' },
  { from: 'top_l2', to: 'z25_stub' },
  { from: 'top_r2', to: 'z26_stub' },
  { from: 'top_r4', to: 'z27_stub' },
  { from: 'top_r3', to: 'z28_stub' },
];

const ZONE_TO_NODE: Record<string, string> = {
  // Дома 1 - 28 ведут четко к съездам
  'zone-1': 'z1_stub',
  'zone-2': 'z2_stub',
  'zone-3': 'z3_stub',
  'zone-4': 'z4_stub',
  'zone-5': 'z5_stub',
  'zone-6': 'z6_stub',
  'zone-7': 'z7_stub',
  'zone-8': 'z8_stub',
  'zone-9': 'z9_stub',
  'zone-10': 'z10_stub',
  'zone-11': 'z11_stub',
  'zone-12': 'z12_stub',
  'zone-13': 'z13_end',
  'zone-14': 'z14_stub',
  'zone-15': 'z15_stub',
  'zone-16': 'z16_stub',
  'zone-17': 'z17_stub',
  'zone-18': 'z18_stub',
  'zone-19': 'z19_stub',
  'zone-20': 'z20_stub',
  'zone-21': 'z21_stub',
  'zone-22': 'z22_stub',
  'zone-23': 'z23_stub',
  'zone-24': 'z24_stub',
  'zone-25': 'z25_stub',
  'zone-26': 'z26_stub',
  'zone-27': 'z27_stub',
  'zone-28': 'z28_stub',

  // Общественные зоны
  'zone-parking': 'parking',
  'zone-terrace': 'rest_3',
  'zone-sport': 'rest_2',
  'zone-playground': 'junc_terrace',
  'zone-reception': 'junc_rec',
  'zone-restaurant': 'end_rest',
  'zone-pond': 'end_pond',
};

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
    const w = dist(a, b) * (e.costMultiplier ?? 1);
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

const routeAnimationKey = ref(0);

function catmullRomToPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';

  const first = points[0]!;
  const second = points[1]!;

  if (points.length === 2) {
    return `M ${first.x},${first.y} L ${second.x},${second.y}`;
  }

  const tension = 0.5;
  let d = `M ${first.x},${first.y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

const routePathD = computed(() => catmullRomToPath(routePath.value));

const hasRoute = computed(() => routePath.value.length >= 2);

const getNearestNodeId = (x: number, y: number): string => {
  let nearestId = GRAPH_NODES[0]!.id;
  let minDist = Infinity;
  for (const node of GRAPH_NODES) {
    const d = Math.hypot(node.x - x, node.y - y);
    if (d < minDist) {
      minDist = d;
      nearestId = node.id;
    }
  }
  return nearestId;
};

const buildRouteTo = (zoneId: string) => {
  const targetNodeId = ZONE_TO_NODE[zoneId];
  if (!targetNodeId) return;

  const startNodeId = getNearestNodeId(
    userLocation.value.x,
    userLocation.value.y,
  );
  const nodeIds = dijkstra(startNodeId, targetNodeId);
  if (!nodeIds.length) return;

  const nodeMap = new Map<string, GraphNode>();
  GRAPH_NODES.forEach((n) => nodeMap.set(n.id, n));

  routePath.value = nodeIds
    .map((id) => nodeMap.get(id))
    .filter((n): n is GraphNode => !!n)
    .map((n) => ({ x: n.x, y: n.y }));

  routeAnimationKey.value++;
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
    maxY = top + MAP_TOP_OFFSET;
  } else {
    minY = top + MAP_TOP_OFFSET;
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

  // const canvasEl = wrapperRef.value;
  // const canvasW = canvasEl ? canvasEl.clientWidth : window.innerWidth;
  // const canvasH = canvasEl ? canvasEl.clientHeight : window.innerHeight;
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

const resetRoute = () => {
  routePath.value = [];
};

defineExpose({
  isZoomInDisabled: computed(() => scale.value >= MAX_SCALE),
  isZoomOutDisabled: computed(() => scale.value <= minScale.value),
  hasRoute,
  zoomIn: () => zoomAtCenter(ZOOM_STEP),
  zoomOut: () => zoomAtCenter(-ZOOM_STEP),
  buildRouteTo,
  resetRoute,
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
    const pointerValues = [...pointers.values()];
    const a = pointerValues[0];
    const b = pointerValues[1];

    if (!a || !b) return;

    pinchLastDist = getDistance(a, b);
  }
};

const onPointerMove = (e: PointerEvent) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, e);

  if (pointers.size === 2) {
    const pointerValues = [...pointers.values()];
    const a = pointerValues[0];
    const b = pointerValues[1];

    if (!a || !b) return;

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
    const remaining = [...pointers.values()][0];

    if (!remaining) return;

    dragPointerId = remaining.pointerId;
    lastX = remaining.clientX;
    lastY = remaining.clientY;
    dragStartX = remaining.clientX;
    dragStartY = remaining.clientY;
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
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

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
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
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
  const svg = e.currentTarget as SVGSVGElement;
  const point = svg.createSVGPoint();
  point.x = e.clientX;
  point.y = e.clientY;
  const cursorPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());

  console.log(
    `x: ${Math.round(cursorPoint.x)}, y: ${Math.round(cursorPoint.y)}`,
  );
};

const isCtrlHeld = ref(false);

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Control') isCtrlHeld.value = true;
};

const onKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Control') isCtrlHeld.value = false;
};

// Пин: SVG 60×34, круг на cy=28; с translate(-50%,-100%) низ пина = userLocation.y,
// значит круг рендерится на userLocation.y - (34 - 28) = userLocation.y - 6
const PIN_CIRCLE_OFFSET_Y = 34 - 28; // 6 map-units

const handleCtrlClick = (e: MouseEvent) => {
  if (!e.ctrlKey) return;

  e.stopPropagation();

  const svgX =
    Math.round(((e.clientX - translateX.value) / scale.value) * 10) / 10;
  const svgY =
    Math.round(
      ((e.clientY - translateY.value) / scale.value + PIN_CIRCLE_OFFSET_Y) * 10,
    ) / 10;

  userLocation.value = { x: svgX, y: svgY };

  const params = new URLSearchParams(window.location.search);
  params.set('x', String(svgX));
  params.set('y', String(svgY));
  history.replaceState(null, '', `?${params.toString()}`);

  const shareUrl = `https://map-okna-v-les.vercel.app/?x=${svgX}&y=${svgY}`;
  navigator.clipboard.writeText(shareUrl).catch(() => {});
};
</script>

<template>
  <Teleport to="body">
    <div
      ref="wrapperRef"
      class="map-canvas"
      :class="{ 'is-dragging': isDragging, 'is-ctrl': isCtrlHeld }"
      @click.capture="handleCtrlClick"
    >
      <div
        class="map"
        :style="{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        }"
      >
        <img
          src="/images/pattern.svg"
          class="map-pattern"
          aria-hidden="true"
          alt="map"
        />

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
          <path
            v-if="hasRoute"
            :key="routeAnimationKey"
            :d="routePathD"
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

  &.is-ctrl {
    cursor: crosshair;
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

.map-pattern {
  position: absolute;
  left: -16px;
  top: -148px;
  width: 402px;
  height: 974px;
  max-width: unset;
  pointer-events: none;
  user-select: none;
  z-index: -1;
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
  stroke-dasharray: 3000;
  stroke-dashoffset: 3000;
  animation: draw-route 10s ease-out forwards;
}

@keyframes draw-route {
  to {
    stroke-dashoffset: 0;
  }
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
