import { defineStore } from 'pinia';
import { ref } from 'vue';

type InitSettings = {
  timeout: number;
  ignoredPaths: string[];
  onInactivity: () => void;
};

export const useInactivityStore = defineStore('inactivity', () => {
  const timeout = ref(0);
  const timerId = ref<number | null>(null);
  const onInactivity = ref<(() => void) | null>(null);
  const ignoredPaths = ref<string[]>([]);
  const isPaused = ref(false);

  const events = [
    'mousemove',
    'keydown',
    'click',
    'scroll',
    'touchstart',
  ] as const;

  const shouldIgnore = () => {
    const currentPath = window.location.pathname;

    return ignoredPaths.value.some((p) => {
      if (p === '/') return currentPath === '/';
      return currentPath.startsWith(p);
    });
  };

  const clearTimer = () => {
    if (timerId.value !== null) {
      clearTimeout(timerId.value);
      timerId.value = null;
    }
  };

  const startTimer = () => {
    clearTimer();

    if (shouldIgnore() || isPaused.value) return;

    timerId.value = window.setTimeout(() => {
      onInactivity.value?.();
    }, timeout.value);
  };

  const reset = () => {
    if (isPaused.value || shouldIgnore()) return;
    startTimer();
  };

  const start = () => {
    isPaused.value = false;
    startTimer();
  };

  const stop = () => {
    isPaused.value = true;
    clearTimer();
  };

  const init = (settings: InitSettings) => {
    timeout.value = settings.timeout;
    ignoredPaths.value = settings.ignoredPaths;
    onInactivity.value = settings.onInactivity;

    events.forEach((e) => {
      window.addEventListener(e, reset, { passive: true });
    });

    start();
  };

  const destroy = () => {
    events.forEach((e) => {
      window.removeEventListener(e, reset);
    });
    clearTimer();
  };

  return {
    timeout,
    timerId,
    onInactivity,
    ignoredPaths,
    isPaused,

    init,
    start,
    stop,
    reset,
    destroy,
  };
});
