import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import TournamentGroupsForm from "./tournament-groups-form";
import type { TournamentGroup, TournamentTeam, Tournament } from "@shared/schema";

interface TournamentGroupsManagerProps {
  tournamentId: number;
}

export default function TournamentGroupsManager({ tournamentId }: TournamentGroupsManagerProps) {
  const { toast } = useToast();
  const permissions = usePermissions();
  const [showGroupsForm, setShowGroupsForm] = useState(false);
  const [selectedTeamForGroup, setSelectedTeamForGroup] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  const { data: tournament } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
    enabled: !!tournamentId,
  });

  const { data: groups = [], isLoading: loadingGroups } = useQuery<TournamentGroup[]>({
    queryKey: [`/api/tournaments/${tournamentId}/groups`],
    enabled: !!tournamentId,
  });

  const { data: teams = [], isLoading: loadingTeams } = useQuery<TournamentTeam[]>({
    queryKey: [`/api/tournaments/${tournamentId}/teams`],
    enabled: !!tournamentId,
  });

  const assignTeamToGroup = useMutation({
    mutationFn: async ({ teamId, groupId }: { teamId: number; groupId: number }) => {
      const assignments = [{ teamId, groupId }];
      return await apiRequest(`/api/tournaments/${tournamentId}/teams/assign-groups`, "POST", {
        assignments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/teams`] });
      toast({
        title: "Sucesso",
        description: "Time atribuído ao grupo com sucesso!",
      });
      setSelectedTeamForGroup(null);
      setSelectedGroupId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atribuir time ao grupo",
        variant: "destructive",
      });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId: number) => {
      return await apiRequest(`/api/tournament-groups/${groupId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/groups`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/teams`] });
      toast({
        title: "Sucesso",
        description: "Grupo deletado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar grupo",
        variant: "destructive",
      });
    },
  });

  const handleAssignTeam = () => {
    if (selectedTeamForGroup && selectedGroupId) {
      assignTeamToGroup.mutate({
        teamId: selectedTeamForGroup,
        groupId: parseInt(selectedGroupId),
      });
    }
  };

  const handleDeleteGroup = (groupId: number, groupName: string) => {
    if (confirm(`Tem certeza que deseja deletar o grupo "${groupName}"? Os times atribuídos a ele ficarão sem grupo.`)) {
      deleteGroup.mutate(groupId);
    }
  };

  const unassignedTeams = teams.filter(team => !team.groupId);
  const getTeamsByGroup = (groupId: number) => teams.filter(team => team.groupId === groupId);

  if (loadingGroups || loadingTeams || !tournament) {
    return <div className="text-center py-8">Carregando grupos...</div>;
  }

  // Show form if requested and no groups exist yet
  if (showGroupsForm) {
    return (
      <div className="space-y-6">
        <TournamentGroupsForm
          tournament={tournament}
          teams={teams}
          onSuccess={() => setShowGroupsForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Grupos do Torneio</h3>
          <p className="text-sm text-gray-600">
            {groups.length} grupo(s) criado(s)
            {tournament?.jointCategories && tournament.additionalCategories && (
              <span className="ml-2 text-purple-600 font-medium">
                (Categorias Conjuntas: {tournament.category}, {tournament.additionalCategories.join(', ')})
              </span>
            )}
          </p>
        </div>
        {permissions.games.canCreate && (
          <div className="flex gap-2">
            {groups.length === 0 && (
              <Button 
                variant="default" 
                onClick={() => setShowGroupsForm(true)}
                data-testid="button-create-groups"
              >
                <Grid3x3 className="mr-2 w-4 h-4" />
                Criar e Configurar Grupos
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Unassigned Teams */}
      {unassignedTeams.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Times Sem Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassignedTeams.map((team) => (
                <div 
                  key={team.id} 
                  className="flex justify-between items-center p-2 bg-white rounded border"
                  data-testid={`unassigned-team-${team.id}`}
                >
                  <span className="font-medium">{team.teamName}</span>
                  {permissions.games.canEdit && (
                    <div className="flex gap-2">
                      <Select 
                        value={selectedTeamForGroup === team.id ? selectedGroupId : ""}
                        onValueChange={(value) => {
                          setSelectedTeamForGroup(team.id);
                          setSelectedGroupId(value);
                        }}
                      >
                        <SelectTrigger className="w-40" data-testid={`select-group-${team.id}`}>
                          <SelectValue placeholder="Selecione grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.groupName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={handleAssignTeam}
                        disabled={selectedTeamForGroup !== team.id || !selectedGroupId}
                        data-testid={`button-assign-${team.id}`}
                      >
                        Atribuir
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups Display */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Grid3x3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Nenhum grupo criado</h3>
            <p className="text-gray-600 mb-4">
              Crie grupos para organizar os times do torneio
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const groupTeams = getTeamsByGroup(group.id);
            return (
              <Card key={group.id} data-testid={`card-group-${group.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span>{group.groupName}</span>
                      {group.category && (
                        <Badge variant="outline">{group.category}</Badge>
                      )}
                    </CardTitle>
                    {permissions.games.canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGroup(group.id, group.groupName)}
                        disabled={deleteGroup.isPending}
                        data-testid={`button-delete-group-${group.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {groupTeams.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhum time atribuído
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {groupTeams.map((team) => (
                        <li 
                          key={team.id} 
                          className="text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded"
                          data-testid={`team-in-group-${group.id}-${team.id}`}
                        >
                          <div className="flex items-center gap-2">
                            {team.badgeUrl ? (
                              <img
                                src={team.badgeUrl}
                                alt={`${team.teamName} badge`}
                                className="w-6 h-6 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                                  {team.teamName.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span>{team.teamName}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-gray-500 mt-4">
                    {groupTeams.length} time(s)
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
