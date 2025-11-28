// Role-Based Access Control (RBAC) system for Natus Vincere Academy

export type UserRole = 'administrador' | 'coordenador' | 'comissao' | 'medico' | 'atleta' | 'familiar' | 'torcedor';

export type ModuleName = 'dashboard' | 'athletes' | 'teams' | 'training' | 'games' | 'adversaries' | 'stadiums' | 'tournaments' | 'wellness' | 'rpe' | 'fitness_dashboard' | 'medical' | 'financial' | 'store' | 'reports' | 'ai_insights' | 'settings' | 'user_management';

export interface Permission {
  module: string;
  actions: string[];
}

export interface RoleConfig {
  name: string;
  displayName: string;
  permissions: Permission[];
  description: string;
}

// Define permissions for each module
export const MODULES = {
  DASHBOARD: 'dashboard',
  ATHLETES: 'athletes', 
  TEAMS: 'teams',
  TRAINING: 'training',
  GAMES: 'games',
  ADVERSARIES: 'adversaries',
  STADIUMS: 'stadiums',
  TOURNAMENTS: 'tournaments',
  WELLNESS: 'wellness',
  RPE: 'rpe',
  FITNESS_DASHBOARD: 'fitness_dashboard',
  MEDICAL: 'medical',
  FINANCIAL: 'financial',
  STORE: 'store',
  REPORTS: 'reports',
  AI_INSIGHTS: 'ai_insights',
  SETTINGS: 'settings',
  USER_MANAGEMENT: 'user_management'
} as const;

// Module information for display
export const MODULE_INFO = {
  [MODULES.DASHBOARD]: {
    name: 'Dashboard',
    description: 'Painel principal com estatísticas e resumos',
    icon: 'BarChart3'
  },
  [MODULES.ATHLETES]: {
    name: 'Atletas',
    description: 'Gerenciamento de atletas e perfis',
    icon: 'Users'
  },
  [MODULES.TEAMS]: {
    name: 'Equipes',
    description: 'Organização de equipes e categorias',
    icon: 'Users'
  },
  [MODULES.TRAINING]: {
    name: 'Treinamentos',
    description: 'Sessões de treino e avaliações',
    icon: 'Dumbbell'
  },
  [MODULES.GAMES]: {
    name: 'Jogos',
    description: 'Partidas, torneios e avaliações',
    icon: 'Trophy'
  },
  [MODULES.ADVERSARIES]: {
    name: 'Adversários',
    description: 'Equipes externas para torneios',
    icon: 'Users'
  },
  [MODULES.STADIUMS]: {
    name: 'Estádios',
    description: 'Locais de jogos e torneios',
    icon: 'MapPin'
  },
  [MODULES.TOURNAMENTS]: {
    name: 'Gestão de Torneios',
    description: 'Sistema de gestão completo de torneios e competições',
    icon: 'Trophy'
  },
  [MODULES.WELLNESS]: {
    name: 'Wellness & RPE',
    description: 'Monitoramento diário e avaliação pós-treino',
    icon: 'Sun'
  },
  [MODULES.RPE]: {
    name: 'RPE',
    description: 'Avaliação de esforço percebido pós-treino',
    icon: 'Activity'
  },
  [MODULES.FITNESS_DASHBOARD]: {
    name: 'Fitness Dashboard',
    description: 'Monitoramento de aptidão física e prevenção de lesões',
    icon: 'Heart'
  },
  [MODULES.MEDICAL]: {
    name: 'Médico',
    description: 'Registros médicos e atestados',
    icon: 'Stethoscope'
  },
  [MODULES.FINANCIAL]: {
    name: 'Financeiro',
    description: 'Transações e controle financeiro',
    icon: 'DollarSign'
  },
  [MODULES.STORE]: {
    name: 'Loja',
    description: 'Gerenciamento de produtos da loja',
    icon: 'ShoppingBag'
  },
  [MODULES.REPORTS]: {
    name: 'Relatórios',
    description: 'Relatórios e análises detalhadas',
    icon: 'FileText'
  },
  [MODULES.AI_INSIGHTS]: {
    name: 'Insights IA',
    description: 'Análises inteligentes e recomendações',
    icon: 'Brain'
  },
  [MODULES.SETTINGS]: {
    name: 'Configurações',
    description: 'Configurações do sistema',
    icon: 'Settings'
  },
  [MODULES.USER_MANAGEMENT]: {
    name: 'Usuários',
    description: 'Gerenciamento de usuários e permissões',
    icon: 'UserCog'
  }
} as const;

export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  EXPORT: 'export',
  MANAGE: 'manage'
} as const;

