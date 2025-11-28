import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Grid3x3 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TournamentTeam, Tournament } from "@shared/schema";

interface TournamentGroupsFormProps {
  tournament: Tournament;
  teams: TournamentTeam[];
  onSuccess: () => void;
}

interface GroupSetup {
  id: string;
  name: string;
  clubIds: number[];
}

export default function TournamentGroupsForm({ tournament, teams, onSuccess }: TournamentGroupsFormProps) {
  const { toast } = useToast();
  const [numberOfGroups, setNumberOfGroups] = useState<number>(2);
  const [groups, setGroups] = useState<GroupSetup[]>([]);
  const [step, setStep] = useState<'count' | 'distribution'>('count');

  // Group teams by club
  // Use adversaryTeamId for adversaries, fallback to clubId for internal teams
  const clubsMap = new Map<string, TournamentTeam[]>();
  teams.forEach(team => {
    const clubKey = team.adversaryTeamId?.toString() || team.clubId?.toString() || team.teamName;
    if (!clubsMap.has(clubKey)) {
      clubsMap.set(clubKey, []);
    }
    clubsMap.get(clubKey)!.push(team);
  });

  const availableClubs = Array.from(clubsMap.entries()).map(([clubKey, clubTeams]) => ({
    id: parseInt(clubKey) || 0, // Parse back to number for compatibility
    key: clubKey, // Keep original key for grouping
    name: clubTeams[0].teamName,
    badgeUrl: clubTeams[0].badgeUrl,
    categories: clubTeams.map(t => t.category).filter(Boolean),
  }));

  const createGroups = useMutation({
    mutationFn: async (data: { groups: GroupSetup[] }) => {
      return await apiRequest(`/api/tournaments/${tournament.id}/create-groups-manual`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}/groups`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}/teams`] });
      toast({
        title: "Sucesso",
        description: "Grupos criados e espelhados com sucesso!",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar grupos",
        variant: "destructive",
      });
    },
  });

  const handleSetGroupCount = () => {
    if (numberOfGroups < 2 || numberOfGroups > 8) {
      toast({
        title: "Erro",
        description: "O número de grupos deve estar entre 2 e 8",
        variant: "destructive",
      });
      return;
    }

    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const newGroups: GroupSetup[] = [];
    
    for (let i = 0; i < numberOfGroups; i++) {
      newGroups.push({
        id: `group_${i}`,
        name: `Grupo ${groupNames[i]}`,
        clubIds: [],
      });
    }

    setGroups(newGroups);
    setStep('distribution');
  };

  const addClubToGroup = (groupId: string, clubId: number) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        // Check if club is already in this group
        if (group.clubIds.includes(clubId)) {
          return group;
        }
        return { ...group, clubIds: [...group.clubIds, clubId] };
      }
      return group;
    }));
  };

  const removeClubFromGroup = (groupId: string, clubId: number) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return { ...group, clubIds: group.clubIds.filter(id => id !== clubId) };
      }
      return group;
    }));
  };

  const handleSubmit = () => {
    // Validation: check if all clubs are assigned
    const assignedClubs = new Set(groups.flatMap(g => g.clubIds));
    
    if (assignedClubs.size === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um clube aos grupos",
        variant: "destructive",
      });
      return;
    }

    createGroups.mutate({ groups });
  };

  if (step === 'count') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configurar Grupos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="group-count">Quantos grupos terá o torneio?</Label>
            <Input
              id="group-count"
              type="number"
              min={2}
              max={8}
              value={numberOfGroups}
              onChange={(e) => setNumberOfGroups(parseInt(e.target.value) || 2)}
              className="mt-2"
              data-testid="input-group-count"
            />
            <p className="text-sm text-gray-500 mt-1">
              Os grupos serão espelhados em todas as categorias do torneio
            </p>
          </div>
          <Button onClick={handleSetGroupCount} className="w-full" data-testid="button-next-step">
            <Grid3x3 className="mr-2 w-4 h-4" />
            Continuar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Distribuir Clubes nos Grupos</h3>
          <p className="text-sm text-gray-600">
            Adicione clubes aos grupos. Os grupos serão espelhados em todas as categorias.
          </p>
        </div>
        <Button variant="outline" onClick={() => setStep('count')} data-testid="button-back">
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <Card key={group.id} data-testid={`card-${group.id}`}>
            <CardHeader>
              <CardTitle className="text-base">{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Select to add clubs */}
              <Select onValueChange={(value) => addClubToGroup(group.id, parseInt(value))}>
                <SelectTrigger data-testid={`select-club-${group.id}`}>
                  <SelectValue placeholder="Adicionar clube" />
                </SelectTrigger>
                <SelectContent>
                  {availableClubs.map((club) => (
                    <SelectItem 
                      key={club.id} 
                      value={club.id.toString()}
                      disabled={groups.some(g => g.clubIds.includes(club.id))}
                    >
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* List of clubs in this group */}
              <div className="space-y-2">
                {group.clubIds.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhum clube adicionado
                  </p>
                ) : (
                  group.clubIds.map((clubId) => {
                    const club = availableClubs.find(c => c.id === clubId);
                    if (!club) return null;
                    
                    return (
                      <div
                        key={clubId}
                        className="flex items-center justify-between p-2 border rounded"
                        data-testid={`club-item-${group.id}-${clubId}`}
                      >
                        <div className="flex items-center gap-2">
                          {club.badgeUrl && (
                            <img
                              src={club.badgeUrl}
                              alt={club.name}
                              className="w-8 h-8 object-contain"
                            />
                          )}
                          <span className="text-sm font-medium">{club.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeClubFromGroup(group.id, clubId)}
                          data-testid={`button-remove-club-${group.id}-${clubId}`}
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          onClick={handleSubmit}
          disabled={createGroups.isPending}
          data-testid="button-create-groups"
        >
          {createGroups.isPending ? "Criando..." : "Criar Grupos"}
        </Button>
      </div>
    </div>
  );
}
