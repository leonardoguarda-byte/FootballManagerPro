import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Trophy, TrendingUp, ListOrdered, Users, Award } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { Tournament } from "@shared/schema";

interface TournamentSettingsProps {
  tournament: Tournament;
}

const settingsFormSchema = z.object({
  pointsWin: z.number().min(0).max(10),
  pointsDraw: z.number().min(0).max(10),
  pointsLoss: z.number().min(0).max(10),
  advancementType: z.enum(["by_group", "overall_ranking"]),
  teamsAdvancingPerGroup: z.number().min(1).max(8),
  teamsAdvancingTotal: z.number().min(1).max(32),
  rankingCriteria: z.array(z.string()).min(1, "Selecione pelo menos um critério"),
  enableRoundOf16: z.boolean(),
  enableQuarterFinals: z.boolean(),
  enableSemiFinals: z.boolean(),
  enableFinal: z.boolean(),
  directQualificationSpots: z.number().min(0).max(8),
  playoffSpots: z.number().min(0).max(8),
  directQualifyingTeams: z.number().min(0).max(16),
  directQualifyingPhase: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

const rankingCriteriaOptions = [
  { value: "points", label: "Pontos" },
  { value: "goal_difference", label: "Saldo de Gols" },
  { value: "goals_for", label: "Gols Marcados" },
  { value: "wins", label: "Vitórias" },
  { value: "goals_against", label: "Gols Sofridos (Menor)" },
  { value: "yellow_cards", label: "Menor Número de Cartões Amarelos" },
  { value: "red_cards", label: "Menor Número de Cartões Vermelhos" },
];

export function TournamentSettings({ tournament }: TournamentSettingsProps) {
  const { toast } = useToast();
  const permissions = usePermissions();
  
  // Filter out invalid criteria (like removed head_to_head, fair_play)
  const validCriteriaValues = rankingCriteriaOptions.map(opt => opt.value);
  const savedCriteria = tournament.rankingCriteria?.split(",") || ["points", "goal_difference", "goals_for"];
  const filteredCriteria = savedCriteria.filter(c => validCriteriaValues.includes(c.trim()));
  
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(
    filteredCriteria.length > 0 ? filteredCriteria : ["points", "goal_difference", "goals_for"]
  );
  const [advancementType, setAdvancementType] = useState<"by_group" | "overall_ranking">(
    (tournament.advancementType as "by_group" | "overall_ranking") || "by_group"
  );

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      pointsWin: tournament.pointsWin || 3,
      pointsDraw: tournament.pointsDraw || 1,
      pointsLoss: tournament.pointsLoss || 0,
      advancementType: (tournament.advancementType as "by_group" | "overall_ranking") || "by_group",
      teamsAdvancingPerGroup: tournament.teamsAdvancingPerGroup || 2,
      teamsAdvancingTotal: tournament.teamsAdvancingTotal || 16,
      rankingCriteria: filteredCriteria.length > 0 ? filteredCriteria : ["points", "goal_difference", "goals_for"],
      enableRoundOf16: tournament.enableRoundOf16 || false,
      enableQuarterFinals: tournament.enableQuarterFinals ?? true,
      enableSemiFinals: tournament.enableSemiFinals ?? true,
      enableFinal: tournament.enableFinal ?? true,
      directQualificationSpots: tournament.directQualificationSpots || 2,
      playoffSpots: tournament.playoffSpots || 0,
      directQualifyingTeams: tournament.directQualifyingTeams || 0,
      directQualifyingPhase: tournament.directQualifyingPhase || "",
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const updateData = {
        pointsWin: data.pointsWin,
        pointsDraw: data.pointsDraw,
        pointsLoss: data.pointsLoss,
        advancementType: data.advancementType,
        teamsAdvancingPerGroup: data.teamsAdvancingPerGroup,
        teamsAdvancingTotal: data.teamsAdvancingTotal,
        rankingCriteria: data.rankingCriteria.join(","),
        directQualificationSpots: data.directQualificationSpots,
        playoffSpots: data.playoffSpots,
        directQualifyingTeams: data.directQualifyingTeams,
        directQualifyingPhase: data.directQualifyingPhase || null,
        enableRoundOf16: data.enableRoundOf16,
        enableQuarterFinals: data.enableQuarterFinals,
        enableSemiFinals: data.enableSemiFinals,
        enableFinal: data.enableFinal,
      };
      
      return await apiRequest(`/api/tournaments/${tournament.id}`, "PUT", updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournament.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Sucesso",
        description: "Configurações do torneio atualizadas!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar configurações",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate(data);
  };

  const toggleCriterion = (criterion: string) => {
    const current = form.getValues("rankingCriteria");
    if (current.includes(criterion)) {
      const updated = current.filter(c => c !== criterion);
      if (updated.length > 0) {
        form.setValue("rankingCriteria", updated);
        setSelectedCriteria(updated);
      }
    } else {
      const updated = [...current, criterion];
      form.setValue("rankingCriteria", updated);
      setSelectedCriteria(updated);
    }
  };

  const moveCriterionUp = (index: number) => {
    if (index === 0) return;
    const current = [...selectedCriteria];
    [current[index - 1], current[index]] = [current[index], current[index - 1]];
    form.setValue("rankingCriteria", current);
    setSelectedCriteria(current);
  };

  const moveCriterionDown = (index: number) => {
    if (index === selectedCriteria.length - 1) return;
    const current = [...selectedCriteria];
    [current[index], current[index + 1]] = [current[index + 1], current[index]];
    form.setValue("rankingCriteria", current);
    setSelectedCriteria(current);
  };

  return (
    <div className="space-y-6" data-testid="tournament-settings">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Configurações do Torneio</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Point System Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Sistema de Pontuação
              </CardTitle>
              <CardDescription>
                Configure quantos pontos cada resultado vale na fase de grupos
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pointsWin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pontos por Vitória</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-points-win"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pointsDraw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pontos por Empate</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-points-draw"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pointsLoss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pontos por Derrota</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-points-loss"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Ranking Criteria Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Critérios de Classificação
              </CardTitle>
              <CardDescription>
                Escolha e ordene os critérios de desempate (ordem de prioridade)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rankingCriteriaOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`criterion-${option.value}`}
                      checked={selectedCriteria.includes(option.value)}
                      onCheckedChange={() => toggleCriterion(option.value)}
                      data-testid={`checkbox-criterion-${option.value}`}
                    />
                    <label
                      htmlFor={`criterion-${option.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>

              {selectedCriteria.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ListOrdered className="w-4 h-4" />
                    Ordem de Prioridade
                  </h4>
                  <div className="space-y-2">
                    {selectedCriteria.map((criterion, index) => {
                      const option = rankingCriteriaOptions.find(o => o.value === criterion);
                      return (
                        <div
                          key={criterion}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border"
                          data-testid={`criterion-order-${index}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-600 w-6">{index + 1}º</span>
                            <span className="text-sm">{option?.label}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveCriterionUp(index)}
                              disabled={index === 0}
                              data-testid={`button-move-up-${index}`}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveCriterionDown(index)}
                              disabled={index === selectedCriteria.length - 1}
                              data-testid={`button-move-down-${index}`}
                            >
                              ↓
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <FormMessage />
            </CardContent>
          </Card>

          {/* Advancement Rules Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Regras de Avanço
              </CardTitle>
              <CardDescription>
                Configure como os times avançam da fase de grupos para as fases eliminatórias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Advancement Type Selection */}
              <FormField
                control={form.control}
                name="advancementType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Tipo de Classificação
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setAdvancementType(value as "by_group" | "overall_ranking");
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-advancement-type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="by_group">Por Grupo (N melhores de cada grupo)</SelectItem>
                        <SelectItem value="overall_ranking">Classificação Geral (N melhores no geral)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Escolha se avança os melhores de cada grupo ou os melhores da classificação geral
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional Fields based on Advancement Type */}
              {advancementType === "by_group" ? (
                <>
                  <FormField
                    control={form.control}
                    name="teamsAdvancingPerGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Times que Avançam por Grupo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="8"
                            value={field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            data-testid="input-teams-advancing-per-group"
                          />
                        </FormControl>
                        <FormDescription>
                          Quantos times de cada grupo passam para a próxima fase
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Total de Times que Avançam
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="32"
                      defaultValue={form.getValues("teamsAdvancingTotal")}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 2;
                        form.setValue("teamsAdvancingTotal", value);
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      data-testid="input-teams-advancing-total"
                    />
                    <p className="text-sm text-muted-foreground">
                      Quantos times no total passam pela classificação geral
                    </p>
                  </div>
                </>
              )}

              {/* Direct Qualification */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg space-y-3 border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  <h4 className="font-semibold">Times com Passe Direto</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure times que pulam uma fase (ex: vão direto para quartas enquanto outros jogam oitavas)
                </p>
                
                <FormField
                  control={form.control}
                  name="directQualifyingTeams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade de Times com Passe Direto</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="16"
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-direct-qualifying-teams"
                        />
                      </FormControl>
                      <FormDescription>
                        Quantos times passam direto para uma fase mais avançada
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(form.watch("directQualifyingTeams") || 0) > 0 && (
                  <FormField
                    control={form.control}
                    name="directQualifyingPhase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Para Qual Fase Vão Direto?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-direct-phase">
                              <SelectValue placeholder="Selecione a fase" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="quarterfinals">Quartas de Final</SelectItem>
                            <SelectItem value="semifinals">Semifinais</SelectItem>
                            <SelectItem value="final">Final</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Os demais times classificados começam na fase anterior
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tournament Phases Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Fases do Torneio
              </CardTitle>
              <CardDescription>
                Habilite as fases eliminatórias que seu torneio terá
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField
                control={form.control}
                name="enableRoundOf16"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <FormLabel className="text-base">Oitavas de Final (16-avos)</FormLabel>
                      <FormDescription>Fase com 16 times</FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-round-of-16"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableQuarterFinals"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <FormLabel className="text-base">Quartas de Final</FormLabel>
                      <FormDescription>Fase com 8 times</FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-quarter-finals"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableSemiFinals"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <FormLabel className="text-base">Semifinais</FormLabel>
                      <FormDescription>Fase com 4 times</FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-semi-finals"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableFinal"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <FormLabel className="text-base">Final</FormLabel>
                      <FormDescription>Decisão com 2 times</FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-final"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {permissions.games.canEdit && (
            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={updateSettings.isPending}
                data-testid="button-save-settings"
              >
                {updateSettings.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