// Role configurations with specific permissions
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  administrador: {
    name: 'administrador',
    displayName: 'Administrador',
    description: 'Acesso total à plataforma',
    permissions: [
      { module: MODULES.DASHBOARD, actions: [ACTIONS.VIEW] },
      { module: MODULES.ATHLETES, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.TEAMS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.TRAINING, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.GAMES, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.ADVERSARIES, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.STADIUMS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.TOURNAMENTS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.WELLNESS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.RPE, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.FITNESS_DASHBOARD, actions: [ACTIONS.VIEW, ACTIONS.CREATE] },
      { module: MODULES.MEDICAL, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.FINANCIAL, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.STORE, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.REPORTS, actions: [ACTIONS.VIEW, ACTIONS.EXPORT] },
      { module: MODULES.AI_INSIGHTS, actions: [ACTIONS.VIEW, ACTIONS.CREATE] },
      { module: MODULES.SETTINGS, actions: [ACTIONS.VIEW, ACTIONS.EDIT] },
      { module: MODULES.USER_MANAGEMENT, actions: [ACTIONS.MANAGE] }
    ]
  },
  coordenador: {
    name: 'coordenador',
    displayName: 'Coordenador',
    description: 'Acesso a todos os módulos, exceto financeiro',
    permissions: [
      { module: MODULES.DASHBOARD, actions: [ACTIONS.VIEW] },
      { module: MODULES.ATHLETES, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.TEAMS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.TRAINING, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.GAMES, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.ADVERSARIES, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.STADIUMS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.TOURNAMENTS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.WELLNESS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.RPE, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.FITNESS_DASHBOARD, actions: [ACTIONS.VIEW, ACTIONS.CREATE] },
      { module: MODULES.MEDICAL, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.REPORTS, actions: [ACTIONS.VIEW, ACTIONS.EXPORT] },
      { module: MODULES.AI_INSIGHTS, actions: [ACTIONS.VIEW, ACTIONS.CREATE] },
      { module: MODULES.SETTINGS, actions: [ACTIONS.VIEW] }
    ]
  },
  comissao: {
    name: 'comissao',
    displayName: 'Comissão Técnica',
    description: 'Acesso aos módulos de treinos, jogos e wellness',
    permissions: [
      { module: MODULES.DASHBOARD, actions: [ACTIONS.VIEW] },
      { module: MODULES.ATHLETES, actions: [ACTIONS.VIEW] },
      { module: MODULES.TRAINING, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.GAMES, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.ADVERSARIES, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.STADIUMS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.WELLNESS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.RPE, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.REPORTS, actions: [ACTIONS.VIEW] },
      { module: MODULES.SETTINGS, actions: [ACTIONS.VIEW] }
    ]
  },
  medico: {
    name: 'medico',
    displayName: 'Médico',
    description: 'Acesso ao departamento médico',
    permissions: [
      { module: MODULES.DASHBOARD, actions: [ACTIONS.VIEW] },
      { module: MODULES.ATHLETES, actions: [ACTIONS.VIEW] },
      { module: MODULES.MEDICAL, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE] },
      { module: MODULES.WELLNESS, actions: [ACTIONS.VIEW] },
      { module: MODULES.RPE, actions: [ACTIONS.VIEW] },
      { module: MODULES.FITNESS_DASHBOARD, actions: [ACTIONS.VIEW] },
      { module: MODULES.REPORTS, actions: [ACTIONS.VIEW] },
      { module: MODULES.SETTINGS, actions: [ACTIONS.VIEW] }
    ]
  },
  atleta: {
    name: 'atleta',
    displayName: 'Atleta',
    description: 'Acesso aos módulos de treinos, jogos e wellness',
    permissions: [
      { module: MODULES.DASHBOARD, actions: [ACTIONS.VIEW] },
      { module: MODULES.TRAINING, actions: [ACTIONS.VIEW] },
      { module: MODULES.GAMES, actions: [ACTIONS.VIEW] },
      { module: MODULES.WELLNESS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
      { module: MODULES.RPE, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
      { module: MODULES.SETTINGS, actions: [ACTIONS.VIEW] }
    ]
  },
  familiar: {
    name: 'familiar',
    displayName: 'Familiar',
    description: 'Acesso aos módulos de treinos, jogos e wellness (mesmo acesso que atleta)',
    permissions: [
      { module: MODULES.DASHBOARD, actions: [ACTIONS.VIEW] },
      { module: MODULES.TRAINING, actions: [ACTIONS.VIEW] },
      { module: MODULES.GAMES, actions: [ACTIONS.VIEW] },
      { module: MODULES.WELLNESS, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
      { module: MODULES.RPE, actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT] },
      { module: MODULES.SETTINGS, actions: [ACTIONS.VIEW] }
    ]
  },
  torcedor: {
    name: 'torcedor',
    displayName: 'Torcedor',
    description: 'Acesso aos jogos e loja do clube',
    permissions: [
      { module: MODULES.GAMES, actions: [ACTIONS.VIEW] },
      { module: MODULES.STORE, actions: [ACTIONS.VIEW] }
    ]
  }
};

// Utility functions for permission checking
export function hasPermission(userRole: UserRole, module: string, action: string): boolean {
  const roleConfig = ROLE_CONFIGS[userRole];
  if (!roleConfig) return false;

  const modulePermission = roleConfig.permissions.find(p => p.module === module);
  if (!modulePermission) return false;

  return modulePermission.actions.includes(action);
}

export function hasModuleAccess(userRole: UserRole, module: string): boolean {
  const roleConfig = ROLE_CONFIGS[userRole];
  if (!roleConfig) return false;

  return roleConfig.permissions.some(p => p.module === module);
}

export function getAccessibleModules(userRole: UserRole): string[] {
  const roleConfig = ROLE_CONFIGS[userRole];
  if (!roleConfig) return [];

  return roleConfig.permissions.map(p => p.module);
}

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  // Map routes to modules
  const routeModuleMap: Record<string, string> = {
    '/': MODULES.DASHBOARD,
    '/dashboard': MODULES.DASHBOARD,
    '/athletes': MODULES.ATHLETES,
    '/teams': MODULES.TEAMS,
    '/training': MODULES.TRAINING,
    '/games': MODULES.GAMES,
    '/adversaries': MODULES.ADVERSARIES,
    '/stadiums': MODULES.STADIUMS,
    '/tournament-management': MODULES.GAMES,
    '/wellness': MODULES.WELLNESS,
    '/rpe': MODULES.WELLNESS,
    '/fitness-dashboard': MODULES.FITNESS_DASHBOARD,
    '/medical': MODULES.MEDICAL,
    '/financial': MODULES.FINANCIAL,
    '/reports': MODULES.REPORTS,
    '/ai-insights': MODULES.AI_INSIGHTS,
    '/settings': MODULES.SETTINGS
  };

  const module = routeModuleMap[route];
  if (!module) return false;

  return hasModuleAccess(userRole, module);
}

