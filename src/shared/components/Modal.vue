<script setup lang="ts">
import { AnimatePresence } from 'motion-v';
import { nextTick, ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  title: string;
  description: string;
  images: string[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'route'): void;
}>();

const activeIndex = ref(0);
const setActive = (i: number) => {
  activeIndex.value = i;
};

const thumbsRef = ref<HTMLElement | null>(null);
const thumbsScrollRatio = ref(0);
const thumbsThumbWidth = ref(1);

const updateThumbsMetrics = () => {
  const el = thumbsRef.value;
  if (!el) return;
  const maxScroll = el.scrollWidth - el.clientWidth;
  thumbsScrollRatio.value = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
  thumbsThumbWidth.value =
    el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1;
};

const onThumbsScroll = updateThumbsMetrics;

watch(
  () => props.visible,
  (val) => {
    if (val) nextTick(updateThumbsMetrics);
  },
);
</script>

<template>
  <Teleport to="body">
    <AnimatePresence>
      <MotionDiv
        v-if="props.visible"
        class="modal-overlay"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="{ duration: 0.2 }"
      >
        <div class="modal">
          <div class="modal__gallery">
            <div class="modal__main-image-wrap">
              <img
                :src="images[activeIndex]"
                alt=""
                class="modal__main-image"
              />
            </div>

            <div
              v-if="images.length > 1"
              class="modal__thumbs-wrap"
            >
              <div
                ref="thumbsRef"
                class="modal__thumbs"
                @scroll="onThumbsScroll"
              >
                <button
                  v-for="(src, i) in images"
                  :key="i"
                  class="modal__thumb"
                  :class="{ 'is-active': i === activeIndex }"
                  type="button"
                  @click="setActive(i)"
                >
                  <img
                    :src="src"
                    alt=""
                  />
                </button>
              </div>
              <div
                v-if="thumbsThumbWidth < 1"
                class="modal__thumbs-track"
              >
                <div
                  class="modal__thumbs-indicator"
                  :style="{
                    width: `${thumbsThumbWidth * 100}%`,
                    left: `${thumbsScrollRatio * (1 - thumbsThumbWidth) * 100}%`,
                  }"
                ></div>
              </div>
            </div>
          </div>

          <h2 class="modal__title">{{ title }}</h2>

          <div class="modal__content">
            <p class="modal__description">{{ description }}</p>
          </div>

          <div class="modal__footer">
            <button
              class="modal__btn modal__btn--back"
              type="button"
              @click="emit('close')"
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20.1248 11.4998C20.1248 11.7857 20.0112 12.0599 19.809 12.2621C19.6068 12.4643 19.3326 12.5779 19.0467 12.5779L6.41536 12.5779L11.1404 16.8056C11.3516 16.9967 11.4786 17.2637 11.4936 17.5481C11.5087 17.8326 11.4105 18.1114 11.2206 18.3237C11.0307 18.5361 10.7645 18.6646 10.4801 18.6813C10.1957 18.6979 9.91634 18.6014 9.70293 18.4127L2.8748 12.3033C2.76151 12.2022 2.67086 12.0783 2.6088 11.9397C2.54673 11.8011 2.51465 11.6509 2.51465 11.4991C2.51465 11.3472 2.54673 11.197 2.6088 11.0584C2.67086 10.9198 2.76151 10.7959 2.8748 10.6948L9.70293 4.58541C9.80829 4.49005 9.93147 4.41647 10.0654 4.36889C10.1993 4.32131 10.3413 4.30067 10.4832 4.30817C10.6251 4.31566 10.7641 4.35113 10.8923 4.41255C11.0204 4.47396 11.1352 4.56011 11.2299 4.66603C11.3247 4.77195 11.3975 4.89556 11.4443 5.02974C11.4911 5.16392 11.5109 5.30603 11.5026 5.44789C11.4943 5.58976 11.458 5.72858 11.3959 5.85637C11.3337 5.98416 11.2469 6.09841 11.1404 6.19253L6.41536 10.4217L19.0467 10.4217C19.3326 10.4217 19.6068 10.5352 19.809 10.7374C20.0112 10.9396 20.1248 11.2138 20.1248 11.4998Z"
                  fill="#2B2A22"
                />
              </svg>

              Назад
            </button>

            <button
              class="modal__btn modal__btn--route"
              type="button"
              @click="emit('route')"
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.91771 18.999C5.16701 18.2483 4.79167 17.3458 4.79167 16.2917V8.45729C4.23264 8.24965 3.7736 7.90242 3.41454 7.41558C3.05549 6.92875 2.87564 6.37356 2.875 5.75C2.875 4.95139 3.15451 4.27257 3.71354 3.71354C4.27257 3.15451 4.95139 2.875 5.75 2.875C6.54861 2.875 7.22743 3.15451 7.78646 3.71354C8.34549 4.27257 8.625 4.95139 8.625 5.75C8.625 6.37292 8.44547 6.92811 8.08642 7.41558C7.72736 7.90306 7.268 8.25029 6.70833 8.45729V16.2917C6.70833 16.8187 6.89617 17.2701 7.27183 17.6458C7.6475 18.0215 8.09856 18.209 8.625 18.2083C9.15144 18.2077 9.60282 18.0202 9.97913 17.6458C10.3554 17.2714 10.5429 16.82 10.5417 16.2917V6.70833C10.5417 5.65417 10.917 4.75174 11.6677 4.00104C12.4184 3.25035 13.3208 2.875 14.375 2.875C15.4292 2.875 16.3316 3.25035 17.0823 4.00104C17.833 4.75174 18.2083 5.65417 18.2083 6.70833V14.5427C18.7674 14.7503 19.2267 15.0979 19.5864 15.5854C19.9461 16.0728 20.1256 16.6277 20.125 17.25C20.125 18.0486 19.8455 18.7274 19.2865 19.2865C18.7274 19.8455 18.0486 20.125 17.25 20.125C16.4514 20.125 15.7726 19.8455 15.2135 19.2865C14.6545 18.7274 14.375 18.0486 14.375 17.25C14.375 16.6271 14.5548 16.0681 14.9145 15.5729C15.2742 15.0778 15.7333 14.7344 16.2917 14.5427V6.70833C16.2917 6.18125 16.1042 5.73019 15.7291 5.35517C15.3541 4.98014 14.9027 4.79231 14.375 4.79167C13.8473 4.79103 13.3962 4.97886 13.0218 5.35517C12.6474 5.73147 12.4596 6.18253 12.4583 6.70833V16.2917C12.4583 17.3458 12.083 18.2483 11.3323 18.999C10.5816 19.7497 9.67917 20.125 8.625 20.125C7.57083 20.125 6.6684 19.7497 5.91771 18.999ZM5.75 6.70833C6.02153 6.70833 6.24929 6.61633 6.43329 6.43233C6.61729 6.24833 6.70897 6.02089 6.70833 5.75C6.70769 5.47911 6.61569 5.25167 6.43233 5.06767C6.24897 4.88367 6.02153 4.79167 5.75 4.79167C5.47847 4.79167 5.25103 4.88367 5.06767 5.06767C4.88431 5.25167 4.79231 5.47911 4.79167 5.75C4.79103 6.02089 4.88303 6.24865 5.06767 6.43329C5.25231 6.61793 5.47975 6.70961 5.75 6.70833ZM17.25 18.2083C17.5215 18.2083 17.7493 18.1163 17.9333 17.9323C18.1173 17.7483 18.209 17.5209 18.2083 17.25C18.2077 16.9791 18.1157 16.7517 17.9323 16.5677C17.749 16.3837 17.5215 16.2917 17.25 16.2917C16.9785 16.2917 16.751 16.3837 16.5677 16.5677C16.3843 16.7517 16.2923 16.9791 16.2917 17.25C16.291 17.5209 16.383 17.7487 16.5677 17.9333C16.7523 18.1179 16.9797 18.2096 17.25 18.2083Z"
                  fill="white"
                />
              </svg>
              Маршрут
            </button>
          </div>
        </div>
      </MotionDiv>
    </AnimatePresence>
  </Teleport>
