import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, User, Users, Star, TrendingUp, TrendingDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GameAnalysisManagerProps {
  gameId: string;
  playerAnalysis: any[];
  teamAnalysis: any;
  lineup: any[];
  gameStatus: string;
}

export function GameAnalysisManager({ 
  gameId, 
  playerAnalysis, 
  teamAnalysis, 
  lineup, 
  gameStatus 
}: GameAnalysisManagerProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [playerData, setPlayerData] = useState({
    minutesPlayed: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    rating: 5.0,
    technicalSkills: 5,
    physicalCondition: 5,
    tacticalAwareness: 5,
    mentalStrength: 5,
    leadership: 5,
    strengths: '',
    improvements: '',
    notes: ''
  });
  const [teamData, setTeamData] = useState({
    possession: 50,
    shots: 0,
    shotsOnTarget: 0,
    corners: 0,
    fouls: 0,
    offsides: 0,
    passAccuracy: 75,
    tackles: 0,
    interceptions: 0,
    teamRating: 5.0,
    tacticalExecution: 5,
    physicalIntensity: 5,
    mentalResilience: 5,
    teamwork: 5,
    strengths: '',
    improvements: '',
    notes: ''
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch athletes data
  const { data: athletes = [] } = useQuery({
    queryKey: ['/api/athletes'],
  });

  // Save player analysis mutation
  const savePlayerAnalysisMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/games/${gameId}/player-analysis`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/player-analysis`] });
      toast({
        title: "Sucesso",
        description: "Análise do jogador salva com sucesso",
      });
      setSelectedPlayer(null);
    },
  });

  // Save team analysis mutation
  const saveTeamAnalysisMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/games/${gameId}/team-analysis`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/team-analysis`] });
      toast({
        title: "Sucesso",
        description: "Análise da equipe salva com sucesso",
      });
    },
  });

  const isGameCompleted = gameStatus === 'completed';
  const lineupPlayers = lineup.map(l => {
    const athlete = athletes.find((a: any) => a.id === l.athleteId);
    return athlete ? { ...athlete, lineupId: l.id, isStarter: l.isStarter } : null;
  }).filter(Boolean);

  const handlePlayerSelect = (player: any) => {
    setSelectedPlayer(player);
    const existingAnalysis = playerAnalysis.find(pa => pa.athleteId === player.id);
    if (existingAnalysis) {
      setPlayerData({
        minutesPlayed: existingAnalysis.minutesPlayed || 0,
        goals: existingAnalysis.goals || 0,
        assists: existingAnalysis.assists || 0,
        yellowCards: existingAnalysis.yellowCards || 0,
        redCards: existingAnalysis.redCards || 0,
        rating: existingAnalysis.rating || 5.0,
        technicalSkills: existingAnalysis.technicalSkills || 5,
        physicalCondition: existingAnalysis.physicalCondition || 5,
        tacticalAwareness: existingAnalysis.tacticalAwareness || 5,
        mentalStrength: existingAnalysis.mentalStrength || 5,
        leadership: existingAnalysis.leadership || 5,
        strengths: existingAnalysis.strengths || '',
        improvements: existingAnalysis.improvements || '',
        notes: existingAnalysis.notes || ''
      });
    } else {
      setPlayerData({
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        rating: 5.0,
        technicalSkills: 5,
        physicalCondition: 5,
        tacticalAwareness: 5,
        mentalStrength: 5,
        leadership: 5,
        strengths: '',
        improvements: '',
        notes: ''
      });
    }
  };

  const handleSavePlayerAnalysis = () => {
    if (!selectedPlayer) return;
    
    savePlayerAnalysisMutation.mutate({
      athleteId: selectedPlayer.id,
      ...playerData
    });
  };

  const handleSaveTeamAnalysis = () => {
    saveTeamAnalysisMutation.mutate(teamData);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPlayerAnalysisStats = () => {
    if (playerAnalysis.length === 0) return null;
    
    const totalRating = playerAnalysis.reduce((sum, pa) => sum + (pa.rating || 0), 0);
    const avgRating = totalRating / playerAnalysis.length;
    const totalGoals = playerAnalysis.reduce((sum, pa) => sum + (pa.goals || 0), 0);
    const totalAssists = playerAnalysis.reduce((sum, pa) => sum + (pa.assists || 0), 0);
    
    return { avgRating, totalGoals, totalAssists };
  };

  const stats = getPlayerAnalysisStats();

  return (
    <div className="space-y-6">
      {!isGameCompleted && (
        <Card>
          <CardContent className="pt-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-700 font-medium">
                  A análise detalhada estará disponível após o jogo ser finalizado
                </p>
              </div>
              <p className="text-yellow-600 text-sm mt-1">
                Você pode pré-configurar dados básicos, mas a análise completa requer o jogo finalizado
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Análise da Equipe
          </TabsTrigger>
          <TabsTrigger value="players">
            <User className="h-4 w-4 mr-2" />
            Análise Individual
          </TabsTrigger>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
        </TabsList>

        {/* Team Analysis */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Análise da Equipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Posse de Bola (%)</Label>
                  <div className="mt-2">
                    <Slider
                      value={[teamData.possession]}
                      onValueChange={([value]) => setTeamData({...teamData, possession: value})}
                      max={100}
                      step={5}
                      disabled={!isGameCompleted}
                    />
                    <div className="text-center mt-1 text-sm font-medium">
                      {teamData.possession}%
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Finalizações</Label>
                  <Input
                    type="number"
                    value={teamData.shots}
                    onChange={(e) => setTeamData({...teamData, shots: parseInt(e.target.value) || 0})}
                    disabled={!isGameCompleted}
                  />
                </div>

                <div>
                  <Label>Finalizações no Gol</Label>
                  <Input
                    type="number"
                    value={teamData.shotsOnTarget}
                    onChange={(e) => setTeamData({...teamData, shotsOnTarget: parseInt(e.target.value) || 0})}
                    disabled={!isGameCompleted}
                  />
                </div>

                <div>
                  <Label>Precisão de Passe (%)</Label>
                  <div className="mt-2">
                    <Slider
                      value={[teamData.passAccuracy]}
                      onValueChange={([value]) => setTeamData({...teamData, passAccuracy: value})}
                      max={100}
                      step={5}
                      disabled={!isGameCompleted}
                    />
                    <div className="text-center mt-1 text-sm font-medium">
                      {teamData.passAccuracy}%
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Escanteios</Label>
                  <Input
                    type="number"
                    value={teamData.corners}
                    onChange={(e) => setTeamData({...teamData, corners: parseInt(e.target.value) || 0})}
                    disabled={!isGameCompleted}
                  />
                </div>

                <div>
                  <Label>Faltas</Label>
                  <Input
                    type="number"
                    value={teamData.fouls}
                    onChange={(e) => setTeamData({...teamData, fouls: parseInt(e.target.value) || 0})}
                    disabled={!isGameCompleted}
                  />
                </div>

                <div>
                  <Label>Desarmes</Label>
                  <Input
                    type="number"
                    value={teamData.tackles}
                    onChange={(e) => setTeamData({...teamData, tackles: parseInt(e.target.value) || 0})}
                    disabled={!isGameCompleted}
                  />
                </div>

                <div>
                  <Label>Interceptações</Label>
                  <Input
                    type="number"
                    value={teamData.interceptions}
                    onChange={(e) => setTeamData({...teamData, interceptions: parseInt(e.target.value) || 0})}
                    disabled={!isGameCompleted}
                  />
                </div>
              </div>

              {/* Performance Ratings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Avaliações Técnicas</h4>
                  
                  <div>
                    <Label>Execução Tática (1-10)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[teamData.tacticalExecution]}
                        onValueChange={([value]) => setTeamData({...teamData, tacticalExecution: value})}
                        max={10}
                        min={1}
                        step={1}
                        disabled={!isGameCompleted}
                      />
                      <div className="text-center mt-1 text-sm font-medium">
                        {teamData.tacticalExecution}/10
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Intensidade Física (1-10)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[teamData.physicalIntensity]}
                        onValueChange={([value]) => setTeamData({...teamData, physicalIntensity: value})}
                        max={10}
                        min={1}
                        step={1}
                        disabled={!isGameCompleted}
                      />
                      <div className="text-center mt-1 text-sm font-medium">
                        {teamData.physicalIntensity}/10
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Resistência Mental (1-10)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[teamData.mentalResilience]}
                        onValueChange={([value]) => setTeamData({...teamData, mentalResilience: value})}
                        max={10}
                        min={1}
                        step={1}
                        disabled={!isGameCompleted}
                      />
                      <div className="text-center mt-1 text-sm font-medium">
                        {teamData.mentalResilience}/10
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Trabalho de Equipe (1-10)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[teamData.teamwork]}
                        onValueChange={([value]) => setTeamData({...teamData, teamwork: value})}
                        max={10}
                        min={1}
                        step={1}
                        disabled={!isGameCompleted}
                      />
                      <div className="text-center mt-1 text-sm font-medium">
                        {teamData.teamwork}/10
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Nota Geral da Equipe (1-10)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[teamData.teamRating]}
                        onValueChange={([value]) => setTeamData({...teamData, teamRating: value})}
                        max={10}
                        min={1}
                        step={0.1}
                        disabled={!isGameCompleted}
                      />
                      <div className="text-center mt-1 text-sm font-medium">
                        {teamData.teamRating.toFixed(1)}/10
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Pontos Fortes</Label>
                    <Textarea
                      value={teamData.strengths}
                      onChange={(e) => setTeamData({...teamData, strengths: e.target.value})}
                      placeholder="Descreva os principais pontos fortes da equipe..."
                      rows={4}
                      disabled={!isGameCompleted}
                    />
                  </div>

                  <div>
                    <Label>Pontos a Melhorar</Label>
                    <Textarea
                      value={teamData.improvements}
                      onChange={(e) => setTeamData({...teamData, improvements: e.target.value})}
                      placeholder="Identifique áreas que precisam de melhoria..."
                      rows={4}
                      disabled={!isGameCompleted}
                    />
                  </div>

                  <div>
                    <Label>Observações Gerais</Label>
                    <Textarea
                      value={teamData.notes}
                      onChange={(e) => setTeamData({...teamData, notes: e.target.value})}
                      placeholder="Observações adicionais sobre a performance da equipe..."
                      rows={3}
                      disabled={!isGameCompleted}
                    />
                  </div>
                </div>
              </div>

              {isGameCompleted && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveTeamAnalysis}
                    disabled={saveTeamAnalysisMutation.isPending}
                  >
                    Salvar Análise da Equipe
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Player Analysis */}
        <TabsContent value="players">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Player Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Selecionar Jogador</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lineupPlayers.map((player: any) => {
                    const hasAnalysis = playerAnalysis.find(pa => pa.athleteId === player.id);
                    return (
                      <div
                        key={player.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPlayer?.id === player.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-fluent-border hover:border-fluent-blue'
                        }`}
                        onClick={() => handlePlayerSelect(player)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              #{player.jerseyNumber} {player.firstName} {player.lastName}
                            </p>
                            <p className="text-sm text-fluent-text-secondary">
                              {player.position} • {player.isStarter ? 'Titular' : 'Reserva'}
                            </p>
                          </div>
                          {hasAnalysis && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <Star className="h-3 w-3 mr-1" />
                              Analisado
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Player Analysis Form */}
            {selectedPlayer && (
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Análise: {selectedPlayer.firstName} {selectedPlayer.lastName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Match Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <Label>Minutos Jogados</Label>
                        <Input
                          type="number"
                          value={playerData.minutesPlayed}
                          onChange={(e) => setPlayerData({...playerData, minutesPlayed: parseInt(e.target.value) || 0})}
                          max={90}
                          disabled={!isGameCompleted}
                        />
                      </div>
                      <div>
                        <Label>Gols</Label>
                        <Input
                          type="number"
                          value={playerData.goals}
                          onChange={(e) => setPlayerData({...playerData, goals: parseInt(e.target.value) || 0})}
                          disabled={!isGameCompleted}
                        />
                      </div>
                      <div>
                        <Label>Assistências</Label>
                        <Input
                          type="number"
                          value={playerData.assists}
                          onChange={(e) => setPlayerData({...playerData, assists: parseInt(e.target.value) || 0})}
                          disabled={!isGameCompleted}
                        />
                      </div>
                      <div>
                        <Label>Cartões Amarelos</Label>
                        <Input
                          type="number"
                          value={playerData.yellowCards}
                          onChange={(e) => setPlayerData({...playerData, yellowCards: parseInt(e.target.value) || 0})}
                          disabled={!isGameCompleted}
                        />
                      </div>
                      <div>
                        <Label>Cartões Vermelhos</Label>
                        <Input
                          type="number"
                          value={playerData.redCards}
                          onChange={(e) => setPlayerData({...playerData, redCards: parseInt(e.target.value) || 0})}
                          disabled={!isGameCompleted}
                        />
                      </div>
                    </div>

                    {/* Performance Ratings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Avaliações de Performance</h4>
                        
                        <div>
                          <Label>Nota Geral (1-10)</Label>
                          <div className="mt-2">
                            <Slider
                              value={[playerData.rating]}
                              onValueChange={([value]) => setPlayerData({...playerData, rating: value})}
                              max={10}
                              min={1}
                              step={0.1}
                              disabled={!isGameCompleted}
                            />
                            <div className={`text-center mt-1 text-sm font-medium ${getRatingColor(playerData.rating)}`}>
                              {playerData.rating.toFixed(1)}/10
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>Habilidades Técnicas (1-10)</Label>
                          <div className="mt-2">
                            <Slider
                              value={[playerData.technicalSkills]}
                              onValueChange={([value]) => setPlayerData({...playerData, technicalSkills: value})}
                              max={10}
                              min={1}
                              step={1}
                              disabled={!isGameCompleted}
                            />
                            <div className="text-center mt-1 text-sm font-medium">
                              {playerData.technicalSkills}/10
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>Condição Física (1-10)</Label>
                          <div className="mt-2">
                            <Slider
                              value={[playerData.physicalCondition]}
                              onValueChange={([value]) => setPlayerData({...playerData, physicalCondition: value})}
                              max={10}
                              min={1}
                              step={1}
                              disabled={!isGameCompleted}
                            />
                            <div className="text-center mt-1 text-sm font-medium">
                              {playerData.physicalCondition}/10
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>Consciência Tática (1-10)</Label>
                          <div className="mt-2">
                            <Slider
                              value={[playerData.tacticalAwareness]}
                              onValueChange={([value]) => setPlayerData({...playerData, tacticalAwareness: value})}
                              max={10}
                              min={1}
                              step={1}
                              disabled={!isGameCompleted}
                            />
                            <div className="text-center mt-1 text-sm font-medium">
                              {playerData.tacticalAwareness}/10
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>Força Mental (1-10)</Label>
                          <div className="mt-2">
                            <Slider
                              value={[playerData.mentalStrength]}
                              onValueChange={([value]) => setPlayerData({...playerData, mentalStrength: value})}
                              max={10}
                              min={1}
                              step={1}
                              disabled={!isGameCompleted}
                            />
                            <div className="text-center mt-1 text-sm font-medium">
                              {playerData.mentalStrength}/10
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>Liderança (1-10)</Label>
                          <div className="mt-2">
                            <Slider
                              value={[playerData.leadership]}
                              onValueChange={([value]) => setPlayerData({...playerData, leadership: value})}
                              max={10}
                              min={1}
                              step={1}
                              disabled={!isGameCompleted}
                            />
                            <div className="text-center mt-1 text-sm font-medium">
                              {playerData.leadership}/10
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label>Pontos Fortes</Label>
                          <Textarea
                            value={playerData.strengths}
                            onChange={(e) => setPlayerData({...playerData, strengths: e.target.value})}
                            placeholder="Destaque os principais pontos fortes do jogador..."
                            rows={4}
                            disabled={!isGameCompleted}
                          />
                        </div>

                        <div>
                          <Label>Pontos a Melhorar</Label>
                          <Textarea
                            value={playerData.improvements}
                            onChange={(e) => setPlayerData({...playerData, improvements: e.target.value})}
                            placeholder="Identifique áreas que o jogador pode melhorar..."
                            rows={4}
                            disabled={!isGameCompleted}
                          />
                        </div>

                        <div>
                          <Label>Observações</Label>
                          <Textarea
                            value={playerData.notes}
                            onChange={(e) => setPlayerData({...playerData, notes: e.target.value})}
                            placeholder="Observações específicas sobre a performance..."
                            rows={3}
                            disabled={!isGameCompleted}
                          />
                        </div>
                      </div>
                    </div>

                    {isGameCompleted && (
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSavePlayerAnalysis}
                          disabled={savePlayerAnalysisMutation.isPending}
                        >
                          Salvar Análise do Jogador
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo da Equipe</CardTitle>
              </CardHeader>
              <CardContent>
                {teamAnalysis ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getRatingColor(teamAnalysis.teamRating || 0)}`}>
                          {(teamAnalysis.teamRating || 0).toFixed(1)}
                        </div>
                        <p className="text-sm text-fluent-text-secondary">Nota da Equipe</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-fluent-blue">
                          {teamAnalysis.possession || 0}%
                        </div>
                        <p className="text-sm text-fluent-text-secondary">Posse de Bola</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="font-bold">{teamAnalysis.shots || 0}</div>
                        <p className="text-xs text-fluent-text-secondary">Finalizações</p>
                      </div>
                      <div>
                        <div className="font-bold">{teamAnalysis.shotsOnTarget || 0}</div>
                        <p className="text-xs text-fluent-text-secondary">No Gol</p>
                      </div>
                      <div>
                        <div className="font-bold">{teamAnalysis.passAccuracy || 0}%</div>
                        <p className="text-xs text-fluent-text-secondary">Passes</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-fluent-text-secondary text-center py-8">
                    Análise da equipe ainda não disponível
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Player Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo dos Jogadores</CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className={`text-2xl font-bold ${getRatingColor(stats.avgRating)}`}>
                          {stats.avgRating.toFixed(1)}
                        </div>
                        <p className="text-sm text-fluent-text-secondary">Nota Média</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {stats.totalGoals}
                        </div>
                        <p className="text-sm text-fluent-text-secondary">Gols</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.totalAssists}
                        </div>
                        <p className="text-sm text-fluent-text-secondary">Assistências</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Melhores Performances</h4>
                      {playerAnalysis
                        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                        .slice(0, 3)
                        .map((pa, index) => {
                          const athlete = athletes.find((a: any) => a.id === pa.athleteId);
                          if (!athlete) return null;
                          
                          return (
                            <div key={pa.id} className="flex items-center justify-between">
                              <span className="text-sm">
                                {index + 1}. {athlete.firstName} {athlete.lastName}
                              </span>
                              <span className={`text-sm font-medium ${getRatingColor(pa.rating || 0)}`}>
                                {(pa.rating || 0).toFixed(1)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <p className="text-fluent-text-secondary text-center py-8">
                    Análises dos jogadores ainda não disponíveis
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}