// Navigation items based on role
export function getNavigationItems(userRole: UserRole) {
  const accessibleModules = getAccessibleModules(userRole);
  
  const allNavItems = [
    { path: '/', label: 'Dashboard', icon: 'home', module: MODULES.DASHBOARD },
    { path: '/athletes', label: 'Atletas', icon: 'users', module: MODULES.ATHLETES },
    { path: '/teams', label: 'Equipes', icon: 'shield', module: MODULES.TEAMS },
    { path: '/training', label: 'Treinos', icon: 'dumbbell', module: MODULES.TRAINING },
    { path: '/games', label: 'Jogos', icon: 'trophy', module: MODULES.GAMES },
    { path: '/adversaries', label: 'Adversários', icon: 'users', module: MODULES.ADVERSARIES },
    { path: '/stadiums', label: 'Estádios', icon: 'map-pin', module: MODULES.STADIUMS },
    { path: '/tournament-management', label: 'Gestão de Torneios', icon: 'trophy', module: MODULES.GAMES },
    { path: '/wellness', label: 'Wellness & RPE', icon: 'sun', module: MODULES.WELLNESS },
    { path: '/fitness-dashboard', label: 'Fitness Dashboard', icon: 'heart', module: MODULES.FITNESS_DASHBOARD },
    { path: '/medical', label: 'Depto. Médico', icon: 'stethoscope', module: MODULES.MEDICAL },
    { path: '/financial', label: 'Financeiro', icon: 'dollar-sign', module: MODULES.FINANCIAL },
    { path: '/store', label: 'Loja', icon: 'shopping-bag', module: MODULES.STORE },
    { path: '/reports', label: 'Relatórios', icon: 'bar-chart', module: MODULES.REPORTS },
    { path: '/ai-insights', label: 'Análise Inteligente', icon: 'brain', module: MODULES.AI_INSIGHTS },
    { path: '/user-registrations', label: 'Gerenciar Usuários', icon: 'users', module: MODULES.USER_MANAGEMENT },
    { path: '/settings', label: 'Configurações', icon: 'settings', module: MODULES.SETTINGS }
  ];

  return allNavItems.filter(item => accessibleModules.includes(item.module));
}