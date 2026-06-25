import { ArrowLeft, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import NeuralWorkspace from '../components/neural/NeuralWorkspace';
import { findNeuralEngineNode, getNeuralGraph } from '../utils/neural/neuralEngine';

interface Props {
  nodeId: string;
  onBack: () => void;
  onOpenNode: (nodeId: string) => void;
}

export default function NeuralWorkspacePage({ nodeId, onBack, onOpenNode }: Props) {
  const [query, setQuery] = useState('');
  const node = findNeuralEngineNode(nodeId);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const normalized = query.toLocaleLowerCase('es');
    return getNeuralGraph().nodes
      .filter((item) => item.title.toLocaleLowerCase('es').includes(normalized) || item.zh?.includes(query))
      .slice(0, 8);
  }, [query]);

  return (
    <main className="min-h-screen bg-paper px-5 py-6 dark:bg-slate-950">
      <header className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-widest text-coral-600 dark:text-coral-100">{node?.level || 'Neural'} Workspace</p>
          <h1 className="text-xl font-black text-slate-950 dark:text-white">{node?.title || '神经元学习工作区'}</h1>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            placeholder="搜索节点"
          />
          {results.length > 0 && (
            <div className="absolute right-0 top-12 z-10 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-700 dark:bg-slate-900">
              {results.map((item) => (
                <button key={item.id} type="button" onClick={() => onOpenNode(item.id)} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                  {item.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-7xl">
        <NeuralWorkspace nodeId={nodeId} />
      </div>
    </main>
  );
}
