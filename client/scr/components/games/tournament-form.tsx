import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTournamentSchema } from "@shared/schema";

const tournamentFormSchema = insertTournamentSchema.omit({
  clubId: true,
  seasonId: true,
}).extend({
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().min(1, "Data de fim é obrigatória"),
  registrationDeadline: z.string().optional(),
  maxTeams: z.union([z.string(), z.number()]).optional(),
  category: z.string().optional(),
  rules: z.string().optional(),
});

type TournamentFormData = z.infer<typeof tournamentFormSchema>;

interface TournamentFormProps {
  onSuccess: () => void;
  initialData?: any;
}

export default function TournamentForm({ onSuccess, initialData }: TournamentFormProps) {
  const { toast } = useToast();
  
  // Get user's current club and season context
  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });
  const { data: selectedClub } = useQuery({ 
    queryKey: ["/api/clubs/selected"],
    enabled: !!user 
  });
  const { data: selectedSeason } = useQuery({ 
    queryKey: ["/api/seasons/selected"],
    enabled: !!selectedClub 
  });
  
  const form = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      location: initialData?.location || "",
      category: initialData?.category || "",
      format: initialData?.format || "knockout",
      maxTeams: initialData?.maxTeams || "",
      status: initialData?.status || "planned",
      startDate: initialData?.startDate || "",
      endDate: initialData?.endDate || "",
      registrationDeadline: initialData?.registrationDeadline || "",
      rules: initialData?.rules || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: TournamentFormData) => {
      // Get club and season from selected values or user context
      let clubId = selectedClub?.id;
      let seasonId = selectedSeason?.id;
      
      // If not available from selections, get from user's current context
      if (!clubId || !seasonId) {
        const userResponse = await apiRequest("/api/auth/user");
        if (userResponse?.clubId && userResponse?.seasonId) {
          clubId = userResponse.clubId;
          seasonId = userResponse.seasonId;
        } else {
          throw new Error("Clube e temporada devem estar selecionados");
        }
      }

      const processedData = {
        ...data,
        clubId,
        seasonId,
        maxTeams: data.maxTeams ? parseInt(data.maxTeams) : null,
        entryFee: null,
        prize: null,
        registrationDeadline: data.registrationDeadline || null,
      };

      if (initialData) {
        return apiRequest(`/api/tournaments/${initialData.id}`, "PUT", processedData);
      } else {
        return apiRequest("/api/tournaments", "POST", processedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Sucesso",
        description: initialData 
          ? "Torneio atualizado com sucesso!" 
          : "Torneio criado com sucesso!",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar torneio",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TournamentFormData) => {
    console.log("Tournament form submitted:", data);
    console.log("Form errors:", form.formState.errors);
    mutation.mutate(data);
  };

  const handleFormClick = () => {
    console.log("Form button clicked");
    console.log("Form state:", form.formState);
    console.log("Form errors:", form.formState.errors);
    console.log("Form is valid:", form.formState.isValid);
    console.log("Form values:", form.getValues());
    console.log("Selected club:", selectedClub);
    console.log("Selected season:", selectedSeason);
    
    // Trigger validation manually to see all errors
    form.trigger().then(isValid => {
      console.log("Manual validation result:", isValid);
      console.log("All field errors after trigger:", form.formState.errors);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-fluent-text">Informações Básicas</h3>
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Torneio</FormLabel>
                <FormControl>
                  <Input placeholder="Copa Primavera 2024" {...field} />
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
                    placeholder="Descrição do torneio, objetivos e informações importantes..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <FormControl>
                    <Input placeholder="Estádio Municipal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <SelectItem value="Sub-11">Sub-11</SelectItem>
                      <SelectItem value="Sub-13">Sub-13</SelectItem>
                      <SelectItem value="Sub-15">Sub-15</SelectItem>
                      <SelectItem value="Sub-17">Sub-17</SelectItem>
                      <SelectItem value="Sub-20">Sub-20</SelectItem>
                      <SelectItem value="Profissional">Profissional</SelectItem>
                      <SelectItem value="Amador">Amador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Tournament Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-fluent-text">Configuração do Torneio</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formato</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Formato do torneio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="knockout">Eliminatório</SelectItem>
                      <SelectItem value="round_robin">Pontos Corridos</SelectItem>
                      <SelectItem value="groups">Grupos + Eliminatório</SelectItem>
                      <SelectItem value="groups_final">Grupos + Grupo Final</SelectItem>
                      <SelectItem value="swiss">Sistema Suíço</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxTeams"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máximo de Times</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="16" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Status do torneio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="planned">Planejado</SelectItem>
                      <SelectItem value="registration_open">Inscrições Abertas</SelectItem>
                      <SelectItem value="registration_closed">Inscrições Fechadas</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Dates and Financial */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-fluent-text">Datas e Valores</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Início</FormLabel>
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
                  <FormLabel>Data de Fim</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="registrationDeadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo de Inscrição</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>


        </div>

        {/* Rules */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-fluent-text">Regulamento</h3>
          
          <FormField
            control={form.control}
            name="rules"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regras e Regulamento</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Regras específicas do torneio, critérios de desempate, regulamentações..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button 
            type="submit" 
            disabled={mutation.isPending} 
            className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
            onClick={handleFormClick}
          >
            {mutation.isPending ? "Salvando..." : initialData ? "Atualizar" : "Criar Torneio"}
          </Button>
        </div>
      </form>
    </Form>
  );
}