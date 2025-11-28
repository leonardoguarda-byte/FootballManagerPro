import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertTeamSchema, type Team } from "@shared/schema";
import { FileUpload } from "@/components/ui/file-upload";

const teamFormSchema = z.object({
  name: z.string().min(1, "Nome da equipe é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  ageGroup: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  coachName: z.string().optional().or(z.literal("")),
  assistantCoachName: z.string().optional().or(z.literal("")),
  physicalTrainerName: z.string().optional().or(z.literal("")),
  goalkeeperTrainerName: z.string().optional().or(z.literal("")),
  teamPhoto: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

type TeamFormData = z.infer<typeof teamFormSchema>;

interface TeamFormProps {
  team?: Team | null;
  onSuccess: () => void;
}

export default function TeamForm({ team, onSuccess }: TeamFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: team?.name || "",
      category: team?.category || "",
      ageGroup: team?.ageGroup || "",
      description: team?.description || "",
      coachName: team?.coachName || "",
      assistantCoachName: team?.assistantCoachName || "",
      physicalTrainerName: team?.physicalTrainerName || "",
      goalkeeperTrainerName: team?.goalkeeperTrainerName || "",
      teamPhoto: team?.teamPhoto || "",
      isActive: team?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      let teamPhotoUrl = data.teamPhoto;

      // Se há uma nova foto selecionada, fazer upload primeiro
      if (selectedPhoto) {
        const formData = new FormData();
        formData.append('teamPhoto', selectedPhoto);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error('Erro ao fazer upload da foto');
        }

        const uploadResult = await uploadResponse.json();
        if (uploadResult.files && uploadResult.files.teamPhoto) {
          teamPhotoUrl = uploadResult.files.teamPhoto;
        }
      }

      const teamData = { ...data, teamPhoto: teamPhotoUrl };

      if (team) {
        await apiRequest(`/api/teams/${team.id}`, "PUT", teamData);
      } else {
        await apiRequest("/api/teams", "POST", teamData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Sucesso",
        description: team ? "Equipe atualizada com sucesso" : "Equipe criada com sucesso",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      console.error("Team creation error:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar equipe",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TeamFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Equipe</FormLabel>
              <FormControl>
                <Input placeholder="Digite o nome da equipe" {...field} />
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
                  <SelectItem value="Profissional">Profissional</SelectItem>
                  <SelectItem value="Sub-20">Sub-20</SelectItem>
                  <SelectItem value="Sub-19">Sub-19</SelectItem>
                  <SelectItem value="Sub-18">Sub-18</SelectItem>
                  <SelectItem value="Sub-17">Sub-17</SelectItem>
                  <SelectItem value="Sub-16">Sub-16</SelectItem>
                  <SelectItem value="Sub-15">Sub-15</SelectItem>
                  <SelectItem value="Sub-14">Sub-14</SelectItem>
                  <SelectItem value="Sub-13">Sub-13</SelectItem>
                  <SelectItem value="Sub-12">Sub-12</SelectItem>
                  <SelectItem value="Sub-11">Sub-11</SelectItem>
                  <SelectItem value="Sub-10">Sub-10</SelectItem>
                  <SelectItem value="Sub-9">Sub-9</SelectItem>
                  <SelectItem value="Sub-8">Sub-8</SelectItem>
                  <SelectItem value="Sub-7">Sub-7</SelectItem>
                  <SelectItem value="Academia">Academia</SelectItem>
                  <SelectItem value="Amador">Amador</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ageGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Faixa Etária (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="ex: 16-18 anos" {...field} />
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
              <FormLabel>Descrição (Opcional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Breve descrição da equipe"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="coachName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Treinador (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Digite o nome do treinador" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assistantCoachName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Auxiliar Técnico (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Digite o nome do auxiliar técnico" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="physicalTrainerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preparador Físico (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Nome do preparador físico" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="goalkeeperTrainerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preparador de Goleiros (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Nome do preparador de goleiros" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="teamPhoto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Foto da Equipe (Opcional)</FormLabel>
              <FormControl>
                <FileUpload
                  onFileSelect={(file) => {
                    setSelectedPhoto(file);
                    if (file) {
                      // Mostrar preview da foto selecionada
                      const fileUrl = URL.createObjectURL(file);
                      field.onChange(fileUrl);
                    } else {
                      field.onChange(team?.teamPhoto || "");
                    }
                  }}
                  currentFile={field.value || ""}
                  accept="image/*"
                  maxSize={5}
                  placeholder="Selecione uma foto da equipe"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Equipe Ativa</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Ativar esta equipe para operações
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : team ? "Atualizar Equipe" : "Criar Equipe"}
          </Button>
        </div>
      </form>
    </Form>
  );
}