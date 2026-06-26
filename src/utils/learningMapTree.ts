import type { LearningMapStats, LearningMapViewState, LearningNode, LearningNodeStatus } from '../types/learningMap';

export function flattenLearningNodes(nodes: LearningNode[]): LearningNode[] {
  return nodes.flatMap((node) => [node, ...flattenLearningNodes(node.children || [])]);
}

export function collectNodeIds(nodes: LearningNode[]) {
  return flattenLearningNodes(nodes).map((node) => node.id);
}

export function collectExpandableNodeIds(nodes: LearningNode[]) {
  return flattenLearningNodes(nodes)
    .filter((node) => (node.children || []).length > 0)
    .map((node) => node.id);
}

export function findLearningNode(nodes: LearningNode[], nodeId: string): LearningNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = findLearningNode(node.children || [], nodeId);
    if (child) return child;
  }
  return undefined;
}

export function getNodeStatus(state: LearningMapViewState, nodeId: string): LearningNodeStatus {
  return state.nodeStatusById[nodeId] || 'not_started';
}

export function getNextStatus(status: LearningNodeStatus): LearningNodeStatus {
  if (status === 'not_started') return 'in_progress';
  if (status === 'in_progress') return 'mastered';
  return 'not_started';
}

export function isNodeHiddenBySelfOrParent(node: LearningNode, hiddenNodeIds: string[]) {
  return hiddenNodeIds.includes(node.id);
}

export function shouldShowNode(node: LearningNode, state: LearningMapViewState) {
  const status = getNodeStatus(state, node.id);
  if (!state.showHidden && isNodeHiddenBySelfOrParent(node, state.hiddenNodeIds)) return false;
  if (state.hideMastered && status === 'mastered') return false;
  if (state.filterMode !== 'all' && status !== state.filterMode) return false;
  return true;
}

export function getLearningMapStats(nodes: LearningNode[], state: LearningMapViewState): LearningMapStats {
  const flat = flattenLearningNodes(nodes);
  return flat.reduce<LearningMapStats>((stats, node) => {
    const status = getNodeStatus(state, node.id);
    stats.total += 1;
    if (status === 'mastered') stats.mastered += 1;
    if (status === 'in_progress') stats.inProgress += 1;
    if (status === 'not_started') stats.notStarted += 1;
    if (state.hiddenNodeIds.includes(node.id)) stats.hidden += 1;
    return stats;
  }, { total: 0, mastered: 0, inProgress: 0, notStarted: 0, hidden: 0 });
}

export function getBranchStats(node: LearningNode, state: LearningMapViewState): LearningMapStats {
  return getLearningMapStats([node], state);
}

export function filterKnownNodeIds(ids: string[], knownIds: Set<string>) {
  return ids.filter((id) => knownIds.has(id));
}

export function sanitizeStatusMap(
  rawStatusMap: Record<string, unknown>,
  knownIds: Set<string>,
): Record<string, LearningNodeStatus> {
  const next: Record<string, LearningNodeStatus> = {};
  for (const [id, value] of Object.entries(rawStatusMap)) {
    if (!knownIds.has(id)) continue;
    if (value === 'not_started' || value === 'in_progress' || value === 'mastered') {
      next[id] = value;
    }
  }
  return next;
}
