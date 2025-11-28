import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Users, Trophy, Trash2, Info, TrendingUp, Settings } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tournament } from "@shared/schema";
import TournamentTeamsManager from "@/components/tournaments/tournament-teams-manager";
import TournamentGroupsManager from "@/components/tournaments/tournament-groups-manager";
import TournamentMatchesManager from "@/components/tournaments/tournament-matches-manager";
import { TournamentRankings } from "@/components/tournaments/tournament-rankings";
import { TournamentFinalPhases } from "@/components/tournaments/tournament-final-phases";
import { TournamentSettings } from "@/components/tournaments/tournament-settings";

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState("info");

  const { data: tournament, isLoading } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${id}`],
    enabled: !!id,
  });

  const deleteTournament = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/tournaments/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Sucesso",
        description: "Torneio excluído com sucesso!",
      });
      setLocation("/tournament-management");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir torneio",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      planned: { label: "Planejado", variant: "secondary" as const },
      upcoming: { label: "Próximo", variant: "secondary" as const },
      ongoing: { label: "Em Andamento", variant: "default" as const },
      completed: { label: "Finalizado", variant: "outline" as const },
      cancelled: { label: "Cancelado", variant: "destructive" as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Carregando detalhes do torneio...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Torneio não encontrado</h3>
            <p className="text-gray-600 mb-4">
              O torneio que você está procurando não existe ou foi excluído.
            </p>
            <Button onClick={() => setLocation("/tournament-management")}>
              <ArrowLeft className="mr-2 w-4 h-4" />
              Voltar para Gestão de Torneios
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/tournament-management")}
            className="mb-4"
            data-testid="button-back-tournaments"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Voltar
          </Button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="text-tournament-name">{tournament.name}</h1>
              <div className="flex items-center gap-2">
                {getStatusBadge(tournament.status)}
                <Badge variant="outline" data-testid="badge-format">{tournament.format}</Badge>
                <Badge variant="outline" data-testid="badge-category">{tournament.category}</Badge>
              </div>
            </div>
            {permissions.games.canDelete && (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja excluir este torneio?")) {
                      deleteTournament.mutate();
                    }
                  }}
                  disabled={deleteTournament.isPending}
                  data-testid="button-delete-tournament"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7" data-testid="tabs-tournament">
            <TabsTrigger value="info" data-testid="tab-info">
              <Info className="w-4 h-4 mr-2" />
              Info
            </TabsTrigger>
            <TabsTrigger value="teams" data-testid="tab-teams">
              <Users className="w-4 h-4 mr-2" />
              Times
            </TabsTrigger>
            <TabsTrigger value="groups" data-testid="tab-groups">
              <Trophy className="w-4 h-4 mr-2" />
              Grupos
            </TabsTrigger>
            <TabsTrigger value="rankings" data-testid="tab-rankings">
              <TrendingUp className="w-4 h-4 mr-2" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="final-phases" data-testid="tab-final-phases">
              <Trophy className="w-4 h-4 mr-2" />
              Fase Final
            </TabsTrigger>
            <TabsTrigger value="matches" data-testid="tab-matches">
              <Calendar className="w-4 h-4 mr-2" />
              Partidas
            </TabsTrigger>
            {permissions.games.canEdit && (
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Settings className="w-4 h-4 mr-2" />
                Config
              </TabsTrigger>
            )}
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Torneio</CardTitle>
                <CardDescription>{tournament.description || "Sem descrição"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Data de Início</p>
                      <p className="font-medium" data-testid="text-start-date">
                        {new Date(tournament.startDate).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Data de Término</p>
                      <p className="font-medium" data-testid="text-end-date">
                        {new Date(tournament.endDate).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Máximo de Times</p>
                      <p className="font-medium" data-testid="text-max-teams">{tournament.maxTeams}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Categoria</p>
                      <p className="font-medium" data-testid="text-category">{tournament.category}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rules Card */}
            {tournament.rules && (
              <Card>
                <CardHeader>
                  <CardTitle>Regras e Configurações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {typeof tournament.rules === 'string' ? (
                      (() => {
                        try {
                          const rules = JSON.parse(tournament.rules);
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {rules.pointsForWin !== undefined && (
                                <div>
                                  <p className="text-sm text-gray-500">Pontos por Vitória</p>
                                  <p className="font-medium" data-testid="text-points-win">{rules.pointsForWin}</p>
                                </div>
                              )}
                              {rules.pointsForDraw !== undefined && (
                                <div>
                                  <p className="text-sm text-gray-500">Pontos por Empate</p>
                                  <p className="font-medium" data-testid="text-points-draw">{rules.pointsForDraw}</p>
                                </div>
                              )}
                              {rules.pointsForLoss !== undefined && (
                                <div>
                                  <p className="text-sm text-gray-500">Pontos por Derrota</p>
                                  <p className="font-medium" data-testid="text-points-loss">{rules.pointsForLoss}</p>
                                </div>
                              )}
                              {rules.numberOfGroups && (
                                <div>
                                  <p className="text-sm text-gray-500">Número de Grupos</p>
                                  <p className="font-medium" data-testid="text-number-groups">{rules.numberOfGroups}</p>
                                </div>
                              )}
                              {rules.rankingCriteria && Array.isArray(rules.rankingCriteria) && (
                                <div className="md:col-span-2">
                                  <p className="text-sm text-gray-500 mb-2">Critérios de Classificação</p>
                                  <div className="flex flex-wrap gap-2">
                                    {rules.rankingCriteria.map((criterion: string, index: number) => (
                                      <Badge key={index} variant="secondary">
                                        {criterion}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        } catch (e) {
                          return <p className="text-gray-600">{tournament.rules}</p>;
                        }
                      })()
                    ) : (
                      <p className="text-gray-600">Nenhuma regra configurada</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <TournamentTeamsManager tournamentId={parseInt(id!)} />
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups">
            <TournamentGroupsManager tournamentId={parseInt(id!)} />
          </TabsContent>

          {/* Rankings Tab */}
          <TabsContent value="rankings">
            <TournamentRankings tournamentId={parseInt(id!)} tournament={tournament} />
          </TabsContent>

          {/* Final Phases Tab */}
          <TabsContent value="final-phases">
            <TournamentFinalPhases tournamentId={parseInt(id!)} tournament={tournament} />
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <TournamentMatchesManager tournamentId={parseInt(id!)} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <TournamentSettings tournament={tournament} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