</template>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  padding: 16px;
}

.modal {
  position: relative;
  flex: 1;
  background: #efedd9;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &__gallery {
    flex-shrink: 0;
    padding-bottom: 12px;
  }

  &__main-image-wrap {
    margin: 16px 16px 0;
    height: 240px;
    overflow: hidden;
    border-radius: 12px;
  }

  &__main-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
  }

  &__thumbs-wrap {
    padding: 10px 16px 0;
  }

  &__thumbs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 8px;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__thumbs-track {
    position: relative;
    height: 4px;
    border-radius: 2px;
  }

  &__thumbs-indicator {
    position: absolute;
    top: 0;
    height: 100%;
    background: #91b341;
    border-radius: 2px;
    transition: left 0.1s ease;
  }

  &__thumb {
    flex-shrink: 0;
    overflow: hidden;
    padding: 0;
    cursor: pointer;
    transition: border-color 0.15s ease;
    background: none;
    border: 3px solid transparent;
    border-radius: 8px;
    width: 75px;
    height: 75px;

    &.is-active {
      border-color: #91b341;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
      user-select: none;
    }
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: 4px 6px 16px 16px;
    margin-right: 16px;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: #91b341;
      border-radius: 28px;
      border: none;
    }
  }

  &__title {
    flex-shrink: 0;
    font-size: 22px;
    font-weight: 800;
    line-height: 1.15;
    color: #2c2c2c;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    margin: 0;
    padding: 0 16px 8px;
    font-family: var(--font-family-second);
  }

  &__description {
    margin: 0;
    white-space: pre-line;
    font-weight: 500;
    font-size: 12px;
    color: #2b2a22;
  }

  &__footer {
    flex-shrink: 0;
    display: flex;
    gap: 12px;
    padding: 12px 16px 16px;
  }

  &__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 40px;
    border-radius: 12px;
    font-size: 20px;
    font-weight: 600;
    cursor: pointer;
    touch-action: manipulation;
    transition: opacity 0.15s ease;
    border: none;

    &:active {
      opacity: 0.75;
    }

    &--back {
      background: transparent;
      border: 2px solid #91b341;
      color: #2c2c2c;
    }

    &--route {
      background: #91b341;
      color: #fff;
    }
  }
}
</style>
