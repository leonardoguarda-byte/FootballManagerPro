import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
  time,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Clubs table - Multi-tenancy foundation
export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  shortName: varchar("short_name").notNull(), // Acronym or short version
  description: text("description"),
  foundedYear: integer("founded_year"),
  logo: varchar("logo"), // URL/path to club logo
  badge: varchar("badge"), // URL/path to club badge/crest
  colors: jsonb("colors"), // Primary and secondary colors
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").notNull().default("Brasil"),
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  president: varchar("president"),
  vicePresident: varchar("vice_president"),
  technicalDirector: varchar("technical_director"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Seasons table - Temporal segregation
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id),
  name: varchar("name").notNull(), // "2024", "2024/2025", etc.
  seasonType: varchar("season_type").notNull().default("calendar"), // "calendar" (Jan-Dec) or "sport" (Jul-Jun)
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(false), // Only one active season per club
  isDefault: boolean("is_default").notNull().default(false), // Default season for new data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: varchar("password"), // Hashed password for local authentication
  role: varchar("role").notNull().default("atleta"), // administrador, coordenador, comissao, medico, atleta, familia
  permissions: jsonb("permissions"), // specific permissions array
  
  // Multi-club assignment
  clubId: integer("club_id").references(() => clubs.id), // User's assigned club
  seasonId: integer("season_id").references(() => seasons.id), // User's current working season
  teamId: integer("team_id").references(() => teams.id), // User's assigned team (if applicable)
  
  isActive: boolean("is_active").notNull().default(true),
  status: varchar("status").notNull().default("approved"), // pending, approved, rejected
  athleteId: integer("athlete_id").references(() => athletes.id), // Link to athlete for family members or self
  phone: varchar("phone"),
  relationship: varchar("relationship"), // For family members: pai, mae, responsavel, etc.
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
});

// Pending user registrations table
export const pendingRegistrations = pgTable("pending_registrations", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  password: varchar("password").notNull(), // Hashed password
  phone: varchar("phone").notNull(),
  dateOfBirth: date("date_of_birth"), // Date of birth for automatic category calculation
  userType: varchar("user_type").notNull(), // atleta, familia
  relationship: varchar("relationship"), // For family: pai, mae, responsavel
  athleteInfo: jsonb("athlete_info"), // For athlete registrations
  familyAthleteId: integer("family_athlete_id").references(() => athletes.id), // For family registrations
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  notes: text("notes"),
});

