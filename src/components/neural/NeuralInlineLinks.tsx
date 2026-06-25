import { getRelatedNodes } from '../../utils/neural/neuralEngine';
import NeuralTrigger from './NeuralTrigger';

interface Props {
  nodeId?: string;
}

export default function NeuralInlineLinks({ nodeId }: Props) {
  if (!nodeId) return null;
  const related = getRelatedNodes(nodeId).slice(0, 5);

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold text-slate-700 dark:text-slate-200">相关：</span>
        {related.map((item) => item.node && (
          <span key={`${item.relation.relationType}-${item.node.id}`} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            {item.node.title}
          </span>
        ))}
      </div>
      <div className="mt-3">
        <NeuralTrigger nodeId={nodeId} source="vocabulary-card" label="打开联络面板" compact />
      </div>
    </div>
  );
}
