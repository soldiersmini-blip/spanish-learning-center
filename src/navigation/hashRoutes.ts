import type { RouteId } from './routes';

export function buildHashUrl(path: string, query?: URLSearchParams | string) {
  const cleanPath = path.replace(/^\/+/, '');
  const queryText = typeof query === 'string' ? query : query?.toString();
  return `#/${cleanPath}${queryText ? `?${queryText}` : ''}`;
}

export function routeIdToHash(routeId: RouteId, query?: string) {
  if (routeId === 'home') return buildHashUrl('', query);
  if (routeId === 'a1-test') return buildHashUrl('a1/test/settings', query);
  if (routeId === 'a1-test-session') return buildHashUrl('a1/test/session', query);
  if (routeId === 'a1-test-result') return buildHashUrl('a1/test/result', query);
  if (routeId === 'a2-test') return buildHashUrl('a2/test/settings', query);
  if (routeId === 'a2-test-session') return buildHashUrl('a2/test/session', query);
  if (routeId === 'a2-test-result') return buildHashUrl('a2/test/result', query);
  if (routeId === 'a1-neural' || routeId === 'a2-neural') return buildHashUrl('neural');
  if (routeId === 'account-login') return buildHashUrl('account/login', query);
  if (routeId === 'account-register') return buildHashUrl('account/register', query);
  if (routeId === 'account-verify-email') return buildHashUrl('account/verify-email', query);
  if (routeId === 'account-password-recovery') return buildHashUrl('account/password-recovery', query);
  if (routeId === 'account-sync') return buildHashUrl('account/sync', query);
  if (routeId === 'account-delete') return buildHashUrl('account/delete', query);
  return buildHashUrl(routeId);
}
