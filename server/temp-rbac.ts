import type { RequestHandler } from "express";
import { hasPermission, hasModuleAccess, type UserRole } from "@shared/rbac";
import { storage } from "./storage";

// RBAC middleware for checking module access
export const requireModuleAccess = (module: string): RequestHandler => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.role) {
        return res.status(403).json({ message: "Acesso negado: usuário sem papel definido" });
      }

      const userRole = user.role as UserRole;
      
      if (!hasModuleAccess(userRole, module)) {
        return res.status(403).json({ message: `Acesso negado ao módulo ${module}` });
      }

      next();
    } catch (error) {
      console.error("Error checking module access:", error);
      return res.status(500).json({ message: "Erro ao verificar permissões" });
    }
  };
};

// RBAC middleware for checking specific permissions
export const requirePermission = (module: string, action: string): RequestHandler => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.role) {
        return res.status(403).json({ message: "Acesso negado: usuário sem papel definido" });
      }

      const userRole = user.role as UserRole;
      
      if (!hasPermission(userRole, module, action)) {
        return res.status(403).json({ 
          message: `Acesso negado: você não tem permissão para ${action} em ${module}` 
        });
      }

      next();
    } catch (error) {
      console.error("Error checking permission:", error);
      return res.status(500).json({ message: "Erro ao verificar permissões" });
    }
  };
};

// RBAC middleware for checking user roles
export const requireRole = (allowedRoles: string[]): RequestHandler => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.role) {
        return res.status(403).json({ message: "Acesso negado: usuário sem papel definido" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: `Acesso negado: apenas ${allowedRoles.join(', ')} podem acessar este recurso` 
        });
      }

      next();
    } catch (error) {
      console.error("Error checking role:", error);
      return res.status(500).json({ message: "Erro ao verificar permissões" });
    }
  };
};

export const requireAdmin: RequestHandler = requireRole(['administrador']);
export const requireStaff: RequestHandler = requireRole(['administrador', 'coordenador']);
export const requireMedical: RequestHandler = requireRole(['administrador', 'coordenador', 'medico']);
export const requireTechnical: RequestHandler = requireRole(['administrador', 'coordenador', 'comissao']);