import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { db } from "../db";

// Função para garantir que o usuário administrador existe
async function ensureAdminUser() {
  try {
    // Criar/atualizar usuário Leonardo SEM clube associado
    // Isso força o fluxo de seleção de clube no primeiro login
    await storage.upsertUser({
      id: "leonardo_admin",
      email: "leonardoguarda@gmail.com",
      firstName: "Leonardo",
      lastName: "Guarda",
      password: "Lucaguarda3*",
      role: "administrador",
      clubId: null,
      seasonId: null,
      moduleAccessConfig: [
        { module: "dashboard", hasAccess: true },
        { module: "atletas", hasAccess: true },
        { module: "treinos", hasAccess: true },
        { module: "jogos", hasAccess: true },
        { module: "bem_estar", hasAccess: true },
        { module: "medico", hasAccess: true },
        { module: "financeiro", hasAccess: true },
        { module: "configuracoes", hasAccess: true },
        { module: "relatorios", hasAccess: true },
        { module: "ia_insights", hasAccess: true },
        { module: "registros_usuarios", hasAccess: true },
      ],
      isActive: true,
    });
    console.log("Usuário Leonardo criado/atualizado para desenvolvimento");

    // Manter usuário demo também sem clube
    const demoUser = await storage.getUser("43474027");
    if (!demoUser) {
      await storage.upsertUser({
        id: "43474027",
        email: "admin@natusvincere.com",
        firstName: "Administrador",
        lastName: "Sistema",
        password: "admin123",
        role: "administrador",
        clubId: null,
        moduleAccessConfig: [
          { module: "dashboard", hasAccess: true },
          { module: "atletas", hasAccess: true },
          { module: "treinos", hasAccess: true },
          { module: "jogos", hasAccess: true },
          { module: "bem_estar", hasAccess: true },
          { module: "medico", hasAccess: true },
          { module: "financeiro", hasAccess: true },
          { module: "configuracoes", hasAccess: true },
          { module: "relatorios", hasAccess: true },
          { module: "ia_insights", hasAccess: true },
          { module: "registros_usuarios", hasAccess: true },
        ],
        isActive: true,
      });
      console.log("Usuário demo criado para desenvolvimento");
    }
  } catch (error) {
    console.error("Erro ao criar usuários administradores:", error);
  }
}

// Sistema de autenticação simulado para desenvolvimento
export function getDevSession() {
  return session({
    secret: 'dev-secret-key',
    resave: false,
    saveUninitialized: true, // true para criar sessão automaticamente
    cookie: {
      httpOnly: true,
      secure: false, // false para desenvolvimento local
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      sameSite: 'lax' // compatibilidade com deploy
    },
  });
}

