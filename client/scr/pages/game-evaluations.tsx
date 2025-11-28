import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Calendar, MapPin, Clock, Trophy, Plus, Edit2, BarChart3 } from "lucide-react";
import GameEvaluationForm from "@/components/games/game-evaluation-form";
import GameEvaluationEditForm from "@/components/games/game-evaluation-edit-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function GameEvaluations() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [isEvaluationFormOpen, setIsEvaluationFormOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: game, isLoading: gameLoading } = useQuery({
    queryKey: [`/api/games/${id}`],
    retry: false,
  });

  // Get user's own evaluations
  const { data: myEvaluations, isLoading: myEvaluationsLoading, refetch: refetchMyEvaluations } = useQuery({
    queryKey: [`/api/game-evaluations?gameId=${id}&evaluatedBy=${user?.id}`],
    retry: false,
    enabled: !!user?.id,
  });

  // Get evaluations grouped by evaluator for report
  const { data: evaluationsByEvaluator, isLoading: byEvaluatorLoading } = useQuery({
    queryKey: [`/api/game-evaluations/${id}/by-evaluator`],
    retry: false,
  });

  // Get evaluation averages for report
  const { data: evaluationAverages, isLoading: averagesLoading } = useQuery({
    queryKey: [`/api/game-evaluations/${id}/average`],
    retry: false,
  });

  const { data: athletes } = useQuery({
    queryKey: ["/api/athletes"],
    retry: false,
  });

  // Update evaluation mutation
  const updateEvaluationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/game-evaluations/${data.id}`, "PUT", data);
    },
    onSuccess: () => {
      // Invalidate all evaluation queries
      queryClient.invalidateQueries({ queryKey: ["/api/game-evaluations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/game-evaluations/${id}/by-evaluator`] });
      queryClient.invalidateQueries({ queryKey: [`/api/game-evaluations/${id}/average`] });
      toast({
        title: "Sucesso",
        description: "Avaliação atualizada com sucesso!",
      });
      setEditingEvaluation(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar avaliação.",
        variant: "destructive",
      });
    }
  });

  if (gameLoading || myEvaluationsLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="text-fluent-text-secondary">Carregando avaliações...</div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="text-fluent-text-secondary">Jogo não encontrado.</div>
        </div>
      </div>
    );
  }

  const formatScore = (game: any) => {
    if (game.status === "completed" && game.ourScore !== null && game.opponentScore !== null) {
      return `${game.ourScore} x ${game.opponentScore}`;
    }
    return "vs";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800">Agendado</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Finalizado</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "friendly":
        return <Badge variant="outline">Amistoso</Badge>;
      case "league":
        return <Badge variant="outline">Campeonato</Badge>;
      case "cup":
        return <Badge variant="outline">Copa</Badge>;
      case "tournament":
        return <Badge variant="outline">Torneio</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getAthleteById = (athleteId: number) => {
    return athletes?.find((a: any) => a.id === athleteId);
  };

  const safeRating = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getPerformanceLevel = (rating: number) => {
    if (rating >= 4.5) return "Excelente";
    if (rating >= 4) return "Muito Bom";
    if (rating >= 3) return "Bom";
    if (rating >= 2) return "Regular";
    return "Precisa Melhorar";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/games")}
            className="text-fluent-text-secondary hover:text-fluent-text"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Jogos
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-fluent-text">
              Avaliações do Jogo
            </h1>
            <p className="text-fluent-text-secondary">
              {formatScore(game)} {game.opponent}
            </p>
          </div>
        </div>
      </div>

      {/* Game Summary */}
      <Card className="fluent-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl text-fluent-text">
                {formatScore(game)} {game.opponent}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-2">
                {getTypeBadge(game.type)}
                {getStatusBadge(game.status)}
                <Badge className={game.isHome ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
                  {game.isHome ? "Casa" : "Fora"}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-fluent-text-secondary" />
              {new Date(game.date).toLocaleDateString("pt-BR")}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-fluent-text-secondary" />
              {game.time}
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-fluent-text-secondary" />
              {game.location}
            </div>
            <div className="flex items-center">
              <Trophy className="w-4 h-4 mr-2 text-fluent-text-secondary" />
              {game.category}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations with Tabs */}
      <Tabs defaultValue="my-evaluations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-evaluations" data-testid="tab-my-evaluations">
            <Edit2 className="w-4 h-4 mr-2" />
            Minhas Avaliações
          </TabsTrigger>
          <TabsTrigger value="report" data-testid="tab-report">
            <BarChart3 className="w-4 h-4 mr-2" />
            Relatório Consolidado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-evaluations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fluent-text flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Minhas Avaliações dos Atletas
            </h2>
            <div className="flex items-center space-x-4">
              {myEvaluations && myEvaluations.length > 0 && (
                <div className="text-sm text-fluent-text-secondary">
                  {myEvaluations.length} avaliação(ões)
                </div>
              )}
              {game && game.status === "completed" && (
                <Button
                  onClick={() => setIsEvaluationFormOpen(true)}
                  className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
                  data-testid="button-add-evaluation"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Avaliação
                </Button>
              )}
            </div>
          </div>

          {myEvaluations && myEvaluations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myEvaluations.map((evaluation: any) => {
              const athlete = getAthleteById(evaluation.athleteId);
              return (
                <Card key={evaluation.id} className="fluent-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-fluent-text">
                      {athlete ? `${athlete.firstName} ${athlete.lastName}` : `Atleta #${evaluation.athleteId}`}
                    </CardTitle>
                    {athlete && (
                      <div className="text-sm text-fluent-text-secondary">
                        {athlete.position} • {athlete.category}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Nota Geral:</span>
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const overallRating = safeRating(evaluation.overallRating) || safeRating(evaluation.rating);
                          return (
                            <>
                              <span className={`text-lg font-bold ${getRatingColor(overallRating)}`}>
                                {overallRating.toFixed(1)}
                              </span>
                              <span className="text-xs text-fluent-text-secondary">
                                {getPerformanceLevel(overallRating)}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Técnica:</span>
                        <span className={getRatingColor(safeRating(evaluation.technicalRating))}>
                          {safeRating(evaluation.technicalRating).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Física:</span>
                        <span className={getRatingColor(safeRating(evaluation.physicalRating))}>
                          {safeRating(evaluation.physicalRating).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tática:</span>
                        <span className={getRatingColor(safeRating(evaluation.tacticalRating))}>
                          {safeRating(evaluation.tacticalRating).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mental:</span>
                        <span className={getRatingColor(safeRating(evaluation.mentalRating))}>
                          {safeRating(evaluation.mentalRating).toFixed(1)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span>Gols:</span>
                        <span className="font-medium">{evaluation.goals || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Assistências:</span>
                        <span className="font-medium">{evaluation.assists || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Passes Errados:</span>
                        <span className="font-medium">{evaluation.missedPasses || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Roubadas de Bola:</span>
                        <span className="font-medium">{evaluation.ballSteals || 0}</span>
                      </div>
                      {evaluation.minutesPlayed && (
                        <div className="flex justify-between">
                          <span>Minutos:</span>
                          <span className="font-medium">{evaluation.minutesPlayed}</span>
                        </div>
                      )}
                    </div>

                    {evaluation.notes && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-fluent-text-secondary">
                          {evaluation.notes}
                        </p>
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingEvaluation(evaluation)}
                        className="w-full"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Editar Avaliação
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="fluent-shadow">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-fluent-text-secondary mb-4" />
              <div className="text-fluent-text-secondary">
                Nenhuma avaliação registrada para este jogo.
              </div>
              <p className="text-sm text-fluent-text-secondary mt-2">
                As avaliações são criadas automaticamente após o jogo ser finalizado.
              </p>
            </CardContent>
          </Card>
        )}
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-fluent-text flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Relatório Consolidado
            </h2>

            {byEvaluatorLoading || averagesLoading ? (
              <div className="text-center py-8">
                <div className="text-fluent-text-secondary">Carregando relatório...</div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Averages Section */}
                {evaluationAverages && evaluationAverages.length > 0 && (
                  <Card className="fluent-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg text-fluent-text">Média das Avaliações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {evaluationAverages.map((avg: any) => {
                          const athlete = getAthleteById(avg.athleteId);
                          return (
                            <div key={avg.athleteId} className="border-b last:border-b-0 pb-4 last:pb-0">
                              <div className="font-medium text-fluent-text mb-2">
                                {athlete ? `${athlete.firstName} ${athlete.lastName}` : `Atleta #${avg.athleteId}`}
                                <span className="text-sm text-fluent-text-secondary ml-2">
                                  ({avg.evaluationCount} avaliações)
                                </span>
                              </div>
                              <div className="grid grid-cols-5 gap-2 text-sm">
                                <div>
                                  <div className="text-fluent-text-secondary">Geral</div>
                                  <div className={`font-bold ${getRatingColor(Number(avg.avgOverallRating))}`}>
                                    {avg.avgOverallRating}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-fluent-text-secondary">Técnico</div>
                                  <div className="font-medium">{avg.avgTechnicalRating}</div>
                                </div>
                                <div>
                                  <div className="text-fluent-text-secondary">Físico</div>
                                  <div className="font-medium">{avg.avgPhysicalRating}</div>
                                </div>
                                <div>
                                  <div className="text-fluent-text-secondary">Tático</div>
                                  <div className="font-medium">{avg.avgTacticalRating}</div>
                                </div>
                                <div>
                                  <div className="text-fluent-text-secondary">Mental</div>
                                  <div className="font-medium">{avg.avgMentalRating}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Evaluations by Evaluator */}
                {evaluationsByEvaluator && Object.keys(evaluationsByEvaluator).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-fluent-text">Avaliações por Membro da Comissão</h3>
                    {Object.values(evaluationsByEvaluator).map((group: any) => (
                      <Card key={group.evaluator.id} className="fluent-shadow">
                        <CardHeader>
                          <CardTitle className="text-base text-fluent-text">
                            {group.evaluator.name}
                            <Badge variant="outline" className="ml-2">{group.evaluator.role}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {group.evaluations.map((evaluation: any) => {
                              const athlete = getAthleteById(evaluation.athleteId);
                              return (
                                <div key={evaluation.id} className="text-sm border-b last:border-b-0 pb-3 last:pb-0">
                                  <div className="font-medium text-fluent-text mb-1">
                                    {athlete ? `${athlete.firstName} ${athlete.lastName}` : `Atleta #${evaluation.athleteId}`}
                                  </div>
                                  <div className="grid grid-cols-5 gap-2">
                                    <div>
                                      <span className="text-fluent-text-secondary">Geral: </span>
                                      <span className={`font-medium ${getRatingColor(safeRating(evaluation.overallRating))}`}>
                                        {safeRating(evaluation.overallRating).toFixed(1)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-fluent-text-secondary">Técnico: </span>
                                      <span className="font-medium">{safeRating(evaluation.technicalRating).toFixed(1)}</span>
                                    </div>
                                    <div>
                                      <span className="text-fluent-text-secondary">Físico: </span>
                                      <span className="font-medium">{safeRating(evaluation.physicalRating).toFixed(1)}</span>
                                    </div>
                                    <div>
                                      <span className="text-fluent-text-secondary">Tático: </span>
                                      <span className="font-medium">{safeRating(evaluation.tacticalRating).toFixed(1)}</span>
                                    </div>
                                    <div>
                                      <span className="text-fluent-text-secondary">Mental: </span>
                                      <span className="font-medium">{safeRating(evaluation.mentalRating).toFixed(1)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {(!evaluationsByEvaluator || Object.keys(evaluationsByEvaluator).length === 0) && (
                  <Card className="fluent-shadow">
                    <CardContent className="p-8 text-center">
                      <BarChart3 className="w-12 h-12 mx-auto text-fluent-text-secondary mb-4" />
                      <div className="text-fluent-text-secondary">
                        Nenhuma avaliação disponível para gerar relatório.
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Evaluation Form Dialog */}
      <Dialog open={isEvaluationFormOpen} onOpenChange={setIsEvaluationFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Avaliação de Jogo</DialogTitle>
          </DialogHeader>
          <GameEvaluationForm 
            gameId={parseInt(id || "0")} 
            onClose={() => setIsEvaluationFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Evaluation Dialog */}
      <Dialog open={!!editingEvaluation} onOpenChange={() => setEditingEvaluation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Avaliação</DialogTitle>
          </DialogHeader>
          {editingEvaluation && (
            <GameEvaluationEditForm 
              evaluation={editingEvaluation}
              gameId={parseInt(id || "0")} 
              onClose={() => setEditingEvaluation(null)}
              onSuccess={() => {
                refetchMyEvaluations();
                setEditingEvaluation(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}