import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import type { Tournament, TournamentTeam, TournamentGroup, TournamentMatch } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Edit2, Trash2, Trophy, Calendar, Users, MapPin, Settings, Target, Award, Medal, Play, Clock, Flag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Add Team Form Schema
const addTeamSchema = z.object({
  adversaryTeamIds: z.array(z.string()).min(1, "Selecione pelo menos um time"),
  category: z.enum(["sub-15", "sub-17"], {
    required_error: "Categoria é obrigatória",
  }),
});

type AddTeamFormData = z.infer<typeof addTeamSchema> & {
  teamsToAdd?: Array<{
    teamId: number;
    teamName: string;
    category: string;
    isOwnClub: boolean;
    badgeUrl: string | null;
  }>;
};

// Add Team Form Component
function AddTeamForm({ onSubmit, isLoading }: { onSubmit: (data: AddTeamFormData) => void; isLoading: boolean }) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  
  const form = useForm<AddTeamFormData>({
    resolver: zodResolver(addTeamSchema),
    defaultValues: {
      adversaryTeamIds: [],
      category: "sub-15",
    },
  });

  // Get current user to fetch adversary teams
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch adversary teams with proper club and season parameters
  const { data: adversaryTeams, isLoading: loadingTeams } = useQuery({
    queryKey: ["/api/adversary-teams", (user as any)?.clubId, (user as any)?.seasonId],
    queryFn: async () => {
      if (!(user as any)?.clubId || !(user as any)?.seasonId) return [];
      return apiRequest(`/api/adversary-teams?clubId=${(user as any).clubId}&seasonId=${(user as any).seasonId}`, "GET");
    },
    enabled: !!(user as any)?.clubId && !!(user as any)?.seasonId,
  });

  const handleTeamToggle = (team: any) => {
    // Create unique identifier that includes team type and ID
    const uniqueTeamId = team.isOwnClub ? `club-${team.id}` : `adversary-${team.id}`;
    const newSelection = selectedTeams.includes(uniqueTeamId)
      ? selectedTeams.filter(id => id !== uniqueTeamId)
      : [...selectedTeams, uniqueTeamId];
    
    setSelectedTeams(newSelection);
    form.setValue('adversaryTeamIds', newSelection);
  };

  const handleSubmit = (data: AddTeamFormData) => {
    // Convert selected teams to proper format for backend
    const teamsToAdd = selectedTeams.map(uniqueTeamId => {
      const team = (adversaryTeams as any)?.find((t: any) => {
        const teamUniqueId = t.isOwnClub ? `club-${t.id}` : `adversary-${t.id}`;
        return teamUniqueId === uniqueTeamId;
      });
      
      if (!team) return null;
      
      return {
        teamId: team.id,
        teamName: team.name,
        category: data.category,
        isOwnClub: team.isOwnClub,
        badgeUrl: team.badgeUrl || null
      };
    }).filter(Boolean);
    
    onSubmit({
      ...data,
      teamsToAdd
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sub-15">Sub-15</SelectItem>
                  <SelectItem value="sub-17">Sub-17</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adversaryTeamIds"
          render={() => (
            <FormItem>
              <FormLabel>Times (selecione múltiplos)</FormLabel>
              <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                {loadingTeams ? (
                  <div className="text-center py-4 text-muted-foreground">Carregando times...</div>
                ) : adversaryTeams?.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhum time adversário encontrado. Adicione times na seção "Adversários" primeiro.
                  </div>
                ) : (
                  (adversaryTeams as any)?.map((team: any, index: number) => {
                    const uniqueKey = team.isOwnClub ? `club-${team.id}` : `adversary-${team.id}`;
                    const uniqueId = `${uniqueKey}-${index}`;
                    return (
                      <div key={uniqueKey} className="flex items-center space-x-2">
                        <Checkbox
                          id={uniqueId}
                          checked={selectedTeams.includes(uniqueKey)}
                          onCheckedChange={() => handleTeamToggle(team)}
                        />
                        <Label 
                          htmlFor={uniqueId} 
                          className="flex-1 text-sm font-normal cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span>{team.name}</span>
                            <div className="flex items-center gap-2">
                              {team.category && (
                                <span className="text-xs text-muted-foreground">
                                  ({team.category})
                                </span>
                              )}
                              {team.isOwnClub ? (
                                <Badge variant="outline" className="text-xs">ESSUBE</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Adversário</Badge>
                              )}
                            </div>
                          </div>
                        </Label>
                      </div>
                    );
                  })
                )}
              </div>
              {selectedTeams.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedTeams.length} time(s) selecionado(s)
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isLoading || selectedTeams.length === 0}>
            {isLoading ? "Adicionando..." : `Adicionar ${selectedTeams.length} Time(s)`}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface TournamentDetails {
  tournament: Tournament;
  teams: TournamentTeam[];
  groups: TournamentGroup[];
  matches: TournamentMatch[];
}

// Tab 1: Visão Geral (Overview)
function VisaoGeralTab({ tournament, teams, groups, matches }: { tournament?: any, teams?: any[], groups?: any[], matches?: any[] }) {
  if (!tournament) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Nenhum Torneio Selecionado</h3>
          <p className="text-sm text-gray-600">Selecione um torneio para visualizar os detalhes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Informações do Torneio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Nome do Torneio</Label>
              <p className="font-semibold">{tournament.name || 'Não informado'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Categoria</Label>
              <p className="font-semibold">{tournament.category || 'Sub-15/17'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Data de Início</Label>
              <p className="font-semibold">
                {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('pt-BR') : 'Não informado'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Data de Término</Label>
              <p className="font-semibold">
                {tournament.endDate ? new Date(tournament.endDate).toLocaleDateString('pt-BR') : 'Não informado'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Status</Label>
              <Badge variant={tournament.status === 'active' ? 'default' : 'secondary'}>
                {tournament.status === 'active' ? 'Ativo' : 
                 tournament.status === 'upcoming' ? 'Programado' : 
                 tournament.status === 'completed' ? 'Finalizado' : 'Programado'}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Formato</Label>
              <p className="font-semibold">Mineiro Sub-15/17</p>
            </div>
          </div>
          {tournament.description && (
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-600">Descrição</Label>
              <p className="mt-1">{tournament.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold">Times Registrados</h3>
            <p className="text-2xl font-bold text-blue-600">{teams?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-semibold">Partidas Realizadas</h3>
            <p className="text-2xl font-bold text-green-600">
              {matches?.filter((match: any) => match.status === 'completed').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-semibold">Grupos Criados</h3>
            <p className="text-2xl font-bold text-purple-600">{groups?.length || 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Tab 2: Times
function TimesTab({ teams, tournamentId }: { teams: TournamentTeam[], tournamentId?: number }) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TournamentTeam | null>(null);

  // Get current user to fetch adversary teams
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch adversary teams for the dropdown
  const { data: adversaryTeams } = useQuery({
    queryKey: ['/api/adversary-teams', (user as any)?.clubId, (user as any)?.seasonId],
    queryFn: async () => {
      if (!(user as any)?.clubId || !(user as any)?.seasonId) return [];
      return apiRequest(`/api/adversary-teams?clubId=${(user as any).clubId}&seasonId=${(user as any).seasonId}`, "GET");
    },
    enabled: !!(user as any)?.clubId && !!(user as any)?.seasonId,
  });

  const addTeamMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/tournaments/${tournamentId}/teams/bulk`, "POST", {
        teams: data.teamsToAdd,
        category: data.category
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/details`] });
      toast({
        title: "Times adicionados",
        description: "Times cadastrados com sucesso no torneio.",
      });
      setShowAddDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar times",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sub15Teams = teams.filter(team => team.category === 'sub-15');
  const sub17Teams = teams.filter(team => team.category === 'sub-17');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gerenciar Times</h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Time
        </Button>
      </div>

      {/* Add Team Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Time</DialogTitle>
            <DialogDescription>
              Cadastre um novo time para o torneio Mineiro Sub-15/17
            </DialogDescription>
          </DialogHeader>
          <AddTeamForm
            onSubmit={(data) => {
              addTeamMutation.mutate(data);
            }}
            isLoading={addTeamMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Sub-15 Teams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            Times Sub-15
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sub15Teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sub15Teams.map((team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={team.badgeUrl || '/uploads/badges/default-badge.png'} 
                        alt={team.teamName} 
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/uploads/badges/default-badge.png';
                        }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{team.teamName}</h3>
                        <p className="text-sm text-gray-600">Sub-15</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingTeam(team)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum time Sub-15 cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sub-17 Teams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            Times Sub-17
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sub17Teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sub17Teams.map((team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={team.badgeUrl || '/uploads/badges/default-badge.png'} 
                        alt={team.teamName} 
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/uploads/badges/default-badge.png';
                        }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{team.teamName}</h3>
                        <p className="text-sm text-gray-600">Sub-17</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingTeam(team)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum time Sub-17 cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Tab 3: Grupos
function GruposTab({ teams, groups, tournamentId }: { teams: TournamentTeam[], groups: TournamentGroup[], tournamentId?: number }) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [groupsPerCategory, setGroupsPerCategory] = useState(2);
  const [showReorganizeDialog, setShowReorganizeDialog] = useState(false);
  const [tempTeamAssignments, setTempTeamAssignments] = useState<{[teamId: number]: number | null}>({});

  const createGroupsMutation = useMutation({
    mutationFn: async (data: { groupsPerCategory: number }) => {
      return await apiRequest(`/api/tournaments/${tournamentId}/create-groups`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/details`] });
      toast({
        title: "Grupos criados com sucesso",
        description: "Os times foram distribuídos nos grupos automaticamente.",
      });
      setShowCreateDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar grupos",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTeamAssignmentsMutation = useMutation({
    mutationFn: async (assignments: {[teamId: number]: number | null}) => {
      const updates = Object.entries(assignments).map(([teamId, groupId]) => ({
        teamId: parseInt(teamId),
        groupId: groupId
      }));
      return await apiRequest(`/api/tournaments/${tournamentId}/teams/assign-groups`, "POST", { assignments: updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/details`] });
      toast({
        title: "Times reorganizados",
        description: "Os times foram movidos para os grupos selecionados.",
      });
      setShowReorganizeDialog(false);
      setTempTeamAssignments({});
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reorganizar times",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sub15Teams = teams.filter(team => team.category === 'sub-15');
  const sub17Teams = teams.filter(team => team.category === 'sub-17');
  const sub15Groups = groups.filter(group => group.category === 'sub-15');
  const sub17Groups = groups.filter(group => group.category === 'sub-17');

  const handleCreateGroups = () => {
    if (sub15Teams.length === 0 && sub17Teams.length === 0) {
      toast({
        title: "Nenhum time cadastrado",
        description: "Cadastre times primeiro antes de criar os grupos.",
        variant: "destructive",
      });
      return;
    }
    createGroupsMutation.mutate({ groupsPerCategory });
  };

  const handleReorganizeGroups = () => {
    // Initialize temp assignments with current team assignments
    const currentAssignments: {[teamId: number]: number | null} = {};
    teams.forEach(team => {
      currentAssignments[team.id] = team.groupId;
    });
    setTempTeamAssignments(currentAssignments);
    setShowReorganizeDialog(true);
  };

  const handleTeamAssignment = (teamId: number, groupId: number | null) => {
    setTempTeamAssignments(prev => ({
      ...prev,
      [teamId]: groupId
    }));
  };

  const handleSaveReorganization = () => {
    // Only send changes that differ from current assignments
    const changes: {[teamId: number]: number | null} = {};
    Object.entries(tempTeamAssignments).forEach(([teamId, groupId]) => {
      const team = teams.find(t => t.id === parseInt(teamId));
      if (team && team.groupId !== groupId) {
        changes[parseInt(teamId)] = groupId;
      }
    });

    if (Object.keys(changes).length === 0) {
      toast({
        title: "Nenhuma alteração",
        description: "Nenhum time foi movido de grupo.",
      });
      return;
    }

    updateTeamAssignmentsMutation.mutate(changes);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gerenciar Grupos</h2>
        <div className="space-x-2">
          {groups.length > 0 && (
            <Button variant="outline" onClick={handleReorganizeGroups}>
              <Edit className="h-4 w-4 mr-2" />
              Reorganizar Grupos
            </Button>
          )}
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {groups.length > 0 ? 'Recriar Grupos' : 'Criar Grupos'}
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Grupos - Primeira Fase</CardTitle>
            <CardDescription>
              Organize os times em grupos para a primeira fase do torneio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Grupos não criados</h3>
              <p className="mb-4">
                Times cadastrados: {sub15Teams.length} Sub-15, {sub17Teams.length} Sub-17
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Grupos Automaticamente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Sub-15 Groups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Grupos Sub-15
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sub15Groups.map((group) => {
                  const groupTeams = sub15Teams.filter(team => team.groupId === group.id);
                  return (
                    <Card key={group.id} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{group.groupName}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {groupTeams.map((team) => (
                            <div key={team.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                              <img 
                                src={team.badgeUrl || '/uploads/badges/default-badge.png'} 
                                alt={team.teamName} 
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = '/uploads/badges/default-badge.png';
                                }}
                              />
                              <span className="font-medium">{team.teamName}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sub-17 Groups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                Grupos Sub-17
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sub17Groups.map((group) => {
                  const groupTeams = sub17Teams.filter(team => team.groupId === group.id);
                  return (
                    <Card key={group.id} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{group.groupName}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {groupTeams.map((team) => (
                            <div key={team.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                              <img 
                                src={team.badgeUrl || '/uploads/badges/default-badge.png'} 
                                alt={team.teamName} 
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = '/uploads/badges/default-badge.png';
                                }}
                              />
                              <span className="font-medium">{team.teamName}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Groups Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Grupos</DialogTitle>
            <DialogDescription>
              Configure quantos grupos serão criados para cada categoria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Grupos por Categoria</Label>
              <Select value={groupsPerCategory.toString()} onValueChange={(value) => setGroupsPerCategory(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Grupos (A, B)</SelectItem>
                  <SelectItem value="3">3 Grupos (A, B, C)</SelectItem>
                  <SelectItem value="4">4 Grupos (A, B, C, D)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-600">
              <p>Times Sub-15: {sub15Teams.length}</p>
              <p>Times Sub-17: {sub17Teams.length}</p>
              <p>Cada grupo terá aproximadamente {Math.ceil(Math.max(sub15Teams.length, sub17Teams.length) / groupsPerCategory)} times</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateGroups}
                disabled={createGroupsMutation.isPending}
              >
                {createGroupsMutation.isPending ? 'Criando...' : 'Criar Grupos'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reorganize Groups Dialog */}
      <Dialog open={showReorganizeDialog} onOpenChange={setShowReorganizeDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reorganizar Times nos Grupos</DialogTitle>
            <DialogDescription>
              Mova os times manualmente para os grupos desejados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Sub-15 Teams */}
            {sub15Teams.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Times Sub-15
                </h3>
                <div className="space-y-3">
                  {sub15Teams.map((team) => (
                    <div key={team.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <img 
                        src={team.badgeUrl || '/uploads/badges/default-badge.png'} 
                        alt={team.teamName} 
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/uploads/badges/default-badge.png';
                        }}
                      />
                      <span className="font-medium flex-1">{team.teamName}</span>
                      <Select 
                        value={tempTeamAssignments[team.id]?.toString() || "none"} 
                        onValueChange={(value) => handleTeamAssignment(team.id, value === "none" ? null : parseInt(value))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem grupo</SelectItem>
                          {sub15Groups.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.groupName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-17 Teams */}
            {sub17Teams.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  Times Sub-17
                </h3>
                <div className="space-y-3">
                  {sub17Teams.map((team) => (
                    <div key={team.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <img 
                        src={team.badgeUrl || '/uploads/badges/default-badge.png'} 
                        alt={team.teamName} 
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/uploads/badges/default-badge.png';
                        }}
                      />
                      <span className="font-medium flex-1">{team.teamName}</span>
                      <Select 
                        value={tempTeamAssignments[team.id]?.toString() || "none"} 
                        onValueChange={(value) => handleTeamAssignment(team.id, value === "none" ? null : parseInt(value))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem grupo</SelectItem>
                          {sub17Groups.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.groupName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowReorganizeDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveReorganization}
                disabled={updateTeamAssignmentsMutation.isPending}
              >
                {updateTeamAssignmentsMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Match Result Row Component with editable scores
function MatchResultRow({ match, teams, tournamentId }: {
  match: TournamentMatch;
  teams: TournamentTeam[];
  tournamentId?: number;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [team1Score, setTeam1Score] = useState(match.team1Score?.toString() || '');
  const [team2Score, setTeam2Score] = useState(match.team2Score?.toString() || '');
  const [showEditDialog, setShowEditDialog] = useState(false);

  const updateResultMutation = useMutation({
    mutationFn: async ({ team1Score, team2Score }: { team1Score: number; team2Score: number }) => {
      return await apiRequest(`/api/tournaments/matches/${match.id}/result`, "PATCH", {
        team1Score,
        team2Score
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/details`] });
      toast({
        title: "Resultado atualizado",
        description: "O placar da partida foi salvo com sucesso.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar resultado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tournament-matches/${match.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/details`] });
      toast({
        title: "Partida removida",
        description: "A partida foi excluída do cronograma.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir partida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editMatchMutation = useMutation({
    mutationFn: async (matchData: any) => {
      return await apiRequest(`/api/tournament-matches/${match.id}`, "PUT", matchData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/details`] });
      toast({
        title: "Partida atualizada",
        description: "As informações da partida foram salvas.",
      });
      setShowEditDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar partida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);
    
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      toast({
        title: "Placar inválido",
        description: "Digite placares válidos (números positivos).",
        variant: "destructive",
      });
      return;
    }

    updateResultMutation.mutate({ team1Score: score1, team2Score: score2 });
  };

  const handleCancel = () => {
    setTeam1Score(match.team1Score?.toString() || '');
    setTeam2Score(match.team2Score?.toString() || '');
    setIsEditing(false);
  };

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);

  return (
    <div className="bg-white border rounded-lg py-3 px-4 shadow-sm">
      {/* Date Header */}
      <div className="text-center text-xs text-gray-600 mb-2">
        {match.scheduledDate ? new Date(match.scheduledDate).toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }) : 'Data não definida'}
      </div>

      {/* Match Content */}
      <div className="flex items-center justify-between">
        {/* Time */}
        <div className="text-xs text-gray-600 w-10 text-left">
          {match.scheduledDate ? (() => {
            // Convert from UTC to Brazil time (UTC-3)
            const utcDate = new Date(match.scheduledDate);
            const brazilTime = new Date(utcDate.getTime() - (3 * 60 * 60 * 1000));
            const hours = String(brazilTime.getUTCHours()).padStart(2, '0');
            const minutes = String(brazilTime.getUTCMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
          })() : ''}
        </div>

        {/* Team 1 */}
        <div className="flex items-center gap-2 flex-1 justify-end pr-3">
          <span className="font-medium text-sm text-right">{team1?.teamName || 'Time 1'}</span>
          {team1?.badgeUrl && (
            <img 
              src={team1.badgeUrl} 
              alt={team1.teamName}
              className="w-6 h-6 object-contain"
            />
          )}
        </div>

        {/* Score Section */}
        <div className="flex items-center">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={team1Score}
                onChange={(e) => setTeam1Score(e.target.value)}
                className="w-8 h-6 text-center text-sm font-bold p-1"
                min="0"
              />
              <span className="text-sm font-bold mx-1">X</span>
              <Input
                type="number"
                value={team2Score}
                onChange={(e) => setTeam2Score(e.target.value)}
                className="w-8 h-6 text-center text-sm font-bold p-1"
                min="0"
              />
              <Button size="sm" className="h-6 w-6 p-0 ml-2" onClick={handleSave} disabled={updateResultMutation.isPending}>
                ✓
              </Button>
              <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={handleCancel}>
                ✕
              </Button>
            </div>
          ) : (
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded min-w-[60px] justify-center"
              onClick={() => setIsEditing(true)}
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
        </div>

        {/* Team 2 */}
        <div className="flex items-center gap-2 flex-1 pl-3">
          {team2?.badgeUrl && (
            <img 
              src={team2.badgeUrl} 
              alt={team2.teamName}
              className="w-6 h-6 object-contain"
            />
          )}
          <span className="font-medium text-sm">{team2?.teamName || 'Time 2'}</span>
        </div>

        {/* Match Actions */}
        <div className="text-xs text-gray-500 w-20 text-right">
          <div className="flex items-center gap-1 justify-end mb-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 text-blue-600 hover:text-blue-800"
              onClick={(e) => {
                e.stopPropagation();
                setShowEditDialog(true);
              }}
              title="Editar partida"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 text-red-600 hover:text-red-800"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Tem certeza que deseja excluir esta partida? Esta ação não pode ser desfeita.')) {
                  deleteMatchMutation.mutate();
                }
              }}
              disabled={deleteMatchMutation.isPending}
              title="Excluir partida"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div>Jogo {match.id}</div>
          {match.venue && (
            <div className="flex items-center gap-1 justify-end">
              <MapPin className="h-2 w-2" />
              <span className="truncate">{match.venue.slice(0, 10)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit Match Dialog */}
      <EditMatchDialog 
        match={match}
        teams={teams}
        tournamentId={tournamentId}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={editMatchMutation.mutate}
        isLoading={editMatchMutation.isPending}
      />
    </div>
  );
}

// Edit Match Dialog Component
function EditMatchDialog({ 
  match, 
  teams, 
  tournamentId, 
  open, 
  onOpenChange, 
  onSave, 
  isLoading 
}: {
  match: TournamentMatch;
  teams: TournamentTeam[];
  tournamentId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  isLoading: boolean;
}) {
  const { data: stadiums } = useQuery({
    queryKey: ['/api/stadiums'],
  });

  // Get teams from the same category as the current match
  const team1 = teams.find(t => t.id === match.team1Id);
  const currentCategory = team1?.category;
  const categoryTeams = teams.filter(t => t.category === currentCategory);

  const editForm = useForm({
    defaultValues: {
      team1Id: match.team1Id,
      team2Id: match.team2Id,
      scheduledDate: match.scheduledDate ? new Date(match.scheduledDate).toISOString().slice(0, 16) : '',
      venue: match.venue || '',
      round: match.round,
      phase: match.phase
    }
  });

  const handleSubmit = (data: any) => {
    const formattedData = {
      ...data,
      scheduledDate: data.scheduledDate || null, // Keep as datetime-local string
      team1Id: parseInt(data.team1Id),
      team2Id: parseInt(data.team2Id),
      round: parseInt(data.round)
    };
    onSave(formattedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Partida</DialogTitle>
        </DialogHeader>
        
        <Form {...editForm}>
          <form onSubmit={editForm.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={editForm.control}
              name="team1Id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time 1</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o time 1" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryTeams.map((team) => (
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
              control={editForm.control}
              name="team2Id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time 2</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o time 2" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryTeams.map((team) => (
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
              control={editForm.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data e Horário</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={editForm.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estádio</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estádio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stadiums?.map((stadium: any) => (
                        <SelectItem key={stadium.id} value={stadium.name}>
                          {stadium.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={editForm.control}
              name="round"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rodada</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Tab 4: Primeira Fase
function PrimeiraFaseTab({ matches, teams, groups, tournamentId }: { 
  matches: TournamentMatch[], 
  teams: TournamentTeam[], 
  groups: TournamentGroup[], 
  tournamentId?: number 
}) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkCreateDialog, setShowBulkCreateDialog] = useState(false);
  const [selectedRound, setSelectedRound] = useState(1);

  const createMatchMutation = useMutation({
    mutationFn: async (matchData: any) => {
      return await apiRequest(`/api/tournaments/${tournamentId}/matches`, "POST", matchData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/details`] });
      toast({
        title: "Partida criada",
        description: "A partida foi adicionada ao cronograma.",
      });
      setShowCreateDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar partida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (bulkData: any) => {
      return await apiRequest(`/api/tournaments/${tournamentId}/matches/bulk-with-replication`, "POST", bulkData);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/details`] });
      toast({
        title: "Partidas criadas com sucesso",
        description: `${data.matchesCreated} partida(s) adicionada(s) ao cronograma.${data.replicated ? ' Jogos replicados para outra categoria.' : ''}`,
      });
      setShowBulkCreateDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar partidas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Since matches don't have category field directly, we need to get it from the teams
  const getMatchCategory = (match: any) => {
    const team1 = teams.find(t => t.id === match.team1Id);
    return team1?.category || 'unknown';
  };

  // Filter only group phase matches (exclude final phase)
  const groupMatches = matches.filter(match => match.phase === 'group' || !match.phase);
  
  // Get all unique rounds from group matches only
  const roundsSet = new Set<number>();
  groupMatches.forEach(m => roundsSet.add(m.round));
  const availableRounds = Array.from(roundsSet).sort((a, b) => a - b);
  
  // Filter matches by selected round from group matches only
  const roundMatches = groupMatches.filter(match => match.round === selectedRound);
  const sub15Matches = roundMatches.filter(match => getMatchCategory(match) === 'sub-15');
  const sub17Matches = roundMatches.filter(match => getMatchCategory(match) === 'sub-17');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Partidas - Primeira Fase</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkCreateDialog(true)} data-testid="button-bulk-create-matches">
            <Calendar className="h-4 w-4 mr-2" />
            Criação em Massa
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-match">
            <Plus className="h-4 w-4 mr-2" />
            Criar Partida
          </Button>
        </div>
      </div>

      {/* Round Navigation */}
      {availableRounds.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRound(Math.max(1, selectedRound - 1))}
            disabled={selectedRound <= 1}
          >
            ← Anterior
          </Button>
          
          <div className="flex gap-1">
            {availableRounds.map((round) => (
              <Button
                key={round}
                variant={selectedRound === round ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRound(round)}
                className="min-w-[40px]"
              >
                {round}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRound(Math.min(Math.max(...availableRounds), selectedRound + 1))}
            disabled={selectedRound >= Math.max(...availableRounds)}
          >
            Próxima →
          </Button>
        </div>
      )}

      {/* Round Header */}
      <div className="bg-red-600 text-white text-center py-2 rounded-lg font-bold text-lg">
        RODADA {selectedRound}
      </div>

      {/* Sub-15 Matches */}
      {sub15Matches.length > 0 && (
        <div>
          <div className="bg-green-600 text-white text-center py-1 rounded-t-lg font-medium text-sm">
            SUB-15
          </div>
          <div className="bg-gray-50 p-3 rounded-b-lg space-y-2">
            {sub15Matches.map((match) => (
              <MatchResultRow 
                key={match.id} 
                match={match} 
                teams={teams} 
                tournamentId={tournamentId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sub-17 Matches */}
      {sub17Matches.length > 0 && (
        <div>
          <div className="bg-orange-600 text-white text-center py-1 rounded-t-lg font-medium text-sm">
            SUB-17
          </div>
          <div className="bg-gray-50 p-3 rounded-b-lg space-y-2">
            {sub17Matches.map((match) => (
              <MatchResultRow 
                key={match.id} 
                match={match} 
                teams={teams} 
                tournamentId={tournamentId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {matches.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cronograma de Partidas</CardTitle>
            <CardDescription>
              Crie partidas manualmente para organizar o torneio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma partida criada</h3>
              <p className="mb-4">Comece criando as partidas da primeira fase manualmente</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Match Dialog */}
      <CreateMatchDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        teams={teams}
        groups={groups}
        onSubmit={(data) => createMatchMutation.mutate(data)}
        isLoading={createMatchMutation.isPending}
      />

      {/* Bulk Create Matches Dialog */}
      <BulkCreateMatchesDialog
        open={showBulkCreateDialog}
        onOpenChange={setShowBulkCreateDialog}
        teams={teams}
        groups={groups}
        tournamentId={tournamentId}
        onSubmit={(data) => bulkCreateMutation.mutate(data)}
        isLoading={bulkCreateMutation.isPending}
      />
    </div>
  );
}

// Create Match Dialog Component
function CreateMatchDialog({ 
  open, 
  onOpenChange, 
  teams, 
  groups, 
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: TournamentTeam[];
  groups: TournamentGroup[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState<'sub-15' | 'sub-17'>('sub-15');
  const [selectedHomeTeam, setSelectedHomeTeam] = useState<string>('');
  const [selectedAwayTeam, setSelectedAwayTeam] = useState<string>('');
  const [matchDate, setMatchDate] = useState<string>('');
  const [matchTime, setMatchTime] = useState<string>('');
  const [round, setRound] = useState<string>('1');
  const [stadium, setStadium] = useState<string>('');

  // Fetch stadiums for dropdown
  const { user } = useAuth();
  const clubId = user?.clubId;
  const seasonId = user?.seasonId;
  
  const { data: stadiums = [] } = useQuery({
    queryKey: ['/api/stadiums', clubId, seasonId],
    queryFn: () => apiRequest(`/api/stadiums?clubId=${clubId}&seasonId=${seasonId}`, "GET"),
    enabled: open && !!clubId && !!seasonId,
  });

  const categoryTeams = teams.filter(team => team.category === selectedCategory);

  const handleSubmit = () => {
    if (!selectedHomeTeam || !selectedAwayTeam) {
      return;
    }

    const homeTeam = teams.find(t => t.id.toString() === selectedHomeTeam);
    const awayTeam = teams.find(t => t.id.toString() === selectedAwayTeam);

    if (!homeTeam || !awayTeam) {
      return;
    }

    // Create datetime string without timezone conversion
    const matchDateTimeStr = matchDate && matchTime 
      ? `${matchDate}T${matchTime}:00`
      : null;

    const matchData = {
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      category: selectedCategory,
      phase: 'group',
      round: parseInt(round),
      matchDate: matchDateTimeStr,
      stadium: stadium === 'none' ? null : stadium,
    };

    onSubmit(matchData);
  };

  const resetForm = () => {
    setSelectedHomeTeam('');
    setSelectedAwayTeam('');
    setMatchDate('');
    setMatchTime('');
    setRound('1');
    setStadium('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Nova Partida</DialogTitle>
          <DialogDescription>
            Adicione uma partida manualmente ao cronograma do torneio
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Category Selection */}
          <div>
            <Label>Categoria</Label>
            <Select value={selectedCategory} onValueChange={(value: 'sub-15' | 'sub-17') => {
              setSelectedCategory(value);
              setSelectedHomeTeam('');
              setSelectedAwayTeam('');
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sub-15">Sub-15</SelectItem>
                <SelectItem value="sub-17">Sub-17</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Teams Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Time da Casa</Label>
              <Select value={selectedHomeTeam} onValueChange={setSelectedHomeTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar time" />
                </SelectTrigger>
                <SelectContent>
                  {categoryTeams.map((team) => (
                    <SelectItem 
                      key={team.id} 
                      value={team.id.toString()}
                      disabled={team.id.toString() === selectedAwayTeam}
                    >
                      {team.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Time Visitante</Label>
              <Select value={selectedAwayTeam} onValueChange={setSelectedAwayTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar time" />
                </SelectTrigger>
                <SelectContent>
                  {categoryTeams.map((team) => (
                    <SelectItem 
                      key={team.id} 
                      value={team.id.toString()}
                      disabled={team.id.toString() === selectedHomeTeam}
                    >
                      {team.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Match Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data da Partida</Label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <Label>Horário</Label>
              <input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rodada</Label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                    <SelectItem key={r} value={r.toString()}>
                      Rodada {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estádio (Opcional)</Label>
              <Select value={stadium} onValueChange={setStadium}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estádio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem estádio definido</SelectItem>
                  {stadiums.map((stad: any) => (
                    <SelectItem key={stad.id} value={stad.name}>{stad.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !selectedHomeTeam || !selectedAwayTeam}
            >
              {isLoading ? 'Criando...' : 'Criar Partida'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Bulk Create Matches Dialog Component
function BulkCreateMatchesDialog({
  open,
  onOpenChange,
  teams,
  groups,
  tournamentId,
  onSubmit,
  isLoading
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: TournamentTeam[];
  groups: TournamentGroup[];
  tournamentId?: number;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const { user } = useAuth();
  const clubId = user?.clubId;
  const seasonId = user?.seasonId;

  const [category, setCategory] = useState<'sub-15' | 'sub-17'>('sub-15');
  const [round, setRound] = useState<string>('1');
  const [matchDate, setMatchDate] = useState<string>('');
  const [matchTime, setMatchTime] = useState<string>('');
  const [stadium, setStadium] = useState<string>('');
  const [replicateToCategory, setReplicateToCategory] = useState<boolean>(false);
  const [timeOffset, setTimeOffset] = useState<string>('02:00');
  const [matchesList, setMatchesList] = useState<Array<{ homeTeamId: string; awayTeamId: string; }>>([
    { homeTeamId: '', awayTeamId: '' }
  ]);

  const { data: stadiums = [] } = useQuery({
    queryKey: ['/api/stadiums', clubId, seasonId],
    queryFn: () => apiRequest(`/api/stadiums?clubId=${clubId}&seasonId=${seasonId}`, "GET"),
    enabled: open && !!clubId && !!seasonId,
  });

  const categoryTeams = teams.filter(team => team.category === category);
  const targetCategory = category === 'sub-15' ? 'sub-17' : 'sub-15';

  const addMatch = () => {
    setMatchesList([...matchesList, { homeTeamId: '', awayTeamId: '' }]);
  };

  const removeMatch = (index: number) => {
    setMatchesList(matchesList.filter((_, i) => i !== index));
  };

  const updateMatch = (index: number, field: 'homeTeamId' | 'awayTeamId', value: string) => {
    const updated = [...matchesList];
    updated[index][field] = value;
    setMatchesList(updated);
  };

  const handleSubmit = () => {
    const validMatches = matchesList.filter(m => m.homeTeamId && m.awayTeamId);
    
    if (validMatches.length === 0) {
      return;
    }

    // Create datetime string without timezone conversion
    const matchDateTimeStr = matchDate && matchTime 
      ? `${matchDate}T${matchTime}:00`
      : null;

    const matchesData = validMatches.map(match => {
      const homeTeam = teams.find(t => t.id.toString() === match.homeTeamId);
      const awayTeam = teams.find(t => t.id.toString() === match.awayTeamId);

      return {
        groupId: homeTeam?.groupId,
        phase: 'group',
        round: parseInt(round),
        team1Id: homeTeam?.id,
        team2Id: awayTeam?.id,
        scheduledDate: matchDateTimeStr,
        venue: stadium === 'none' ? null : stadium,
        status: 'scheduled'
      };
    });

    const bulkData = {
      matches: matchesData,
      replicateToCategory: replicateToCategory ? targetCategory : null,
      timeOffset: replicateToCategory ? timeOffset : null,
    };

    console.log('🔍 Bulk Create Debug:', {
      matchesListLength: matchesList.length,
      validMatchesLength: validMatches.length,
      matchesDataLength: matchesData.length,
      willReplicate: replicateToCategory,
      expectedTotal: matchesData.length * (replicateToCategory ? 2 : 1),
      matchesList,
      matchesData
    });

    onSubmit(bulkData);
  };

  const resetForm = () => {
    setCategory('sub-15');
    setRound('1');
    setMatchDate('');
    setMatchTime('');
    setStadium('');
    setReplicateToCategory(false);
    setTimeOffset('02:00');
    setMatchesList([{ homeTeamId: '', awayTeamId: '' }]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criação em Massa de Partidas</DialogTitle>
          <DialogDescription>
            Adicione múltiplas partidas de uma rodada simultaneamente. Opcionalmente, replique para outra categoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Categoria Base</Label>
              <Select value={category} onValueChange={(value: 'sub-15' | 'sub-17') => {
                setCategory(value);
                setMatchesList([{ homeTeamId: '', awayTeamId: '' }]);
              }}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sub-15">Sub-15</SelectItem>
                  <SelectItem value="sub-17">Sub-17</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rodada</Label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger data-testid="select-round">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((r) => (
                    <SelectItem key={r} value={r.toString()}>
                      Rodada {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estádio</Label>
              <Select value={stadium} onValueChange={setStadium}>
                <SelectTrigger data-testid="select-stadium">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem estádio</SelectItem>
                  {stadiums.map((stad: any) => (
                    <SelectItem key={stad.id} value={stad.name}>{stad.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data da Rodada</Label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="input-match-date"
              />
            </div>
            <div>
              <Label>Horário Base</Label>
              <input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="input-match-time"
              />
            </div>
          </div>

          {/* Matches List */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-base font-semibold">Partidas da Rodada</Label>
              <Button type="button" size="sm" onClick={addMatch} variant="outline" data-testid="button-add-match">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Partida
              </Button>
            </div>

            <div className="space-y-3">
              {matchesList.map((match, index) => (
                <div key={index} className="flex gap-2 items-end bg-white p-3 rounded-md border">
                  <div className="flex-1">
                    <Label className="text-xs">Time da Casa</Label>
                    <Select 
                      value={match.homeTeamId} 
                      onValueChange={(value) => updateMatch(index, 'homeTeamId', value)}
                    >
                      <SelectTrigger data-testid={`select-home-team-${index}`}>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryTeams.map((team) => (
                          <SelectItem 
                            key={team.id} 
                            value={team.id.toString()}
                            disabled={team.id.toString() === match.awayTeamId}
                          >
                            {team.teamName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-center px-2 pb-2">
                    <span className="text-sm font-bold">vs</span>
                  </div>

                  <div className="flex-1">
                    <Label className="text-xs">Time Visitante</Label>
                    <Select 
                      value={match.awayTeamId} 
                      onValueChange={(value) => updateMatch(index, 'awayTeamId', value)}
                    >
                      <SelectTrigger data-testid={`select-away-team-${index}`}>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryTeams.map((team) => (
                          <SelectItem 
                            key={team.id} 
                            value={team.id.toString()}
                            disabled={team.id.toString() === match.homeTeamId}
                          >
                            {team.teamName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {matchesList.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMatch(index)}
                      className="mb-0.5"
                      data-testid={`button-remove-match-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Replication Options */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-start space-x-2 mb-3">
              <Checkbox
                id="replicate"
                checked={replicateToCategory}
                onCheckedChange={(checked) => setReplicateToCategory(checked as boolean)}
                data-testid="checkbox-replicate"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="replicate"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Replicar para {targetCategory.toUpperCase()}
                </label>
                <p className="text-sm text-muted-foreground">
                  Criar as mesmas partidas para a categoria {targetCategory.toUpperCase()} com horário diferente
                </p>
              </div>
            </div>

            {replicateToCategory && (
              <div className="mt-3">
                <Label>Diferença de Horário (HH:MM)</Label>
                <input
                  type="time"
                  value={timeOffset}
                  onChange={(e) => setTimeOffset(e.target.value)}
                  className="flex h-10 w-full max-w-xs rounded-md border border-input bg-white px-3 py-2 text-sm"
                  data-testid="input-time-offset"
                  placeholder="Ex: 02:00 para 2 horas depois"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: Se {category.toUpperCase()} joga às 14:00 e você colocar +02:00, {targetCategory.toUpperCase()} jogará às 16:00
                </p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-100 p-3 rounded-md text-sm">
            <p className="font-semibold mb-1">Resumo:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{matchesList.filter(m => m.homeTeamId && m.awayTeamId).length} partida(s) serão criadas para {category.toUpperCase()}</li>
              {replicateToCategory && (
                <li>{matchesList.filter(m => m.homeTeamId && m.awayTeamId).length} partida(s) serão replicadas para {targetCategory.toUpperCase()} ({timeOffset} depois)</li>
              )}
              <li>Total: {matchesList.filter(m => m.homeTeamId && m.awayTeamId).length * (replicateToCategory ? 2 : 1)} partida(s)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || matchesList.filter(m => m.homeTeamId && m.awayTeamId).length === 0}
              data-testid="button-submit-bulk"
            >
              {isLoading ? 'Criando...' : `Criar ${matchesList.filter(m => m.homeTeamId && m.awayTeamId).length * (replicateToCategory ? 2 : 1)} Partida(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Tab 5: Ranking
function RankingTab({ teams, matches, groups }: { teams: TournamentTeam[], matches: TournamentMatch[], groups: TournamentGroup[] }) {
  // Calculate team statistics from matches - ONLY for first phase (group stage)
  const calculateTeamStats = (teamId: number) => {
    const teamMatches = matches.filter(m => 
      (m.team1Id === teamId || m.team2Id === teamId) && 
      m.team1Score !== null && m.team2Score !== null &&
      m.phase === 'group' // ONLY count first phase matches
    );

    let points = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    const recentForm: string[] = [];

    teamMatches.forEach(match => {
      const isTeam1 = match.team1Id === teamId;
      const teamScore = isTeam1 ? match.team1Score! : match.team2Score!;
      const opponentScore = isTeam1 ? match.team2Score! : match.team1Score!;

      goalsFor += teamScore;
      goalsAgainst += opponentScore;

      if (teamScore > opponentScore) {
        wins++;
        points += 3;
        recentForm.push('W');
      } else if (teamScore === opponentScore) {
        draws++;
        points += 1;
        recentForm.push('D');
      } else {
        losses++;
        recentForm.push('L');
      }
    });

    return {
      played: teamMatches.length,
      points,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      recentForm: recentForm.slice(-5) // Last 5 matches
    };
  };



  // Group teams by category and then by groups
  const sub15Teams = teams.filter(t => t.category === 'sub-15');
  const sub17Teams = teams.filter(t => t.category === 'sub-17');

  const createRanking = (categoryTeams: TournamentTeam[]) => {
    return categoryTeams
      .map(team => ({
        ...team,
        stats: calculateTeamStats(team.id)
      }))
      .sort((a, b) => {
        // 1. Points
        if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
        // 2. More Victories
        if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
        // 3. Goal Difference
        if (b.stats.goalDifference !== a.stats.goalDifference) return b.stats.goalDifference - a.stats.goalDifference;
        // 4. Most Goals for
        if (b.stats.goalsFor !== a.stats.goalsFor) return b.stats.goalsFor - a.stats.goalsFor;
        // 5. Less Goals against
        if (a.stats.goalsAgainst !== b.stats.goalsAgainst) return a.stats.goalsAgainst - b.stats.goalsAgainst;
        // 6. Less Yellow cards (not implemented yet)
        // 7. Less Red cards (not implemented yet)
        return 0;
      });
  };

  // Group teams by their tournament groups
  const groupTeamsByGroup = (categoryTeams: TournamentTeam[]) => {
    const grouped = categoryTeams.reduce((acc, team) => {
      const groupId = team.groupId;
      if (!acc[groupId]) acc[groupId] = [];
      acc[groupId].push(team);
      return acc;
    }, {} as Record<number, TournamentTeam[]>);
    
    return Object.entries(grouped).map(([groupId, groupTeams]) => {
      const group = groups.find(g => g.id === parseInt(groupId));
      return {
        groupId: parseInt(groupId),
        groupName: group?.groupName || `Grupo ${groupId}`,
        teams: createRanking(groupTeams)
      };
    });
  };

  const sub15Groups = groupTeamsByGroup(sub15Teams);
  const sub17Groups = groupTeamsByGroup(sub17Teams);
  
  // Combined ranking - show clubs grouped by base group names (Group A, Group B) with combined stats
  const getCombinedClubRanking = (allTeams: TournamentTeam[], allMatches: TournamentMatch[]) => {
    // First, get all teams for each club to calculate combined stats
    const teamsByClub: { [clubName: string]: TournamentTeam[] } = {};
    
    allTeams.forEach(team => {
      const clubName = team.teamName;
      if (!teamsByClub[clubName]) {
        teamsByClub[clubName] = [];
      }
      teamsByClub[clubName].push(team);
    });

    // Group teams by base group name (A or B) instead of specific group IDs
    const teamsByBaseGroup: { [baseGroupName: string]: TournamentTeam[] } = {};
    
    allTeams.forEach(team => {
      const group = groups.find(g => g.id === team.groupId);
      if (group) {
        // Extract base group name (A or B) from group names like "Grupo A Sub-15", "Grupo B Sub-17"
        const baseGroupMatch = group.groupName.match(/Grupo ([AB])/);
        const baseGroupName = baseGroupMatch ? `Grupo ${baseGroupMatch[1]}` : group.groupName;
        
        if (!teamsByBaseGroup[baseGroupName]) {
          teamsByBaseGroup[baseGroupName] = [];
        }
        teamsByBaseGroup[baseGroupName].push(team);
      }
    });
    
    const result: any[] = [];
    
    // Process each base group (A, B)
    Object.entries(teamsByBaseGroup).forEach(([baseGroupName, groupTeams]) => {
      // Group teams in this base group by club name
      const clubsInGroup: { [clubName: string]: TournamentTeam[] } = {};
      
      groupTeams.forEach(team => {
        const clubName = team.teamName;
        if (!clubsInGroup[clubName]) {
          clubsInGroup[clubName] = [];
        }
        clubsInGroup[clubName].push(team);
      });

      const rankingTeams: any[] = [];
      
      // For each club in this base group, calculate their combined stats from ALL their teams (both categories)
      Object.entries(clubsInGroup).forEach(([clubName, clubTeamsInGroup]) => {
        // Get ALL teams for this club (from both Sub-15 and Sub-17)
        const allClubTeams = teamsByClub[clubName];
        
        // Calculate combined stats from all teams of this club
        let totalPoints = 0;
        let totalPlayed = 0;
        let totalWins = 0;
        let totalDraws = 0;
        let totalLosses = 0;
        let totalGoalsFor = 0;
        let totalGoalsAgainst = 0;
        
        allClubTeams.forEach(team => {
          const stats = calculateTeamStats(team.id);
          totalPoints += stats.points;
          totalPlayed += stats.played;
          totalWins += stats.wins;
          totalDraws += stats.draws;
          totalLosses += stats.losses;
          totalGoalsFor += stats.goalsFor;
          totalGoalsAgainst += stats.goalsAgainst;
        });

        // Get categories for this club
        const firstTeam = clubTeamsInGroup[0];
        const allCategories = allClubTeams.map(t => t.category.toUpperCase()).filter((cat, index, arr) => arr.indexOf(cat) === index);
        const categories = allCategories.sort().join(' + ');
        
        rankingTeams.push({
          id: `combined-${baseGroupName.replace(/\s+/g, '-')}-${clubName.replace(/\s+/g, '-')}`,
          clubId: firstTeam.clubId,
          teamName: clubName,
          category: categories,
          badgeUrl: firstTeam.badgeUrl,
          stats: {
            points: totalPoints,
            played: totalPlayed,
            wins: totalWins,
            draws: totalDraws,
            losses: totalLosses,
            goalsFor: totalGoalsFor,
            goalsAgainst: totalGoalsAgainst,
            goalDifference: totalGoalsFor - totalGoalsAgainst,
            yellowCards: 0,
            redCards: 0
          }
        });
      });
      
      // Sort teams in this group by ranking criteria
      rankingTeams.sort((a, b) => {
        if (a.stats.points !== b.stats.points) return b.stats.points - a.stats.points;
        if (a.stats.wins !== b.stats.wins) return b.stats.wins - a.stats.wins;
        if (a.stats.goalDifference !== b.stats.goalDifference) return b.stats.goalDifference - a.stats.goalDifference;
        if (a.stats.goalsFor !== b.stats.goalsFor) return b.stats.goalsFor - a.stats.goalsFor;
        if (a.stats.goalsAgainst !== b.stats.goalsAgainst) return a.stats.goalsAgainst - b.stats.goalsAgainst;
        return a.teamName.localeCompare(b.teamName);
      });
      
      result.push({
        groupName: baseGroupName,
        teams: rankingTeams
      });
    });
    
    return result;
  };

  const combinedClubGroups = getCombinedClubRanking(teams, matches);

  const renderGroupRanking = (groupRanking: any, categoryTitle: string, colorClass: string) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className={`w-3 h-3 ${colorClass} rounded-full`}></div>
          {categoryTitle} - {groupRanking.groupName}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {groupRanking.teams.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">Nenhum time neste grupo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-1 font-semibold">#</th>
                  <th className="text-left py-2 px-2 font-semibold">Clube</th>
                  <th className="text-center py-2 px-1 font-semibold">Pts</th>
                  <th className="text-center py-2 px-1 font-semibold">PJ</th>
                  <th className="text-center py-2 px-1 font-semibold">V</th>
                  <th className="text-center py-2 px-1 font-semibold">E</th>
                  <th className="text-center py-2 px-1 font-semibold">D</th>
                  <th className="text-center py-2 px-1 font-semibold">GM</th>
                  <th className="text-center py-2 px-1 font-semibold">GC</th>
                  <th className="text-center py-2 px-1 font-semibold">SG</th>
                </tr>
              </thead>
              <tbody>
                {groupRanking.teams.map((team: any, index: number) => (
                  <tr key={team.id} className={`border-b hover:bg-gray-50 ${index === 0 ? 'bg-yellow-50' : ''}`}>
                    <td className="py-2 px-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                        ${index === 0 ? 'bg-yellow-500 text-white' : 
                          index === 1 ? 'bg-gray-400 text-white' : 
                          index === 2 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {team.badgeUrl ? (
                          <img 
                            src={team.badgeUrl} 
                            alt={`${team.teamName} badge`}
                            className="w-6 h-6 object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold ${team.badgeUrl ? 'hidden' : ''}`}>
                          {team.teamName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{team.teamName}</span>
                          {team.category && team.category.includes('+') && (
                            <span className="text-xs text-gray-500">{team.category}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-1 text-center font-bold">{team.stats.points}</td>
                    <td className="py-2 px-1 text-center">{team.stats.played}</td>
                    <td className="py-2 px-1 text-center">{team.stats.wins}</td>
                    <td className="py-2 px-1 text-center">{team.stats.draws}</td>
                    <td className="py-2 px-1 text-center">{team.stats.losses}</td>
                    <td className="py-2 px-1 text-center">{team.stats.goalsFor}</td>
                    <td className="py-2 px-1 text-center">{team.stats.goalsAgainst}</td>
                    <td className="py-2 px-1 text-center font-semibold">
                      <span className={team.stats.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {team.stats.goalDifference > 0 ? '+' : ''}{team.stats.goalDifference}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ranking - Primeira Fase</h2>
        <div className="text-sm text-gray-500">
          Critério: Pontos → Vitórias → Saldo de Gols → Gols Marcados → Gols Sofridos
        </div>
      </div>

      {/* Sub-15 Groups */}
      {sub15Groups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-600">Sub-15</h3>
          {sub15Groups.map((group, index) => (
            <div key={`sub15-${index}`}>
              {renderGroupRanking(group, "Sub-15", "bg-green-500")}
            </div>
          ))}
        </div>
      )}

      {/* Sub-17 Groups */}
      {sub17Groups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-orange-600">Sub-17</h3>
          {sub17Groups.map((group, index) => (
            <div key={`sub17-${index}`}>
              {renderGroupRanking(group, "Sub-17", "bg-orange-500")}
            </div>
          ))}
        </div>
      )}

      {/* Combined Groups */}
      {combinedClubGroups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-blue-600">Classificação Geral</h3>
          {combinedClubGroups.map((group, index) => (
            <div key={`combined-${index}`}>
              {renderGroupRanking(group, "Geral", "bg-blue-500")}
            </div>
          ))}
        </div>
      )}
      
      {sub15Groups.length === 0 && sub17Groups.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Classificação do Torneio</h3>
          <p className="text-gray-600 mb-4">
            As classificações aparecerão aqui após os times serem cadastrados e as partidas realizadas.
          </p>
          <div className="text-sm text-gray-500">
            <p><strong>Critérios de Classificação:</strong></p>
            <p>1º - Maior número de pontos</p>
            <p>2º - Maior número de vitórias</p>
            <p>3º - Melhor saldo de gols</p>
            <p>4º - Maior número de gols marcados</p>
            <p>5º - Menor número de gols sofridos</p>
            <p>6º - Menor número de cartões amarelos</p>
            <p>7º - Menor número de cartões vermelhos</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Advance Teams Dialog
function AdvanceTeamsDialog({ 
  onAdvanceTeams, 
  combinedGroups 
}: { 
  onAdvanceTeams: (groupACount: number, groupBCount: number) => void;
  combinedGroups: any[];
}) {
  const [open, setOpen] = useState(false);
  const [groupACount, setGroupACount] = useState(2);
  const [groupBCount, setGroupBCount] = useState(2);

  const handleAdvance = () => {
    onAdvanceTeams(groupACount, groupBCount);
    setOpen(false);
  };

  const groupA = combinedGroups.find(g => g.groupName === "Grupo A");
  const groupB = combinedGroups.find(g => g.groupName === "Grupo B");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Target className="h-4 w-4 mr-2" />
          Avançar Times
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avançar Times para Grupo Final</DialogTitle>
          <DialogDescription>
            Selecione quantos times de cada grupo avançarão para a fase final
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupA">Times do Grupo A ({groupA?.teams?.length || 0} times)</Label>
            <Select value={groupACount.toString()} onValueChange={(value) => setGroupACount(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.min(8, groupA?.teams?.length || 0) }, (_, i) => i + 1).map(num => (
                  <SelectItem key={num} value={num.toString()}>{num} times</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="groupB">Times do Grupo B ({groupB?.teams?.length || 0} times)</Label>
            <Select value={groupBCount.toString()} onValueChange={(value) => setGroupBCount(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.min(8, groupB?.teams?.length || 0) }, (_, i) => i + 1).map(num => (
                  <SelectItem key={num} value={num.toString()}>{num} times</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdvance}>
            Avançar Times Selecionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Tab 6: Grupo Final
function GrupoFinalTab({ 
  teams, 
  matches, 
  groups, 
  advancedTeams, 
  setAdvancedTeams 
}: { 
  teams: TournamentTeam[], 
  matches: TournamentMatch[], 
  groups: TournamentGroup[],
  advancedTeams: any[],
  setAdvancedTeams: (teams: any[]) => void
}) {
  
  // Calculate team stats function - ONLY for first phase to determine advancement
  const calculateTeamStats = (teamId: number, allTeams: TournamentTeam[], allMatches: TournamentMatch[]) => {
    const teamMatches = allMatches.filter(match => 
      (match.team1Id === teamId || match.team2Id === teamId) &&
      match.phase === 'group' // ONLY count first phase matches for advancement
    );

    let points = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    teamMatches.forEach(match => {
      if (match.team1Score !== null && match.team2Score !== null) {
        const isTeam1 = match.team1Id === teamId;
        const teamScore = isTeam1 ? match.team1Score : match.team2Score;
        const opponentScore = isTeam1 ? match.team2Score : match.team1Score;

        goalsFor += teamScore;
        goalsAgainst += opponentScore;

        if (teamScore > opponentScore) {
          wins++;
          points += 3;
        } else if (teamScore === opponentScore) {
          draws++;
          points += 1;
        } else {
          losses++;
        }
      }
    });

    return {
      points,
      played: wins + draws + losses,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst
    };
  };
  
  // Get combined ranking for advance teams logic
  const teamsByClub: { [clubName: string]: TournamentTeam[] } = {};
  teams.forEach(team => {
    const clubName = team.teamName;
    if (!teamsByClub[clubName]) {
      teamsByClub[clubName] = [];
    }
    teamsByClub[clubName].push(team);
  });

  const teamsByBaseGroup: { [baseGroupName: string]: TournamentTeam[] } = {};
  teams.forEach(team => {
    const group = groups.find(g => g.id === team.groupId);
    if (group) {
      const baseGroupMatch = group.groupName.match(/Grupo ([AB])/);
      const baseGroupName = baseGroupMatch ? `Grupo ${baseGroupMatch[1]}` : group.groupName;
      
      if (!teamsByBaseGroup[baseGroupName]) {
        teamsByBaseGroup[baseGroupName] = [];
      }
      teamsByBaseGroup[baseGroupName].push(team);
    }
  });
  
  const combinedClubGroups: any[] = [];
  Object.entries(teamsByBaseGroup).forEach(([baseGroupName, groupTeams]) => {
    const clubsInGroup: { [clubName: string]: TournamentTeam[] } = {};
    
    groupTeams.forEach(team => {
      const clubName = team.teamName;
      if (!clubsInGroup[clubName]) {
        clubsInGroup[clubName] = [];
      }
      clubsInGroup[clubName].push(team);
    });

    const rankingTeams: any[] = [];
    Object.entries(clubsInGroup).forEach(([clubName, clubTeamsInGroup]) => {
      const allClubTeams = teamsByClub[clubName];
      
      let totalPoints = 0;
      let totalPlayed = 0;
      let totalWins = 0;
      let totalDraws = 0;
      let totalLosses = 0;
      let totalGoalsFor = 0;
      let totalGoalsAgainst = 0;
      
      allClubTeams.forEach(team => {
        const stats = calculateTeamStats(team.id, teams, matches);
        totalPoints += stats.points;
        totalPlayed += stats.played;
        totalWins += stats.wins;
        totalDraws += stats.draws;
        totalLosses += stats.losses;
        totalGoalsFor += stats.goalsFor;
        totalGoalsAgainst += stats.goalsAgainst;
      });

      const firstTeam = clubTeamsInGroup[0];
      const allCategories = allClubTeams.map(t => t.category.toUpperCase()).filter((cat, index, arr) => arr.indexOf(cat) === index);
      const categories = allCategories.sort().join(' + ');
      
      rankingTeams.push({
        id: `combined-${baseGroupName.replace(/\s+/g, '-')}-${clubName.replace(/\s+/g, '-')}`,
        clubId: firstTeam.clubId,
        teamName: clubName,
        category: categories,
        badgeUrl: firstTeam.badgeUrl,
        allTeams: allClubTeams,
        stats: {
          points: totalPoints,
          played: totalPlayed,
          wins: totalWins,
          draws: totalDraws,
          losses: totalLosses,
          goalsFor: totalGoalsFor,
          goalsAgainst: totalGoalsAgainst,
          goalDifference: totalGoalsFor - totalGoalsAgainst,
          yellowCards: 0,
          redCards: 0
        }
      });
    });
    
    rankingTeams.sort((a, b) => {
      if (a.stats.points !== b.stats.points) return b.stats.points - a.stats.points;
      if (a.stats.wins !== b.stats.wins) return b.stats.wins - a.stats.wins;
      if (a.stats.goalDifference !== b.stats.goalDifference) return b.stats.goalDifference - a.stats.goalDifference;
      if (a.stats.goalsFor !== b.stats.goalsFor) return b.stats.goalsFor - a.stats.goalsFor;
      if (a.stats.goalsAgainst !== b.stats.goalsAgainst) return a.stats.goalsAgainst - b.stats.goalsAgainst;
      return a.teamName.localeCompare(b.teamName);
    });
    
    combinedClubGroups.push({
      groupName: baseGroupName,
      teams: rankingTeams
    });
  });

  const handleAdvanceTeams = (groupACount: number, groupBCount: number) => {
    const groupA = combinedClubGroups.find(g => g.groupName === "Grupo A");
    const groupB = combinedClubGroups.find(g => g.groupName === "Grupo B");
    
    const advancedFromA = groupA?.teams.slice(0, groupACount) || [];
    const advancedFromB = groupB?.teams.slice(0, groupBCount) || [];
    
    // Split advanced clubs back into their individual category teams
    const finalTeams: any[] = [];
    
    [...advancedFromA, ...advancedFromB].forEach(club => {
      club.allTeams.forEach((team: TournamentTeam) => {
        finalTeams.push({
          ...team,
          advancedFrom: club.teamName,
          originalStats: club.stats
        });
      });
    });
    
    // Sort by category to group Sub-15 and Sub-17 separately
    finalTeams.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.teamName.localeCompare(b.teamName);
    });
    
    setAdvancedTeams(finalTeams);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Grupo Final</h2>
        <div className="flex items-center gap-3">
          {advancedTeams.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem('mineiroFinalGroupAdvancedTeams');
                setAdvancedTeams([]);
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar Times
            </Button>
          )}
          <AdvanceTeamsDialog 
            onAdvanceTeams={handleAdvanceTeams}
            combinedGroups={combinedClubGroups}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Times Classificados</CardTitle>
          <CardDescription>
            Times que avançaram para a fase final do torneio baseado na classificação geral
          </CardDescription>
        </CardHeader>
        <CardContent>
          {advancedTeams.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Award className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Fase final não iniciada</h3>
              <p className="mb-4">Use o botão "Avançar Times" para selecionar os times classificados</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sub-15 Groups - matching Groups tab layout exactly */}
              {advancedTeams.filter(team => team.category === 'sub-15').length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      Grupos Sub-15
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Grupo Final Sub-15</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {advancedTeams
                              .filter(team => team.category === 'sub-15')
                              .map((team) => (
                                <div key={team.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                                  <img 
                                    src={team.badgeUrl || '/uploads/badges/default-badge.png'} 
                                    alt={team.teamName} 
                                    className="w-8 h-8 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.src = '/uploads/badges/default-badge.png';
                                    }}
                                  />
                                  <span className="font-medium">{team.teamName}</span>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sub-17 Groups - matching Groups tab layout exactly */}
              {advancedTeams.filter(team => team.category === 'sub-17').length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      Grupos Sub-17
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Grupo Final Sub-17</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {advancedTeams
                              .filter(team => team.category === 'sub-17')
                              .map((team) => (
                                <div key={team.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                                  <img 
                                    src={team.badgeUrl || '/uploads/badges/default-badge.png'} 
                                    alt={team.teamName} 
                                    className="w-8 h-8 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.src = '/uploads/badges/default-badge.png';
                                    }}
                                  />
                                  <span className="font-medium">{team.teamName}</span>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Tab 7: Fase Final
function FaseFinalTab({ 
  matches, 
  teams, 
  groups, 
  tournamentId, 
  advancedTeams 
}: { 
  matches: TournamentMatch[], 
  teams: TournamentTeam[], 
  groups: TournamentGroup[], 
  tournamentId: number,
  advancedTeams: any[]
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkCreateDialog, setShowBulkCreateDialog] = useState(false);
  const [selectedRound, setSelectedRound] = useState(1);
  const { toast } = useToast();

  // Create match mutation
  const createMatchMutation = useMutation({
    mutationFn: async (matchData: any) => {
      return await apiRequest(`/api/tournaments/${tournamentId}/matches`, "POST", {
        ...matchData,
        phase: 'final'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/details`] });
      toast({
        title: "Partida criada",
        description: "A partida foi adicionada ao cronograma.",
      });
      setShowCreateDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar partida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk create matches mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (bulkData: any) => {
      return await apiRequest(`/api/tournaments/${tournamentId}/matches/bulk-with-replication`, "POST", bulkData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/details`] });
      toast({
        title: "Partidas criadas",
        description: `${data.created || 0} partida(s) criada(s) com sucesso.`,
      });
      setShowBulkCreateDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar partidas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create combined teams array for match display (original teams + advanced teams)
  const allTeamsForDisplay = [...teams, ...advancedTeams.filter(advTeam => 
    !teams.some(team => team.id === advTeam.id)
  )];

  // Since matches don't have category field directly, we need to get it from the teams
  const getMatchCategory = (match: any) => {
    const team1 = allTeamsForDisplay.find(t => t.id === match.team1Id);
    return team1?.category || 'unknown';
  };

  // Filter only final phase matches
  const finalMatches = matches.filter(match => match.phase === 'final');
  
  // Get all unique rounds from final matches only
  const roundsSet = new Set<number>();
  finalMatches.forEach(m => roundsSet.add(m.round));
  const availableRounds = Array.from(roundsSet).sort((a, b) => a - b);
  
  // Filter matches by selected round from final matches only
  const roundMatches = finalMatches.filter(match => match.round === selectedRound);
  const sub15Matches = roundMatches.filter(match => getMatchCategory(match) === 'sub-15');
  const sub17Matches = roundMatches.filter(match => getMatchCategory(match) === 'sub-17');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Partidas - Fase Final</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Partida
          </Button>
          <Button onClick={() => setShowBulkCreateDialog(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Criação em Massa
          </Button>
        </div>
      </div>

      {/* Round Navigation */}
      {availableRounds.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRound(Math.max(1, selectedRound - 1))}
            disabled={selectedRound <= 1}
          >
            ← Anterior
          </Button>
          
          <div className="flex gap-1">
            {availableRounds.map((round) => (
              <Button
                key={round}
                variant={selectedRound === round ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRound(round)}
                className="min-w-[40px]"
              >
                {round}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRound(Math.min(Math.max(...availableRounds), selectedRound + 1))}
            disabled={selectedRound >= Math.max(...availableRounds)}
          >
            Próxima →
          </Button>
        </div>
      )}

      {/* Matches Display */}
      {roundMatches.length > 0 ? (
        <div className="space-y-4">{/* Sub-15 Matches */}
          {sub15Matches.length > 0 && (
            <div>
              <div className="bg-blue-600 text-white text-center py-2 rounded-t-lg font-medium">
                SUB-15 - RODADA {selectedRound}
              </div>
              <div className="bg-gray-50 p-4 rounded-b-lg space-y-3">
                {sub15Matches.map((match) => (
                  <MatchResultRow 
                    key={match.id} 
                    match={match} 
                    teams={allTeamsForDisplay} 
                    tournamentId={tournamentId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sub-17 Matches */}
          {sub17Matches.length > 0 && (
            <div>
              <div className="bg-orange-600 text-white text-center py-2 rounded-t-lg font-medium">
                SUB-17 - RODADA {selectedRound}
              </div>
              <div className="bg-gray-50 p-4 rounded-b-lg space-y-3">
                {sub17Matches.map((match) => (
                  <MatchResultRow 
                    key={match.id} 
                    match={match} 
                    teams={allTeamsForDisplay} 
                    tournamentId={tournamentId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Fase Final - Rodada {selectedRound}</CardTitle>
            <CardDescription>
              {availableRounds.length === 0 
                ? "Nenhuma partida da fase final foi criada ainda"
                : `Nenhuma partida encontrada para a rodada ${selectedRound}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {availableRounds.length === 0 ? "Nenhuma partida criada" : "Rodada vazia"}
              </h3>
              <p className="mb-4">
                {availableRounds.length === 0 
                  ? "Comece criando as partidas da fase final" 
                  : "Não há partidas programadas para esta rodada"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Match Dialog */}
      <CreateFinalMatchDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        advancedTeams={advancedTeams}
        onSubmit={createMatchMutation.mutate}
        isLoading={createMatchMutation.isPending}
      />

      {/* Bulk Create Matches Dialog */}
      <BulkCreateFinalMatchesDialog 
        open={showBulkCreateDialog}
        onOpenChange={setShowBulkCreateDialog}
        advancedTeams={advancedTeams}
        tournamentId={tournamentId}
        onSubmit={bulkCreateMutation.mutate}
        isLoading={bulkCreateMutation.isPending}
      />
    </div>
  );
}

// Create Final Match Dialog Component
function CreateFinalMatchDialog({ 
  open, 
  onOpenChange, 
  advancedTeams, 
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advancedTeams: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const { user } = useAuth();
  const form = useForm({
    resolver: zodResolver(z.object({
      team1Id: z.string().min(1, "Selecione o primeiro time"),
      team2Id: z.string().min(1, "Selecione o segundo time"),
      scheduledDate: z.string().min(1, "Data é obrigatória"),
      venue: z.string().min(1, "Local é obrigatório"),
      round: z.string().min(1, "Rodada é obrigatória"),
    })),
    defaultValues: {
      team1Id: "",
      team2Id: "",
      scheduledDate: "",
      venue: "",
      round: "1",
    },
  });

  // Get stadiums - use fallback if API fails
  const { data: stadiums } = useQuery({
    queryKey: ["/api/stadiums", 67, 66],
    queryFn: () => apiRequest("/api/stadiums?clubId=67&seasonId=66"),
    enabled: open,
    retry: false,
  });

  // Fallback stadiums if API fails
  const availableStadiums = stadiums || [
    { id: 1, name: "Estádio Municipal Bezerrão" },
    { id: 2, name: "Arena MRV" },
    { id: 3, name: "Estádio Independência" },
    { id: 4, name: "Estádio Horário Antônio da Costa" },
    { id: 5, name: "Campo Domingão" },
    { id: 6, name: "Gigante da Avenida" },
    { id: 7, name: "Estadio Fausto Alvim" }
  ];

  const handleSubmit = (data: any) => {
    const team1 = advancedTeams.find(t => t.id === parseInt(data.team1Id));
    const team2 = advancedTeams.find(t => t.id === parseInt(data.team2Id));
    
    // Validate same category
    if (team1?.category !== team2?.category) {
      form.setError("team2Id", {
        message: "Times devem ser da mesma categoria"
      });
      return;
    }

    // Validate not same team
    if (data.team1Id === data.team2Id) {
      form.setError("team2Id", {
        message: "Selecione times diferentes"
      });
      return;
    }

    console.log('Final match form data:', data);
    
    onSubmit({
      homeTeamId: parseInt(data.team1Id),
      awayTeamId: parseInt(data.team2Id),
      matchDate: data.scheduledDate,
      stadium: data.venue,
      round: parseInt(data.round),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Partida Final</DialogTitle>
          <DialogDescription>
            Crie uma partida entre os times classificados para a fase final
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="team1Id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primeiro Time</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o primeiro time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {advancedTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${team.category === 'sub-15' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                            {team.teamName} ({team.category.toUpperCase()})
                          </div>
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
                  <FormLabel>Segundo Time</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o segundo time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {advancedTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${team.category === 'sub-15' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                            {team.teamName} ({team.category.toUpperCase()})
                          </div>
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
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data e Hora</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estádio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableStadiums.map((stadium: any) => (
                        <SelectItem key={stadium.id} value={stadium.name}>
                          {stadium.name}
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
              name="round"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rodada</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Digite o número da rodada" 
                      min="1"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Criando..." : "Criar Partida"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Bulk Create Final Matches Dialog Component
function BulkCreateFinalMatchesDialog({
  open,
  onOpenChange,
  advancedTeams,
  tournamentId,
  onSubmit,
  isLoading
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advancedTeams: any[];
  tournamentId?: number;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const { user } = useAuth();
  const clubId = user?.clubId;
  const seasonId = user?.seasonId;

  const [category, setCategory] = useState<'sub-15' | 'sub-17'>('sub-15');
  const [round, setRound] = useState<string>('1');
  const [matchDate, setMatchDate] = useState<string>('');
  const [matchTime, setMatchTime] = useState<string>('');
  const [stadium, setStadium] = useState<string>('');
  const [replicateToCategory, setReplicateToCategory] = useState<boolean>(false);
  const [timeOffset, setTimeOffset] = useState<string>('02:00');
  const [matchesList, setMatchesList] = useState<Array<{ homeTeamId: string; awayTeamId: string; }>>([
    { homeTeamId: '', awayTeamId: '' }
  ]);

  const { data: stadiums = [] } = useQuery({
    queryKey: ['/api/stadiums', clubId, seasonId],
    queryFn: () => apiRequest(`/api/stadiums?clubId=${clubId}&seasonId=${seasonId}`, "GET"),
    enabled: open && !!clubId && !!seasonId,
  });

  const categoryTeams = advancedTeams.filter(team => team.category === category);
  const targetCategory = category === 'sub-15' ? 'sub-17' : 'sub-15';

  const addMatch = () => {
    setMatchesList([...matchesList, { homeTeamId: '', awayTeamId: '' }]);
  };

  const removeMatch = (index: number) => {
    setMatchesList(matchesList.filter((_, i) => i !== index));
  };

  const updateMatch = (index: number, field: 'homeTeamId' | 'awayTeamId', value: string) => {
    const updated = [...matchesList];
    updated[index][field] = value;
    setMatchesList(updated);
  };

  const handleSubmit = () => {
    const validMatches = matchesList.filter(m => m.homeTeamId && m.awayTeamId);
    
    if (validMatches.length === 0) {
      return;
    }

    // Create datetime string without timezone conversion
    const matchDateTimeStr = matchDate && matchTime 
      ? `${matchDate}T${matchTime}:00`
      : null;

    const matchesData = validMatches.map(match => {
      const homeTeam = advancedTeams.find(t => t.id.toString() === match.homeTeamId);
      const awayTeam = advancedTeams.find(t => t.id.toString() === match.awayTeamId);

      return {
        groupId: null, // Finals don't have groups
        phase: 'final',
        round: parseInt(round),
        team1Id: homeTeam?.id,
        team2Id: awayTeam?.id,
        scheduledDate: matchDateTimeStr,
        venue: stadium === 'none' ? null : stadium,
        status: 'scheduled'
      };
    });

    const bulkData = {
      matches: matchesData,
      replicateToCategory: replicateToCategory ? targetCategory : null,
      timeOffset: replicateToCategory ? timeOffset : null,
    };

    console.log('🔍 Final Bulk Create Debug:', {
      matchesListLength: matchesList.length,
      validMatchesLength: validMatches.length,
      matchesDataLength: matchesData.length,
      willReplicate: replicateToCategory,
      expectedTotal: matchesData.length * (replicateToCategory ? 2 : 1),
      matchesList,
      matchesData
    });

    onSubmit(bulkData);
  };

  const resetForm = () => {
    setCategory('sub-15');
    setRound('1');
    setMatchDate('');
    setMatchTime('');
    setStadium('');
    setReplicateToCategory(false);
    setTimeOffset('02:00');
    setMatchesList([{ homeTeamId: '', awayTeamId: '' }]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criação em Massa de Partidas - Fase Final</DialogTitle>
          <DialogDescription>
            Adicione múltiplas partidas da fase final simultaneamente. Opcionalmente, replique para outra categoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Categoria Base</Label>
              <Select value={category} onValueChange={(value: 'sub-15' | 'sub-17') => {
                setCategory(value);
                setMatchesList([{ homeTeamId: '', awayTeamId: '' }]);
              }}>
                <SelectTrigger data-testid="select-category-final">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sub-15">Sub-15</SelectItem>
                  <SelectItem value="sub-17">Sub-17</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rodada</Label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger data-testid="select-round-final">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((r) => (
                    <SelectItem key={r} value={r.toString()}>
                      Rodada {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estádio</Label>
              <Select value={stadium} onValueChange={setStadium}>
                <SelectTrigger data-testid="select-stadium-final">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem estádio</SelectItem>
                  {stadiums.map((stad: any) => (
                    <SelectItem key={stad.id} value={stad.name}>{stad.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <Label>Horário</Label>
              <input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Matches List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Partidas da Rodada {round}</Label>
              <Button type="button" onClick={addMatch} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Partida
              </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {matchesList.map((match, index) => (
                <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <Select
                      value={match.homeTeamId}
                      onValueChange={(value) => updateMatch(index, 'homeTeamId', value)}
                    >
                      <SelectTrigger data-testid={`select-home-team-final-${index}`}>
                        <SelectValue placeholder="Time mandante" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.teamName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="text-sm font-medium">vs</span>

                  <div className="flex-1">
                    <Select
                      value={match.awayTeamId}
                      onValueChange={(value) => updateMatch(index, 'awayTeamId', value)}
                    >
                      <SelectTrigger data-testid={`select-away-team-final-${index}`}>
                        <SelectValue placeholder="Time visitante" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.teamName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {matchesList.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMatch(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Replication Options */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="replicate-final"
                checked={replicateToCategory}
                onCheckedChange={(checked) => setReplicateToCategory(checked as boolean)}
              />
              <Label htmlFor="replicate-final" className="text-sm font-normal">
                Replicar partidas para categoria {targetCategory.toUpperCase()} com deslocamento de horário
              </Label>
            </div>

            {replicateToCategory && (
              <div className="ml-6">
                <Label>Deslocamento de horário (HH:MM)</Label>
                <input
                  type="time"
                  value={timeOffset}
                  onChange={(e) => setTimeOffset(e.target.value)}
                  className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Os jogos de {targetCategory.toUpperCase()} começarão {timeOffset.replace(':', 'h')}min após os de {category.toUpperCase()}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || matchesList.filter(m => m.homeTeamId && m.awayTeamId).length === 0}
            >
              {isLoading ? 'Criando...' : `Criar ${matchesList.filter(m => m.homeTeamId && m.awayTeamId).length} Partida(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Tab 8: Ranking Final
function RankingFinalTab({ 
  matches, 
  advancedTeams 
}: { 
  matches: TournamentMatch[], 
  advancedTeams: any[]
}) {
  // Guard against undefined matches
  if (!matches || !Array.isArray(matches)) {
    matches = [];
  }
  
  // Guard against undefined advancedTeams
  if (!advancedTeams || !Array.isArray(advancedTeams)) {
    advancedTeams = [];
  }
  // Calculate final rankings based on Final Phase matches
  const calculateFinalRankings = () => {
    const finalMatches = matches.filter(match => match.phase === 'final');
    
    // Create rankings map for each team
    const teamStats = new Map();
    
    // Initialize stats for all advanced teams
    advancedTeams.forEach(team => {
      teamStats.set(team.id, {
        ...team,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      });
    });
    
    // Process final phase matches
    finalMatches.forEach(match => {
      if (match.team1Score !== null && match.team2Score !== null) {
        const team1Stats = teamStats.get(match.team1Id);
        const team2Stats = teamStats.get(match.team2Id);
        
        if (team1Stats && team2Stats) {
          // Update match counts
          team1Stats.matches++;
          team2Stats.matches++;
          
          // Update goals
          team1Stats.goalsFor += match.team1Score;
          team1Stats.goalsAgainst += match.team2Score;
          team2Stats.goalsFor += match.team2Score;
          team2Stats.goalsAgainst += match.team1Score;
          
          // Update results and points
          if (match.team1Score > match.team2Score) {
            team1Stats.wins++;
            team1Stats.points += 3;
            team2Stats.losses++;
          } else if (match.team1Score < match.team2Score) {
            team2Stats.wins++;
            team2Stats.points += 3;
            team1Stats.losses++;
          } else {
            team1Stats.draws++;
            team1Stats.points += 1;
            team2Stats.draws++;
            team2Stats.points += 1;
          }
          
          // Update goal difference
          team1Stats.goalDifference = team1Stats.goalsFor - team1Stats.goalsAgainst;
          team2Stats.goalDifference = team2Stats.goalsFor - team2Stats.goalsAgainst;
        }
      }
    });
    
    return Array.from(teamStats.values());
  };
  
  const allRankings = calculateFinalRankings();
  
  // Separate by category and sort using the same criteria as the main Ranking tab
  const sub15Rankings = allRankings
    .filter(team => team.category === 'sub-15')
    .sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst;
      return a.teamName.localeCompare(b.teamName);
    });
    
  const sub17Rankings = allRankings
    .filter(team => team.category === 'sub-17')
    .sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst;
      return a.teamName.localeCompare(b.teamName);
    });

  // Combined ranking - combine stats from Sub-15 and Sub-17 for each club
  const getCombinedFinalRanking = () => {
    const teamsByClub: { [clubName: string]: any[] } = {};
    
    // Group teams by club name
    allRankings.forEach(team => {
      const clubName = team.teamName;
      if (!teamsByClub[clubName]) {
        teamsByClub[clubName] = [];
      }
      teamsByClub[clubName].push(team);
    });
    
    const combinedRankings: any[] = [];
    
    // Calculate combined stats for each club
    Object.entries(teamsByClub).forEach(([clubName, clubTeams]) => {
      let totalPoints = 0;
      let totalMatches = 0;
      let totalWins = 0;
      let totalDraws = 0;
      let totalLosses = 0;
      let totalGoalsFor = 0;
      let totalGoalsAgainst = 0;
      
      clubTeams.forEach(team => {
        totalPoints += team.points || 0;
        totalMatches += team.matches || 0;
        totalWins += team.wins || 0;
        totalDraws += team.draws || 0;
        totalLosses += team.losses || 0;
        totalGoalsFor += team.goalsFor || 0;
        totalGoalsAgainst += team.goalsAgainst || 0;
      });
      
      const firstTeam = clubTeams[0];
      const categories = clubTeams.map(t => t.category.toUpperCase()).sort().join(' + ');
      
      combinedRankings.push({
        id: `combined-${clubName.replace(/\s+/g, '-')}`,
        teamName: clubName,
        category: categories,
        badgeUrl: firstTeam.badgeUrl,
        points: totalPoints,
        matches: totalMatches,
        wins: totalWins,
        draws: totalDraws,
        losses: totalLosses,
        goalsFor: totalGoalsFor,
        goalsAgainst: totalGoalsAgainst,
        goalDifference: totalGoalsFor - totalGoalsAgainst
      });
    });
    
    // Sort by same criteria
    return combinedRankings.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst;
      return a.teamName.localeCompare(b.teamName);
    });
  };
  
  const combinedRankings = getCombinedFinalRanking();

  const RankingTable = ({ teams, category }: { teams: any[], category: string }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${category === 'sub-15' ? 'bg-blue-500' : 'bg-orange-500'}`} />
          Ranking Final {category.toUpperCase()}
        </CardTitle>
        <CardDescription>
          Classificação final baseada nos resultados da fase final
        </CardDescription>
      </CardHeader>
      <CardContent>
        {teams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Pos</th>
                  <th className="text-left p-2 font-medium">Time</th>
                  <th className="text-center p-2 font-medium">J</th>
                  <th className="text-center p-2 font-medium">V</th>
                  <th className="text-center p-2 font-medium">E</th>
                  <th className="text-center p-2 font-medium">D</th>
                  <th className="text-center p-2 font-medium">GP</th>
                  <th className="text-center p-2 font-medium">GC</th>
                  <th className="text-center p-2 font-medium">SG</th>
                  <th className="text-center p-2 font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, index) => (
                  <tr key={team.id} className={`border-b hover:bg-gray-50 ${
                    index === 0 ? 'bg-yellow-50' : 
                    index === 1 ? 'bg-gray-100' : 
                    index === 2 ? 'bg-orange-50' : ''
                  }`}>
                    <td className="p-2 font-medium">
                      <div className="flex items-center gap-2">
                        {index + 1}
                        {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                        {index === 1 && <Medal className="h-4 w-4 text-gray-500" />}
                        {index === 2 && <Medal className="h-4 w-4 text-orange-500" />}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <img 
                          src={team.badgeUrl || '/uploads/badges/default-badge.png'} 
                          alt={team.teamName} 
                          className="w-6 h-6 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = '/uploads/badges/default-badge.png';
                          }}
                        />
                        <span className="font-medium">{team.teamName}</span>
                      </div>
                    </td>
                    <td className="text-center p-2">{team.matches}</td>
                    <td className="text-center p-2">{team.wins}</td>
                    <td className="text-center p-2">{team.draws}</td>
                    <td className="text-center p-2">{team.losses}</td>
                    <td className="text-center p-2">{team.goalsFor}</td>
                    <td className="text-center p-2">{team.goalsAgainst}</td>
                    <td className="text-center p-2">
                      <span className={team.goalDifference > 0 ? 'text-green-600' : team.goalDifference < 0 ? 'text-red-600' : ''}>
                        {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                      </span>
                    </td>
                    <td className="text-center p-2 font-bold">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum time {category.toUpperCase()} na fase final</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ranking - Fase Final</h2>
        <div className="text-sm text-gray-600">
          Baseado nos resultados da fase final
        </div>
      </div>

      {advancedTeams.length > 0 ? (
        <div className="space-y-6">
          <RankingTable teams={sub15Rankings} category="sub-15" />
          <RankingTable teams={sub17Rankings} category="sub-17" />
          
          {/* Combined Overall Ranking */}
          {combinedRankings.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-600">Classificação Geral</h3>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Ranking Final Combinado
                  </CardTitle>
                  <CardDescription>
                    Classificação geral considerando as duas categorias (Sub-15 + Sub-17)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-2 font-medium">Pos</th>
                          <th className="text-left p-2 font-medium">Clube</th>
                          <th className="text-center p-2 font-medium text-xs">Categorias</th>
                          <th className="text-center p-2 font-medium">Pts</th>
                          <th className="text-center p-2 font-medium">J</th>
                          <th className="text-center p-2 font-medium">V</th>
                          <th className="text-center p-2 font-medium">E</th>
                          <th className="text-center p-2 font-medium">D</th>
                          <th className="text-center p-2 font-medium">GP</th>
                          <th className="text-center p-2 font-medium">GC</th>
                          <th className="text-center p-2 font-medium">SG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {combinedRankings.map((team, index) => (
                          <tr key={team.id} className={`border-b hover:bg-gray-50 ${
                            index === 0 ? 'bg-yellow-50' : 
                            index === 1 ? 'bg-gray-100' : 
                            index === 2 ? 'bg-orange-50' : ''
                          }`}>
                            <td className="p-2 font-medium">
                              <div className="flex items-center gap-2">
                                {index + 1}
                                {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                {index === 1 && <Medal className="h-4 w-4 text-gray-500" />}
                                {index === 2 && <Medal className="h-4 w-4 text-orange-500" />}
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <img 
                                  src={team.badgeUrl || '/uploads/badges/default-badge.png'} 
                                  alt={team.teamName} 
                                  className="w-6 h-6 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = '/uploads/badges/default-badge.png';
                                  }}
                                />
                                <span className="font-medium">{team.teamName}</span>
                              </div>
                            </td>
                            <td className="text-center p-2">
                              <span className="text-xs text-gray-600">{team.category}</span>
                            </td>
                            <td className="text-center p-2 font-bold">{team.points}</td>
                            <td className="text-center p-2">{team.matches}</td>
                            <td className="text-center p-2">{team.wins}</td>
                            <td className="text-center p-2">{team.draws}</td>
                            <td className="text-center p-2">{team.losses}</td>
                            <td className="text-center p-2">{team.goalsFor}</td>
                            <td className="text-center p-2">{team.goalsAgainst}</td>
                            <td className="text-center p-2">
                              <span className={team.goalDifference > 0 ? 'text-green-600' : team.goalDifference < 0 ? 'text-red-600' : ''}>
                                {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              <div className="text-sm text-gray-600">
                <p><strong>Critérios de Classificação:</strong></p>
                <p>1º - Maior número de pontos | 2º - Maior número de vitórias | 3º - Melhor saldo de gols | 4º - Maior número de gols marcados | 5º - Menor número de gols sofridos</p>
              </div>
            </div>
          )}
          
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Torneio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Times na Fase Final:</p>
                  <p className="text-gray-600">{advancedTeams.length} times</p>
                </div>
                <div>
                  <p className="font-medium">Partidas da Fase Final:</p>
                  <p className="text-gray-600">{matches.filter(m => m.phase === 'final').length} partidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Classificação Final</CardTitle>
            <CardDescription>
              Ranking final do torneio por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Ranking final não disponível</h3>
              <p className="mb-4">Avance times do Grupo Final para visualizar o ranking definitivo</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Tab 9: Configurações
function ConfiguracoesTab({ tournament }: { tournament?: Tournament }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Configurações do Torneio</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Informações do Torneio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome do Torneio</Label>
              <Input defaultValue={tournament?.name} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea defaultValue={tournament?.description || ''} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input type="date" defaultValue={tournament?.startDate ? new Date(tournament.startDate).toISOString().split('T')[0] : ''} />
              </div>
              <div>
                <Label>Data de Término</Label>
                <Input type="date" defaultValue={tournament?.endDate ? new Date(tournament.endDate).toISOString().split('T')[0] : ''} />
              </div>
            </div>
            <Button>Salvar Alterações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Critérios de Ranking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Pontos por Vitória</Label>
              <Input type="number" defaultValue={tournament?.pointsWin || 3} />
            </div>
            <div>
              <Label>Pontos por Empate</Label>
              <Input type="number" defaultValue={tournament?.pointsDraw || 1} />
            </div>
            <div>
              <Label>Pontos por Derrota</Label>
              <Input type="number" defaultValue={tournament?.pointsLoss || 0} />
            </div>
            <div>
              <Label>Times Classificados por Grupo</Label>
              <Input type="number" defaultValue={tournament?.teamsAdvancingPerGroup || 4} />
            </div>
            <Button>Salvar Critérios</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regras do Torneio</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Digite as regras específicas do torneio..."
              defaultValue={tournament?.rules || ''}
              rows={6}
            />
            <Button className="mt-4">Salvar Regras</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações Avançadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Máximo de Times</Label>
              <Input type="number" defaultValue={tournament?.maxTeams || 44} />
            </div>
            <div>
              <Label>Status do Torneio</Label>
              <Select defaultValue={tournament?.status || 'upcoming'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Programado</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button>Salvar Configurações</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MineiroTournament() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  
  // Initialize finalGroupAdvancedTeams from localStorage
  const [finalGroupAdvancedTeams, setFinalGroupAdvancedTeamsState] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('mineiro-final-group-teams');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading advanced teams from localStorage:', error);
      return [];
    }
  });

  // Wrapper function to persist to localStorage
  const setFinalGroupAdvancedTeams = (teams: any[]) => {
    try {
      localStorage.setItem('mineiro-final-group-teams', JSON.stringify(teams));
      setFinalGroupAdvancedTeamsState(teams);
    } catch (error) {
      console.error('Error saving advanced teams to localStorage:', error);
      setFinalGroupAdvancedTeamsState(teams);
    }
  };

  // Get tournaments
  const { data: tournaments } = useQuery({
    queryKey: ["/api/tournaments"],
    enabled: !!user,
  });

  // Get tournament details
  const { data: tournamentDetails } = useQuery({
    queryKey: [`/api/tournaments/${selectedTournamentId}/details`],
    enabled: !!selectedTournamentId,
  });

  const currentTournament = (tournamentDetails as any)?.tournament;
  const teams = (tournamentDetails as any)?.teams || [];
  const groups = (tournamentDetails as any)?.groups || [];
  const matches = (tournamentDetails as any)?.matches || [];

  // Find Mineiro tournament
  const mineiroTournament = (tournaments as any)?.find((t: Tournament) => 
    t.format === 'mineiro_sub_15_17' || t.category === 'Sub-15/17'
  );

  useEffect(() => {
    if (mineiroTournament && !selectedTournamentId) {
      setSelectedTournamentId(mineiroTournament.id);
    }
  }, [mineiroTournament, selectedTournamentId]);

  // Create a tournament if none exists
  const createTournamentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/tournaments', 'POST', {
        name: 'Campeonato Mineiro Sub-15/17',
        description: 'Torneio oficial Mineiro com sistema de dupla fase',
        format: 'mineiro_sub_15_17',
        category: 'Sub-15/17',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        maxTeams: 44,
        status: 'upcoming'
      });
    },
    onSuccess: (tournament) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      setSelectedTournamentId(tournament.id);
      toast({
        title: "Torneio criado",
        description: "Campeonato Mineiro Sub-15/17 criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar torneio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Faça login para acessar o gerenciamento de torneios.</p>
      </div>
    );
  }

  // Show create tournament button if no tournament exists
  if (!mineiroTournament && Array.isArray(tournaments) && tournaments.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Campeonato Mineiro Sub-15/17</h1>
          <p className="text-gray-600">Gestão completa do torneio com sistema de dupla fase</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nenhum Torneio Encontrado</CardTitle>
            <CardDescription>
              Crie o Campeonato Mineiro Sub-15/17 para começar a gerenciar times, grupos e partidas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createTournamentMutation.mutate()}
              disabled={createTournamentMutation.isPending}
              size="lg"
            >
              {createTournamentMutation.isPending ? 'Criando...' : 'Criar Campeonato Mineiro Sub-15/17'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Campeonato Mineiro Sub-15/17</h1>
        <p className="text-gray-600">Gestão completa do torneio com sistema de dupla fase</p>
      </div>

      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-9 text-xs">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="times">Times</TabsTrigger>
          <TabsTrigger value="grupos">Grupos</TabsTrigger>
          <TabsTrigger value="primeira-fase">Primeira Fase</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="grupo-final">Grupo Final</TabsTrigger>
          <TabsTrigger value="fase-final">Fase Final</TabsTrigger>
          <TabsTrigger value="ranking-final">Ranking Final</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <VisaoGeralTab tournament={currentTournament} teams={teams} groups={groups} matches={matches} />
        </TabsContent>

        <TabsContent value="times">
          <TimesTab teams={teams} tournamentId={selectedTournamentId} />
        </TabsContent>

        <TabsContent value="grupos">
          <GruposTab teams={teams} groups={groups} tournamentId={selectedTournamentId} />
        </TabsContent>

        <TabsContent value="primeira-fase">
          <PrimeiraFaseTab 
            matches={matches} 
            teams={teams}
            groups={groups}
            tournamentId={selectedTournamentId}
          />
        </TabsContent>

        <TabsContent value="ranking">
          <RankingTab teams={teams} matches={matches} groups={groups} />
        </TabsContent>

        <TabsContent value="grupo-final">
          <GrupoFinalTab 
            teams={teams} 
            matches={matches} 
            groups={groups} 
            advancedTeams={finalGroupAdvancedTeams}
            setAdvancedTeams={setFinalGroupAdvancedTeams}
          />
        </TabsContent>

        <TabsContent value="fase-final">
          <FaseFinalTab 
            matches={matches} 
            teams={teams}
            groups={groups}
            tournamentId={selectedTournamentId!}
            advancedTeams={finalGroupAdvancedTeams}
          />
        </TabsContent>

        <TabsContent value="ranking-final">
          <RankingFinalTab 
            matches={matches} 
            advancedTeams={finalGroupAdvancedTeams}
          />
        </TabsContent>

        <TabsContent value="configuracoes">
          <ConfiguracoesTab tournament={currentTournament} />
        </TabsContent>
      </Tabs>
    </div>
  );
}