export async function setupDevAuth(app: Express) {
  app.use(getDevSession());

  // Criar usuário administrador se não existir
  await ensureAdminUser();

  // Rota de login que retorna página de login
  app.get("/api/login", async (req, res) => {
    // Se já está logado, redirecionar para home
    if ((req.session as any).user) {
      return res.redirect("/");
    }
    
    // Retornar página de login em HTML
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login - Gestão Clube Esportiva</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 min-h-screen flex items-center justify-center">
        <div class="max-w-md w-full space-y-8 p-8">
          <div class="text-center">
            <div class="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <h2 class="text-3xl font-bold text-gray-900">Gestão Clube Esportiva</h2>
            <p class="mt-2 text-gray-600">Entre com suas credenciais</p>
          </div>
          
          <form class="mt-8 space-y-6" action="/api/authenticate" method="POST">
            <div class="space-y-4">
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                <input id="email" name="email" type="email" required 
                       class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                       placeholder="seu@email.com">
              </div>
              <div>
                <label for="password" class="block text-sm font-medium text-gray-700">Senha</label>
                <input id="password" name="password" type="password" required
                       class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                       placeholder="Sua senha">
              </div>
            </div>
            
            <div>
              <button type="submit" 
                      class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                Entrar no Sistema
              </button>
            </div>
            

          </form>
        </div>
      </body>
      </html>
    `);
  });

  // Rota de autenticação que processa o login
  app.post("/api/authenticate", async (req, res) => {
    const { email, password } = req.body;
    
    // Verificar credenciais Leonardo
    if (email === "leonardoguarda@gmail.com" && password === "Lucaguarda3*") {
      // Buscar o usuário completo do banco para pegar clubId
      const userFromDb = await storage.getUser("leonardo_admin");
      const leonardoUser = {
        id: "leonardo_admin",
        email: "leonardoguarda@gmail.com",
        firstName: "Leonardo",
        lastName: "Guarda",
        role: "administrador",
        clubId: userFromDb?.clubId || null,
        seasonId: userFromDb?.seasonId || null,
        isActive: true,
        lastLogin: new Date().toISOString(),
        claims: {
          sub: "leonardo_admin",
          email: "leonardoguarda@gmail.com",
          first_name: "Leonardo",
          last_name: "Guarda",
          profile_image_url: null
        }
      };

      (req.session as any).user = leonardoUser;
      return res.redirect("/");
    } 
    // Verificar credenciais demo admin
    else if (email === "admin@natusvincere.com" && password === "admin123") {
      const adminUser = {
        id: "43474027",
        email: "admin@natusvincere.com",
        firstName: "Administrador",
        lastName: "Sistema",
        role: "administrador",
        isActive: true,
        lastLogin: new Date().toISOString(),
        claims: {
          sub: "43474027",
          email: "admin@natusvincere.com",
          first_name: "Administrador",
          last_name: "Sistema",
          profile_image_url: null
        }
      };

      (req.session as any).user = adminUser;
      return res.redirect("/");
    }
    // Verificar credenciais treinador demo
    else if (email === "treinador@demo.com" && password === "demo123") {
      const treinadorUser = {
        id: "treinador_demo",
        email: "treinador@demo.com",
        firstName: "João",
        lastName: "Treinador",
        role: "comissao",
        clubId: 67, // ESSUBE
        seasonId: 66, // Temporada atual
        isActive: true,
        lastLogin: new Date().toISOString(),
        claims: {
          sub: "treinador_demo",
          email: "treinador@demo.com",
          first_name: "João",
          last_name: "Treinador",
          profile_image_url: null
        }
      };

      // Create user in database if doesn't exist
      try {
        const existingUser = await storage.getUser("treinador_demo");
        if (!existingUser) {
          await storage.upsertUser({
            id: "treinador_demo",
            email: "treinador@demo.com",
            firstName: "João",
            lastName: "Treinador",
            password: "demo123",
            role: "comissao",
            clubId: 67,
            seasonId: 66,
            moduleAccessConfig: [
              { module: "dashboard", hasAccess: true },
              { module: "atletas", hasAccess: true },
              { module: "treinos", hasAccess: true },
              { module: "jogos", hasAccess: true },
              { module: "bem_estar", hasAccess: true },
              { module: "relatorios", hasAccess: true },
            ],
            isActive: true,
          });
        }
      } catch (error) {
        console.error("Erro ao criar usuário treinador:", error);
      }

      (req.session as any).user = treinadorUser;
      return res.redirect("/");
    } 
    
    // Tentar autenticar com usuário do banco de dados
    try {
      console.log(`[AUTH DEBUG] Tentando autenticar email: ${email}`);
      
      const { users } = await import("../shared/schema");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      
      // Buscar usuário por email
      const [userFromDb] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      console.log(`[AUTH DEBUG] Usuário encontrado no DB:`, userFromDb ? `ID=${userFromDb.id}, email=${userFromDb.email}` : "NÃO ENCONTRADO");
      
      if (userFromDb && userFromDb.password) {
        console.log(`[AUTH DEBUG] Usuário tem senha hasheada, comparando...`);
        
        // Verificar senha com bcrypt
        const passwordMatch = await bcrypt.compare(password, userFromDb.password);
        console.log(`[AUTH DEBUG] Senha match: ${passwordMatch}`);
        
        if (passwordMatch) {
          console.log(`[AUTH DEBUG] Autenticação bem-sucedida! Criando sessão...`);
          
          // Senha correta! Criar sessão
          const authenticatedUser = {
            id: userFromDb.id,
            email: userFromDb.email,
            firstName: userFromDb.firstName,
            lastName: userFromDb.lastName,
            role: userFromDb.role,
            clubId: userFromDb.clubId,
            seasonId: userFromDb.seasonId,
            isActive: userFromDb.isActive,
            lastLogin: new Date().toISOString(),
            claims: {
              sub: userFromDb.id,
              email: userFromDb.email,
              first_name: userFromDb.firstName,
              last_name: userFromDb.lastName,
              profile_image_url: userFromDb.profileImageUrl || null
            }
          };
          
          (req.session as any).user = authenticatedUser;
          console.log(`[AUTH DEBUG] Sessão criada, redirecionando para /`);
          return res.redirect("/");
        } else {
          console.log(`[AUTH DEBUG] Senha incorreta!`);
        }
      } else {
        console.log(`[AUTH DEBUG] Usuário não encontrado ou sem senha`);
      }
    } catch (error) {
      console.error("[AUTH DEBUG] Erro ao autenticar usuário do banco:", error);
    }
    
    console.log(`[AUTH DEBUG] Autenticação falhou, mostrando página de erro`);
    
    // Se chegou aqui, credenciais inválidas
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Erro de Login - Gestão Clube Esportiva</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-50 min-h-screen flex items-center justify-center">
          <div class="max-w-md w-full space-y-8 p-8">
            <div class="text-center">
              <div class="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <h2 class="text-3xl font-bold text-gray-900">Erro de Autenticação</h2>
              <p class="mt-2 text-red-600">Email ou senha incorretos</p>
            </div>
            
            <div class="text-center">
              <a href="/api/login" 
                 class="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                Tentar Novamente
              </a>
            </div>
          </div>
        </body>
        </html>
      `);
  });

  // Rota de logout
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/?logged_out=true");
    });
  });

  // Middleware de verificação de autenticação para desenvolvimento
  app.use((req, res, next) => {
    if ((req.session as any).user) {
      req.user = (req.session as any).user;
    }
    next();
  });
}

export const isDevAuthenticated: RequestHandler = (req, res, next) => {
  // Se tem usuário na sessão, configurar req.user
  if ((req.session as any).user) {
    req.user = (req.session as any).user;
    return next();
  }
  
  // Allow tournament advancement endpoints without authentication for testing
  const allowedPaths = [
    '/api/register',
    '/api/login',
    '/api/tournaments',
    '/api/tournament-teams',
    '/api/tournament-groups',
    '/api/tournament-matches'
  ];
  
  const isAllowed = allowedPaths.some(path => req.path.startsWith(path));
  
  // Se não tem usuário na sessão e é uma API protegida, retornar 401
  if (req.path.startsWith('/api') && !isAllowed) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
};