import { BrainCircuit, Network, Route, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { NeuralLevel } from '../../types/neuralEngine';
import { getNeuralEngineReport, getNeuralGraph } from '../../utils/neural/neuralEngine';
import { neuralProgressUpdatedEvent, readNeuralProgress } from './NeuralProgress';

interface Props {
  level: Extract<NeuralLevel, 'A1' | 'A2'>;
}

export default function NeuralLearningStats({ level }: Props) {
  const [progress, setProgress] = useState(readNeuralProgress);
  const graph = getNeuralGraph();
  const report = getNeuralEngineReport();

  useEffect(() => {
    function refresh() {
      setProgress(readNeuralProgress());
    }

    window.addEventListener('storage', refresh);
    window.addEventListener(neuralProgressUpdatedEvent, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(neuralProgressUpdatedEvent, refresh);
    };
  }, []);

  const stats = useMemo(() => {
    const levelNodes = graph.nodes.filter((node) => node.level === level);
    const wordNodes = levelNodes.filter((node) => node.type === 'word');
    const relationCount = wordNodes.reduce((sum, node) => sum + node.relations.length, 0);
    const visited = progress.visitedNodeIds.filter((id) => graph.nodeById.get(id)?.level === level);
    const visitedWords = visited.filter((id) => graph.nodeById.get(id)?.type === 'word').length;
    const coverage = level === 'A1'
      ? Math.round((report.a1Coverage / Math.max(1, report.a1Vocabulary)) * 100)
      : Math.round((report.a2Coverage / Math.max(1, report.a2Vocabulary)) * 100);

    return {
      nodeCount: levelNodes.length,
      wordCount: wordNodes.length,
      relationCount,
      visitedWords,
      visitedTotal: visited.length,
      coverage,
    };
  }, [graph, level, progress, report]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">
          <BrainCircuit className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-coral-600 dark:text-coral-100">Neural Link</p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{level} 神经元联络图谱</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            每个词都连接到场景、语法、近义词、易混词和学习路径，打开任意词卡即可继续联想学习。
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <Metric icon={<Sparkles className="h-4 w-4" />} label="词库覆盖" value={`${stats.coverage}%`} />
        <Metric icon={<Network className="h-4 w-4" />} label="节点 / 联络" value={`${stats.nodeCount} / ${stats.relationCount}`} />
        <Metric icon={<Route className="h-4 w-4" />} label="已浏览词汇" value={`${stats.visitedWords} / ${stats.wordCount}`} />
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
        <div className="mb-2 flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>当前级别联络完整度</span>
          <span>{stats.coverage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${stats.coverage}%` }} />
        </div>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <span className="text-brand-600 dark:text-brand-100">{icon}</span>
        {label}
      </span>
      <strong className="text-slate-950 dark:text-white">{value}</strong>
    </div>
  );
}
