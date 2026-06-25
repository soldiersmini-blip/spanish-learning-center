import { Network } from 'lucide-react';
import { findNeuralEngineNode } from '../../utils/neural/neuralEngine';
import { useNeural } from './NeuralProvider';

interface Props {
  nodeId?: string;
  source: string;
  label?: string;
  compact?: boolean;
}

export default function NeuralTrigger({ nodeId, source, label = '查看神经元联络', compact = false }: Props) {
  const { activeNodeId, openNode } = useNeural();
  const node = findNeuralEngineNode(nodeId);

  if (!node) return null;

  const active = activeNodeId === node.id;

  return (
    <button
      type="button"
      data-source={source}
      aria-pressed={active}
      onClick={() => openNode(node.id)}
      className={`inline-flex items-center gap-2 rounded-xl border border-brand-600 font-bold transition ${
        active
          ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
          : 'text-brand-700 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-slate-900'
      } ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}
    >
      <Network className="h-4 w-4" />
      {label}
    </button>
  );
}
