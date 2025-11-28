// Tradução de tipos de treino
export const trainingTypeLabels: Record<string, string> = {
  'technical': 'Técnico',
  'physical': 'Físico',
  'tactical': 'Tático',
  'psychological': 'Psicológico',
  'physical-tactical': 'Físico+Tático',
  'physical-technical': 'Físico+Técnico',
  'technical-tactical': 'Técnico+Tático',
  'coordination': 'Coordenação',
  'coordenacao': 'Coordenação',
  'resistance': 'Resistência',
  'resistencia': 'Resistência',
  'speed': 'Velocidade',
  'velocidade': 'Velocidade',
  'forca': 'Força',
  'finalizacao': 'Finalização',
  'passe': 'Passe',
  'defesa': 'Defesa',
  'goleiro': 'Goleiro',
  'recuperacao': 'Recuperação',
  'aquecimento': 'Aquecimento',
  'mental': 'Mental',
};

export function getTrainingTypeLabel(type: string): string {
  return trainingTypeLabels[type] || type;
}
