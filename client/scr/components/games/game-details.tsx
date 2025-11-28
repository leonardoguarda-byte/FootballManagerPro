import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Target, BarChart3, FileText, Trash2, FileDown, Send } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EnhancedCallUpManager } from "./enhanced-callup-manager";
import { EnhancedAnalysisManager } from "./enhanced-analysis-manager";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GameDetailsProps {
  gameId: string | number;
  game: any; // Pass the game object directly to avoid refetching
  onClose?: () => void; // Callback to close the dialog
}

export function GameDetails({ gameId, game, onClose }: GameDetailsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showSendDialog, setShowSendDialog] = useState(false);
  
  // Check if this is a tournament match (has string ID with tournament_ prefix)
  const isTournamentMatch = typeof gameId === 'string' && gameId.startsWith('tournament_');
  const numericGameId = isTournamentMatch ? null : gameId;

  // Delete game mutation
  const deleteGameMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/games/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({
        title: "Jogo excluído",
        description: "O jogo foi removido com sucesso.",
      });
      // Close the dialog
      if (onClose) {
        onClose();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir jogo",
        description: error.message || "Ocorreu um erro ao tentar excluir o jogo.",
        variant: "destructive",
      });
    },
  });

  // Fetch advanced features for ALL games (including tournament matches)
  const { data: callUps = [] } = useQuery({
    queryKey: [`/api/games/${numericGameId || gameId}/call-ups`],
    enabled: !!numericGameId || !!gameId,
  });

  const { data: lineup = [] } = useQuery({
    queryKey: [`/api/games/${numericGameId || gameId}/lineup`],
    enabled: !!numericGameId || !!gameId,
  });

  const { data: formation } = useQuery({
    queryKey: [`/api/games/${numericGameId || gameId}/formation`],
    enabled: !!numericGameId || !!gameId,
  });

  const { data: playerAnalysis = [] } = useQuery({
    queryKey: [`/api/games/${numericGameId || gameId}/player-analysis`],
    enabled: !!numericGameId || !!gameId,
  });

  const { data: teamAnalysis } = useQuery({
    queryKey: [`/api/games/${numericGameId || gameId}/team-analysis`],
    enabled: !!numericGameId || !!gameId,
  });

  // Fetch athletes data needed for enhanced components
  const { data: athletes = [] } = useQuery({
    queryKey: ['/api/athletes'],
  });

  // Fetch club data for badge
  const { data: club } = useQuery({
    queryKey: ['/api/auth/current-club'],
  });

  if (!game) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-fluent-text-secondary">Jogo não encontrado</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex items-center space-x-4">
                {/* Home Team Badge */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center mb-2 shadow-sm">
                    {(club as any)?.name === 'ESSUBE' || (club as any)?.shortName === 'ESU' ? (
                      <img 
                        src="/uploads/badges/essube-badge.svg" 
                        alt="ESSUBE"
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling!.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg ${(club as any)?.name === 'ESSUBE' || (club as any)?.shortName === 'ESU' ? 'hidden' : ''}`}>
                      {(club as any)?.shortName?.charAt(0) || 'H'}
                    </div>
                  </div>
                  <p className="text-sm font-medium">{game.isHome ? (club as any)?.shortName || 'Casa' : game.opponent}</p>
                </div>

                {/* Score */}
                <div className="text-center px-4">
                  <div className="text-3xl font-bold text-fluent-text">
                    {game.ourScore ?? '-'} × {game.opponentScore ?? '-'}
                  </div>
                  <Badge variant={
                    game.status === 'completed' ? 'default' :
                    game.status === 'scheduled' ? 'secondary' : 'destructive'
                  }>
                    {game.status === 'completed' ? 'Finalizado' :
                     game.status === 'scheduled' ? 'Agendado' : 'Cancelado'}
                  </Badge>
                </div>

                {/* Away Team Badge */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center mb-2 shadow-sm">
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {game.opponent.charAt(0)}
                    </div>
                  </div>
                  <p className="text-sm font-medium">{!game.isHome ? (club as any)?.shortName || 'Casa' : game.opponent}</p>
                </div>
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              {/* Generate Call-up PDF Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`/api/games/${gameId}/generate-callup-pdf`, '_blank');
                }}
                data-testid="button-generate-callup-pdf"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Gerar Convocação
              </Button>

              {/* Send Call-up Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSendDialog(true)}
                data-testid="button-send-callup"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar Convocação
              </Button>

              {/* Delete Button - Only for non-tournament matches */}
              {!isTournamentMatch && numericGameId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      data-testid="button-delete-game"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Jogo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este jogo? Esta ação não pode ser desfeita.
                        Todos os dados relacionados (convocações, escalações, análises) também serão removidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteGameMutation.mutate(numericGameId as number)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deleteGameMutation.isPending}
                      >
                        {deleteGameMutation.isPending ? "Excluindo..." : "Excluir"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Game Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-fluent-text-secondary" />
              <span className="text-sm">{formatDate(game.date)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-fluent-text-secondary" />
              <span className="text-sm">{formatTime(game.time)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-fluent-text-secondary" />
              <span className="text-sm">{game.location}</span>
            </div>
          </div>

          {game.isTournamentMatch && (
            <div className="mt-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Torneio: {game.tournamentName} - {game.phase}
              </Badge>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Game Management Content - Show enhanced features for all games */}
      {isTournamentMatch && (
        /* Tournament Game Header Info */
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações do Torneio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-sm">
                <span className="text-fluent-text-secondary">Torneio:</span>
                <div className="font-medium">{game.tournamentName || 'Não informado'}</div>
              </div>
              <div className="text-sm">
                <span className="text-fluent-text-secondary">Fase:</span>
                <div className="font-medium">{game.phase || 'Não informado'}</div>
              </div>
              <div className="text-sm">
                <span className="text-fluent-text-secondary">Status:</span>
                <Badge variant={
                  game.status === 'completed' ? 'default' :
                  game.status === 'scheduled' ? 'secondary' : 'destructive'
                }>
                  {game.status === 'completed' ? 'Finalizado' :
                   game.status === 'scheduled' ? 'Agendado' : 'Cancelado'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Management Interface for ALL Games */}
      <Tabs defaultValue="callup" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="callup" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Convocação & Escalação</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Análise Completa</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Observações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="callup">
            <EnhancedCallUpManager 
              gameId={numericGameId || gameId} 
              callUps={callUps || []}
              gameStatus={game.status}
              athletes={athletes || []}
              game={game}
            />
          </TabsContent>

          <TabsContent value="analysis">
            <EnhancedAnalysisManager 
              gameId={numericGameId}
              playerAnalysis={playerAnalysis || []}
              teamAnalysis={teamAnalysis}
              lineup={lineup || []}
              callUps={callUps || []}
              athletes={athletes || []}
              gameStatus={game.status}
            />
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Observações do Jogo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-fluent-text-secondary">
                      Observações Técnicas
                    </label>
                    <textarea
                      className="w-full mt-1 p-3 border border-fluent-border rounded-md resize-none"
                      rows={4}
                      placeholder="Observações sobre a performance técnica da equipe..."
                      defaultValue={game.notes || ''}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button>Salvar Observações</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      {/* Send Call-up Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar Convocação</DialogTitle>
            <DialogDescription>
              Confira os atletas convocados e suas informações de contato para compartilhar a convocação.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Instruções:</strong> Baixe o PDF da convocação usando o botão "Gerar Convocação" e compartilhe com os atletas através de WhatsApp, Email ou outro meio de comunicação.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Atletas Confirmados ({callUps?.filter((c: any) => c.callUpStatus === 'confirmed').length || 0})</h4>
              
              {callUps?.filter((c: any) => c.callUpStatus === 'confirmed').map((callUp: any) => {
                const athlete = athletes?.find((a: any) => a?.id === callUp.athleteId);
                if (!athlete) return null;
                
                return (
                  <div key={callUp.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{athlete.firstName} {athlete.lastName}</p>
                      <p className="text-sm text-fluent-text-secondary">{callUp.position || 'Posição não definida'}</p>
                    </div>
                    {athlete.phone && (
                      <div className="text-right">
                        <p className="text-sm text-fluent-text-secondary">Telefone</p>
                        <p className="font-medium">{athlete.phone}</p>
                      </div>
                    )}
                    {!athlete.phone && (
                      <p className="text-sm text-fluent-text-secondary italic">Sem telefone cadastrado</p>
                    )}
                  </div>
                );
              })}

              {(!callUps || callUps.filter((c: any) => c.callUpStatus === 'confirmed').length === 0) && (
                <p className="text-center text-fluent-text-secondary py-4">
                  Nenhum atleta confirmado ainda
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowSendDialog(false)}
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  window.open(`/api/games/${gameId}/generate-callup-pdf`, '_blank');
                  toast({
                    title: "Convocação gerada",
                    description: "O PDF foi gerado. Compartilhe com os atletas!",
                  });
                }}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}