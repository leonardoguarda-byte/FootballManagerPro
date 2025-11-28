import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Dumbbell, Trophy, AlertTriangle, TrendingUp, Plus, ChevronDown, Calendar, Target, Medal, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import { getTrainingTypeLabel } from "@/lib/trainingTypeLabels";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const permissions = usePermissions();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: recentAthletes, isLoading: athletesLoading } = useQuery({
    queryKey: ["/api/athletes"],
    retry: false,
  });

  const { data: upcomingGames, isLoading: gamesLoading } = useQuery({
    queryKey: ["/api/games"],
    retry: false,
  });

  const { data: recentTraining, isLoading: trainingLoading } = useQuery({
    queryKey: ["/api/training-sessions"],
    retry: false,
  });

  const { data: currentClub } = useQuery({
    queryKey: ["/api/auth/current-club"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-fluent-text-secondary">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-semibold text-fluent-text">Dashboard</h1>
            {currentClub && (
              <div className="flex items-center space-x-2">
                <span className="text-fluent-text-secondary">•</span>
                <span className="text-lg font-medium text-fluent-blue">{currentClub.name}</span>
              </div>
            )}
          </div>
          <p className="text-fluent-text-secondary mt-1">
            {currentClub ? `Visão geral do ${currentClub.name}` : "Visão geral do clube"}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {(permissions.athletes.canCreate || permissions.training.canCreate || permissions.games.canCreate || permissions.wellness.canCreate || permissions.medical.canCreate) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-fluent-blue hover:bg-fluent-blue-dark text-white" data-testid="button-new-record">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Registro
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {permissions.athletes.canCreate && (
                  <DropdownMenuItem onClick={() => setLocation("/athletes")}>
                    <Users className="w-4 h-4 mr-2" />
                    Novo Atleta
                  </DropdownMenuItem>
                )}
                {permissions.training.canCreate && (
                  <DropdownMenuItem onClick={() => setLocation("/training")}>
                    <Dumbbell className="w-4 h-4 mr-2" />
                    Novo Treino
                  </DropdownMenuItem>
                )}
                {permissions.games.canCreate && (
                  <DropdownMenuItem onClick={() => setLocation("/games")}>
                    <Trophy className="w-4 h-4 mr-2" />
                    Novo Jogo
                  </DropdownMenuItem>
                )}
                {permissions.wellness.canCreate && (
                  <DropdownMenuItem onClick={() => setLocation("/wellness")}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Registro de Bem-estar
                  </DropdownMenuItem>
                )}
                {permissions.medical.canCreate && (
                  <DropdownMenuItem onClick={() => setLocation("/medical")}>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Registro Médico
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className="fluent-shadow hover:fluent-shadow-hover transition-shadow cursor-pointer hover:bg-gray-50" 
          onClick={() => setLocation("/athletes")}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <Users className="w-6 h-6 text-fluent-blue" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-fluent-text-secondary">Total de Atletas</p>
                <p className="text-2xl font-bold text-fluent-text">
                  {statsLoading ? "..." : stats?.totalAthletes || 0}
                </p>
                <p className="text-xs text-fluent-green">
                  {statsLoading ? "..." : `${stats?.activeAthletes || 0} ativos`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="fluent-shadow hover:fluent-shadow-hover transition-shadow cursor-pointer hover:bg-gray-50" 
          onClick={() => setLocation("/training")}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <Dumbbell className="w-6 h-6 text-fluent-green" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-fluent-text-secondary">Treinos esta Semana</p>
                <p className="text-2xl font-bold text-fluent-text">
                  {statsLoading ? "..." : stats?.weeklyTraining || 0}
                </p>
                <p className="text-xs text-fluent-text-secondary">8 categorias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="fluent-shadow hover:fluent-shadow-hover transition-shadow cursor-pointer hover:bg-gray-50" 
          onClick={() => setLocation("/games")}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-100">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-fluent-text-secondary">Próximos Jogos</p>
                <p className="text-2xl font-bold text-fluent-text">
                  {statsLoading ? "..." : stats?.upcomingGames || 0}
                </p>
                <p className="text-xs text-fluent-text-secondary">Próximos 7 dias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="fluent-shadow hover:fluent-shadow-hover transition-shadow cursor-pointer hover:bg-gray-50" 
          onClick={() => setLocation("/medical")}
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-100">
                <AlertTriangle className="w-6 h-6 text-fluent-red" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-fluent-text-secondary">Atletas Lesionados</p>
                <p className="text-2xl font-bold text-fluent-text">
                  {statsLoading ? "..." : stats?.injuredAthletes || 0}
                </p>
                <p className="text-xs text-fluent-red">Requer atenção</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="fluent-shadow">
            <CardHeader>
              <CardTitle className="text-fluent-text flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Training Sessions */}
                {trainingLoading ? (
                  <div className="text-fluent-text-secondary">Carregando treinos...</div>
                ) : recentTraining && recentTraining.length > 0 ? (
                  recentTraining.slice(0, 3).map((session: any) => (
                    <div key={`training-${session.id}`} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-4 h-4 text-fluent-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fluent-text">{session.title}</p>
                        <p className="text-sm text-fluent-text-secondary">
                          Treino • {session.category} • {getTrainingTypeLabel(session.type)}
                        </p>
                        <p className="text-xs text-fluent-text-secondary">
                          {new Date(session.date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : null}

                {/* Recent Games */}
                {gamesLoading ? (
                  <div className="text-fluent-text-secondary">Carregando jogos...</div>
                ) : upcomingGames && upcomingGames.length > 0 ? (
                  upcomingGames.slice(0, 3).map((game: any) => (
                    <div key={`game-${game.id}`} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-4 h-4 text-fluent-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fluent-text">
                          vs {game.opponent}
                        </p>
                        <p className="text-sm text-fluent-text-secondary">
                          Jogo • {game.category} • {game.isHome ? 'Casa' : 'Fora'}
                        </p>
                        <p className="text-xs text-fluent-text-secondary">
                          {new Date(game.date).toLocaleDateString("pt-BR")} às {game.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : null}

                {/* Recent Athletes */}
                {athletesLoading ? (
                  <div className="text-fluent-text-secondary">Carregando atletas...</div>
                ) : recentAthletes && recentAthletes.length > 0 ? (
                  recentAthletes.slice(0, 2).map((athlete: any) => (
                    <div key={`athlete-${athlete.id}`} className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fluent-text">
                          {athlete.firstName} {athlete.lastName}
                        </p>
                        <p className="text-sm text-fluent-text-secondary">
                          Novo Atleta • {Array.isArray(athlete.category) ? athlete.category.join(', ') : athlete.category} • {athlete.position || 'N/A'}
                        </p>
                        <p className="text-xs text-fluent-text-secondary">
                          Registrado em {new Date(athlete.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : null}

                {(!recentTraining || recentTraining.length === 0) && 
                 (!upcomingGames || upcomingGames.length === 0) && 
                 (!recentAthletes || recentAthletes.length === 0) && (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-fluent-text-secondary">Nenhuma atividade recente</p>
                    <p className="text-sm text-fluent-text-secondary mt-1">
                      Comece criando atletas, treinos ou jogos
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {(permissions.athletes.canCreate || permissions.training.canCreate || permissions.games.canCreate || permissions.teams.canCreate || permissions.reports.canExport) && (
          <Card className="fluent-shadow">
            <CardHeader>
              <CardTitle className="text-fluent-text flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {permissions.athletes.canCreate && (
                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-blue-50 hover:border-blue-200 transition-colors"
                  onClick={() => setLocation("/athletes")}
                  data-testid="quick-action-new-athlete"
                >
                  <Users className="w-4 h-4 mr-3 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Cadastrar Atleta</div>
                    <div className="text-xs text-gray-500">Adicionar novo jogador</div>
                  </div>
                </Button>
              )}
              
              {permissions.training.canCreate && (
                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-green-50 hover:border-green-200 transition-colors"
                  onClick={() => setLocation("/training")}
                  data-testid="quick-action-new-training"
                >
                  <Dumbbell className="w-4 h-4 mr-3 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">Agendar Treino</div>
                    <div className="text-xs text-gray-500">Criar sessão de treino</div>
                  </div>
                </Button>
              )}
              
              {permissions.games.canCreate && (
                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-yellow-50 hover:border-yellow-200 transition-colors"
                  onClick={() => setLocation("/games")}
                  data-testid="quick-action-new-game"
                >
                  <Trophy className="w-4 h-4 mr-3 text-yellow-600" />
                  <div className="text-left">
                    <div className="font-medium">Novo Jogo</div>
                    <div className="text-xs text-gray-500">Marcar partida oficial</div>
                  </div>
                </Button>
              )}
              
              {permissions.teams.canCreate && (
                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-purple-50 hover:border-purple-200 transition-colors"
                  onClick={() => setLocation("/teams")}
                  data-testid="quick-action-manage-teams"
                >
                  <Medal className="w-4 h-4 mr-3 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Gerenciar Equipes</div>
                    <div className="text-xs text-gray-500">Organizar categorias</div>
                  </div>
                </Button>
              )}
              
              {permissions.reports.canExport && (
                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-orange-50 hover:border-orange-200 transition-colors"
                  onClick={() => setLocation("/reports")}
                  data-testid="quick-action-generate-report"
                >
                  <TrendingUp className="w-4 h-4 mr-3 text-orange-600" />
                  <div className="text-left">
                    <div className="font-medium">Gerar Relatório</div>
                    <div className="text-xs text-gray-500">Análises e estatísticas</div>
                  </div>
                </Button>
              )}

              <div className="pt-3 border-t">
                <Button
                  className="w-full bg-fluent-blue hover:bg-fluent-blue-dark text-white"
                  onClick={() => setLocation("/ai-insights")}
                  data-testid="quick-action-ai-insights"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Insights com IA
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Athletes and Upcoming Games */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Athletes */}
        <Card className="fluent-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-fluent-text">Atletas em Destaque</CardTitle>
            <Button
              variant="link"
              className="text-fluent-blue"
              onClick={() => (window.location.href = "/athletes")}
            >
              Ver todos
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {athletesLoading ? (
                <div className="text-fluent-text-secondary">Carregando atletas...</div>
              ) : recentAthletes && recentAthletes.length > 0 ? (
                recentAthletes.slice(0, 5).map((athlete: any) => (
                  <div key={athlete.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-fluent-blue rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-fluent-text">
                          {athlete.firstName} {athlete.lastName}
                        </div>
                        <div className="text-sm text-fluent-text-secondary">
                          {athlete.position} - {Array.isArray(athlete.category) ? athlete.category.join(', ') : athlete.category}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        athlete.status === "active"
                          ? "bg-green-100 text-green-800"
                          : athlete.status === "injured"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {athlete.status === "active"
                        ? "Ativo"
                        : athlete.status === "injured"
                        ? "Lesionado"
                        : "Inativo"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-fluent-text-secondary">Nenhum atleta cadastrado</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Games */}
        <Card className="fluent-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-fluent-text">Próximos Jogos</CardTitle>
            <Button
              variant="link"
              className="text-fluent-blue"
              onClick={() => (window.location.href = "/games")}
            >
              Ver calendário
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gamesLoading ? (
                <div className="text-fluent-text-secondary">Carregando jogos...</div>
              ) : upcomingGames && upcomingGames.length > 0 ? (
                upcomingGames
                  .filter((game: any) => game.status === "scheduled")
                  .slice(0, 5)
                  .map((game: any) => (
                    <div key={game.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className="text-xs text-fluent-text-secondary font-medium">
                            {new Date(game.date).getDate()}
                          </p>
                          <p className="text-xs text-fluent-text-secondary">
                            {new Date(game.date).toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-fluent-text">vs {game.opponent}</p>
                          <p className="text-xs text-fluent-text-secondary">
                            {game.category} • {game.time}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            game.isHome ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {game.isHome ? "Casa" : "Fora"}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-fluent-text-secondary">Nenhum jogo agendado</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
