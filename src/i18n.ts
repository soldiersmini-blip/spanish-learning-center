import type { Locale, LocalizedText } from './types';

export const localeNames: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
  es: 'Español',
};

export const uiText = {
  appTitle: {
    zh: '西班牙语学习中心',
    en: 'Spanish Learning Center',
    es: 'Centro de aprendizaje de español',
  },
  appSubtitle: {
    zh: '为中文母语者设计的 A1-A2 自学路线',
    en: 'A self-study path for Chinese speakers, from A1 to A2',
    es: 'Ruta de autoaprendizaje A1-A2 para hablantes de chino',
  },
  enter: { zh: '进入学习', en: 'Start learning', es: 'Entrar' },
  comingSoon: { zh: '即将开放 / Coming Soon', en: 'Coming Soon', es: 'Próximamente' },
  backHome: { zh: '返回首页', en: 'Home', es: 'Inicio' },
  searchVocab: { zh: '搜索词汇、意思或例句', en: 'Search words, meanings, or examples', es: 'Buscar palabras, significados o ejemplos' },
  filterSentences: { zh: '按主题筛选句式', en: 'Filter patterns by theme', es: 'Filtrar frases por tema' },
  allThemes: { zh: '全部主题', en: 'All themes', es: 'Todos los temas' },
  audio: { zh: '播放音频', en: 'Play audio', es: 'Audio' },
  quiz: { zh: '小测验', en: 'Mini quiz', es: 'Mini prueba' },
  answer: { zh: '参考答案', en: 'Answer', es: 'Respuesta' },
  progress: { zh: '学习进度', en: 'Progress', es: 'Progreso' },
  completeModule: { zh: '标记完成', en: 'Mark complete', es: 'Marcar' },
  completed: { zh: '已完成', en: 'Completed', es: 'Completado' },
  light: { zh: '浅色', en: 'Light', es: 'Claro' },
  dark: { zh: '深色', en: 'Dark', es: 'Oscuro' },
  reservedTitle: { zh: '预留学习区', en: 'Reserved level', es: 'Nivel reservado' },
  reservedBody: {
    zh: '这个阶段已经预留好路由和页面，后续可以继续接入课程数据。',
    en: 'The route and page are ready for future course content.',
    es: 'La ruta y la página ya están listas para contenido futuro.',
  },
};

export function t(text: LocalizedText, locale: Locale) {
  return text[locale] || text.zh;
}
