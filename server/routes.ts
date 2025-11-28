import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { requireModuleAccess, requirePermission, requireRole, requireAdmin, requireStaff, requireMedical, requireTechnical } from "./temp-rbac";
import bcrypt from "bcrypt";

// Helper function to format dates in São Paulo timezone (UTC-3)
// Returns YYYY-MM-DD format in local time
function formatLocalDate(date: Date): string {
  // Convert to São Paulo timezone explicitly
  const saoPauloDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const year = saoPauloDate.getFullYear();
  const month = String(saoPauloDate.getMonth() + 1).padStart(2, '0');
  const day = String(saoPauloDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// In-memory storage for tournament game data
const tournamentGameData = new Map<string, {
  callUps: any[];
  lineup: any[];
  formation: any;
  playerAnalysis: any[];
  teamAnalysis: any[];
}>();

function getTournamentGameData(gameId: string) {
  if (!tournamentGameData.has(gameId)) {
    tournamentGameData.set(gameId, {
      callUps: [],
      lineup: [],
      formation: null,
      playerAnalysis: [],
      teamAnalysis: []
    });
  }
  return tournamentGameData.get(gameId)!;
}
import { MODULES, ACTIONS } from "@shared/rbac";
import path from "path";
import * as fs from "fs";
import { fitnessEngine } from "./fitness-engine";
import multer from "multer";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { 
  insertTeamSchema,
  insertAthleteSchema,
  updateAthleteSchema,
  insertTrainingSessionSchema,
  insertTrainingEvaluationSchema,
  insertGameSchema,
  insertTournamentSchema,
  insertGameEvaluationSchema,
  insertWellnessEntrySchema,
  insertRpeEntrySchema,
  insertMedicalRecordSchema,
  insertFinancialTransactionSchema,
  insertStoreProductSchema,
  insertSystemConfigSchema,
  insertPendingRegistrationSchema,
  insertTournamentTeamSchema,
  insertTournamentGroupSchema,
  insertTournamentMatchSchema,
  insertAdversaryTeamSchema,
  insertStadiumSchema,
  insertTrainingDrillSchema,
  insertTrainingStageSchema,
  insertTrainingStageDrillSchema,
  tournamentTeams,
  stadiums,
  users,
  pendingRegistrations,
  clubs,
  seasons,
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, inArray, and } from "drizzle-orm";

// Configuração do multer para upload de arquivos médicos
const medicalStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), 'uploads', 'medical');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Configuração do multer para upload de badges de clubes
const badgeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), 'uploads', 'badges');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'badge-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: medicalStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens (JPG, PNG, GIF) e documentos (PDF, DOC, DOCX, TXT) são permitidos'));
    }
  }
});

const uploadBadge = multer({
  storage: badgeStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens (JPG, PNG, GIF) são permitidas para badges'));
    }
  }
});



