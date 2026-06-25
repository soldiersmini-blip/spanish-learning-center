import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { RouteId } from '../../navigation/routes';
import { getBackLabel, getBreadcrumbRoutes } from '../../navigation/routes';

interface Props {
  routeId: RouteId;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  actions?: ReactNode;
  onBack: () => void;
  onNavigateRoute?: (routeId: RouteId) => void;
  backLabel?: string;
  className?: string;
}

export default function PageHeader({
  routeId,
  title,
  eyebrow,
  subtitle,
  actions,
  onBack,
  onNavigateRoute,
  backLabel,
  className = '',
}: Props) {
  const breadcrumbs = getBreadcrumbRoutes(routeId);
  const shouldShowBreadcrumbs = breadcrumbs.length >= 3;

  return (
    <header className={`sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 ${className}`}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-4">
        {shouldShowBreadcrumbs && (
          <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            {breadcrumbs.map((route, index) => {
              const isCurrent = index === breadcrumbs.length - 1;
              return (
                <span key={route.id} className="inline-flex min-w-0 items-center gap-1">
                  {isCurrent || !onNavigateRoute ? (
                    <span className={isCurrent ? 'text-slate-900 dark:text-white' : ''}>{route.title}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigateRoute(route.id)}
                      className="rounded-md px-1 py-0.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      {route.title}
                    </button>
                  )}
                  {!isCurrent && <ChevronRight className="h-3 w-3 shrink-0" />}
                </span>
              );
            })}
          </nav>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel || getBackLabel(routeId)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel || getBackLabel(routeId)}
          </button>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            {eyebrow && <p className="text-xs font-black uppercase tracking-widest text-coral-600 dark:text-coral-100">{eyebrow}</p>}
            <h1 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>}
          </div>

          {actions && <div className="w-full lg:w-auto">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
