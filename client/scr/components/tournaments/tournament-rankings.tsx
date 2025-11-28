import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, ArrowRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { TournamentGroup, TournamentTeam, Tournament } from "@shared/schema";

interface TournamentRankingsProps {
  tournamentId: number;
  tournament?: Tournament;
}

interface CombinedRankingsResponse {
  byGroup: Record<string, any[]>;
  byCategory: Record<string, any[]>;
}

export function TournamentRankings({ tournamentId, tournament }: TournamentRankingsProps) {
  const { toast } = useToast();
  const permissions = usePermissions();
  
  const { data: groups, isLoading: loadingGroups } = useQuery<TournamentGroup[]>({
    queryKey: [`/api/tournaments/${tournamentId}/groups`],
  });

  const { data: teams, isLoading: loadingTeams } = useQuery<TournamentTeam[]>({
    queryKey: [`/api/tournaments/${tournamentId}/teams`],
  });

  // Fetch combined rankings for joint category tournaments
  const { data: combinedRankings, isLoading: loadingCombined } = useQuery<CombinedRankingsResponse>({
    queryKey: [`/api/tournaments/${tournamentId}/rankings/combined`],
    enabled: !!tournament?.jointCategories,
  });

  const advanceToNextPhase = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tournaments/${tournamentId}/advance-phase`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/matches`] });
      toast({
        title: "Sucesso",
        description: "Times classificados! Partidas da próxima fase criadas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao avançar para próxima fase",
        variant: "destructive",
      });
    },
  });

  if (loadingGroups || loadingTeams || (tournament?.jointCategories && loadingCombined)) {
    return <div className="text-center py-8">Carregando classificação...</div>;
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Nenhum grupo criado ainda
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Crie grupos na aba "Grupos" para visualizar a classificação
        </p>
      </div>
    );
  }

  const sortTeams = (teamsToSort: TournamentTeam[]) => {
    // Use tournament's configured ranking criteria (same logic as backend)
    const criteria = tournament?.rankingCriteria?.split(",") || ["points", "goal_difference", "goals_for"];
    
    return teamsToSort.sort((a, b) => {
      for (const criterion of criteria) {
        let comparison = 0;
        
        switch (criterion.trim()) {
          case "points":
            comparison = (b.points || 0) - (a.points || 0);
            break;
          case "goal_difference":
            const aGD = (a.goalsFor || 0) - (a.goalsAgainst || 0);
            const bGD = (b.goalsFor || 0) - (b.goalsAgainst || 0);
            comparison = bGD - aGD;
            break;
          case "goals_for":
            comparison = (b.goalsFor || 0) - (a.goalsFor || 0);
            break;
          case "wins":
            comparison = (b.wins || 0) - (a.wins || 0);
            break;
          case "goals_against":
            comparison = (a.goalsAgainst || 0) - (b.goalsAgainst || 0); // Lower is better
            break;
          case "yellow_cards":
            comparison = 0; // Yellow cards not implemented yet
            break;
          case "red_cards":
            comparison = 0; // Red cards not implemented yet
            break;
          default:
            // Skip unknown criteria
            comparison = 0;
            break;
        }
        
        if (comparison !== 0) return comparison;
      }
      return 0;
    });
  };

  const getTeamsByGroup = (groupId: number) => {
    const groupTeams = teams?.filter(team => team.groupId === groupId) || [];
    return sortTeams(groupTeams);
  };

  const getAllTeamsSorted = () => {
    if (!teams) return [];
    return sortTeams([...teams]);
  };

  const getGroupName = (groupId: number | null) => {
    if (!groupId) return "Sem grupo";
    const group = groups?.find(g => g.id === groupId);
    return group?.groupName || "Sem grupo";
  };

  const hasEnabledPhases = tournament?.enableRoundOf16 || tournament?.enableQuarterFinals || tournament?.enableSemiFinals || tournament?.enableFinal;

  const renderGroupRankings = () => {
    if (!groups) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map((group) => {
          const groupTeams = getTeamsByGroup(group.id);
          
          if (groupTeams.length === 0) {
            return null;
          }

          return (
            <Card key={group.id} data-testid={`ranking-group-${group.id}`}>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <CardTitle className="flex items-center justify-between">
                  <span>{group.groupName}</span>
                  {group.category && (
                    <Badge variant="outline">{group.category}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid={`table-ranking-${group.id}`}>
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Pos</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Time</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">J</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">V</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">E</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">D</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">GP</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">GC</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">SG</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupTeams.map((team, index) => {
                        const goalDifference = (team.goalsFor || 0) - (team.goalsAgainst || 0);
                        const isQualified = index < 2; // Top 2 teams qualify
                        
                        return (
                          <tr
                            key={team.id}
                            className={`border-b hover:bg-gray-50 dark:hover:bg-gray-900 ${
                              isQualified ? 'bg-green-50 dark:bg-green-950' : ''
                            }`}
                            data-testid={`ranking-team-${team.id}`}
                          >
                            <td className="px-4 py-3 text-center font-semibold">
                              {index === 0 && <Trophy className="w-4 h-4 inline text-yellow-500" />}
                              {index === 0 ? '' : index + 1}
                            </td>
                            <td className="px-4 py-3">
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
                                <span className="font-medium text-sm">{team.teamName}</span>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-center text-sm">{team.matchesPlayed || 0}</td>
                            <td className="px-2 py-3 text-center text-sm text-green-600 dark:text-green-400 font-semibold">
                              {team.wins || 0}
                            </td>
                            <td className="px-2 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                              {team.draws || 0}
                            </td>
                            <td className="px-2 py-3 text-center text-sm text-red-600 dark:text-red-400 font-semibold">
                              {team.losses || 0}
                            </td>
                            <td className="px-2 py-3 text-center text-sm">{team.goalsFor || 0}</td>
                            <td className="px-2 py-3 text-center text-sm">{team.goalsAgainst || 0}</td>
                            <td className={`px-2 py-3 text-center text-sm font-semibold ${
                              goalDifference > 0 ? 'text-green-600 dark:text-green-400' :
                              goalDifference < 0 ? 'text-red-600 dark:text-red-400' :
                              'text-gray-600 dark:text-gray-400'
                            }`}>
                              {goalDifference > 0 ? '+' : ''}{goalDifference}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Badge className="bg-blue-600 text-white font-bold">
                                {team.points || 0}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {groupTeams.some((_, idx) => idx < 2) && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 border-t">
                    <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                      Times classificados para a próxima fase
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderGeneralRanking = () => {
    // Use byGroup rankings for joint category tournaments
    const isJointCategories = tournament?.jointCategories && combinedRankings;
    
    if (isJointCategories && combinedRankings?.byGroup) {
      // Render separate ranking tables for each group
      const groupNames = Object.keys(combinedRankings.byGroup);
      
      if (groupNames.length === 0) {
        return (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Nenhum grupo criado ainda
            </p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groupNames.map((groupName) => {
            const groupTeams = combinedRankings.byGroup[groupName];
            
            if (groupTeams.length === 0) return null;

            return (
              <Card key={groupName} data-testid={`general-ranking-${groupName}`}>
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                  <CardTitle>Classificação Geral - {groupName}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid={`table-general-ranking-${groupName}`}>
                      <thead className="bg-gray-50 dark:bg-gray-900 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Pos</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Time</th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">J</th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">V</th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">E</th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">D</th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">GP</th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">GC</th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">SG</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupTeams.map((team, index) => {
                          const goalDifference = (team.goalsFor || 0) - (team.goalsAgainst || 0);
                          
                          return (
                            <tr
                              key={team.clubId || team.adversaryTeamId || index}
                              className="border-b hover:bg-gray-50 dark:hover:bg-gray-900"
                              data-testid={`general-ranking-team-${team.clubId || team.adversaryTeamId || index}`}
                            >
                              <td className="px-4 py-3 text-center font-semibold">
                                {index === 0 && <Trophy className="w-4 h-4 inline text-yellow-500" />}
                                {index === 0 ? '' : index + 1}
                              </td>
                              <td className="px-4 py-3">
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
                                  <span className="font-medium text-sm">{team.teamName}</span>
                                </div>
                              </td>
                              <td className="px-2 py-3 text-center text-sm">{team.matchesPlayed || 0}</td>
                              <td className="px-2 py-3 text-center text-sm text-green-600 dark:text-green-400 font-semibold">
                                {team.wins || 0}
                              </td>
                              <td className="px-2 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                                {team.draws || 0}
                              </td>
                              <td className="px-2 py-3 text-center text-sm text-red-600 dark:text-red-400 font-semibold">
                                {team.losses || 0}
                              </td>
                              <td className="px-2 py-3 text-center text-sm">{team.goalsFor || 0}</td>
                              <td className="px-2 py-3 text-center text-sm">{team.goalsAgainst || 0}</td>
                              <td className={`px-2 py-3 text-center text-sm font-semibold ${
                                goalDifference > 0 ? 'text-green-600 dark:text-green-400' :
                                goalDifference < 0 ? 'text-red-600 dark:text-red-400' :
                                'text-gray-600 dark:text-gray-400'
                              }`}>
                                {goalDifference > 0 ? '+' : ''}{goalDifference}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Badge className="bg-blue-600 text-white font-bold">
                                  {team.points || 0}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }

    // Regular tournament: show all teams in one table with group column
    const allTeams = getAllTeamsSorted();

    if (allTeams.length === 0) {
      return (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Nenhum time cadastrado ainda
          </p>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardTitle>Classificação Geral</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-general-ranking">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Pos</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Grupo</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">J</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">V</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">E</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">D</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">GP</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">GC</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">SG</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Pts</th>
                </tr>
              </thead>
              <tbody>
                {allTeams.map((team, index) => {
                  const goalDifference = (team.goalsFor || 0) - (team.goalsAgainst || 0);
                  
                  return (
                    <tr
                      key={team.id || index}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-900"
                      data-testid={`general-ranking-team-${team.id || index}`}
                    >
                      <td className="px-4 py-3 text-center font-semibold">
                        {index === 0 && <Trophy className="w-4 h-4 inline text-yellow-500" />}
                        {index === 0 ? '' : index + 1}
                      </td>
                      <td className="px-4 py-3">
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
                          <span className="font-medium text-sm">{team.teamName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {getGroupName(team.groupId)}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-center text-sm">{team.matchesPlayed || 0}</td>
                      <td className="px-2 py-3 text-center text-sm text-green-600 dark:text-green-400 font-semibold">
                        {team.wins || 0}
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        {team.draws || 0}
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-red-600 dark:text-red-400 font-semibold">
                        {team.losses || 0}
                      </td>
                      <td className="px-2 py-3 text-center text-sm">{team.goalsFor || 0}</td>
                      <td className="px-2 py-3 text-center text-sm">{team.goalsAgainst || 0}</td>
                      <td className={`px-2 py-3 text-center text-sm font-semibold ${
                        goalDifference > 0 ? 'text-green-600 dark:text-green-400' :
                        goalDifference < 0 ? 'text-red-600 dark:text-red-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {goalDifference > 0 ? '+' : ''}{goalDifference}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge className="bg-blue-600 text-white font-bold">
                          {team.points || 0}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" data-testid="tournament-rankings">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Classificação</h2>
        </div>
        
        {permissions.games.canCreate && hasEnabledPhases && groups && groups.length > 0 && (
          <Button
            onClick={() => advanceToNextPhase.mutate()}
            disabled={advanceToNextPhase.isPending}
            data-testid="button-advance-phase"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            {advanceToNextPhase.isPending ? "Processando..." : "Finalizar Fase de Grupos"}
          </Button>
        )}
      </div>

      <Tabs defaultValue="groups" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="groups" data-testid="tab-groups">Por Grupo</TabsTrigger>
          <TabsTrigger value="general" data-testid="tab-general">Classificação Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-6">
          {renderGroupRankings()}
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          {renderGeneralRanking()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
