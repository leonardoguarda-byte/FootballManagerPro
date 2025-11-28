import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Trophy, Calendar, Users, MapPin, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import TournamentCreationForm from "@/components/tournaments/tournament-creation-form";
import type { Tournament } from "@shared/schema";

export default function TournamentManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const permissions = usePermissions();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: tournaments, isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
    enabled: !!user,
  });

  const deleteTournament = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/tournaments/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Sucesso",
        description: "Torneio excluído com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir torneio",
        variant: "destructive",
      });
    },
  });

  const syncClubBadge = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/sync-club-badge", "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Sucesso",
        description: "Emblemas sincronizados com sucesso! Todos os times de torneio agora usam o emblema do clube.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao sincronizar emblemas",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
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
        <div className="text-center">Carregando torneios...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestão de Torneios</h1>
            <p className="text-gray-600">Gerencie todos os seus torneios e competições</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => syncClubBadge.mutate()}
              disabled={syncClubBadge.isPending}
              data-testid="button-sync-badges"
              title="Sincronizar emblema do clube com todos os times de torneio"
            >
              <RefreshCw className={`mr-2 w-4 h-4 ${syncClubBadge.isPending ? 'animate-spin' : ''}`} />
              Sincronizar Emblemas
            </Button>
            {permissions.tournaments.canCreate && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-tournament">
                    <Plus className="mr-2 w-4 h-4" />
                    Criar Torneio
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Torneio</DialogTitle>
                    <DialogDescription>
                      Configure os detalhes do seu novo torneio
                    </DialogDescription>
                  </DialogHeader>
                  <TournamentCreationForm
                    onSuccess={() => setShowCreateDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Tournament List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments?.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="text-center py-12">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Nenhum torneio encontrado</h3>
                <p className="text-gray-600 mb-4">
                  {permissions.tournaments.canCreate 
                    ? "Crie seu primeiro torneio para começar a organizar competições"
                    : "Não há torneios cadastrados no momento"}
                </p>
                {permissions.tournaments.canCreate && (
                  <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-tournament">
                    <Plus className="mr-2 w-4 h-4" />
                    Criar Primeiro Torneio
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            tournaments?.map((tournament: Tournament) => (
              <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{tournament.name}</CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(tournament.status)}
                        <Badge variant="outline">{tournament.format}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(tournament.startDate).toLocaleDateString('pt-BR')} - {new Date(tournament.endDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Máx. {tournament.maxTeams} times</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      <span>{tournament.category}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/tournaments/${tournament.id}`}
                      data-testid={`button-view-tournament-${tournament.id}`}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    {permissions.tournaments.canDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteTournament.mutate(tournament.id)}
                        disabled={deleteTournament.isPending}
                        data-testid={`button-delete-tournament-${tournament.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}