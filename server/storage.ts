import * as bcrypt from 'bcrypt';

// Helper function to format dates in São Paulo timezone (UTC-3)
// Returns YYYY-MM-DD format in local time
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

import {
  users,
  pendingRegistrations,
  clubs,
  seasons,
  teams,
  athletes,
  trainingSessions,
  trainingDrills,
  trainingStages,
  trainingStageDrills,
  trainingEvaluations,
  games,
  gameCallUps,
  gameLineups,
  gameFormations,
  playerGameAnalysis,
  teamGameAnalysis,
  tournaments,
  tournamentTeams,
  tournamentGroups,
  tournamentMatches,
  tournamentAdvancementRules,
  gameEvaluations,
  wellnessEntries,
  rpeEntries,
  medicalRecords,
  financialTransactions,
  adversaryTeams,
  stadiums,
  playerFitnessMetrics,
  injuryRiskAssessments,
  fitnessAlerts,
  storeProducts,
  type User,
  type UpsertUser,
  type InsertPendingRegistration,
  type PendingRegistration,
  type Club,
  type InsertClub,
  type Season,
  type InsertSeason,
  type Team,
  type InsertTeam,
  type Athlete,
  type InsertAthlete,
  type TrainingSession,
  type InsertTrainingSession,
  type TrainingDrill,
  type InsertTrainingDrill,
  type TrainingStage,
  type InsertTrainingStage,
  type TrainingStageDrill,
  type InsertTrainingStageDrill,
  type TrainingEvaluation,
  type InsertTrainingEvaluation,
  type Game,
  type InsertGame,
  type GameCallUp,
  type InsertGameCallUp,
  type GameLineup,
  type InsertGameLineup,
  type GameFormation,
  type InsertGameFormation,
  type PlayerGameAnalysis,
  type InsertPlayerGameAnalysis,
  type TeamGameAnalysis,
  type InsertTeamGameAnalysis,
  type Tournament,
  type InsertTournament,
  type TournamentTeam,
  type InsertTournamentTeam,
  type TournamentGroup,
  type InsertTournamentGroup,
  type TournamentMatch,
  type InsertTournamentMatch,
  type TournamentAdvancementRule,
  type InsertTournamentAdvancementRule,
  type GameEvaluation,
  type InsertGameEvaluation,
  type AdversaryTeam,
  type InsertAdversaryTeam,
  type Stadium,
  type InsertStadium,
  type WellnessEntry,
  type InsertWellnessEntry,
  type RpeEntry,
  type InsertRpeEntry,
  type MedicalRecord,
  type InsertMedicalRecord,
  type FinancialTransaction,
  type InsertFinancialTransaction,
  systemConfig,
  type SystemConfig,
  type InsertSystemConfig,
  type StoreProduct,
  type InsertStoreProduct,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, inArray, like, not, or } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Club operations
  getClub(id: number): Promise<Club | undefined>;
  getClubs(): Promise<Club[]>;
  getClubsByIds(ids: number[]): Promise<Club[]>;
  upsertClub(club: InsertClub): Promise<Club>;
  deleteClub(id: number): Promise<void>;
  initializeClubDatabase(clubId: number): Promise<void>;

  // Season operations
  getSeason(id: number): Promise<Season | undefined>;
  getSeasons(): Promise<Season[]>;
  getSeasonsByClub(clubId: number): Promise<Season[]>;
  upsertSeason(season: InsertSeason): Promise<Season>;
  
  // Additional user management operations
  getUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  createUser(user: UpsertUser): Promise<User>;

  // Pending registration operations
  getPendingRegistrations(): Promise<PendingRegistration[]>;
  getPendingRegistration(id: number): Promise<PendingRegistration | undefined>;
  getPendingRegistrationByEmail(email: string): Promise<PendingRegistration | undefined>;
  createPendingRegistration(registration: InsertPendingRegistration): Promise<PendingRegistration>;
  approvePendingRegistration(id: number, reviewedBy: string, notes?: string, teamId?: number): Promise<User>;
  rejectPendingRegistration(id: number, reviewedBy: string, notes?: string): Promise<PendingRegistration>;
  deletePendingRegistration(id: number): Promise<void>;

  // Team operations
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByName(name: string, clubId: number): Promise<Team | undefined>;
  getTeamsByClubAndSeason(clubId: number, seasonId: number): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team>;
  deleteTeam(id: number): Promise<void>;

  // Athlete operations
  getAthletes(): Promise<Athlete[]>;
  getAthlete(id: number): Promise<Athlete | undefined>;
  createAthlete(athlete: InsertAthlete): Promise<Athlete>;
  updateAthlete(id: number, athlete: Partial<InsertAthlete>): Promise<Athlete>;
  deleteAthlete(id: number): Promise<void>;

  // Training operations
  getTrainingSessions(): Promise<TrainingSession[]>;
  getTrainingSession(id: number): Promise<TrainingSession | undefined>;
  createTrainingSession(session: InsertTrainingSession): Promise<TrainingSession>;
  updateTrainingSession(id: number, session: Partial<InsertTrainingSession>): Promise<TrainingSession>;
  deleteTrainingSession(id: number): Promise<void>;

  // Training drills operations
  getTrainingDrills(clubId: number | null, filters?: { isPredefined?: boolean; type?: string; category?: string }): Promise<TrainingDrill[]>;
  createTrainingDrill(clubId: number, drill: InsertTrainingDrill): Promise<TrainingDrill>;

  // Training stages operations
  getTrainingStages(sessionId: number): Promise<TrainingStage[]>;
  createTrainingStage(stage: InsertTrainingStage): Promise<TrainingStage>;

  // Training stage drills operations
  getTrainingStageDrills(stageId: number): Promise<TrainingStageDrill[]>;
  createTrainingStageDrill(stageDrill: InsertTrainingStageDrill): Promise<TrainingStageDrill>;

  // Training evaluation operations
  getTrainingEvaluations(sessionId?: number, athleteId?: number): Promise<TrainingEvaluation[]>;
  createTrainingEvaluation(evaluation: InsertTrainingEvaluation): Promise<TrainingEvaluation>;
  updateTrainingEvaluation(id: number, evaluation: Partial<InsertTrainingEvaluation>): Promise<TrainingEvaluation>;

  // Game operations
  getGames(): Promise<Game[]>;
  getGame(id: number): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: number, game: Partial<InsertGame>): Promise<Game>;
  deleteGame(id: number): Promise<void>;
  getClubTournamentMatches(clubId: number, seasonId: number): Promise<any[]>;

  // Tournament operations
  getTournaments(): Promise<Tournament[]>;
  getTournament(id: number): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: number, tournament: Partial<InsertTournament>): Promise<Tournament>;
  deleteTournament(id: number): Promise<void>;

  // Tournament match operations
  getTournamentMatches(tournamentId: number): Promise<TournamentMatch[]>;
  createTournamentMatch(match: InsertTournamentMatch): Promise<TournamentMatch>;
  updateTournamentMatch(id: number, match: Partial<InsertTournamentMatch>): Promise<TournamentMatch>;
  
  // Tournament group operations
  createTournamentGroups(tournamentId: number, groupsPerCategory: number): Promise<TournamentGroup[]>;
  
  // Tournament team from adversary operations
  addTournamentTeamFromAdversary(tournamentId: number, adversaryTeamId: number, category: string): Promise<TournamentTeam>;
  addBulkTournamentTeamsFromAdversaries(tournamentId: number, adversaryTeamIds: number[]): Promise<TournamentTeam[]>;

  // Game evaluation operations
  getGameEvaluations(gameId?: number, athleteId?: number): Promise<GameEvaluation[]>;
  createGameEvaluation(evaluation: InsertGameEvaluation): Promise<GameEvaluation>;
  updateGameEvaluation(id: number, evaluation: Partial<InsertGameEvaluation>): Promise<GameEvaluation>;

  // Game call-up operations
  getGameCallUps(gameId: number): Promise<GameCallUp[]>;
  createGameCallUp(callUp: InsertGameCallUp): Promise<GameCallUp>;
  updateGameCallUp(id: number, updates: Partial<InsertGameCallUp>): Promise<GameCallUp>;
  deleteGameCallUp(id: number): Promise<void>;

  // Game lineup operations
  getGameLineup(gameId: number): Promise<GameLineup[]>;
  createGameLineup(lineup: InsertGameLineup): Promise<GameLineup>;
  deleteGameLineup(id: number): Promise<void>;

  // Game formation operations
  getGameFormation(gameId: number): Promise<GameFormation | undefined>;
  createGameFormation(formation: InsertGameFormation): Promise<GameFormation>;

  // Player game analysis operations
  getPlayerGameAnalysis(gameId: number): Promise<PlayerGameAnalysis[]>;
  createPlayerGameAnalysis(analysis: InsertPlayerGameAnalysis): Promise<PlayerGameAnalysis>;

  // Team game analysis operations
  getTeamGameAnalysis(gameId: number): Promise<TeamGameAnalysis | undefined>;
  createTeamGameAnalysis(analysis: InsertTeamGameAnalysis): Promise<TeamGameAnalysis>;

  // Wellness operations
  getWellnessEntries(athleteId?: number, startDate?: string, endDate?: string): Promise<WellnessEntry[]>;
  createWellnessEntry(entry: InsertWellnessEntry): Promise<WellnessEntry>;
  updateWellnessEntry(id: number, entry: Partial<InsertWellnessEntry>): Promise<WellnessEntry>;

  // RPE operations
  getRpeEntries(athleteId?: number, trainingSessionId?: number, startDate?: string, endDate?: string): Promise<RpeEntry[]>;
  createRpeEntry(entry: InsertRpeEntry): Promise<RpeEntry>;
  updateRpeEntry(id: number, entry: Partial<InsertRpeEntry>): Promise<RpeEntry>;
  deleteRpeEntry(id: number): Promise<void>;

  // Medical operations
  getMedicalRecords(athleteId?: number): Promise<MedicalRecord[]>;
  getMedicalRecord(id: number): Promise<MedicalRecord | undefined>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: number, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord>;
  deleteMedicalRecord(id: number): Promise<void>;

  // Financial operations
  getFinancialTransactions(startDate?: string, endDate?: string): Promise<FinancialTransaction[]>;
  getFinancialTransaction(id: number): Promise<FinancialTransaction | undefined>;
  createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction>;
  updateFinancialTransaction(id: number, transaction: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction>;
  deleteFinancialTransaction(id: number): Promise<void>;

  // Store Product operations
  getStoreProducts(): Promise<StoreProduct[]>;
  getStoreProduct(id: number): Promise<StoreProduct | undefined>;
  createStoreProduct(product: InsertStoreProduct): Promise<StoreProduct>;
  updateStoreProduct(id: number, product: Partial<InsertStoreProduct>): Promise<StoreProduct>;
  deleteStoreProduct(id: number): Promise<void>;

  // Dashboard statistics
  getDashboardStats(): Promise<any>;

  // System configuration operations
  getSystemConfig(key?: string): Promise<SystemConfig[]>;
  getConfigValue(key: string): Promise<any>;
  setConfigValue(key: string, value: any, description?: string): Promise<SystemConfig>;
  deleteConfigValue(key: string): Promise<void>;

  // Badge synchronization
  updateEssubeTeamBadges(clubId: number, seasonId: number, badgeUrl: string): Promise<void>;

  // Adversary teams operations
  getAdversaryTeams(clubId: number, seasonId: number): Promise<AdversaryTeam[]>;
  getAdversaryTeam(id: number): Promise<AdversaryTeam | undefined>;
  createAdversaryTeam(team: InsertAdversaryTeam): Promise<AdversaryTeam>;
  updateAdversaryTeam(id: number, team: Partial<InsertAdversaryTeam>): Promise<AdversaryTeam>;
  deleteAdversaryTeam(id: number): Promise<void>;

  // Stadium operations
  getStadiums(clubId: number, seasonId: number): Promise<Stadium[]>;
  getStadium(id: number): Promise<Stadium | undefined>;
  createStadium(stadium: InsertStadium): Promise<Stadium>;
  updateStadium(id: number, stadium: Partial<InsertStadium>): Promise<Stadium>;
  deleteStadium(id: number): Promise<void>;

  // Fitness and injury risk operations
  getFitnessAlerts(clubId: number, seasonId: number): Promise<any[]>;
  acknowledgeFitnessAlert(alertId: number, userId: string): Promise<any>;
  getFitnessDashboard(clubId: number, seasonId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Store current club and season context for data segregation
  private currentClubId: number | null = null;
  private currentSeasonId: number | null = null;

  // Set the current club/season context for data segregation
  setContext(clubId: number, seasonId: number) {
    this.currentClubId = clubId;
    this.currentSeasonId = seasonId;
  }

  // Clear context
  clearContext() {
    this.currentClubId = null;
    this.currentSeasonId = null;
  }
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    // Hash password if provided
    const processedData = { ...userData };
    if (processedData.password) {
      processedData.password = await bcrypt.hash(processedData.password, 10);
    }
    
    // Gerar ID único se não fornecido
    const userDataWithId = {
      ...processedData,
      id: processedData.id || Date.now().toString(),
      role: processedData.role || 'atleta',
      isActive: processedData.isActive ?? true
    };
    
    const [user] = await db.insert(users).values(userDataWithId).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    // Hash password if provided
    const processedData = { ...userData };
    if (processedData.password) {
      processedData.password = await bcrypt.hash(processedData.password, 10);
    }
    
    const [updatedUser] = await db
      .update(users)
      .set({ ...processedData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Club operations
  async getClub(id: number): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
    return club;
  }

  async getClubs(): Promise<Club[]> {
    return await db.select().from(clubs).orderBy(desc(clubs.createdAt));
  }

  async getClubsByIds(ids: number[]): Promise<Club[]> {
    if (ids.length === 0) return [];
    return await db.select().from(clubs).where(inArray(clubs.id, ids));
  }

  async upsertClub(clubData: InsertClub): Promise<Club> {
    const [club] = await db
      .insert(clubs)
      .values(clubData)
      .onConflictDoUpdate({
        target: clubs.id,
        set: clubData,
      })
      .returning();
    return club;
  }

  async deleteAllClubs(): Promise<void> {
    // Get all club IDs first
    const allClubs = await db.select({ id: clubs.id }).from(clubs);
    
    // Delete each club using the existing deleteClub method
    for (const club of allClubs) {
      await this.deleteClub(club.id);
    }
  }

  async deleteClub(id: number): Promise<void> {
    // Delete related records first to avoid foreign key constraints
    // Order matters: delete child records before parent records
    
    // First get all training sessions for this club
    const clubTrainingSessions = await db.select({ id: trainingSessions.id }).from(trainingSessions).where(eq(trainingSessions.clubId, id));
    const trainingSessionIds = clubTrainingSessions.map(ts => ts.id);
    
    // Delete training evaluations that reference these training sessions
    if (trainingSessionIds.length > 0) {
      await db.delete(trainingEvaluations).where(inArray(trainingEvaluations.trainingSessionId, trainingSessionIds));
    }
    
    // Now delete other records that directly reference clubId
    await db.delete(trainingSessions).where(eq(trainingSessions.clubId, id));
    
    // Get all games for this club to delete their evaluations
    const clubGames = await db.select({ id: games.id }).from(games).where(eq(games.clubId, id));
    const gameIds = clubGames.map(g => g.id);
    
    if (gameIds.length > 0) {
      await db.delete(gameEvaluations).where(inArray(gameEvaluations.gameId, gameIds));
    }
    
    await db.delete(games).where(eq(games.clubId, id));
    await db.delete(wellnessEntries).where(eq(wellnessEntries.clubId, id));
    await db.delete(medicalRecords).where(eq(medicalRecords.clubId, id));
    await db.delete(financialTransactions).where(eq(financialTransactions.clubId, id));
    await db.delete(athletes).where(eq(athletes.clubId, id));
    await db.delete(teams).where(eq(teams.clubId, id));
    
    // Delete store products for this club
    await db.delete(storeProducts).where(eq(storeProducts.clubId, id));
    
    // Delete tournament-related records first
    const clubTournaments = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.clubId, id));
    const tournamentIds = clubTournaments.map(t => t.id);
    
    if (tournamentIds.length > 0) {
      await db.delete(tournamentMatches).where(inArray(tournamentMatches.tournamentId, tournamentIds));
      await db.delete(tournamentTeams).where(inArray(tournamentTeams.tournamentId, tournamentIds));
      await db.delete(tournamentGroups).where(inArray(tournamentGroups.tournamentId, tournamentIds));
    }
    
    // Delete tournaments before seasons (tournaments reference seasons)
    await db.delete(tournaments).where(eq(tournaments.clubId, id));
    await db.delete(seasons).where(eq(seasons.clubId, id));
    
    // Update users to remove club association instead of deleting them
    await db.update(users).set({ clubId: null }).where(eq(users.clubId, id));
    
    // Finally delete the club
    await db.delete(clubs).where(eq(clubs.id, id));
  }

  // Season operations
  async getSeason(id: number): Promise<Season | undefined> {
    const [season] = await db.select().from(seasons).where(eq(seasons.id, id));
    return season;
  }

  async getSeasons(): Promise<Season[]> {
    return await db.select().from(seasons).orderBy(desc(seasons.createdAt));
  }

  async getSeasonsByClub(clubId: number): Promise<Season[]> {
    return await db.select().from(seasons).where(eq(seasons.clubId, clubId)).orderBy(desc(seasons.createdAt));
  }

  async upsertSeason(seasonData: InsertSeason): Promise<Season> {
    const [season] = await db
      .insert(seasons)
      .values(seasonData)
      .onConflictDoUpdate({
        target: seasons.id,
        set: {
          ...seasonData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return season;
  }

  // Club database initialization for new clubs
  async initializeClubDatabase(clubId: number, seasonType: "calendar" | "sport" = "calendar"): Promise<void> {
    try {
      // Create a default season for the new club based on season type
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1; // 1-based month
      
      let seasonName: string;
      let startDate: string;
      let endDate: string;
      
      if (seasonType === "calendar") {
        // Calendar year: January to December
        seasonName = `Temporada ${currentYear}`;
        startDate = `${currentYear}-01-01`;
        endDate = `${currentYear}-12-31`;
      } else {
        // Sport season: July to June
        if (currentMonth >= 7) {
          // We're in the first half of the sport season (July-December)
          seasonName = `Temporada ${currentYear}-${currentYear + 1}`;
          startDate = `${currentYear}-07-01`;
          endDate = `${currentYear + 1}-06-30`;
        } else {
          // We're in the second half of the sport season (January-June)
          seasonName = `Temporada ${currentYear - 1}-${currentYear}`;
          startDate = `${currentYear - 1}-07-01`;
          endDate = `${currentYear}-06-30`;
        }
      }
      
      const [defaultSeason] = await db.insert(seasons).values({
        clubId: clubId,
        name: seasonName,
        seasonType: seasonType,
        startDate: startDate,
        endDate: endDate,
        description: `Temporada padrão (${seasonType === "calendar" ? "Ano Civil" : "Temporada Esportiva"})`,
        isActive: true,
        isDefault: true,
      }).returning();
    } catch (error) {
      console.error(`Erro ao inicializar banco de dados para clube ${clubId}:`, error);
      throw error;
    }
  }

  // Team operations with club/season segregation
  async getTeams(): Promise<Team[]> {
    const query = db.select().from(teams).orderBy(desc(teams.createdAt));
    
    if (this.currentClubId && this.currentSeasonId) {
      return await query.where(
        and(
          eq(teams.clubId, this.currentClubId),
          eq(teams.seasonId, this.currentSeasonId)
        )
      );
    }
    
    return await query;
  }

  async getTeamByName(name: string, clubId: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(
      and(
        eq(teams.name, name),
        eq(teams.clubId, clubId)
      )
    );
    return team;
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamsByClubAndSeason(clubId: number, seasonId: number): Promise<Team[]> {
    return await db.select().from(teams)
      .where(and(
        eq(teams.clubId, clubId),
        eq(teams.seasonId, seasonId)
      ))
      .orderBy(teams.name);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async updateTeam(id: number, teamData: Partial<InsertTeam>): Promise<Team> {
    const [updatedTeam] = await db
      .update(teams)
      .set({ ...teamData, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Primeiro buscar todos os atletas da equipe
        const teamAthletes = await tx.select({ id: athletes.id }).from(athletes).where(eq(athletes.teamId, id));
        const athleteIds = teamAthletes.map(a => a.id);
        
        // Excluir dependências dos atletas
        for (const athleteId of athleteIds) {
          await tx.delete(financialTransactions).where(eq(financialTransactions.athleteId, athleteId));
          await tx.delete(gameEvaluations).where(eq(gameEvaluations.athleteId, athleteId));
          await tx.delete(trainingEvaluations).where(eq(trainingEvaluations.athleteId, athleteId));
          await tx.delete(wellnessEntries).where(eq(wellnessEntries.athleteId, athleteId));
          await tx.delete(medicalRecords).where(eq(medicalRecords.athleteId, athleteId));
        }
        
        // Excluir todos os atletas da equipe
        await tx.delete(athletes).where(eq(athletes.teamId, id));
        
        // Excluir a equipe
        await tx.delete(teams).where(eq(teams.id, id));
      });
    } catch (error) {
      console.error(`Erro ao excluir equipe ${id}:`, error);
      throw new Error(`Falha ao excluir equipe: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Athlete operations
  async getAthletes(): Promise<Athlete[]> {
    return await db.select().from(athletes).orderBy(desc(athletes.createdAt));
  }

  async getAthlete(id: number): Promise<Athlete | undefined> {
    const [athlete] = await db.select().from(athletes).where(eq(athletes.id, id));
    return athlete;
  }

  async createAthlete(athlete: InsertAthlete): Promise<Athlete> {
    // Clean up empty date strings to prevent database errors
    const cleanedAthlete = { ...athlete };
    if (cleanedAthlete.dateOfBirth === '') {
      cleanedAthlete.dateOfBirth = null;
    }
    if (cleanedAthlete.contractStart === '') {
      cleanedAthlete.contractStart = null;
    }
    if (cleanedAthlete.contractEnd === '') {
      cleanedAthlete.contractEnd = null;
    }
    
    const [newAthlete] = await db.insert(athletes).values(cleanedAthlete).returning();
    return newAthlete;
  }

  async updateAthlete(id: number, athlete: Partial<InsertAthlete>): Promise<Athlete> {
    const [updatedAthlete] = await db
      .update(athletes)
      .set({ ...athlete, updatedAt: new Date() })
      .where(eq(athletes.id, id))
      .returning();
    return updatedAthlete;
  }

  async deleteAthlete(id: number): Promise<void> {
    try {
      // Usar transação para garantir atomicidade
      await db.transaction(async (tx) => {
        // Excluir dependências primeiro (todas as tabelas que referenciam athletes)
        
        // Wellness e RPE
        await tx.delete(wellnessEntries).where(eq(wellnessEntries.athleteId, id));
        await tx.delete(rpeEntries).where(eq(rpeEntries.athleteId, id));
        
        // Fitness e alertas
        await tx.delete(playerFitnessMetrics).where(eq(playerFitnessMetrics.athleteId, id));
        await tx.delete(injuryRiskAssessments).where(eq(injuryRiskAssessments.athleteId, id));
        await tx.delete(fitnessAlerts).where(eq(fitnessAlerts.athleteId, id));
        
        // Médico
        await tx.delete(medicalRecords).where(eq(medicalRecords.athleteId, id));
        
        // Financeiro
        await tx.delete(financialTransactions).where(eq(financialTransactions.athleteId, id));
        
        // Treinos
        await tx.delete(trainingEvaluations).where(eq(trainingEvaluations.athleteId, id));
        
        // Jogos
        await tx.delete(gameCallUps).where(eq(gameCallUps.athleteId, id));
        await tx.delete(gameLineups).where(eq(gameLineups.athleteId, id));
        await tx.delete(playerGameAnalysis).where(eq(playerGameAnalysis.athleteId, id));
        await tx.delete(gameEvaluations).where(eq(gameEvaluations.athleteId, id));
        
        // Atualizar referências em users e pendingRegistrations (set null ao invés de excluir)
        await tx.update(users).set({ athleteId: null }).where(eq(users.athleteId, id));
        await tx.update(pendingRegistrations).set({ familyAthleteId: null }).where(eq(pendingRegistrations.familyAthleteId, id));
        
        // Excluir o atleta
        await tx.delete(athletes).where(eq(athletes.id, id));
      });
    } catch (error) {
      console.error(`Erro ao excluir atleta ${id}:`, error);
      throw new Error(`Falha ao excluir atleta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Training operations
  async getTrainingSessions(): Promise<TrainingSession[]> {
    return await db.select().from(trainingSessions).orderBy(desc(trainingSessions.date));
  }

  async getTrainingSession(id: number): Promise<TrainingSession | undefined> {
    const [session] = await db.select().from(trainingSessions).where(eq(trainingSessions.id, id));
    return session;
  }

  async createTrainingSession(session: InsertTrainingSession): Promise<TrainingSession> {
    const [newSession] = await db.insert(trainingSessions).values(session).returning();
    return newSession;
  }

  async updateTrainingSession(id: number, session: Partial<InsertTrainingSession>): Promise<TrainingSession> {
    const [updatedSession] = await db
      .update(trainingSessions)
      .set({ ...session, updatedAt: new Date() })
      .where(eq(trainingSessions.id, id))
      .returning();
    return updatedSession;
  }

  async deleteTrainingSession(id: number): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Excluir dependências primeiro
        await tx.delete(trainingEvaluations).where(eq(trainingEvaluations.trainingSessionId, id));
        
        // Excluir a sessão de treinamento
        await tx.delete(trainingSessions).where(eq(trainingSessions.id, id));
      });
    } catch (error) {
      console.error(`Erro ao excluir sessão de treinamento ${id}:`, error);
      throw new Error(`Falha ao excluir sessão de treinamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Training drills operations
  async getTrainingDrills(clubId: number | null, filters?: { isPredefined?: boolean; type?: string; category?: string }): Promise<TrainingDrill[]> {
    let query = db.select().from(trainingDrills);
    
    const conditions = [];
    
    // Multi-tenant filter: show predefined drills OR club-specific drills
    if (clubId) {
      conditions.push(
        or(
          eq(trainingDrills.isPredefined, true),
          eq(trainingDrills.clubId, clubId)
        )
      );
    } else {
      // If no club ID provided, show only predefined drills
      conditions.push(eq(trainingDrills.isPredefined, true));
    }
    
    if (filters?.isPredefined !== undefined) {
      conditions.push(eq(trainingDrills.isPredefined, filters.isPredefined));
    }
    if (filters?.type) {
      conditions.push(eq(trainingDrills.type, filters.type));
    }
    if (filters?.category) {
      conditions.push(eq(trainingDrills.category, filters.category));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(trainingDrills.name);
  }

  async createTrainingDrill(clubId: number, drill: InsertTrainingDrill): Promise<TrainingDrill> {
    const [newDrill] = await db.insert(trainingDrills).values({
      ...drill,
      clubId: clubId,
      isPredefined: false
    }).returning();
    return newDrill;
  }

  // Training stages operations
  async getTrainingStages(sessionId: number): Promise<TrainingStage[]> {
    return await db.select()
      .from(trainingStages)
      .where(eq(trainingStages.trainingSessionId, sessionId))
      .orderBy(trainingStages.order);
  }

  async createTrainingStage(stage: InsertTrainingStage): Promise<TrainingStage> {
    const [newStage] = await db.insert(trainingStages).values(stage).returning();
    return newStage;
  }

  // Training stage drills operations
  async getTrainingStageDrills(stageId: number): Promise<TrainingStageDrill[]> {
    return await db.select()
      .from(trainingStageDrills)
      .where(eq(trainingStageDrills.trainingStageId, stageId))
      .orderBy(trainingStageDrills.order);
  }

  async createTrainingStageDrill(stageDrill: InsertTrainingStageDrill): Promise<TrainingStageDrill> {
    const [newStageDrill] = await db.insert(trainingStageDrills).values(stageDrill).returning();
    return newStageDrill;
  }

  // Training evaluation operations
  async getTrainingEvaluations(sessionId?: number, athleteId?: number): Promise<TrainingEvaluation[]> {
    let query = db.select().from(trainingEvaluations);
    
    if (sessionId && athleteId) {
      query = query.where(and(
        eq(trainingEvaluations.trainingSessionId, sessionId),
        eq(trainingEvaluations.athleteId, athleteId)
      ));
    } else if (sessionId) {
      query = query.where(eq(trainingEvaluations.trainingSessionId, sessionId));
    } else if (athleteId) {
      query = query.where(eq(trainingEvaluations.athleteId, athleteId));
    }
    
    return await query.orderBy(desc(trainingEvaluations.createdAt));
  }

  async createTrainingEvaluation(evaluation: InsertTrainingEvaluation): Promise<TrainingEvaluation> {
    const [newEvaluation] = await db.insert(trainingEvaluations).values(evaluation).returning();
    return newEvaluation;
  }

  async updateTrainingEvaluation(id: number, evaluation: Partial<InsertTrainingEvaluation>): Promise<TrainingEvaluation> {
    const [updatedEvaluation] = await db
      .update(trainingEvaluations)
      .set(evaluation)
      .where(eq(trainingEvaluations.id, id))
      .returning();
    return updatedEvaluation;
  }

  // Game operations
  async getGames(): Promise<Game[]> {
    return await db.select().from(games).orderBy(desc(games.date));
  }

  async getGame(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  async updateGame(id: number, game: Partial<InsertGame>): Promise<Game> {
    const [updatedGame] = await db
      .update(games)
      .set({ ...game, updatedAt: new Date() })
      .where(eq(games.id, id))
      .returning();
    return updatedGame;
  }

  async deleteGame(id: number): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Excluir dependências primeiro
        await tx.delete(gameEvaluations).where(eq(gameEvaluations.gameId, id));
        
        // Excluir o jogo
        await tx.delete(games).where(eq(games.id, id));
      });
    } catch (error) {
      console.error(`Erro ao excluir jogo ${id}:`, error);
      throw new Error(`Falha ao excluir jogo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Get tournament matches for a specific club (only matches where this club's teams are participating)
  async getClubTournamentMatches(clubId: number, seasonId: number): Promise<any[]> {
    try {
      // Get the club info to find the actual club name
      const club = await db.select().from(clubs).where(eq(clubs.id, clubId)).limit(1);
      const clubName = club.length > 0 ? club[0].name : '';
      
      // Find tournament teams that actually represent this club (by team name matching club name or short name)
      const actualClubTeams = await db
        .select()
        .from(tournamentTeams)
        .where(
          and(
            eq(tournamentTeams.clubId, clubId),
            eq(tournamentTeams.seasonId, seasonId),
            or(
              eq(tournamentTeams.teamName, clubName),
              eq(tournamentTeams.teamName, club[0]?.shortName || ''),
              // Also check for common variations of ESSUBE
              eq(tournamentTeams.teamName, 'ESSUBE')
            )
          )
        );

      if (actualClubTeams.length === 0) {
        return [];
      }

      const actualClubTeamIds = actualClubTeams.map(team => team.id);

      // Get all tournament matches where at least one of our actual teams is participating
      const matches = await db
        .select({
          id: tournamentMatches.id,
          tournamentId: tournamentMatches.tournamentId,
          groupId: tournamentMatches.groupId,
          phase: tournamentMatches.phase,
          round: tournamentMatches.round,
          team1Id: tournamentMatches.team1Id,
          team2Id: tournamentMatches.team2Id,
          scheduledDate: tournamentMatches.scheduledDate,
          venue: tournamentMatches.venue,
          team1Score: tournamentMatches.team1Score,
          team2Score: tournamentMatches.team2Score,
          status: tournamentMatches.status,
          winnerId: tournamentMatches.winnerId,
          notes: tournamentMatches.notes,
          createdAt: tournamentMatches.createdAt,
          updatedAt: tournamentMatches.updatedAt,
        })
        .from(tournamentMatches)
        .where(
          or(
            inArray(tournamentMatches.team1Id, actualClubTeamIds),
            inArray(tournamentMatches.team2Id, actualClubTeamIds)
          )
        );

      // Get team details for each match
      const enrichedMatches = [];
      for (const match of matches) {
        const team1 = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, match.team1Id)).limit(1);
        const team2 = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, match.team2Id)).limit(1);
        const tournament = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).limit(1);

        if (team1.length > 0 && team2.length > 0 && tournament.length > 0) {
          // Determine if this club is playing at home (team1) or away (team2)
          const isHome = actualClubTeamIds.includes(match.team1Id);
          const enrichedMatch = {
            ...match,
            tournamentName: tournament[0].name,
            homeTeamName: team1[0].teamName,
            awayTeamName: team2[0].teamName,
            homeTeamCategory: team1[0].category,
            awayTeamCategory: team2[0].category,
            isHome,
            category: isHome ? team1[0].category : team2[0].category
          };
          
          enrichedMatches.push(enrichedMatch);
        }
      }

      return enrichedMatches.sort((a, b) => {
        if (!a.scheduledDate && !b.scheduledDate) return 0;
        if (!a.scheduledDate) return 1;
        if (!b.scheduledDate) return -1;
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      });
    } catch (error) {
      console.error('Error fetching club tournament matches:', error);
      return [];
    }
  }

  // Tournament operations
  async getTournaments(): Promise<Tournament[]> {
    return await db.select().from(tournaments).orderBy(desc(tournaments.startDate));
  }

  async getTournament(id: number): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament;
  }

  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const [newTournament] = await db.insert(tournaments).values(tournament).returning();
    return newTournament;
  }

  async updateTournament(id: number, tournament: Partial<InsertTournament>): Promise<Tournament> {
    const [updatedTournament] = await db
      .update(tournaments)
      .set({ ...tournament, updatedAt: new Date() })
      .where(eq(tournaments.id, id))
      .returning();
    return updatedTournament;
  }

  async deleteTournament(id: number): Promise<void> {
    // Delete in correct order to respect foreign key constraints
    // 1. Delete tournament matches first
    await db.delete(tournamentMatches).where(eq(tournamentMatches.tournamentId, id));
    
    // 2. Delete tournament teams
    await db.delete(tournamentTeams).where(eq(tournamentTeams.tournamentId, id));
    
    // 3. Delete tournament groups
    await db.delete(tournamentGroups).where(eq(tournamentGroups.tournamentId, id));
    
    // 4. Finally delete the tournament
    await db.delete(tournaments).where(eq(tournaments.id, id));
  }

  // Game evaluation operations
  async getGameEvaluations(gameId?: number, athleteId?: number, evaluatedBy?: string): Promise<GameEvaluation[]> {
    let query = db.select().from(gameEvaluations);
    
    const conditions = [];
    if (gameId) conditions.push(eq(gameEvaluations.gameId, gameId));
    if (athleteId) conditions.push(eq(gameEvaluations.athleteId, athleteId));
    if (evaluatedBy) conditions.push(eq(gameEvaluations.evaluatedBy, evaluatedBy));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(gameEvaluations.createdAt));
  }

  async getGameEvaluationsByEvaluator(gameId: number): Promise<any> {
    // Get all evaluations for a game grouped by evaluator
    const evaluations = await db.select().from(gameEvaluations)
      .where(eq(gameEvaluations.gameId, gameId))
      .orderBy(gameEvaluations.evaluatedBy, gameEvaluations.athleteId);
    
    // Get evaluator details
    const evaluatorIds = [...new Set(evaluations.map(e => e.evaluatedBy))];
    const evaluators = await db.select().from(users)
      .where(inArray(users.id, evaluatorIds));
    
    // Group evaluations by evaluator
    const grouped = evaluations.reduce((acc: any, evaluation) => {
      if (!acc[evaluation.evaluatedBy]) {
        const evaluator = evaluators.find(e => e.id === evaluation.evaluatedBy);
        acc[evaluation.evaluatedBy] = {
          evaluator: {
            id: evaluator?.id,
            name: `${evaluator?.firstName || ''} ${evaluator?.lastName || ''}`.trim(),
            role: evaluator?.role
          },
          evaluations: []
        };
      }
      acc[evaluation.evaluatedBy].evaluations.push(evaluation);
      return acc;
    }, {});
    
    return grouped;
  }

  async getGameEvaluationsAverage(gameId: number): Promise<any[]> {
    // Calculate average ratings for each athlete across all evaluators
    const evaluations = await db.select().from(gameEvaluations)
      .where(eq(gameEvaluations.gameId, gameId));
    
    // Group by athlete and calculate averages
    const athleteAverages = evaluations.reduce((acc: any, evaluation) => {
      if (!acc[evaluation.athleteId]) {
        acc[evaluation.athleteId] = {
          athleteId: evaluation.athleteId,
          count: 0,
          totalOverall: 0,
          totalTechnical: 0,
          totalPhysical: 0,
          totalTactical: 0,
          totalMental: 0,
          evaluations: []
        };
      }
      
      acc[evaluation.athleteId].count++;
      acc[evaluation.athleteId].totalOverall += Number(evaluation.overallRating || 0);
      acc[evaluation.athleteId].totalTechnical += Number(evaluation.technicalRating || 0);
      acc[evaluation.athleteId].totalPhysical += Number(evaluation.physicalRating || 0);
      acc[evaluation.athleteId].totalTactical += Number(evaluation.tacticalRating || 0);
      acc[evaluation.athleteId].totalMental += Number(evaluation.mentalRating || 0);
      acc[evaluation.athleteId].evaluations.push(evaluation);
      
      return acc;
    }, {});
    
    // Calculate averages
    return Object.values(athleteAverages).map((item: any) => ({
      athleteId: item.athleteId,
      evaluationCount: item.count,
      avgOverallRating: (item.totalOverall / item.count).toFixed(1),
      avgTechnicalRating: (item.totalTechnical / item.count).toFixed(1),
      avgPhysicalRating: (item.totalPhysical / item.count).toFixed(1),
      avgTacticalRating: (item.totalTactical / item.count).toFixed(1),
      avgMentalRating: (item.totalMental / item.count).toFixed(1),
      evaluations: item.evaluations
    }));
  }

  async createGameEvaluation(evaluation: InsertGameEvaluation): Promise<GameEvaluation> {
    const [newEvaluation] = await db.insert(gameEvaluations).values(evaluation).returning();
    return newEvaluation;
  }

  async updateGameEvaluation(id: number, evaluation: Partial<InsertGameEvaluation>): Promise<GameEvaluation> {
    const [updatedEvaluation] = await db
      .update(gameEvaluations)
      .set(evaluation)
      .where(eq(gameEvaluations.id, id))
      .returning();
    return updatedEvaluation;
  }

  // Wellness operations
  async getWellnessEntries(athleteId?: number, startDate?: string, endDate?: string): Promise<WellnessEntry[]> {
    let query = db.select().from(wellnessEntries);
    
    const conditions = [];
    if (athleteId) conditions.push(eq(wellnessEntries.athleteId, athleteId));
    if (startDate) conditions.push(gte(wellnessEntries.date, startDate));
    if (endDate) conditions.push(lte(wellnessEntries.date, endDate));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(wellnessEntries.date));
  }

  async createWellnessEntry(entry: InsertWellnessEntry): Promise<WellnessEntry> {
    const [newEntry] = await db.insert(wellnessEntries).values(entry).returning();
    return newEntry;
  }

  async updateWellnessEntry(id: number, entry: Partial<InsertWellnessEntry>): Promise<WellnessEntry> {
    const [updatedEntry] = await db
      .update(wellnessEntries)
      .set(entry)
      .where(eq(wellnessEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteWellnessEntry(id: number): Promise<void> {
    await db.delete(wellnessEntries).where(eq(wellnessEntries.id, id));
  }

  // RPE operations
  async getRpeEntries(athleteId?: number, trainingSessionId?: number, startDate?: string, endDate?: string): Promise<RpeEntry[]> {
    let query = db.select({
      id: rpeEntries.id,
      athleteId: rpeEntries.athleteId,
      trainingSessionId: rpeEntries.trainingSessionId,
      rpeValue: rpeEntries.rpeValue,
      sessionDuration: rpeEntries.sessionDuration,
      loadScore: rpeEntries.loadScore,
      muscularFatigue: rpeEntries.muscularFatigue,
      perceivedExertion: rpeEntries.perceivedExertion,
      overallFeeling: rpeEntries.overallFeeling,
      comments: rpeEntries.comments,
      notes: rpeEntries.notes,
      submittedAt: rpeEntries.submittedAt,
      createdAt: rpeEntries.createdAt,
      athlete: {
        id: athletes.id,
        firstName: athletes.firstName,
        lastName: athletes.lastName,
      },
      trainingSession: {
        id: trainingSessions.id,
        title: trainingSessions.title,
        date: trainingSessions.date,
      }
    })
    .from(rpeEntries)
    .leftJoin(athletes, eq(rpeEntries.athleteId, athletes.id))
    .leftJoin(trainingSessions, eq(rpeEntries.trainingSessionId, trainingSessions.id));

    const conditions = [];
    
    if (athleteId) {
      conditions.push(eq(rpeEntries.athleteId, athleteId));
    }
    
    if (trainingSessionId) {
      conditions.push(eq(rpeEntries.trainingSessionId, trainingSessionId));
    }
    
    if (startDate) {
      conditions.push(gte(trainingSessions.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(trainingSessions.date, endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(rpeEntries.submittedAt));
  }

  async createRpeEntry(entry: InsertRpeEntry): Promise<RpeEntry> {
    try {
      const [newEntry] = await db.insert(rpeEntries).values(entry).returning();
      return newEntry;
    } catch (error: any) {
      console.error("Database error creating RPE entry:", error);
      // Retry once on connection error
      if (error.code === '57P01' || error.message?.includes('terminating connection')) {
        console.log("Retrying RPE entry creation after connection error");
        await new Promise(resolve => setTimeout(resolve, 1000));
        const [newEntry] = await db.insert(rpeEntries).values(entry).returning();
        return newEntry;
      }
      throw error;
    }
  }

  async updateRpeEntry(id: number, entry: Partial<InsertRpeEntry>): Promise<RpeEntry> {
    const [updatedEntry] = await db
      .update(rpeEntries)
      .set(entry)
      .where(eq(rpeEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteRpeEntry(id: number): Promise<void> {
    await db.delete(rpeEntries).where(eq(rpeEntries.id, id));
  }

  // Medical operations
  async getMedicalRecords(athleteId?: number): Promise<MedicalRecord[]> {
    let query = db.select().from(medicalRecords);
    
    if (athleteId) {
      query = query.where(eq(medicalRecords.athleteId, athleteId));
    }
    
    return await query.orderBy(desc(medicalRecords.date));
  }

  async getMedicalRecord(id: number): Promise<MedicalRecord | undefined> {
    const [record] = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id));
    return record;
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    try {
      const [newRecord] = await db.insert(medicalRecords).values(record).returning();
      return newRecord;
    } catch (error: any) {
      console.error("Database error creating medical record:", error);
      // Retry once on connection error
      if (error.code === '57P01' || error.message?.includes('terminating connection')) {
        console.log("Retrying medical record creation after connection error");
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        const [newRecord] = await db.insert(medicalRecords).values(record).returning();
        return newRecord;
      }
      throw error;
    }
  }

  async updateMedicalRecord(id: number, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord> {
    const [updatedRecord] = await db
      .update(medicalRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(medicalRecords.id, id))
      .returning();
    return updatedRecord;
  }

  async deleteMedicalRecord(id: number): Promise<void> {
    await db.delete(medicalRecords).where(eq(medicalRecords.id, id));
  }

  // Financial operations
  async getFinancialTransactions(startDate?: string, endDate?: string): Promise<FinancialTransaction[]> {
    let query = db.select().from(financialTransactions);
    
    const conditions = [];
    if (startDate) conditions.push(gte(financialTransactions.date, startDate));
    if (endDate) conditions.push(lte(financialTransactions.date, endDate));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(financialTransactions.date));
  }

  async getFinancialTransaction(id: number): Promise<FinancialTransaction | undefined> {
    const [transaction] = await db.select().from(financialTransactions).where(eq(financialTransactions.id, id));
    return transaction;
  }

  async createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    const [newTransaction] = await db.insert(financialTransactions).values(transaction).returning();
    return newTransaction;
  }

  async updateFinancialTransaction(id: number, transaction: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction> {
    const [updatedTransaction] = await db
      .update(financialTransactions)
      .set({ ...transaction, updatedAt: new Date() })
      .where(eq(financialTransactions.id, id))
      .returning();
    return updatedTransaction;
  }

  async deleteFinancialTransaction(id: number): Promise<void> {
    await db.delete(financialTransactions).where(eq(financialTransactions.id, id));
  }

  // Store Product operations
  async getStoreProducts(): Promise<StoreProduct[]> {
    return await db.select().from(storeProducts).orderBy(desc(storeProducts.createdAt));
  }

  async getStoreProduct(id: number): Promise<StoreProduct | undefined> {
    const [product] = await db.select().from(storeProducts).where(eq(storeProducts.id, id));
    return product;
  }

  async createStoreProduct(product: InsertStoreProduct): Promise<StoreProduct> {
    const [newProduct] = await db.insert(storeProducts).values(product).returning();
    return newProduct;
  }

  async updateStoreProduct(id: number, product: Partial<InsertStoreProduct>): Promise<StoreProduct> {
    const [updatedProduct] = await db
      .update(storeProducts)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(storeProducts.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteStoreProduct(id: number): Promise<void> {
    await db.delete(storeProducts).where(eq(storeProducts.id, id));
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<any> {
    const [totalAthletes] = await db.select({ count: count() }).from(athletes);
    const [activeAthletes] = await db.select({ count: count() }).from(athletes).where(eq(athletes.status, 'active'));
    const [injuredAthletes] = await db.select({ count: count() }).from(athletes).where(eq(athletes.status, 'injured'));
    
    const today = formatLocalDate(new Date());
    const weekAgo = formatLocalDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    const [weeklyTraining] = await db
      .select({ count: count() })
      .from(trainingSessions)
      .where(and(
        gte(trainingSessions.date, weekAgo),
        lte(trainingSessions.date, today)
      ));

    const nextWeek = formatLocalDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const [upcomingGames] = await db
      .select({ count: count() })
      .from(games)
      .where(and(
        gte(games.date, today),
        lte(games.date, nextWeek)
      ));

    const [monthlyIncome] = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)` 
      })
      .from(financialTransactions)
      .where(gte(financialTransactions.date, formatLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))));

    return {
      totalAthletes: totalAthletes.count,
      activeAthletes: activeAthletes.count,
      injuredAthletes: injuredAthletes.count,
      weeklyTraining: weeklyTraining.count,
      upcomingGames: upcomingGames.count,
      monthlyIncome: monthlyIncome.total || 0,
    };
  }

  // System configuration operations
  async getSystemConfig(key?: string): Promise<SystemConfig[]> {
    if (key) {
      return await db.select().from(systemConfig).where(eq(systemConfig.key, key));
    }
    return await db.select().from(systemConfig);
  }

  async getConfigValue(key: string): Promise<any> {
    const [config] = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
    return config?.value || null;
  }

  async setConfigValue(key: string, value: any, description?: string): Promise<SystemConfig> {
    const [existing] = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
    
    if (existing) {
      const [updated] = await db
        .update(systemConfig)
        .set({ 
          value, 
          description: description || existing.description,
          updatedAt: new Date() 
        })
        .where(eq(systemConfig.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(systemConfig)
        .values({ key, value, description })
        .returning();
      return created;
    }
  }

  async deleteConfigValue(key: string): Promise<void> {
    await db.delete(systemConfig).where(eq(systemConfig.key, key));
  }

  // Tournament Teams operations
  async getTournamentTeams(tournamentId: number): Promise<TournamentTeam[]> {
    return await db.select().from(tournamentTeams)
      .where(eq(tournamentTeams.tournamentId, tournamentId))
      .orderBy(tournamentTeams.registrationDate);
  }

  async getTournamentTeam(id: number): Promise<TournamentTeam | undefined> {
    const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, id));
    return team;
  }

  async createTournamentTeam(team: InsertTournamentTeam): Promise<TournamentTeam> {
    const [created] = await db.insert(tournamentTeams).values(team).returning();
    return created;
  }

  async getTournamentTeamByNameAndCategory(tournamentId: number, teamName: string, category: string): Promise<TournamentTeam | undefined> {
    const [team] = await db.select().from(tournamentTeams)
      .where(
        and(
          eq(tournamentTeams.tournamentId, tournamentId),
          eq(tournamentTeams.teamName, teamName),
          eq(tournamentTeams.category, category)
        )
      );
    return team;
  }

  async updateTournamentTeam(id: number, updateData: Partial<InsertTournamentTeam>): Promise<TournamentTeam> {
    // Filter out undefined values and non-updatable fields
    const cleanData: any = {};
    const allowedFields = ['category', 'groupId', 'status', 'contactEmail', 'contactPhone', 'badgeUrl'];
    
    Object.keys(updateData).forEach(key => {
      const value = updateData[key as keyof InsertTournamentTeam];
      if (value !== undefined && value !== null && (allowedFields.includes(key) || value !== '')) {
        cleanData[key] = value;
      }
    });
    
    if (Object.keys(cleanData).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    const [updated] = await db
      .update(tournamentTeams)
      .set(cleanData)
      .where(eq(tournamentTeams.id, id))
      .returning();
    return updated;
  }

  async updateTeamStats(teamId: number, stats: {
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }): Promise<TournamentTeam> {
    const [updated] = await db
      .update(tournamentTeams)
      .set(stats)
      .where(eq(tournamentTeams.id, teamId))
      .returning();
    return updated;
  }

  // Tournament Groups operations
  async getTournamentGroups(tournamentId: number): Promise<TournamentGroup[]> {
    return await db.select().from(tournamentGroups)
      .where(eq(tournamentGroups.tournamentId, tournamentId))
      .orderBy(tournamentGroups.groupName);
  }

  async createTournamentGroup(tournamentId: number, groupName: string): Promise<TournamentGroup> {
    const [created] = await db.insert(tournamentGroups).values({
      tournamentId,
      groupName,
      phase: "group"
    }).returning();
    return created;
  }

  async clearTournamentGroups(tournamentId: number): Promise<void> {
    // First, unassign all teams from groups
    await db.update(tournamentTeams)
      .set({ groupId: null })
      .where(eq(tournamentTeams.tournamentId, tournamentId));
    
    // Then delete all groups for this tournament
    await db.delete(tournamentGroups).where(eq(tournamentGroups.tournamentId, tournamentId));
  }

  async deleteTournamentGroup(groupId: number): Promise<void> {
    // First, unassign all teams from this specific group
    await db.update(tournamentTeams)
      .set({ groupId: null })
      .where(eq(tournamentTeams.groupId, groupId));
    
    // Then delete the group
    await db.delete(tournamentGroups).where(eq(tournamentGroups.id, groupId));
  }

  async advanceTeamsToFinals(tournamentId: number, teamsPerGroup: number, finalGroupName: string): Promise<TournamentGroup> {
    // Get all groups for this tournament (excluding any existing final groups)
    const groups = await db.select().from(tournamentGroups)
      .where(and(
        eq(tournamentGroups.tournamentId, tournamentId),
        eq(tournamentGroups.phase, "group")
      ));

    if (groups.length === 0) {
      throw new Error("No groups found for this tournament");
    }

    // Create the finals group
    const [finalGroup] = await db.insert(tournamentGroups).values({
      tournamentId,
      groupName: finalGroupName,
      phase: "final"
    }).returning();

    // Get teams from each group and rank them
    for (const group of groups) {
      const teams = await this.getTournamentTeams(tournamentId);
      const groupTeams = teams.filter(t => t.groupId === group.id);
      
      if (groupTeams.length === 0) continue;

      // Get matches for this group to calculate rankings
      const matches = await this.getTournamentMatches(tournamentId);
      const groupMatches = matches.filter(m => m.groupId === group.id);

      // Calculate team stats and rankings
      const teamsWithStats = groupTeams.map(team => {
        const teamMatches = groupMatches.filter(m => 
          (m.team1Id === team.id || m.team2Id === team.id) && m.status === 'completed'
        );

        let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0, points = 0;

        teamMatches.forEach(match => {
          const isTeam1 = match.team1Id === team.id;
          const teamScore = isTeam1 ? match.team1Score : match.team2Score;
          const opponentScore = isTeam1 ? match.team2Score : match.team1Score;

          goalsFor += teamScore || 0;
          goalsAgainst += opponentScore || 0;

          if (teamScore! > opponentScore!) {
            wins++;
            points += 3; // Assuming 3 points for a win
          } else if (teamScore === opponentScore) {
            draws++;
            points += 1; // 1 point for a draw
          } else {
            losses++;
            // 0 points for a loss
          }
        });

        return {
          ...team,
          stats: {
            matchesPlayed: teamMatches.length,
            wins,
            draws,
            losses,
            goalsFor,
            goalsAgainst,
            goalDifference: goalsFor - goalsAgainst,
            points
          }
        };
      });

      // Sort teams by points, then goal difference, then goals for
      const rankedTeams = teamsWithStats.sort((a, b) => {
        if (b.stats.points !== a.stats.points) {
          return b.stats.points - a.stats.points;
        }
        if (b.stats.goalDifference !== a.stats.goalDifference) {
          return b.stats.goalDifference - a.stats.goalDifference;
        }
        return b.stats.goalsFor - a.stats.goalsFor;
      });

      // Advance top teams to finals
      const teamsToAdvance = rankedTeams.slice(0, teamsPerGroup);
      for (const team of teamsToAdvance) {
        await this.assignTeamToGroup(team.id, finalGroup.id);
      }
    }

    return finalGroup;
  }

  async generateTournamentGroups(tournamentId: number, groupSize: number): Promise<TournamentGroup[]> {
    // Get all registered teams
    const teams = await this.getTournamentTeams(tournamentId);
    if (teams.length === 0) {
      throw new Error("No teams registered for this tournament");
    }

    // Delete existing groups for this tournament
    await db.delete(tournamentGroups).where(eq(tournamentGroups.tournamentId, tournamentId));

    // Calculate number of groups needed
    const numGroups = Math.ceil(teams.length / groupSize);
    const groups: TournamentGroup[] = [];

    // Create groups
    for (let i = 0; i < numGroups; i++) {
      const groupName = String.fromCharCode(65 + i); // A, B, C, etc.
      const [group] = await db.insert(tournamentGroups).values({
        tournamentId,
        groupName: `Group ${groupName}`,
        phase: "group"
      }).returning();
      groups.push(group);
    }

    // Distribute teams across groups (round-robin style)
    for (let i = 0; i < teams.length; i++) {
      const groupIndex = i % numGroups;
      await this.updateTournamentTeam(teams[i].id, { groupId: groups[groupIndex].id });
    }

    return groups;
  }

  // Mineiro Sub 15/17 specific methods
  async generateMineiroGroups(tournamentId: number, numberOfGroups: number = 4): Promise<TournamentGroup[]> {
    // Clear existing groups
    await db.delete(tournamentGroups).where(eq(tournamentGroups.tournamentId, tournamentId));

    const groups: TournamentGroup[] = [];

    // Generate group letters based on numberOfGroups
    const groupLetters = [];
    for (let i = 0; i < numberOfGroups; i++) {
      groupLetters.push(String.fromCharCode(65 + i)); // A, B, C, D, E, F...
    }

    // Create Sub-15 groups (Phase 1)
    for (const groupLetter of groupLetters) {
      const [group] = await db.insert(tournamentGroups).values({
        tournamentId,
        groupName: `Grupo ${groupLetter} Sub-15`,
        phase: "group",
        category: "Sub-15"
      }).returning();
      groups.push(group);
    }

    // Create Sub-17 groups (Phase 1)
    for (const groupLetter of groupLetters) {
      const [group] = await db.insert(tournamentGroups).values({
        tournamentId,
        groupName: `Grupo ${groupLetter} Sub-17`,
        phase: "group", 
        category: "Sub-17"
      }).returning();
      groups.push(group);
    }

    return groups;
  }

  async createMineiroSecondPhaseGroup(tournamentId: number, groupName: string): Promise<TournamentGroup> {
    const [group] = await db.insert(tournamentGroups).values({
      tournamentId,
      groupName,
      phase: "final",
      category: "Combined"
    }).returning();
    return group;
  }

  async advanceTeamsToFinalPhase(tournamentId: number): Promise<{ advancedTeams: number; finalGroupId: number }> {
    // Get tournament settings to determine how many teams advance
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const teamsAdvancingPerGroup = tournament.teamsAdvancingPerGroup || 4;

    // Get all groups for this tournament (excluding final phase)
    const allGroups = await db.select().from(tournamentGroups)
      .where(eq(tournamentGroups.tournamentId, tournamentId));
    
    const groups = allGroups.filter(g => g.phase !== "final");

    // Create or get the final groups (Sub-15 and Sub-17)
    let finalGroupSub15 = await db.select().from(tournamentGroups)
      .where(and(
        eq(tournamentGroups.tournamentId, tournamentId),
        eq(tournamentGroups.phase, "final"),
        eq(tournamentGroups.category, "Sub-15")
      ));

    let finalGroupSub17 = await db.select().from(tournamentGroups)
      .where(and(
        eq(tournamentGroups.tournamentId, tournamentId),
        eq(tournamentGroups.phase, "final"),
        eq(tournamentGroups.category, "Sub-17")
      ));

    if (finalGroupSub15.length === 0) {
      const [newFinalGroupSub15] = await db.insert(tournamentGroups).values({
        tournamentId,
        groupName: "Final Group Stage Sub-15",
        phase: "final",
        category: "Sub-15"
      }).returning();
      finalGroupSub15 = [newFinalGroupSub15];
    }

    if (finalGroupSub17.length === 0) {
      const [newFinalGroupSub17] = await db.insert(tournamentGroups).values({
        tournamentId,
        groupName: "Final Group Stage Sub-17",
        phase: "final",
        category: "Sub-17"
      }).returning();
      finalGroupSub17 = [newFinalGroupSub17];
    }

    const finalGroupSub15Id = finalGroupSub15[0].id;
    const finalGroupSub17Id = finalGroupSub17[0].id;
    let totalAdvanced = 0;

    // For Mineiro Sub 15/17 format, we need to calculate overall combined rankings across all groups
    if (tournament.format === 'mineiro_sub_15_17') {
      // Get all teams from all groups (excluding final phase)
      const allTeams = await db.select().from(tournamentTeams)
        .where(and(
          eq(tournamentTeams.tournamentId, tournamentId),
          inArray(tournamentTeams.groupId, groups.map(g => g.id))
        ));

      // Extract main group names and group teams by them
      const mainGroups = new Set();
      groups.forEach(group => {
        const match = group.groupName.match(/^(Grupo [A-Z])/);
        if (match) {
          mainGroups.add(match[1]);
        }
      });

      // Group teams by main group and club name
      const groupedData: { [groupName: string]: any[] } = {};
      
      // Initialize main groups
      Array.from(mainGroups).forEach((groupName: any) => {
        groupedData[groupName] = [];
      });

      // Group teams by club within each main group
      allTeams.forEach(team => {
        if (team.groupId) {
          const group = groups.find(g => g.id === team.groupId);
          if (group) {
            const match = group.groupName.match(/^(Grupo [A-Z])/);
            if (match) {
              const mainGroupName = match[1];
              
              // Find existing club entry or create new one
              let clubEntry = groupedData[mainGroupName].find(entry => entry.clubName === team.teamName);
              if (!clubEntry) {
                clubEntry = {
                  clubName: team.teamName,
                  badgeUrl: team.badgeUrl,
                  teams: [],
                  points: 0,
                  played: 0,
                  wins: 0,
                  draws: 0,
                  losses: 0,
                  goalsFor: 0,
                  goalsAgainst: 0
                };
                groupedData[mainGroupName].push(clubEntry);
              }
              
              // Add team to club entry
              clubEntry.teams.push(team);
              clubEntry.points += team.points || 0;
              clubEntry.played += team.matchesPlayed || 0;
              clubEntry.wins += team.wins || 0;
              clubEntry.draws += team.draws || 0;
              clubEntry.losses += team.losses || 0;
              clubEntry.goalsFor += team.goalsFor || 0;
              clubEntry.goalsAgainst += team.goalsAgainst || 0;
            }
          }
        }
      });

      // Process each main group separately to advance top teams from each group
      // teamsAdvancingPerGroup represents number of TEAMS to advance from each group
      const teamsToAdvancePerGroup = teamsAdvancingPerGroup;
      
      for (const groupName of Object.keys(groupedData)) {
        // Filter clubs with both categories and sort by combined ranking
        const clubsInGroup = groupedData[groupName]
          .filter(club => {
            const hasSub15 = club.teams.some((t: any) => t.category === 'sub-15');
            const hasSub17 = club.teams.some((t: any) => t.category === 'sub-17');
            return hasSub15 && hasSub17;
          })
          .map(club => ({
            ...club,
            goalDifference: club.goalsFor - club.goalsAgainst
          }))
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
          });

        // Create a flattened list of individual teams with their club ranking
        const individualTeams: any[] = [];
        for (const clubData of clubsInGroup) {
          for (const team of clubData.teams) {
            individualTeams.push({
              ...team,
              clubRanking: clubsInGroup.indexOf(clubData) + 1,
              clubPoints: clubData.points,
              clubGoalDifference: clubData.goalsFor - clubData.goalsAgainst
            });
          }
        }
        
        // Sort individual teams by club ranking first, then by individual performance
        individualTeams.sort((a, b) => {
          // First by club ranking (lower is better)
          if (a.clubRanking !== b.clubRanking) {
            return a.clubRanking - b.clubRanking;
          }
          // Then by individual team points
          if (a.points !== b.points) {
            return b.points - a.points;
          }
          // Then by individual team goal difference
          return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
        });
        
        // Advance top teams from this group
        const topTeamsFromGroup = individualTeams.slice(0, teamsToAdvancePerGroup);
        
        for (const team of topTeamsFromGroup) {
          // Assign to appropriate final group based on category
          const targetGroupId = team.category === 'sub-15' ? finalGroupSub15Id : finalGroupSub17Id;
          
          await db.insert(tournamentTeams).values({
            tournamentId: team.tournamentId,
            teamName: team.teamName,
            category: team.category,
            badgeUrl: team.badgeUrl,
            contactEmail: team.contactEmail,
            contactPhone: team.contactPhone,
            registrationDate: team.registrationDate,
            status: team.status,
            groupId: targetGroupId,
            seed: team.seed,
            // Reset all statistics for final phase
            matchesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0
          });
          totalAdvanced++;
        }
      }
    } else {
      // For other formats, use the original per-group logic
      for (const group of groups) {
        // Get all teams in this group
        const teamsInGroup = await db.select().from(tournamentTeams)
          .where(eq(tournamentTeams.groupId, group.id));

        // Sort teams by ranking and advance top ones
        teamsInGroup.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          const aDiff = (a.goalsFor || 0) - (a.goalsAgainst || 0);
          const bDiff = (b.goalsFor || 0) - (b.goalsAgainst || 0);
          if (bDiff !== aDiff) return bDiff - aDiff;
          return (b.goalsFor || 0) - (a.goalsFor || 0);
        });

        const topTeams = teamsInGroup.slice(0, teamsAdvancingPerGroup);
        
        for (const team of topTeams) {
          // Copy team to final group with reset stats instead of moving
          await db.insert(tournamentTeams).values({
            tournamentId: team.tournamentId,
            teamName: team.teamName,
            category: team.category,
            badgeUrl: team.badgeUrl,
            contactEmail: team.contactEmail,
            contactPhone: team.contactPhone,
            registrationDate: team.registrationDate,
            status: team.status,
            groupId: finalGroupId,
            seed: team.seed,
            // Reset all statistics for final phase
            matchesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0
          });
          totalAdvanced++;
        }
      }
    }

    return { advancedTeams: totalAdvanced, finalGroupSub15Id, finalGroupSub17Id };
  }

  async getFinalPhaseTeams(tournamentId: number): Promise<TournamentTeam[]> {
    const finalGroups = await db.select().from(tournamentGroups)
      .where(and(
        eq(tournamentGroups.tournamentId, tournamentId),
        eq(tournamentGroups.phase, "final")
      ));

    if (finalGroups.length === 0) {
      return [];
    }

    const finalGroupIds = finalGroups.map(g => g.id);
    return await db.select().from(tournamentTeams)
      .where(inArray(tournamentTeams.groupId, finalGroupIds))
      .orderBy(
        desc(tournamentTeams.points),
        desc(sql`${tournamentTeams.goalsFor} - ${tournamentTeams.goalsAgainst}`),
        desc(tournamentTeams.goalsFor)
      );
  }

  async resetFinalPhase(tournamentId: number): Promise<void> {
    // Get all final groups
    const finalGroups = await db.select().from(tournamentGroups)
      .where(and(
        eq(tournamentGroups.tournamentId, tournamentId),
        eq(tournamentGroups.phase, "final")
      ));

    if (finalGroups.length === 0) {
      return;
    }

    const finalGroupIds = finalGroups.map(g => g.id);

    // Delete all teams in all final groups (they are copies, not moved teams)
    await db.delete(tournamentTeams)
      .where(inArray(tournamentTeams.groupId, finalGroupIds));

    // Delete all final groups
    await db.delete(tournamentGroups)
      .where(inArray(tournamentGroups.id, finalGroupIds));
  }

  async getMineiroGroupsByCategory(tournamentId: number, category: string): Promise<TournamentGroup[]> {
    return await db.select().from(tournamentGroups)
      .where(and(
        eq(tournamentGroups.tournamentId, tournamentId),
        eq(tournamentGroups.category, category)
      ))
      .orderBy(tournamentGroups.groupName);
  }

  async getMineiroRanking(tournamentId: number): Promise<any> {
    // Get all teams with their stats and group information
    const teams = await db.select({
      id: tournamentTeams.id,
      tournamentId: tournamentTeams.tournamentId,
      teamName: tournamentTeams.teamName,
      category: tournamentTeams.category,
      badgeUrl: tournamentTeams.badgeUrl,
      contactEmail: tournamentTeams.contactEmail,
      contactPhone: tournamentTeams.contactPhone,
      registrationDate: tournamentTeams.registrationDate,
      status: tournamentTeams.status,
      groupId: tournamentTeams.groupId,
      seed: tournamentTeams.seed,
      matchesPlayed: tournamentTeams.matchesPlayed,
      wins: tournamentTeams.wins,
      draws: tournamentTeams.draws,
      losses: tournamentTeams.losses,
      goalsFor: tournamentTeams.goalsFor,
      goalsAgainst: tournamentTeams.goalsAgainst,
      points: tournamentTeams.points,
      createdAt: tournamentTeams.createdAt,
      groupName: tournamentGroups.groupName
    })
    .from(tournamentTeams)
    .leftJoin(tournamentGroups, eq(tournamentTeams.groupId, tournamentGroups.id))
    .where(eq(tournamentTeams.tournamentId, tournamentId))
    .orderBy(
      desc(tournamentTeams.points),
      desc(sql`${tournamentTeams.goalsFor} - ${tournamentTeams.goalsAgainst}`),
      desc(tournamentTeams.goalsFor)
    );

    // Group by category for separate rankings
    const sub15Teams = teams.filter(team => team.category === 'Sub-15');
    const sub17Teams = teams.filter(team => team.category === 'Sub-17');

    // Group Sub-15 teams by group
    const sub15ByGroup = sub15Teams.reduce((acc, team) => {
      const groupName = team.groupName || 'No Group';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(team);
      return acc;
    }, {} as Record<string, any[]>);

    // Group Sub-17 teams by group
    const sub17ByGroup = sub17Teams.reduce((acc, team) => {
      const groupName = team.groupName || 'No Group';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(team);
      return acc;
    }, {} as Record<string, any[]>);

    // Create club combined rankings by aggregating stats from both categories per club
    const clubStats = new Map<string, any>();
    
    teams.forEach(team => {
      const clubName = team.teamName;
      if (!clubStats.has(clubName)) {
        clubStats.set(clubName, {
          clubName,
          sub15Team: null,
          sub17Team: null,
          totalPoints: 0,
          totalGoalsFor: 0,
          totalGoalsAgainst: 0,
          totalMatches: 0,
          totalWins: 0,
          totalDraws: 0,
          totalLosses: 0
        });
      }
      
      const club = clubStats.get(clubName);
      if (team.category === 'Sub-15') {
        club.sub15Team = team;
      } else if (team.category === 'Sub-17') {
        club.sub17Team = team;
      }
      
      club.totalPoints += team.points || 0;
      club.totalGoalsFor += team.goalsFor || 0;
      club.totalGoalsAgainst += team.goalsAgainst || 0;
      club.totalMatches += team.matchesPlayed || 0;
      club.totalWins += team.wins || 0;
      club.totalDraws += team.draws || 0;
      club.totalLosses += team.losses || 0;
    });

    const clubCombinedRanking = Array.from(clubStats.values())
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        const aDiff = a.totalGoalsFor - a.totalGoalsAgainst;
        const bDiff = b.totalGoalsFor - b.totalGoalsAgainst;
        if (bDiff !== aDiff) return bDiff - aDiff;
        return b.totalGoalsFor - a.totalGoalsFor;
      });

    // Create club combined rankings by group (separate Sub-15 and Sub-17 groups)
    const clubCombinedByGroup = new Map<string, any[]>();
    
    // Process Sub-15 groups
    Object.entries(sub15ByGroup).forEach(([groupName, teams]) => {
      const clubsInGroup = new Map<string, any>();
      
      teams.forEach(team => {
        const clubName = team.teamName;
        if (!clubsInGroup.has(clubName)) {
          clubsInGroup.set(clubName, {
            clubName,
            groupName: `${groupName} (Sub-15)`,
            category: 'Sub-15',
            sub15Team: null,
            sub17Team: null,
            totalPoints: 0,
            totalGoalsFor: 0,
            totalGoalsAgainst: 0,
            totalMatches: 0,
            totalWins: 0,
            totalDraws: 0,
            totalLosses: 0
          });
        }
        const club = clubsInGroup.get(clubName);
        club.sub15Team = team;
        club.totalPoints += team.points || 0;
        club.totalGoalsFor += team.goalsFor || 0;
        club.totalGoalsAgainst += team.goalsAgainst || 0;
        club.totalMatches += team.matchesPlayed || 0;
        club.totalWins += team.wins || 0;
        club.totalDraws += team.draws || 0;
        club.totalLosses += team.losses || 0;
      });

      // Sort clubs in this Sub-15 group
      const groupRanking = Array.from(clubsInGroup.values())
        .sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          const aDiff = a.totalGoalsFor - a.totalGoalsAgainst;
          const bDiff = b.totalGoalsFor - b.totalGoalsAgainst;
          if (bDiff !== aDiff) return bDiff - aDiff;
          return b.totalGoalsFor - a.totalGoalsFor;
        });

      clubCombinedByGroup.set(`${groupName} (Sub-15)`, groupRanking);
    });

    // Process Sub-17 groups
    Object.entries(sub17ByGroup).forEach(([groupName, teams]) => {
      const clubsInGroup = new Map<string, any>();
      
      teams.forEach(team => {
        const clubName = team.teamName;
        if (!clubsInGroup.has(clubName)) {
          clubsInGroup.set(clubName, {
            clubName,
            groupName: `${groupName} (Sub-17)`,
            category: 'Sub-17',
            sub15Team: null,
            sub17Team: null,
            totalPoints: 0,
            totalGoalsFor: 0,
            totalGoalsAgainst: 0,
            totalMatches: 0,
            totalWins: 0,
            totalDraws: 0,
            totalLosses: 0
          });
        }
        const club = clubsInGroup.get(clubName);
        club.sub17Team = team;
        club.totalPoints += team.points || 0;
        club.totalGoalsFor += team.goalsFor || 0;
        club.totalGoalsAgainst += team.goalsAgainst || 0;
        club.totalMatches += team.matchesPlayed || 0;
        club.totalWins += team.wins || 0;
        club.totalDraws += team.draws || 0;
        club.totalLosses += team.losses || 0;
      });

      // Sort clubs in this Sub-17 group
      const groupRanking = Array.from(clubsInGroup.values())
        .sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          const aDiff = a.totalGoalsFor - a.totalGoalsAgainst;
          const bDiff = b.totalGoalsFor - b.totalGoalsAgainst;
          if (bDiff !== aDiff) return bDiff - aDiff;
          return b.totalGoalsFor - a.totalGoalsFor;
        });

      clubCombinedByGroup.set(`${groupName} (Sub-17)`, groupRanking);
    });

    return {
      sub15: sub15Teams,
      sub17: sub17Teams,
      sub15ByGroup,
      sub17ByGroup,
      combined: teams,
      clubCombined: clubCombinedRanking,
      clubCombinedByGroup: Object.fromEntries(clubCombinedByGroup)
    };
  }

  async assignTeamToGroup(teamId: number, groupId: number | null): Promise<TournamentTeam> {
    const [updatedTeam] = await db.update(tournamentTeams)
      .set({ groupId })
      .where(eq(tournamentTeams.id, teamId))
      .returning();
    
    if (!updatedTeam) {
      throw new Error('Team not found');
    }
    
    return updatedTeam;
  }

  async createTournamentGroups(tournamentId: number, groupsPerCategory: number): Promise<TournamentGroup[]> {
    // Get tournament and teams
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    const teams = await this.getTournamentTeams(tournamentId);
    
    // Determine all categories in this tournament
    let categories: string[] = [];
    
    if (tournament.jointCategories && tournament.additionalCategories && tournament.additionalCategories.length > 0) {
      // Joint categories: main category + additional categories
      categories = [tournament.category, ...tournament.additionalCategories].filter(Boolean) as string[];
    } else {
      // Single category tournament
      categories = tournament.category ? [tournament.category] : [];
    }
    
    if (categories.length === 0) {
      throw new Error('No categories found for tournament');
    }

    const createdGroups: TournamentGroup[] = [];
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    // For joint categories, we need to mirror groups across categories
    // i.e., if Club X is in Grupo A for Sub-15, it should also be in Grupo A for Sub-17
    if (tournament.jointCategories && categories.length > 1) {
      // First, create all groups for all categories
      for (const category of categories) {
        for (let i = 0; i < groupsPerCategory; i++) {
          const groupData: InsertTournamentGroup = {
            tournamentId,
            groupName: `Grupo ${groupNames[i]} ${category}`,
            category: category,
            phase: 'group',
            advancementRules: 'Top teams advance to final phase'
          };

          const [group] = await db.insert(tournamentGroups).values(groupData).returning();
          createdGroups.push(group);
        }
      }

      // Now distribute teams by CLUB (mirror across categories)
      // Use clubId for grouping when available (most reliable)
      // Fallback to extracted club name only if clubId is not available
      const extractClubName = (teamName: string): string => {
        return teamName
          .replace(/\s*(Sub[\s-]?\d+\s*(Feminino|Masculino)?\s*[A-Z]?|Veterano|Adulto)\s*$/i, '')
          .trim()
          .toLowerCase();
      };

      // Group teams by club - use clubId if available, otherwise use extracted name
      const clubTeamMap = new Map<string, TournamentTeam[]>();
      
      for (const team of teams) {
        // Prefer clubId (numeric, reliable) over name parsing
        const clubKey = team.clubId 
          ? `club_${team.clubId}` 
          : `name_${extractClubName(team.teamName)}`;
        
        if (!clubTeamMap.has(clubKey)) {
          clubTeamMap.set(clubKey, []);
        }
        clubTeamMap.get(clubKey)!.push(team);
      }

      // Distribute clubs across groups (all teams from same club go to same group letter)
      const clubKeys = Array.from(clubTeamMap.keys());
      for (let i = 0; i < clubKeys.length; i++) {
        const groupIndex = i % groupsPerCategory;  // Which group letter (A, B, C, etc.)
        const clubTeams = clubTeamMap.get(clubKeys[i])!;
        
        // Assign each category's team from this club to the corresponding group
        for (const team of clubTeams) {
          const categoryGroups = createdGroups.filter(g => g.category === team.category);
          const targetGroup = categoryGroups[groupIndex];
          if (targetGroup) {
            await this.assignTeamToGroup(team.id, targetGroup.id);
          }
        }
      }
    } else {
      // Single category tournament - standard distribution
      for (const category of categories) {
        const categoryTeams = teams.filter(team => team.category === category);
        
        if (categoryTeams.length > 0) {
          // Create groups for this category
          for (let i = 0; i < groupsPerCategory; i++) {
            const groupData: InsertTournamentGroup = {
              tournamentId,
              groupName: `Grupo ${groupNames[i]}`,
              category: category,
              phase: 'group',
              advancementRules: 'Top teams advance to final phase'
            };

            const [group] = await db.insert(tournamentGroups).values(groupData).returning();
            createdGroups.push(group);
          }

          // Distribute teams across groups for this category
          const categoryGroups = createdGroups.filter(g => g.category === category);
          for (let i = 0; i < categoryTeams.length; i++) {
            const groupIndex = i % categoryGroups.length;
            await this.assignTeamToGroup(categoryTeams[i].id, categoryGroups[groupIndex].id);
          }
        }
      }
    }

    return createdGroups;
  }

  async createTournamentGroupsManual(tournamentId: number, groupsData: { id: string; name: string; clubIds: number[] }[]): Promise<TournamentGroup[]> {
    // Get tournament and teams
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    const teams = await this.getTournamentTeams(tournamentId);
    
    // Determine all categories in this tournament
    let categories: string[] = [];
    
    if (tournament.jointCategories && tournament.additionalCategories && tournament.additionalCategories.length > 0) {
      // Joint categories: main category + additional categories
      categories = [tournament.category, ...tournament.additionalCategories].filter(Boolean) as string[];
    } else {
      // Single category tournament
      categories = tournament.category ? [tournament.category] : [];
    }
    
    if (categories.length === 0) {
      throw new Error('No categories found for tournament');
    }

    const createdGroups: TournamentGroup[] = [];

    // Create groups for each category (mirrored structure)
    for (const category of categories) {
      for (const groupData of groupsData) {
        const groupDb: InsertTournamentGroup = {
          tournamentId,
          groupName: `${groupData.name} ${category}`,
          category: category,
          phase: 'group',
          advancementRules: 'Top teams advance to final phase'
        };

        const [group] = await db.insert(tournamentGroups).values(groupDb).returning();
        createdGroups.push(group);

        // Assign teams from the specified clubs to this group
        for (const clubId of groupData.clubIds) {
          // Find all teams from this club in this category
          // Use adversaryTeamId for imported adversaries, fallback to clubId for internal teams
          const clubTeams = teams.filter(t => {
            const teamClubKey = t.adversaryTeamId || t.clubId;
            return teamClubKey === clubId && t.category === category;
          });
          
          // Assign each team to this group
          for (const team of clubTeams) {
            await this.assignTeamToGroup(team.id, group.id);
          }
        }
      }
    }

    return createdGroups;
  }

  // Tournament Matches operations
  async getTournamentMatches(tournamentId: number): Promise<TournamentMatch[]> {
    return await db.select().from(tournamentMatches)
      .where(eq(tournamentMatches.tournamentId, tournamentId))
      .orderBy(tournamentMatches.phase, tournamentMatches.round);
  }

  async getTournamentMatch(id: number): Promise<TournamentMatch | undefined> {
    const [match] = await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, id));
    return match;
  }

  async createTournamentMatch(match: InsertTournamentMatch): Promise<TournamentMatch> {
    const [created] = await db.insert(tournamentMatches).values(match).returning();
    return created;
  }

  async updateTournamentMatch(id: number, match: Partial<InsertTournamentMatch>): Promise<TournamentMatch> {
    // If scores are being updated, handle winner calculation and statistics
    if (match.team1Score !== undefined && match.team2Score !== undefined) {
      let winnerId = null;
      if (match.team1Score > match.team2Score) {
        const existingMatch = await this.getTournamentMatch(id);
        winnerId = existingMatch?.team1Id;
      } else if (match.team2Score > match.team1Score) {
        const existingMatch = await this.getTournamentMatch(id);
        winnerId = existingMatch?.team2Id;
      }
      
      match.winnerId = winnerId;
      match.status = 'completed';
    }

    const [updated] = await db
      .update(tournamentMatches)
      .set({ ...match, updatedAt: new Date() })
      .where(eq(tournamentMatches.id, id))
      .returning();

    // Update team statistics if scores were provided
    if (match.team1Score !== undefined && match.team2Score !== undefined) {
      await this.updateTeamStatisticsFromMatch(updated);
    }

    return updated;
  }

  async deleteTournamentMatch(id: number): Promise<void> {
    await db.delete(tournamentMatches).where(eq(tournamentMatches.id, id));
  }

  async deleteTournamentTeam(id: number): Promise<void> {
    await db.delete(tournamentTeams).where(eq(tournamentTeams.id, id));
  }

  async updateEssubeTeamBadges(clubId: number, seasonId: number, badgeUrl: string): Promise<void> {
    // Ensure badge URL has the proper path structure for the badges subdirectory
    let fullBadgeUrl = badgeUrl;
    if (!badgeUrl.startsWith('/uploads/')) {
      // If it's just a filename, add the full badges path
      if (!badgeUrl.includes('/')) {
        fullBadgeUrl = `/uploads/badges/${badgeUrl}`;
      } else {
        fullBadgeUrl = `/uploads/${badgeUrl}`;
      }
    }
    
    // Get club info to identify internal teams
    const club = await this.getClub(clubId);
    if (!club) return;
    
    // Get all tournament teams for this club
    const allTournamentTeams = await db
      .select()
      .from(tournamentTeams)
      .where(eq(tournamentTeams.clubId, clubId));
    
    // Get all adversary teams for this club and season to match badges
    const adversaries = await db
      .select()
      .from(adversaryTeams)
      .where(
        and(
          eq(adversaryTeams.clubId, clubId),
          eq(adversaryTeams.seasonId, seasonId)
        )
      );
    
    // Create a map of adversary names to badges for quick lookup
    const adversaryBadgeMap = new Map<string, string | null>();
    adversaries.forEach(adv => {
      adversaryBadgeMap.set(adv.name.toLowerCase().trim(), adv.badgeUrl);
    });
    
    // Update each tournament team individually based on whether it's internal or adversary
    for (const team of allTournamentTeams) {
      // Remove category suffix to get base name
      const baseTeamName = team.teamName.replace(/\s*(Sub-\d+|Sub-\d+\/\d+)\s*/g, '').trim();
      const isInternalTeam = baseTeamName === club.name || 
                            baseTeamName === club.shortName ||
                            baseTeamName === 'ESSUBE' ||
                            baseTeamName === 'ESU';
      
      let newBadgeUrl = null;
      
      if (isInternalTeam) {
        // Internal team: use club badge
        newBadgeUrl = fullBadgeUrl;
      } else {
        // Adversary team: try to find badge in adversary_teams table
        const adversaryBadge = adversaryBadgeMap.get(baseTeamName.toLowerCase());
        if (adversaryBadge) {
          newBadgeUrl = adversaryBadge;
        }
        // If no adversary badge found, leave as null (will show initials placeholder)
      }
      
      // Update the team
      await db
        .update(tournamentTeams)
        .set({ badgeUrl: newBadgeUrl })
        .where(eq(tournamentTeams.id, team.id));
    }

    // Update regular teams by clubId (internal teams only)
    await db
      .update(teams)
      .set({ teamPhoto: fullBadgeUrl })
      .where(eq(teams.clubId, clubId));
  }

  async updateMatchResult(id: number, team1Score: number, team2Score: number): Promise<TournamentMatch> {
    // Determine winner
    let winnerId = null;
    if (team1Score > team2Score) {
      const match = await this.getTournamentMatch(id);
      winnerId = match?.team1Id;
    } else if (team2Score > team1Score) {
      const match = await this.getTournamentMatch(id);
      winnerId = match?.team2Id;
    }

    const [updated] = await db
      .update(tournamentMatches)
      .set({
        team1Score,
        team2Score,
        winnerId,
        status: "completed"
      })
      .where(eq(tournamentMatches.id, id))
      .returning();

    // Update team statistics
    await this.updateTeamStatisticsFromMatch(updated);

    return updated;
  }

  private async updateTeamStatisticsFromMatch(match: TournamentMatch): Promise<void> {
    if (match.team1Score === null || match.team2Score === null) return;

    const tournament = await this.getTournament(match.tournamentId);
    if (!tournament) return;

    const team1 = await this.getTournamentTeam(match.team1Id);
    const team2 = await this.getTournamentTeam(match.team2Id);
    if (!team1 || !team2) return;

    // Calculate results for team1
    let team1Result: 'win' | 'draw' | 'loss';
    let team2Result: 'win' | 'draw' | 'loss';

    if (match.team1Score > match.team2Score) {
      team1Result = 'win';
      team2Result = 'loss';
    } else if (match.team1Score < match.team2Score) {
      team1Result = 'loss';
      team2Result = 'win';
    } else {
      team1Result = 'draw';
      team2Result = 'draw';
    }

    // Update team1 stats
    const team1Points = team1Result === 'win' ? (tournament.pointsWin || 3) :
                       team1Result === 'draw' ? (tournament.pointsDraw || 1) :
                       (tournament.pointsLoss || 0);

    await this.updateTeamStats(team1.id, {
      matchesPlayed: team1.matchesPlayed + 1,
      wins: team1.wins + (team1Result === 'win' ? 1 : 0),
      draws: team1.draws + (team1Result === 'draw' ? 1 : 0),
      losses: team1.losses + (team1Result === 'loss' ? 1 : 0),
      goalsFor: team1.goalsFor + match.team1Score,
      goalsAgainst: team1.goalsAgainst + match.team2Score,
      points: team1.points + team1Points
    });

    // Update team2 stats
    const team2Points = team2Result === 'win' ? (tournament.pointsWin || 3) :
                       team2Result === 'draw' ? (tournament.pointsDraw || 1) :
                       (tournament.pointsLoss || 0);

    await this.updateTeamStats(team2.id, {
      matchesPlayed: team2.matchesPlayed + 1,
      wins: team2.wins + (team2Result === 'win' ? 1 : 0),
      draws: team2.draws + (team2Result === 'draw' ? 1 : 0),
      losses: team2.losses + (team2Result === 'loss' ? 1 : 0),
      goalsFor: team2.goalsFor + match.team2Score,
      goalsAgainst: team2.goalsAgainst + match.team1Score,
      points: team2.points + team2Points
    });
  }

  async generateTournamentMatches(tournamentId: number): Promise<TournamentMatch[]> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const teams = await this.getTournamentTeams(tournamentId);
    const groups = await this.getTournamentGroups(tournamentId);

    // Delete existing matches
    await db.delete(tournamentMatches).where(eq(tournamentMatches.tournamentId, tournamentId));

    const matches: TournamentMatch[] = [];

    if (tournament.format === "groups" || tournament.format === "groups_final") {
      // Generate group stage matches
      for (const group of groups) {
        const groupTeams = teams.filter(t => t.groupId === group.id);
        const groupMatches = this.generateRoundRobinMatches(groupTeams, tournamentId, group.id);
        
        for (const match of groupMatches) {
          const [created] = await db.insert(tournamentMatches).values(match).returning();
          matches.push(created);
        }
      }
    } else if (tournament.format === "knockout") {
      // Generate knockout bracket
      const knockoutMatches = this.generateKnockoutMatches(teams, tournamentId);
      
      for (const match of knockoutMatches) {
        const [created] = await db.insert(tournamentMatches).values(match).returning();
        matches.push(created);
      }
    } else if (tournament.format === "round_robin") {
      // Generate round robin for all teams
      const roundRobinMatches = this.generateRoundRobinMatches(teams, tournamentId);
      
      for (const match of roundRobinMatches) {
        const [created] = await db.insert(tournamentMatches).values(match).returning();
        matches.push(created);
      }
    }

    return matches;
  }

  private generateRoundRobinMatches(teams: TournamentTeam[], tournamentId: number, groupId?: number): InsertTournamentMatch[] {
    const matches: InsertTournamentMatch[] = [];
    
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          tournamentId,
          groupId,
          phase: "group",
          team1Id: teams[i].id,
          team2Id: teams[j].id,
          status: "scheduled"
        });
      }
    }
    
    return matches;
  }

  private generateKnockoutMatches(teams: TournamentTeam[], tournamentId: number): InsertTournamentMatch[] {
    const matches: InsertTournamentMatch[] = [];
    
    // For simplicity, generate first round matches
    // In a real implementation, you'd handle seeding and bracket structure
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        matches.push({
          tournamentId,
          phase: "round_1",
          round: 1,
          team1Id: teams[i].id,
          team2Id: teams[i + 1].id,
          status: "scheduled",
          bracketPosition: `R1_${Math.floor(i / 2) + 1}`
        });
      }
    }
    
    return matches;
  }

  // Tournament Details with relations
  async getTournamentWithDetails(tournamentId: number): Promise<{
    tournament: Tournament;
    teams: TournamentTeam[];
    groups: TournamentGroup[];
    matches: TournamentMatch[];
  } | null> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return null;

    const [teams, groups, matches] = await Promise.all([
      this.getTournamentTeams(tournamentId),
      this.getTournamentGroups(tournamentId),
      this.getTournamentMatches(tournamentId)
    ]);

    return {
      tournament,
      teams,
      groups,
      matches
    };
  }

  // Pending registration operations
  async getPendingRegistrations(): Promise<PendingRegistration[]> {
    return await db.select().from(pendingRegistrations).orderBy(desc(pendingRegistrations.createdAt));
  }

  async getPendingRegistration(id: number): Promise<PendingRegistration | undefined> {
    const [registration] = await db.select().from(pendingRegistrations).where(eq(pendingRegistrations.id, id));
    return registration;
  }

  async getPendingRegistrationByEmail(email: string): Promise<PendingRegistration | undefined> {
    const [registration] = await db.select().from(pendingRegistrations).where(eq(pendingRegistrations.email, email)).limit(1);
    return registration;
  }

  async createPendingRegistration(registration: InsertPendingRegistration): Promise<PendingRegistration> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(registration.password, 10);
    
    const [created] = await db
      .insert(pendingRegistrations)
      .values({
        ...registration,
        password: hashedPassword
      })
      .returning();
    return created;
  }

  // Calculate athlete category based on birth date and season year
  // Returns an array with the primary category - allows for multiple categories to be added manually
  calculateAthleteCategory(dateOfBirth: string, seasonYear: number): string[] {
    const birthDate = new Date(dateOfBirth);
    const birthYear = birthDate.getFullYear();
    const age = seasonYear - birthYear;

    // Standard Brazilian football categories - return as array to support multiple categories
    if (age <= 11) return ['Sub-11'];
    if (age <= 13) return ['Sub-13'];
    if (age <= 15) return ['Sub-15'];
    if (age <= 17) return ['Sub-17'];
    if (age <= 20) return ['Sub-20'];
    return ['Profissional'];
  }

  async approvePendingRegistration(id: number, reviewedBy: string, notes?: string, teamId?: number): Promise<User> {
    const registration = await this.getPendingRegistration(id);
    if (!registration) {
      throw new Error("Registration not found");
    }

    // Check if user already exists with this email
    const existingUser = await db.select().from(users).where(eq(users.email, registration.email)).limit(1);
    if (existingUser.length > 0) {
      throw new Error("Um usuário com este email já existe no sistema");
    }

    // Create user account
    const userData: UpsertUser = {
      id: `pending_${registration.id}_${Date.now()}`, // Temporary ID for new users
      email: registration.email,
      firstName: registration.firstName,
      lastName: registration.lastName,
      password: registration.password, // Use the already hashed password from registration
      role: registration.userType === "familiar" ? "familiar" : "atleta",
      status: "approved",
      phone: registration.phone,
      relationship: registration.relationship,
      athleteId: registration.familyAthleteId,
      approvedAt: new Date(),
      approvedBy: reviewedBy,
    };

    // If it's an athlete registration, create athlete record first
    if (registration.userType === "atleta") {
      // Require teamId for athlete approvals
      if (!teamId) {
        throw new Error("teamId é obrigatório para aprovação de atleta");
      }

      // Get the team to retrieve its clubId
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error("Time selecionado não encontrado");
      }

      const athleteData = registration.athleteInfo as any || {};
      
      // Clean up date fields to prevent database errors
      const cleanedAthleteData = { ...athleteData };
      
      // Use dateOfBirth from registration if available, otherwise use placeholder
      let dateOfBirth = registration.dateOfBirth || cleanedAthleteData.dateOfBirth;
      if (!dateOfBirth || dateOfBirth === '') {
        dateOfBirth = '2000-01-01'; // Placeholder date
      }
      cleanedAthleteData.dateOfBirth = dateOfBirth;
      
      // Get the season to extract the year for category calculation
      const season = await this.getSeason(team.seasonId);
      if (!season) {
        throw new Error("Temporada não encontrada");
      }
      
      // Calculate category based on birth date and season year
      const seasonYear = new Date(season.startDate).getFullYear();
      cleanedAthleteData.category = this.calculateAthleteCategory(dateOfBirth, seasonYear);
      
      if (!cleanedAthleteData.dominantFoot) {
        cleanedAthleteData.dominantFoot = 'right'; // Default dominant foot
      }
      
      if (cleanedAthleteData.contractStart === '') {
        cleanedAthleteData.contractStart = null;
      }
      if (cleanedAthleteData.contractEnd === '') {
        cleanedAthleteData.contractEnd = null;
      }
      
      const athlete = await this.createAthlete({
        firstName: registration.firstName,
        lastName: registration.lastName,
        clubId: team.clubId, // Use clubId from the selected team
        seasonId: team.seasonId, // Use seasonId from the selected team
        teamId, // Assign athlete to selected team
        ...cleanedAthleteData
      });
      userData.athleteId = athlete.id;
    }

    const user = await this.upsertUser(userData);

    // Update registration status
    await db
      .update(pendingRegistrations)
      .set({
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy,
        notes,
      })
      .where(eq(pendingRegistrations.id, id));

    return user;
  }

  async rejectPendingRegistration(id: number, reviewedBy: string, notes?: string): Promise<PendingRegistration> {
    const [updated] = await db
      .update(pendingRegistrations)
      .set({
        status: "rejected",
        reviewedAt: new Date(),
        reviewedBy,
        notes,
      })
      .where(eq(pendingRegistrations.id, id))
      .returning();
    return updated;
  }

  async deletePendingRegistration(id: number): Promise<void> {
    await db.delete(pendingRegistrations).where(eq(pendingRegistrations.id, id));
  }

  // Adversary teams operations
  async getAdversaryTeams(clubId: number, seasonId: number): Promise<AdversaryTeam[]> {
    return await db.select().from(adversaryTeams)
      .where(and(
        eq(adversaryTeams.clubId, clubId),
        eq(adversaryTeams.seasonId, seasonId),
        eq(adversaryTeams.isActive, true)
      ))
      .orderBy(adversaryTeams.name);
  }

  async getAdversaryTeam(id: number): Promise<AdversaryTeam | undefined> {
    const [team] = await db.select().from(adversaryTeams).where(eq(adversaryTeams.id, id));
    return team;
  }

  async createAdversaryTeam(team: InsertAdversaryTeam): Promise<AdversaryTeam> {
    const [created] = await db.insert(adversaryTeams).values(team).returning();
    return created;
  }

  async updateAdversaryTeam(id: number, team: Partial<InsertAdversaryTeam>): Promise<AdversaryTeam> {
    const [updated] = await db
      .update(adversaryTeams)
      .set({ ...team, updatedAt: new Date() })
      .where(eq(adversaryTeams.id, id))
      .returning();
    return updated;
  }

  async deleteAdversaryTeam(id: number): Promise<void> {
    await db.delete(adversaryTeams).where(eq(adversaryTeams.id, id));
  }

  // Stadium operations
  async getStadiums(clubId: number, seasonId: number): Promise<Stadium[]> {
    return await db.select().from(stadiums)
      .where(and(
        eq(stadiums.clubId, clubId),
        eq(stadiums.seasonId, seasonId),
        eq(stadiums.isActive, true)
      ))
      .orderBy(stadiums.name);
  }

  async getStadium(id: number): Promise<Stadium | undefined> {
    const [stadium] = await db.select().from(stadiums).where(eq(stadiums.id, id));
    return stadium;
  }

  async createStadium(stadium: InsertStadium): Promise<Stadium> {
    const [created] = await db.insert(stadiums).values(stadium).returning();
    return created;
  }

  async updateStadium(id: number, stadium: Partial<InsertStadium>): Promise<Stadium> {
    const [updated] = await db
      .update(stadiums)
      .set({ ...stadium, updatedAt: new Date() })
      .where(eq(stadiums.id, id))
      .returning();
      
    if (!updated) {
      throw new Error(`Stadium with id ${id} not found`);
    }
    
    return updated;
  }

  async deleteStadium(id: number): Promise<void> {
    await db.delete(stadiums).where(eq(stadiums.id, id));
  }

  // Tournament team operations
  async addTournamentTeam(teamData: {
    tournamentId: number;
    teamName: string;
    category: string;
    badgeUrl?: string | null;
    clubId: number;
    seasonId: number;
  }): Promise<TournamentTeam> {
    const [created] = await db.insert(tournamentTeams).values({
      tournamentId: teamData.tournamentId,
      teamName: teamData.teamName,
      category: teamData.category,
      badgeUrl: teamData.badgeUrl,
      clubId: teamData.clubId,
      seasonId: teamData.seasonId,
    }).returning();
    return created;
  }

  async addTournamentTeamFromAdversary(tournamentId: number, adversaryTeamId: number, category: string): Promise<TournamentTeam> {
    // Get adversary team data
    const adversaryTeam = await this.getAdversaryTeam(adversaryTeamId);
    if (!adversaryTeam) {
      throw new Error('Adversary team not found');
    }

    // If no badge URL, get from club
    let badgeUrl = adversaryTeam.badgeUrl;
    if (!badgeUrl && adversaryTeam.clubId) {
      const club = await this.getClub(adversaryTeam.clubId);
      if (club) {
        badgeUrl = club.logo || club.badge || null;
      }
    }

    // Create tournament team based on adversary data
    const [created] = await db.insert(tournamentTeams).values({
      tournamentId,
      teamName: adversaryTeam.name,
      category,
      badgeUrl,
      clubId: adversaryTeam.clubId,
      seasonId: adversaryTeam.seasonId,
      contactEmail: adversaryTeam.contactEmail,
      contactPhone: adversaryTeam.contactPhone,
      adversaryTeamId, // Store reference to adversary team for grouping
    }).returning();
    
    return created;
  }

  async addBulkTournamentTeamsFromAdversaries(tournamentId: number, adversaryTeamIds: number[]): Promise<TournamentTeam[]> {
    // Get tournament to determine categories
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    // Determine all categories in this tournament
    let categories: string[] = [];
    
    if (tournament.jointCategories && tournament.additionalCategories && tournament.additionalCategories.length > 0) {
      // Joint categories: main category + additional categories
      categories = [tournament.category, ...tournament.additionalCategories].filter(Boolean) as string[];
    } else {
      // Single category tournament
      categories = tournament.category ? [tournament.category] : [];
    }
    
    if (categories.length === 0) {
      throw new Error('No categories found for tournament');
    }
    
    const createdTeams: TournamentTeam[] = [];
    
    // For each adversary team (club), create teams in all tournament categories
    for (const adversaryTeamId of adversaryTeamIds) {
      for (const category of categories) {
        const team = await this.addTournamentTeamFromAdversary(tournamentId, adversaryTeamId, category);
        createdTeams.push(team);
      }
    }
    
    return createdTeams;
  }

  // Game call-up operations
  async getGameCallUps(gameId: number): Promise<GameCallUp[]> {
    return await db.select().from(gameCallUps).where(eq(gameCallUps.gameId, gameId));
  }

  async createGameCallUp(callUp: InsertGameCallUp): Promise<GameCallUp> {
    const [created] = await db.insert(gameCallUps).values(callUp).returning();
    return created;
  }

  async updateGameCallUp(id: number, updates: Partial<InsertGameCallUp>): Promise<GameCallUp> {
    const [updated] = await db
      .update(gameCallUps)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gameCallUps.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Game call-up with id ${id} not found`);
    }
    
    return updated;
  }

  async deleteGameCallUp(id: number): Promise<void> {
    await db.delete(gameCallUps).where(eq(gameCallUps.id, id));
  }

  // Game lineup operations
  async getGameLineup(gameId: number): Promise<GameLineup[]> {
    return await db.select().from(gameLineups).where(eq(gameLineups.gameId, gameId));
  }

  async createGameLineup(lineup: InsertGameLineup): Promise<GameLineup> {
    const [created] = await db.insert(gameLineups).values(lineup).returning();
    return created;
  }

  async deleteGameLineup(id: number): Promise<void> {
    await db.delete(gameLineups).where(eq(gameLineups.id, id));
  }

  // Game formation operations
  async getGameFormation(gameId: number): Promise<GameFormation | undefined> {
    const [formation] = await db.select().from(gameFormations).where(eq(gameFormations.gameId, gameId));
    return formation;
  }

  async createGameFormation(formation: InsertGameFormation): Promise<GameFormation> {
    // First check if formation exists for this game
    const existing = await this.getGameFormation(formation.gameId);
    
    if (existing) {
      // Update existing formation
      const [updated] = await db
        .update(gameFormations)
        .set({ ...formation, updatedAt: new Date() })
        .where(eq(gameFormations.gameId, formation.gameId))
        .returning();
      return updated;
    } else {
      // Create new formation
      const [created] = await db.insert(gameFormations).values(formation).returning();
      return created;
    }
  }

  // Player game analysis operations
  async getPlayerGameAnalysis(gameId: number): Promise<PlayerGameAnalysis[]> {
    return await db.select().from(playerGameAnalysis).where(eq(playerGameAnalysis.gameId, gameId));
  }

  async createPlayerGameAnalysis(analysis: InsertPlayerGameAnalysis): Promise<PlayerGameAnalysis> {
    // First check if analysis exists for this game and athlete
    const [existing] = await db
      .select()
      .from(playerGameAnalysis)
      .where(and(
        eq(playerGameAnalysis.gameId, analysis.gameId),
        eq(playerGameAnalysis.athleteId, analysis.athleteId)
      ));
    
    if (existing) {
      // Update existing analysis
      const [updated] = await db
        .update(playerGameAnalysis)
        .set({ ...analysis, updatedAt: new Date() })
        .where(and(
          eq(playerGameAnalysis.gameId, analysis.gameId),
          eq(playerGameAnalysis.athleteId, analysis.athleteId)
        ))
        .returning();
      return updated;
    } else {
      // Create new analysis
      const [created] = await db.insert(playerGameAnalysis).values(analysis).returning();
      return created;
    }
  }

  // Team game analysis operations
  async getTeamGameAnalysis(gameId: number): Promise<TeamGameAnalysis | undefined> {
    const [analysis] = await db.select().from(teamGameAnalysis).where(eq(teamGameAnalysis.gameId, gameId));
    return analysis;
  }

  async createTeamGameAnalysis(analysis: InsertTeamGameAnalysis): Promise<TeamGameAnalysis> {
    // First check if analysis exists for this game
    const existing = await this.getTeamGameAnalysis(analysis.gameId);
    
    if (existing) {
      // Update existing analysis
      const [updated] = await db
        .update(teamGameAnalysis)
        .set({ ...analysis, updatedAt: new Date() })
        .where(eq(teamGameAnalysis.gameId, analysis.gameId))
        .returning();
      return updated;
    } else {
      // Create new analysis
      const [created] = await db.insert(teamGameAnalysis).values(analysis).returning();
      return created;
    }
  }

  // Fitness and injury risk operations
  async getFitnessAlerts(clubId: number, seasonId: number): Promise<any[]> {
    return await db
      .select({
        id: fitnessAlerts.id,
        athleteId: fitnessAlerts.athleteId,
        alertType: fitnessAlerts.alertType,
        severity: fitnessAlerts.severity,
        title: fitnessAlerts.title,
        message: fitnessAlerts.message,
        status: fitnessAlerts.status,
        createdAt: fitnessAlerts.createdAt,
        athleteName: sql<string>`CONCAT(${athletes.firstName}, ' ', ${athletes.lastName})`.as('athleteName'),
      })
      .from(fitnessAlerts)
      .leftJoin(athletes, eq(fitnessAlerts.athleteId, athletes.id))
      .where(
        and(
          eq(fitnessAlerts.clubId, clubId),
          eq(fitnessAlerts.seasonId, seasonId),
          eq(fitnessAlerts.status, 'active')
        )
      )
      .orderBy(desc(fitnessAlerts.createdAt));
  }

  async acknowledgeFitnessAlert(alertId: number, userId: string): Promise<any> {
    const [updated] = await db
      .update(fitnessAlerts)
      .set({
        status: 'acknowledged',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(fitnessAlerts.id, alertId))
      .returning();
    return updated;
  }

  async getFitnessDashboard(clubId: number, seasonId: number): Promise<any> {
    // Get athletes with their latest risk assessments
    const athletesWithRisk = await db
      .select({
        id: athletes.id,
        name: sql<string>`CONCAT(${athletes.firstName}, ' ', ${athletes.lastName})`.as('name'),
        position: athletes.position,
        overallRiskScore: injuryRiskAssessments.overallRiskScore,
        riskLevel: injuryRiskAssessments.riskLevel,
        readinessScore: playerFitnessMetrics.readinessScore,
        recoveryStatus: playerFitnessMetrics.recoveryStatus,
        assessmentDate: injuryRiskAssessments.date
      })
      .from(athletes)
      .leftJoin(
        injuryRiskAssessments,
        and(
          eq(athletes.id, injuryRiskAssessments.athleteId),
          eq(injuryRiskAssessments.date, sql`CURRENT_DATE`)
        )
      )
      .leftJoin(
        playerFitnessMetrics,
        and(
          eq(athletes.id, playerFitnessMetrics.athleteId),
          eq(playerFitnessMetrics.date, sql`CURRENT_DATE`)
        )
      )
      .where(
        and(
          eq(athletes.clubId, clubId),
          eq(athletes.seasonId, seasonId),
          eq(athletes.status, 'active')
        )
      )
      .orderBy(athletes.firstName);

    // Get alert statistics
    const alertStats = await db
      .select({
        total: count(),
        critical: count(sql`CASE WHEN ${fitnessAlerts.severity} = 'critical' THEN 1 END`),
        high: count(sql`CASE WHEN ${fitnessAlerts.severity} = 'high' THEN 1 END`),
        medium: count(sql`CASE WHEN ${fitnessAlerts.severity} = 'medium' THEN 1 END`)
      })
      .from(fitnessAlerts)
      .where(
        and(
          eq(fitnessAlerts.clubId, clubId),
          eq(fitnessAlerts.seasonId, seasonId),
          eq(fitnessAlerts.status, 'active')
        )
      );

    return {
      athletes: athletesWithRisk,
      alertStats: alertStats[0] || { total: 0, critical: 0, high: 0, medium: 0 }
    };
  }
}

export const storage = new DatabaseStorage();
