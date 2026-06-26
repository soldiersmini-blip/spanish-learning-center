import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import type { Locale } from '../../types';
import type { LearningMapViewState, LearningNode } from '../../types/learningMap';
import { t } from '../../i18n';
import { getBranchStats, getNodeStatus, shouldShowNode } from '../../utils/learningMapTree';
import LearningNodeStatusButton from './LearningNodeStatusButton';

interface Props {
  node: LearningNode;
  depth: number;
  locale: Locale;
  state: LearningMapViewState;
  selectedNodeId: string;
  onToggleExpanded: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  onCycleStatus: (nodeId: string) => void;
  onHide: (nodeId: string) => void;
  onRestore: (nodeId: string) => void;
}

export default function LearningTreeNode({
  node,
  depth,
  locale,
  state,
  selectedNodeId,
  onToggleExpanded,
  onSelect,
  onCycleStatus,
  onHide,
  onRestore,
}: Props) {
  if (!shouldShowNode(node, state)) return null;

  const children = node.children || [];
  const hasChildren = children.length > 0;
  const expanded = state.expandedNodeIds.includes(node.id);
  const hidden = state.hiddenNodeIds.includes(node.id);
  const status = getNodeStatus(state, node.id);
  const branchStats = getBranchStats(node, state);
  const selected = selectedNodeId === node.id;
  const compact = state.viewMode === 'compact';

  return (
    <li className="relative">
      {depth > 0 && <span className="absolute bottom-0 left-3 top-0 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />}
      <div
        className={`group relative flex gap-2 rounded-xl border p-3 transition ${
          selected
            ? 'border-brand-600 bg-brand-50 shadow-sm dark:border-brand-100 dark:bg-brand-500/15'
            : hidden
              ? 'border-dashed border-slate-300 bg-slate-50 opacity-80 dark:border-slate-700 dark:bg-slate-900/50'
              : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-100 dark:hover:bg-slate-800'
        }`}
        style={{ marginLeft: `${Math.min(depth, 3) * 18}px` }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) onToggleExpanded(node.id);
          }}
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 ${hasChildren ? 'hover:bg-slate-100 dark:hover:bg-slate-800' : 'opacity-40'}`}
          aria-label={expanded ? 'Collapse node' : 'Expand node'}
        >
          <ChevronRight className={`h-4 w-4 transition ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <button type="button" onClick={() => onSelect(node.id)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-950 dark:text-white">{t(node.title, locale)}</span>
            <LearningNodeStatusButton status={status} locale={locale} onCycle={() => onCycleStatus(node.id)} />
          </div>
          {!compact && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{node.description ? t(node.description, locale) : node.type}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span>{branchStats.mastered}/{branchStats.total} mastered</span>
            {node.tags?.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (hidden) onRestore(node.id);
            else onHide(node.id);
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label={hidden ? 'Restore node' : 'Hide node'}
        >
          {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
      {hasChildren && expanded && (
        <ul className="mt-2 space-y-2">
          {children.map((child) => (
            <LearningTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              locale={locale}
              state={state}
              selectedNodeId={selectedNodeId}
              onToggleExpanded={onToggleExpanded}
              onSelect={onSelect}
              onCycleStatus={onCycleStatus}
              onHide={onHide}
              onRestore={onRestore}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
