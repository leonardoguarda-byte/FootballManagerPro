import { db } from "./db";
import { 
  wellnessEntries, 
  rpeEntries, 
  medicalRecords, 
  playerFitnessMetrics,
  injuryRiskAssessments,
  fitnessAlerts,
  athletes
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

interface WellnessData {
  date: string;
  sleepQuality: number;
  sleepHours: number;
  fatigueLevel: number;
  stressLevel: number;
  mood: number;
  energyLevel: number;
  hydrationLevel: number;
  motivationLevel: number;
  soreness: string | null;
  injuryStatus: boolean;
}

interface RPEData {
  date: string;
  rpeValue: number;
  sessionDuration: number;
  loadScore: number;
}

interface MedicalData {
  type: string;
  severity: string;
  bodyPart: string;
  status: string;
  date: string;
  estimatedRecovery: number | null;
}

export class FitnessEngine {
  // Calculate acute workload (7-day rolling average)
  private calculateAcuteLoad(rpeData: RPEData[]): number {
    if (rpeData.length === 0) return 0;
    const last7Days = rpeData.slice(0, 7);
    const totalLoad = last7Days.reduce((sum, entry) => sum + entry.loadScore, 0);
    return totalLoad / 7;
  }

  // Calculate chronic workload (28-day rolling average)
  private calculateChronicLoad(rpeData: RPEData[]): number {
    if (rpeData.length === 0) return 0;
    const last28Days = rpeData.slice(0, 28);
    const totalLoad = last28Days.reduce((sum, entry) => sum + entry.loadScore, 0);
    return totalLoad / 28;
  }

  // Calculate acute:chronic workload ratio
  private calculateACWR(acuteLoad: number, chronicLoad: number): number {
    if (chronicLoad === 0) return 0;
    return acuteLoad / chronicLoad;
  }

  // Calculate composite wellness score (0-10)
  private calculateWellnessScore(wellnessData: WellnessData[]): number {
    if (wellnessData.length === 0) return 5.0; // Neutral score

    const recent = wellnessData.slice(0, 7); // Last 7 days
    if (recent.length === 0) return 5.0;

    const avgSleep = recent.reduce((sum, w) => sum + w.sleepQuality, 0) / recent.length;
    const avgFatigue = recent.reduce((sum, w) => sum + w.fatigueLevel, 0) / recent.length;
    const avgStress = recent.reduce((sum, w) => sum + w.stressLevel, 0) / recent.length;
    const avgMood = recent.reduce((sum, w) => sum + w.mood, 0) / recent.length;
    const avgEnergy = recent.reduce((sum, w) => sum + w.energyLevel, 0) / recent.length;

    // Weighted composite score
    const score = (
      (avgSleep * 0.25) + 
      ((10 - avgFatigue) * 0.25) + // Invert fatigue (lower is better)
      ((10 - avgStress) * 0.2) + // Invert stress (lower is better)
      (avgMood * 0.15) + 
      (avgEnergy * 0.15)
    );

    return Math.max(0, Math.min(10, score));
  }

  // Calculate training readiness score
  private calculateReadinessScore(
    wellnessScore: number, 
    acwrRatio: number, 
    hasActiveInjury: boolean
  ): number {
    let readiness = wellnessScore;

    // Adjust for workload ratio
    if (acwrRatio > 1.5) {
      readiness -= 2; // High acute load
    } else if (acwrRatio > 1.3) {
      readiness -= 1; // Moderate acute load
    } else if (acwrRatio < 0.8) {
      readiness -= 0.5; // Very low load might indicate detraining
    }

    // Adjust for injury status
    if (hasActiveInjury) {
      readiness -= 3;
    }

    return Math.max(0, Math.min(10, readiness));
  }

  // Calculate workload risk score (0-100)
  private calculateWorkloadRisk(acwrRatio: number, totalLoad: number): number {
    let risk = 0;

    // ACWR risk (based on research: 0.8-1.3 is optimal)
    if (acwrRatio > 1.5) {
      risk += 40; // Very high spike
    } else if (acwrRatio > 1.3) {
      risk += 25; // High spike
    } else if (acwrRatio < 0.8) {
      risk += 15; // Very low load
    }

    // Absolute load risk
    if (totalLoad > 500) {
      risk += 20; // Very high absolute load
    } else if (totalLoad > 400) {
      risk += 10; // High absolute load
    }

    return Math.min(100, risk);
  }

  // Calculate wellness risk score (0-100)
  private calculateWellnessRisk(wellnessScore: number, trends: any): number {
    let risk = 0;

    // Poor wellness score
    if (wellnessScore < 4) {
      risk += 30;
    } else if (wellnessScore < 6) {
      risk += 15;
    }

    // Declining trends
    if (trends.fatigueTrend > 7) risk += 15;
    if (trends.stressTrend > 7) risk += 15;
    if (trends.sleepTrend < 5) risk += 15;

    return Math.min(100, risk);
  }

  // Calculate injury history risk score (0-100)
  private calculateHistoryRisk(medicalData: MedicalData[]): number {
    let risk = 0;
    const recentInjuries = medicalData.filter(m => 
      m.type === 'injury' && 
      new Date(m.date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
    );

    // Number of injuries in past year
    risk += Math.min(30, recentInjuries.length * 10);

    // Active or recent injuries
    const activeInjuries = medicalData.filter(m => m.status === 'active' || m.status === 'recovering');
    risk += Math.min(40, activeInjuries.length * 20);

    // Severity of recent injuries
    const severeInjuries = recentInjuries.filter(m => m.severity === 'high' || m.severity === 'critical');
    risk += Math.min(30, severeInjuries.length * 15);

    return Math.min(100, risk);
  }

  // Determine risk level from score
  private getRiskLevel(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'moderate';
    return 'low';
  }

  // Generate risk factors list
  private generateRiskFactors(
    acwrRatio: number, 
    wellnessScore: number, 
    hasActiveInjury: boolean, 
    totalLoad: number
  ): string[] {
    const factors: string[] = [];

    if (acwrRatio > 1.5) factors.push('Excessive training load spike');
    if (acwrRatio > 1.3) factors.push('High training load increase');
    if (acwrRatio < 0.8) factors.push('Very low training load');
    if (wellnessScore < 5) factors.push('Poor wellness indicators');
    if (hasActiveInjury) factors.push('Active injury or recovery');
    if (totalLoad > 500) factors.push('Very high absolute training load');

    return factors;
  }

  // Generate training recommendations
  private generateRecommendations(
    riskLevel: string, 
    acwrRatio: number, 
    wellnessScore: number, 
    hasActiveInjury: boolean
  ): { recommendation: string; intensity: number; suggestions: string[] } {
    const suggestions: string[] = [];
    let recommendation = 'full';
    let intensity = 8;

    if (hasActiveInjury) {
      recommendation = 'medical_clearance';
      intensity = 0;
      suggestions.push('Consult medical staff before training');
      suggestions.push('Focus on rehabilitation exercises');
    } else if (riskLevel === 'critical') {
      recommendation = 'rest';
      intensity = 2;
      suggestions.push('Complete rest or very light activity only');
      suggestions.push('Focus on recovery and sleep');
      suggestions.push('Monitor wellness daily');
    } else if (riskLevel === 'high') {
      recommendation = 'modified';
      intensity = 4;
      suggestions.push('Reduce training intensity by 50%');
      suggestions.push('Focus on technique and recovery');
      suggestions.push('Extra emphasis on sleep and nutrition');
    } else if (riskLevel === 'moderate') {
      recommendation = 'modified';
      intensity = 6;
      suggestions.push('Slightly reduce training load');
      suggestions.push('Monitor wellness closely');
    } else {
      if (acwrRatio < 0.8) {
        suggestions.push('Consider gradually increasing training load');
      }
      if (wellnessScore > 8) {
        suggestions.push('Excellent recovery status - can handle full training');
      }
    }

    return { recommendation, intensity, suggestions };
  }

  // Calculate fitness metrics for a specific athlete and date
  async calculateFitnessMetrics(athleteId: number, clubId: number, seasonId: number, targetDate: string) {
    const endDate = new Date(targetDate);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 28); // 28 days of data

    // Fetch wellness data
    const wellness = await db
      .select()
      .from(wellnessEntries)
      .where(
        and(
          eq(wellnessEntries.athleteId, athleteId),
          eq(wellnessEntries.clubId, clubId),
          eq(wellnessEntries.seasonId, seasonId),
          gte(wellnessEntries.date, startDate.toISOString().split('T')[0]),
          lte(wellnessEntries.date, targetDate)
        )
      )
      .orderBy(desc(wellnessEntries.date));

    // Fetch RPE data
    const rpe = await db
      .select({
        date: sql<string>`${rpeEntries.createdAt}::date`.as('date'),
        rpeValue: rpeEntries.rpeValue,
        sessionDuration: rpeEntries.sessionDuration,
        loadScore: rpeEntries.loadScore,
      })
      .from(rpeEntries)
      .where(
        and(
          eq(rpeEntries.athleteId, athleteId),
          eq(rpeEntries.clubId, clubId),
          eq(rpeEntries.seasonId, seasonId),
          gte(sql`${rpeEntries.createdAt}::date`, startDate.toISOString().split('T')[0]),
          lte(sql`${rpeEntries.createdAt}::date`, targetDate)
        )
      )
      .orderBy(desc(rpeEntries.createdAt));

    // Fetch medical data
    const medical = await db
      .select()
      .from(medicalRecords)
      .where(
        and(
          eq(medicalRecords.athleteId, athleteId),
          eq(medicalRecords.clubId, clubId),
          eq(medicalRecords.seasonId, seasonId)
        )
      )
      .orderBy(desc(medicalRecords.date));

    // Calculate metrics
    const acuteLoad = this.calculateAcuteLoad(rpe as RPEData[]);
    const chronicLoad = this.calculateChronicLoad(rpe as RPEData[]);
    const acwrRatio = this.calculateACWR(acuteLoad, chronicLoad);
    const totalTrainingLoad = rpe.reduce((sum, entry) => sum + (entry.loadScore || 0), 0);
    
    const wellnessScore = this.calculateWellnessScore(wellness as WellnessData[]);
    const hasActiveInjury = medical.some(m => m.status === 'active' || m.status === 'recovering');
    const readinessScore = this.calculateReadinessScore(wellnessScore, acwrRatio, hasActiveInjury);

    // Calculate trends
    const sleepTrend = wellness.slice(0, 7).reduce((sum, w) => sum + w.sleepQuality, 0) / Math.max(1, wellness.slice(0, 7).length);
    const fatigueTrend = wellness.slice(0, 7).reduce((sum, w) => sum + w.fatigueLevel, 0) / Math.max(1, wellness.slice(0, 7).length);
    const stressTrend = wellness.slice(0, 7).reduce((sum, w) => sum + w.stressLevel, 0) / Math.max(1, wellness.slice(0, 7).length);

    const recoveryStatus = readinessScore >= 8 ? 'excellent' : 
                          readinessScore >= 6 ? 'good' : 
                          readinessScore >= 4 ? 'moderate' : 
                          readinessScore >= 2 ? 'poor' : 'critical';

    return {
      totalTrainingLoad,
      acuteLoad,
      chronicLoad,
      acuteChronicRatio: acwrRatio,
      wellnessScore,
      sleepTrend,
      fatigueTrend,
      stressTrend,
      recoveryStatus,
      readinessScore
    };
  }

  // Calculate injury risk assessment
  async calculateInjuryRisk(athleteId: number, clubId: number, seasonId: number, targetDate: string) {
    const metrics = await this.calculateFitnessMetrics(athleteId, clubId, seasonId, targetDate);
    
    // Get medical history for risk calculation
    const medical = await db
      .select()
      .from(medicalRecords)
      .where(
        and(
          eq(medicalRecords.athleteId, athleteId),
          eq(medicalRecords.clubId, clubId),
          eq(medicalRecords.seasonId, seasonId)
        )
      );

    const hasActiveInjury = medical.some(m => m.status === 'active' || m.status === 'recovering');
    
    // Calculate risk scores
    const workloadRiskScore = this.calculateWorkloadRisk(metrics.acuteChronicRatio, metrics.totalTrainingLoad);
    const wellnessRiskScore = this.calculateWellnessRisk(metrics.wellnessScore, {
      fatigueTrend: metrics.fatigueTrend,
      stressTrend: metrics.stressTrend,
      sleepTrend: metrics.sleepTrend
    });
    const historyRiskScore = this.calculateHistoryRisk(medical as MedicalData[]);
    
    // Calculate overall risk (weighted average)
    const overallRiskScore = (workloadRiskScore * 0.4) + (wellnessRiskScore * 0.35) + (historyRiskScore * 0.25);
    
    const riskLevel = this.getRiskLevel(overallRiskScore);
    const riskFactors = this.generateRiskFactors(
      metrics.acuteChronicRatio, 
      metrics.wellnessScore, 
      hasActiveInjury, 
      metrics.totalTrainingLoad
    );
    
    const recommendations = this.generateRecommendations(
      riskLevel, 
      metrics.acuteChronicRatio, 
      metrics.wellnessScore, 
      hasActiveInjury
    );

    return {
      overallRiskScore,
      workloadRiskScore,
      wellnessRiskScore,
      historyRiskScore,
      riskLevel,
      riskFactors,
      trainingRecommendation: recommendations.recommendation,
      recommendedIntensity: recommendations.intensity,
      recommendations: recommendations.suggestions,
      requiresAttention: riskLevel === 'high' || riskLevel === 'critical',
      medicalClearanceRequired: hasActiveInjury && riskLevel !== 'low'
    };
  }

  // Update fitness metrics for an athlete
  async updatePlayerFitnessMetrics(athleteId: number, clubId: number, seasonId: number, targetDate: string) {
    const metrics = await this.calculateFitnessMetrics(athleteId, clubId, seasonId, targetDate);
    
    // Upsert fitness metrics
    await db
      .insert(playerFitnessMetrics)
      .values({
        clubId,
        seasonId,
        athleteId,
        date: targetDate,
        ...metrics
      })
      .onConflictDoUpdate({
        target: [playerFitnessMetrics.clubId, playerFitnessMetrics.seasonId, playerFitnessMetrics.athleteId, playerFitnessMetrics.date],
        set: {
          ...metrics,
          updatedAt: new Date()
        }
      });

    return metrics;
  }

  // Update injury risk assessment for an athlete
  async updateInjuryRiskAssessment(athleteId: number, clubId: number, seasonId: number, targetDate: string) {
    const assessment = await this.calculateInjuryRisk(athleteId, clubId, seasonId, targetDate);
    
    // Upsert risk assessment
    await db
      .insert(injuryRiskAssessments)
      .values({
        clubId,
        seasonId,
        athleteId,
        date: targetDate,
        ...assessment
      })
      .onConflictDoUpdate({
        target: [injuryRiskAssessments.clubId, injuryRiskAssessments.seasonId, injuryRiskAssessments.athleteId, injuryRiskAssessments.date],
        set: {
          ...assessment,
          calculatedAt: new Date()
        }
      });

    // Generate alerts if needed
    await this.generateFitnessAlerts(athleteId, clubId, seasonId, assessment);

    return assessment;
  }

  // Generate fitness alerts based on risk assessment
  private async generateFitnessAlerts(
    athleteId: number, 
    clubId: number, 
    seasonId: number, 
    assessment: any
  ) {
    const alerts: any[] = [];

    if (assessment.requiresAttention) {
      alerts.push({
        clubId,
        seasonId,
        athleteId,
        alertType: 'injury_risk',
        severity: assessment.riskLevel,
        title: `${assessment.riskLevel.charAt(0).toUpperCase() + assessment.riskLevel.slice(1)} Injury Risk Detected`,
        message: `Player has ${assessment.riskLevel} injury risk (${Math.round(assessment.overallRiskScore)}%). Factors: ${assessment.riskFactors.join(', ')}`,
        triggerValue: assessment.overallRiskScore,
        thresholdValue: assessment.riskLevel === 'critical' ? 80 : 60,
        recommendations: assessment.recommendations
      });
    }

    if (assessment.workloadRiskScore > 50) {
      alerts.push({
        clubId,
        seasonId,
        athleteId,
        alertType: 'workload_spike',
        severity: assessment.workloadRiskScore > 70 ? 'high' : 'medium',
        title: 'Training Load Spike Detected',
        message: `Acute:Chronic workload ratio is concerning. Consider reducing training intensity.`,
        triggerValue: assessment.workloadRiskScore,
        thresholdValue: 50,
        recommendations: ['Reduce training intensity', 'Monitor recovery closely']
      });
    }

    if (assessment.wellnessRiskScore > 40) {
      alerts.push({
        clubId,
        seasonId,
        athleteId,
        alertType: 'wellness_decline',
        severity: assessment.wellnessRiskScore > 60 ? 'high' : 'medium',
        title: 'Wellness Decline Detected',
        message: `Player wellness indicators are declining. Focus on recovery strategies.`,
        triggerValue: assessment.wellnessRiskScore,
        thresholdValue: 40,
        recommendations: ['Improve sleep quality', 'Reduce stress factors', 'Enhanced recovery protocols']
      });
    }

    // Insert alerts
    for (const alert of alerts) {
      await db.insert(fitnessAlerts).values(alert);
    }
  }

  // Process all athletes for a given date
  async processAllAthletes(clubId: number, seasonId: number, targetDate: string) {
    const athletesList = await db
      .select({ id: athletes.id })
      .from(athletes)
      .where(
        and(
          eq(athletes.clubId, clubId),
          eq(athletes.seasonId, seasonId),
          eq(athletes.isActive, true)
        )
      );

    const results = [];
    for (const athlete of athletesList) {
      try {
        const metrics = await this.updatePlayerFitnessMetrics(athlete.id, clubId, seasonId, targetDate);
        const assessment = await this.updateInjuryRiskAssessment(athlete.id, clubId, seasonId, targetDate);
        results.push({ athleteId: athlete.id, success: true, metrics, assessment });
      } catch (error) {
        console.error(`Error processing athlete ${athlete.id}:`, error);
        results.push({ athleteId: athlete.id, success: false, error: error.message });
      }
    }

    return results;
  }
}

export const fitnessEngine = new FitnessEngine();