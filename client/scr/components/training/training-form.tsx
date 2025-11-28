import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ImageIcon, X } from "lucide-react";

const trainingFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de fim é obrigatório"),
  location: z.string().min(1, "Local é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  type: z.string().min(1, "Tipo é obrigatório"),
  createdBy: z.string().optional(),
  photos: z.any().optional(),
});

type TrainingFormData = z.infer<typeof trainingFormSchema>;

interface TrainingFormProps {
  onSuccess: () => void;
}

export default function TrainingForm({ onSuccess }: TrainingFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  
  const form = useForm<TrainingFormData>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: {
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

  const mutation = useMutation({
    mutationFn: async (data: TrainingFormData) => {
      // For now, create training session without photos
      // Photos can be uploaded separately after session is created
      const trainingData = { 
        ...data, 
        photos: null 
      };

      return await apiRequest("/api/training-sessions", "POST", trainingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions"] });
      toast({
        title: "Treino criado",
        description: "A sessão de treino foi criada com sucesso.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar sessão de treino.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedPhotos([...selectedPhotos, ...files]);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };

  const onSubmit = (data: TrainingFormData) => {
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Raw form data:', data);
    console.log('User object:', user);
    
    if (!user?.id) {
      console.error('User ID is missing!');
      toast({
        title: "Erro",
        description: "Usuário não identificado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }
    
    // Add the createdBy field with current user ID
    const formDataWithUser = {
      ...data,
      createdBy: user.id,
    };
    
    console.log('Final data being sent to server:', formDataWithUser);
    
    mutation.mutate(formDataWithUser);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <FormLabel>Horário de Início</FormLabel>
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
                <FormLabel>Horário de Fim</FormLabel>
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
                <Input placeholder="Ex: Campo 1, Ginásio, Academia" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <SelectItem value="Todas">Todas as Categorias</SelectItem>
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
                <FormLabel>Tipo de Treino</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="physical">Físico</SelectItem>
                    <SelectItem value="technical">Técnico</SelectItem>
                    <SelectItem value="tactical">Tático</SelectItem>
                    <SelectItem value="physical-tactical">Físico+Tático</SelectItem>
                    <SelectItem value="physical-technical">Físico+Técnico</SelectItem>
                    <SelectItem value="technical-tactical">Técnico+Tático</SelectItem>
                    <SelectItem value="psychological">Psicológico</SelectItem>
                    <SelectItem value="coordenacao">Coordenação</SelectItem>
                    <SelectItem value="resistencia">Resistência</SelectItem>
                    <SelectItem value="velocidade">Velocidade</SelectItem>
                    <SelectItem value="forca">Força</SelectItem>
                    <SelectItem value="finalizacao">Finalização</SelectItem>
                    <SelectItem value="passe">Passe</SelectItem>
                    <SelectItem value="defesa">Defesa</SelectItem>
                    <SelectItem value="goleiro">Goleiro</SelectItem>
                    <SelectItem value="recuperacao">Recuperação</SelectItem>
                    <SelectItem value="aquecimento">Aquecimento</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Photo Upload Section */}
        <div className="space-y-4">
          <FormLabel>Fotos do Treino (Opcional)</FormLabel>
          <div className="border-2 border-dashed border-fluent-blue hover:border-fluent-blue-dark rounded-lg p-6 transition-colors">
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-fluent-blue" />
              <div className="mt-4">
                <label htmlFor="training-photos" className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-fluent-blue text-white hover:bg-fluent-blue-dark border-fluent-blue"
                    onClick={() => document.getElementById('training-photos')?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Selecionar Fotos
                  </Button>
                  <input
                    id="training-photos"
                    type="file"
                    className="sr-only"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoSelect}
                  />
                </label>
                <p className="mt-2 text-sm text-gray-600">
                  Clique no botão acima para adicionar fotos do treino
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, GIF até 5MB cada
                </p>
              </div>
            </div>
          </div>

          {/* Selected Photos Preview */}
          {selectedPhotos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedPhotos.map((photo, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <p className="mt-1 text-xs text-gray-500 truncate">
                    {photo.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

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
            {mutation.isPending ? "Criando..." : "Criar Treino"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
