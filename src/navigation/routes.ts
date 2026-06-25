export type RouteId =
  | 'home'
  | 'a1'
  | 'a2'
  | 'b1'
  | 'b2'
  | 'settings'
  | 'account'
  | 'account-login'
  | 'account-register'
  | 'account-verify-email'
  | 'account-password-recovery'
  | 'account-sync'
  | 'account-delete'
  | 'a1-test'
  | 'a1-test-session'
  | 'a1-test-result'
  | 'a2-test'
  | 'a2-test-session'
  | 'a2-test-result'
  | 'a1-neural'
  | 'a2-neural';

export type RouteDefinition = {
  id: RouteId;
  path: string;
  title: string;
  parentRouteId?: RouteId;
  navigationLevel: number;
};

export const routeDefinitions = [
  { id: 'home', path: '#/', title: '学习中心', navigationLevel: 0 },
  { id: 'a1', path: '#/a1', title: 'A1', parentRouteId: 'home', navigationLevel: 1 },
  { id: 'a2', path: '#/a2', title: 'A2', parentRouteId: 'home', navigationLevel: 1 },
  { id: 'b1', path: '#/b1', title: 'B1', parentRouteId: 'home', navigationLevel: 1 },
  { id: 'b2', path: '#/b2', title: 'B2', parentRouteId: 'home', navigationLevel: 1 },
  { id: 'settings', path: '#/settings', title: '设置', parentRouteId: 'home', navigationLevel: 1 },
  { id: 'account', path: '#/account', title: '个人中心', parentRouteId: 'home', navigationLevel: 1 },
  { id: 'account-login', path: '#/account/login', title: '登录', parentRouteId: 'account', navigationLevel: 2 },
  { id: 'account-register', path: '#/account/register', title: '注册', parentRouteId: 'account', navigationLevel: 2 },
  { id: 'account-verify-email', path: '#/account/verify-email', title: '邮箱验证', parentRouteId: 'account', navigationLevel: 2 },
  { id: 'account-password-recovery', path: '#/account/password-recovery', title: '密码恢复', parentRouteId: 'account', navigationLevel: 2 },
  { id: 'account-sync', path: '#/account/sync', title: '同步管理', parentRouteId: 'account', navigationLevel: 2 },
  { id: 'account-delete', path: '#/account/delete', title: '注销账号', parentRouteId: 'account', navigationLevel: 2 },
  { id: 'a1-test', path: '#/a1/test/settings', title: 'A1 词汇训练中心', parentRouteId: 'a1', navigationLevel: 2 },
  { id: 'a1-test-session', path: '#/a1/test/session', title: 'A1 答题', parentRouteId: 'a1-test', navigationLevel: 3 },
  { id: 'a1-test-result', path: '#/a1/test/result', title: 'A1 测试结果', parentRouteId: 'a1-test', navigationLevel: 3 },
  { id: 'a2-test', path: '#/a2/test/settings', title: 'A2 词汇训练中心', parentRouteId: 'a2', navigationLevel: 2 },
  { id: 'a2-test-session', path: '#/a2/test/session', title: 'A2 答题', parentRouteId: 'a2-test', navigationLevel: 3 },
  { id: 'a2-test-result', path: '#/a2/test/result', title: 'A2 测试结果', parentRouteId: 'a2-test', navigationLevel: 3 },
  { id: 'a1-neural', path: '#/neural/:nodeId', title: 'A1 Neural Link', parentRouteId: 'a1', navigationLevel: 2 },
  { id: 'a2-neural', path: '#/neural/:nodeId', title: 'A2 Neural Link', parentRouteId: 'a2', navigationLevel: 2 },
] satisfies RouteDefinition[];

export const routeMap = new Map<RouteId, RouteDefinition>(routeDefinitions.map((route) => [route.id, route]));

export function getRouteDefinition(routeId: RouteId) {
  const route = routeMap.get(routeId);
  if (!route) throw new Error(`Unknown route: ${routeId}`);
  return route;
}

export function getParentRoute(routeId: RouteId) {
  const parentRouteId = getRouteDefinition(routeId).parentRouteId;
  return parentRouteId ? getRouteDefinition(parentRouteId) : undefined;
}

export function getBreadcrumbRoutes(routeId: RouteId) {
  const chain: RouteDefinition[] = [];
  const visited = new Set<RouteId>();
  let current: RouteDefinition | undefined = getRouteDefinition(routeId);

  while (current) {
    if (visited.has(current.id)) throw new Error(`Navigation cycle at ${current.id}`);
    visited.add(current.id);
    chain.unshift(current);
    current = current.parentRouteId ? getRouteDefinition(current.parentRouteId) : undefined;
  }

  return chain;
}

export function getBackLabel(routeId: RouteId) {
  const parent = getParentRoute(routeId);
  return parent ? `返回 ${parent.title}` : '返回';
}

export function levelToTestRouteId(level: 'A1' | 'A2'): Extract<RouteId, 'a1-test' | 'a2-test'> {
  return level === 'A1' ? 'a1-test' : 'a2-test';
}

export function levelToSessionRouteId(level: 'A1' | 'A2'): Extract<RouteId, 'a1-test-session' | 'a2-test-session'> {
  return level === 'A1' ? 'a1-test-session' : 'a2-test-session';
}

export function levelToResultRouteId(level: 'A1' | 'A2'): Extract<RouteId, 'a1-test-result' | 'a2-test-result'> {
  return level === 'A1' ? 'a1-test-result' : 'a2-test-result';
}
