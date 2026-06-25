import { ArrowLeft, X } from 'lucide-react';
import type { PointerEvent, ReactNode } from 'react';

interface Props {
  title: string;
  eyebrow?: string;
  backLabel?: string;
  onBack?: () => void;
  onClose?: () => void;
  onDragPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  draggable?: boolean;
  actions?: ReactNode;
}

export default function NeuralPanelHeader({ title, eyebrow = 'Neural Link', backLabel, onBack, onClose, onDragPointerDown, draggable = false, actions }: Props) {
  return (
    <header
      className={`flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 ${draggable ? 'md:cursor-move md:select-none' : ''}`}
      onPointerDown={onDragPointerDown}
      data-neural-drag-handle={draggable ? 'true' : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-coral-600 dark:text-coral-100">{eyebrow}</p>
          <h2 className="truncate text-base font-black text-slate-950 dark:text-white">{title}</h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-coral-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="关闭 Neural Link"
            aria-label="关闭 Neural Link 面板"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {(onBack || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {onBack && backLabel ? (
            <button
              type="button"
              onClick={onBack}
              onPointerDown={(event) => event.stopPropagation()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
              aria-label={backLabel}
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </button>
          ) : (
            <span />
          )}
          {actions}
        </div>
      )}
    </header>
  );
}
