import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar } from "lucide-react";
import type { TournamentMatch, TournamentTeam } from "@shared/schema";

interface TournamentKnockoutProps {
  tournamentId: number;
  phase: "quarter_final" | "semi_final" | "final";
  phaseTitle: string;
}

export function TournamentKnockout({ tournamentId, phase, phaseTitle }: TournamentKnockoutProps) {
  const { data: matches, isLoading: loadingMatches } = useQuery<TournamentMatch[]>({
    queryKey: [`/api/tournaments/${tournamentId}/matches`],
  });

  const { data: teams } = useQuery<TournamentTeam[]>({
    queryKey: [`/api/tournaments/${tournamentId}/teams`],
  });

  if (loadingMatches) {
    return <div className="text-center py-8">Carregando fase eliminatória...</div>;
  }

  const phaseMatches = matches?.filter(m => m.phase === phase) || [];

  const getTeamById = (teamId: number) => {
    return teams?.find(t => t.id === teamId);
  };

  if (phaseMatches.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Nenhuma partida de {phaseTitle} criada ainda
        </p>
        <p className="text-sm text-gray-500 mt-2">
          As partidas serão geradas automaticamente após a fase de grupos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid={`knockout-phase-${phase}`}>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-6 h-6 text-yellow-600" />
        <h2 className="text-2xl font-bold">{phaseTitle}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phaseMatches.map((match) => {
          const team1 = getTeamById(match.team1Id);
          const team2 = getTeamById(match.team2Id);
          const isFinished = match.status === 'completed';
          const winnerId = match.winnerId;

          return (
            <Card key={match.id} data-testid={`match-${match.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {match.bracketPosition || `Partida ${match.round || ''}`}
                  </CardTitle>
                  <Badge variant={isFinished ? "default" : "secondary"}>
                    {isFinished ? "Finalizada" : "Agendada"}
                  </Badge>
                </div>
                {match.scheduledDate && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(match.scheduledDate).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Team 1 */}
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  winnerId === team1?.id ? 'bg-green-100 dark:bg-green-950 border-2 border-green-500' : 'bg-gray-50 dark:bg-gray-900'
                }`}>
                  <div className="flex items-center gap-2 flex-1">
                    {team1?.badgeUrl ? (
                      <img
                        src={team1.badgeUrl}
                        alt={`${team1.teamName} badge`}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : team1 ? (
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                          {team1.teamName.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{team1?.teamName || 'A definir'}</p>
                      {team1?.category && (
                        <p className="text-xs text-gray-500">{team1.category}</p>
                      )}
                    </div>
                  </div>
                  {isFinished && match.team1Score !== null && (
                    <div className={`text-xl font-bold px-3 ${
                      winnerId === team1?.id ? 'text-green-700 dark:text-green-400' : 'text-gray-600'
                    }`}>
                      {match.team1Score}
                    </div>
                  )}
                </div>

                <div className="text-center text-xs text-gray-500 font-bold">VS</div>

                {/* Team 2 */}
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  winnerId === team2?.id ? 'bg-green-100 dark:bg-green-950 border-2 border-green-500' : 'bg-gray-50 dark:bg-gray-900'
                }`}>
                  <div className="flex items-center gap-2 flex-1">
                    {team2?.badgeUrl ? (
                      <img
                        src={team2.badgeUrl}
                        alt={`${team2.teamName} badge`}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : team2 ? (
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                          {team2.teamName.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{team2?.teamName || 'A definir'}</p>
                      {team2?.category && (
                        <p className="text-xs text-gray-500">{team2.category}</p>
                      )}
                    </div>
                  </div>
                  {isFinished && match.team2Score !== null && (
                    <div className={`text-xl font-bold px-3 ${
                      winnerId === team2?.id ? 'text-green-700 dark:text-green-400' : 'text-gray-600'
                    }`}>
                      {match.team2Score}
                    </div>
                  )}
                </div>

                {match.venue && (
                  <div className="text-xs text-gray-500 text-center mt-2">
                    📍 {match.venue}
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
