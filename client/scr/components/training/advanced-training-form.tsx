import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, MoveUp, MoveDown, Save } from "lucide-react";

// Form schema for training session
const trainingFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de fim é obrigatório"),
  location: z.string().min(1, "Local é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  type: z.string().min(1, "Tipo é obrigatório"),
});

type TrainingFormData = z.infer<typeof trainingFormSchema>;

interface TrainingStage {
  id: string;
  name: string;
  description: string;
  order: number;
  duration: number;
  drills: StageDrill[];
}

interface StageDrill {
  id: string;
  drillId: number;
  drillName: string;
  order: number;
  duration: number;
  notes: string;
}

interface AdvancedTrainingFormProps {
  onSuccess: () => void;
  editingSession?: any;
}

export default function AdvancedTrainingForm({ onSuccess, editingSession }: AdvancedTrainingFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("basic");
  const [stages, setStages] = useState<TrainingStage[]>([]);
  const [stageDrillSelections, setStageDrillSelections] = useState<{ [key: number]: string }>({});
  const isEditing = !!editingSession;
  
  const form = useForm<TrainingFormData>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: editingSession ? {
      title: editingSession.title || "",
      description: editingSession.description || "",
      date: editingSession.date || "",
      startTime: editingSession.startTime || "",
      endTime: editingSession.endTime || "",
      location: editingSession.location || "",
      category: editingSession.category || "",
      type: editingSession.type || "",
    } : {
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      category: "",
      type: "",
    },
  });

  // Fetch predefined drills
  const { data: drills = [] } = useQuery<any[]>({
    queryKey: ["/api/training-drills"],
  });

  const mutation = useMutation({
    mutationFn: async (data: TrainingFormData) => {
      // Create or update training session
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `/api/training-sessions/${editingSession.id}` : "/api/training-sessions";
      
      const payload = {
        ...data,
        clubId: (user as any)?.clubId,
        seasonId: (user as any)?.seasonId,
        createdBy: (user as any)?.id,
      };
      
      const sessionResponse: any = await apiRequest(url, method, payload);

      // Create stages and drills if any
      if (stages.length > 0 && sessionResponse.id) {
        for (const stage of stages) {
          const stageResponse: any = await apiRequest("/api/training-stages", "POST", {
            trainingSessionId: sessionResponse.id,
            name: stage.name,
            description: stage.description,
            order: stage.order,
            duration: stage.duration,
          });

          // Create stage drills
          for (const drill of stage.drills) {
            await apiRequest("/api/training-stage-drills", "POST", {
              trainingStageId: stageResponse.id,
              drillId: drill.drillId,
              order: drill.order,
              duration: drill.duration,
              notes: drill.notes,
            });
          }
        }
      }

      return sessionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions"] });
      toast({
        title: isEditing ? "Treino atualizado" : "Treino criado",
        description: isEditing ? "A sessão de treino foi atualizada com sucesso." : "A sessão de treino foi criada com sucesso.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao criar sessão de treino.",
        variant: "destructive",
      });
    },
  });

  const addStage = () => {
    const newStage: TrainingStage = {
      id: Date.now().toString(),
      name: "",
      description: "",
      order: stages.length + 1,
      duration: 15,
      drills: [],
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const updateStage = (index: number, updates: Partial<TrainingStage>) => {
    const updatedStages = [...stages];
    updatedStages[index] = { ...updatedStages[index], ...updates };
    setStages(updatedStages);
  };

  const addDrillToStage = (stageIndex: number, drillId: number) => {
    const drill = drills.find((d: any) => d.id === drillId);
    if (!drill) return;

    const newDrill: StageDrill = {
      id: Date.now().toString(),
      drillId: drill.id,
      drillName: drill.name,
      order: stages[stageIndex].drills.length + 1,
      duration: drill.duration || 10,
      notes: "",
    };

    updateStage(stageIndex, {
      drills: [...stages[stageIndex].drills, newDrill],
    });
  };

  const removeDrillFromStage = (stageIndex: number, drillIndex: number) => {
    const updatedDrills = stages[stageIndex].drills.filter((_, i) => i !== drillIndex);
    updateStage(stageIndex, { drills: updatedDrills });
  };

  const onSubmit = (data: TrainingFormData) => {
    if (!(user as any)?.id) {
      toast({
        title: "Erro",
        description: "Usuário não identificado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }
    
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
            <TabsTrigger value="structure">Estrutura do Treino</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Treino</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Treino Físico - Resistência" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva os objetivos e atividades do treino"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Campo 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Sub-15">Sub-15</SelectItem>
                        <SelectItem value="Sub-17">Sub-17</SelectItem>
                        <SelectItem value="Sub-20">Sub-20</SelectItem>
                        <SelectItem value="Profissional">Profissional</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="physical">Físico</SelectItem>
                        <SelectItem value="technical">Técnico</SelectItem>
                        <SelectItem value="tactical">Tático</SelectItem>
                        <SelectItem value="psychological">Psicológico</SelectItem>
                        <SelectItem value="physical-tactical">Físico+Tático</SelectItem>
                        <SelectItem value="physical-technical">Físico+Técnico</SelectItem>
                        <SelectItem value="technical-tactical">Técnico+Tático</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="structure" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Etapas do Treino</h3>
                <p className="text-sm text-muted-foreground">Estruture o treino em fases e adicione exercícios</p>
              </div>
              <Button type="button" onClick={addStage} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Etapa
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              {stages.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">Nenhuma etapa adicionada. Clique em "Adicionar Etapa" para começar.</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {stages.map((stage, stageIndex) => (
                    <Card key={stage.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Nome da etapa (ex: Aquecimento)"
                              value={stage.name}
                              onChange={(e) => updateStage(stageIndex, { name: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                placeholder="Duração (min)"
                                value={stage.duration}
                                onChange={(e) => updateStage(stageIndex, { duration: parseInt(e.target.value) || 0 })}
                              />
                              <Select
                                value={stageDrillSelections[stageIndex] || ""}
                                onValueChange={(value) => {
                                  if (value) {
                                    addDrillToStage(stageIndex, parseInt(value));
                                    setStageDrillSelections({ ...stageDrillSelections, [stageIndex]: "" });
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Adicionar exercício" />
                                </SelectTrigger>
                                <SelectContent>
                                  {drills.map((drill: any) => (
                                    <SelectItem 
                                      key={drill.id} 
                                      value={drill.id.toString()}
                                    >
                                      {drill.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStage(stageIndex)}
                            className="ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      
                      {stage.drills.length > 0 && (
                        <CardContent>
                          <div className="space-y-2">
                            {stage.drills.map((drill, drillIndex) => (
                              <div key={drill.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                                <Badge variant="outline">{drill.duration}min</Badge>
                                <span className="flex-1 text-sm">{drill.drillName}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDrillFromStage(stageIndex, drillIndex)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {mutation.isPending ? (isEditing ? "Atualizando..." : "Criando...") : (isEditing ? "Atualizar Treino" : "Criar Treino Completo")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
