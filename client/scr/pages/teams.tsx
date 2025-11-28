import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Trophy, Edit, Trash2, Eye, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import TeamForm from "@/components/teams/team-form";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Team } from "@shared/schema";

function ClubBadge({ badge, clubName }: { badge?: string | null; clubName?: string }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [badge]);

  if (!badge || imageError) {
    return (
      <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
        <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-900 p-1">
      <img
        src={badge}
        alt={`Escudo ${clubName || 'do clube'}`}
        className="w-full h-full object-contain"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

export default function Teams() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const { toast } = useToast();
  const permissions = usePermissions();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  const { data: athletes = [] } = useQuery({
    queryKey: ['/api/athletes'],
  });

  const { data: club } = useQuery({
    queryKey: ['/api/auth/current-club'],
  });

  // Função para obter atletas de uma equipe específica
  const getTeamAthletes = (teamId: number) => {
    return athletes.filter((athlete: any) => athlete.teamId === teamId);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/teams/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Sucesso",
        description: "Equipe excluída com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir equipe",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta equipe?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedTeam(null);
  };

  const handleViewTeam = (teamId: number) => {
    setLocation(`/teams/${teamId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Equipes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gerenciar categorias e elencos das equipes
          </p>
        </div>
        {permissions.teams.canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setSelectedTeam(null);
                setIsDialogOpen(true);
              }} data-testid="button-create-team">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Equipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedTeam ? "Editar Equipe" : "Nova Equipe"}
                </DialogTitle>
              </DialogHeader>
              <TeamForm
                team={selectedTeam}
                onSuccess={handleDialogClose}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team: Team) => (
          <Card 
            key={team.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
            onClick={() => handleViewTeam(team.id)}
          >
            {team.teamPhoto && (
              <div className="h-48 w-full bg-gray-100 dark:bg-gray-800">
                <img
                  src={team.teamPhoto}
                  alt={`Foto da equipe ${team.name}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3 flex-1">
                  <ClubBadge badge={club?.logo || club?.badge} clubName={club?.name} />
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {team.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {team.category}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewTeam(team.id);
                    }}
                    title="Ver Detalhes"
                    data-testid={`button-view-team-${team.id}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {permissions.teams.canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(team);
                      }}
                      title="Editar"
                      data-testid={`button-edit-team-${team.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {permissions.teams.canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(team.id);
                      }}
                      disabled={deleteMutation.isPending}
                      title="Excluir"
                      data-testid={`button-delete-team-${team.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {team.ageGroup && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{team.ageGroup}</Badge>
                  <Badge variant={team.isActive ? "default" : "secondary"}>
                    {team.isActive ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              )}
              
              {team.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {team.description}
                </p>
              )}

              <div className="space-y-2 text-sm">
                {team.coachName && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>Treinador: {team.coachName}</span>
                  </div>
                )}
                {team.assistantCoachName && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>Auxiliar: {team.assistantCoachName}</span>
                  </div>
                )}
                {team.physicalTrainerName && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>Prep. Físico: {team.physicalTrainerName}</span>
                  </div>
                )}
                {team.goalkeeperTrainerName && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>Prep. Goleiros: {team.goalkeeperTrainerName}</span>
                  </div>
                )}
              </div>

              {/* Lista de Atletas da Equipe */}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">Atletas ({getTeamAthletes(team.id).length})</span>
                </div>
                {getTeamAthletes(team.id).length > 0 ? (
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {getTeamAthletes(team.id).map((athlete: any) => (
                      <div key={athlete.id} className="flex items-center gap-2 text-xs">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-blue-100">
                          {athlete.profilePhoto ? (
                            <img 
                              src={athlete.profilePhoto} 
                              alt={`${athlete.firstName} ${athlete.lastName}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-blue-600 text-xs font-medium">
                              {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                            </span>
                          )}
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">
                          {athlete.firstName} {athlete.lastName}
                        </span>
                        {athlete.jerseyNumber && (
                          <Badge variant="outline" className="text-xs h-4">
                            #{athlete.jerseyNumber}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">Nenhum atleta vinculado</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No teams yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started by adding your first team category
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Team
          </Button>
        </div>
      )}
    </div>
  );
}