// System configuration table
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: varchar("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Adversary teams management
export const adversaryTeams = pgTable("adversary_teams", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  name: varchar("name", { length: 255 }).notNull(),
  badgeUrl: varchar("badge_url", { length: 500 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Stadium management
export const stadiums = pgTable("stadiums", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  capacity: integer("capacity"),
  surface: varchar("surface", { length: 50 }), // grass, artificial, etc.
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id), // Club segregation
  seasonId: integer("season_id").notNull().references(() => seasons.id), // Season segregation
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // Professional, U20, U17, U15, etc.
  ageGroup: varchar("age_group"),
  description: text("description"),
  coachName: varchar("coach_name"),
  assistantCoachName: varchar("assistant_coach_name"),
  physicalTrainerName: varchar("physical_trainer_name"),
  goalkeeperTrainerName: varchar("goalkeeper_trainer_name"),
  teamPhoto: varchar("teamPhoto"), // URL/path to team photo
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Athletes table
export const athletes = pgTable("athletes", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id), // Club segregation
  seasonId: integer("season_id").notNull().references(() => seasons.id), // Season segregation
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  position: varchar("position"),
  teamId: integer("team_id").references(() => teams.id),
  category: text("category").array().notNull(), // Array of categories: Sub-15, Sub-17, Sub-20, etc. - allows athletes to play in multiple categories
  jerseyNumber: integer("jersey_number"),
  height: decimal("height", { precision: 5, scale: 2 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  dominantFoot: varchar("dominant_foot").notNull(), // left, right, both
  street: varchar("street"),
  number: varchar("number"),
  complement: varchar("complement"),
  neighborhood: varchar("neighborhood"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  phone: varchar("phone"),
  emergencyContact: varchar("emergency_contact"),
  emergencyPhone: varchar("emergency_phone"),
  schoolName: varchar("school_name"),
  schoolGrade: varchar("school_grade"),
  status: varchar("status").notNull().default("active"), // active, inactive, injured, suspended
  contractStart: date("contract_start"),
  contractEnd: date("contract_end"),
  notes: text("notes"),
  // Document uploads
  profilePhoto: varchar("profile_photo"), // URL/path to profile photo
  addressProof: varchar("address_proof"), // URL/path to address proof document
  identityDocument: varchar("identity_document"), // URL/path to ID document
  birthCertificate: varchar("birth_certificate"), // URL/path to birth certificate
  medicalCertificate: varchar("medical_certificate"), // URL/path to medical certificate
  electrocardiogram: varchar("electrocardiogram"), // URL/path to electrocardiogram document
  athleteBond: varchar("athlete_bond"), // URL/path to athlete bond document
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training sessions table
export const trainingSessions = pgTable("training_sessions", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id), // Club segregation
  seasonId: integer("season_id").notNull().references(() => seasons.id), // Season segregation
  title: varchar("title").notNull(),
  description: text("description"),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  location: varchar("location").notNull(),
  category: varchar("category").notNull(),
  type: varchar("type").notNull(), // physical, technical, tactical, psychological
  photos: jsonb("photos"), // array of photo URLs
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training drills library - predefined and custom drills
export const trainingDrills = pgTable("training_drills", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id), // Null for predefined drills, set for custom drills
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // physical, technical, tactical, psychological
  category: varchar("category"), // warmup, main, cooldown, specific drill type
  duration: integer("duration"), // Duration in minutes
  intensity: varchar("intensity"), // low, medium, high
  equipment: text("equipment"), // Required equipment
  instructions: text("instructions"), // Detailed instructions
  objectives: text("objectives"), // Training objectives
  variations: text("variations"), // Possible variations
  isPredefined: boolean("is_predefined").notNull().default(false), // True for system drills
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training stages - phases within a training session
export const trainingStages = pgTable("training_stages", {
  id: serial("id").primaryKey(),
  trainingSessionId: integer("training_session_id").notNull().references(() => trainingSessions.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(), // Aquecimento, Parte Principal, Volta à Calma, etc.
  description: text("description"),
  order: integer("order").notNull(), // Order of the stage in the session
  duration: integer("duration"), // Duration in minutes
  objectives: text("objectives"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training stage drills - drills assigned to a stage
export const trainingStageDrills = pgTable("training_stage_drills", {
  id: serial("id").primaryKey(),
  trainingStageId: integer("training_stage_id").notNull().references(() => trainingStages.id, { onDelete: "cascade" }),
  drillId: integer("drill_id").notNull().references(() => trainingDrills.id),
  order: integer("order").notNull(), // Order of drill in the stage
  duration: integer("duration"), // Actual duration for this drill in this session
  notes: text("notes"), // Session-specific notes for this drill
  createdAt: timestamp("created_at").defaultNow(),
});

// Training evaluations table
export const trainingEvaluations = pgTable("training_evaluations", {
  id: serial("id").primaryKey(),
  trainingSessionId: integer("training_session_id").notNull().references(() => trainingSessions.id),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  attendance: boolean("attendance").notNull().default(true),
  individualRating: integer("individual_rating"), // 1-10 scale
  technicalRating: integer("technical_rating"), // 1-10 scale
  physicalRating: integer("physical_rating"), // 1-10 scale
  tacticalRating: integer("tactical_rating"), // 1-10 scale
  mentalRating: integer("mental_rating"), // 1-10 scale
  disciplineRating: integer("discipline_rating"), // 1-10 scale
  notes: text("notes"),
  strengths: text("strengths"),
  improvements: text("improvements"),
  justification: text("justification"), // For absence justification
  evaluatedBy: varchar("evaluated_by").notNull().references(() => users.id),
  evaluationDate: timestamp("evaluation_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Games table
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id), // Club segregation
  seasonId: integer("season_id").notNull().references(() => seasons.id), // Season segregation
  opponent: varchar("opponent").notNull(),
  date: date("date").notNull(),
  time: time("time").notNull(),
  location: varchar("location").notNull(),
  category: varchar("category").notNull(),
  type: varchar("type").notNull(), // friendly, tournament, league
  isHome: boolean("is_home").notNull().default(true),
  ourScore: integer("our_score"),
  opponentScore: integer("opponent_score"),
  status: varchar("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  tournamentId: integer("tournament_id").references(() => tournaments.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Game call-ups (convocação)
export const gameCallUps = pgTable("game_call_ups", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  position: varchar("position"), // GK, DEF, MID, FWD
  callUpStatus: varchar("call_up_status").notNull().default("confirmed"), // confirmed, declined
  isCaptain: boolean("is_captain").notNull().default(false), // Capitão do time
  isStarter: boolean("is_starter").notNull().default(false), // Titular ou reserva
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Game lineups (escalação)
export const gameLineups = pgTable("game_lineups", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  position: varchar("position").notNull(), // GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST
  isStarter: boolean("is_starter").notNull().default(true), // true for starting XI, false for bench
  jerseyNumber: integer("jersey_number"),
  formationX: decimal("formation_x", { precision: 5, scale: 2 }), // X coordinate in formation (0-100)
  formationY: decimal("formation_y", { precision: 5, scale: 2 }), // Y coordinate in formation (0-100)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Game formations
export const gameFormations = pgTable("game_formations", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  formation: varchar("formation").notNull(), // 4-4-2, 4-3-3, 3-5-2, etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Player game analysis
export const playerGameAnalysis = pgTable("player_game_analysis", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  minutesPlayed: integer("minutes_played").default(0),
  goals: integer("goals").default(0),
  assists: integer("assists").default(0),
  yellowCards: integer("yellow_cards").default(0),
  redCards: integer("red_cards").default(0),
  rating: decimal("rating", { precision: 3, scale: 1 }), // 1.0 to 10.0
  ratings: jsonb("ratings"), // Detailed ratings structure { technical: {...}, physical: {...}, mental: {...}, defensive: {...} }
  strengths: text("strengths"),
  improvements: text("improvements"),
  technicalSkills: integer("technical_skills"), // 1-10
  physicalCondition: integer("physical_condition"), // 1-10
  tacticalAwareness: integer("tactical_awareness"), // 1-10
  mentalStrength: integer("mental_strength"), // 1-10
  leadership: integer("leadership"), // 1-10
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team game analysis
export const teamGameAnalysis = pgTable("team_game_analysis", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  possession: integer("possession"), // Percentage 0-100
  shots: integer("shots").default(0),
  shotsOnTarget: integer("shots_on_target").default(0),
  corners: integer("corners").default(0),
  fouls: integer("fouls").default(0),
  offsides: integer("offsides").default(0),
  passAccuracy: integer("pass_accuracy"), // Percentage 0-100
  tackles: integer("tackles").default(0),
  interceptions: integer("interceptions").default(0),
  teamRating: decimal("team_rating", { precision: 3, scale: 1 }), // 1.0 to 10.0
  tacticalExecution: integer("tactical_execution"), // 1-10
  physicalIntensity: integer("physical_intensity"), // 1-10
  mentalResilience: integer("mental_resilience"), // 1-10
  teamwork: integer("teamwork"), // 1-10
  strengths: text("strengths"),
  improvements: text("improvements"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tournaments table
export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id), // Club segregation
  seasonId: integer("season_id").notNull().references(() => seasons.id), // Season segregation
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category"),
  jointCategories: boolean("joint_categories").default(false), // Categorias conjuntas (caminham juntas)
  additionalCategories: text("additional_categories").array(), // Categorias adicionais que participam junto (quando jointCategories = true)
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  registrationDeadline: date("registration_deadline"),
  format: varchar("format").notNull(), // knockout, round_robin, groups, groups_final, swiss
  status: varchar("status").notNull().default("planned"), // planned, registration_open, registration_closed, in_progress, completed, cancelled
  location: varchar("location"),
  maxTeams: integer("max_teams"),
  entryFee: decimal("entry_fee", { precision: 10, scale: 2 }),
  prize: decimal("prize", { precision: 10, scale: 2 }),
  rules: text("rules"),
  // Point system configuration
  pointsWin: integer("points_win").default(3),
  pointsDraw: integer("points_draw").default(1),
  pointsLoss: integer("points_loss").default(0),
  // Ranking rules
  rankingCriteria: text("ranking_criteria").default("points,goal_difference,goals_for"), // comma-separated priority
  // Advancement rules
  advancementType: varchar("advancement_type").default("by_group"), // "by_group" or "overall_ranking"
  teamsAdvancingPerGroup: integer("teams_advancing_per_group").default(2), // Number of teams advancing from each group (when by_group)
  teamsAdvancingTotal: integer("teams_advancing_total").default(16), // Total teams advancing (when overall_ranking)
  directQualificationSpots: integer("direct_qualification_spots").default(2), // Teams advancing directly
  playoffSpots: integer("playoff_spots").default(0), // Teams going to playoff/repechage
  directQualifyingTeams: integer("direct_qualifying_teams").default(0), // Number of teams that skip a phase
  directQualifyingPhase: varchar("direct_qualifying_phase"), // Phase they skip to: 'quarterfinals', 'semifinals', 'final'
  // Enabled phases
  enableRoundOf16: boolean("enable_round_of_16").default(false),
  enableQuarterFinals: boolean("enable_quarter_finals").default(true),
  enableSemiFinals: boolean("enable_semi_finals").default(true),
  enableFinal: boolean("enable_final").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tournament Teams table
export const tournamentTeams = pgTable("tournament_teams", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id), // Club segregation
  seasonId: integer("season_id").notNull().references(() => seasons.id), // Season segregation
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  teamName: varchar("team_name").notNull(),
  category: varchar("category"), // For Mineiro Sub 15/17 format: "Sub-15", "Sub-17"
  badgeUrl: varchar("badge_url"), // Team badge/logo file path
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  registrationDate: timestamp("registration_date").defaultNow(),
  status: varchar("status").notNull().default("registered"), // registered, confirmed, withdrawn
  groupId: integer("group_id"), // For group-based tournaments
  seed: integer("seed"), // For seeding in brackets
  // Auto-enrollment tracking
  originTeamId: integer("origin_team_id").references(() => teams.id), // Reference to club's team if auto-enrolled
  isAutoEnrolled: boolean("is_auto_enrolled").default(false), // True if team was automatically enrolled from club's teams
  adversaryTeamId: integer("adversary_team_id").references(() => adversaryTeams.id), // Reference to adversary team if imported from adversaries
  // Stats for ranking
  matchesPlayed: integer("matches_played").default(0),
  wins: integer("wins").default(0),
  draws: integer("draws").default(0),
  losses: integer("losses").default(0),
  goalsFor: integer("goals_for").default(0),
  goalsAgainst: integer("goals_against").default(0),
  points: integer("points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tournament Groups table (for group-based formats)
export const tournamentGroups = pgTable("tournament_groups", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  groupName: varchar("group_name").notNull(), // Group A, Group B, etc.
  phase: varchar("phase").default("group"), // group, final_group
  category: varchar("category"), // For Mineiro Sub 15/17 format: "Sub-15", "Sub-17"
  advancementRules: text("advancement_rules"), // JSON string describing advancement rules
  createdAt: timestamp("created_at").defaultNow(),
});

// Tournament Matches table
export const tournamentMatches = pgTable("tournament_matches", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  groupId: integer("group_id").references(() => tournamentGroups.id),
  category: varchar("category"), // For joint categories tournaments (Sub-15, Sub-17, etc.)
  phase: varchar("phase").notNull(), // group, quarter_final, semi_final, final, etc.
  round: integer("round"), // For elimination brackets
  team1Id: integer("team1_id").notNull().references(() => tournamentTeams.id),
  team2Id: integer("team2_id").notNull().references(() => tournamentTeams.id),
  scheduledDate: timestamp("scheduled_date"),
  venue: varchar("venue"),
  // Match results
  team1Score: integer("team1_score"),
  team2Score: integer("team2_score"),
  status: varchar("status").notNull().default("scheduled"), // scheduled, in_progress, completed, postponed
  winnerId: integer("winner_id").references(() => tournamentTeams.id),
  // Bracket position for elimination
  bracketPosition: varchar("bracket_position"), // e.g., "QF1", "SF1", "F1"
  nextMatchId: integer("next_match_id").references(() => tournamentMatches.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tournament Advancement Rules table
export const tournamentAdvancementRules = pgTable("tournament_advancement_rules", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  fromPhase: varchar("from_phase").notNull(), // group, quarter_final, etc.
  toPhase: varchar("to_phase").notNull(), // quarter_final, final_group, etc.
  criteria: text("criteria").notNull(), // JSON string with advancement criteria
  teamsAdvancing: integer("teams_advancing").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Game evaluations table
export const gameEvaluations = pgTable("game_evaluations", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  played: boolean("played").notNull().default(false),
  minutesPlayed: integer("minutes_played"),
  rating: integer("rating"), // 1-10 scale
  overallRating: decimal("overall_rating", { precision: 2, scale: 1 }).default('0.0'),
  technicalRating: decimal("technical_rating", { precision: 2, scale: 1 }).default('0.0'),
  physicalRating: decimal("physical_rating", { precision: 2, scale: 1 }).default('0.0'),
  tacticalRating: decimal("tactical_rating", { precision: 2, scale: 1 }).default('0.0'),
  mentalRating: decimal("mental_rating", { precision: 2, scale: 1 }).default('0.0'),
  goals: integer("goals").default(0),
  assists: integer("assists").default(0),
  missedPasses: integer("missed_passes").default(0),
  ballSteals: integer("ball_steals").default(0),
  yellowCards: integer("yellow_cards").default(0),
  redCards: integer("red_cards").default(0),
  notes: text("notes"),
  evaluatedBy: varchar("evaluated_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wellness entries table - Pre-training questionnaire
export const wellnessEntries = pgTable("wellness_entries", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(), // Club segregation
  seasonId: integer("season_id").notNull(), // Season segregation
  athleteId: integer("athlete_id").notNull(),
  date: date("date").notNull(),
  sleepQuality: integer("sleep_quality"), // 1-10 scale
  sleepHours: decimal("sleep_hours", { precision: 3, scale: 1 }),
  fatigueLevel: integer("fatigue_level"), // 1-10 scale
  stressLevel: integer("stress_level"), // 1-10 scale
  mood: integer("mood"), // 1-10 scale
  energyLevel: integer("energy_level"), // 1-10 scale
  hydrationLevel: integer("hydration_level"), // 1-10 scale
  motivationLevel: integer("motivation_level"), // 1-10 scale
  soreness: text("soreness"), // Body areas with soreness
  injuryStatus: boolean("injury_status").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// RPE entries table - Post-training Rate of Perceived Exertion
export const rpeEntries = pgTable("rpe_entries", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(), // Club segregation
  seasonId: integer("season_id").notNull(), // Season segregation
  athleteId: integer("athlete_id").notNull(),
  trainingSessionId: integer("training_session_id").notNull(),
  rpeValue: integer("rpe_value").notNull(), // Rate of Perceived Exertion 1-10
  sessionDuration: integer("session_duration"), // Training duration in minutes
  loadScore: integer("load_score"), // RPE * Duration
  muscularFatigue: integer("muscular_fatigue"), // Muscle fatigue level 1-10
  perceivedExertion: text("perceived_exertion"), // leve, moderado, intenso, muito_intenso
  overallFeeling: text("overall_feeling"), // pessimo, ruim, regular, bom, excelente
  comments: text("comments"), // Additional comments
  notes: text("notes"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Medical records table
export const medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id), // Club segregation
  seasonId: integer("season_id").notNull().references(() => seasons.id), // Season segregation
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  type: varchar("type").notNull(), // injury, medical_exam, treatment, clearance
  title: varchar("title").notNull(),
  description: text("description"),
  date: date("date").notNull(),
  severity: varchar("severity"), // low, medium, high, critical
  bodyPart: varchar("body_part"),
  estimatedRecovery: integer("estimated_recovery_days"),
  actualRecovery: integer("actual_recovery_days"),
  status: varchar("status").notNull(), // active, recovering, cleared, chronic
  doctorName: varchar("doctor_name"),
  doctorNotes: text("doctor_notes"),
  followUpDate: date("follow_up_date"),
  attachments: text("attachments").array(), // array of file paths
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial transactions table
export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id), // Club segregation
  seasonId: integer("season_id").notNull().references(() => seasons.id), // Season segregation
  type: varchar("type").notNull(), // income, expense
  category: varchar("category").notNull(),
  description: varchar("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  paymentMethod: varchar("payment_method"),
  reference: varchar("reference"),
  athleteId: integer("athlete_id").references(() => athletes.id),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Player Fitness Metrics table - Historical fitness data
export const playerFitnessMetrics = pgTable("player_fitness_metrics", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  date: date("date").notNull(),
  
  // Training load metrics
  totalTrainingLoad: decimal("total_training_load", { precision: 6, scale: 2 }), // Sum of RPE * duration
  acuteLoad: decimal("acute_load", { precision: 6, scale: 2 }), // 7-day rolling average
  chronicLoad: decimal("chronic_load", { precision: 6, scale: 2 }), // 28-day rolling average
  acuteChronicRatio: decimal("acute_chronic_ratio", { precision: 4, scale: 2 }), // Acute:Chronic workload ratio
  
  // Wellness trend metrics
  wellnessScore: decimal("wellness_score", { precision: 4, scale: 2 }), // Composite wellness score (0-10)
  sleepTrend: decimal("sleep_trend", { precision: 4, scale: 2 }), // 7-day rolling average
  fatigueTrend: decimal("fatigue_trend", { precision: 4, scale: 2 }), // 7-day rolling average
  stressTrend: decimal("stress_trend", { precision: 4, scale: 2 }), // 7-day rolling average
  
  // Recovery metrics
  recoveryStatus: varchar("recovery_status"), // excellent, good, moderate, poor, critical
  readinessScore: decimal("readiness_score", { precision: 4, scale: 2 }), // Training readiness (0-10)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Injury Risk Assessments table - Daily risk calculations
export const injuryRiskAssessments = pgTable("injury_risk_assessments", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  date: date("date").notNull(),
  
  // Risk scores (0-100, where 100 is highest risk)
  overallRiskScore: decimal("overall_risk_score", { precision: 5, scale: 2 }).notNull(),
  workloadRiskScore: decimal("workload_risk_score", { precision: 5, scale: 2 }).notNull(),
  wellnessRiskScore: decimal("wellness_risk_score", { precision: 5, scale: 2 }).notNull(),
  historyRiskScore: decimal("history_risk_score", { precision: 5, scale: 2 }).notNull(),
  
  // Risk categories
  riskLevel: varchar("risk_level").notNull(), // low, moderate, high, critical
  riskFactors: text("risk_factors").array(), // Array of contributing risk factors
  
  // Recommendations
  trainingRecommendation: varchar("training_recommendation"), // full, modified, rest, medical_clearance
  recommendedIntensity: integer("recommended_intensity"), // Recommended training intensity (1-10)
  recommendations: text("recommendations").array(), // Array of specific recommendations
  
  // Flags
  requiresAttention: boolean("requires_attention").default(false),
  medicalClearanceRequired: boolean("medical_clearance_required").default(false),
  
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Store Products table - Products available in club store
export const storeProducts = pgTable("store_products", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id),
  name: varchar("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  image: varchar("image"), // URL or path to product image
  category: varchar("category").notNull(), // camisa, agasalho, acessórios, etc
  stock: integer("stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fitness Alerts table - System-generated alerts for coaching staff
export const fitnessAlerts = pgTable("fitness_alerts", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubs.id),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id),
  
  alertType: varchar("alert_type").notNull(), // injury_risk, workload_spike, wellness_decline, recovery_needed
  severity: varchar("severity").notNull(), // low, medium, high, critical
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  
  // Alert data
  triggerValue: decimal("trigger_value", { precision: 8, scale: 2 }),
  thresholdValue: decimal("threshold_value", { precision: 8, scale: 2 }),
  recommendations: text("recommendations").array(),
  
  // Status
  status: varchar("status").notNull().default("active"), // active, acknowledged, resolved, dismissed
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const clubsRelations = relations(clubs, ({ many }) => ({
  seasons: many(seasons),
  teams: many(teams),
  athletes: many(athletes),
  users: many(users),
  trainingSessions: many(trainingSessions),
  games: many(games),
  tournaments: many(tournaments),
  wellnessEntries: many(wellnessEntries),
  medicalRecords: many(medicalRecords),
  financialTransactions: many(financialTransactions),
  adversaryTeams: many(adversaryTeams),
  stadiums: many(stadiums),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  club: one(clubs, {
    fields: [seasons.clubId],
    references: [clubs.id],
  }),
  teams: many(teams),
  athletes: many(athletes),
  trainingSessions: many(trainingSessions),
  games: many(games),
  tournaments: many(tournaments),
  wellnessEntries: many(wellnessEntries),
  medicalRecords: many(medicalRecords),
  financialTransactions: many(financialTransactions),
  adversaryTeams: many(adversaryTeams),
  stadiums: many(stadiums),
}));

export const adversaryTeamsRelations = relations(adversaryTeams, ({ one }) => ({
  club: one(clubs, {
    fields: [adversaryTeams.clubId],
    references: [clubs.id],
  }),
  season: one(seasons, {
    fields: [adversaryTeams.seasonId],
    references: [seasons.id],
  }),
}));

export const stadiumsRelations = relations(stadiums, ({ one }) => ({
  club: one(clubs, {
    fields: [stadiums.clubId],
    references: [clubs.id],
  }),
  season: one(seasons, {
    fields: [stadiums.seasonId],
    references: [seasons.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  club: one(clubs, {
    fields: [users.clubId],
    references: [clubs.id],
  }),
  team: one(teams, {
    fields: [users.teamId],
    references: [teams.id],
  }),
  athlete: one(athletes, {
    fields: [users.athleteId],
    references: [athletes.id],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  club: one(clubs, {
    fields: [teams.clubId],
    references: [clubs.id],
  }),
  season: one(seasons, {
    fields: [teams.seasonId],
    references: [seasons.id],
  }),
  athletes: many(athletes),
  users: many(users),
}));

export const athletesRelations = relations(athletes, ({ one, many }) => ({
  team: one(teams, {
    fields: [athletes.teamId],
    references: [teams.id],
  }),
  trainingEvaluations: many(trainingEvaluations),
  gameEvaluations: many(gameEvaluations),
  wellnessEntries: many(wellnessEntries),
  rpeEntries: many(rpeEntries),
  medicalRecords: many(medicalRecords),
  financialTransactions: many(financialTransactions),
}));

export const trainingSessionsRelations = relations(trainingSessions, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [trainingSessions.createdBy],
    references: [users.id],
  }),
  evaluations: many(trainingEvaluations),
}));

export const trainingEvaluationsRelations = relations(trainingEvaluations, ({ one }) => ({
  trainingSession: one(trainingSessions, {
    fields: [trainingEvaluations.trainingSessionId],
    references: [trainingSessions.id],
  }),
  athlete: one(athletes, {
    fields: [trainingEvaluations.athleteId],
    references: [athletes.id],
  }),
  evaluatedByUser: one(users, {
    fields: [trainingEvaluations.evaluatedBy],
    references: [users.id],
  }),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [games.tournamentId],
    references: [tournaments.id],
  }),
  evaluations: many(gameEvaluations),
}));

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  games: many(games),
  teams: many(tournamentTeams),
  groups: many(tournamentGroups),
  matches: many(tournamentMatches),
  advancementRules: many(tournamentAdvancementRules),
}));

export const tournamentTeamsRelations = relations(tournamentTeams, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentTeams.tournamentId],
    references: [tournaments.id],
  }),
  group: one(tournamentGroups, {
    fields: [tournamentTeams.groupId],
    references: [tournamentGroups.id],
  }),
  homeMatches: many(tournamentMatches, {
    relationName: "team1Matches",
  }),
  awayMatches: many(tournamentMatches, {
    relationName: "team2Matches",
  }),
  wonMatches: many(tournamentMatches, {
    relationName: "winnerMatches",
  }),
}));

export const tournamentGroupsRelations = relations(tournamentGroups, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentGroups.tournamentId],
    references: [tournaments.id],
  }),
  teams: many(tournamentTeams),
  matches: many(tournamentMatches),
}));

export const tournamentMatchesRelations = relations(tournamentMatches, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentMatches.tournamentId],
    references: [tournaments.id],
  }),
  group: one(tournamentGroups, {
    fields: [tournamentMatches.groupId],
    references: [tournamentGroups.id],
  }),
  team1: one(tournamentTeams, {
    fields: [tournamentMatches.team1Id],
    references: [tournamentTeams.id],
    relationName: "team1Matches",
  }),
  team2: one(tournamentTeams, {
    fields: [tournamentMatches.team2Id],
    references: [tournamentTeams.id],
    relationName: "team2Matches",
  }),
  winner: one(tournamentTeams, {
    fields: [tournamentMatches.winnerId],
    references: [tournamentTeams.id],
    relationName: "winnerMatches",
  }),
  nextMatch: one(tournamentMatches, {
    fields: [tournamentMatches.nextMatchId],
    references: [tournamentMatches.id],
  }),
}));

export const tournamentAdvancementRulesRelations = relations(tournamentAdvancementRules, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentAdvancementRules.tournamentId],
    references: [tournaments.id],
  }),
}));

export const gameEvaluationsRelations = relations(gameEvaluations, ({ one }) => ({
  game: one(games, {
    fields: [gameEvaluations.gameId],
    references: [games.id],
  }),
  athlete: one(athletes, {
    fields: [gameEvaluations.athleteId],
    references: [athletes.id],
  }),
  evaluatedByUser: one(users, {
    fields: [gameEvaluations.evaluatedBy],
    references: [users.id],
  }),
}));

export const wellnessEntriesRelations = relations(wellnessEntries, ({ one }) => ({
  athlete: one(athletes, {
    fields: [wellnessEntries.athleteId],
    references: [athletes.id],
  }),
  club: one(clubs, {
    fields: [wellnessEntries.clubId],
    references: [clubs.id],
  }),
  season: one(seasons, {
    fields: [wellnessEntries.seasonId],
    references: [seasons.id],
  }),
}));

export const rpeEntriesRelations = relations(rpeEntries, ({ one }) => ({
  athlete: one(athletes, {
    fields: [rpeEntries.athleteId],
    references: [athletes.id],
  }),
  trainingSession: one(trainingSessions, {
    fields: [rpeEntries.trainingSessionId],
    references: [trainingSessions.id],
  }),
  club: one(clubs, {
    fields: [rpeEntries.clubId],
    references: [clubs.id],
  }),
  season: one(seasons, {
    fields: [rpeEntries.seasonId],
    references: [seasons.id],
  }),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  athlete: one(athletes, {
    fields: [medicalRecords.athleteId],
    references: [athletes.id],
  }),
  createdByUser: one(users, {
    fields: [medicalRecords.createdBy],
    references: [users.id],
  }),
}));

export const financialTransactionsRelations = relations(financialTransactions, ({ one }) => ({
  athlete: one(athletes, {
    fields: [financialTransactions.athleteId],
    references: [athletes.id],
  }),
  createdByUser: one(users, {
    fields: [financialTransactions.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAthleteSchema = createInsertSchema(athletes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  category: z.array(z.string()).min(1, "Atleta deve ter pelo menos uma categoria"),
  height: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val).nullable().optional(),
  weight: z.union([z.string(), z.number()]).transform(val => typeof val === 'number' ? val.toString() : val).nullable().optional(),
  medicalCertificate: z.string().nullable().optional(),
  electrocardiogram: z.string().nullable().optional(),
  athleteBond: z.string().nullable().optional(),
  seasonId: z.number().optional(),
});

export const updateAthleteSchema = insertAthleteSchema.partial().extend({
  category: z.array(z.string()).min(1).optional(),
});

export const insertTrainingSessionSchema = createInsertSchema(trainingSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainingDrillSchema = createInsertSchema(trainingDrills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainingStageSchema = createInsertSchema(trainingStages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainingStageDrillSchema = createInsertSchema(trainingStageDrills).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingEvaluationSchema = createInsertSchema(trainingEvaluations).omit({
  id: true,
  createdAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTournamentTeamSchema = createInsertSchema(tournamentTeams).omit({
  id: true,
  createdAt: true,
  registrationDate: true,
  matchesPlayed: true,
  wins: true,
  draws: true,
  losses: true,
  goalsFor: true,
  goalsAgainst: true,
  points: true,
});

export const insertTournamentGroupSchema = createInsertSchema(tournamentGroups).omit({
  id: true,
  createdAt: true,
});

export const insertTournamentMatchSchema = createInsertSchema(tournamentMatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  scheduledDate: true,
}).extend({
  scheduledDate: z.string().optional().nullable().transform((val) => {
    if (!val) return null;
    // Input is ISO string from frontend (already in correct timezone)
    // Frontend sends: new Date(year, month-1, day, hours, minutes).toISOString()
    // Just convert to Date object for storage
    return new Date(val);
  }),
});

export const insertTournamentAdvancementRuleSchema = createInsertSchema(tournamentAdvancementRules).omit({
  id: true,
  createdAt: true,
});

export const insertGameEvaluationSchema = createInsertSchema(gameEvaluations).omit({
  id: true,
  createdAt: true,
}).extend({
  overallRating: z.number().min(0).max(5).optional(),
  technicalRating: z.number().min(0).max(5).optional(),
  physicalRating: z.number().min(0).max(5).optional(),
  tacticalRating: z.number().min(0).max(5).optional(),
  mentalRating: z.number().min(0).max(5).optional(),
});

export const insertWellnessEntrySchema = createInsertSchema(wellnessEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  sleepHours: z.number().min(0).max(24).optional(),
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertPendingRegistrationSchema = createInsertSchema(pendingRegistrations).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
});

export const insertClubSchema = createInsertSchema(clubs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSeasonSchema = createInsertSchema(seasons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdversaryTeamSchema = createInsertSchema(adversaryTeams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStadiumSchema = createInsertSchema(stadiums).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRpeEntrySchema = createInsertSchema(rpeEntries).omit({
  id: true,
  createdAt: true,
  submittedAt: true,
});

export const insertPlayerFitnessMetricSchema = createInsertSchema(playerFitnessMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInjuryRiskAssessmentSchema = createInsertSchema(injuryRiskAssessments).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
});

export const insertFitnessAlertSchema = createInsertSchema(fitnessAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AdversaryTeam = typeof adversaryTeams.$inferSelect;
export type InsertAdversaryTeam = z.infer<typeof insertAdversaryTeamSchema>;
export type Stadium = typeof stadiums.$inferSelect;
export type InsertStadium = z.infer<typeof insertStadiumSchema>;
export type RpeEntry = typeof rpeEntries.$inferSelect;
export type InsertRpeEntry = z.infer<typeof insertRpeEntrySchema>;
export type InsertPendingRegistration = z.infer<typeof insertPendingRegistrationSchema>;
export type PendingRegistration = typeof pendingRegistrations.$inferSelect;
export type InsertClub = z.infer<typeof insertClubSchema>;
export type Club = typeof clubs.$inferSelect;
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasons.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
export type Athlete = typeof athletes.$inferSelect;
export type InsertTrainingSession = z.infer<typeof insertTrainingSessionSchema>;
export type TrainingSession = typeof trainingSessions.$inferSelect;
export type InsertTrainingDrill = z.infer<typeof insertTrainingDrillSchema>;
export type TrainingDrill = typeof trainingDrills.$inferSelect;
export type InsertTrainingStage = z.infer<typeof insertTrainingStageSchema>;
export type TrainingStage = typeof trainingStages.$inferSelect;
export type InsertTrainingStageDrill = z.infer<typeof insertTrainingStageDrillSchema>;
export type TrainingStageDrill = typeof trainingStageDrills.$inferSelect;
export type InsertTrainingEvaluation = z.infer<typeof insertTrainingEvaluationSchema>;
export type TrainingEvaluation = typeof trainingEvaluations.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

// Game Call-up schemas
export const insertGameCallUpSchema = createInsertSchema(gameCallUps);
export type InsertGameCallUp = z.infer<typeof insertGameCallUpSchema>;
export type GameCallUp = typeof gameCallUps.$inferSelect;

// Game Lineup schemas
export const insertGameLineupSchema = createInsertSchema(gameLineups);
export type InsertGameLineup = z.infer<typeof insertGameLineupSchema>;
export type GameLineup = typeof gameLineups.$inferSelect;

// Game Formation schemas
export const insertGameFormationSchema = createInsertSchema(gameFormations);
export type InsertGameFormation = z.infer<typeof insertGameFormationSchema>;
export type GameFormation = typeof gameFormations.$inferSelect;

// Player Game Analysis schemas
export const insertPlayerGameAnalysisSchema = createInsertSchema(playerGameAnalysis);
export type InsertPlayerGameAnalysis = z.infer<typeof insertPlayerGameAnalysisSchema>;
export type PlayerGameAnalysis = typeof playerGameAnalysis.$inferSelect;

// Team Game Analysis schemas
export const insertTeamGameAnalysisSchema = createInsertSchema(teamGameAnalysis);
export type InsertTeamGameAnalysis = z.infer<typeof insertTeamGameAnalysisSchema>;
export type TeamGameAnalysis = typeof teamGameAnalysis.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournamentTeam = z.infer<typeof insertTournamentTeamSchema>;
export type TournamentTeam = typeof tournamentTeams.$inferSelect;
export type InsertTournamentGroup = z.infer<typeof insertTournamentGroupSchema>;
export type TournamentGroup = typeof tournamentGroups.$inferSelect;
export type InsertTournamentMatch = z.infer<typeof insertTournamentMatchSchema>;
export type TournamentMatch = typeof tournamentMatches.$inferSelect;
export type InsertTournamentAdvancementRule = z.infer<typeof insertTournamentAdvancementRuleSchema>;
export type TournamentAdvancementRule = typeof tournamentAdvancementRules.$inferSelect;
export type InsertGameEvaluation = z.infer<typeof insertGameEvaluationSchema>;
export type GameEvaluation = typeof gameEvaluations.$inferSelect;
export type InsertWellnessEntry = z.infer<typeof insertWellnessEntrySchema>;
export type WellnessEntry = typeof wellnessEntries.$inferSelect;
export type InsertRpeEntry = z.infer<typeof insertRpeEntrySchema>;
export type RpeEntry = typeof rpeEntries.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;
export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertPlayerFitnessMetric = z.infer<typeof insertPlayerFitnessMetricSchema>;
export type PlayerFitnessMetric = typeof playerFitnessMetrics.$inferSelect;
export type InsertInjuryRiskAssessment = z.infer<typeof insertInjuryRiskAssessmentSchema>;
export type InjuryRiskAssessment = typeof injuryRiskAssessments.$inferSelect;
export type InsertFitnessAlert = z.infer<typeof insertFitnessAlertSchema>;
export type FitnessAlert = typeof fitnessAlerts.$inferSelect;

// Store Product schemas
export const insertStoreProductSchema = createInsertSchema(storeProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStoreProduct = z.infer<typeof insertStoreProductSchema>;
export type StoreProduct = typeof storeProducts.$inferSelect;
