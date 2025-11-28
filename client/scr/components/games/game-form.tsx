import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertGameSchema } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

const gameFormSchema = insertGameSchema.extend({
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().min(1, "Horário é obrigatório"),
  location: z.string().min(1, "Local é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  type: z.string().min(1, "Tipo é obrigatório"),
  ourScore: z.string().optional(),
  opponentScore: z.string().optional(),
  tournamentId: z.string().optional(),
}).omit({
  clubId: true,
  seasonId: true,
  id: true,
  createdAt: true,
  updatedAt: true,
});

type GameFormData = z.infer<typeof gameFormSchema>;

interface GameFormProps {
  onSuccess: () => void;
  initialData?: any;
}

export default function GameForm({ onSuccess, initialData }: GameFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<GameFormData>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      opponent: initialData?.opponent || "",
      date: initialData?.date || "",
      time: initialData?.time || "",
      location: initialData?.location || "",
      category: initialData?.category || "",
      type: initialData?.type || "",
      isHome: initialData?.isHome ?? true,
      ourScore: initialData?.ourScore?.toString() || "",
      opponentScore: initialData?.opponentScore?.toString() || "",
      status: initialData?.status || "scheduled",
      tournamentId: initialData?.tournamentId?.toString() || "",
      notes: initialData?.notes || "",
    },
  });

  const { data: tournaments } = useQuery({
    queryKey: ["/api/tournaments"],
    retry: false,
  });

  const clubId = user?.clubId;
  const seasonId = user?.seasonId;

  const { data: adversaryTeams } = useQuery({
    queryKey: ["/api/adversary-teams", clubId, seasonId],
    queryFn: () => apiRequest(`/api/adversary-teams?clubId=${clubId}&seasonId=${seasonId}`),
    enabled: !!clubId && !!seasonId,
    retry: false,
  });

  const { data: stadiums } = useQuery({
    queryKey: ["/api/stadiums", clubId, seasonId],
    queryFn: () => apiRequest(`/api/stadiums?clubId=${clubId}&seasonId=${seasonId}`),
    enabled: !!clubId && !!seasonId,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async (data: GameFormData) => {
      const formattedData = {
        ...data,
        clubId: clubId,
        seasonId: seasonId,
        ourScore: data.ourScore ? parseInt(data.ourScore) : null,
        opponentScore: data.opponentScore ? parseInt(data.opponentScore) : null,
        tournamentId: data.tournamentId && data.tournamentId !== "none" ? parseInt(data.tournamentId) : null,
      };
      
      console.log("Sending data to API:", formattedData);
      
      if (initialData && initialData.id) {
        // Update existing game
        console.log("Updating game with ID:", initialData.id);
        const result = await apiRequest(`/api/games/${initialData.id}`, "PUT", formattedData);
        return result;
      } else {
        // Create new game
        console.log("Creating new game");
        const result = await apiRequest("/api/games", "POST", formattedData);
        return result;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({
        title: initialData?.id ? "Jogo atualizado" : "Jogo criado",
        description: initialData?.id ? "O jogo foi atualizado com sucesso." : "O jogo foi agendado com sucesso.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: initialData?.id ? "Falha ao atualizar jogo." : "Falha ao criar jogo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GameFormData) => {
    console.log("Form submission triggered with data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("InitialData received:", initialData);
    console.log("Is editing mode:", !!initialData?.id);
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="opponent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adversário</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o time adversário" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="manual">Digite manualmente</SelectItem>
                  {adversaryTeams && adversaryTeams.map((team: any) => (
                    <SelectItem key={team.id} value={team.name}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("opponent") === "manual" && (
          <FormField
            control={form.control}
            name="opponent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do adversário</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o nome do time adversário" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário</FormLabel>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local do jogo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="manual">Digite manualmente</SelectItem>
                  {stadiums && stadiums.map((stadium: any) => (
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

        {form.watch("location") === "manual" && (
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do local</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o nome do estádio ou local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="friendly">Amistoso</SelectItem>
                    <SelectItem value="tournament">Torneio</SelectItem>
                    <SelectItem value="league">Liga</SelectItem>
                  </SelectContent>
                </Select>
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
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="completed">Finalizado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center space-x-2">
          <FormField
            control={form.control}
            name="isHome"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Jogo em casa</FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        {tournaments && tournaments.length > 0 && (
          <FormField
            control={form.control}
            name="tournamentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Torneio (opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um torneio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {tournaments.map((tournament: any) => (
                      <SelectItem key={tournament.id} value={tournament.id.toString()}>
                        {tournament.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {form.watch("status") === "completed" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="ourScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nossa Pontuação</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="opponentScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pontuação do Adversário</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações sobre o jogo"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
            {mutation.isPending 
              ? (initialData?.id ? "Atualizando..." : "Criando...") 
              : (initialData?.id ? "Atualizar Jogo" : "Criar Jogo")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
