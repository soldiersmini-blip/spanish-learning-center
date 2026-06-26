import type { LearningMapContent, LearningNode } from '../../types/learningMap';

const L = (zh: string, en: string, es: string) => ({ zh, en, es });
const node = (id: string, zh: string, en: string, es: string, type: LearningNode['type'], children: LearningNode[] = []): LearningNode => ({
  id,
  level: 'B2',
  title: L(zh, en, es),
  description: L('预留结构，正式内容稍后接入。', 'Reserved structure for future content.', 'Estructura reservada para contenido futuro.'),
  type,
  children,
  tags: ['coming-soon'],
});

export const b2LearningMap: LearningMapContent = {
  level: 'B2',
  levelId: 'b2',
  title: L('B2 学习地图预留', 'B2 learning map reserved', 'Mapa B2 reservado'),
  description: L('B2 仍是预留阶段，但已经接入同一套学习地图结构。', 'B2 is still reserved, but it already uses the shared learning-map structure.', 'B2 está reservado, pero ya usa la estructura común del mapa.'),
  emptyMessage: L('B2 内容即将开放。', 'B2 content is coming soon.', 'Contenido B2 próximamente.'),
  nodes: [
    node('b2-coming-soon', '即将开放', 'Coming soon', 'Próximamente', 'section', [
      node('b2-vocabulary-preview', '词汇预留', 'Vocabulary placeholder', 'Vocabulario reservado', 'topic'),
      node('b2-grammar-preview', '语法预留', 'Grammar placeholder', 'Gramática reservada', 'topic'),
      node('b2-training-preview', '训练预留', 'Training placeholder', 'Entrenamiento reservado', 'topic'),
      node('b2-test-preview', '测试预留', 'Test placeholder', 'Prueba reservada', 'topic'),
    ]),
  ],
};
