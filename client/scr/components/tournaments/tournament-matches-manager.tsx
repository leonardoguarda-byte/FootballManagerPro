import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar as CalendarIcon, MapPin, Edit, Check, X, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { MODULES, ACTIONS } from "@shared/rbac";
import type { TournamentMatch, TournamentTeam, Tournament, Stadium } from "@shared/schema";

interface TournamentMatchesManagerProps {
  tournamentId: number;
}

const matchFormSchema = z.object({
  category: z.string().min(1, "Selecione a categoria"),
  team1Id: z.string().min(1, "Selecione o time 1"),
  team2Id: z.string().min(1, "Selecione o time 2"),
  scheduledDate: z.string().min(1, "Data e hora são obrigatórias"),
  venue: z.string().optional(),
  stadiumId: z.string().optional(),
  phase: z.string().default("group"),
  mirrorToOtherCategory: z.boolean().default(false),
});

type MatchFormData = z.infer<typeof matchFormSchema>;

export default function TournamentMatchesManager({ tournamentId }: TournamentMatchesManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const permissions = usePermissions();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMatchInfo, setEditingMatchInfo] = useState<TournamentMatch | null>(null);
  const [editingScoreId, setEditingScoreId] = useState<number | null>(null);
  const [tempScore1, setTempScore1] = useState<string>("");
  const [tempScore2, setTempScore2] = useState<string>("");
  const [deleteMatchId, setDeleteMatchId] = useState<number | null>(null);

  const { data: tournament } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
    enabled: !!tournamentId,
  });

  const { data: matches = [], isLoading: loadingMatches } = useQuery<TournamentMatch[]>({
    queryKey: [`/api/tournaments/${tournamentId}/matches`],
    enabled: !!tournamentId,
  });

  const { data: teams = [], isLoading: loadingTeams } = useQuery<TournamentTeam[]>({
    queryKey: [`/api/tournaments/${tournamentId}/teams`],
    enabled: !!tournamentId,
  });

  const { data: stadiums = [] } = useQuery<Stadium[]>({
    queryKey: [`/api/stadiums?clubId=${user?.clubId}&seasonId=${user?.seasonId}`],
    enabled: !!user?.clubId && !!user?.seasonId,
  });

  const form = useForm<MatchFormData>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      category: "",
      team1Id: "",
      team2Id: "",
      scheduledDate: "",
      venue: "",
      stadiumId: "custom",
      phase: "group",
      mirrorToOtherCategory: false,
    },
  });

  // Get available categories for the tournament
  const availableCategories = tournament 
    ? [tournament.category, ...(tournament.additionalCategories || [])].filter(Boolean)
    : [];


  const createMatch = useMutation({
    mutationFn: async (data: MatchFormData) => {
      // Convert datetime-local to Date object treating it as local time,
      // then convert to ISO string which includes timezone offset
      const [datePart, timePart] = data.scheduledDate.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      
      // Create date in local timezone
      const localDate = new Date(year, month - 1, day, hours, minutes);
      
      // Get venue from stadium if stadium is selected
      let venue = data.venue || "";
      if (data.stadiumId && data.stadiumId !== 'custom') {
        const stadium = stadiums.find(s => s.id === parseInt(data.stadiumId));
        if (stadium) {
          venue = stadium.name;
        }
      }
      
      const payload = {
        tournamentId,
        category: data.category,
        team1Id: parseInt(data.team1Id),
        team2Id: parseInt(data.team2Id),
        scheduledDate: localDate.toISOString(),
        venue,
        phase: data.phase,
      };
      
      // Create first match
      await apiRequest(`/api/tournaments/${tournamentId}/matches`, "POST", payload);
      
      // If mirroring is enabled and there's another category available
      if (data.mirrorToOtherCategory && availableCategories.length > 1) {
        // Find the other category
        const otherCategory = availableCategories.find(cat => cat !== data.category);
        
        if (otherCategory) {
          // Find corresponding teams in the other category
          const team1 = teams.find(t => t.id === parseInt(data.team1Id));
          const team2 = teams.find(t => t.id === parseInt(data.team2Id));
          
          if (team1 && team2) {
            // Find teams with same adversaryTeamId but different category
            const otherTeam1 = teams.find(t => 
              t.category === otherCategory && 
              ((team1.adversaryTeamId && t.adversaryTeamId === team1.adversaryTeamId) || 
               (!team1.adversaryTeamId && t.clubId === team1.clubId))
            );
            const otherTeam2 = teams.find(t => 
              t.category === otherCategory && 
              ((team2.adversaryTeamId && t.adversaryTeamId === team2.adversaryTeamId) || 
               (!team2.adversaryTeamId && t.clubId === team2.clubId))
            );
            
            if (otherTeam1 && otherTeam2) {
              // Add 2 hours to the schedule
              const mirroredDate = new Date(localDate);
              mirroredDate.setHours(mirroredDate.getHours() + 2);
              
              const mirroredPayload = {
                tournamentId,
                category: otherCategory,
                team1Id: otherTeam1.id,
                team2Id: otherTeam2.id,
                scheduledDate: mirroredDate.toISOString(),
                venue,
                phase: data.phase,
              };
              
              await apiRequest(`/api/tournaments/${tournamentId}/matches`, "POST", mirroredPayload);
            }
          }
        }
      }
      
      return payload;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/matches`] });
      const matchesCreated = variables.mirrorToOtherCategory && availableCategories.length > 1 ? 2 : 1;
      toast({
        title: "Sucesso",
        description: matchesCreated === 2 
          ? "Partidas criadas com sucesso nas duas categorias!" 
          : "Partida criada com sucesso!",
      });
      setShowAddDialog(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar partida",
        variant: "destructive",
      });
    },
  });

  const updateMatchScore = useMutation({
    mutationFn: async ({ matchId, team1Score, team2Score }: { matchId: number; team1Score: number; team2Score: number }) => {
      return await apiRequest(`/api/tournament-matches/${matchId}`, "PUT", {
        team1Score,
        team2Score,
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/matches`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/teams`] });
      setEditingScoreId(null);
      setTempScore1("");
      setTempScore2("");
      toast({
        title: "Sucesso",
        description: "Placar atualizado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar placar",
        variant: "destructive",
      });
    },
  });

  const updateMatchInfo = useMutation({
    mutationFn: async (data: MatchFormData & { matchId: number; currentMatch: TournamentMatch }) => {
      // Convert datetime-local to Date object treating it as local time,
      // then convert to ISO string which includes timezone offset
      const [datePart, timePart] = data.scheduledDate.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      
      // Create date in local timezone
      const localDate = new Date(year, month - 1, day, hours, minutes);
      
      const payload = {
        team1Id: parseInt(data.team1Id),
        team2Id: parseInt(data.team2Id),
        scheduledDate: localDate.toISOString(),
        venue: data.venue,
        phase: data.phase,
        // Preserve existing scores and status
        team1Score: data.currentMatch.team1Score,
        team2Score: data.currentMatch.team2Score,
        status: data.currentMatch.status,
      };
      return await apiRequest(`/api/tournament-matches/${data.matchId}`, "PUT", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/matches`] });
      setEditingMatchInfo(null);
      toast({
        title: "Sucesso",
        description: "Partida atualizada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar partida",
        variant: "destructive",
      });
    },
  });

  const deleteMatch = useMutation({
    mutationFn: async (matchId: number) => {
      return await apiRequest(`/api/tournament-matches/${matchId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/matches`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/teams`] });
      setDeleteMatchId(null);
      toast({
        title: "Sucesso",
        description: "Partida excluída com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir partida",
        variant: "destructive",
      });
    },
  });

  const startEditingScore = (match: TournamentMatch) => {
    setEditingScoreId(match.id);
    setTempScore1(match.team1Score?.toString() || "");
    setTempScore2(match.team2Score?.toString() || "");
  };

  const saveScore = () => {
    const score1 = parseInt(tempScore1);
    const score2 = parseInt(tempScore2);
    
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      toast({
        title: "Placar inválido",
        description: "Digite placares válidos (números positivos).",
        variant: "destructive",
      });
      return;
    }

    if (editingScoreId) {
      updateMatchScore.mutate({
        matchId: editingScoreId,
        team1Score: score1,
        team2Score: score2,
      });
    }
  };

  const cancelEditingScore = () => {
    setEditingScoreId(null);
    setTempScore1("");
    setTempScore2("");
  };

  const openEditDialog = (match: TournamentMatch) => {
    setEditingMatchInfo(match);
    // Format date for datetime-local input
    let scheduledDate = "";
    if (match.scheduledDate) {
      const date = new Date(match.scheduledDate);
      // Format to YYYY-MM-DDTHH:mm for datetime-local input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      scheduledDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    form.reset({
      team1Id: match.team1Id.toString(),
      team2Id: match.team2Id.toString(),
      scheduledDate,
      venue: match.venue || "",
      phase: match.phase || "group",
    });
  };

  const onSubmitEdit = (data: MatchFormData) => {
    if (!editingMatchInfo) return;
    if (data.team1Id === data.team2Id) {
      toast({
        title: "Erro",
        description: "Um time não pode jogar contra si mesmo",
        variant: "destructive",
      });
      return;
    }
    // Get the latest match state from the matches list to preserve any inline score edits
    const currentMatch = matches.find(m => m.id === editingMatchInfo.id) || editingMatchInfo;
    updateMatchInfo.mutate({
      ...data,
      matchId: editingMatchInfo.id,
      currentMatch,
    });
  };

  const onSubmit = (data: MatchFormData) => {
    if (data.team1Id === data.team2Id) {
      toast({
        title: "Erro",
        description: "Um time não pode jogar contra si mesmo",
        variant: "destructive",
      });
      return;
    }
    createMatch.mutate(data);
  };

  const getTeamName = (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    return team?.teamName || "Time desconhecido";
  };

  const getTeam = (teamId: number) => {
    return teams.find(t => t.id === teamId);
  };

  const renderTeamBadge = (teamId: number) => {
    const team = getTeam(teamId);
    if (!team) return null;

    return (
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
        <span className="font-medium">{team.teamName}</span>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: "Agendada", variant: "secondary" as const },
      in_progress: { label: "Em Andamento", variant: "default" as const },
      completed: { label: "Finalizada", variant: "outline" as const },
      postponed: { label: "Adiada", variant: "destructive" as const },
    };
    const info = statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  if (loadingMatches || loadingTeams) {
    return <div className="text-center py-8">Carregando partidas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Partidas do Torneio</h3>
          <p className="text-sm text-gray-600">
            {matches.length} partida(s) cadastrada(s)
          </p>
        </div>
        {permissions.games.canCreate && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button disabled={teams.length < 2} data-testid="button-add-match">
                <Plus className="mr-2 w-4 h-4" />
                Criar Partida
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Partida</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Category Selection */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Team 1 Selection - filtered by category */}
                <FormField
                  control={form.control}
                  name="team1Id"
                  render={({ field }) => {
                    const selectedCategory = form.watch('category');
                    const filteredTeams = selectedCategory 
                      ? teams.filter(t => t.category === selectedCategory)
                      : [];
                    
                    return (
                      <FormItem>
                        <FormLabel>Time Casa *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedCategory}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-team1">
                              <SelectValue placeholder={selectedCategory ? "Selecione o time" : "Selecione a categoria primeiro"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredTeams.map((team) => (
                              <SelectItem key={team.id} value={team.id.toString()}>
                                {team.teamName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Team 2 Selection - filtered by category */}
                <FormField
                  control={form.control}
                  name="team2Id"
                  render={({ field }) => {
                    const selectedCategory = form.watch('category');
                    const filteredTeams = selectedCategory 
                      ? teams.filter(t => t.category === selectedCategory)
                      : [];
                    
                    return (
                      <FormItem>
                        <FormLabel>Time Visitante *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedCategory}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-team2">
                              <SelectValue placeholder={selectedCategory ? "Selecione o time" : "Selecione a categoria primeiro"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredTeams.map((team) => (
                              <SelectItem key={team.id} value={team.id.toString()}>
                                {team.teamName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Date and Time */}
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e Hora *</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          data-testid="input-match-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stadium Selection */}
                <FormField
                  control={form.control}
                  name="stadiumId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estádio</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-stadium">
                            <SelectValue placeholder="Selecione o estádio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="custom">Campo personalizado</SelectItem>
                          {stadiums.map((stadium) => (
                            <SelectItem key={stadium.id} value={stadium.id.toString()}>
                              {stadium.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Selecione um estádio cadastrado ou "Campo personalizado" para digitar manualmente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Custom Venue Field (only if custom is selected) */}
                {form.watch('stadiumId') === 'custom' && (
                  <FormField
                    control={form.control}
                    name="venue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local (Personalizado)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Estádio Mineirão" 
                            {...field} 
                            data-testid="input-match-venue"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Mirror to Other Category Checkbox */}
                {availableCategories.length > 1 && (
                  <FormField
                    control={form.control}
                    name="mirrorToOtherCategory"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-mirror"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Espelhar para outra categoria
                          </FormLabel>
                          <FormDescription>
                            Criar automaticamente a mesma partida na outra categoria com horário 2 horas à frente
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddDialog(false)}
                    data-testid="button-cancel-match"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMatch.isPending}
                    data-testid="button-submit-match"
                  >
                    {createMatch.isPending ? "Criando..." : "Criar Partida"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {teams.length < 2 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4">
            <p className="text-sm text-orange-800">
              ⚠️ Você precisa ter pelo menos 2 times cadastrados para criar partidas.
            </p>
          </CardContent>
        </Card>
      )}

      {matches.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma partida agendada</h3>
            <p className="text-gray-600 mb-4">
              Crie partidas para começar a organizar os jogos do torneio
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Time 1</TableHead>
                  <TableHead className="text-center">Placar</TableHead>
                  <TableHead>Time 2</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match) => (
                  <TableRow key={match.id} data-testid={`row-match-${match.id}`}>
                    <TableCell>
                      {match.scheduledDate ? (() => {
                        const date = new Date(match.scheduledDate);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = String(date.getFullYear()).slice(-2);
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        return `${day}/${month}/${year} ${hours}:${minutes}`;
                      })() : '-'}
                    </TableCell>
                    <TableCell>{renderTeamBadge(match.team1Id)}</TableCell>
                    <TableCell className="text-center">
                      {editingScoreId === match.id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <Input
                            type="number"
                            value={tempScore1}
                            onChange={(e) => setTempScore1(e.target.value)}
                            className="w-12 h-8 text-center text-sm font-bold p-1"
                            min="0"
                            autoFocus
                          />
                          <span className="text-sm font-bold mx-1">X</span>
                          <Input
                            type="number"
                            value={tempScore2}
                            onChange={(e) => setTempScore2(e.target.value)}
                            className="w-12 h-8 text-center text-sm font-bold p-1"
                            min="0"
                          />
                          <Button 
                            size="sm" 
                            className="h-7 w-7 p-0 ml-2" 
                            onClick={saveScore} 
                            disabled={updateMatchScore.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 w-7 p-0" 
                            onClick={cancelEditingScore}
                            disabled={updateMatchScore.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded justify-center min-w-[60px]"
                          onClick={() => startEditingScore(match)}
                        >
                          <div className="text-lg font-bold min-w-[20px] text-center">
                            {match.team1Score !== null ? match.team1Score : '-'}
                          </div>
                          <span className="text-sm font-bold text-gray-400">X</span>
                          <div className="text-lg font-bold min-w-[20px] text-center">
                            {match.team2Score !== null ? match.team2Score : '-'}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{renderTeamBadge(match.team2Id)}</TableCell>
                    <TableCell>
                      {match.venue ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="text-sm">{match.venue}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(match.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{match.phase}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {permissions.games.canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(match)}
                            data-testid={`button-edit-match-${match.id}`}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        )}
                        {permissions.games.canDelete && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteMatchId(match.id)}
                            data-testid={`button-delete-match-${match.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Match Info Edit Dialog */}
      <Dialog open={!!editingMatchInfo} onOpenChange={(open) => !open && setEditingMatchInfo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Informações da Partida</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="team1Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time 1 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-team1">
                            <SelectValue placeholder="Selecione o time 1" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.teamName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="team2Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time 2 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-team2">
                            <SelectValue placeholder="Selecione o time 2" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.teamName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data e Hora *</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field} 
                        data-testid="input-edit-match-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Estádio Mineirão" 
                        {...field} 
                        data-testid="input-edit-match-venue"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fase</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-phase">
                          <SelectValue placeholder="Selecione a fase" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="group">Fase de Grupos</SelectItem>
                        <SelectItem value="round_of_16">Oitavas de Final</SelectItem>
                        <SelectItem value="quarterfinals">Quartas de Final</SelectItem>
                        <SelectItem value="semifinals">Semifinais</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingMatchInfo(null)}
                  data-testid="button-cancel-edit-match"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMatchInfo.isPending}
                  data-testid="button-save-edit-match"
                >
                  {updateMatchInfo.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteMatchId !== null} onOpenChange={(open) => !open && setDeleteMatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Partida</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta partida? Esta ação não pode ser desfeita.
              {deleteMatchId && (() => {
                const match = matches.find(m => m.id === deleteMatchId);
                if (match) {
                  return (
                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                      <p className="font-medium">
                        {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                      </p>
                      {match.scheduledDate && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {(() => {
                            const date = new Date(match.scheduledDate);
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            return `${day}/${month}/${year} às ${hours}:${minutes}`;
                          })()}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-match">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMatchId && deleteMatch.mutate(deleteMatchId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMatch.isPending}
              data-testid="button-confirm-delete-match"
            >
              {deleteMatch.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
