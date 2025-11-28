import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ImageIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SimpleTrainingFormProps {
  onSuccess: () => void;
  editingSession?: any;
}

export function SimpleTrainingForm({ onSuccess, editingSession }: SimpleTrainingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: editingSession?.title || "",
    description: editingSession?.description || "",
    date: editingSession?.date || "",
    startTime: editingSession?.startTime || "",
    endTime: editingSession?.endTime || "",
    location: editingSession?.location || "",
    category: editingSession?.category || "",
    type: editingSession?.type || "",
  });

  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Get user's current club and season from user data
      if (!user?.clubId || !user?.seasonId) {
        throw new Error("Usuário deve estar associado a um clube e temporada");
      }

      const payload = {
        ...data,
        clubId: user.clubId,
        seasonId: user.seasonId,
        createdBy: user.id,
        photos: null,
      };
      
      const url = editingSession ? `/api/training-sessions/${editingSession.id}` : "/api/training-sessions";
      const method = editingSession ? "PUT" : "POST";
      
      return await apiRequest(url, method, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions"] });
      toast({
        title: "Treino criado",
        description: "Treino criado com sucesso.",
      });
      onSuccess();
    },
    onError: (error) => {
      console.error("Erro ao criar treino:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar treino. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Formulário enviado com dados:", formData);
    
    // Validação básica
    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime || 
        !formData.location || !formData.category || !formData.type) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedPhotos([...selectedPhotos, ...files]);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Ex: Treino técnico"
            required
          />
        </div>

        <div>
          <Label htmlFor="date">Data *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange("date", e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="startTime">Horário de Início *</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => handleInputChange("startTime", e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="endTime">Horário de Término *</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => handleInputChange("endTime", e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="location">Local *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
            placeholder="Ex: Arena Inconfidência"
            required
          />
        </div>

        <div>
          <Label htmlFor="category">Categoria *</Label>
          <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sub-11">Sub-11</SelectItem>
              <SelectItem value="Sub-13">Sub-13</SelectItem>
              <SelectItem value="Sub-15">Sub-15</SelectItem>
              <SelectItem value="Sub-17">Sub-17</SelectItem>
              <SelectItem value="Sub-20">Sub-20</SelectItem>
              <SelectItem value="Profissional">Profissional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="type">Tipo de Treino *</Label>
          <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="physical">Físico</SelectItem>
              <SelectItem value="technical">Técnico</SelectItem>
              <SelectItem value="tactical">Tático</SelectItem>
              <SelectItem value="physical-tactical">Físico+Tático</SelectItem>
              <SelectItem value="physical-technical">Físico+Técnico</SelectItem>
              <SelectItem value="technical-tactical">Técnico+Tático</SelectItem>
              <SelectItem value="coordination">Coordenação</SelectItem>
              <SelectItem value="resistance">Resistência</SelectItem>
              <SelectItem value="speed">Velocidade</SelectItem>
              <SelectItem value="psychological">Psicológico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="Descreva os objetivos e atividades do treino..."
          className="min-h-[100px]"
        />
      </div>

      {/* Campo de Upload de Fotos */}
      <div>
        <Label>Fotos do Treino</Label>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-fluent-border rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="inline-flex items-center px-4 py-2 bg-fluent-blue text-white rounded-md hover:bg-fluent-blue-dark cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Selecionar Fotos
            </label>
            <p className="text-sm text-fluent-text-secondary mt-2">
              Selecione uma ou mais fotos do treino
            </p>
          </div>

          {selectedPhotos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {selectedPhotos.map((photo, index) => (
                <Card key={index} className="relative">
                  <CardContent className="p-2">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
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
          {mutation.isPending 
            ? (editingSession ? "Atualizando..." : "Criando...") 
            : (editingSession ? "Atualizar Treino" : "Criar Treino")
          }
        </Button>
      </div>
    </form>
  );
}