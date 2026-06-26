import type { LevelContent } from '../types';

const L = (zh: string, en: string, es: string) => ({ zh, en, es });

export const b1Content: LevelContent = {
  id: 'b1',
  title: L('B1 预留学习区', 'B1 Reserved Area', 'Área B1 reservada'),
  subtitle: L('B1 路由和学习地图已经准备好，正式课程内容会在后续阶段接入。', 'The B1 route and learning map are ready for future course content.', 'La ruta y el mapa B1 están listos para contenido futuro.'),
  modules: [],
};
