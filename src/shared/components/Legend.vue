<script setup lang="ts">
import { ref, watch } from 'vue';

interface LegendItem {
  label: string;
  color?: string;
  icon?: string;
}

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

const legendRef = ref<HTMLElement | null>(null);
const buttonRef = ref<HTMLElement | null>(null);

defineExpose({ legendRef });

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

function open() {
  emit('update:modelValue', true);
}

function close() {
  emit('update:modelValue', false);
}

function onDocumentClick(e: MouseEvent) {
  const inLegend = legendRef.value?.contains(e.target as Node);
  const inButton = buttonRef.value?.contains(e.target as Node);
  if (!inLegend && !inButton) close();
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      setTimeout(() => document.addEventListener('click', onDocumentClick), 0);
    } else {
      document.removeEventListener('click', onDocumentClick);
    }
  },
);
</script>

<template>
  <!-- Кнопка в закрытом состоянии -->
  <button
    v-if="!modelValue"
    ref="buttonRef"
    class="legend-button"
    @click.stop="open"
  >
    <img
      src="/images/info.svg"
      alt=""
    />
  </button>

  <!-- Легенда с кнопкой-вкладкой сверху -->
  <Transition name="legend">
    <div
      v-if="modelValue"
      ref="legendRef"
      class="legend"
    >
      <button
        class="legend-tab"
        @click.stop="close"
      >
        <img
          src="/images/arrowdown.svg"
          alt=""
        />
      </button>

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
  </Transition>
</template>

<style scoped lang="scss">
.legend-button {
  position: fixed;
  bottom: 20px;
  left: 16px;
  z-index: 10;
  width: 40px;
  height: 40px;
  padding: 10px;
  border-radius: 8px;
  background: #efedd9;
  cursor: pointer;
  pointer-events: auto;
}

.legend {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 10;
  padding: 8px;
  background: #efedd9;
  border-radius: 0 16px 16px 16px;
  pointer-events: auto;
  transform-origin: bottom left;
}

.legend-tab {
  position: absolute;
  top: -16px;
  left: 0;
  z-index: -1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 4px 10px;
  border-radius: 12px 12px 0 0;
  background: #efedd9;
  cursor: pointer;
}

.legend-enter-active,
.legend-leave-active {
  transition: transform 0.3s ease-out;
}

.legend-enter-from,
.legend-leave-to {
  transform: scaleX(0.03) scaleY(0.005);
}

.legend-enter-to,
.legend-leave-from {
  transform: scaleX(1) scaleY(1);
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
  padding: 4px;
  border-radius: 10px;
  background: #e6e4c7;
}

.legend-text {
  margin: 0;
  font-size: 10px;
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
