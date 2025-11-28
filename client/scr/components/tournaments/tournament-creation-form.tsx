import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const tournamentFormSchema = z.object({
  name: z.string().min(1, "Nome do torneio é obrigatório"),
  ageCategory: z.string().min(1, "Categoria de idade é obrigatória"),
  jointCategories: z.boolean().default(false),
  additionalCategories: z.array(z.string()).optional(),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().min(1, "Data de fim é obrigatória"),
  numberOfTeams: z.string().min(1, "Número de equipes é obrigatório"),
  format: z.enum(["Liga", "Copa", "Grupo+Copa", "Grupo+Grupo"], {
    required_error: "Formato do torneio é obrigatório"
  }),
}).refine(
  (data) => {
    // Se categorias conjuntas estiver marcado, deve ter pelo menos 1 categoria adicional
    if (data.jointCategories) {
      return data.additionalCategories && data.additionalCategories.length > 0;
    }
    return true;
  },
  {
    message: "Selecione pelo menos uma categoria adicional",
    path: ["additionalCategories"],
  }
);

type TournamentFormData = z.infer<typeof tournamentFormSchema>;

interface TournamentCreationFormProps {
  onSuccess: () => void;
}

const availableCategories = [
  "Sub-8", "Sub-9", "Sub-10", "Sub-11", "Sub-12", "Sub-13", 
  "Sub-14", "Sub-15", "Sub-16", "Sub-17", "Sub-18", "Sub-19", 
  "Sub-20", "Adulto", "Veterano"
];

