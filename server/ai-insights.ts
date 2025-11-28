import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PerformanceData {
  athletes: any[];
  trainingSessions: any[];
  games: any[];
  trainingEvaluations: any[];
  gameEvaluations: any[];
}

export interface AIInsight {
  type: 'performance' | 'training' | 'tactical' | 'individual' | 'team';
  title: string;
  insight: string;
  recommendations: string[];
  confidence: number;
  data_points: string[];
}

export async function generatePerformanceInsights(data: PerformanceData): Promise<AIInsight[]> {
  try {
    const prompt = `
Analyze the following football club performance data and provide comprehensive insights in Portuguese (Brazilian):

ATHLETES DATA:
${JSON.stringify(data.athletes, null, 2)}

TRAINING SESSIONS:
${JSON.stringify(data.trainingSessions, null, 2)}

GAMES:
${JSON.stringify(data.games, null, 2)}

TRAINING EVALUATIONS:
${JSON.stringify(data.trainingEvaluations, null, 2)}

GAME EVALUATIONS:
${JSON.stringify(data.gameEvaluations, null, 2)}

Based on this data, provide insights about:
1. Individual player performance trends
2. Team performance patterns
3. Training effectiveness
4. Tactical recommendations
5. Areas for improvement

Respond with a JSON array of insights, each containing:
- type: one of 'performance', 'training', 'tactical', 'individual', 'team'
- title: concise insight title in Portuguese
- insight: detailed analysis in Portuguese
- recommendations: array of actionable recommendations in Portuguese
- confidence: confidence level (0-1)
- data_points: key data points that support this insight

Focus on actionable insights that coaches can implement immediately.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional football analytics expert specializing in youth development. Provide detailed, actionable insights based on performance data. Respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"insights": []}');
    return result.insights || [];

  } catch (error) {
    console.error("Error generating AI insights:", error);
    
    // When OpenAI is unavailable, return data-driven insights based on actual database statistics
    return generateDataDrivenInsights(data);
  }
}

function generateDataDrivenInsights(data: PerformanceData): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // If database is empty, provide setup guidance
  if (data.athletes.length === 0 && data.trainingSessions.length === 0 && data.games.length === 0) {
    insights.push({
      type: 'team',
      title: 'Configuração Inicial do Sistema',
      insight: 'Sistema Natus Vincere Academy pronto para uso. Para começar a gerar análises inteligentes, é necessário cadastrar dados básicos do clube.',
      recommendations: [
        'Cadastrar atletas na seção "Atletas"',
        'Criar equipes na seção "Equipes"',
        'Registrar sessões de treino em "Treinos"',
        'Agendar jogos na seção "Jogos"',
        'Configurar registros médicos e bem-estar'
      ],
      confidence: 1.0,
      data_points: [
        'Base de dados vazia - sistema novo',
        'Módulos disponíveis: Atletas, Equipes, Treinos, Jogos, Médico, Financeiro',
        'Sistema de avaliações pronto para uso'
      ]
    });
    
    insights.push({
      type: 'performance',
      title: 'Próximos Passos Recomendados',
      insight: 'Para maximizar o potencial do sistema de análise inteligente, recomenda-se seguir uma sequência estruturada de cadastros.',
      recommendations: [
        'Começar cadastrando pelo menos 10-15 atletas',
        'Criar 2-3 equipes com diferentes categorias',
        'Registrar 5-10 sessões de treino iniciais',
        'Agendar primeiros jogos ou amistosos',
        'Implementar rotina de avaliações pós-treino'
      ],
      confidence: 0.95,
      data_points: [
        'Sistema preparado para análises futuras',
        'Estrutura de dados otimizada',
        'Relatórios automáticos disponíveis'
      ]
    });
    
    return insights;
  }
  
  // Performance trend analysis based on actual data
  if (data.athletes.length > 0) {
    const avgTrainingEvals = data.trainingEvaluations.length / Math.max(data.athletes.length, 1);
    const avgGameEvals = data.gameEvaluations.length / Math.max(data.athletes.length, 1);
    
    insights.push({
      type: 'performance',
      title: 'Análise de Performance da Equipe',
      insight: `Dados coletados de ${data.athletes.length} atletas, ${data.trainingSessions.length} treinos e ${data.games.length} jogos. Média de ${avgTrainingEvals.toFixed(1)} avaliações de treino por atleta e ${avgGameEvals.toFixed(1)} avaliações de jogo por atleta.`,
      recommendations: generatePerformanceRecommendations(data),
      confidence: 0.95,
      data_points: [
        `${data.athletes.length} atletas cadastrados`,
        `${data.trainingSessions.length} sessões de treino realizadas`,
        `${data.games.length} jogos registrados`,
        `${data.trainingEvaluations.length} avaliações de treino`,
        `${data.gameEvaluations.length} avaliações de jogo`
      ]
    });
  }
  
  // Training effectiveness analysis
  if (data.trainingSessions.length > 0) {
    const evaluationRate = (data.trainingEvaluations.length / data.trainingSessions.length) * 100;
    
    insights.push({
      type: 'training',
      title: 'Efetividade dos Treinos',
      insight: `Taxa de avaliação de treinos: ${evaluationRate.toFixed(1)}%. ${evaluationRate > 80 ? 'Excelente acompanhamento' : evaluationRate > 60 ? 'Bom acompanhamento, mas pode melhorar' : 'Necessário aumentar frequência de avaliações'}.`,
      recommendations: generateDataDrivenTrainingRecommendations(evaluationRate, data),
      confidence: 0.88,
      data_points: [
        `${data.trainingSessions.length} treinos realizados`,
        `${data.trainingEvaluations.length} avaliações registradas`,
        `Taxa de avaliação: ${evaluationRate.toFixed(1)}%`
      ]
    });
  }
  
  // Game analysis
  if (data.games.length > 0) {
    const gameEvaluationRate = (data.gameEvaluations.length / (data.games.length * data.athletes.length)) * 100;
    
    insights.push({
      type: 'tactical',
      title: 'Análise de Jogos',
      insight: `${data.games.length} jogos analisados com ${data.gameEvaluations.length} avaliações individuais. ${gameEvaluationRate > 70 ? 'Boa cobertura de avaliações' : 'Oportunidade de melhorar análise individual dos jogos'}.`,
      recommendations: generateGameRecommendations(data),
      confidence: 0.82,
      data_points: [
        `${data.games.length} jogos registrados`,
        `${data.gameEvaluations.length} avaliações de jogo`,
        `Cobertura de avaliação: ${gameEvaluationRate.toFixed(1)}%`
      ]
    });
  }
  
  return insights;
}

function generatePerformanceRecommendations(data: PerformanceData): string[] {
  const recommendations = [];
  
  if (data.trainingEvaluations.length < data.trainingSessions.length * 0.8) {
    recommendations.push('Aumentar frequência de avaliações nos treinos');
  }
  
  if (data.gameEvaluations.length < data.games.length * data.athletes.length * 0.5) {
    recommendations.push('Implementar avaliações sistemáticas pós-jogo');
  }
  
  if (data.athletes.length > 20 && data.trainingSessions.length < 50) {
    recommendations.push('Considerar aumentar frequência de treinos para equipe grande');
  }
  
  recommendations.push('Manter registro consistente de dados para análises futuras');
  
  return recommendations;
}

function generateDataDrivenTrainingRecommendations(evaluationRate: number, data: PerformanceData): string[] {
  const recommendations = [];
  
  if (evaluationRate < 60) {
    recommendations.push('Implementar sistema obrigatório de avaliação pós-treino');
    recommendations.push('Criar formulários simplificados para agilizar avaliações');
  } else if (evaluationRate < 80) {
    recommendations.push('Manter consistência nas avaliações de treino');
    recommendations.push('Identificar treinos sem avaliação e implementar correções');
  } else {
    recommendations.push('Manter excelente padrão de avaliações');
    recommendations.push('Usar dados para otimizar planejamento futuro');
  }
  
  return recommendations;
}

function generateGameRecommendations(data: PerformanceData): string[] {
  const recommendations = [];
  
  if (data.gameEvaluations.length < data.games.length * 10) {
    recommendations.push('Aumentar número de avaliações individuais por jogo');
  }
  
  recommendations.push('Analisar padrões de performance entre treinos e jogos');
  recommendations.push('Desenvolver relatórios táticos específicos por adversário');
  
  return recommendations;
}

export async function generateIndividualPlayerInsight(
  athleteId: number, 
  data: PerformanceData
): Promise<AIInsight> {
  try {
    const athlete = data.athletes.find(a => a.id === athleteId);
    const playerEvaluations = data.trainingEvaluations.filter(e => e.athleteId === athleteId);
    const gameEvaluations = data.gameEvaluations.filter(e => e.athleteId === athleteId);

    const prompt = `
Analyze this individual player's performance data and provide detailed insights in Portuguese (Brazilian):

PLAYER PROFILE:
${JSON.stringify(athlete, null, 2)}

TRAINING EVALUATIONS:
${JSON.stringify(playerEvaluations, null, 2)}

GAME EVALUATIONS:
${JSON.stringify(gameEvaluations, null, 2)}

Provide a comprehensive analysis including:
1. Strengths and weaknesses
2. Performance trends over time
3. Position-specific insights
4. Development recommendations
5. Training focus areas

Respond with a JSON object containing:
- type: 'individual'
- title: player name and key insight
- insight: detailed performance analysis
- recommendations: specific development recommendations
- confidence: confidence level (0-1)
- data_points: supporting statistics
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional football scout and youth development expert. Provide detailed, constructive analysis focused on player development."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;

  } catch (error) {
    console.error("Error generating individual player insight:", error);
    
    // Return data-driven individual insight when OpenAI is unavailable
    return generateDataDrivenIndividualInsight(athleteId, data);
  }
}

