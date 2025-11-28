import type { Express, RequestHandler } from "express";
import { setupDevAuth, isDevAuthenticated } from "./devAuth";

// Usar sistema de desenvolvimento que funciona tanto local quanto em deploy
export async function setupAuth(app: Express) {
  await setupDevAuth(app);
}

export const isAuthenticated: RequestHandler = isDevAuthenticated;