import type { LevelContent } from '../types';

const L = (zh: string, en: string, es: string) => ({ zh, en, es });

export const b2Content: LevelContent = {
  id: 'b2',
  title: L('B2 预留学习区', 'B2 Reserved Area', 'Área B2 reservada'),
  subtitle: L('B2 路由和学习地图已经准备好，正式课程内容会在后续阶段接入。', 'The B2 route and learning map are ready for future course content.', 'La ruta y el mapa B2 están listos para contenido futuro.'),
  modules: [],
};
