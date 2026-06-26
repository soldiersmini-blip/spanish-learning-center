import { useEffect, useMemo, useState } from 'react';
import type { LearningMapContent, LearningMapFilterMode, LearningMapViewMode, LearningMapViewState } from '../types/learningMap';
import { createDefaultLearningMapState, expandedAllState, readLearningMapState, saveLearningMapState, syncLegacyCompletedModules } from '../utils/learningMapStorage';
import { collectExpandableNodeIds, findLearningNode, getNextStatus } from '../utils/learningMapTree';

export function useLearningMapState(map: LearningMapContent) {
  const [state, setState] = useState<LearningMapViewState>(() => readLearningMapState(map.level, map.levelId, map.nodes));
  const [selectedNodeId, setSelectedNodeId] = useState(() => map.nodes[0]?.id || '');

  useEffect(() => {
    setState(readLearningMapState(map.level, map.levelId, map.nodes));
    setSelectedNodeId(map.nodes[0]?.id || '');
  }, [map.level, map.levelId, map.nodes]);

  useEffect(() => {
    saveLearningMapState(map.level, state);
    syncLegacyCompletedModules(map.levelId, map.nodes, state);
  }, [map.level, map.levelId, map.nodes, state]);

  const selectedNode = useMemo(
    () => findLearningNode(map.nodes, selectedNodeId) || map.nodes[0],
    [map.nodes, selectedNodeId],
  );

  function toggleExpanded(nodeId: string) {
    setState((current) => ({
      ...current,
      expandedNodeIds: current.expandedNodeIds.includes(nodeId)
        ? current.expandedNodeIds.filter((id) => id !== nodeId)
        : [...current.expandedNodeIds, nodeId],
    }));
  }

  function expandAll() {
    setState((current) => expandedAllState(current, map.nodes));
  }

  function collapseAll() {
    setState((current) => ({ ...current, expandedNodeIds: [] }));
  }

  function cycleStatus(nodeId: string) {
    setState((current) => {
      const currentStatus = current.nodeStatusById[nodeId] || 'not_started';
      return {
        ...current,
        nodeStatusById: {
          ...current.nodeStatusById,
          [nodeId]: getNextStatus(currentStatus),
        },
      };
    });
  }

  function hideNode(nodeId: string) {
    setState((current) => ({
      ...current,
      hiddenNodeIds: current.hiddenNodeIds.includes(nodeId) ? current.hiddenNodeIds : [...current.hiddenNodeIds, nodeId],
    }));
  }

  function restoreNode(nodeId: string) {
    setState((current) => ({
      ...current,
      hiddenNodeIds: current.hiddenNodeIds.filter((id) => id !== nodeId),
    }));
  }

  function setHideMastered(hideMastered: boolean) {
    setState((current) => ({ ...current, hideMastered }));
  }

  function setShowHidden(showHidden: boolean) {
    setState((current) => ({ ...current, showHidden }));
  }

  function setViewMode(viewMode: LearningMapViewMode) {
    setState((current) => ({ ...current, viewMode }));
  }

  function setFilterMode(filterMode: LearningMapFilterMode) {
    setState((current) => ({ ...current, filterMode }));
  }

  function resetView() {
    setState((current) => ({
      ...createDefaultLearningMapState(map.level, map.nodes),
      nodeStatusById: current.nodeStatusById,
      expandedNodeIds: map.nodes.map((node) => node.id),
    }));
  }

  function openBranch(nodeId: string) {
    const node = findLearningNode(map.nodes, nodeId);
    setSelectedNodeId(nodeId);
    if (node && (node.children || []).length > 0 && !state.expandedNodeIds.includes(nodeId)) {
      toggleExpanded(nodeId);
    }
  }

  return {
    state,
    selectedNode,
    selectedNodeId,
    allExpandableIds: collectExpandableNodeIds(map.nodes),
    actions: {
      toggleExpanded,
      expandAll,
      collapseAll,
      cycleStatus,
      hideNode,
      restoreNode,
      setHideMastered,
      setShowHidden,
      setViewMode,
      setFilterMode,
      resetView,
      openBranch,
      setSelectedNodeId,
    },
  };
}
