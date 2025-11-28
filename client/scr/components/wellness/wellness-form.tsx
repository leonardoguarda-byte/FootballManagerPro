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
import { Slider } from "@/components/ui/slider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertWellnessEntrySchema, type WellnessEntry } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle } from "lucide-react";

// Define form schema based on wellness entry structure
const wellnessFormSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  sleepHours: z.string().min(1, "Horas de sono é obrigatório"),
  sleepQuality: z.number().min(1, "Qualidade do sono é obrigatória").max(10),
  fatigueLevel: z.number().min(1, "Nível de fadiga é obrigatório").max(10),
  stressLevel: z.number().min(1, "Nível de estresse é obrigatório").max(10),
  mood: z.number().min(1, "Humor/Disposição é obrigatório").max(10),
  soreness: z.string().optional(),
  injuryStatus: z.boolean().optional(),
  notes: z.string().optional(),
});

type WellnessFormData = z.infer<typeof wellnessFormSchema>;

interface WellnessFormProps {
  onSuccess: () => void;
}

export default function WellnessForm({ onSuccess }: WellnessFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Verificar se o usuário é um atleta
  if (!user || user.role?.toLowerCase() !== 'atleta' || !user.athleteId) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Apenas atletas podem preencher o formulário de Wellness.</p>
      </div>
    );
  }

  const form = useForm<WellnessFormData>({
    resolver: zodResolver(wellnessFormSchema),
    defaultValues: {
      date: (() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })(),
      sleepQuality: 5,
      sleepHours: "",
      fatigueLevel: 5,
      stressLevel: 5,
      mood: 5,
      soreness: "",
      injuryStatus: false,
      notes: "",
    },
  });

  const { data: wellnessEntries } = useQuery<WellnessEntry[]>({
    queryKey: ["/api/wellness-entries"],
    retry: false,
  });

  const selectedDate = form.watch("date");

  const hasDuplicateEntry = () => {
    if (!user.athleteId || !selectedDate || !wellnessEntries) return false;
    
    return wellnessEntries.some((entry) => 
      entry.athleteId === user.athleteId && 
      entry.date === selectedDate
    );
  };

  const mutation = useMutation({
    mutationFn: async (data: WellnessFormData) => {
      const formattedData = {
        athleteId: user.athleteId!, // Use logged athlete's ID
        date: data.date,
        sleepQuality: data.sleepQuality || null,
        sleepHours: data.sleepHours ? parseFloat(data.sleepHours) : null,
        fatigueLevel: data.fatigueLevel || null,
        stressLevel: data.stressLevel || null,
        mood: data.mood || null,
        energyLevel: null,
        soreness: data.soreness || null,
        injuryStatus: data.injuryStatus || false,
        notes: data.notes || null,
        clubId: user.clubId,
        seasonId: user.seasonId,
      };
      await apiRequest("/api/wellness-entries", "POST", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wellness-entries"] });
      toast({
        title: "Entrada de wellness criada",
        description: "Os dados de bem-estar foram registrados com sucesso.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Falha ao registrar dados de bem-estar.";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WellnessFormData) => {
    mutation.mutate(data);
  };

  const sleepQualityValue = form.watch("sleepQuality");
  const fatigueLevelValue = form.watch("fatigueLevel");
  const stressLevelValue = form.watch("stressLevel");
  const moodValue = form.watch("mood");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-wellness-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>



        {/* Sleep Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-fluent-text">Informações do Sono</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="sleepQuality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualidade do Sono (1-10) *</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-fluent-text-secondary">
                        <span>Muito Ruim</span>
                        <span className="font-medium">{sleepQualityValue}</span>
                        <span>Excelente</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sleepHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horas de Sono *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione as horas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 49 }, (_, i) => {
                        const hours = i * 0.25; // 0, 0.25, 0.5, 0.75, ..., 12
                        const hoursInt = Math.floor(hours);
                        const minutes = (hours - hoursInt) * 60;
                        return (
                          <SelectItem key={hours} value={hours.toString()}>
                            {hoursInt}h {minutes > 0 ? `${minutes}min` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Fatigue and Stress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="fatigueLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nível de Fadiga (1-10) *</FormLabel>
                <FormControl>
                  <div className="space-y-3">
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-fluent-text-secondary">
                      <span>Nenhuma</span>
                      <span className="font-medium">{fatigueLevelValue}</span>
                      <span>Extrema</span>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stressLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nível de Estresse (1-10) *</FormLabel>
                <FormControl>
                  <div className="space-y-3">
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-fluent-text-secondary">
                      <span>Nenhum</span>
                      <span className="font-medium">{stressLevelValue}</span>
                      <span>Muito Alto</span>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Mood */}
        <FormField
          control={form.control}
          name="mood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Humor/Disposição (1-10) *</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-fluent-text-secondary">
                    <span>Muito Ruim</span>
                    <span className="font-medium">{moodValue}</span>
                    <span>Excelente</span>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Soreness */}
        <FormField
          control={form.control}
          name="soreness"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Áreas com Dor/Desconforto</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva as áreas do corpo com dor ou desconforto"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Injury Status */}
        <FormField
          control={form.control}
          name="injuryStatus"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Presença de lesão ou limitação</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações Adicionais</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações sobre o estado geral, sintomas ou outros aspectos relevantes"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {hasDuplicateEntry() && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Já existe um registro de wellness para este atleta nesta data.
            </span>
          </div>
        )}

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
            disabled={mutation.isPending || hasDuplicateEntry()}
            className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
            data-testid="button-submit-wellness"
          >
            {mutation.isPending ? "Salvando..." : "Registrar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
