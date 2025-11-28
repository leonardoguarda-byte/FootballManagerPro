import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Plus, Calendar, MapPin, Trophy, Clock, Edit2, Trash2, Target, Eye, Users, Filter, Search, Home, Plane, ChevronLeft, ChevronRight } from "lucide-react";
import GameForm from "@/components/games/game-form";
import { GameDetails } from "@/components/games/game-details";
import ScoreForm from "@/components/games/score-form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";

export default function Games() {
  const [isGameFormOpen, setIsGameFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [scoreGame, setScoreGame] = useState<any>(null);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const permissions = usePermissions();

  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ["/api/games"],
    retry: false,
  });

  // Filter and organize games
  const filteredAndOrganizedGames = useMemo(() => {
    if (!games || !Array.isArray(games)) return { gamesByMonth: {}, availableMonths: [] };

    let filtered = games;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((game: any) =>
        game.opponent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.venue?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((game: any) => game.status === statusFilter);
    }

    // Apply location filter
    if (locationFilter !== "all") {
      if (locationFilter === "home") {
        filtered = filtered.filter((game: any) => game.isHome === true);
      } else if (locationFilter === "away") {
        filtered = filtered.filter((game: any) => game.isHome === false);
      }
    }

    // Organize by month
    const gamesByMonth: Record<string, any[]> = {};
    const availableMonths = new Set<string>();

    filtered.forEach((game: any) => {
      if (game.date) {
        const date = new Date(game.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        
        availableMonths.add(monthKey);
        
        if (!gamesByMonth[monthKey]) {
          gamesByMonth[monthKey] = [];
        }
        gamesByMonth[monthKey].push({ ...game, monthName });
      }
    });

    // Apply month filter
    if (selectedMonth && selectedMonth !== "all" && gamesByMonth[selectedMonth]) {
      return {
        gamesByMonth: { [selectedMonth]: gamesByMonth[selectedMonth] },
        availableMonths: Array.from(availableMonths).sort().reverse()
      };
    }

    return {
      gamesByMonth,
      availableMonths: Array.from(availableMonths).sort().reverse()
    };
  }, [games, searchTerm, statusFilter, locationFilter, selectedMonth]);



  // Mutations
  const deleteGameMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/games/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({
        title: "Sucesso",
        description: "Jogo excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir jogo.",
        variant: "destructive",
      });
    },
  });



  const updateGameScoreMutation = useMutation({
    mutationFn: async ({ id, ourScore, opponentScore, isTournamentMatch }: { id: number | string; ourScore: number; opponentScore: number; isTournamentMatch?: boolean }) => {
      if (isTournamentMatch) {
        // Handle tournament match score update
        const tournamentMatchId = String(id).replace('tournament_', '');
        await apiRequest(`/api/tournament-matches/${tournamentMatchId}`, "PUT", {
          team1Score: scoreGame?.isHome ? ourScore : opponentScore,
          team2Score: scoreGame?.isHome ? opponentScore : ourScore,
          status: "completed"
        });
      } else {
        // Handle regular game score update
        await apiRequest(`/api/games/${id}`, "PUT", {
          ourScore,
          opponentScore,
          status: "completed"
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      setScoreGame(null);
      toast({
        title: "Sucesso",
        description: "Resultado atualizado!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar resultado.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800">Agendado</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Finalizado</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string, isTournamentMatch?: boolean, tournamentName?: string) => {
    if (isTournamentMatch) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        <Trophy className="w-3 h-3 mr-1" />
        {tournamentName || 'Torneio'}
      </Badge>;
    }
    
    switch (type) {
      case "friendly":
        return <Badge variant="outline">Amistoso</Badge>;
      case "tournament":
        return <Badge className="bg-yellow-100 text-yellow-800">Torneio</Badge>;
      case "league":
        return <Badge className="bg-purple-100 text-purple-800">Liga</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const formatScore = (game: any) => {
    if (game.ourScore !== null && game.opponentScore !== null) {
      return `${game.ourScore} x ${game.opponentScore}`;
    }
    return "vs";
  };

  // Calendar helper functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(prevDate.getMonth() - 1);
      } else {
        newDate.setMonth(prevDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getGamesForDay = (date: Date) => {
    if (!games) return [];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return (games as any[]).filter((game: any) => 
      game.date === dateStr
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fluent-text">Jogos</h1>
          <p className="text-fluent-text-secondary mt-1">Gestão de partidas e jogos</p>
        </div>
        <div className="flex space-x-2">
          {permissions.games.canCreate && (
            <Dialog open={isGameFormOpen} onOpenChange={setIsGameFormOpen}>
              <DialogTrigger asChild>
                <Button className="bg-fluent-blue hover:bg-fluent-blue-dark text-white" data-testid="button-create-game">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Jogo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo Jogo</DialogTitle>
                </DialogHeader>
                <GameForm onSuccess={() => setIsGameFormOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por adversário ou local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="scheduled">Agendados</SelectItem>
              <SelectItem value="completed">Finalizados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>

          {/* Location Filter */}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Local" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Locais</SelectItem>
              <SelectItem value="home">
                <div className="flex items-center">
                  <Home className="w-4 h-4 mr-2" />
                  Casa
                </div>
              </SelectItem>
              <SelectItem value="away">
                <div className="flex items-center">
                  <Plane className="w-4 h-4 mr-2" />
                  Visitante
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Month Filter */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {filteredAndOrganizedGames.availableMonths.map((monthKey) => {
                const [year, month] = monthKey.split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric'
                });
                return (
                  <SelectItem key={monthKey} value={monthKey}>
                    {monthName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setLocationFilter("all");
              setSelectedMonth("all");
            }}
          >
            Limpar Filtros
          </Button>
        </div>
      </Card>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {getDaysInMonth(currentDate).map((day, index) => (
              <div key={index} className="min-h-[120px] p-1 border border-gray-100">
                {day && (
                  <>
                    <div className="text-sm font-medium mb-1">
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {getGamesForDay(day).map((game: any) => (
                        <div 
                          key={game.id} 
                          className="bg-green-100 hover:bg-green-200 text-green-800 text-xs p-1 rounded cursor-pointer transition-colors"
                          onClick={() => setSelectedGame(game)}
                        >
                          <div className="font-medium truncate">
                            {formatScore(game)} {game.opponent}
                          </div>
                          <div className="flex items-center justify-between">
                            <span>{game.time}</span>
                            <span className={`px-1 rounded ${game.isHome ? "bg-blue-200 text-blue-800" : "bg-gray-200 text-gray-800"}`}>
                              {game.isHome ? "C" : "F"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Show loading state if needed */}
      {gamesLoading && (
        <div className="text-center py-8">
          <div className="text-fluent-text-secondary">Carregando jogos...</div>
        </div>
      )}

      {/* Show empty state only when no games exist */}
      {!gamesLoading && (!games || (games as any[]).length === 0) && (
        <Card className="fluent-shadow">
          <CardContent className="p-8 text-center">
            <div className="text-fluent-text-secondary">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Nenhum jogo agendado</h3>
              <p className="mb-4">Comece criando seu primeiro jogo</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Game Dialog */}
      <Dialog open={!!editingGame} onOpenChange={() => setEditingGame(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Jogo</DialogTitle>
          </DialogHeader>
          {editingGame && (
            <GameForm 
              initialData={editingGame} 
              onSuccess={() => setEditingGame(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Score Game Dialog */}
      <Dialog open={!!scoreGame} onOpenChange={() => setScoreGame(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Resultado</DialogTitle>
          </DialogHeader>
          {scoreGame && (
            <ScoreForm 
              game={scoreGame} 
              onSubmit={(data) => updateGameScoreMutation.mutate({
                ...data,
                isTournamentMatch: scoreGame.isTournamentMatch
              })}
              onCancel={() => setScoreGame(null)}
              isLoading={updateGameScoreMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Game Details Dialog */}
      <Dialog open={!!selectedGame} onOpenChange={() => setSelectedGame(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestão Completa do Jogo</DialogTitle>
          </DialogHeader>
          {selectedGame && (
            <GameDetails 
              gameId={selectedGame.id} 
              game={selectedGame} 
              onClose={() => setSelectedGame(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
