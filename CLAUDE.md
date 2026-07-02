# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # запуск dev-сервера (доступен на 0.0.0.0)
npm run build     # TypeScript-проверка + сборка Vite (создаёт dist/ и dist.zip)
npm run preview   # предпросмотр production-сборки
```

Линтинг и форматирование запускаются автоматически через husky + lint-staged при коммите. Запустить вручную:

```bash
npx eslint --fix src/
npx prettier --write src/
```

## Architecture

Это **интерактивный киоск-навигатор** для глэмпинга «Окна в лес» — сенсорное приложение, предназначенное для работы в режиме полного экрана на стационарном устройстве.

### Стек

Vue 3 + TypeScript + Vite. Стейт — Pinia. HTTP — Axios + TanStack Query. Анимации — motion-v (зарегистрированы глобально через `motionPlugin` как `<MotionDiv>`, `<MotionSpan>` и т.д.). SCSS с глобальными хелперами (миксины/функции) подключается через `additionalData` в vite.config.ts — в каждом `.vue`-файле доступны без импорта.

### Структура

```
src/
  app/           — точка входа, плагины, роутер
  pages/         — страницы (сейчас одна: HomePage)
  shared/
    api/         — axios-инстанс (baseURL: /api), queryClient
    assets/      — шрифты, SCSS (globals, normalize, animations, utils, helpers)
    components/  — Map, MapPin, Legend, Modal
    lib/motion/  — регистрация motion-v компонентов
  stores/        — Pinia-сторы
public/
  data.json      — данные зон: title, description, images[]
```

### Главная страница и карта

`HomePage.vue` рендерит `<Map>` и `<Legend>`. Карта (`Map.vue`) работает через **Teleport в body** и управляет собственным трансформом (translate + scale) без сторонних библиотек панорамирования.

**Ключевые механики Map.vue:**

- SVG карты подключается как Vue-компонент (`map.svg?component` через vite-svg-loader); все `style`-элементы из SVG вырезаются при сборке через svgo-конфиг (`removeStyleElement`).
- Хотспоты — абсолютно позиционированные `div`-ы поверх SVG; координаты захардкожены в массиве `mapPoints` в SVG-единицах (viewport 370×419).
- Маршруты строятся по SVG-пути `ROAD_PATH` через `getTotalLength()` / `getPointAtLength()` — находит ближайшие точки на дороге от `userLocation` до центра выбранного хотспота, рисует `stroke-dasharray`-анимацию.
- `userLocation` берётся из URL-параметров `?x=&y=` (для интеграции с внешней системой позиционирования), дефолт — `{x: 300, y: 295}`.
- `fitArea` prop принимает ref на DOM-элемент; карта масштабируется по ResizeObserver, чтобы заполнить эту область с отступом `EDGE_PADDING = 16px`.

### Сборка

`npm run build` создаёт `dist/` и автоматически упаковывает его в `dist.zip` (корень проекта) через `vite-plugin-zip-pack` — готово к деплою на сервер.
