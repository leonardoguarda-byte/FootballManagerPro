import { Trophy, Users } from "lucide-react";
import { TournamentKnockout } from "./tournament-knockout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tournament, TournamentGroup, TournamentTeam } from "@shared/schema";

interface TournamentFinalPhasesProps {
  tournamentId: number;
  tournament: Tournament;
}

export function TournamentFinalPhases({ tournamentId, tournament }: TournamentFinalPhasesProps) {
  // Check if this is a Grupo+Grupo format
  const isGroupPlusGroupFormat = tournament.format === 'groups_final' || tournament.format === 'grupo_grupo';

  // Fetch final groups for Grupo+Grupo format
  const { data: finalGroups } = useQuery<TournamentGroup[]>({
    queryKey: [`/api/tournaments/${tournamentId}/groups`],
    enabled: isGroupPlusGroupFormat,
    select: (groups) => groups?.filter(g => g.phase === 'final') || []
  });

  const { data: teams } = useQuery<TournamentTeam[]>({
    queryKey: [`/api/tournaments/${tournamentId}/teams`],
    enabled: isGroupPlusGroupFormat,
  });

  // If Grupo+Grupo format, show final groups instead of knockout phases
  if (isGroupPlusGroupFormat) {
    if (!finalGroups || finalGroups.length === 0) {
      return (
        <div className="text-center py-12" data-testid="no-final-groups">
          <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Nenhum Grupo Final Criado
          </h3>
          <div className="text-gray-500 dark:text-gray-400">
            <p>Para torneios Grupo+Grupo, a fase final consiste em grupos criados com os times classificados.</p>
            <p>Use a função "Avançar Times para Fase Final" na aba de Ranking para criar os grupos finais automaticamente.</p>
          </div>
        </div>
      );
    }

    // Group teams by group
    const teamsByGroup = teams?.reduce((acc, team) => {
      if (team.groupId) {
        if (!acc[team.groupId]) {
          acc[team.groupId] = [];
        }
        acc[team.groupId].push(team);
      }
      return acc;
    }, {} as Record<number, TournamentTeam[]>) || {};

    return (
      <div className="space-y-6" data-testid="tournament-final-groups">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-yellow-600" />
          <div>
            <h3 className="text-2xl font-bold">Fase Final - Grupos</h3>
            <p className="text-sm text-gray-500">Times classificados disputam em grupos finais</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {finalGroups.map((group) => {
            const groupTeams = teamsByGroup[group.id] || [];
            return (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{group.groupName}</span>
                    <Badge variant="secondary">{group.category}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {groupTeams.length} {groupTeams.length === 1 ? 'time' : 'times'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {groupTeams.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum time neste grupo ainda</p>
                  ) : (
                    <div className="space-y-2">
                      {groupTeams
                        .sort((a, b) => {
                          // Sort by points, goal difference, then goals for
                          if ((b.points || 0) !== (a.points || 0)) {
                            return (b.points || 0) - (a.points || 0);
                          }
                          const aDiff = (a.goalsFor || 0) - (a.goalsAgainst || 0);
                          const bDiff = (b.goalsFor || 0) - (b.goalsAgainst || 0);
                          if (bDiff !== aDiff) {
                            return bDiff - aDiff;
                          }
                          return (b.goalsFor || 0) - (a.goalsFor || 0);
                        })
                        .map((team, index) => (
                          <div
                            key={team.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            data-testid={`final-group-team-${team.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-gray-500 w-6">{index + 1}º</span>
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{team.teamName}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-bold">{team.points || 0} pts</span>
                              <span className="text-gray-500">
                                {team.goalsFor || 0} - {team.goalsAgainst || 0}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // For non-Grupo+Grupo formats, show knockout phases as before
  const enabledPhases = [];

  if (tournament.enableRoundOf16) {
    enabledPhases.push({
      phase: "round_of_16",
      title: "Oitavas de Final",
      subtitle: "16 times"
    });
  }

  if (tournament.enableQuarterFinals) {
    enabledPhases.push({
      phase: "quarter_final",
      title: "Quartas de Final",
      subtitle: "8 times"
    });
  }

  if (tournament.enableSemiFinals) {
    enabledPhases.push({
      phase: "semi_final",
      title: "Semifinais",
      subtitle: "4 times"
    });
  }

  if (tournament.enableFinal) {
    enabledPhases.push({
      phase: "final",
      title: "Final",
      subtitle: "2 times"
    });
  }

  if (enabledPhases.length === 0) {
    return (
      <div className="text-center py-12" data-testid="no-phases-enabled">
        <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Nenhuma Fase Final Habilitada
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Vá em Configurações para habilitar as fases eliminatórias (Oitavas, Quartas, Semis, Final)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="tournament-final-phases">
      {enabledPhases.map((phaseInfo, index) => (
        <div key={phaseInfo.phase} className="space-y-4">
          {index > 0 && <div className="border-t pt-6" />}
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="text-2xl font-bold">{phaseInfo.title}</h3>
              <p className="text-sm text-gray-500">{phaseInfo.subtitle}</p>
            </div>
          </div>
          <TournamentKnockout
            tournamentId={tournamentId}
            phase={phaseInfo.phase}
            phaseTitle={phaseInfo.title}
          />
        </div>
      ))}
    </div>
  );
}
