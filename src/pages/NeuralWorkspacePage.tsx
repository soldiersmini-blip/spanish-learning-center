import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import NeuralWorkspace from '../components/neural/NeuralWorkspace';
import PageHeader from '../components/navigation/PageHeader';
import type { RouteId } from '../navigation/routes';
import { findNeuralEngineNode, getNeuralGraph } from '../utils/neural/neuralEngine';

interface Props {
  nodeId: string;
  onBack: () => void;
  onOpenNode: (nodeId: string) => void;
  onNavigateRoute: (routeId: RouteId) => void;
}

export default function NeuralWorkspacePage({ nodeId, onBack, onOpenNode, onNavigateRoute }: Props) {
  const [query, setQuery] = useState('');
  const node = findNeuralEngineNode(nodeId);
  const routeId: RouteId = node?.level === 'A2' ? 'a2-neural' : 'a1-neural';
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const normalized = query.toLocaleLowerCase('es');
    return getNeuralGraph().nodes
      .filter((item) => item.title.toLocaleLowerCase('es').includes(normalized) || item.zh?.includes(query))
      .slice(0, 8);
  }, [query]);

  return (
    <main className="min-h-screen bg-paper dark:bg-slate-950">
      <PageHeader
        routeId={routeId}
        title={node?.title || 'Neural Link'}
        eyebrow={`${node?.level || 'Neural'} Workspace`}
        onBack={onBack}
        onNavigateRoute={onNavigateRoute}
        actions={(
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
        )}
      />
      <div className="mx-auto max-w-7xl px-5 py-6">
        <NeuralWorkspace nodeId={nodeId} />
      </div>
    </main>
  );
}
