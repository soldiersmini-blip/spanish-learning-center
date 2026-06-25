import type { ReactNode } from 'react';
import { useAuth } from './useAuth';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function AuthGuard({ children, fallback }: Props) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="card p-5 text-sm text-slate-600 dark:text-slate-300">正在检查账号状态...</div>;
  if (!isAuthenticated) return fallback || <div className="card p-5 text-sm text-slate-600 dark:text-slate-300">请先登录账号。</div>;
  return <>{children}</>;
}