export default function TournamentCreationForm({ onSuccess }: TournamentCreationFormProps) {
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [numberOfGroups, setNumberOfGroups] = useState<number>(2);
  const [rankingCriteria, setRankingCriteria] = useState<string[]>([
    "points", "victories", "goalDifference", "goalsFor"
  ]);

  // Get user's current club and season context
  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });
  const { data: currentClub } = useQuery({ 
    queryKey: ["/api/auth/current-club"],
    enabled: !!user 
  });

  const form = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: {
      name: "",
      ageCategory: "",
      jointCategories: false,
      additionalCategories: [],
      startDate: "",
      endDate: "",
      numberOfTeams: "",
      format: undefined,
    },
  });

  const createTournament = useMutation({
    mutationFn: async (data: TournamentFormData) => {
      if (!currentClub) {
        throw new Error("Clube ou temporada não selecionado");
      }

      const tournamentData = {
        name: data.name,
        description: `Torneio ${data.ageCategory} - Formato ${data.format}`,
        category: data.ageCategory,
        jointCategories: data.jointCategories,
        additionalCategories: data.additionalCategories || [],
        format: data.format.toLowerCase().replace("+", "_"),
        startDate: data.startDate,
        endDate: data.endDate,
        maxTeams: parseInt(data.numberOfTeams),
        status: "planned",
        clubId: currentClub.clubId,
        seasonId: currentClub.seasonId,
        rules: JSON.stringify({
          pointsForWin: 3,
          pointsForDraw: 1,
          pointsForLoss: 0,
          rankingCriteria: rankingCriteria,
          numberOfGroups: selectedFormat.includes("Grupo") ? numberOfGroups : 1
        })
      };

      return await apiRequest("/api/tournaments", "POST", tournamentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Sucesso",
        description: "Torneio criado com sucesso!",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar torneio",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TournamentFormData) => {
    createTournament.mutate(data);
  };

  const formatDescriptions = {
    "Liga": "Um único grupo com todas as equipes. Ranking baseado em pontos corridos.",
    "Copa": "Sistema eliminatório com chaves. Equipes são distribuídas em chaves pelo usuário.",
    "Grupo+Copa": "Fase de grupos seguida de fase eliminatória. Usuário define quantas equipes avançam.",
    "Grupo+Grupo": "Duas fases de grupos. Primeiras equipes de cada grupo avançam para segunda fase."
  };

  const rankingOptions = [
    { id: "points", label: "Maior número de pontos" },
    { id: "victories", label: "Maior número de vitórias" },
    { id: "goalDifference", label: "Melhor saldo de gols" },
    { id: "goalsFor", label: "Maior número de gols marcados" },
    { id: "yellowCards", label: "Menor número de cartões amarelos" },
    { id: "redCards", label: "Menor número de cartões vermelhos" }
  ];

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Torneio *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Copa de Verão 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ageCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria de Idade *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Sub-8">Sub-8</SelectItem>
                        <SelectItem value="Sub-9">Sub-9</SelectItem>
                        <SelectItem value="Sub-10">Sub-10</SelectItem>
                        <SelectItem value="Sub-11">Sub-11</SelectItem>
                        <SelectItem value="Sub-12">Sub-12</SelectItem>
                        <SelectItem value="Sub-13">Sub-13</SelectItem>
                        <SelectItem value="Sub-14">Sub-14</SelectItem>
                        <SelectItem value="Sub-15">Sub-15</SelectItem>
                        <SelectItem value="Sub-16">Sub-16</SelectItem>
                        <SelectItem value="Sub-17">Sub-17</SelectItem>
                        <SelectItem value="Sub-18">Sub-18</SelectItem>
                        <SelectItem value="Sub-19">Sub-19</SelectItem>
                        <SelectItem value="Sub-20">Sub-20</SelectItem>
                        <SelectItem value="Adulto">Adulto</SelectItem>
                        <SelectItem value="Veterano">Veterano</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jointCategories"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-joint-categories"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Categorias Conjuntas
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        As categorias caminham juntas no mesmo torneio (Ex: Sub-15/17)
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("jointCategories") && (
                <FormField
                  control={form.control}
                  name="additionalCategories"
                  render={({ field }) => {
                    const selectedMainCategory = form.watch("ageCategory");
                    const additionalOptions = availableCategories.filter(cat => cat !== selectedMainCategory);
                    
                    return (
                      <FormItem className="rounded-md border p-4 bg-blue-50">
                        <FormLabel>Categorias Adicionais *</FormLabel>
                        <p className="text-sm text-muted-foreground mb-3">
                          Selecione quais categorias participarão junto com <strong>{selectedMainCategory || "a categoria principal"}</strong>
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {additionalOptions.map((category) => (
                            <FormItem
                              key={category}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(category)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, category]);
                                    } else {
                                      field.onChange(currentValue.filter((val) => val !== category));
                                    }
                                  }}
                                  data-testid={`checkbox-category-${category}`}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {category}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Início *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Fim *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="numberOfTeams"
                render={({ field }) => {
                  const jointCategories = form.watch("jointCategories");
                  const additionalCategories = form.watch("additionalCategories") || [];
                  const numberOfTeams = parseInt(field.value) || 0;
                  const totalCategories = jointCategories ? 1 + additionalCategories.length : 1;
                  const totalTeams = numberOfTeams * totalCategories;
                  
                  return (
                    <FormItem>
                      <FormLabel>Número de Equipes {jointCategories ? "por Categoria" : ""} *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="2" 
                          max="64" 
                          placeholder="Ex: 16" 
                          {...field} 
                        />
                      </FormControl>
                      {jointCategories && numberOfTeams > 0 && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                          <p className="text-sm font-medium text-blue-900">
                            Total de equipes no torneio: <strong>{totalTeams}</strong>
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            {numberOfTeams} equipes × {totalCategories} {totalCategories === 1 ? "categoria" : "categorias"}
                          </p>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </CardContent>
          </Card>

          {/* Tournament Format */}
          <Card>
            <CardHeader>
              <CardTitle>Formato do Torneio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formato *</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedFormat(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o formato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Liga">Liga (Pontos Corridos)</SelectItem>
                        <SelectItem value="Copa">Copa (Eliminatório)</SelectItem>
                        <SelectItem value="Grupo+Copa">Grupo + Copa</SelectItem>
                        <SelectItem value="Grupo+Grupo">Grupo + Grupo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedFormat && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">{selectedFormat}</h4>
                  <p className="text-sm text-gray-600">
                    {formatDescriptions[selectedFormat as keyof typeof formatDescriptions]}
                  </p>
                </div>
              )}

              {(selectedFormat === "Grupo+Copa" || selectedFormat === "Grupo+Grupo") && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Número de Grupos
                    </label>
                    <Input
                      type="number"
                      min="2"
                      max="8"
                      value={numberOfGroups}
                      onChange={(e) => setNumberOfGroups(parseInt(e.target.value) || 2)}
                      placeholder="Ex: 4"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ranking Criteria */}
          {(selectedFormat === "Liga" || selectedFormat === "Grupo+Copa" || selectedFormat === "Grupo+Grupo") && (
            <Card>
              <CardHeader>
                <CardTitle>Critérios de Classificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Selecione os critérios de desempate em ordem de prioridade:
                </p>
                
                <div className="space-y-3">
                  {rankingOptions.map((option, index) => (
                    <div key={option.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={option.id}
                        checked={rankingCriteria.includes(option.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setRankingCriteria([...rankingCriteria, option.id]);
                          } else {
                            setRankingCriteria(rankingCriteria.filter(c => c !== option.id));
                          }
                        }}
                      />
                      <label htmlFor={option.id} className="text-sm">
                        {index + 1}. {option.label}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium mb-2">Sistema de Pontuação</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Vitória: 3 pontos</p>
                    <p>• Empate: 1 ponto</p>
                    <p>• Derrota: 0 pontos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createTournament.isPending}
              className="min-w-[120px]"
            >
              {createTournament.isPending ? "Criando..." : "Criar Torneio"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}