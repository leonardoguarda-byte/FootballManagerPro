import type { RequestHandler } from "express";
import { hasPermission, hasModuleAccess, type UserRole } from "@shared/rbac";
import { storage } from "./storage";

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      userRole?: UserRole;
      userId?: string;
    }
  }
}

// Middleware to check if user has required role
export const requireRole = (allowedRoles: UserRole[]): RequestHandler => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = (req.user as any).id || (req.user as any).claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // For dev auth, use the role directly from the user object
      const userRole = (req.user as any).role as UserRole;
      if (!userRole) {
        return res.status(401).json({ message: "User role not found" });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Add user info to request for use in route handlers
      req.userRole = userRole;
      req.userId = userId;
      
      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Middleware to check module access
export const requireModuleAccess = (module: string): RequestHandler => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = (req.user as any).id || (req.user as any).claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User not found or inactive" });
      }

      const userRole = user.role as UserRole;
      if (!hasModuleAccess(userRole, module)) {
        return res.status(403).json({ message: `Access denied to ${module} module` });
      }

      req.userRole = userRole;
      req.userId = userId;
      
      next();
    } catch (error) {
      console.error("Module access check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Middleware to check specific permission
export const requirePermission = (module: string, action: string): RequestHandler => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = (req.user as any).id || (req.user as any).claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // For dev auth, use the role directly from the user object
      const userRole = (req.user as any).role as UserRole;
      if (!userRole) {
        return res.status(401).json({ message: "User role not found" });
      }

      if (!hasPermission(userRole, module, action)) {
        return res.status(403).json({ message: `Permission denied: ${action} on ${module}` });
      }

      req.userRole = userRole;
      req.userId = userId;
      
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Admin only middleware
export const requireAdmin: RequestHandler = requireRole(['administrador']);

// Staff middleware (admin + coordinator)
export const requireStaff: RequestHandler = requireRole(['administrador', 'coordenador']);

// Medical staff middleware
export const requireMedical: RequestHandler = requireRole(['administrador', 'coordenador', 'medico']);

// Technical staff middleware
export const requireTechnical: RequestHandler = requireRole(['administrador', 'coordenador', 'comissao']);