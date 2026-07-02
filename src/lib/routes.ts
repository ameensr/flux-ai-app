// src/lib/routes.ts
// Single source of truth for all application route paths.
// Import ROUTES everywhere — never hardcode path strings.

export const ROUTES = {
  // Public
  landing:          '/',
  login:            '/login',

  // Authenticated — app shell
  dashboard:        '/dashboard',
  bugRefiner:       '/bug-refiner',
  testGenerator:    '/test-generator',
  writingAssistant: '/writing-assistant',
  history:          '/history',
  settings:         '/settings',

  qaReport:         '/qa-report',
  reportPreview:    '/report-preview',

  // Admin only
  admin:            '/admin',
  adminUsers:       '/admin/users',
  adminAI:          '/admin/ai-providers',
  adminPermissions: '/admin/permissions',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

/** Map a route path back to the RBAC module key used by usePermissions */
export const ROUTE_MODULE_KEY: Partial<Record<AppRoute, string>> = {
  [ROUTES.dashboard]:        'dashboard',
  [ROUTES.bugRefiner]:       'bug-refiner',
  [ROUTES.testGenerator]:    'test-generator',
  [ROUTES.writingAssistant]: 'writing-assistant',
  [ROUTES.qaReport]:         'qa-report',
  [ROUTES.reportPreview]:    'qa-report',
  [ROUTES.history]:          'history',
  [ROUTES.settings]:         'settings',
  [ROUTES.admin]:            'admin',
  [ROUTES.adminUsers]:       'admin',
  [ROUTES.adminAI]:          'admin',
  [ROUTES.adminPermissions]: 'admin',
}