function generateDataDrivenIndividualInsight(athleteId: number, data: PerformanceData): AIInsight {
  const athlete = data.athletes.find(a => a.id === athleteId);
  const playerTrainingEvals = data.trainingEvaluations.filter(e => e.athleteId === athleteId);
  const playerGameEvals = data.gameEvaluations.filter(e => e.athleteId === athleteId);
  
  if (!athlete) {
    return {
      type: 'individual',
      title: 'Atleta Não Encontrado',
      insight: 'Dados do atleta não disponíveis para análise.',
      recommendations: ['Verificar cadastro do atleta'],
      confidence: 0.0,
      data_points: []
    };
  }
  
  const avgTrainingRating = playerTrainingEvals.length > 0 
    ? playerTrainingEvals.reduce((sum, evaluation) => sum + (evaluation.overallRating || 0), 0) / playerTrainingEvals.length
    : 0;
    
  const avgGameRating = playerGameEvals.length > 0
    ? playerGameEvals.reduce((sum, evaluation) => sum + (evaluation.technicalRating || 0), 0) / playerGameEvals.length
    : 0;
  
  const recommendations = [];
  
  if (playerTrainingEvals.length < 5) {
    recommendations.push('Aumentar participação em treinos e avaliações');
  }
  
  if (avgTrainingRating < 7 && avgTrainingRating > 0) {
    recommendations.push('Focar em melhorias técnicas durante os treinos');
  }
  
  if (playerGameEvals.length < 3) {
    recommendations.push('Buscar mais oportunidades de jogo para desenvolvimento');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Manter consistência no desempenho');
    recommendations.push('Continuar desenvolvimento técnico e tático');
  }
  
  return {
    type: 'individual',
    title: `Análise Individual - ${athlete.name}`,
    insight: `Atleta com ${playerTrainingEvals.length} avaliações de treino e ${playerGameEvals.length} avaliações de jogo. ${avgTrainingRating > 0 ? `Média nos treinos: ${avgTrainingRating.toFixed(1)}/10.` : ''} ${avgGameRating > 0 ? `Média nos jogos: ${avgGameRating.toFixed(1)}/10.` : ''}`,
    recommendations,
    confidence: 0.85,
    data_points: [
      `${playerTrainingEvals.length} avaliações de treino`,
      `${playerGameEvals.length} avaliações de jogo`,
      avgTrainingRating > 0 ? `Média treinos: ${avgTrainingRating.toFixed(1)}` : 'Sem avaliações de treino',
      avgGameRating > 0 ? `Média jogos: ${avgGameRating.toFixed(1)}` : 'Sem avaliações de jogo'
    ]
  };
}

