import { motion } from 'motion-v';
import type { App, DefineComponent } from 'vue';

const motionComponents = {
  MotionDiv: motion.div,
  MotionSpan: motion.span,
  MotionP: motion.p,
  MotionButton: motion.button,
  MotionSection: motion.section,
  MotionArticle: motion.article,
  MotionHeader: motion.header,
  MotionFooter: motion.footer,
  MotionMain: motion.main,
  MotionH1: motion.h1,
  MotionH2: motion.h2,
  MotionH3: motion.h3,
  MotionUl: motion.ul,
  MotionLi: motion.li,
  MotionImg: motion.img,
  MotionA: motion.a,
} as const;

export default {
  install(app: App) {
    Object.entries(motionComponents).forEach(([name, component]) => {
      app.component(name, component as DefineComponent);
    });
  },
};
