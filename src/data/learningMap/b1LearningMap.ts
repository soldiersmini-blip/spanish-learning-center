import type { LearningMapContent, LearningNode } from '../../types/learningMap';

const L = (zh: string, en: string, es: string) => ({ zh, en, es });
const node = (id: string, zh: string, en: string, es: string, type: LearningNode['type'], children: LearningNode[] = []): LearningNode => ({
  id,
  level: 'B1',
  title: L(zh, en, es),
  description: L('预留结构，正式内容稍后接入。', 'Reserved structure for future content.', 'Estructura reservada para contenido futuro.'),
  type,
  children,
  tags: ['coming-soon'],
});

export const b1LearningMap: LearningMapContent = {
  level: 'B1',
  levelId: 'b1',
  title: L('B1 学习地图预留', 'B1 learning map reserved', 'Mapa B1 reservado'),
  description: L('B1 仍是预留阶段，但已经接入同一套学习地图结构。', 'B1 is still reserved, but it already uses the shared learning-map structure.', 'B1 está reservado, pero ya usa la estructura común del mapa.'),
  emptyMessage: L('B1 内容即将开放。', 'B1 content is coming soon.', 'Contenido B1 próximamente.'),
  nodes: [
    node('b1-coming-soon', '即将开放', 'Coming soon', 'Próximamente', 'section', [
      node('b1-vocabulary-preview', '词汇预留', 'Vocabulary placeholder', 'Vocabulario reservado', 'topic'),
      node('b1-grammar-preview', '语法预留', 'Grammar placeholder', 'Gramática reservada', 'topic'),
      node('b1-training-preview', '训练预留', 'Training placeholder', 'Entrenamiento reservado', 'topic'),
      node('b1-test-preview', '测试预留', 'Test placeholder', 'Prueba reservada', 'topic'),
    ]),
  ],
};
