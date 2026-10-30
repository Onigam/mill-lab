import '@onigam/lab-kit/styles.css';
import { mountLab } from '@onigam/lab-kit/ui';
import { lab } from './lab';

mountLab(lab, {
  app: document.getElementById('app')!,
  viewport: document.getElementById('viewport')!,
  expose: import.meta.env.DEV, // window.__lab = { stage, engine, store } for debugging and tests
});