export async function generateTrainingRecommendations(
  trainingData: any[],
  evaluationData: any[]
): Promise<string[]> {
  try {
    const prompt = `
Based on the following training session data and evaluations, suggest specific training improvements in Portuguese:

TRAINING SESSIONS:
${JSON.stringify(trainingData, null, 2)}

EVALUATIONS:
${JSON.stringify(evaluationData, null, 2)}

Provide 5-10 specific, actionable training recommendations that address:
1. Technical skill development
2. Physical conditioning
3. Tactical understanding
4. Mental preparation
5. Individual player needs

Respond with a JSON object containing an array of recommendations.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional football coach specializing in training methodology and player development."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"recommendations": []}');
    return result.recommendations || [];

  } catch (error) {
    console.error("Error generating training recommendations:", error);
    throw new Error("Failed to generate training recommendations");
  }
}

export async function analyzeTacticalPatterns(gameData: any[], evaluationData: any[]): Promise<AIInsight> {
  try {
    const prompt = `
Analyze the tactical patterns from game data and provide strategic insights in Portuguese:

GAME DATA:
${JSON.stringify(gameData, null, 2)}

GAME EVALUATIONS:
${JSON.stringify(evaluationData, null, 2)}

Analyze:
1. Formation effectiveness
2. Attacking patterns
3. Defensive weaknesses
4. Set piece performance
5. Player positioning

Provide tactical recommendations for improvement.

Respond with a JSON object containing:
- type: 'tactical'
- title: main tactical insight
- insight: detailed tactical analysis
- recommendations: tactical improvements
- confidence: confidence level
- data_points: supporting evidence
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional football tactical analyst with expertise in modern football systems and youth development."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content || '{}');

  } catch (error) {
    console.error("Error analyzing tactical patterns:", error);
    throw new Error("Failed to analyze tactical patterns");
  }
}