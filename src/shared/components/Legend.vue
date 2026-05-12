<script setup lang="ts">
interface LegendItem {
  label: string;
  color?: string;
  icon?: string;
}

const legendItems: LegendItem[] = [
  { label: 'Студия Френдс', color: '#5689E7' },
  { label: 'Студия Фэмили', color: '#A374B9' },
  { label: 'Студия 1', color: '#71BFD4' },
  { label: 'Студия 2', color: '#117C99' },
  { label: 'Апартаменты', color: '#E3783F' },
  { label: 'Студии Форест', color: '#98A882' },
  { label: 'Дом на дереве', color: '#E76956' },
  { label: 'Студии Макс', color: '#E7C056' },
  { label: 'Детская развивающая площадка', icon: '/images/playground.svg' },
  { label: 'Спортивная площадка', icon: '/images/sport.svg' },
];
</script>

<template>
  <div class="legend">
    <div class="legend-list">
      <div
        v-for="item in legendItems"
        :key="item.label"
        class="legend-item"
      >
        <span
          v-if="item.color"
          class="legend-marker"
          :style="{ backgroundColor: item.color }"
        ></span>

        <img
          v-else-if="item.icon"
          :src="item.icon"
          :alt="item.label"
          class="legend-icon"
        />

        <p class="legend-text">
          {{ item.label }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.legend {
  padding: 8px;

  border-radius: 16px;

  background: #efedd9;
}

.legend-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;

  min-height: 32px;

  padding: 4px 8px;

  border-radius: 10px;

  background: #e6e4c7;
}

.legend-text {
  margin: 0;

  font-size: 14px;
  line-height: 1.2;
}

.legend-marker,
.legend-icon {
  flex-shrink: 0;

  width: 18px;
  height: 18px;
}

.legend-marker {
  border-radius: 4px;
}

.legend-icon {
  object-fit: contain;
}
</style>
