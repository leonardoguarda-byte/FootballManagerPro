import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Users, FileDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { TournamentTeam, AdversaryTeam } from "@shared/schema";

interface TournamentTeamsManagerProps {
  tournamentId: number;
}

const teamFormSchema = z.object({
  teamName: z.string().min(1, "Nome do time é obrigatório"),
  contactEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  category: z.string().optional(),
});

type TeamFormData = z.infer<typeof teamFormSchema>;

export default function TournamentTeamsManager({ tournamentId }: TournamentTeamsManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const permissions = usePermissions();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedAdversaries, setSelectedAdversaries] = useState<number[]>([]);
  const [badgeFile, setBadgeFile] = useState<File | null>(null);

  const clubId = user?.clubId;
  const seasonId = user?.seasonId;

  const { data: teams = [], isLoading } = useQuery<TournamentTeam[]>({
    queryKey: [`/api/tournaments/${tournamentId}/teams`],
    enabled: !!tournamentId,
  });

  const { data: adversaries = [], isLoading: loadingAdversaries } = useQuery<AdversaryTeam[]>({
    queryKey: ["/api/adversary-teams", clubId, seasonId],
    queryFn: () => apiRequest(`/api/adversary-teams?clubId=${clubId}&seasonId=${seasonId}`, "GET"),
    enabled: !!clubId && !!seasonId && clubId > 0 && seasonId > 0,
  });

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      teamName: "",
      contactEmail: "",
      contactPhone: "",
      category: "",
    },
  });

  const addTeam = useMutation({
    mutationFn: async (data: TeamFormData) => {
      const formData = new FormData();
      formData.append('teamName', data.teamName);
      if (data.contactEmail) formData.append('contactEmail', data.contactEmail);
      if (data.contactPhone) formData.append('contactPhone', data.contactPhone);
      if (data.category) formData.append('category', data.category);
      if (badgeFile) formData.append('badge', badgeFile);
      
      const response = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao adicionar time');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/teams`] });
      toast({
        title: "Sucesso",
        description: "Time adicionado com sucesso!",
      });
      setShowAddDialog(false);
      form.reset();
      setBadgeFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar time",
        variant: "destructive",
      });
    },
  });

  const deleteTeam = useMutation({
    mutationFn: async (teamId: number) => {
      await apiRequest(`/api/tournament-teams/${teamId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/teams`] });
      toast({
        title: "Sucesso",
        description: "Time removido com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover time",
        variant: "destructive",
      });
    },
  });

  const bulkImportTeams = useMutation({
    mutationFn: async (data: { adversaryTeamIds: number[] }) => {
      return await apiRequest(`/api/tournaments/${tournamentId}/teams/bulk`, "POST", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/teams`] });
      toast({
        title: "Sucesso",
        description: data.message || "Clubes importados com sucesso para todas as categorias!",
      });
      setShowImportDialog(false);
      setSelectedAdversaries([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao importar clubes",
        variant: "destructive",
      });
    },
  });

  const handleBulkImport = () => {
    if (selectedAdversaries.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um clube para importar",
        variant: "destructive",
      });
      return;
    }

    bulkImportTeams.mutate({
      adversaryTeamIds: selectedAdversaries,
    });
  };

  const toggleAdversarySelection = (adversaryId: number) => {
    setSelectedAdversaries(prev => 
      prev.includes(adversaryId)
        ? prev.filter(id => id !== adversaryId)
        : [...prev, adversaryId]
    );
  };

  const selectAllAdversaries = () => {
    if (selectedAdversaries.length === adversaries.length) {
      setSelectedAdversaries([]);
    } else {
      setSelectedAdversaries(adversaries.map(a => a.id));
    }
  };

  const onSubmit = (data: TeamFormData) => {
    addTeam.mutate(data);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando times...</div>;
  }

  // Group teams by club
  // For adversaries without adversaryTeamId, use teamName to create separate "clubs"
  // This prevents all adversaries from being grouped under the same clubId
  const clubsMap = new Map<string, TournamentTeam[]>();
  teams.forEach(team => {
    let clubKey: string;
    if (team.adversaryTeamId) {
      // Adversary with proper ID - group by adversaryTeamId
      clubKey = `adv-${team.adversaryTeamId}`;
    } else {
      // For teams without adversaryTeamId, use teamName to separate them
      // Remove category suffix to group same team across categories
      const baseName = team.teamName.replace(/\s*(Sub-\d+|Sub-\d+\/\d+)\s*/g, '').trim();
      clubKey = `team-${baseName}`;
    }
    
    if (!clubsMap.has(clubKey)) {
      clubsMap.set(clubKey, []);
    }
    clubsMap.get(clubKey)!.push(team);
  });
  const clubs = Array.from(clubsMap.values());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Clubes Inscritos</h3>
          <p className="text-sm text-gray-600">
            {clubs.length} clube(s) cadastrado(s)
          </p>
        </div>
        {permissions.games.canCreate && (
          <div className="flex gap-2">
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-import-teams">
                  <FileDown className="mr-2 w-4 h-4" />
                  Importar Clubes
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Importar Clubes</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Ao importar um clube, serão criados times automaticamente para todas as categorias do torneio.
                </p>

                {loadingAdversaries ? (
                  <div className="text-center py-8">Carregando adversários...</div>
                ) : adversaries.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Nenhum time adversário cadastrado.</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Cadastre times adversários no módulo de Adversários primeiro.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedAdversaries.length === adversaries.length}
                          onCheckedChange={selectAllAdversaries}
                          data-testid="checkbox-select-all"
                        />
                        <span className="text-sm font-medium">
                          Selecionar Todos ({selectedAdversaries.length}/{adversaries.length})
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {adversaries.map((adversary) => (
                        <div
                          key={adversary.id}
                          className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleAdversarySelection(adversary.id)}
                          data-testid={`adversary-item-${adversary.id}`}
                        >
                          <Checkbox
                            checked={selectedAdversaries.includes(adversary.id)}
                            onCheckedChange={() => toggleAdversarySelection(adversary.id)}
                            data-testid={`checkbox-adversary-${adversary.id}`}
                          />
                          {adversary.badgeUrl && (
                            <img
                              src={adversary.badgeUrl}
                              alt={adversary.name}
                              className="w-10 h-10 object-contain"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{adversary.name}</p>
                            {adversary.contactEmail && (
                              <p className="text-sm text-gray-600">{adversary.contactEmail}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowImportDialog(false);
                      setSelectedAdversaries([]);
                    }}
                    data-testid="button-cancel-import"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleBulkImport}
                    disabled={bulkImportTeams.isPending || selectedAdversaries.length === 0}
                    data-testid="button-confirm-import"
                  >
                    {bulkImportTeams.isPending
                      ? "Importando..."
                      : `Importar ${selectedAdversaries.length} Time(s)`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      {clubs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Nenhum clube cadastrado</h3>
            <p className="text-gray-600 mb-4">
              Importe clubes do módulo de adversários para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clube</TableHead>
                  <TableHead>Categorias</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubs.map((clubTeams) => {
                  const firstTeam = clubTeams[0];
                  const categories = clubTeams.map(t => t.category).filter(Boolean);
                  return (
                    <TableRow key={firstTeam.id} data-testid={`row-club-${firstTeam.clubId || firstTeam.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {firstTeam.badgeUrl ? (
                            <img
                              src={firstTeam.badgeUrl}
                              alt={`${firstTeam.teamName} badge`}
                              className="w-12 h-12 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                                {firstTeam.teamName.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">{firstTeam.teamName.replace(/\s*(Sub-\d+|Sub-\d+\/\d+)\s*/g, '').trim()}</p>
                            <p className="text-sm text-gray-600">{clubTeams.length} equipe(s)</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {categories.map((cat, idx) => (
                            <Badge key={idx} variant="outline">{cat}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {permissions.games.canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja remover o clube ${firstTeam.teamName} e todas as suas equipes?`)) {
                                // Remove all teams from this club
                                clubTeams.forEach(team => deleteTeam.mutate(team.id));
                              }
                            }}
                            disabled={deleteTeam.isPending}
                            data-testid={`button-delete-club-${firstTeam.clubId || firstTeam.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
