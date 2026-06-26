import type { LevelId } from '../types';
import type { LearningLevel, LearningMapViewMode, LearningMapViewState, LearningNode } from '../types/learningMap';
import { collectExpandableNodeIds, collectNodeIds, filterKnownNodeIds, sanitizeStatusMap } from './learningMapTree';

const version = 1;
const viewStateVersion = 2;

export function learningMapStorageKey(level: LearningLevel) {
  return `learning-map:v${version}:${level}`;
}

export function createDefaultLearningMapState(level: LearningLevel, nodes: LearningNode[]): LearningMapViewState {
  const expandedNodeIds = getDefaultExpandedNodeIds(nodes);
  return {
    level,
    viewStateVersion,
    expandedNodeIds,
    hiddenNodeIds: [],
    nodeStatusById: {},
    hideMastered: false,
    showHidden: false,
    viewMode: 'standard',
    filterMode: 'all',
    updatedAt: new Date().toISOString(),
  };
}

export function readLegacyCompletedModuleIds(levelId: LevelId): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.localStorage.getItem(`spanish-progress-${levelId}`);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function isViewMode(value: unknown): value is LearningMapViewMode {
  return value === 'standard' || value === 'compact' || value === 'focus';
}

function normalizeLearningMapState(
  level: LearningLevel,
  nodes: LearningNode[],
  raw: Partial<LearningMapViewState> | null,
  legacyCompletedIds: string[],
): LearningMapViewState {
  const knownIds = new Set(collectNodeIds(nodes));
  const defaultState = createDefaultLearningMapState(level, nodes);
  const legacyStatus = legacyCompletedIds.reduce<Record<string, 'mastered'>>((statusMap, id) => {
    if (knownIds.has(id)) statusMap[id] = 'mastered';
    return statusMap;
  }, {});

  if (!raw) {
    return {
      ...defaultState,
      nodeStatusById: legacyStatus,
    };
  }

  const nodeStatusById = {
    ...legacyStatus,
    ...sanitizeStatusMap(raw.nodeStatusById || {}, knownIds),
  };
  const filterMode = raw.filterMode === 'not_started' || raw.filterMode === 'in_progress' || raw.filterMode === 'mastered'
    ? raw.filterMode
    : 'all';

  const rawExpandedNodeIds = Array.isArray(raw.expandedNodeIds)
    ? filterKnownNodeIds(raw.expandedNodeIds, knownIds)
    : defaultState.expandedNodeIds;
  const shouldUpgradeExpandedDefaults = !raw.viewStateVersion || raw.viewStateVersion < viewStateVersion;

  return {
    level,
    viewStateVersion,
    expandedNodeIds: shouldUpgradeExpandedDefaults
      ? Array.from(new Set([...rawExpandedNodeIds, ...defaultState.expandedNodeIds]))
      : rawExpandedNodeIds,
    hiddenNodeIds: filterKnownNodeIds(Array.isArray(raw.hiddenNodeIds) ? raw.hiddenNodeIds : [], knownIds),
    nodeStatusById,
    hideMastered: Boolean(raw.hideMastered),
    showHidden: Boolean(raw.showHidden),
    viewMode: isViewMode(raw.viewMode) ? raw.viewMode : 'standard',
    filterMode,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

export function readLearningMapState(level: LearningLevel, levelId: LevelId, nodes: LearningNode[]) {
  const legacyCompletedIds = readLegacyCompletedModuleIds(levelId);
  if (typeof window === 'undefined') {
    return normalizeLearningMapState(level, nodes, null, legacyCompletedIds);
  }

  try {
    const saved = window.localStorage.getItem(learningMapStorageKey(level));
    const parsed = saved ? JSON.parse(saved) as Partial<LearningMapViewState> : null;
    return normalizeLearningMapState(level, nodes, parsed, legacyCompletedIds);
  } catch {
    return normalizeLearningMapState(level, nodes, null, legacyCompletedIds);
  }
}

export function saveLearningMapState(level: LearningLevel, state: LearningMapViewState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(learningMapStorageKey(level), JSON.stringify({
    ...state,
    updatedAt: new Date().toISOString(),
  }));
}

export function syncLegacyCompletedModules(levelId: LevelId, nodes: LearningNode[], state: LearningMapViewState) {
  if (typeof window === 'undefined') return;
  const topLevelIds = new Set(nodes.map((node) => node.id));
  const masteredModuleIds = Object.entries(state.nodeStatusById)
    .filter(([id, status]) => topLevelIds.has(id) && status === 'mastered')
    .map(([id]) => id);
  window.localStorage.setItem(`spanish-progress-${levelId}`, JSON.stringify(masteredModuleIds));
}

export function expandedAllState(state: LearningMapViewState, nodes: LearningNode[]): LearningMapViewState {
  return { ...state, expandedNodeIds: collectExpandableNodeIds(nodes) };
}

function getDefaultExpandedNodeIds(nodes: LearningNode[]) {
  const expanded = new Set<string>();
  for (const node of nodes) {
    expanded.add(node.id);
  }

  const firstTwoSections = nodes.slice(0, 2);
  for (const section of firstTwoSections) {
    for (const child of section.children || []) {
      if ((child.children || []).length > 0) expanded.add(child.id);
    }
  }

  return Array.from(expanded);
}
