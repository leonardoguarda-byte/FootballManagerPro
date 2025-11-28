import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, 
  User, 
  Users, 
  Target, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Star,
  Shield,
  Zap,
  Heart,
  Brain,
  Eye,
  Clock,
  Save
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EnhancedAnalysisManagerProps {
  gameId: string | number;
  playerAnalysis: any[];
  teamAnalysis: any;
  lineup: any[];
  callUps?: any[];
  athletes?: any[];
  gameStatus: string;
}

export function EnhancedAnalysisManager({ 
  gameId, 
  playerAnalysis, 
  teamAnalysis, 
  lineup, 
  callUps,
  athletes,
  gameStatus 
}: EnhancedAnalysisManagerProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [playerRatings, setPlayerRatings] = useState<Record<string, any>>({});
  const [teamMetrics, setTeamMetrics] = useState<any>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load saved player analysis data when component mounts or playerAnalysis changes
  useEffect(() => {
    if (playerAnalysis && playerAnalysis.length > 0) {
      const ratings: Record<string, any> = {};
      playerAnalysis.forEach((analysis: any) => {
        if (analysis.athleteId && analysis.ratings) {
          ratings[analysis.athleteId] = analysis.ratings;
        }
      });
      setPlayerRatings(ratings);
    }
  }, [playerAnalysis]);

  // Load team metrics when teamAnalysis changes
  useEffect(() => {
    if (teamAnalysis && teamAnalysis.metrics) {
      setTeamMetrics(teamAnalysis.metrics);
    }
  }, [teamAnalysis]);

  // Performance categories for player analysis
  const performanceCategories = [
    { 
      key: 'technical', 
      label: 'Técnico', 
      icon: Target,
      subcategories: [
        { key: 'passing', label: 'Passe', max: 10 },
        { key: 'dribbling', label: 'Drible', max: 10 },
        { key: 'finishing', label: 'Finalização', max: 10 },
        { key: 'crossing', label: 'Cruzamento', max: 10 },
        { key: 'ballControl', label: 'Controle de Bola', max: 10 }
      ]
    },
    { 
      key: 'physical', 
      label: 'Físico', 
      icon: Zap,
      subcategories: [
        { key: 'pace', label: 'Velocidade', max: 10 },
        { key: 'strength', label: 'Força', max: 10 },
        { key: 'stamina', label: 'Resistência', max: 10 },
        { key: 'agility', label: 'Agilidade', max: 10 },
        { key: 'jumping', label: 'Salto', max: 10 }
      ]
    },
    { 
      key: 'mental', 
      label: 'Mental', 
      icon: Brain,
      subcategories: [
        { key: 'positioning', label: 'Posicionamento', max: 10 },
        { key: 'vision', label: 'Visão de Jogo', max: 10 },
        { key: 'composure', label: 'Sangue Frio', max: 10 },
        { key: 'leadership', label: 'Liderança', max: 10 },
        { key: 'workRate', label: 'Dedicação', max: 10 }
      ]
    },
    { 
      key: 'defensive', 
      label: 'Defensivo', 
      icon: Shield,
      subcategories: [
        { key: 'tackling', label: 'Desarme', max: 10 },
        { key: 'marking', label: 'Marcação', max: 10 },
        { key: 'interception', label: 'Interceptação', max: 10 },
        { key: 'heading', label: 'Jogo Aéreo', max: 10 },
        { key: 'blocking', label: 'Bloqueio', max: 10 }
      ]
    }
  ];

  // Team performance metrics
  const teamPerformanceMetrics = [
    { key: 'possession', label: 'Posse de Bola (%)', max: 100, unit: '%' },
    { key: 'passes', label: 'Passes Completados', max: 500, unit: '' },
    { key: 'passAccuracy', label: 'Precisão dos Passes (%)', max: 100, unit: '%' },
    { key: 'shots', label: 'Finalizações', max: 30, unit: '' },
    { key: 'shotsOnTarget', label: 'Chutes no Gol', max: 15, unit: '' },
    { key: 'corners', label: 'Escanteios', max: 20, unit: '' },
    { key: 'fouls', label: 'Faltas Cometidas', max: 25, unit: '' },
    { key: 'yellowCards', label: 'Cartões Amarelos', max: 10, unit: '' },
    { key: 'redCards', label: 'Cartões Vermelhos', max: 3, unit: '' },
    { key: 'offsides', label: 'Impedimentos', max: 10, unit: '' }
  ];

  // Fetch players from lineup for analysis
  const { data: players = [] } = useQuery({
    queryKey: ['/api/athletes'],
  });

  // Save player analysis mutation
  const savePlayerAnalysisMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/games/${gameId}/player-analysis`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/player-analysis`] });
      toast({
        title: "Sucesso",
        description: "Análise do jogador salva",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar análise",
        variant: "destructive",
      });
    },
  });

  // Save team analysis mutation
  const saveTeamAnalysisMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/games/${gameId}/team-analysis`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/team-analysis`] });
      toast({
        title: "Sucesso",
        description: "Análise da equipe salva",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar análise da equipe",
        variant: "destructive",
      });
    },
  });

  const updatePlayerRating = (playerId: number, category: string, subcategory: string, value: number) => {
    setPlayerRatings(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [category]: {
          ...prev[playerId]?.[category],
          [subcategory]: value
        }
      }
    }));
  };

  const updateTeamMetric = (metric: string, value: number) => {
    setTeamMetrics(prev => ({
      ...prev,
      [metric]: value
    }));
  };

  const calculateCategoryAverage = (playerId: number, category: string) => {
    const ratings = playerRatings[playerId]?.[category];
    if (!ratings) return 0;
    
    const values = Object.values(ratings) as number[];
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  const calculateOverallRating = (playerId: number) => {
    const categories = ['technical', 'physical', 'mental', 'defensive'];
    const averages = categories.map(cat => calculateCategoryAverage(playerId, cat));
    return averages.reduce((a, b) => a + b, 0) / categories.length;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    if (rating >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 8) return 'Excelente';
    if (rating >= 6) return 'Bom';
    if (rating >= 4) return 'Regular';
    return 'Fraco';
  };

  const playersInGame = (athletes || players || []).filter((player: any) => 
    (callUps || []).some((callUp: any) => callUp.athleteId === player.id && callUp.callUpStatus === 'confirmed')
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual">Análise Individual</TabsTrigger>
          <TabsTrigger value="team">Análise da Equipe</TabsTrigger>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Player Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Selecionar Jogador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {playersInGame.map(player => {
                    const overallRating = calculateOverallRating(player.id);
                    return (
                      <Card 
                        key={player.id}
                        className={`cursor-pointer transition-colors p-3 ${
                          selectedPlayer?.id === player.id 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {player.firstName?.charAt(0)}{player.lastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">
                                {player.firstName} {player.lastName}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {player.position}
                              </Badge>
                            </div>
                          </div>
                          {overallRating > 0 && (
                            <div className="text-right">
                              <div className={`text-sm font-bold ${getRatingColor(overallRating)}`}>
                                {overallRating.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {getRatingBadge(overallRating)}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Player Analysis */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  {selectedPlayer ? 
                    `Análise - ${selectedPlayer.firstName} ${selectedPlayer.lastName}` : 
                    'Selecione um Jogador'
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPlayer ? (
                  <div className="space-y-6">
                    {performanceCategories.map(category => {
                      const CategoryIcon = category.icon;
                      const categoryAverage = calculateCategoryAverage(selectedPlayer.id, category.key);
                      
                      return (
                        <div key={category.key} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <CategoryIcon className="h-4 w-4" />
                              <span className="font-medium">{category.label}</span>
                            </div>
                            {categoryAverage > 0 && (
                              <Badge className={getRatingColor(categoryAverage)}>
                                {categoryAverage.toFixed(1)}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {category.subcategories.map(sub => {
                              const currentValue = playerRatings[selectedPlayer.id]?.[category.key]?.[sub.key] || 0;
                              
                              return (
                                <div key={sub.key} className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-sm">{sub.label}</Label>
                                    <span className={`text-sm font-medium ${getRatingColor(currentValue)}`}>
                                      {currentValue}/10
                                    </span>
                                  </div>
                                  <Input
                                    type="range"
                                    min="0"
                                    max={sub.max}
                                    step="0.5"
                                    value={currentValue}
                                    onInput={(e: any) => {
                                      const value = parseFloat(e.target.value);
                                      updatePlayerRating(selectedPlayer.id, category.key, sub.key, value);
                                    }}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      updatePlayerRating(selectedPlayer.id, category.key, sub.key, value);
                                    }}
                                    className="w-full"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Player Notes */}
                    <div className="space-y-2">
                      <Label>Observações do Jogador</Label>
                      <Textarea
                        placeholder="Adicione observações específicas sobre a performance do jogador..."
                        rows={3}
                      />
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          const ratings = playerRatings[selectedPlayer.id] || {};
                          const analysisData = {
                            athleteId: selectedPlayer.id,
                            gameId: gameId,
                            ratings: ratings,
                            notes: '', // Get from textarea
                            overallRating: calculateOverallRating(selectedPlayer.id)
                          };
                          savePlayerAnalysisMutation.mutate(analysisData);
                        }}
                        disabled={savePlayerAnalysisMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Salvar Análise
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Selecione um jogador para começar a análise</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Estatísticas da Equipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamPerformanceMetrics.map(metric => {
                  const currentValue = teamMetrics[metric.key] || 0;
                  const percentage = (currentValue / metric.max) * 100;
                  
                  return (
                    <div key={metric.key} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">{metric.label}</Label>
                        <span className="text-sm font-bold">
                          {currentValue}{metric.unit}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <Input
                          type="range"
                          min="0"
                          max={metric.max}
                          step="1"
                          value={currentValue}
                          onChange={(e) => updateTeamMetric(metric.key, parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Team Performance Notes */}
              <div className="mt-6 space-y-2">
                <Label>Análise Geral da Equipe</Label>
                <Textarea
                  placeholder="Descreva o desempenho geral da equipe, pontos fortes, pontos fracos, e áreas de melhoria..."
                  rows={4}
                />
              </div>

              {/* Save Team Analysis */}
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => {
                    const teamAnalysisData = {
                      gameId: gameId,
                      metrics: teamMetrics,
                      notes: '', // Get from textarea
                      timestamp: new Date().toISOString()
                    };
                    saveTeamAnalysisMutation.mutate(teamAnalysisData);
                  }}
                  disabled={saveTeamAnalysisMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Salvar Análise da Equipe
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Player Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Resumo dos Jogadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jogador</TableHead>
                      <TableHead>Posição</TableHead>
                      <TableHead>Nota Geral</TableHead>
                      <TableHead>Avaliação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playersInGame.map(player => {
                      const overallRating = calculateOverallRating(player.id);
                      return (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium">
                            {player.firstName} {player.lastName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{player.position}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`font-bold ${getRatingColor(overallRating)}`}>
                              {overallRating > 0 ? overallRating.toFixed(1) : '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {overallRating > 0 ? (
                              <Badge variant="outline">
                                {getRatingBadge(overallRating)}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">Não avaliado</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Team Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Performance da Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Key metrics visualization */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {teamMetrics.possession || 0}%
                      </div>
                      <div className="text-sm text-blue-700">Posse de Bola</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {teamMetrics.passAccuracy || 0}%
                      </div>
                      <div className="text-sm text-green-700">Precisão</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {teamMetrics.shots || 0}
                      </div>
                      <div className="text-sm text-purple-700">Finalizações</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {teamMetrics.fouls || 0}
                      </div>
                      <div className="text-sm text-orange-700">Faltas</div>
                    </div>
                  </div>

                  {/* Overall team rating */}
                  <div className="text-center pt-4 border-t">
                    <div className="text-lg text-gray-600">Avaliação Geral da Equipe</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {playersInGame.length > 0 ? 
                        (playersInGame.reduce((sum, player) => 
                          sum + calculateOverallRating(player.id), 0) / playersInGame.length
                        ).toFixed(1) : 
                        '-'
                      }/10
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}