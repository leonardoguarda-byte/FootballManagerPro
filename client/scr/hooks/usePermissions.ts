import { useAuth } from './useAuth';
import { hasPermission, MODULES, ACTIONS, type UserRole } from '@shared/rbac';

/**
 * Hook to check user permissions in the frontend
 * Returns functions to check if the current user can perform specific actions
 */
export function usePermissions() {
  const { user } = useAuth();

  const checkPermission = (module: string, action: string): boolean => {
    if (!user?.role) return false;
    return hasPermission(user.role as UserRole, module, action);
  };

  return {
    // Generic permission check
    can: checkPermission,
    
    // Module-specific permission checks
    canView: (module: string) => checkPermission(module, ACTIONS.VIEW),
    canCreate: (module: string) => checkPermission(module, ACTIONS.CREATE),
    canEdit: (module: string) => checkPermission(module, ACTIONS.EDIT),
    canDelete: (module: string) => checkPermission(module, ACTIONS.DELETE),
    canExport: (module: string) => checkPermission(module, ACTIONS.EXPORT),
    canManage: (module: string) => checkPermission(module, ACTIONS.MANAGE),
    
    // Convenience getters for common modules
    athletes: {
      canView: checkPermission(MODULES.ATHLETES, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.ATHLETES, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.ATHLETES, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.ATHLETES, ACTIONS.DELETE),
    },
    teams: {
      canView: checkPermission(MODULES.TEAMS, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.TEAMS, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.TEAMS, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.TEAMS, ACTIONS.DELETE),
    },
    training: {
      canView: checkPermission(MODULES.TRAINING, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.TRAINING, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.TRAINING, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.TRAINING, ACTIONS.DELETE),
    },
    games: {
      canView: checkPermission(MODULES.GAMES, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.GAMES, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.GAMES, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.GAMES, ACTIONS.DELETE),
    },
    tournaments: {
      canView: checkPermission(MODULES.TOURNAMENTS, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.TOURNAMENTS, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.TOURNAMENTS, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.TOURNAMENTS, ACTIONS.DELETE),
    },
    adversaries: {
      canView: checkPermission(MODULES.ADVERSARIES, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.ADVERSARIES, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.ADVERSARIES, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.ADVERSARIES, ACTIONS.DELETE),
    },
    stadiums: {
      canView: checkPermission(MODULES.STADIUMS, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.STADIUMS, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.STADIUMS, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.STADIUMS, ACTIONS.DELETE),
    },
    medical: {
      canView: checkPermission(MODULES.MEDICAL, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.MEDICAL, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.MEDICAL, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.MEDICAL, ACTIONS.DELETE),
    },
    financial: {
      canView: checkPermission(MODULES.FINANCIAL, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.FINANCIAL, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.FINANCIAL, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.FINANCIAL, ACTIONS.DELETE),
    },
    wellness: {
      canView: checkPermission(MODULES.WELLNESS, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.WELLNESS, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.WELLNESS, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.WELLNESS, ACTIONS.DELETE),
    },
    rpe: {
      canView: checkPermission(MODULES.RPE, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.RPE, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.RPE, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.RPE, ACTIONS.DELETE),
    },
    store: {
      canView: checkPermission(MODULES.STORE, ACTIONS.VIEW),
      canCreate: checkPermission(MODULES.STORE, ACTIONS.CREATE),
      canEdit: checkPermission(MODULES.STORE, ACTIONS.EDIT),
      canDelete: checkPermission(MODULES.STORE, ACTIONS.DELETE),
    },
    reports: {
      canView: checkPermission(MODULES.REPORTS, ACTIONS.VIEW),
      canExport: checkPermission(MODULES.REPORTS, ACTIONS.EXPORT),
    },
    
    // User role info
    userRole: user?.role as UserRole | undefined,
    isAdmin: user?.role === 'administrador',
    isCoordinator: user?.role === 'coordenador',
    isTechnicalStaff: user?.role === 'comissao',
    isMedical: user?.role === 'medico',
    isAthlete: user?.role === 'atleta',
    isFamily: user?.role === 'familiar',
    isFan: user?.role === 'torcedor',
  };
}