export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Database context middleware - sets club/season context for data segregation
  app.use(async (req: any, res, next) => {
    // Clear any stale context first
    storage.clearContext();
    
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.clubId && user?.seasonId) {
        storage.setContext(user.clubId, user.seasonId);
      }
    }
    
    // Clear context after response is sent to prevent context leakage
    res.on('finish', () => {
      storage.clearContext();
    });
    
    next();
  });

  // Servir arquivos estáticos de upload
  app.use('/uploads', (req, res, next) => {
    // Badge files are public (for homepage), medical files require auth
    const isBadgeFile = req.path.startsWith('/badges/');
    
    if (!isBadgeFile && !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }, (req, res, next) => {
    const filePath = path.join(process.cwd(), 'uploads', req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "Arquivo não encontrado" });
    }
  });

  // Endpoint para upload de arquivos
  app.post('/api/upload', isAuthenticated, upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 },
    { name: 'identityDocument', maxCount: 1 },
    { name: 'birthCertificate', maxCount: 1 },
    { name: 'medicalCertificate', maxCount: 1 },
    { name: 'electrocardiogram', maxCount: 1 },
    { name: 'athleteBond', maxCount: 1 },
    { name: 'teamPhoto', maxCount: 1 }
  ]), (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const uploadedFiles: { [key: string]: string } = {};

      Object.keys(files).forEach(fieldName => {
        if (files[fieldName] && files[fieldName][0]) {
          uploadedFiles[fieldName] = `/uploads/medical/${files[fieldName][0].filename}`;
        }
      });

      res.json({ 
        success: true, 
        files: uploadedFiles,
        message: 'Arquivos enviados com sucesso'
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      res.status(500).json({ message: 'Erro ao fazer upload dos arquivos' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Try to get user from database first
      let user = await storage.getUser(userId);
      
      // If user doesn't exist in database but exists in session (like demo users), use session data
      if (!user && req.user) {
        user = {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          role: req.user.role,
          clubId: req.user.clubId || null,
          seasonId: req.user.seasonId || null,
          isActive: req.user.isActive,
          lastLogin: req.user.lastLogin,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get current user's selected club information
  app.get('/api/auth/current-club', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.clubId) {
        return res.json(null);
      }
      
      const club = await storage.getClub(user.clubId);
      
      // Get current season for the club and add to response
      if (club && user.seasonId) {
        const season = await storage.getSeason(user.seasonId);
        if (season) {
          const clubWithSeason = {
            ...club,
            clubId: club.id,
            seasonId: season.id,
            currentSeasonId: season.id,
            currentSeasonName: season.name
          };
          return res.json(clubWithSeason);
        }
      }
      
      res.json(club ? { ...club, clubId: club.id, seasonId: user.seasonId } : null);
    } catch (error) {
      console.error("Error fetching current club:", error);
      res.status(500).json({ message: "Failed to fetch current club" });
    }
  });

  // Change password endpoint
  app.post('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub || req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password || '');
      if (!isValidPassword) {
        return res.status(401).json({ message: "Senha atual incorreta" });
      }

      // Update password (storage.updateUser will hash it)
      await storage.updateUser(userId, { password: newPassword });

      res.json({ message: "Senha alterada com sucesso!" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });

  // Club management routes
  app.get('/api/clubs', isAuthenticated, async (req, res) => {
    try {
      const clubs = await storage.getClubs();
      res.json(clubs);
    } catch (error) {
      console.error("Error fetching clubs:", error);
      res.status(500).json({ message: "Failed to fetch clubs" });
    }
  });

  app.get('/api/clubs/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const club = await storage.getClub(id);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }
      res.json(club);
    } catch (error) {
      console.error("Error fetching club:", error);
      res.status(500).json({ message: "Failed to fetch club" });
    }
  });

  app.post('/api/clubs', isAuthenticated, requireAdmin, uploadBadge.single('badge'), async (req, res) => {
    try {
      const clubData = req.body;
      const seasonType = req.body.seasonType || "calendar";
      
      // Add badge and logo path if file was uploaded (both fields for compatibility)
      if (req.file) {
        const filePath = `/uploads/badges/${req.file.filename}`;
        clubData.badge = req.file.filename;
        clubData.logo = filePath; // Full path for homepage
      }
      
      const club = await storage.upsertClub(clubData);
      
      // Initialize database for the new club with specified season type
      await storage.initializeClubDatabase(club.id, seasonType);
      
      res.json(club);
    } catch (error) {
      console.error("Error creating club:", error);
      res.status(500).json({ message: "Failed to create club" });
    }
  });

  app.put('/api/clubs/:id', isAuthenticated, requireAdmin, uploadBadge.single('badge'), async (req, res) => {
    try {
      const clubId = parseInt(req.params.id);
      const { id, ...updateData } = req.body;
      
      // Add badge and logo path if file was uploaded (both fields for compatibility)
      if (req.file) {
        const filePath = `/uploads/badges/${req.file.filename}`;
        updateData.badge = req.file.filename;
        updateData.logo = filePath; // Full path for homepage
      }
      
      // Update club with new data
      const updatedClub = await storage.upsertClub({ id: clubId, ...updateData });
      
      res.json(updatedClub);
    } catch (error) {
      console.error("Error updating club:", error);
      res.status(500).json({ message: "Failed to update club" });
    }
  });

  app.delete('/api/clubs/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const clubId = parseInt(req.params.id);
      
      // Note: In a real application, you might want to add validation
      // to prevent deletion of clubs with existing data
      await storage.deleteClub(clubId);
      
      res.json({ success: true, message: "Club deleted successfully" });
    } catch (error) {
      console.error("Error deleting club:", error);
      res.status(500).json({ message: "Failed to delete club" });
    }
  });

  // Delete all clubs route
  app.delete('/api/clubs', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteAllClubs();
      res.json({ success: true, message: "All clubs deleted successfully" });
    } catch (error) {
      console.error("Error deleting all clubs:", error);
      res.status(500).json({ message: "Failed to delete all clubs" });
    }
  });

  // Get currently selected club for user
  app.get('/api/clubs/selected', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.clubId) {
        return res.status(404).json({ message: "No club selected" });
      }
      
      const club = await storage.getClub(user.clubId);
      if (!club) {
        return res.status(404).json({ message: "Selected club not found" });
      }
      
      res.json(club);
    } catch (error) {
      console.error("Error fetching selected club:", error);
      res.status(500).json({ message: "Failed to fetch selected club" });
    }
  });

  // Season management routes
  app.get('/api/seasons/:clubId', isAuthenticated, async (req, res) => {
    try {
      const clubId = parseInt(req.params.clubId);
      const seasons = await storage.getSeasonsByClub(clubId);
      res.json(seasons);
    } catch (error) {
      console.error("Error fetching seasons:", error);
      res.status(500).json({ message: "Failed to fetch seasons" });
    }
  });

  // Get currently selected season for user
  app.get('/api/seasons/selected', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.seasonId) {
        return res.status(404).json({ message: "No season selected" });
      }
      
      const season = await storage.getSeason(user.seasonId);
      if (!season) {
        return res.status(404).json({ message: "Selected season not found" });
      }
      
      res.json(season);
    } catch (error) {
      console.error("Error fetching selected season:", error);
      res.status(500).json({ message: "Failed to fetch selected season" });
    }
  });

  // User club selection
  app.post('/api/user/select-club', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clubId, seasonId } = req.body;
      
      // Update user with selected club and season
      await storage.updateUser(userId, { 
        clubId: clubId,
        seasonId: seasonId 
      });
      
      // Update session with new clubId and seasonId
      if (req.session && req.session.user) {
        req.session.user.clubId = clubId;
        req.session.user.seasonId = seasonId;
      }
      
      // Also update req.user for immediate use
      req.user.clubId = clubId;
      req.user.seasonId = seasonId;
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error selecting club:", error);
      res.status(500).json({ message: "Failed to select club" });
    }
  });

  // User management routes (Admin only)
  app.get("/api/users", isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const { dateOfBirth, teamId, ...userData } = req.body;
      
      // If creating an athlete, create athlete record first
      if (userData.role === "atleta") {
        if (!teamId) {
          return res.status(400).json({ message: "Time é obrigatório para atletas" });
        }
        if (!dateOfBirth) {
          return res.status(400).json({ message: "Data de nascimento é obrigatória para atletas" });
        }
        
        // Get the team to retrieve clubId and seasonId
        const team = await storage.getTeam(parseInt(teamId));
        if (!team) {
          return res.status(400).json({ message: "Time não encontrado" });
        }
        
        // Get the season to calculate category
        const season = await storage.getSeason(team.seasonId);
        if (!season) {
          return res.status(400).json({ message: "Temporada não encontrada" });
        }
        
        // Calculate category based on birth date and season year
        const seasonYear = new Date(season.startDate).getFullYear();
        const category = storage.calculateAthleteCategory(dateOfBirth, seasonYear);
        
        // Create athlete record
        const athleteData: any = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          dateOfBirth,
          clubId: team.clubId,
          seasonId: team.seasonId,
          teamId: parseInt(teamId),
          category,
          dominantFoot: 'right', // Default value
        };
        const athlete = await storage.createAthlete(athleteData);
        
        // Link user to athlete
        userData.athleteId = athlete.id;
        userData.clubId = team.clubId;
        userData.seasonId = team.seasonId;
        userData.teamId = parseInt(teamId);
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create user" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.updateUser(id, req.body);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.updateUser(id, req.body);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/users/send-password", isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const { userId, password } = req.body;
      
      if (!userId || !password) {
        return res.status(400).json({ message: "userId e password são obrigatórios" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const { sendPasswordEmail } = await import("./email");
      const result = await sendPasswordEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        password
      );

      if (result.success) {
        res.json({ message: "E-mail enviado com sucesso!" });
      } else {
        res.status(500).json({ message: result.error || "Erro ao enviar e-mail" });
      }
    } catch (error) {
      console.error("Error sending password email:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao enviar e-mail" 
      });
    }
  });

  // AI Insights routes
  app.get("/api/insights/performance", isAuthenticated, async (req, res) => {
    try {
      const { generatePerformanceInsights } = await import("./ai-insights");
      
      const athletes = await storage.getAthletes();
      const trainingSessions = await storage.getTrainingSessions();
      const games = await storage.getGames();
      const trainingEvaluations = await storage.getTrainingEvaluations();
      const gameEvaluations = await storage.getGameEvaluations();

      const insights = await generatePerformanceInsights({
        athletes,
        trainingSessions,
        games,
        trainingEvaluations,
        gameEvaluations,
      });

      res.json(insights);
    } catch (error) {
      console.error("Error generating performance insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  app.get("/api/insights/player/:id", isAuthenticated, async (req, res) => {
    try {
      const { generateIndividualPlayerInsight } = await import("./ai-insights");
      const athleteId = parseInt(req.params.id);
      
      const athletes = await storage.getAthletes();
      const trainingSessions = await storage.getTrainingSessions();
      const games = await storage.getGames();
      const trainingEvaluations = await storage.getTrainingEvaluations(undefined, athleteId);
      const gameEvaluations = await storage.getGameEvaluations(undefined, athleteId);

      const insight = await generateIndividualPlayerInsight(athleteId, {
        athletes,
        trainingSessions,
        games,
        trainingEvaluations,
        gameEvaluations,
      });

      res.json(insight);
    } catch (error) {
      console.error("Error generating player insight:", error);
      res.status(500).json({ message: "Failed to generate player insight" });
    }
  });

  app.get("/api/insights/training", isAuthenticated, async (req, res) => {
    try {
      const { generateTrainingRecommendations } = await import("./ai-insights");
      
      const trainingSessions = await storage.getTrainingSessions();
      const trainingEvaluations = await storage.getTrainingEvaluations();

      const recommendations = await generateTrainingRecommendations(
        trainingSessions,
        trainingEvaluations
      );

      res.json({ recommendations });
    } catch (error) {
      console.error("Error generating training recommendations:", error);
      res.status(500).json({ message: "Failed to generate training recommendations" });
    }
  });

  // Tournament Management API Routes
  
  // Create a new tournament
  app.post("/api/tournaments", isAuthenticated, requirePermission(MODULES.TOURNAMENTS, ACTIONS.CREATE), async (req, res) => {
    try {
      const validatedData = insertTournamentSchema.parse(req.body);
      
      // Create the tournament
      const tournament = await storage.createTournament(validatedData);
      
      // Auto-enroll club teams if jointCategories is enabled
      if (tournament.jointCategories && tournament.additionalCategories && tournament.additionalCategories.length > 0) {
        // Collect all categories: main category + additional categories
        const allCategories = [tournament.category, ...tournament.additionalCategories].filter(Boolean);
        
        // Get all teams from the club that belong to these categories
        const clubTeams = await storage.getTeamsByClubAndSeason(tournament.clubId, tournament.seasonId);
        
        // Filter teams that match any of the categories
        const matchingTeams = clubTeams.filter(team => 
          allCategories.includes(team.category)
        );
        
        // Auto-enroll matching teams
        for (const team of matchingTeams) {
          try {
            await storage.createTournamentTeam({
              tournamentId: tournament.id,
              clubId: tournament.clubId,
              seasonId: tournament.seasonId,
              teamName: team.name,
              category: team.category,
              badgeUrl: team.teamPhoto || null,
              status: 'registered',
              originTeamId: team.id,
              isAutoEnrolled: true,
            });
          } catch (error) {
            console.error(`Error auto-enrolling team ${team.name}:`, error);
            // Continue with other teams even if one fails
          }
        }
      }
      
      res.status(201).json(tournament);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Tournament validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating tournament:", error);
      res.status(500).json({ message: "Failed to create tournament" });
    }
  });
  
  // Get tournament details with teams, groups, and matches
  app.get("/api/tournaments/:id/details", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      const details = await storage.getTournamentWithDetails(tournamentId);
      
      if (!details) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      res.json(details);
    } catch (error) {
      console.error("Error fetching tournament details:", error);
      res.status(500).json({ message: "Failed to fetch tournament details" });
    }
  });

  // Update tournament status
  app.patch("/api/tournaments/:id/status", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { status } = req.body;
      
      const tournament = await storage.updateTournament(tournamentId, { status });
      res.json(tournament);
    } catch (error) {
      console.error("Error updating tournament status:", error);
      res.status(500).json({ message: "Failed to update tournament status" });
    }
  });

  // Tournament Teams Routes
  
  // Add a club to joint category tournament (automatically adds all teams from categories)
  app.post("/api/tournaments/:id/add-club", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { clubName, adversaryTeamId } = req.body;
      
      if (!clubName && !adversaryTeamId) {
        return res.status(400).json({ message: "Club name or adversary team ID is required" });
      }
      
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.clubId || !user?.seasonId) {
        return res.status(400).json({ message: "User must have club and season selected" });
      }
      
      // Get tournament to check if it has joint categories
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      // Determine which categories to search for
      let categories: string[] = [];
      if (tournament.jointCategories && tournament.additionalCategories && tournament.additionalCategories.length > 0) {
        categories = [tournament.category, ...tournament.additionalCategories].filter(Boolean) as string[];
      } else {
        categories = tournament.category ? [tournament.category] : [];
      }
      
      if (categories.length === 0) {
        return res.status(400).json({ message: "Tournament has no categories defined" });
      }
      
      // Helper function to extract club name from team name (removes category suffix)
      const extractClubName = (teamName: string): string => {
        // Remove common category suffixes with various patterns:
        // - "Sub-15", "Sub 15", "Sub15"
        // - With gender qualifiers: "Sub-15 Feminino", "Sub-17 Masculino"
        // - With letter suffixes: "Sub-15 A", "Sub-17 B"
        // - Combinations: "Sub-15 Feminino A"
        return teamName
          .replace(/\s*(Sub[\s-]?\d+\s*(Feminino|Masculino)?\s*[A-Z]?|Veterano|Adulto)\s*$/i, '')
          .trim()
          .toLowerCase();
      };
      
      // Get all teams from the club's adversary teams module or regular teams
      let teamsToAdd: any[] = [];
      let targetClubName = '';
      
      if (adversaryTeamId) {
        // Get adversary team details
        const adversaryTeam = await storage.getAdversaryTeam(adversaryTeamId);
        if (!adversaryTeam) {
          return res.status(404).json({ message: "Adversary team not found" });
        }
        
        // Extract the club name (without category)
        targetClubName = extractClubName(adversaryTeam.teamName);
        
        // Find all adversary teams with the same club name in the categories
        const allAdversaries = await storage.getAdversaryTeams(user.clubId, user.seasonId);
        teamsToAdd = allAdversaries.filter(adv => {
          const advClubName = extractClubName(adv.teamName);
          return advClubName === targetClubName && categories.includes(adv.category);
        });
      } else {
        // Search by club name in adversary teams
        targetClubName = clubName;
        const allAdversaries = await storage.getAdversaryTeams(user.clubId, user.seasonId);
        teamsToAdd = allAdversaries.filter(adv => {
          const advClubName = extractClubName(adv.teamName);
          return advClubName === targetClubName && categories.includes(adv.category);
        });
      }
      
      if (teamsToAdd.length === 0) {
        return res.status(404).json({ 
          message: `No teams found for club "${clubName}" in categories: ${categories.join(', ')}` 
        });
      }
      
      // Add each team to the tournament
      const addedTeams = [];
      for (const team of teamsToAdd) {
        try {
          const existingTeam = await storage.getTournamentTeamByNameAndCategory(
            tournamentId, 
            team.teamName, 
            team.category
          );
          
          if (!existingTeam) {
            const tournamentTeam = await storage.createTournamentTeam({
              tournamentId: tournament.id,
              clubId: tournament.clubId,
              seasonId: tournament.seasonId,
              teamName: team.teamName,
              category: team.category,
              badgeUrl: team.teamPhoto || null,
              status: 'registered',
              originTeamId: team.id,
              isAutoEnrolled: false, // Manually added by admin
            });
            addedTeams.push(tournamentTeam);
          }
        } catch (error) {
          console.error(`Error adding team ${team.teamName} (${team.category}):`, error);
        }
      }
      
      res.status(201).json({
        message: `Added ${addedTeams.length} team(s) from club "${clubName || teamsToAdd[0].teamName}"`,
        teams: addedTeams
      });
    } catch (error: any) {
      console.error("Error adding club to tournament:", error);
      res.status(500).json({ 
        message: "Failed to add club to tournament", 
        error: error.message || 'Unknown error' 
      });
    }
  });

  // Register a team for a tournament
  app.post("/api/tournaments/:id/teams", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), uploadBadge.single('badge'), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      // Validate required fields
      if (!req.body.teamName) {
        return res.status(400).json({ message: "Team name is required" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "Team badge is required" });
      }
      
      const badgeUrl = `/uploads/badges/${req.file.filename}`;
      
      const teamData = { 
        tournamentId,
        teamName: req.body.teamName,
        contactEmail: req.body.contactEmail || null,
        contactPhone: req.body.contactPhone || null,
        badgeUrl,
        status: 'registered'
      };
      
      const team = await storage.createTournamentTeam(teamData);
      res.status(201).json(team);
    } catch (error: any) {
      console.error("Error registering team:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to register team", 
        error: error.message || 'Unknown error' 
      });
    }
  });

  // Get teams for a tournament
  app.get("/api/tournaments/:id/teams", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const teams = await storage.getTournamentTeams(tournamentId);
      
      // Get unique club IDs for teams without badges
      const clubIds = [...new Set(
        teams
          .filter(team => !team.badgeUrl && team.clubId)
          .map(team => team.clubId)
      )];
      
      // Fetch all clubs in one batch query
      const clubsMap = new Map();
      if (clubIds.length > 0) {
        const clubs = await storage.getClubsByIds(clubIds);
        clubs.forEach(club => {
          clubsMap.set(club.id, club);
        });
      }
      
      // Add club logo/badge ONLY for internal teams (not adversaries)
      // Adversaries should keep NULL badge to show placeholder with initials
      const teamsWithBadges = teams.map(team => {
        // Only add club badge if team is actually from this club (not an adversary)
        // Check if team name matches club name or short name
        if (!team.badgeUrl && team.clubId) {
          const club = clubsMap.get(team.clubId);
          if (club) {
            // Remove category suffix from team name for comparison
            const baseTeamName = team.teamName.replace(/\s*(Sub-\d+|Sub-\d+\/\d+)\s*/g, '').trim();
            const isInternalTeam = baseTeamName === club.name || 
                                  baseTeamName === club.shortName ||
                                  baseTeamName === 'ESSUBE';
            
            // Only add club badge for internal teams
            if (isInternalTeam) {
              return {
                ...team,
                badgeUrl: club.logo || club.badge || null
              };
            }
          }
        }
        return team;
      });
      
      res.json(teamsWithBadges);
    } catch (error) {
      console.error("Error fetching tournament teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Update team information
  app.patch("/api/tournaments/teams/:id", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.updateTournamentTeam(teamId, req.body);
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  // Update team (JSON only, for category/group assignments)
  app.put("/api/tournament-teams/:id", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      
      const updateData: any = {};
      
      // Only include fields that are provided in the request
      if (req.body.teamName !== undefined) updateData.teamName = req.body.teamName;
      if (req.body.contactEmail !== undefined) updateData.contactEmail = req.body.contactEmail;
      if (req.body.contactPhone !== undefined) updateData.contactPhone = req.body.contactPhone;
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.groupId !== undefined) updateData.groupId = req.body.groupId;
      if (req.body.status !== undefined) updateData.status = req.body.status;

      const team = await storage.updateTournamentTeam(teamId, updateData);
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  // Update team with file upload (for badge changes)
  app.put("/api/tournament-teams/:id/upload", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), uploadBadge.single('badge'), async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const updateData: any = {};
      
      // Only include fields that are provided in the request
      if (req.body.teamName !== undefined) updateData.teamName = req.body.teamName;
      if (req.body.contactEmail !== undefined) updateData.contactEmail = req.body.contactEmail;
      if (req.body.contactPhone !== undefined) updateData.contactPhone = req.body.contactPhone;
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.groupId !== undefined) updateData.groupId = req.body.groupId;
      if (req.body.status !== undefined) updateData.status = req.body.status;

      // Handle badge upload if provided
      if (req.file) {
        updateData.badgeUrl = `/uploads/badges/${req.file.filename}`;
      }

      const team = await storage.updateTournamentTeam(teamId, updateData);
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  // Delete team from tournament
  app.delete("/api/tournament-teams/:id", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.DELETE), async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      
      const { db: database } = await import("./db");
      const { tournamentTeams: ttTable, tournamentMatches: tmTable } = await import("@shared/schema");
      const { eq: eqOp, or: orOp } = await import("drizzle-orm");
      
      // First delete any matches involving this team
      await database.delete(tmTable).where(
        orOp(
          eqOp(tmTable.team1Id, teamId),
          eqOp(tmTable.team2Id, teamId)
        )
      );
      
      // Then delete the team
      await database.delete(ttTable).where(eqOp(ttTable.id, teamId));
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing team:", error);
      res.status(500).json({ message: "Failed to remove team" });
    }
  });

  // Assign team to group
  app.put("/api/tournament-teams/:id/assign-group", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const { groupId } = req.body;

      const updatedTeam = await storage.assignTeamToGroup(teamId, groupId);
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error assigning team to group:", error);
      res.status(500).json({ message: "Failed to assign team to group" });
    }
  });

  // Tournament Groups Routes
  
  // Create a new group for a tournament
  app.post("/api/tournaments/:id/groups", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { groupName } = req.body;
      
      const group = await storage.createTournamentGroup(tournamentId, groupName);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  // Clear all groups for a tournament
  app.delete("/api/tournaments/:id/groups/clear", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.DELETE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      await storage.clearTournamentGroups(tournamentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing groups:", error);
      res.status(500).json({ message: "Failed to clear groups" });
    }
  });

  // Generate groups for a tournament (legacy support)
  app.post("/api/tournaments/:id/generate-groups", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { groupSize } = req.body;
      
      const groups = await storage.generateTournamentGroups(tournamentId, groupSize || 4);
      res.json(groups);
    } catch (error) {
      console.error("Error generating groups:", error);
      res.status(500).json({ message: "Failed to generate groups" });
    }
  });

  // Create groups for tournament
  app.post("/api/tournaments/:id/create-groups", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { groupsPerCategory } = req.body;
      
      const groups = await storage.createTournamentGroups(tournamentId, groupsPerCategory || 2);
      res.json(groups);
    } catch (error) {
      console.error("Error creating groups:", error);
      res.status(500).json({ message: "Failed to create groups" });
    }
  });

  // Create groups manually with club distribution
  app.post("/api/tournaments/:id/create-groups-manual", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { groups } = req.body;
      
      if (!groups || !Array.isArray(groups)) {
        return res.status(400).json({ message: "Groups data is required" });
      }
      
      const createdGroups = await storage.createTournamentGroupsManual(tournamentId, groups);
      res.json(createdGroups);
    } catch (error) {
      console.error("Error creating groups manually:", error);
      res.status(500).json({ message: "Failed to create groups manually" });
    }
  });

  // Update tournament team
  app.patch("/api/tournament-teams/:id", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.updateTournamentTeam(teamId, req.body);
      res.json(team);
    } catch (error) {
      console.error("Error updating tournament team:", error);
      res.status(500).json({ message: "Failed to update tournament team" });
    }
  });

  // Assign team to group
  app.patch("/api/tournament-teams/:id/assign-group", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const { groupId } = req.body;
      
      await storage.assignTeamToGroup(teamId, groupId);
      res.status(204).send();
    } catch (error) {
      console.error("Error assigning team to group:", error);
      res.status(500).json({ message: "Failed to assign team to group" });
    }
  });

  // Get adversary teams
  app.get("/api/adversary-teams", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.clubId || !user?.seasonId) {
        return res.status(400).json({ message: "User must have club and season selected" });
      }

      const adversaryTeams = await storage.getAdversaryTeams(user.clubId, user.seasonId);
      res.json(adversaryTeams);
    } catch (error) {
      console.error("Error fetching adversary teams:", error);
      res.status(500).json({ message: "Failed to fetch adversary teams" });
    }
  });

  // Add team to tournament
  app.post("/api/tournaments/:id/teams", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      // Validate tournament ID
      if (isNaN(tournamentId) || req.params.id === 'null') {
        return res.status(400).json({ message: "Valid tournament ID is required" });
      }

      const { teamName, category, badgeUrl } = req.body;
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.clubId || !user?.seasonId) {
        return res.status(400).json({ message: "User must have club and season selected" });
      }

      // Validate required fields
      if (!teamName || !category) {
        return res.status(400).json({ message: "Team name and category are required" });
      }

      // Validate category
      if (!['sub-15', 'sub-17'].includes(category)) {
        return res.status(400).json({ message: "Category must be sub-15 or sub-17" });
      }

      const team = await storage.addTournamentTeam({
        tournamentId,
        teamName,
        category,
        badgeUrl: badgeUrl || null,
        clubId: user.clubId,
        seasonId: user.seasonId
      });
      
      res.json(team);
    } catch (error) {
      console.error("Error adding tournament team:", error);
      res.status(500).json({ message: "Failed to add team to tournament" });
    }
  });

  // Bulk add teams from adversaries to tournament
  app.post("/api/tournaments/:id/teams/bulk", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      // Validate tournament ID
      if (isNaN(tournamentId) || req.params.id === 'null') {
        return res.status(400).json({ message: "Valid tournament ID is required" });
      }

      const { adversaryTeamIds } = req.body;
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.clubId || !user?.seasonId) {
        return res.status(400).json({ message: "User must have club and season selected" });
      }

      // Validate required fields
      if (!adversaryTeamIds || !Array.isArray(adversaryTeamIds) || adversaryTeamIds.length === 0) {
        return res.status(400).json({ message: "adversaryTeamIds array is required and must not be empty" });
      }

      // Import clubs for all tournament categories automatically
      const teams = await storage.addBulkTournamentTeamsFromAdversaries(tournamentId, adversaryTeamIds);
      
      res.json({ 
        message: `${teams.length} time(s) adicionado(s) com sucesso para todas as categorias do torneio`,
        teams 
      });
    } catch (error) {
      console.error("Error bulk adding tournament teams:", error);
      res.status(500).json({ message: "Failed to add teams to tournament" });
    }
  });

  // Assign teams to groups
  app.post("/api/tournaments/:id/teams/assign-groups", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      if (isNaN(tournamentId) || req.params.id === 'null') {
        return res.status(400).json({ message: "Valid tournament ID is required" });
      }

      const { assignments } = req.body;
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.clubId || !user?.seasonId) {
        return res.status(400).json({ message: "User must have club and season selected" });
      }

      if (!assignments || !Array.isArray(assignments)) {
        return res.status(400).json({ message: "Assignments array is required" });
      }

      // Process each team assignment
      const updatedTeams = [];
      for (const assignment of assignments) {
        const { teamId, groupId } = assignment;
        
        if (!teamId) {
          continue;
        }

        try {
          const updatedTeam = await storage.updateTournamentTeam(teamId, { groupId });
          updatedTeams.push(updatedTeam);
        } catch (teamError) {
          console.error(`Error updating team ${teamId}:`, teamError);
          // Continue with other teams even if one fails
        }
      }
      
      res.json({ 
        message: `Successfully updated ${updatedTeams.length} team assignments`,
        updatedTeams 
      });
    } catch (error) {
      console.error("Error assigning teams to groups:", error);
      res.status(500).json({ message: "Failed to assign teams to groups" });
    }
  });

  // Create tournament match
  app.post("/api/tournaments/:id/matches", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      if (isNaN(tournamentId) || req.params.id === 'null') {
        return res.status(400).json({ message: "Valid tournament ID is required" });
      }

      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.clubId || !user?.seasonId) {
        return res.status(400).json({ message: "User must have club and season selected" });
      }

      const { team1Id, team2Id, category, phase, round, scheduledDate, venue } = req.body;
      
      if (!team1Id || !team2Id) {
        return res.status(400).json({ message: "Both teams are required" });
      }

      if (team1Id === team2Id) {
        return res.status(400).json({ message: "Teams cannot be the same" });
      }

      // Verify both teams exist and belong to this tournament
      const homeTeam = await storage.getTournamentTeam(team1Id);
      const awayTeam = await storage.getTournamentTeam(team2Id);

      if (!homeTeam || !awayTeam) {
        return res.status(404).json({ message: "One or both teams not found" });
      }

      if (homeTeam.tournamentId !== tournamentId || awayTeam.tournamentId !== tournamentId) {
        return res.status(400).json({ message: "Teams must belong to this tournament" });
      }

      if (homeTeam.category !== awayTeam.category) {
        return res.status(400).json({ message: "Teams must be from the same category" });
      }

      const matchData = {
        tournamentId,
        team1Id: team1Id,
        team2Id: team2Id,
        phase: phase || 'group',
        round: round || 1,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        venue: venue || null,
        team1Score: null,
        team2Score: null,
        status: 'scheduled' as const,
        groupId: homeTeam.groupId, // Use the group from home team
      };

      const newMatch = await storage.createTournamentMatch(matchData);
      
      res.json({ 
        message: "Match created successfully",
        match: newMatch 
      });
    } catch (error) {
      console.error("Error creating tournament match:", error);
      res.status(500).json({ message: "Failed to create tournament match" });
    }
  });

  // Update tournament team badges from club teams
  app.patch("/api/tournaments/:id/update-badges", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.clubId) {
        return res.status(400).json({ message: "User must have club selected" });
      }
      
      // Get all tournament teams
      const tournamentTeams = await storage.getTournamentTeams(tournamentId);
      
      // Update badges for each team
      for (const team of tournamentTeams) {
        if (!team.badgeUrl) {
          const clubTeam = await storage.getTeamByName(team.teamName, user.clubId);
          if (clubTeam && clubTeam.teamPhoto) {
            await storage.updateTournamentTeam(team.id, { badgeUrl: clubTeam.teamPhoto });
          }
        }
      }
      
      res.json({ message: "Team badges updated successfully" });
    } catch (error) {
      console.error("Error updating team badges:", error);
      res.status(500).json({ message: "Failed to update team badges" });
    }
  });

  // Advance teams to finals
  app.post("/api/tournaments/:id/advance-to-finals", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { teamsPerGroup, finalGroupName } = req.body;
      
      const result = await storage.advanceTeamsToFinals(tournamentId, teamsPerGroup, finalGroupName);
      res.json(result);
    } catch (error) {
      console.error("Error advancing teams to finals:", error);
      res.status(500).json({ message: "Failed to advance teams to finals" });
    }
  });

  // Get groups for a tournament
  app.get("/api/tournaments/:id/groups", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const groups = await storage.getTournamentGroups(tournamentId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching tournament groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  // Delete a specific group
  app.delete("/api/tournament-groups/:groupId", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.DELETE), async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Valid group ID is required" });
      }

      await storage.deleteTournamentGroup(groupId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tournament group:", error);
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  // Tournament Matches Routes
  
  // Generate matches for a tournament
  app.post("/api/tournaments/:id/generate-matches", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const matches = await storage.generateTournamentMatches(tournamentId);
      res.json(matches);
    } catch (error) {
      console.error("Error generating matches:", error);
      res.status(500).json({ message: "Failed to generate matches" });
    }
  });

  // Create multiple tournament matches in bulk
  app.post('/api/tournaments/:id/matches/bulk', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { matches } = req.body;
      
      if (!matches || !Array.isArray(matches)) {
        return res.status(400).json({ message: 'Matches array is required' });
      }

      const createdMatches = [];
      for (const matchData of matches) {
        // Convert scheduledDate from string to Date object if it's a string
        const processedMatchData = {
          ...matchData,
          tournamentId,
          scheduledDate: matchData.scheduledDate ? new Date(matchData.scheduledDate) : null,
          phase: matchData.phase || 'group' // Ensure phase is provided
        };
        
        const match = await storage.createTournamentMatch(processedMatchData);
        createdMatches.push(match);
      }

      res.json({
        success: true,
        matchesCreated: createdMatches.length,
        matches: createdMatches
      });
    } catch (error) {
      console.error('Error creating bulk tournament matches:', error);
      res.status(500).json({ message: 'Failed to create tournament matches' });
    }
  });

  // Create multiple tournament matches with category replication
  app.post('/api/tournaments/:id/matches/bulk-with-replication', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { matches, replicateToCategory, timeOffset } = req.body;
      
      if (!matches || !Array.isArray(matches)) {
        return res.status(400).json({ message: 'Matches array is required' });
      }

      const createdMatches = [];
      
      // Create original matches
      for (const matchData of matches) {
        const processedMatchData = {
          ...matchData,
          tournamentId,
          scheduledDate: matchData.scheduledDate ? new Date(matchData.scheduledDate) : null,
          phase: matchData.phase || 'group'
        };
        
        const match = await storage.createTournamentMatch(processedMatchData);
        createdMatches.push(match);
      }

      // If replication is requested, create matches for the other category
      if (replicateToCategory) {
        // Get all teams for finding correspondences
        const allTeams = await storage.getTournamentTeams(tournamentId);

        for (const matchData of matches) {
          // Get source teams
          const sourceTeam1 = allTeams.find(t => t.id === matchData.team1Id);
          const sourceTeam2 = allTeams.find(t => t.id === matchData.team2Id);
          
          if (!sourceTeam1 || !sourceTeam2) {
            continue;
          }

          let targetTeam1, targetTeam2, targetGroupId;

          // Handle group phase (has groupId) vs final phase (groupId is null)
          if (matchData.groupId !== null) {
            // GROUP PHASE: Find corresponding group and teams
            const allGroups = await storage.getTournamentGroups(tournamentId);
            const sourceGroup = allGroups.find(g => g.id === matchData.groupId);
            
            if (!sourceGroup) {
              continue;
            }

            const targetGroup = allGroups.find(g => 
              g.groupName === sourceGroup.groupName && 
              g.category === replicateToCategory
            );
            
            if (!targetGroup) {
              continue;
            }

            targetGroupId = targetGroup.id;

            // Find corresponding teams in target group
            targetTeam1 = allTeams.find(t => 
              t.teamName === sourceTeam1.teamName && 
              t.groupId === targetGroup.id &&
              t.category === replicateToCategory
            );
            targetTeam2 = allTeams.find(t => 
              t.teamName === sourceTeam2.teamName && 
              t.groupId === targetGroup.id &&
              t.category === replicateToCategory
            );
          } else {
            // FINAL PHASE: Find teams by name and category only (no group)
            targetGroupId = null;
            
            targetTeam1 = allTeams.find(t => 
              t.teamName === sourceTeam1.teamName && 
              t.category === replicateToCategory
            );
            targetTeam2 = allTeams.find(t => 
              t.teamName === sourceTeam2.teamName && 
              t.category === replicateToCategory
            );
          }

          if (!targetTeam1 || !targetTeam2) {
            continue;
          }

          // Calculate new scheduled time with offset
          let newScheduledDate = matchData.scheduledDate ? new Date(matchData.scheduledDate) : new Date();
          if (timeOffset) {
            const [hours, minutes] = timeOffset.split(':').map(Number);
            newScheduledDate.setHours(newScheduledDate.getHours() + (hours || 0));
            newScheduledDate.setMinutes(newScheduledDate.getMinutes() + (minutes || 0));
          }

          const replicatedMatchData = {
            tournamentId,
            groupId: targetGroupId,
            phase: matchData.phase || 'group',
            round: matchData.round,
            team1Id: targetTeam1.id,
            team2Id: targetTeam2.id,
            scheduledDate: newScheduledDate,
            venue: matchData.venue,
            status: 'scheduled'
          };

          const replicatedMatch = await storage.createTournamentMatch(replicatedMatchData);
          createdMatches.push(replicatedMatch);
        }
      }

      res.json({
        success: true,
        matchesCreated: createdMatches.length,
        matches: createdMatches,
        replicated: !!replicateToCategory
      });
    } catch (error) {
      console.error('Error creating bulk tournament matches with replication:', error);
      res.status(500).json({ message: 'Failed to create tournament matches' });
    }
  });

  // Get matches for a tournament
  app.get("/api/tournaments/:id/matches", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const matches = await storage.getTournamentMatches(tournamentId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching tournament matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  // Update match result
  app.patch("/api/tournaments/matches/:id/result", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const { team1Score, team2Score } = req.body;
      
      const match = await storage.updateMatchResult(matchId, team1Score, team2Score);
      res.json(match);
    } catch (error) {
      console.error("Error updating match result:", error);
      res.status(500).json({ message: "Failed to update match result" });
    }
  });

  // Tournament Rankings Route
  app.get("/api/tournaments/:id/rankings", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const teams = await storage.getTournamentTeams(tournamentId);
      
      // Sort teams by points, goal difference, and goals for
      const rankedTeams = teams.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const aGD = a.goalsFor - a.goalsAgainst;
        const bGD = b.goalsFor - b.goalsAgainst;
        if (bGD !== aGD) return bGD - aGD;
        return b.goalsFor - a.goalsFor;
      });
      
      res.json(rankedTeams);
    } catch (error) {
      console.error("Error fetching tournament rankings:", error);
      res.status(500).json({ message: "Failed to fetch rankings" });
    }
  });

  // Get combined rankings for joint category tournaments
  app.get("/api/tournaments/:id/rankings/combined", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const tournament = await storage.getTournament(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      const teams = await storage.getTournamentTeams(tournamentId);
      const groups = await storage.getTournamentGroups(tournamentId);
      
      // Create rankings by group (aggregating clubs within each group)
      const rankingsByGroup: Record<string, any[]> = {};
      
      if (tournament.jointCategories) {
        // For joint category tournaments, first group by base group name (without category)
        // Then aggregate clubs across all categories within that base group
        const baseGroupsMap = new Map<string, number[]>(); // groupName -> groupIds[]
        
        for (const group of groups) {
          const baseGroupName = group.groupName.replace(/\s*(Sub-\d+|Sub-\d+\/\d+)\s*/g, '').trim();
          if (!baseGroupsMap.has(baseGroupName)) {
            baseGroupsMap.set(baseGroupName, []);
          }
          baseGroupsMap.get(baseGroupName)!.push(group.id);
        }
        
        // Now for each base group, aggregate all teams from all its category variants
        for (const [baseGroupName, groupIds] of baseGroupsMap.entries()) {
          // Get all teams from all category groups with this base name
          const groupTeams = teams.filter(team => groupIds.includes(team.groupId));
          
          // Group teams by club and sum statistics
          const clubMap = new Map<number, any>();
          
          for (const team of groupTeams) {
            const clubKey = team.adversaryTeamId || team.clubId;
            
            if (!clubMap.has(clubKey)) {
              // Initialize aggregated team
              clubMap.set(clubKey, {
                clubId: team.clubId,
                adversaryTeamId: team.adversaryTeamId,
                teamName: team.teamName.replace(/\s*(Sub-\d+|Sub-\d+\/\d+)\s*/g, '').trim(), // Remove category from name
                badgeUrl: team.badgeUrl,
                contactEmail: team.contactEmail,
                groupId: groupIds[0], // Use first group id as reference
                groupName: baseGroupName,
                points: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                matchesPlayed: 0,
              });
            }
            
            // Sum statistics across all categories
            const aggregated = clubMap.get(clubKey);
            aggregated.points += team.points || 0;
            aggregated.wins += team.wins || 0;
            aggregated.draws += team.draws || 0;
            aggregated.losses += team.losses || 0;
            aggregated.goalsFor += team.goalsFor || 0;
            aggregated.goalsAgainst += team.goalsAgainst || 0;
            aggregated.matchesPlayed += team.matchesPlayed || 0;
          }
          
          // Convert map to array and sort
          const groupRanking = Array.from(clubMap.values()).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const aGD = a.goalsFor - a.goalsAgainst;
            const bGD = b.goalsFor - b.goalsAgainst;
            if (bGD !== aGD) return bGD - aGD;
            return b.goalsFor - a.goalsFor;
          });
          
          // Store ranking by base group name
          rankingsByGroup[baseGroupName] = groupRanking;
        }
      } else {
        // Regular tournament: group teams by their group
        for (const group of groups) {
          const groupTeams = teams.filter(team => team.groupId === group.id);
          rankingsByGroup[group.groupName] = groupTeams.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const aGD = a.goalsFor - a.goalsAgainst;
            const bGD = b.goalsFor - b.goalsAgainst;
            if (bGD !== aGD) return bGD - aGD;
            return b.goalsFor - a.goalsFor;
          });
        }
      }
      
      // Also create rankings by category
      const categories = tournament.jointCategories && tournament.additionalCategories
        ? [tournament.category, ...tournament.additionalCategories].filter(Boolean)
        : [tournament.category].filter(Boolean);
      
      const rankingsByCategory: Record<string, any[]> = {};
      
      for (const category of categories) {
        const categoryTeams = teams.filter(team => team.category === category);
        rankingsByCategory[category] = categoryTeams.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          const aGD = a.goalsFor - a.goalsAgainst;
          const bGD = b.goalsFor - b.goalsAgainst;
          if (bGD !== aGD) return bGD - aGD;
          return b.goalsFor - a.goalsFor;
        });
      }
      
      res.json({
        byGroup: rankingsByGroup,
        byCategory: rankingsByCategory,
      });
    } catch (error) {
      console.error("Error fetching combined tournament rankings:", error);
      res.status(500).json({ message: "Failed to fetch combined rankings" });
    }
  });

  // Advance to next phase - finalize group phase and create knockout matches
  app.post("/api/tournaments/:id/advance-phase", isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      // Get tournament settings
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      // Get all teams
      const allTeams = await storage.getTournamentTeams(tournamentId);
      
      // Helper function to sort teams by ranking criteria
      const sortTeamsByRanking = (teams: any[]) => {
        const criteria = tournament.rankingCriteria?.split(",") || ["points", "goal_difference", "goals_for"];
        
        return teams.sort((a, b) => {
          for (const criterion of criteria) {
            let comparison = 0;
            
            switch (criterion.trim()) {
              case "points":
                comparison = (b.points || 0) - (a.points || 0);
                break;
              case "goal_difference":
                const aGD = (a.goalsFor || 0) - (a.goalsAgainst || 0);
                const bGD = (b.goalsFor || 0) - (b.goalsAgainst || 0);
                comparison = bGD - aGD;
                break;
              case "goals_for":
                comparison = (b.goalsFor || 0) - (a.goalsFor || 0);
                break;
              case "wins":
                comparison = (b.wins || 0) - (a.wins || 0);
                break;
              case "goals_against":
                comparison = (a.goalsAgainst || 0) - (b.goalsAgainst || 0);
                break;
              case "yellow_cards":
                comparison = (a.yellowCards || 0) - (b.yellowCards || 0); // Lower is better
                break;
              case "red_cards":
                comparison = (a.redCards || 0) - (b.redCards || 0); // Lower is better
                break;
              default:
                // Skip unknown criteria
                comparison = 0;
                break;
            }
            
            if (comparison !== 0) return comparison;
          }
          return 0;
        });
      };

      // Calculate qualified teams based on advancement type
      let qualifiedTeams: any[] = [];
      const advancementType = tournament.advancementType || 'by_group';
      
      if (advancementType === 'overall_ranking') {
        // Overall ranking: take N best teams from entire tournament
        const teamsAdvancingTotal = tournament.teamsAdvancingTotal || 16;
        
        // Sort all teams and take top N
        const rankedTeams = sortTeamsByRanking([...allTeams]);
        qualifiedTeams = rankedTeams.slice(0, teamsAdvancingTotal).map((t, idx) => ({
          ...t,
          overallPosition: idx + 1
        }));
        
      } else {
        // By group: take N best from each group (existing logic)
        const groups = await storage.getTournamentGroups(tournamentId);
        if (!groups || groups.length === 0) {
          return res.status(400).json({ message: "No groups found in tournament" });
        }
        
        const teamsPerGroup = tournament.teamsAdvancingPerGroup || 2;
        
        for (const group of groups) {
          // Get teams from this group
          const groupTeams = allTeams.filter(t => t.groupId === group.id);
          
          // Sort and take top N
          const ranked = sortTeamsByRanking([...groupTeams]);
          const groupQualified = ranked.slice(0, teamsPerGroup);
          
          qualifiedTeams.push(...groupQualified.map((t, idx) => ({
            ...t,
            groupPosition: idx + 1,
            groupName: group.groupName
          })));
        }
      }

      if (qualifiedTeams.length === 0) {
        return res.status(400).json({ message: "No teams qualified" });
      }

      // Separate teams with direct qualification vs regular qualified teams
      const directQualifyingCount = tournament.directQualifyingTeams || 0;
      const directQualifyingPhase = tournament.directQualifyingPhase;
      
      let directQualifiedTeams: any[] = [];
      let regularQualifiedTeams: any[] = [];
      
      if (directQualifyingCount > 0 && directQualifyingPhase) {
        // Top N teams get direct qualification to a later phase
        directQualifiedTeams = qualifiedTeams.slice(0, directQualifyingCount);
        regularQualifiedTeams = qualifiedTeams.slice(directQualifyingCount);
      } else {
        // All teams go to the same next phase
        regularQualifiedTeams = qualifiedTeams;
      }

      // Determine next phase for regular qualified teams
      let nextPhase = '';
      const totalRegular = regularQualifiedTeams.length;
      
      if (tournament.enableRoundOf16 && totalRegular >= 16) {
        nextPhase = 'round_of_16';
      } else if (tournament.enableQuarterFinals && totalRegular >= 8) {
        nextPhase = 'quarterfinals';
      } else if (tournament.enableSemiFinals && totalRegular >= 4) {
        nextPhase = 'semifinals';
      } else if (tournament.enableFinal && totalRegular >= 2) {
        nextPhase = 'final';
      } else {
        return res.status(400).json({ 
          message: `Not enough qualified teams (${totalRegular}) for any enabled phase` 
        });
      }

      // Create matches for regular qualified teams
      const matches: any[] = [];
      let matchCount = 0;

      if (nextPhase === 'round_of_16') {
        matchCount = 8; // 16 teams = 8 matches
      } else if (nextPhase === 'quarterfinals') {
        matchCount = 4; // 8 teams = 4 matches
      } else if (nextPhase === 'semifinals') {
        matchCount = 2; // 4 teams = 2 matches
      } else if (nextPhase === 'final') {
        matchCount = 1; // 2 teams = 1 match
      }

      // Pair teams for matches (1st vs last, 2nd vs 2nd-last, etc.)
      for (let i = 0; i < matchCount; i++) {
        const team1 = regularQualifiedTeams[i];
        const team2 = regularQualifiedTeams[regularQualifiedTeams.length - 1 - i];
        
        if (team1 && team2) {
          const matchData = {
            tournamentId,
            team1Id: team1.id,
            team2Id: team2.id,
            phase: nextPhase,
            status: 'scheduled' as const,
            scheduledDate: null,
            venue: null,
          };
          
          const match = await storage.createTournamentMatch(matchData);
          matches.push(match);
        }
      }

      // Note: Direct qualified teams will be matched in their phase when regular teams advance
      // For now, we just acknowledge them

      res.json({
        success: true,
        nextPhase,
        qualifiedTeams: qualifiedTeams.length,
        regularQualifiedTeams: regularQualifiedTeams.length,
        directQualifiedTeams: directQualifiedTeams.length,
        directQualifyingPhase: directQualifiedTeams.length > 0 ? directQualifyingPhase : null,
        matchesCreated: matches.length,
        matches
      });
    } catch (error) {
      console.error("Error advancing to next phase:", error);
      res.status(500).json({ message: "Failed to advance to next phase" });
    }
  });

  app.get("/api/insights/tactical", isAuthenticated, async (req, res) => {
    try {
      const { analyzeTacticalPatterns } = await import("./ai-insights");
      
      const games = await storage.getGames();
      const gameEvaluations = await storage.getGameEvaluations();

      const tacticalInsight = await analyzeTacticalPatterns(games, gameEvaluations);

      res.json(tacticalInsight);
    } catch (error) {
      console.error("Error analyzing tactical patterns:", error);
      res.status(500).json({ message: "Failed to analyze tactical patterns" });
    }
  });

  // Training attendance routes
  app.post("/api/training-attendance", isAuthenticated, async (req, res) => {
    try {
      const { sessionId, attendanceData, recordedBy } = req.body;
      
      // Save attendance data to system config or create a new table
      const attendanceKey = `training_attendance_${sessionId}`;
      await storage.setConfigValue(attendanceKey, {
        sessionId,
        attendanceData,
        recordedBy,
        recordedAt: new Date().toISOString()
      }, `Attendance for training session ${sessionId}`);
      
      res.json({ message: "Attendance saved successfully" });
    } catch (error) {
      console.error("Error saving attendance:", error);
      res.status(500).json({ message: "Failed to save attendance" });
    }
  });

  app.get("/api/training-attendance/:sessionId", isAuthenticated, async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const attendanceKey = `training_attendance_${sessionId}`;
      
      const attendance = await storage.getConfigValue(attendanceKey);
      res.json(attendance || { attendanceData: {} });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  // Training reports routes
  app.get("/api/training-reports/:sessionId", isAuthenticated, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      
      // Get training session details
      const session = await storage.getTrainingSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Training session not found" });
      }
      
      // Get evaluations for this session
      const evaluations = await storage.getTrainingEvaluations(sessionId);
      
      // Get all athletes for names
      const athletes = await storage.getAthletes();
      
      // Build attendance data from evaluations
      const attendanceData: any[] = [];
      
      // Get attendance data from config as fallback
      const attendanceKey = `training_attendance_${sessionId}`;
      const configAttendance = await storage.getConfigValue(attendanceKey);
      
      // Build attendance array from evaluations and config data
      if (evaluations && evaluations.length > 0) {
        evaluations.forEach((evaluation: any) => {
          const athlete = athletes.find((a: any) => a.id === evaluation.athleteId);
          if (athlete) {
            attendanceData.push({
              athleteId: evaluation.athleteId,
              firstName: athlete.firstName,
              lastName: athlete.lastName,
              present: evaluation.attendance || false,
              justification: evaluation.justification || ""
            });
          }
        });
      }
      
      // Add athletes from config attendance if not already in evaluations
      if (configAttendance && configAttendance.attendanceData) {
        Object.entries(configAttendance.attendanceData).forEach(([athleteId, data]: [string, any]) => {
          const athlete = athletes.find((a: any) => a.id === parseInt(athleteId));
          const alreadyExists = attendanceData.some((a: any) => a.athleteId === parseInt(athleteId));
          
          if (athlete && !alreadyExists) {
            attendanceData.push({
              athleteId: parseInt(athleteId),
              firstName: athlete.firstName,
              lastName: athlete.lastName,
              present: data.present || false,
              justification: data.justification || ""
            });
          }
        });
      }
      
      const report = {
        session,
        attendance: attendanceData,
        evaluations,
        athletes,
        generatedAt: new Date().toISOString()
      };
      
      res.json(report);
    } catch (error) {
      console.error("Error generating training report:", error);
      res.status(500).json({ message: "Failed to generate training report" });
    }
  });

  app.get("/api/training-reports", isAuthenticated, async (req, res) => {
    try {
      const sessions = await storage.getTrainingSessions();
      const reports = [];
      
      for (const session of sessions) {
        const attendanceKey = `training_attendance_${session.id}`;
        const attendance = await storage.getConfigValue(attendanceKey);
        const evaluations = await storage.getTrainingEvaluations(session.id);
        
        reports.push({
          sessionId: session.id,
          sessionTitle: session.title,
          sessionDate: session.date,
          hasAttendance: !!attendance,
          evaluationCount: evaluations.length,
          lastUpdated: attendance?.recordedAt || null
        });
      }
      
      res.json(reports);
    } catch (error) {
      console.error("Error fetching training reports:", error);
      res.status(500).json({ message: "Failed to fetch training reports" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Teams routes
  app.get('/api/teams', isAuthenticated, async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get('/api/teams/:id', isAuthenticated, async (req, res) => {
    try {
      const team = await storage.getTeam(parseInt(req.params.id));
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.post('/api/teams', isAuthenticated, requirePermission(MODULES.TEAMS, ACTIONS.CREATE), async (req: any, res) => {
    try {
      // Get current user's club and season context
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.clubId || !user?.seasonId) {
        return res.status(400).json({ 
          message: "User must have a selected club and season to create teams" 
        });
      }

      // Inject club and season context into team data
      const teamData = {
        ...req.body,
        clubId: user.clubId,
        seasonId: user.seasonId,
      };

      const validatedData = insertTeamSchema.parse(teamData);
      const team = await storage.createTeam(validatedData);
      res.status(201).json(team);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.put('/api/teams/:id', isAuthenticated, requirePermission(MODULES.TEAMS, ACTIONS.EDIT), async (req, res) => {
    try {
      const validatedData = insertTeamSchema.partial().parse(req.body);
      const team = await storage.updateTeam(parseInt(req.params.id), validatedData);
      res.json(team);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.patch('/api/teams/:id', isAuthenticated, requirePermission(MODULES.TEAMS, ACTIONS.EDIT), async (req, res) => {
    try {
      const team = await storage.updateTeam(parseInt(req.params.id), req.body);
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.delete('/api/teams/:id', isAuthenticated, requirePermission(MODULES.TEAMS, ACTIONS.DELETE), async (req, res) => {
    try {
      await storage.deleteTeam(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Athlete routes
  app.get('/api/athletes', isAuthenticated, requireModuleAccess(MODULES.ATHLETES), async (req, res) => {
    try {
      const athletes = await storage.getAthletes();
      res.json(athletes);
    } catch (error) {
      console.error("Error fetching athletes:", error);
      res.status(500).json({ message: "Failed to fetch athletes" });
    }
  });

  app.get('/api/athletes/:id', isAuthenticated, requireModuleAccess(MODULES.ATHLETES), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const athlete = await storage.getAthlete(id);
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }
      res.json(athlete);
    } catch (error) {
      console.error("Error fetching athlete:", error);
      res.status(500).json({ message: "Failed to fetch athlete" });
    }
  });

  app.post('/api/athletes', isAuthenticated, requirePermission(MODULES.ATHLETES, ACTIONS.CREATE), async (req, res) => {
    try {
      // Ensure seasonId is set from user context if not provided
      if (!req.body.seasonId && req.user) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (user?.seasonId) {
          req.body.seasonId = user.seasonId;
        }
      }
      
      const validatedData = insertAthleteSchema.parse(req.body);
      
      const athlete = await storage.createAthlete(validatedData);
      res.status(201).json(athlete);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating athlete:", error);
      res.status(500).json({ message: "Failed to create athlete" });
    }
  });

  app.put('/api/athletes/:id', isAuthenticated, requirePermission(MODULES.ATHLETES, ACTIONS.EDIT), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateAthleteSchema.parse(req.body);
      const athlete = await storage.updateAthlete(id, validatedData);
      res.json(athlete);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating athlete:", error);
      res.status(500).json({ message: "Failed to update athlete" });
    }
  });

  app.delete('/api/athletes/:id', isAuthenticated, requirePermission(MODULES.ATHLETES, ACTIONS.DELETE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAthlete(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting athlete:", error);
      res.status(500).json({ message: "Failed to delete athlete" });
    }
  });

  // Training session routes
  app.get('/api/training-sessions', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      const user = userId ? await storage.getUser(userId) : null;
      
      let sessions = await storage.getTrainingSessions();
      
      // Filter by athlete category if user is an athlete
      if (user?.athleteId) {
        const athlete = await storage.getAthlete(user.athleteId);
        if (athlete && athlete.category && Array.isArray(athlete.category)) {
          sessions = sessions.filter(session => 
            athlete.category.includes(session.category)
          );
        }
      }
      
      // Filter for today's sessions only if requested for RPE
      if (req.query.today === 'true') {
        const today = new Date();
        // Get local date without UTC conversion
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`; // YYYY-MM-DD in local time
        const todaySessions = sessions.filter(session => session.date === todayStr);
        return res.json(todaySessions);
      }
      
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching training sessions:", error);
      res.status(500).json({ message: "Failed to fetch training sessions" });
    }
  });

  app.get('/api/training-sessions/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid training session ID" });
      }

      const user = req.user as any;
      const session = await storage.getTrainingSession(id);
      if (!session) {
        return res.status(404).json({ message: "Training session not found" });
      }

      // Filter by category if user is an athlete
      if (user?.athleteId) {
        const athlete = await storage.getAthlete(user.athleteId);
        if (athlete && athlete.category && Array.isArray(athlete.category)) {
          // Check if session category matches any of athlete's categories (case-insensitive)
          const hasMatchingCategory = athlete.category.some(
            (cat: string) => cat.toLowerCase() === session.category.toLowerCase()
          );
          if (!hasMatchingCategory) {
            return res.status(404).json({ message: "Training session not found" });
          }
        }
      }

      res.json(session);
    } catch (error) {
      console.error("Error fetching training session:", error);
      res.status(500).json({ message: "Failed to fetch training session" });
    }
  });

  app.post('/api/training-sessions', isAuthenticated, requirePermission(MODULES.TRAINING, ACTIONS.CREATE), async (req: any, res) => {
    try {
      const validatedData = insertTrainingSessionSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      const session = await storage.createTrainingSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating training session:", error);
      res.status(500).json({ message: "Failed to create training session" });
    }
  });

  app.put('/api/training-sessions/:id', isAuthenticated, requirePermission(MODULES.TRAINING, ACTIONS.EDIT), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid training session ID" });
      }

      const validatedData = insertTrainingSessionSchema.partial().parse(req.body);
      const session = await storage.updateTrainingSession(id, validatedData);
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating training session:", error);
      res.status(500).json({ message: "Failed to update training session" });
    }
  });

  app.delete('/api/training-sessions/:id', isAuthenticated, requirePermission(MODULES.TRAINING, ACTIONS.DELETE), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid training session ID" });
      }

      await storage.deleteTrainingSession(id);
      res.status(200).json({ message: "Training session deleted successfully" });
    } catch (error) {
      console.error("Error deleting training session:", error);
      res.status(500).json({ message: "Failed to delete training session" });
    }
  });

  // Training drills routes
  app.get('/api/training-drills', isAuthenticated, async (req: any, res) => {
    try {
      const { isPredefined, type, category } = req.query;
      const user = await storage.getUser(req.user.claims.sub);
      
      const drills = await storage.getTrainingDrills(user?.clubId || null, {
        isPredefined: isPredefined === 'true' ? true : isPredefined === 'false' ? false : undefined,
        type: type as string | undefined,
        category: category as string | undefined,
      });
      res.json(drills);
    } catch (error) {
      console.error("Error fetching training drills:", error);
      res.status(500).json({ message: "Failed to fetch training drills" });
    }
  });

  app.post('/api/training-drills', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.clubId) {
        return res.status(400).json({ message: "User must be associated with a club to create custom drills" });
      }
      
      const validatedData = insertTrainingDrillSchema.parse({
        ...req.body,
        isPredefined: false,
        createdBy: req.user.claims.sub,
      });
      const drill = await storage.createTrainingDrill(user.clubId, validatedData);
      res.status(201).json(drill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating training drill:", error);
      res.status(500).json({ message: "Failed to create training drill" });
    }
  });

  // Training stages routes
  app.get('/api/training-stages/:sessionId', isAuthenticated, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }
      
      const stages = await storage.getTrainingStages(sessionId);
      res.json(stages);
    } catch (error) {
      console.error("Error fetching training stages:", error);
      res.status(500).json({ message: "Failed to fetch training stages" });
    }
  });

  app.post('/api/training-stages', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTrainingStageSchema.parse(req.body);
      const stage = await storage.createTrainingStage(validatedData);
      res.status(201).json(stage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating training stage:", error);
      res.status(500).json({ message: "Failed to create training stage" });
    }
  });

  // Training stage drills routes
  app.get('/api/training-stage-drills/:stageId', isAuthenticated, async (req, res) => {
    try {
      const stageId = parseInt(req.params.stageId);
      if (isNaN(stageId)) {
        return res.status(400).json({ message: "Invalid stage ID" });
      }
      
      const drills = await storage.getTrainingStageDrills(stageId);
      res.json(drills);
    } catch (error) {
      console.error("Error fetching training stage drills:", error);
      res.status(500).json({ message: "Failed to fetch training stage drills" });
    }
  });

  app.post('/api/training-stage-drills', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTrainingStageDrillSchema.parse(req.body);
      const stageDrill = await storage.createTrainingStageDrill(validatedData);
      res.status(201).json(stageDrill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating training stage drill:", error);
      res.status(500).json({ message: "Failed to create training stage drill" });
    }
  });

  // Training evaluation routes
  app.get('/api/training-evaluations', isAuthenticated, async (req, res) => {
    try {
      const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : undefined;
      const athleteId = req.query.athleteId ? parseInt(req.query.athleteId as string) : undefined;
      const evaluations = await storage.getTrainingEvaluations(sessionId, athleteId);
      res.json(evaluations);
    } catch (error) {
      console.error("Error fetching training evaluations:", error);
      res.status(500).json({ message: "Failed to fetch training evaluations" });
    }
  });

  app.post('/api/training-evaluations', isAuthenticated, async (req: any, res) => {
    try {
      const dataToValidate = {
        ...req.body,
        evaluatedBy: req.user.claims.sub,
      };
      
      const validatedData = insertTrainingEvaluationSchema.parse(dataToValidate);
      const evaluation = await storage.createTrainingEvaluation(validatedData);
      res.status(201).json(evaluation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating training evaluation:", error);
      res.status(500).json({ message: "Failed to create training evaluation" });
    }
  });

  app.put('/api/training-evaluations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const evaluationId = parseInt(req.params.id);
      
      // Extract only valid fields for training evaluation
      const allowedFields = {
        trainingSessionId: req.body.trainingSessionId,
        athleteId: req.body.athleteId,
        attendance: req.body.attendance,
        technicalRating: req.body.technicalRating,
        physicalRating: req.body.physicalRating,
        tacticalRating: req.body.tacticalRating,
        mentalRating: req.body.mentalRating,
        disciplineRating: req.body.disciplineRating,
        notes: req.body.notes,
        strengths: req.body.strengths,
        improvements: req.body.improvements,
        justification: req.body.justification,
        evaluatedBy: req.user.claims.sub,
      };

      // Remove undefined fields
      const cleanData = Object.fromEntries(
        Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
      );

      const evaluation = await storage.updateTrainingEvaluation(evaluationId, cleanData);
      res.json(evaluation);
    } catch (error) {
      console.error("Error updating training evaluation:", error);
      res.status(500).json({ message: "Failed to update training evaluation" });
    }
  });

  // Game routes (including tournament matches)
  app.get('/api/games', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.clubId || !user?.seasonId) {
        return res.status(400).json({ message: "User must have club and season selected" });
      }

      // Get athlete categories if user is an athlete
      let athleteCategories: string[] | null = null;
      if (user.athleteId) {
        const athlete = await storage.getAthlete(user.athleteId);
        if (athlete && athlete.category && Array.isArray(athlete.category)) {
          athleteCategories = athlete.category;
        }
      }

      // Get regular games
      let games = await storage.getGames();
      
      // Filter games by category if user is an athlete
      if (athleteCategories) {
        games = games.filter(game => {
          if (!game.category) return false;
          
          // Split game category by "/" to handle composite categories (e.g., "Sub-15/17")
          const gameCategories = game.category.split('/').map(c => c.trim());
          
          // Check if any of the athlete's categories matches any of the game's categories (case-insensitive)
          return athleteCategories!.some(athleteCategory => 
            gameCategories.some(gameCat => 
              gameCat.toLowerCase().includes(athleteCategory.toLowerCase()) || 
              athleteCategory.toLowerCase().includes(gameCat.toLowerCase())
            )
          );
        });
      }
      
      // Get tournament matches where this club is participating
      let tournamentMatches = await storage.getClubTournamentMatches(user.clubId, user.seasonId);
      
      // Filter tournament matches by category if user is an athlete
      if (athleteCategories) {
        tournamentMatches = tournamentMatches.filter(match => {
          // Tournament matches can have categories like "Sub-15", "Sub-17" or "Sub-15/17"
          // Check if the match category matches any of the athlete's categories
          if (!match.category) return false;
          
          // Split match category by "/" to handle composite categories (e.g., "Sub-15/17")
          const matchCategories = match.category.split('/').map(c => c.trim());
          
          // Check if any of the athlete's categories matches any of the match's categories (case-insensitive)
          return athleteCategories!.some(athleteCategory => 
            matchCategories.some(matchCat => 
              matchCat.toLowerCase().includes(athleteCategory.toLowerCase()) || 
              athleteCategory.toLowerCase().includes(matchCat.toLowerCase())
            )
          );
        });
      }
      
      // Convert tournament matches to game format
      const convertedMatches = tournamentMatches.map(match => {
        // Extract date and time, converting from UTC to Brazil time (UTC-3)
        let dateStr = null;
        let timeStr = null;
        
        if (match.scheduledDate) {
          // Database stores UTC time, subtract 3 hours to get Brazil time
          const utcTime = match.scheduledDate.getTime();
          const brazilTime = new Date(utcTime - (3 * 60 * 60 * 1000));
          
          // Format as YYYY-MM-DD and HH:MM
          const year = brazilTime.getUTCFullYear();
          const month = String(brazilTime.getUTCMonth() + 1).padStart(2, '0');
          const day = String(brazilTime.getUTCDate()).padStart(2, '0');
          const hours = String(brazilTime.getUTCHours()).padStart(2, '0');
          const minutes = String(brazilTime.getUTCMinutes()).padStart(2, '0');
          
          dateStr = `${year}-${month}-${day}`;
          timeStr = `${hours}:${minutes}`;
        }
        
        return {
          id: `tournament_${match.id}`,
          opponent: match.isHome ? match.awayTeamName : match.homeTeamName,
          date: dateStr,
          time: timeStr,
          location: match.venue || 'Local não definido',
          category: match.category || 'Torneio',
          type: 'tournament',
          isHome: match.isHome,
          ourScore: match.isHome ? match.team1Score : match.team2Score,
          opponentScore: match.isHome ? match.team2Score : match.team1Score,
          status: match.status,
          tournamentId: match.tournamentId,
          tournamentName: match.tournamentName,
          phase: match.phase,
          notes: match.notes,
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
          isTournamentMatch: true
        };
      });
      
      // Combine and sort by date
      const allGames = [...games, ...convertedMatches].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      res.json(allGames);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.post('/api/games', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const validatedData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(validatedData);
      res.status(201).json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating game:", error);
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  app.get('/api/games/:id', isAuthenticated, async (req, res) => {
    try {
      const game = await storage.getGame(parseInt(req.params.id));
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      console.error("Error fetching game:", error);
      res.status(500).json({ message: "Failed to fetch game" });
    }
  });

  app.put('/api/games/:id', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const validatedData = insertGameSchema.partial().parse(req.body);
      const game = await storage.updateGame(parseInt(req.params.id), validatedData);
      res.json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating game:", error);
      res.status(500).json({ message: "Failed to update game" });
    }
  });

  app.delete('/api/games/:id', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.DELETE), async (req, res) => {
    try {
      await storage.deleteGame(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting game:", error);
      res.status(500).json({ message: "Failed to delete game" });
    }
  });

  // Game Call-ups
  app.get("/api/games/:id/call-ups", isAuthenticated, async (req, res) => {
    try {
      const gameIdParam = req.params.id;
      
      // Handle tournament games
      if (gameIdParam.startsWith('tournament_')) {
        const tournamentData = getTournamentGameData(gameIdParam);
        res.json(tournamentData.callUps);
        return;
      }
      
      const gameId = parseInt(gameIdParam);
      const callUps = await storage.getGameCallUps(gameId);
      res.json(callUps);
    } catch (error) {
      console.error("Error fetching game call-ups:", error);
      res.status(500).json({ message: "Failed to fetch game call-ups" });
    }
  });

  app.post("/api/games/:id/call-ups", isAuthenticated, async (req, res) => {
    try {
      const gameIdParam = req.params.id;
      
      // Handle tournament games
      if (gameIdParam.startsWith('tournament_')) {
        const tournamentData = getTournamentGameData(gameIdParam);
        const callUp = {
          id: Date.now(), // temporary ID
          gameId: gameIdParam,
          athleteId: req.body.athleteId,
          callUpStatus: 'confirmed', // Always confirmed when called up
          isStarter: false, // Will be set later in Escalação tab
          isCaptain: false,
          createdAt: new Date().toISOString()
        };
        tournamentData.callUps.push(callUp);
        res.json(callUp);
        return;
      }
      
      const gameId = parseInt(gameIdParam);
      const callUpData = { 
        ...req.body, 
        gameId,
        callUpStatus: 'confirmed' // Always confirmed when called up
      };
      const callUp = await storage.createGameCallUp(callUpData);
      res.json(callUp);
    } catch (error) {
      console.error("Error creating game call-up:", error);
      res.status(500).json({ message: "Failed to create game call-up" });
    }
  });

  app.patch("/api/games/:id/call-ups/:callUpId", isAuthenticated, async (req, res) => {
    try {
      const gameIdParam = req.params.id;
      const callUpId = req.params.callUpId;
      
      // Handle tournament games
      if (gameIdParam.startsWith('tournament_')) {
        const tournamentData = getTournamentGameData(gameIdParam);
        const callUpIndex = tournamentData.callUps.findIndex(c => c.id.toString() === callUpId);
        
        if (callUpIndex === -1) {
          return res.status(404).json({ message: "Call-up not found" });
        }
        
        tournamentData.callUps[callUpIndex] = {
          ...tournamentData.callUps[callUpIndex],
          ...req.body
        };
        
        res.json(tournamentData.callUps[callUpIndex]);
        return;
      }
      
      const numericCallUpId = parseInt(callUpId);
      const callUp = await storage.updateGameCallUp(numericCallUpId, req.body);
      res.json(callUp);
    } catch (error) {
      console.error("Error updating game call-up:", error);
      res.status(500).json({ message: "Failed to update game call-up" });
    }
  });

  app.delete("/api/games/:id/call-ups/:callUpId", isAuthenticated, async (req, res) => {
    try {
      const gameIdParam = req.params.id;
      const callUpId = req.params.callUpId;
      
      // Handle tournament games
      if (gameIdParam.startsWith('tournament_')) {
        const tournamentData = getTournamentGameData(gameIdParam);
        const callUpIndex = tournamentData.callUps.findIndex(c => c.id.toString() === callUpId);
        
        if (callUpIndex === -1) {
          return res.status(404).json({ message: "Call-up not found" });
        }
        
        tournamentData.callUps.splice(callUpIndex, 1);
        res.json({ message: "Game call-up deleted successfully" });
        return;
      }
      
      const numericCallUpId = parseInt(callUpId);
      await storage.deleteGameCallUp(numericCallUpId);
      res.json({ message: "Game call-up deleted successfully" });
    } catch (error) {
      console.error("Error deleting game call-up:", error);
      res.status(500).json({ message: "Failed to delete game call-up" });
    }
  });

  // Toggle Captain
  app.post("/api/games/:id/toggle-captain", isAuthenticated, async (req, res) => {
    try {
      const gameIdParam = req.params.id;
      const { athleteId } = req.body;
      
      // Handle tournament games
      if (gameIdParam.startsWith('tournament_')) {
        const tournamentData = getTournamentGameData(gameIdParam);
        
        // Find the target player first
        const targetCallUp = tournamentData.callUps.find((c: any) => c.athleteId === athleteId);
        
        if (!targetCallUp) {
          return res.status(404).json({ message: "Player not found in call-ups" });
        }
        
        // Capture current captain status before making changes
        const wasAlreadyCaptain = targetCallUp.isCaptain;
        
        // Remove captain from all players
        tournamentData.callUps.forEach((callUp: any) => {
          callUp.isCaptain = false;
        });
        
        // Toggle: if was not captain, make captain; if was captain, leave as not captain
        if (!wasAlreadyCaptain) {
          targetCallUp.isCaptain = true;
        }
        
        res.json({ message: "Captain toggled successfully", callUps: tournamentData.callUps });
        return;
      }
      
      const gameId = parseInt(gameIdParam);
      
      // Get all call-ups for this game
      const allCallUps = await storage.getGameCallUps(gameId);
      
      // Find the target player
      const targetCallUp = allCallUps.find((c: any) => c.athleteId === athleteId);
      
      if (!targetCallUp) {
        return res.status(404).json({ message: "Player not found in call-ups" });
      }
      
      // If player is already captain, remove captain status
      if (targetCallUp.isCaptain) {
        await storage.updateGameCallUp(targetCallUp.id, { isCaptain: false });
        res.json({ message: "Captain removed", isCaptain: false });
        return;
      }
      
      // Remove captain from all other players
      for (const callUp of allCallUps) {
        if (callUp.isCaptain && callUp.id !== targetCallUp.id) {
          await storage.updateGameCallUp(callUp.id, { isCaptain: false });
        }
      }
      
      // Set new captain
      await storage.updateGameCallUp(targetCallUp.id, { isCaptain: true });
      
      res.json({ message: "Captain set successfully", isCaptain: true });
    } catch (error) {
      console.error("Error toggling captain:", error);
      res.status(500).json({ message: "Failed to toggle captain" });
    }
  });

  // Game Lineup
  app.get("/api/games/:id/lineup", isAuthenticated, async (req, res) => {
    try {
      const gameIdParam = req.params.id;
      
      // Handle tournament games
      if (gameIdParam.startsWith('tournament_')) {
        res.json([]);
        return;
      }
      
      const gameId = parseInt(gameIdParam);
      const lineup = await storage.getGameLineup(gameId);
      res.json(lineup);
    } catch (error) {
      console.error("Error fetching game lineup:", error);
      res.status(500).json({ message: "Failed to fetch game lineup" });
    }
  });

  app.post("/api/games/:id/lineup", isAuthenticated, async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const lineupData = { ...req.body, gameId };
      const lineup = await storage.createGameLineup(lineupData);
      res.json(lineup);
    } catch (error) {
      console.error("Error creating game lineup:", error);
      res.status(500).json({ message: "Failed to create game lineup" });
    }
  });

  app.delete("/api/games/:id/lineup/:lineupId", isAuthenticated, async (req, res) => {
    try {
      const lineupId = parseInt(req.params.lineupId);
      await storage.deleteGameLineup(lineupId);
      res.json({ message: "Game lineup deleted successfully" });
    } catch (error) {
      console.error("Error deleting game lineup:", error);
      res.status(500).json({ message: "Failed to delete game lineup" });
    }
  });

  // Game Formation
  app.get("/api/games/:id/formation", isAuthenticated, async (req, res) => {
    try {
      const gameIdParam = req.params.id;
      
      // Handle tournament games
      if (gameIdParam.startsWith('tournament_')) {
        res.json(null);
        return;
      }
      
      const gameId = parseInt(gameIdParam);
      const formation = await storage.getGameFormation(gameId);
      res.json(formation);
    } catch (error) {
      console.error("Error fetching game formation:", error);
      res.status(500).json({ message: "Failed to fetch game formation" });
    }
  });

  app.post("/api/games/:id/formation", isAuthenticated, async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const formationData = { ...req.body, gameId };
      const formation = await storage.createGameFormation(formationData);
      res.json(formation);
    } catch (error) {
      console.error("Error creating game formation:", error);
      res.status(500).json({ message: "Failed to create game formation" });
    }
  });

  // Player Game Analysis
  app.get("/api/games/:id/player-analysis", isAuthenticated, async (req, res) => {
    try {
      const gameIdParam = req.params.id;
      
      // Handle tournament games
      if (gameIdParam.startsWith('tournament_')) {
        res.json([]);
        return;
      }
      
      const gameId = parseInt(gameIdParam);
      const analysis = await storage.getPlayerGameAnalysis(gameId);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching player game analysis:", error);
      res.status(500).json({ message: "Failed to fetch player game analysis" });
    }
  });

  app.post("/api/games/:id/player-analysis", isAuthenticated, async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const analysisData = { ...req.body, gameId };
      const analysis = await storage.createPlayerGameAnalysis(analysisData);
      res.json(analysis);
    } catch (error) {
      console.error("Error creating player game analysis:", error);
      res.status(500).json({ message: "Failed to create player game analysis" });
    }
  });

  // Team Game Analysis
  app.get("/api/games/:id/team-analysis", isAuthenticated, async (req, res) => {
    try {
      const gameIdParam = req.params.id;
      
      // Handle tournament games
      if (gameIdParam.startsWith('tournament_')) {
        res.json([]);
        return;
      }
      
      const gameId = parseInt(gameIdParam);
      const analysis = await storage.getTeamGameAnalysis(gameId);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching team game analysis:", error);
      res.status(500).json({ message: "Failed to fetch team game analysis" });
    }
  });

  app.post("/api/games/:id/team-analysis", isAuthenticated, async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const analysisData = { ...req.body, gameId };
      const analysis = await storage.createTeamGameAnalysis(analysisData);
      res.json(analysis);
    } catch (error) {
      console.error("Error creating team game analysis:", error);
      res.status(500).json({ message: "Failed to create team game analysis" });
    }
  });

  // Generate Call-up PDF
  app.get("/api/games/:id/generate-callup-pdf", isAuthenticated, async (req: any, res) => {
    try {
      const gameIdParam = req.params.id;
      const PDFDocument = (await import("pdfkit")).default;
      
      // Handle tournament games
      let game: any;
      let callUps: any[] = [];
      
      if (gameIdParam.startsWith('tournament_')) {
        // Extract numeric match ID from tournament_123 format
        const matchId = parseInt(gameIdParam.replace('tournament_', ''));
        game = await storage.getTournamentMatch(matchId);
        
        const tournamentData = getTournamentGameData(gameIdParam);
        callUps = tournamentData.callUps;
      } else {
        const gameId = parseInt(gameIdParam);
        game = await storage.getGame(gameId);
        callUps = await storage.getGameCallUps(gameId);
      }
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // Get club and athletes data
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      const club = user?.clubId ? await storage.getClub(user.clubId) : null;
      
      // Get athlete details for call-ups
      const athleteIds = callUps.map((c: any) => c.athleteId);
      const athletes = await Promise.all(
        athleteIds.map((id: number) => storage.getAthlete(id))
      );
      
      // Determine if it's a tournament game and prepare data accordingly
      const isTournamentGame = gameIdParam.startsWith('tournament_');
      let category, opponent, gameDate, gameTime, location, gameType;
      
      if (isTournamentGame) {
        // For tournament games, fetch team names
        const team1 = await storage.getTournamentTeam(game.team1Id);
        const team2 = await storage.getTournamentTeam(game.team2Id);
        
        category = team1?.category || 'SUB-15';
        opponent = team2?.teamName || 'Adversário';
        gameDate = new Date(game.scheduledDate || new Date());
        gameTime = gameDate.toTimeString().substring(0, 5);
        location = game.venue || 'A definir';
        gameType = game.phase?.toUpperCase() || 'TORNEIO';
      } else {
        category = game.category || 'SUB-15';
        opponent = game.opponent || 'Adversário';
        gameDate = new Date(game.date);
        gameTime = game.time?.substring(0, 5) || '09:00';
        location = game.location || 'A definir';
        gameType = game.type?.toUpperCase() || 'AMISTOSO';
      }
      
      // Create PDF document
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Convocacao_${game.id}_${Date.now()}.pdf`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Add content
      const pageWidth = 595.28;
      const centerX = pageWidth / 2;
      
      // Header - Club Name
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text(club?.name || 'ESSUBE', 0, 50, { align: 'center' });
      
      // Category bar
      doc.rect(40, 90, pageWidth - 80, 30)
         .fillAndStroke('#0066CC', '#0066CC');
      
      doc.fontSize(16)
         .fillColor('white')
         .font('Helvetica-Bold')
         .text(`CATEGORIA ${category.toUpperCase()}`, 0, 97, { align: 'center' });
      
      // Game title
      doc.fillColor('black')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(`JOGO ${gameType}`, 0, 140, { align: 'center' });
      
      // Match info
      doc.fontSize(12)
         .font('Helvetica')
         .text(`${club?.shortName || 'ESU'} X ${opponent}`, 0, 165, { align: 'center' });
      
      // Date
      const formattedDate = gameDate.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).toUpperCase();
      
      doc.fontSize(11)
         .text(`${formattedDate}`, 0, 185, { align: 'center' });
      
      // Schedule section
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('white')
         .rect(40, 220, pageWidth - 80, 25)
         .fillAndStroke('#0066CC', '#0066CC')
         .text('CRONOGRAMA', 0, 226, { align: 'center' });
      
      doc.fillColor('black')
         .fontSize(10)
         .font('Helvetica');
      
      // Schedule items
      const scheduleItems = [
        { time: '07:00H', event: 'Apresentação' },
        { time: '08:10H', event: 'Uniforme de jogo' },
        { time: '08:20H', event: 'Preleção' },
        { time: '08:40H', event: 'Aquecimento (Campo)' },
        { time: gameTime, event: `${club?.shortName || 'ESU'} X ${opponent}` },
      ];
      
      let yPos = 260;
      scheduleItems.forEach(item => {
        doc.font('Helvetica-Bold').text(item.time, 60, yPos, { width: 100 });
        doc.font('Helvetica').text(item.event, 180, yPos);
        yPos += 20;
      });
      
      // Technical Commission
      yPos += 10;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('white')
         .rect(40, yPos, pageWidth - 80, 25)
         .fillAndStroke('#0066CC', '#0066CC')
         .text('COMISSÃO TÉCNICA', 0, yPos + 6, { align: 'center' });
      
      // Players list
      yPos += 40;
      doc.fontSize(14)
         .fillColor('white')
         .rect(40, yPos, pageWidth - 80, 25)
         .fillAndStroke('#0066CC', '#0066CC')
         .text('ATLETAS RELACIONADOS', 0, yPos + 6, { align: 'center' });
      
      yPos += 35;
      doc.fillColor('black')
         .fontSize(10)
         .font('Helvetica');
      
      // List confirmed players
      const confirmedCallUps = callUps.filter((c: any) => c.callUpStatus === 'confirmed');
      confirmedCallUps.forEach((callUp: any, index: number) => {
        const athlete = athletes.find((a: any) => a?.id === callUp.athleteId);
        if (athlete) {
          const playerNumber = index + 1;
          const isCaptain = callUp.isCaptain ? ' ©' : '';
          doc.font('Helvetica-Bold')
             .text(`${playerNumber}`, 60, yPos, { width: 30 });
          doc.font('Helvetica')
             .text(`${athlete.firstName} ${athlete.lastName}${isCaptain}`, 100, yPos);
          yPos += 18;
          
          // Add new page if needed
          if (yPos > 750) {
            doc.addPage();
            yPos = 50;
          }
        }
      });
      
      // Orientations
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      } else {
        yPos += 20;
      }
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('white')
         .rect(40, yPos, pageWidth - 80, 25)
         .fillAndStroke('#0066CC', '#0066CC')
         .text('ORIENTAÇÕES AOS ATLETAS', 0, yPos + 6, { align: 'center' });
      
      yPos += 35;
      doc.fillColor('black')
         .fontSize(9)
         .font('Helvetica')
         .text('Apresentação sempre com uniforme de treino, tênis e', 60, yPos);
      yPos += 15;
      doc.text('mala. Sempre portar documento de identificação e', 60, yPos);
      yPos += 15;
      doc.text('Identidade (RG).', 60, yPos);
      
      // Location
      yPos += 30;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('white')
         .rect(40, yPos, pageWidth - 80, 25)
         .fillAndStroke('#0066CC', '#0066CC')
         .text('LOCAL DA PARTIDA', 0, yPos + 6, { align: 'center' });
      
      yPos += 35;
      doc.fillColor('black')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(location, 60, yPos, { align: 'left' });
      
      // Warning message
      yPos += 40;
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#CC0000')
         .text('ATENÇÃO!!! APRESENTAÇÃO ÀS 07:00 HORAS', 60, yPos);
      yPos += 15;
      doc.text('NA ARENA INCONFIDÊNCIA, SEGUINDO TODOS', 60, yPos);
      yPos += 15;
      doc.text('OS PROTOCOLOS DAS APRENTAÇÕES', 60, yPos);
      yPos += 15;
      doc.text('ANTERIORES.', 60, yPos);
      
      // Finalize PDF
      doc.end();
      
    } catch (error) {
      console.error("Error generating call-up PDF:", error);
      res.status(500).json({ message: "Failed to generate call-up PDF" });
    }
  });

  // Tournament routes
  app.get('/api/tournaments', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      const user = userId ? await storage.getUser(userId) : null;
      
      let tournaments = await storage.getTournaments();
      
      // Filter tournaments by category if user is an athlete
      if (user?.athleteId) {
        const athlete = await storage.getAthlete(user.athleteId);
        if (athlete && athlete.category && Array.isArray(athlete.category)) {
          tournaments = tournaments.filter(tournament => {
            // Tournament can have category like "Sub-15", "Sub-17" or "Sub-15/17"
            // Check if the tournament category matches any of the athlete's categories
            if (!tournament.category) return true; // Show tournaments without category
            
            // Split tournament category by "/" to handle composite categories (e.g., "Sub-15/17")
            const tournamentCategories = tournament.category.split('/').map(c => c.trim());
            
            // Check if any of the athlete's categories matches any of the tournament's categories (case-insensitive)
            return athlete.category.some(athleteCategory => 
              tournamentCategories.some(tournamentCat => 
                tournamentCat.toLowerCase().includes(athleteCategory.toLowerCase()) || 
                athleteCategory.toLowerCase().includes(tournamentCat.toLowerCase())
              )
            );
          });
        }
      }
      
      res.json(tournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      res.status(500).json({ message: "Failed to fetch tournaments" });
    }
  });

  app.post('/api/tournaments', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req: any, res) => {
    try {
      // Get user's club and season from session
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.clubId || !user?.seasonId) {
        return res.status(400).json({ message: "User must have club and season selected" });
      }
      
      // Extract participating teams and tournament data
      const { participatingTeams, ...tournamentData } = req.body;
      
      // Add clubId and seasonId to the tournament data
      const finalTournamentData = {
        ...tournamentData,
        clubId: user.clubId,
        seasonId: user.seasonId
      };
      
      const validatedData = insertTournamentSchema.parse(finalTournamentData);
      const tournament = await storage.createTournament(validatedData);
      
      // Automatically add club's own team matching the tournament category
      if (tournament.category) {
        const clubTeams = await storage.getTeamsByClubAndSeason(user.clubId, user.seasonId);
        const tournamentCategory = tournament.category.toLowerCase();
        
        // Find the club team that matches the tournament category
        const matchingTeam = clubTeams.find(team => 
          team.category?.toLowerCase() === tournamentCategory
        );
        
        if (matchingTeam) {
          // Get club badge/logo for the team
          const club = await storage.getClub(user.clubId);
          const badgeUrl = club?.logo || club?.badge || null;
          
          await storage.addTournamentTeam({
            tournamentId: tournament.id,
            teamName: matchingTeam.name,
            category: tournamentCategory,
            badgeUrl,
            clubId: user.clubId,
            seasonId: user.seasonId
          });
        }
      }
      
      // Create tournament teams if provided
      if (participatingTeams && Array.isArray(participatingTeams)) {
        for (const team of participatingTeams) {
          let badgeUrl = team.badgeUrl || null;
          
          // If this is a club team, fetch its actual photo from the database
          if (team.isClubTeam) {
            const clubTeam = await storage.getTeamByName(team.name, user.clubId);
            if (clubTeam && clubTeam.teamPhoto) {
              badgeUrl = clubTeam.teamPhoto;
            }
          }
          
          await storage.createTournamentTeam({
            tournamentId: tournament.id,
            teamName: team.name,
            badgeUrl,
            status: "registered",
            category: team.category || null
          });
        }
      }
      
      res.status(201).json(tournament);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Tournament validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating tournament:", error);
      res.status(500).json({ message: "Failed to create tournament" });
    }
  });

  app.get('/api/tournaments/:id', isAuthenticated, async (req, res) => {
    try {
      const tournament = await storage.getTournament(parseInt(req.params.id));
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error) {
      console.error("Error fetching tournament:", error);
      res.status(500).json({ message: "Failed to fetch tournament" });
    }
  });

  app.put('/api/tournaments/:id', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const validatedData = insertTournamentSchema.partial().parse(req.body);
      const tournament = await storage.updateTournament(parseInt(req.params.id), validatedData);
      res.json(tournament);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating tournament:", error);
      res.status(500).json({ message: "Failed to update tournament" });
    }
  });

  app.patch('/api/tournaments/:id', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const validatedData = insertTournamentSchema.partial().parse(req.body);
      const tournament = await storage.updateTournament(parseInt(req.params.id), validatedData);
      res.json(tournament);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating tournament:", error);
      res.status(500).json({ message: "Failed to update tournament" });
    }
  });

  app.patch('/api/tournaments/:id/status', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !['planned', 'ongoing', 'finished'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'planned', 'ongoing', or 'finished'" });
      }
      
      const tournament = await storage.updateTournament(parseInt(req.params.id), { status });
      res.json(tournament);
    } catch (error) {
      console.error("Error updating tournament status:", error);
      res.status(500).json({ message: "Failed to update tournament status" });
    }
  });

  app.delete('/api/tournaments/:id', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.DELETE), async (req, res) => {
    try {
      await storage.deleteTournament(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tournament:", error);
      res.status(500).json({ message: "Failed to delete tournament" });
    }
  });

  // Mineiro Sub 15/17 specific routes
  app.post('/api/tournaments/:id/mineiro-groups', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { numberOfGroups = 4 } = req.body;
      const groups = await storage.generateMineiroGroups(tournamentId, numberOfGroups);
      res.json(groups);
    } catch (error) {
      console.error("Error generating Mineiro groups:", error);
      res.status(500).json({ message: "Failed to generate Mineiro groups" });
    }
  });

  app.delete('/api/tournaments/:id/groups/clear', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.DELETE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      await storage.clearTournamentGroups(tournamentId);
      res.json({ message: "Tournament groups cleared successfully" });
    } catch (error) {
      console.error("Error clearing tournament groups:", error);
      res.status(500).json({ message: "Failed to clear tournament groups" });
    }
  });

  app.post('/api/tournaments/:id/mineiro-second-phase', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { groupName } = req.body;
      const group = await storage.createMineiroSecondPhaseGroup(tournamentId, groupName);
      res.json(group);
    } catch (error) {
      console.error("Error creating Mineiro second phase group:", error);
      res.status(500).json({ message: "Failed to create second phase group" });
    }
  });

  app.get('/api/tournaments/:id/mineiro-ranking', isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const ranking = await storage.getMineiroRanking(tournamentId);
      res.json(ranking);
    } catch (error) {
      console.error("Error fetching Mineiro ranking:", error);
      res.status(500).json({ message: "Failed to fetch ranking" });
    }
  });

  app.post('/api/tournaments/:id/advance-to-final', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const result = await storage.advanceTeamsToFinalPhase(tournamentId);
      res.json(result);
    } catch (error) {
      console.error("Error advancing teams to final phase:", error);
      res.status(500).json({ message: "Failed to advance teams to final phase" });
    }
  });

  app.get('/api/tournaments/:id/final-phase-teams', async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const teams = await storage.getFinalPhaseTeams(tournamentId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching final phase teams:", error);
      res.status(500).json({ message: "Failed to fetch final phase teams" });
    }
  });

  app.delete('/api/tournaments/:id/reset-final-phase', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.DELETE), async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      await storage.resetFinalPhase(tournamentId);
      res.json({ message: "Final phase reset successfully" });
    } catch (error) {
      console.error("Error resetting final phase:", error);
      res.status(500).json({ message: "Failed to reset final phase" });
    }
  });

  app.get('/api/tournaments/:id/groups/category/:category', isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const category = req.params.category;
      const groups = await storage.getMineiroGroupsByCategory(tournamentId, category);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups by category:", error);
      res.status(500).json({ message: "Failed to fetch groups by category" });
    }
  });

  // Update tournament team
  app.put('/api/tournament-teams/:id', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const updateData = req.body;
      const updatedTeam = await storage.updateTournamentTeam(teamId, updateData);
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating tournament team:", error);
      res.status(500).json({ message: "Failed to update tournament team" });
    }
  });

  // Tournament Matches routes
  app.post('/api/tournament-matches', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.CREATE), async (req, res) => {
    try {
      const validatedData = insertTournamentMatchSchema.parse(req.body);
      const match = await storage.createTournamentMatch(validatedData);
      res.status(201).json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Tournament match validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating tournament match:", error);
      res.status(500).json({ message: "Failed to create tournament match" });
    }
  });

  // Update tournament match
  app.put('/api/tournament-matches/:id', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.EDIT), async (req, res) => {
    try {
      const validatedData = insertTournamentMatchSchema.partial().parse(req.body);
      const match = await storage.updateTournamentMatch(parseInt(req.params.id), validatedData);
      res.json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Tournament match update validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating tournament match:", error);
      res.status(500).json({ message: "Failed to update tournament match" });
    }
  });

  // Delete tournament match
  app.delete('/api/tournament-matches/:id', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.DELETE), async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      await storage.deleteTournamentMatch(matchId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tournament match:", error);
      res.status(500).json({ message: "Failed to delete tournament match" });
    }
  });

  // Delete tournament team
  app.delete('/api/tournament-teams/:id', isAuthenticated, requirePermission(MODULES.GAMES, ACTIONS.DELETE), async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      await storage.deleteTournamentTeam(teamId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tournament team:", error);
      res.status(500).json({ message: "Failed to delete tournament team" });
    }
  });

  // Sync club badge to ESSUBE teams
  app.post('/api/sync-club-badge', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.clubId) {
        return res.status(400).json({ message: "User not associated with a club" });
      }

      // Get club data
      const club = await storage.getClub(user.clubId);
      if (!club?.badge) {
        return res.status(400).json({ message: "Club does not have a badge set" });
      }

      if (!user?.seasonId) {
        return res.status(400).json({ message: "User not associated with a season" });
      }

      // Update all tournament teams (internal teams get club badge, adversaries get their registered badges)
      await storage.updateEssubeTeamBadges(user.clubId, user.seasonId, club.badge);
      
      res.json({ message: "Emblemas sincronizados: times internos com escudo do clube, adversários com emblemas cadastrados" });
    } catch (error) {
      console.error("Error syncing club badge:", error);
      res.status(500).json({ message: "Failed to sync club badge" });
    }
  });

  // Game evaluation routes
  app.get('/api/game-evaluations', isAuthenticated, async (req, res) => {
    try {
      const gameId = req.query.gameId ? parseInt(req.query.gameId as string) : undefined;
      const athleteId = req.query.athleteId ? parseInt(req.query.athleteId as string) : undefined;
      const evaluatedBy = req.query.evaluatedBy as string | undefined;
      const evaluations = await storage.getGameEvaluations(gameId, athleteId, evaluatedBy);
      res.json(evaluations);
    } catch (error) {
      console.error("Error fetching game evaluations:", error);
      res.status(500).json({ message: "Failed to fetch game evaluations" });
    }
  });

  app.get('/api/game-evaluations/:gameId/by-evaluator', isAuthenticated, async (req, res) => {
    try {
      const { gameId } = req.params;
      const grouped = await storage.getGameEvaluationsByEvaluator(Number(gameId));
      res.json(grouped);
    } catch (error) {
      console.error("Error fetching evaluations by evaluator:", error);
      res.status(500).json({ message: "Failed to fetch evaluations by evaluator" });
    }
  });

  app.get('/api/game-evaluations/:gameId/average', isAuthenticated, async (req, res) => {
    try {
      const { gameId } = req.params;
      const averages = await storage.getGameEvaluationsAverage(Number(gameId));
      res.json(averages);
    } catch (error) {
      console.error("Error calculating evaluation averages:", error);
      res.status(500).json({ message: "Failed to calculate evaluation averages" });
    }
  });

  app.post('/api/game-evaluations', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertGameEvaluationSchema.parse({
        ...req.body,
        evaluatedBy: req.user.claims.sub,
      });
      const evaluation = await storage.createGameEvaluation(validatedData);
      res.status(201).json(evaluation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating game evaluation:", error);
      res.status(500).json({ message: "Failed to create game evaluation" });
    }
  });

  app.put('/api/game-evaluations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = insertGameEvaluationSchema.partial().parse(req.body);
      const evaluation = await storage.updateGameEvaluation(Number(id), updateData);
      res.json(evaluation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating game evaluation:", error);
      res.status(500).json({ message: "Failed to update game evaluation" });
    }
  });

  // Wellness routes
  app.get('/api/wellness-entries', isAuthenticated, async (req, res) => {
    try {
      const athleteId = req.query.athleteId ? parseInt(req.query.athleteId as string) : undefined;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const entries = await storage.getWellnessEntries(athleteId, startDate, endDate);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching wellness entries:", error);
      res.status(500).json({ message: "Failed to fetch wellness entries" });
    }
  });

  app.post('/api/wellness-entries', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertWellnessEntrySchema.parse(req.body);
      
      // Check for duplicate entry (same athlete, same day)
      const existingEntries = await storage.getWellnessEntries(
        validatedData.athleteId, 
        validatedData.date, 
        validatedData.date
      );
      
      if (existingEntries.length > 0) {
        return res.status(400).json({ 
          message: "Já existe um registro de wellness para este atleta nesta data"
        });
      }
      
      const entry = await storage.createWellnessEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Wellness validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating wellness entry:", error);
      res.status(500).json({ message: "Failed to create wellness entry" });
    }
  });

  app.patch('/api/wellness-entries/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertWellnessEntrySchema.partial().parse(req.body);
      const entry = await storage.updateWellnessEntry(id, validatedData);
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating wellness entry:", error);
      res.status(500).json({ message: "Failed to update wellness entry" });
    }
  });

  app.delete('/api/wellness-entries/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWellnessEntry(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting wellness entry:", error);
      res.status(500).json({ message: "Failed to delete wellness entry" });
    }
  });

  // RPE routes
  app.get('/api/rpe-entries', isAuthenticated, async (req, res) => {
    try {
      const athleteId = req.query.athleteId ? parseInt(req.query.athleteId as string) : undefined;
      const trainingSessionId = req.query.trainingSessionId ? parseInt(req.query.trainingSessionId as string) : undefined;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const entries = await storage.getRpeEntries(athleteId, trainingSessionId, startDate, endDate);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching RPE entries:", error);
      res.status(500).json({ message: "Failed to fetch RPE entries" });
    }
  });

  app.post('/api/rpe-entries', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRpeEntrySchema.parse(req.body);
      
      // Get the training session to extract the date
      const trainingSession = await storage.getTrainingSession(validatedData.trainingSessionId);
      if (!trainingSession) {
        return res.status(400).json({ message: "Sessão de treino não encontrada" });
      }
      
      // Extract just the date part (YYYY-MM-DD) in local timezone (São Paulo)
      // trainingSession.date already stores YYYY-MM-DD format
      const sessionDateStr = trainingSession.date;
      
      // Check for duplicate RPE entry (same athlete, same day)
      const existingEntries = await storage.getRpeEntries(
        validatedData.athleteId, 
        undefined, 
        sessionDateStr, 
        sessionDateStr
      );
      
      if (existingEntries.length > 0) {
        return res.status(400).json({ 
          message: "Já existe um registro de RPE para este atleta nesta data"
        });
      }
      
      const entry = await storage.createRpeEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("RPE validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating RPE entry:", error);
      res.status(500).json({ message: "Failed to create RPE entry" });
    }
  });

  app.patch('/api/rpe-entries/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertRpeEntrySchema.partial().parse(req.body);
      const entry = await storage.updateRpeEntry(id, validatedData);
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating RPE entry:", error);
      res.status(500).json({ message: "Failed to update RPE entry" });
    }
  });

  app.delete('/api/rpe-entries/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRpeEntry(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting RPE entry:", error);
      res.status(500).json({ message: "Failed to delete RPE entry" });
    }
  });

  // RPE Response Statistics - Separated by day
  app.get('/api/rpe-entries/response-stats', isAuthenticated, async (req, res) => {
    try {
      const clubId = (req.user as any)?.clubId;
      const seasonId = (req.user as any)?.seasonId;
      
      if (!clubId || !seasonId) {
        return res.status(400).json({ message: "Club e season são obrigatórios" });
      }

      // Get all active athletes for this club/season
      const allAthletes = await storage.getAthletes({ clubId, seasonId });
      
      // Get dates for today, yesterday, and day before yesterday using São Paulo timezone
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBeforeYesterday = new Date();
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
      
      const todayStr = formatLocalDate(today);
      const yesterdayStr = formatLocalDate(yesterday);
      const dayBeforeYesterdayStr = formatLocalDate(dayBeforeYesterday);
      
      // Get all RPE entries from the last 3 days
      const startDate = dayBeforeYesterdayStr;
      const endDate = todayStr;
      const allRpeEntries = await storage.getRpeEntries(undefined, undefined, startDate, endDate);
      
      // Get all training sessions to map RPE entries to dates
      const trainingSessions = await storage.getTrainingSessions(clubId, seasonId);
      
      // Helper function to get stats for a specific day
      const getStatsForDay = (dateStr: string) => {
        const responded: any[] = [];
        const notResponded: any[] = [];
        
        // Filter RPE entries for this specific day
        const dayRpeEntries = allRpeEntries.filter((entry: any) => {
          const session = trainingSessions.find((s: any) => s.id === entry.trainingSessionId);
          if (!session) return false;
          // session.date is already in YYYY-MM-DD format, compare directly
          return session.date === dateStr;
        });
        
        for (const athlete of allAthletes) {
          const hasResponded = dayRpeEntries.some((entry: any) => entry.athleteId === athlete.id);
          
          if (hasResponded) {
            const athleteRpes = dayRpeEntries.filter((entry: any) => entry.athleteId === athlete.id);
            responded.push({
              ...athlete,
              responseCount: athleteRpes.length,
              lastResponse: athleteRpes.sort((a: any, b: any) => 
                new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime()
              )[0].submittedAt || athleteRpes[0].createdAt
            });
          } else {
            notResponded.push(athlete);
          }
        }
        
        return {
          responded,
          notResponded,
          respondedCount: responded.length,
          notRespondedCount: notResponded.length
        };
      };
      
      const todayStats = getStatsForDay(todayStr);
      const yesterdayStats = getStatsForDay(yesterdayStr);
      const dayBeforeYesterdayStats = getStatsForDay(dayBeforeYesterdayStr);
      
      res.json({
        today: {
          date: todayStr,
          label: "Hoje",
          ...todayStats
        },
        yesterday: {
          date: yesterdayStr,
          label: "Ontem",
          ...yesterdayStats
        },
        dayBeforeYesterday: {
          date: dayBeforeYesterdayStr,
          label: "Anteontem",
          ...dayBeforeYesterdayStats
        },
        totalAthletes: allAthletes.length
      });
    } catch (error) {
      console.error("Error fetching RPE response stats:", error);
      res.status(500).json({ message: "Failed to fetch RPE response statistics" });
    }
  });

  // Wellness Response Statistics - Separated by day
  app.get('/api/wellness-entries/response-stats', isAuthenticated, async (req, res) => {
    try {
      const clubId = (req.user as any)?.clubId;
      const seasonId = (req.user as any)?.seasonId;
      
      if (!clubId || !seasonId) {
        return res.status(400).json({ message: "Club e season são obrigatórios" });
      }

      // Get all active athletes for this club/season
      const allAthletes = await storage.getAthletes({ clubId, seasonId });
      
      // Get dates for today, yesterday, and day before yesterday using São Paulo timezone
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBeforeYesterday = new Date();
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
      
      const todayStr = formatLocalDate(today);
      const yesterdayStr = formatLocalDate(yesterday);
      const dayBeforeYesterdayStr = formatLocalDate(dayBeforeYesterday);
      
      // Get all wellness entries from the last 3 days
      const startDate = dayBeforeYesterdayStr;
      const endDate = todayStr;
      const allWellnessEntries = await storage.getWellnessEntries(undefined, startDate, endDate);
      
      // Helper function to get stats for a specific day
      const getStatsForDay = (dateStr: string) => {
        const responded: any[] = [];
        const notResponded: any[] = [];
        
        // Filter wellness entries for this specific day
        const dayWellnessEntries = allWellnessEntries.filter((entry: any) => {
          if (!entry.date) return false;
          // entry.date is already in YYYY-MM-DD format, compare directly
          return entry.date === dateStr;
        });
        
        for (const athlete of allAthletes) {
          const hasResponded = dayWellnessEntries.some((entry: any) => entry.athleteId === athlete.id);
          
          if (hasResponded) {
            const athleteEntries = dayWellnessEntries.filter((entry: any) => entry.athleteId === athlete.id);
            responded.push({
              ...athlete,
              responseCount: athleteEntries.length,
              lastResponse: athleteEntries.sort((a: any, b: any) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0].createdAt
            });
          } else {
            notResponded.push(athlete);
          }
        }
        
        return {
          responded,
          notResponded,
          respondedCount: responded.length,
          notRespondedCount: notResponded.length
        };
      };
      
      const todayStats = getStatsForDay(todayStr);
      const yesterdayStats = getStatsForDay(yesterdayStr);
      const dayBeforeYesterdayStats = getStatsForDay(dayBeforeYesterdayStr);
      
      res.json({
        today: {
          date: todayStr,
          label: "Hoje",
          ...todayStats
        },
        yesterday: {
          date: yesterdayStr,
          label: "Ontem",
          ...yesterdayStats
        },
        dayBeforeYesterday: {
          date: dayBeforeYesterdayStr,
          label: "Anteontem",
          ...dayBeforeYesterdayStats
        },
        totalAthletes: allAthletes.length
      });
    } catch (error) {
      console.error("Error fetching wellness response stats:", error);
      res.status(500).json({ message: "Failed to fetch wellness response statistics" });
    }
  });

  // Medical routes
  app.get('/api/medical-records', isAuthenticated, async (req, res) => {
    try {
      const athleteId = req.query.athleteId ? parseInt(req.query.athleteId as string) : undefined;
      const records = await storage.getMedicalRecords(athleteId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching medical records:", error);
      res.status(500).json({ message: "Failed to fetch medical records" });
    }
  });

  // Upload de arquivos médicos
  app.post('/api/medical-records/upload', isAuthenticated, upload.array('attachments', 5), async (req: any, res) => {
    try {
      const filePaths = req.files?.map((file: any) => `/uploads/medical/${file.filename}`) || [];
      res.json({ filePaths });
    } catch (error) {
      console.error("Error uploading medical files:", error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  app.post('/api/medical-records', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        console.error("No user claims found in request");
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const validatedData = insertMedicalRecordSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
        attachments: req.body.attachments || [],
      });
      const record = await storage.createMedicalRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Medical validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating medical record:", error);
      res.status(500).json({ message: "Failed to create medical record" });
    }
  });

  app.patch('/api/medical-records/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMedicalRecordSchema.partial().parse(req.body);
      const record = await storage.updateMedicalRecord(id, validatedData);
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating medical record:", error);
      res.status(500).json({ message: "Failed to update medical record" });
    }
  });

  app.delete('/api/medical-records/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMedicalRecord(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting medical record:", error);
      res.status(500).json({ message: "Failed to delete medical record" });
    }
  });

  // Financial routes
  app.get('/api/financial-transactions', isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const transactions = await storage.getFinancialTransactions(startDate, endDate);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching financial transactions:", error);
      res.status(500).json({ message: "Failed to fetch financial transactions" });
    }
  });

  app.post('/api/financial-transactions', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertFinancialTransactionSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      const transaction = await storage.createFinancialTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating financial transaction:", error);
      res.status(500).json({ message: "Failed to create financial transaction" });
    }
  });

  app.patch('/api/financial-transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertFinancialTransactionSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      const transaction = await storage.updateFinancialTransaction(id, validatedData);
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating financial transaction:", error);
      res.status(500).json({ message: "Failed to update financial transaction" });
    }
  });

  app.delete('/api/financial-transactions/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteFinancialTransaction(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting financial transaction:", error);
      res.status(500).json({ message: "Failed to delete financial transaction" });
    }
  });

  // Store Product routes
  app.get('/api/store-products', isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getStoreProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching store products:", error);
      res.status(500).json({ message: "Failed to fetch store products" });
    }
  });

  app.get('/api/store-products/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getStoreProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching store product:", error);
      res.status(500).json({ message: "Failed to fetch store product" });
    }
  });

  app.post('/api/store-products', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.user.clubId) {
        return res.status(400).json({ message: "User must be associated with a club to create products" });
      }

      const productData = {
        ...req.body,
        clubId: req.user.clubId,
        price: req.body.price,
        stock: parseInt(req.body.stock) || 0,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
      };

      if (req.file) {
        productData.image = `/uploads/products/${req.file.filename}`;
      }

      const validatedData = insertStoreProductSchema.parse(productData);
      const product = await storage.createStoreProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating store product:", error);
      res.status(500).json({ message: "Failed to create store product" });
    }
  });

  app.patch('/api/store-products/:id', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.user.clubId) {
        return res.status(400).json({ message: "User must be associated with a club to update products" });
      }

      const id = parseInt(req.params.id);
      
      // Verify product belongs to user's club
      const existingProduct = await storage.getStoreProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (existingProduct.clubId !== req.user.clubId) {
        return res.status(403).json({ message: "Not authorized to update this product" });
      }

      const productData: any = {
        ...req.body,
      };

      // Force clubId to be from authenticated user (prevent forgery)
      delete productData.clubId;

      if (req.body.price) {
        productData.price = req.body.price;
      }
      if (req.body.stock) {
        productData.stock = parseInt(req.body.stock);
      }
      if (req.body.isActive !== undefined) {
        productData.isActive = req.body.isActive === 'true' || req.body.isActive === true;
      }

      if (req.file) {
        productData.image = `/uploads/products/${req.file.filename}`;
      }

      const product = await storage.updateStoreProduct(id, productData);
      res.json(product);
    } catch (error) {
      console.error("Error updating store product:", error);
      res.status(500).json({ message: "Failed to update store product" });
    }
  });

  app.delete('/api/store-products/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.clubId) {
        return res.status(400).json({ message: "User must be associated with a club to delete products" });
      }

      const id = parseInt(req.params.id);
      
      // Verify product belongs to user's club
      const existingProduct = await storage.getStoreProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (existingProduct.clubId !== req.user.clubId) {
        return res.status(403).json({ message: "Not authorized to delete this product" });
      }

      await storage.deleteStoreProduct(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting store product:", error);
      res.status(500).json({ message: "Failed to delete store product" });
    }
  });

  // Public endpoint for club data (no auth required)
  app.get('/api/public/club', async (req, res) => {
    try {
      const clubs = await storage.getClubs();
      if (clubs && clubs.length > 0) {
        // Return the first club (most recently created)
        const club = clubs[0];
        res.json({
          name: club.name,
          shortName: club.shortName,
          description: club.description,
          foundedYear: club.foundedYear,
          logo: club.logo,
          badge: club.badge,
          colors: club.colors,
          city: club.city,
          state: club.state,
          country: club.country,
          phone: club.phone,
          email: club.email,
          website: club.website,
        });
      } else {
        res.json(null); // No club exists
      }
    } catch (error) {
      console.error("Error fetching club data:", error);
      res.status(500).json({ message: "Failed to fetch club data" });
    }
  });

  // Public endpoint for homepage content (no auth required)
  app.get('/api/public/homepage-content', async (req, res) => {
    try {
      const configs = await storage.getSystemConfig('homepage_content');
      if (configs && configs.length > 0) {
        res.json(configs[0].value);
      } else {
        res.json(null); // Return null if no custom content is configured
      }
    } catch (error) {
      console.error("Error fetching homepage content:", error);
      res.status(500).json({ message: "Failed to fetch homepage content" });
    }
  });

  // Public endpoint for active store products (no auth required)
  app.get('/api/public/store-products', async (req, res) => {
    try {
      const allProducts = await storage.getStoreProducts();
      const activeProducts = allProducts.filter(p => p.isActive);
      res.json(activeProducts);
    } catch (error) {
      console.error("Error fetching store products:", error);
      res.status(500).json({ message: "Failed to fetch store products" });
    }
  });

  // Public endpoint for games highlights (2 last + 1 next) - no auth required
  app.get('/api/public/games-highlights', async (req, res) => {
    try {
      // Buscar jogos regulares
      const regularGames = await storage.getGames();
      
      // Buscar o clube público para identificar corretamente os jogos (mesmo que endpoint /api/public/club)
      const clubs = await storage.getClubs();
      const publicClubId = clubs && clubs.length > 0 ? clubs[0].id : null;
      
      if (!publicClubId) {
        // Se não houver clube, retornar apenas jogos regulares
        const now = new Date();
        const today = formatLocalDate(now);
        
        const pastGames = regularGames
          .filter(game => game.date < today || (game.date === today && game.status === 'completed'))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 2);
        
        const futureGames = regularGames
          .filter(game => game.date > today || (game.date === today && game.status !== 'completed'))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 1);
        
        const formatGame = (game: any) => {
          const gameDate = new Date(game.date);
          const formattedDate = gameDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          
          return {
            id: game.id,
            date: formattedDate,
            fullDate: game.date,
            time: game.time,
            opponent: game.opponent,
            location: game.location,
            isHome: game.isHome,
            ourScore: game.ourScore,
            opponentScore: game.opponentScore,
            status: game.status,
            category: game.category,
          };
        };
        
        return res.json({
          past: pastGames.map(formatGame),
          next: futureGames.map(formatGame)
        });
      }
      
      // Buscar todos os torneios
      const allTournaments = await storage.getTournaments();
      
      // Buscar todos os times de todos os torneios de uma vez (evitar N+1)
      const allTeamIds = new Set<number>();
      const allMatches: any[] = [];
      
      for (const tournament of allTournaments) {
        const matches = await storage.getTournamentMatches(tournament.id);
        matches.forEach(match => {
          // Adicionar apenas IDs válidos (não null/undefined)
          if (match.team1Id) allTeamIds.add(match.team1Id);
          if (match.team2Id) allTeamIds.add(match.team2Id);
          allMatches.push({ ...match, tournamentName: tournament.name });
        });
      }
      
      // Buscar todos os times de uma vez (apenas se houver IDs)
      let allTeams: any[] = [];
      if (allTeamIds.size > 0) {
        allTeams = await db.select()
          .from(tournamentTeams)
          .where(inArray(tournamentTeams.id, Array.from(allTeamIds)));
      }
      
      // Criar mapa de times para acesso rápido
      const teamsMap = new Map(allTeams.map(team => [team.id, team]));
      
      // Buscar o nome do clube para identificação
      const clubData = clubs && clubs.length > 0 ? clubs[0] : null;
      
      // Filtrar jogos do clube
      const tournamentGames: any[] = [];
      
      for (const match of allMatches) {
        const team1 = teamsMap.get(match.team1Id);
        const team2 = teamsMap.get(match.team2Id);
        
        if (!team1 || !team2) continue;
        
        // Verificar se algum dos times representa o clube (por nome do time)
        // Um time do clube tem o mesmo nome ou shortName do clube
        const isTeam1OurTeam = clubData && (
          team1.teamName === clubData.name || 
          team1.teamName === clubData.shortName
        );
        const isTeam2OurTeam = clubData && (
          team2.teamName === clubData.name || 
          team2.teamName === clubData.shortName
        );
        
        if (isTeam1OurTeam || isTeam2OurTeam) {
          const isHome = isTeam1OurTeam;
          const ourTeam = isHome ? team1 : team2;
          const opponent = isHome ? team2.teamName : team1.teamName;
          const ourScore = isHome ? match.team1Score : match.team2Score;
          const opponentScore = isHome ? match.team2Score : match.team1Score;
          
          tournamentGames.push({
            id: `tournament_${match.id}`,
            date: match.scheduledDate ? formatLocalDate(new Date(match.scheduledDate)) : formatLocalDate(new Date()),
            time: match.scheduledDate ? new Date(match.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '00:00',
            opponent: opponent,
            location: match.venue || 'Local não definido',
            isHome: isHome,
            ourScore: ourScore,
            opponentScore: opponentScore,
            status: match.status,
            category: ourTeam.category, // Categoria correta do nosso time
            tournamentName: match.tournamentName,
          });
        }
      }
      
      // Combinar jogos regulares e de torneio
      const allGames = [...regularGames, ...tournamentGames];
      const now = new Date();
      const today = formatLocalDate(now);
      
      // Format games for public display
      const formatGame = (game: any) => {
        const gameDate = new Date(game.date);
        const formattedDate = gameDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        
        return {
          id: game.id,
          date: formattedDate,
          fullDate: game.date,
          time: game.time,
          opponent: game.opponent,
          location: game.location,
          isHome: game.isHome,
          ourScore: game.ourScore,
          opponentScore: game.opponentScore,
          status: game.status,
          category: game.category,
          tournamentName: game.tournamentName,
        };
      };
      
      // Agrupar jogos por categoria
      const gamesByCategory: Record<string, { past: any[], next: any[] }> = {};
      
      for (const game of allGames) {
        const category = game.category || 'Sem Categoria';
        
        if (!gamesByCategory[category]) {
          gamesByCategory[category] = { past: [], next: [] };
        }
        
        const isPast = game.date < today || (game.date === today && game.status === 'completed');
        
        if (isPast) {
          gamesByCategory[category].past.push(game);
        } else {
          gamesByCategory[category].next.push(game);
        }
      }
      
      // Ordenar e limitar jogos de cada categoria
      const highlights: Record<string, { past: any[], next: any[] }> = {};
      
      for (const [category, games] of Object.entries(gamesByCategory)) {
        highlights[category] = {
          past: games.past
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 2)
            .map(formatGame),
          next: games.next
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 1)
            .map(formatGame)
        };
      }
      
      res.json(highlights);
    } catch (error) {
      console.error("Error fetching games highlights:", error);
      res.status(500).json({ message: "Failed to fetch games highlights" });
    }
  });

  // System configuration routes (Admin only)
  app.get('/api/config', isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const key = req.query.key as string;
      const configs = await storage.getSystemConfig(key);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching system config:", error);
      res.status(500).json({ message: "Failed to fetch system config" });
    }
  });

  app.get('/api/config/:key', isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const { key } = req.params;
      const value = await storage.getConfigValue(key);
      res.json({ key, value });
    } catch (error) {
      console.error("Error fetching config value:", error);
      res.status(500).json({ message: "Failed to fetch config value" });
    }
  });

  app.post('/api/config', isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const validatedData = insertSystemConfigSchema.parse(req.body);
      const config = await storage.setConfigValue(
        validatedData.key,
        validatedData.value,
        validatedData.description || undefined
      );
      res.status(201).json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error setting config value:", error);
      res.status(500).json({ message: "Failed to set config value" });
    }
  });

  app.put('/api/config/:key', isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;
      const config = await storage.setConfigValue(key, value, description);
      res.json(config);
    } catch (error) {
      console.error("Error updating config value:", error);
      res.status(500).json({ message: "Failed to update config value" });
    }
  });

  app.delete('/api/config/:key', isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const { key } = req.params;
      await storage.deleteConfigValue(key);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting config value:", error);
      res.status(500).json({ message: "Failed to delete config value" });
    }
  });

  // Homepage visual configuration routes
  app.get('/api/config/homepage-visual', async (req, res) => {
    try {
      const value = await storage.getConfigValue('homepage_visual_config');
      res.json(value || {
        colors: {
          heroGradientStart: "#0ea5e9",
          heroGradientEnd: "#1d4ed8",
          sectionBackground: "#ffffff",
          formBackground: "#f9fafb",
          textPrimary: "#111827",
          textSecondary: "#6b7280",
          buttonPrimary: "#0ea5e9",
          buttonSecondary: "#6b7280",
          buttonText: "#ffffff"
        },
        typography: {
          h1Size: 48,
          h2Size: 32,
          bodySize: 16,
          fontFamily: "Segoe UI"
        },
        background: {
          heroImageUrl: "",
          heroImageOpacity: 100
        }
      });
    } catch (error) {
      console.error("Error fetching homepage visual config:", error);
      res.status(500).json({ message: "Failed to fetch homepage visual config" });
    }
  });

  app.post('/api/config/homepage-visual', isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const config = await storage.setConfigValue(
        'homepage_visual_config',
        req.body,
        'Configurações visuais da homepage'
      );
      res.status(201).json(config);
    } catch (error) {
      console.error("Error saving homepage visual config:", error);
      res.status(500).json({ message: "Failed to save homepage visual config" });
    }
  });

  // Pending registrations routes
  app.get('/api/pending-registrations', isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const registrations = await storage.getPendingRegistrations();
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching pending registrations:", error);
      res.status(500).json({ message: "Failed to fetch pending registrations" });
    }
  });

  // Public registration route (no authentication required)
  app.post('/api/register', async (req, res) => {
    try {
      const registrationData = insertPendingRegistrationSchema.parse(req.body);
      
      // Check if email already exists in users table
      const existingUser = await storage.getUserByEmail(registrationData.email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Já existe um cadastro com este email. Por favor, use outro email ou entre em contato com o administrador." 
        });
      }
      
      // Check if email already has a pending registration
      const existingPendingRegistration = await storage.getPendingRegistrationByEmail(registrationData.email);
      if (existingPendingRegistration) {
        return res.status(400).json({ 
          message: "Já existe uma solicitação de cadastro pendente com este email. Aguarde a aprovação do administrador." 
        });
      }
      
      const registration = await storage.createPendingRegistration(registrationData);
      res.status(201).json({ 
        message: "Solicitação de cadastro enviada com sucesso! Aguarde aprovação do administrador.",
        registration 
      });
    } catch (error) {
      console.error("Error creating registration:", error);
      res.status(400).json({ message: "Failed to create registration" });
    }
  });

  app.post('/api/pending-registrations/:id/approve', isAuthenticated, requireRole(['administrador']), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { notes, teamId } = req.body;
      const reviewedBy = req.user.claims.sub;
      
      const user = await storage.approvePendingRegistration(id, reviewedBy, notes, teamId ? parseInt(teamId) : undefined);
      res.json({ message: "Cadastro aprovado com sucesso!", user });
    } catch (error) {
      console.error("Error approving registration:", error);
      res.status(400).json({ message: "Failed to approve registration" });
    }
  });

  app.post('/api/pending-registrations/:id/reject', isAuthenticated, requireRole(['administrador']), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { notes } = req.body;
      const reviewedBy = req.user.claims.sub;
      
      const registration = await storage.rejectPendingRegistration(id, reviewedBy, notes);
      res.json({ message: "Cadastro rejeitado.", registration });
    } catch (error) {
      console.error("Error rejecting registration:", error);
      res.status(400).json({ message: "Failed to reject registration" });
    }
  });

  app.delete('/api/pending-registrations/:id', isAuthenticated, requireRole(['administrador']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePendingRegistration(id);
      res.json({ message: "Solicitação removida com sucesso!" });
    } catch (error) {
      console.error("Error deleting registration:", error);
      res.status(500).json({ message: "Failed to delete registration" });
    }
  });

  // Download routes
  app.get('/api/download/desktop-windows', async (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'desktop', 'dist', 'natus-vincere-desktop-windows-11.tar.gz');
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Desktop application file not found" });
      }

      const stat = fs.statSync(filePath);
      
      res.set({
        'Content-Type': 'application/gzip',
        'Content-Disposition': 'attachment; filename="natus-vincere-desktop-windows-11.tar.gz"',
        'Content-Length': stat.size.toString()
      });

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    } catch (error) {
      console.error("Error serving desktop download:", error);
      res.status(500).json({ message: "Failed to serve desktop download" });
    }
  });

  // AI Insights routes
  app.get("/api/ai/insights", isAuthenticated, requireStaff, async (req, res) => {
    try {
      // Get cached insights from database or return empty array
      const insights = await storage.getConfigValue("ai_insights") || [];
      res.json(insights);
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      res.status(500).json({ message: "Failed to fetch AI insights" });
    }
  });

  app.post("/api/ai/generate-insights", isAuthenticated, requireStaff, async (req, res) => {
    try {
      const { generatePerformanceInsights } = await import("./ai-insights");
      
      // Gather performance data
      const athletes = await storage.getAthletes();
      const trainingSessions = await storage.getTrainingSessions();
      const games = await storage.getGames();
      const trainingEvaluations = await storage.getTrainingEvaluations();
      const gameEvaluations = await storage.getGameEvaluations();
      
      const performanceData = {
        athletes,
        trainingSessions,
        games,
        trainingEvaluations,
        gameEvaluations
      };

      // Generate AI insights
      const insights = await generatePerformanceInsights(performanceData);
      
      // Cache insights in database
      await storage.setConfigValue("ai_insights", insights, "Generated AI insights for performance analysis");
      
      res.json({ message: "Insights generated successfully", insights });
    } catch (error) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ message: "Failed to generate AI insights" });
    }
  });

  // Module access configuration routes
  app.get('/api/module-access', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const config = await storage.getConfigValue("module_access_config");
      
      // Return default configuration with permission levels if none exists
      const defaultConfig = {
        administrador: Object.values(MODULES).reduce((acc, module) => ({ ...acc, [module]: 'edit' }), {}),
        coordenador: Object.values(MODULES).reduce((acc, module) => ({ 
          ...acc, 
          [module]: module === MODULES.FINANCIAL ? 'none' : 'edit' 
        }), {}),
        comissao: Object.values(MODULES).reduce((acc, module) => ({ 
          ...acc, 
          [module]: [MODULES.DASHBOARD, MODULES.ATHLETES, MODULES.TEAMS, MODULES.TRAINING, MODULES.GAMES, MODULES.ADVERSARIES, MODULES.STADIUMS, MODULES.WELLNESS, MODULES.RPE, MODULES.REPORTS, MODULES.AI_INSIGHTS].includes(module) 
            ? (module === MODULES.ATHLETES ? 'read' : 'edit') 
            : 'none' 
        }), {}),
        medico: Object.values(MODULES).reduce((acc, module) => ({ 
          ...acc, 
          [module]: [MODULES.DASHBOARD, MODULES.ATHLETES, MODULES.WELLNESS, MODULES.RPE, MODULES.MEDICAL, MODULES.REPORTS].includes(module) 
            ? (module === MODULES.MEDICAL ? 'edit' : 'read') 
            : 'none' 
        }), {}),
        atleta: Object.values(MODULES).reduce((acc, module) => ({ 
          ...acc, 
          [module]: [MODULES.DASHBOARD, MODULES.TRAINING, MODULES.GAMES, MODULES.WELLNESS, MODULES.RPE].includes(module) 
            ? (['wellness', 'rpe'].includes(module) ? 'edit' : 'read') 
            : 'none' 
        }), {}),
        familiar: Object.values(MODULES).reduce((acc, module) => ({ 
          ...acc, 
          [module]: [MODULES.DASHBOARD, MODULES.WELLNESS, MODULES.RPE].includes(module) 
            ? (['wellness', 'rpe'].includes(module) ? 'edit' : 'read') 
            : 'none' 
        }), {})
      };

      res.json({ moduleAccessConfig: config || defaultConfig });
    } catch (error) {
      console.error("Error fetching module access configuration:", error);
      res.status(500).json({ message: "Failed to fetch module access configuration" });
    }
  });

  app.post('/api/module-access', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { moduleAccessConfig } = req.body;
      
      if (!moduleAccessConfig || typeof moduleAccessConfig !== 'object') {
        return res.status(400).json({ message: "Invalid module access configuration" });
      }

      // Validate that all required roles are present and have correct permission structure
      const requiredRoles = ['administrador', 'coordenador', 'comissao', 'medico', 'atleta', 'familiar'];
      const validPermissions = ['none', 'read', 'edit'];
      
      for (const role of requiredRoles) {
        if (!moduleAccessConfig[role] || typeof moduleAccessConfig[role] !== 'object') {
          return res.status(400).json({ message: `Invalid configuration for role: ${role}` });
        }
        
        // Validate each module permission
        for (const [module, permission] of Object.entries(moduleAccessConfig[role])) {
          if (!validPermissions.includes(permission as string)) {
            return res.status(400).json({ 
              message: `Invalid permission '${permission}' for module '${module}' in role '${role}'` 
            });
          }
        }
      }

      // Save the configuration
      await storage.setConfigValue(
        "module_access_config", 
        moduleAccessConfig, 
        "Enhanced module access configuration with granular permissions"
      );
      
      res.json({ message: "Module access configuration saved successfully" });
    } catch (error) {
      console.error("Error saving module access configuration:", error);
      res.status(500).json({ message: "Failed to save module access configuration" });
    }
  });

  // Adversary Teams Management Routes
  app.get('/api/adversary-teams', isAuthenticated, requireModuleAccess('teams'), async (req: any, res) => {
    try {
      const { clubId, seasonId } = req.query;
      if (!clubId || !seasonId) {
        return res.status(400).json({ message: "Club ID and Season ID are required" });
      }
      
      // Get both adversary teams and club's own teams for tournament selection
      const [adversaryTeams, clubTeams] = await Promise.all([
        storage.getAdversaryTeams(parseInt(clubId), parseInt(seasonId)),
        storage.getTeamsByClubAndSeason(parseInt(clubId), parseInt(seasonId))
      ]);
      
      // Combine and format teams for consistent structure
      const allTeams = [
        ...adversaryTeams,
        ...clubTeams.map(team => ({
          id: team.id,
          name: team.name,
          badgeUrl: null, // Club teams don't have badges in adversary format
          clubId: team.clubId,
          seasonId: team.seasonId,
          category: team.category,
          isActive: true,
          isOwnClub: true
        }))
      ];
      
      res.json(allTeams);
    } catch (error) {
      console.error("Error fetching adversary teams:", error);
      res.status(500).json({ message: "Failed to fetch adversary teams" });
    }
  });

  app.get('/api/adversary-teams/:id', isAuthenticated, requireModuleAccess('teams'), async (req, res) => {
    try {
      const team = await storage.getAdversaryTeam(parseInt(req.params.id));
      if (!team) {
        return res.status(404).json({ message: "Adversary team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error fetching adversary team:", error);
      res.status(500).json({ message: "Failed to fetch adversary team" });
    }
  });

  app.post('/api/adversary-teams', isAuthenticated, requirePermission(MODULES.ADVERSARIES, ACTIONS.CREATE), uploadBadge.single('badge'), async (req, res) => {
    try {
      const { name, contactName, contactPhone, contactEmail, notes, clubId, seasonId } = req.body;
      
      // Handle file upload
      let badgeUrl = '';
      if (req.file) {
        badgeUrl = `/uploads/badges/${req.file.filename}`;
      }
      
      const teamData = {
        name,
        badgeUrl,
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        notes: notes || null,
        clubId: parseInt(clubId),
        seasonId: parseInt(seasonId),
      };
      
      const validatedData = insertAdversaryTeamSchema.parse(teamData);
      const team = await storage.createAdversaryTeam(validatedData);
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating adversary team:", error);
      res.status(500).json({ message: "Failed to create adversary team" });
    }
  });

  app.put('/api/adversary-teams/:id', isAuthenticated, requirePermission(MODULES.ADVERSARIES, ACTIONS.EDIT), uploadBadge.single('badge'), async (req, res) => {
    try {
      const { name, contactName, contactPhone, contactEmail, notes, clubId, seasonId } = req.body;
      
      // Build update data object
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (contactName !== undefined) updateData.contactName = contactName || null;
      if (contactPhone !== undefined) updateData.contactPhone = contactPhone || null;
      if (contactEmail !== undefined) updateData.contactEmail = contactEmail || null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (clubId !== undefined) updateData.clubId = parseInt(clubId);
      if (seasonId !== undefined) updateData.seasonId = parseInt(seasonId);
      
      // Handle file upload if provided
      if (req.file) {
        updateData.badgeUrl = `/uploads/badges/${req.file.filename}`;
      }
      
      const validatedData = insertAdversaryTeamSchema.partial().parse(updateData);
      const team = await storage.updateAdversaryTeam(parseInt(req.params.id), validatedData);
      res.json(team);
    } catch (error) {
      console.error("Error updating adversary team:", error);
      res.status(500).json({ message: "Failed to update adversary team" });
    }
  });

  app.delete('/api/adversary-teams/:id', isAuthenticated, requirePermission(MODULES.ADVERSARIES, ACTIONS.DELETE), async (req, res) => {
    try {
      await storage.deleteAdversaryTeam(parseInt(req.params.id));
      res.json({ message: "Adversary team deleted successfully" });
    } catch (error) {
      console.error("Error deleting adversary team:", error);
      res.status(500).json({ message: "Failed to delete adversary team" });
    }
  });

  // Stadium Management Routes
  app.get('/api/stadiums', isAuthenticated, requireModuleAccess('teams'), async (req: any, res) => {
    try {
      const { clubId, seasonId } = req.query;
      if (!clubId || !seasonId) {
        return res.status(400).json({ message: "Club ID and Season ID are required" });
      }
      
      const stadiums = await storage.getStadiums(parseInt(clubId), parseInt(seasonId));
      res.json(stadiums);
    } catch (error) {
      console.error("Error fetching stadiums:", error);
      res.status(500).json({ message: "Failed to fetch stadiums" });
    }
  });

  app.get('/api/stadiums/:id', isAuthenticated, requireModuleAccess('teams'), async (req, res) => {
    try {
      const stadium = await storage.getStadium(parseInt(req.params.id));
      if (!stadium) {
        return res.status(404).json({ message: "Stadium not found" });
      }
      res.json(stadium);
    } catch (error) {
      console.error("Error fetching stadium:", error);
      res.status(500).json({ message: "Failed to fetch stadium" });
    }
  });

  app.post('/api/stadiums', isAuthenticated, requirePermission(MODULES.STADIUMS, ACTIONS.CREATE), async (req, res) => {
    try {
      // Direct database insertion bypassing TypeScript issues
      const { name, address, capacity, surface, notes, clubId, seasonId } = req.body;
      
      if (!name || !clubId || !seasonId) {
        return res.status(400).json({ message: "Name, clubId, and seasonId are required" });
      }
      
      const [stadium] = await db
        .insert(stadiums)
        .values({
          name,
          address: address || null,
          capacity: capacity || null,
          surface: surface || null,
          notes: notes || null,
          clubId,
          seasonId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any)
        .returning();
      
      res.status(201).json(stadium);
    } catch (error) {
      console.error("Error creating stadium:", error);
      console.error("Error details:", error.message);
      res.status(500).json({ message: "Failed to create stadium", error: error.message });
    }
  });

  app.put('/api/stadiums/:id', isAuthenticated, requirePermission(MODULES.STADIUMS, ACTIONS.EDIT), async (req, res) => {
    try {
      const validatedData = insertStadiumSchema.partial().parse(req.body);
      const stadium = await storage.updateStadium(parseInt(req.params.id), validatedData);
      res.json(stadium);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Stadium validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating stadium:", error);
      res.status(500).json({ message: "Failed to update stadium" });
    }
  });

  app.delete('/api/stadiums/:id', isAuthenticated, requirePermission(MODULES.STADIUMS, ACTIONS.DELETE), async (req, res) => {
    try {
      await storage.deleteStadium(parseInt(req.params.id));
      res.json({ message: "Stadium deleted successfully" });
    } catch (error) {
      console.error("Error deleting stadium:", error);
      res.status(500).json({ message: "Failed to delete stadium" });
    }
  });

  // Fitness and Injury Risk API endpoints
  
  // Get fitness metrics for a specific athlete
  app.get('/api/fitness/metrics/:athleteId', isAuthenticated, async (req, res) => {
    try {
      const { athleteId } = req.params;
      const { clubId, seasonId } = req.query;
      const targetDate = (req.query.date as string) || formatLocalDate(new Date());
      
      if (!clubId || !seasonId) {
        return res.status(400).json({ message: "Club ID and Season ID are required" });
      }
      
      const metrics = await fitnessEngine.calculateFitnessMetrics(
        parseInt(athleteId), 
        parseInt(clubId as string), 
        parseInt(seasonId as string), 
        targetDate
      );
      
      res.json(metrics);
    } catch (error) {
      console.error("Error calculating fitness metrics:", error);
      res.status(500).json({ message: "Failed to calculate fitness metrics" });
    }
  });
  
  // Get injury risk assessment for a specific athlete
  app.get('/api/fitness/risk/:athleteId', isAuthenticated, async (req, res) => {
    try {
      const { athleteId } = req.params;
      const { clubId, seasonId } = req.query;
      const targetDate = (req.query.date as string) || formatLocalDate(new Date());
      
      if (!clubId || !seasonId) {
        return res.status(400).json({ message: "Club ID and Season ID are required" });
      }
      
      const assessment = await fitnessEngine.calculateInjuryRisk(
        parseInt(athleteId), 
        parseInt(clubId as string), 
        parseInt(seasonId as string), 
        targetDate
      );
      
      res.json(assessment);
    } catch (error) {
      console.error("Error calculating injury risk:", error);
      res.status(500).json({ message: "Failed to calculate injury risk" });
    }
  });
  
  // Update fitness metrics for an athlete
  app.post('/api/fitness/metrics/:athleteId', isAuthenticated, async (req, res) => {
    try {
      const { athleteId } = req.params;
      const { clubId, seasonId } = req.body;
      const targetDate = req.body.date || formatLocalDate(new Date());
      
      if (!clubId || !seasonId) {
        return res.status(400).json({ message: "Club ID and Season ID are required" });
      }
      
      const metrics = await fitnessEngine.updatePlayerFitnessMetrics(
        parseInt(athleteId), 
        clubId, 
        seasonId, 
        targetDate
      );
      
      res.json(metrics);
    } catch (error) {
      console.error("Error updating fitness metrics:", error);
      res.status(500).json({ message: "Failed to update fitness metrics" });
    }
  });
  
  // Update injury risk assessment for an athlete
  app.post('/api/fitness/risk/:athleteId', isAuthenticated, async (req, res) => {
    try {
      const { athleteId } = req.params;
      const { clubId, seasonId } = req.body;
      const targetDate = req.body.date || formatLocalDate(new Date());
      
      if (!clubId || !seasonId) {
        return res.status(400).json({ message: "Club ID and Season ID are required" });
      }
      
      const assessment = await fitnessEngine.updateInjuryRiskAssessment(
        parseInt(athleteId), 
        clubId, 
        seasonId, 
        targetDate
      );
      
      res.json(assessment);
    } catch (error) {
      console.error("Error updating injury risk assessment:", error);
      res.status(500).json({ message: "Failed to update injury risk assessment" });
    }
  });
  
  // Process all athletes for fitness calculations
  app.post('/api/fitness/process-all', isAuthenticated, requireStaff, async (req, res) => {
    try {
      const { clubId, seasonId } = req.body;
      const targetDate = req.body.date || formatLocalDate(new Date());
      
      if (!clubId || !seasonId) {
        return res.status(400).json({ message: "Club ID and Season ID are required" });
      }
      
      const results = await fitnessEngine.processAllAthletes(clubId, seasonId, targetDate);
      
      res.json({
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      });
    } catch (error) {
      console.error("Error processing all athletes:", error);
      res.status(500).json({ message: "Failed to process all athletes" });
    }
  });
  
  // Get fitness alerts for a club
  app.get('/api/fitness/alerts', isAuthenticated, async (req, res) => {
    try {
      const { clubId, seasonId } = req.query;
      
      if (!clubId || !seasonId) {
        return res.status(400).json({ message: "Club ID and Season ID are required" });
      }
      
      const alerts = await storage.getFitnessAlerts(parseInt(clubId as string), parseInt(seasonId as string));
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching fitness alerts:", error);
      res.status(500).json({ message: "Failed to fetch fitness alerts" });
    }
  });
  
  // Acknowledge a fitness alert
  app.patch('/api/fitness/alerts/:alertId/acknowledge', isAuthenticated, async (req, res) => {
    try {
      const { alertId } = req.params;
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const alert = await storage.acknowledgeFitnessAlert(parseInt(alertId), userId);
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging fitness alert:", error);
      res.status(500).json({ message: "Failed to acknowledge fitness alert" });
    }
  });
  
  // Get fitness dashboard data for all athletes
  app.get('/api/fitness/dashboard', isAuthenticated, async (req, res) => {
    try {
      const { clubId, seasonId } = req.query;
      
      if (!clubId || !seasonId) {
        return res.status(400).json({ message: "Club ID and Season ID are required" });
      }
      
      const dashboardData = await storage.getFitnessDashboard(parseInt(clubId as string), parseInt(seasonId as string));
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching fitness dashboard:", error);
      res.status(500).json({ message: "Failed to fetch fitness dashboard" });
    }
  });

  // Public endpoint for registration form submissions (no auth required)
  app.post('/api/public/register', async (req, res) => {
    try {
      const { firstName, lastName, dateOfBirth, email, phone, password, userType, message } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !password || !userType) {
        return res.status(400).json({ message: "Campos obrigatórios faltando" });
      }

      // Validate dateOfBirth is required for atleta
      if (userType === 'atleta' && !dateOfBirth) {
        return res.status(400).json({ message: "Data de nascimento é obrigatória para atletas" });
      }

      // Check if email already exists in users table
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Já existe um cadastro com este email. Por favor, use outro email ou entre em contato com o administrador." 
        });
      }
      
      // Check if email already has a pending registration
      const existingPendingRegistration = await storage.getPendingRegistrationByEmail(email);
      if (existingPendingRegistration) {
        return res.status(400).json({ 
          message: "Já existe uma solicitação de cadastro pendente com este email. Aguarde a aprovação do administrador." 
        });
      }

      // Map userType to match database schema
      // The form uses: atleta, familiar, torcedor, comissao_tecnica, coordenador, medico
      // Database expects: atleta, familiar, torcedor (and other roles)
      let dbUserType = userType;

      // Create the registration record (password will be hashed by createPendingRegistration)
      const registration = await storage.createPendingRegistration({
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || null,
        email,
        phone,
        password, // Pass plain password - will be hashed in storage function
        userType: dbUserType,
        notes: message || null,
        status: 'pending',
      });

      // Auto-approve for Familiar and Torcedor
      if (userType === 'familiar' || userType === 'torcedor') {
        // Create user account directly (auto-approval)
        const userId = `auto_${registration.id}_${Date.now()}`;
        
        // Check if user already exists with this email
        const [existingUser] = await db.select().from(users).where(eq(users.email, registration.email)).limit(1);
        if (existingUser) {
          return res.status(400).json({ message: "Um usuário com este email já existe no sistema" });
        }

        // Get first available club and its active season to auto-assign
        const [firstClub] = await db.select().from(clubs).limit(1);
        let clubId = null;
        let seasonId = null;
        
        if (firstClub) {
          clubId = firstClub.id;
          // Get active season for this club
          const [activeSeason] = await db.select()
            .from(seasons)
            .where(and(
              eq(seasons.clubId, firstClub.id),
              eq(seasons.isActive, true)
            ))
            .limit(1);
          
          if (activeSeason) {
            seasonId = activeSeason.id;
          }
        }

        // Create user account with auto-assigned club/season
        await db.insert(users).values({
          id: userId,
          email: registration.email,
          firstName: registration.firstName,
          lastName: registration.lastName,
          password: registration.password, // Already hashed
          role: userType, // familiar or torcedor
          status: "approved",
          phone: registration.phone,
          clubId, // Auto-assigned from first available club
          seasonId, // Auto-assigned from active season
          isActive: true,
          approvedAt: new Date(),
          approvedBy: null, // Auto-approved by system (no specific user)
        });

        // Update registration status to approved
        await db.update(pendingRegistrations)
          .set({ 
            status: 'approved',
            reviewedAt: new Date(),
            reviewedBy: null // Auto-approved by system
          })
          .where(eq(pendingRegistrations.id, registration.id));

        res.status(201).json({ 
          success: true, 
          message: "Cadastro aprovado automaticamente! Você já pode fazer login no sistema.",
          registrationId: registration.id,
          autoApproved: true
        });
      } else {
        // For other user types, require manual approval
        res.status(201).json({ 
          success: true, 
          message: "Inscrição recebida com sucesso! Aguarde a aprovação do administrador.",
          registrationId: registration.id,
          autoApproved: false
        });
      }
    } catch (error) {
      console.error("Error creating public registration:", error);
      res.status(500).json({ message: "Erro ao processar inscrição" });
    }
  });

  // Export reports to PDF
  app.get("/api/reports/export-pdf", isAuthenticated, async (req, res) => {
    try {
      const { type, periodStart, periodEnd, periodLabel, category } = req.query;
      const sessionUser = (req as any).user;

      // Get user ID from different possible structures
      let userId = sessionUser?.claims?.sub || sessionUser?.id || null;

      if (!userId) {
        console.error('[PDF EXPORT] No user ID found in session');
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Get user from database to ensure we have clubId and seasonId
      const user = await storage.getUser(userId);
      
      if (!user?.clubId || !user?.seasonId) {
        console.error('[PDF EXPORT] User missing clubId or seasonId');
        return res.status(400).json({ message: "Usuário sem clube ou temporada selecionados. Por favor, selecione um clube primeiro." });
      }

      // Import PDFDocument dynamically
      const PDFDocument = (await import('pdfkit')).default;
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      // Set response headers for PDF download
      const timestamp = formatLocalDate(new Date());
      const filename = `relatorio_${type}_${timestamp}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Pipe PDF to response
      doc.pipe(res);

      // Helper function to add header
      const addHeader = (title: string) => {
        doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(`Período: ${periodLabel || 'Todos'}`, { align: 'center' });
        doc.fontSize(10).text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
        doc.moveDown(1.5);
      };

      // Helper function to add table
      const addTable = (headers: string[], rows: string[][], startY: number) => {
        const tableTop = startY;
        const itemHeight = 25;
        const columnWidth = (doc.page.width - 100) / headers.length;

        // Function to draw table headers
        const drawHeaders = (y: number) => {
          doc.fontSize(10).font('Helvetica-Bold');
          headers.forEach((header, i) => {
            doc.text(header, 50 + (i * columnWidth), y, {
              width: columnWidth,
              align: 'left'
            });
          });

          // Draw header line
          doc.moveTo(50, y + 15)
             .lineTo(doc.page.width - 50, y + 15)
             .stroke();
        };

        // Draw initial headers
        drawHeaders(tableTop);

        // Draw rows
        doc.font('Helvetica').fontSize(9);
        let currentY = tableTop + itemHeight;
        
        rows.forEach((row, rowIndex) => {
          // Check if we need a new page
          if (currentY > doc.page.height - 100) {
            doc.addPage();
            currentY = 50;
            // Redraw headers on new page
            drawHeaders(currentY);
            // Restore body font after drawing headers
            doc.font('Helvetica').fontSize(9);
            currentY += itemHeight;
          }

          row.forEach((cell, i) => {
            doc.text(cell || '-', 50 + (i * columnWidth), currentY, {
              width: columnWidth - 10,
              align: 'left'
            });
          });
          currentY += itemHeight;
        });

        return currentY;
      };

      // Generate PDF based on type
      switch (type) {
        case 'athletes': {
          let athletes = await storage.getAthletes(user.clubId, user.seasonId);
          
          // Filter by category if specified
          if (category && category !== 'all') {
            athletes = athletes.filter(a => a.category === category);
          }
          
          const title = category && category !== 'all' 
            ? `Relatório de Atletas - ${category}`
            : 'Relatório de Atletas';
          addHeader(title);
          
          const headers = ['Nome', 'Categoria', 'Posição', 'Status', 'Idade', 'Time'];
          const rows = athletes.map(a => [
            `${a.firstName || ''} ${a.lastName || ''}`.trim() || '-',
            a.category || '-',
            a.position || '-',
            a.status || '-',
            a.dateOfBirth ? String(new Date().getFullYear() - new Date(a.dateOfBirth).getFullYear()) : '-',
            a.teamName || '-'
          ]);
          
          if (rows.length === 0) {
            doc.fontSize(12).text('Nenhum atleta encontrado com os filtros selecionados.', { align: 'center' });
          } else {
            addTable(headers, rows, 150);
          }
          break;
        }

        case 'training': {
          const sessions = await storage.getTrainingSessions(user.clubId, user.seasonId);
          const filtered = sessions.filter(s => {
            if (!periodStart || !periodEnd) return true;
            const sessionDate = new Date(s.date);
            return sessionDate >= new Date(periodStart as string) && sessionDate <= new Date(periodEnd as string);
          });

          addHeader('Relatório de Treinos');
          
          const headers = ['Data', 'Tipo', 'Categoria', 'Duração', 'Local'];
          const rows = filtered.map(s => [
            new Date(s.date).toLocaleDateString('pt-BR'),
            s.type || '-',
            s.category || '-',
            s.duration ? `${s.duration} min` : '-',
            s.location || '-'
          ]);
          
          if (rows.length === 0) {
            doc.fontSize(12).text('Nenhum treino encontrado no período selecionado.', { align: 'center' });
          } else {
            addTable(headers, rows, 150);
          }
          break;
        }

        case 'games': {
          const games = await storage.getGames(user.clubId, user.seasonId);
          const filtered = games.filter(g => {
            if (!periodStart || !periodEnd) return true;
            const gameDate = new Date(g.date);
            return gameDate >= new Date(periodStart as string) && gameDate <= new Date(periodEnd as string);
          });

          addHeader('Relatório de Jogos');
          
          const headers = ['Data', 'Categoria', 'Adversário', 'Placar', 'Resultado', 'Local'];
          const rows = filtered.map(g => [
            new Date(g.date).toLocaleDateString('pt-BR'),
            g.category || '-',
            g.opponent || '-',
            g.ourScore !== null && g.opponentScore !== null ? `${g.ourScore} x ${g.opponentScore}` : '-',
            g.ourScore !== null && g.opponentScore !== null 
              ? (g.ourScore > g.opponentScore ? 'Vitória' : g.ourScore < g.opponentScore ? 'Derrota' : 'Empate')
              : '-',
            g.isHome ? 'Casa' : 'Fora'
          ]);
          
          if (rows.length === 0) {
            doc.fontSize(12).text('Nenhum jogo encontrado no período selecionado.', { align: 'center' });
          } else {
            addTable(headers, rows, 150);
          }
          break;
        }

        case 'wellness': {
          // Safely get wellness data with error handling for corrupted dates
          let entries = [];
          try {
            entries = await storage.getWellnessEntries(undefined, periodStart as string, periodEnd as string);
          } catch (error) {
            console.error('Error loading wellness data:', error);
            doc.fontSize(12).text('Erro ao carregar dados de wellness. Pode haver dados corrompidos no banco de dados.', { align: 'center' });
            break;
          }

          // Get athletes to map names
          const athletes = await storage.getAthletes(user.clubId, user.seasonId);
          const athleteMap = new Map(athletes.map(a => [a.id, `${a.firstName} ${a.lastName}`]));

          addHeader('Relatório de Wellness');
          
          const headers = ['Data', 'Atleta', 'Humor', 'Sono (h)', 'Fadiga', 'Estresse', 'Dor Muscular'];
          const rows = entries.map(e => [
            new Date(e.date).toLocaleDateString('pt-BR'),
            athleteMap.get(e.athleteId) || '-',
            String(e.mood || '-'),
            String(e.sleepHours || '-'),
            String(e.fatigue || '-'),
            String(e.stress || '-'),
            String(e.muscleSoreness || '-')
          ]);
          
          if (rows.length === 0) {
            doc.fontSize(12).text('Nenhum registro de wellness encontrado no período selecionado.', { align: 'center' });
          } else {
            addTable(headers, rows, 150);
          }
          break;
        }

        case 'financial': {
          // Safely get financial data with error handling for corrupted dates
          let transactions = [];
          try {
            transactions = await storage.getFinancialTransactions(user.clubId, user.seasonId);
          } catch (error) {
            console.error('Error loading financial data:', error);
            doc.fontSize(12).text('Erro ao carregar dados financeiros. Pode haver dados corrompidos no banco de dados.', { align: 'center' });
            break;
          }
          const filtered = transactions.filter(t => {
            if (!periodStart || !periodEnd) return true;
            const transactionDate = new Date(t.date);
            return transactionDate >= new Date(periodStart as string) && transactionDate <= new Date(periodEnd as string);
          });

          addHeader('Relatório Financeiro');
          
          const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'];
          const rows = filtered.map(t => [
            new Date(t.date).toLocaleDateString('pt-BR'),
            t.type === 'income' ? 'Receita' : 'Despesa',
            t.category || '-',
            t.description || '-',
            `R$ ${parseFloat(t.amount || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          ]);
          
          if (rows.length === 0) {
            doc.fontSize(12).text('Nenhuma transação encontrada no período selecionado.', { align: 'center' });
          } else {
            addTable(headers, rows, 150);
            
            // Add totals
            doc.moveDown(2);
            const totalIncome = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
            const totalExpense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
            const balance = totalIncome - totalExpense;
            
            doc.fontSize(12).font('Helvetica-Bold');
            doc.text(`Total Receitas: R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' });
            doc.text(`Total Despesas: R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' });
            doc.text(`Saldo: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' });
          }
          break;
        }

        case 'general': {
          // Get all data for general report
          const athletes = await storage.getAthletes(user.clubId, user.seasonId);
          const sessions = await storage.getTrainingSessions(user.clubId, user.seasonId);
          const games = await storage.getGames(user.clubId, user.seasonId);
          // Safely get wellness data with error handling for corrupted dates
          let wellness = [];
          try {
            wellness = await storage.getWellnessEntries(undefined, periodStart as string, periodEnd as string);
          } catch (error) {
            console.error('Error loading wellness data (may have corrupted dates):', error);
            // Continue without wellness data
          }
          const medical = await storage.getMedicalRecords();
          // Safely get financial data with error handling for corrupted dates
          let financial = [];
          try {
            financial = await storage.getFinancialTransactions(periodStart as string, periodEnd as string);
          } catch (error) {
            console.error('Error loading financial data (may have corrupted dates):', error);
            // Continue without financial data
          }

          // Filter by period
          const filteredSessions = sessions.filter(s => {
            if (!periodStart || !periodEnd) return true;
            const date = new Date(s.date);
            return date >= new Date(periodStart as string) && date <= new Date(periodEnd as string);
          });

          const filteredGames = games.filter(g => {
            if (!periodStart || !periodEnd) return true;
            const date = new Date(g.date);
            return date >= new Date(periodStart as string) && date <= new Date(periodEnd as string);
          });

          const filteredMedical = medical.filter(m => {
            if (!periodStart || !periodEnd) return true;
            const date = new Date(m.date);
            return date >= new Date(periodStart as string) && date <= new Date(periodEnd as string);
          });

          const filteredFinancial = financial.filter(t => {
            if (!periodStart || !periodEnd) return true;
            const date = new Date(t.date);
            return date >= new Date(periodStart as string) && date <= new Date(periodEnd as string);
          });

          addHeader('Relatório Geral');

          // Statistics
          const totalAthletes = athletes.length;
          const activeAthletes = athletes.filter(a => a.status === 'active').length;
          const injuredAthletes = athletes.filter(a => a.status === 'injured').length;
          
          const totalSessions = filteredSessions.length;
          const totalGames = filteredGames.length;
          const wins = filteredGames.filter(g => g.ourScore !== null && g.opponentScore !== null && g.ourScore > g.opponentScore).length;
          const draws = filteredGames.filter(g => g.ourScore !== null && g.opponentScore !== null && g.ourScore === g.opponentScore).length;
          const losses = filteredGames.filter(g => g.ourScore !== null && g.opponentScore !== null && g.ourScore < g.opponentScore).length;
          
          const activeInjuries = filteredMedical.filter(m => m.type === 'injury' && m.status === 'active').length;
          const recovered = filteredMedical.filter(m => m.status === 'recovered').length;
          
          const income = filteredFinancial.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
          const expenses = filteredFinancial.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
          const balance = income - expenses;

          // Add summary sections
          let yPos = 150;
          
          doc.fontSize(14).font('Helvetica-Bold').text('Atletas', 50, yPos);
          yPos += 25;
          doc.fontSize(11).font('Helvetica');
          doc.text(`Total: ${totalAthletes}`, 70, yPos);
          yPos += 20;
          doc.text(`Ativos: ${activeAthletes}`, 70, yPos);
          yPos += 20;
          doc.text(`Lesionados: ${injuredAthletes}`, 70, yPos);
          yPos += 40;

          doc.fontSize(14).font('Helvetica-Bold').text('Treinos e Jogos', 50, yPos);
          yPos += 25;
          doc.fontSize(11).font('Helvetica');
          doc.text(`Total de Treinos: ${totalSessions}`, 70, yPos);
          yPos += 20;
          doc.text(`Total de Jogos: ${totalGames}`, 70, yPos);
          yPos += 20;
          doc.text(`Vitórias: ${wins}`, 70, yPos);
          yPos += 20;
          doc.text(`Empates: ${draws}`, 70, yPos);
          yPos += 20;
          doc.text(`Derrotas: ${losses}`, 70, yPos);
          yPos += 20;
          if (totalGames > 0) {
            doc.text(`Taxa de Vitórias: ${Math.round((wins / totalGames) * 100)}%`, 70, yPos);
            yPos += 40;
          } else {
            yPos += 20;
          }

          doc.fontSize(14).font('Helvetica-Bold').text('Médico', 50, yPos);
          yPos += 25;
          doc.fontSize(11).font('Helvetica');
          doc.text(`Lesões Ativas: ${activeInjuries}`, 70, yPos);
          yPos += 20;
          doc.text(`Recuperados no Período: ${recovered}`, 70, yPos);
          yPos += 40;

          doc.fontSize(14).font('Helvetica-Bold').text('Financeiro', 50, yPos);
          yPos += 25;
          doc.fontSize(11).font('Helvetica');
          doc.text(`Receitas: R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 70, yPos);
          yPos += 20;
          doc.text(`Despesas: R$ ${expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 70, yPos);
          yPos += 20;
          doc.text(`Saldo: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 70, yPos);
          
          break;
        }

        default:
          doc.fontSize(14).text('Tipo de relatório não suportado', { align: 'center' });
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ message: "Erro ao gerar PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
