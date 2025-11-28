import { useAuth } from "./useAuth";
import { 
  hasPermission, 
  hasModuleAccess, 
  canAccessRoute, 
  getNavigationItems,
  getAccessibleModules,
  type UserRole 
} from "@shared/rbac";

export function useRBAC() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const userRole = ((user as any)?.role as UserRole) || 'atleta';

  return {
    userRole,
    isAuthenticated,
    isLoading,
    
    // Permission checking functions
    hasPermission: (module: string, action: string) => 
      isAuthenticated ? hasPermission(userRole, module, action) : false,
    
    hasModuleAccess: (module: string) => 
      isAuthenticated ? hasModuleAccess(userRole, module) : false,
    
    canAccessRoute: (route: string) => 
      isAuthenticated ? canAccessRoute(userRole, route) : false,
    
    // Navigation and UI helpers
    getNavigationItems: () => 
      isAuthenticated ? getNavigationItems(userRole) : [],
    
    getAccessibleModules: () => 
      isAuthenticated ? getAccessibleModules(userRole) : [],

    // Role checking helpers
    isAdmin: () => userRole === 'administrador',
    isCoordinator: () => userRole === 'coordenador',
    isStaff: () => ['administrador', 'coordenador'].includes(userRole),
    isMedical: () => ['administrador', 'coordenador', 'medico'].includes(userRole),
    isTechnical: () => ['administrador', 'coordenador', 'comissao'].includes(userRole),
    isAthlete: () => userRole === 'atleta',

    // UI helpers
    getRoleDisplayName: () => {
      const roleNames = {
        'administrador': 'Administrador',
        'coordenador': 'Coordenador',
        'comissao': 'Comissão Técnica',
        'medico': 'Médico',
        'atleta': 'Atleta',
        'familiar': 'Familiar'
      };
      return roleNames[userRole] || 'Usuário';
    },

    getRoleBadgeColor: () => {
      const colors = {
        'administrador': 'bg-red-100 text-red-800',
        'coordenador': 'bg-blue-100 text-blue-800',
        'comissao': 'bg-green-100 text-green-800',
        'medico': 'bg-purple-100 text-purple-800',
        'atleta': 'bg-yellow-100 text-yellow-800',
        'familiar': 'bg-orange-100 text-orange-800'
      };
      return colors[userRole] || 'bg-gray-100 text-gray-800';
    }
  };
}