import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, MapPin, Users, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertStadiumSchema, type Stadium } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

const formSchema = insertStadiumSchema;

// Helper function to generate Google Maps URL
const getGoogleMapsUrl = (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
};

export default function StadiumsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStadium, setSelectedStadium] = useState<Stadium | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();

  // Get club and season context from user data
  const clubId = user?.clubId;
  const seasonId = user?.seasonId;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      capacity: undefined,
      surface: "",
      notes: "",
      clubId: user?.clubId || 0,
      seasonId: user?.seasonId || 0,
    },
  });

  const { data: stadiums = [], isLoading } = useQuery({
    queryKey: ['/api/stadiums', clubId, seasonId],
    queryFn: () => apiRequest(`/api/stadiums?clubId=${clubId}&seasonId=${seasonId}`),
    enabled: !!clubId && !!seasonId && clubId > 0 && seasonId > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => apiRequest('/api/stadiums', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stadiums'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Estádio criado com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao criar estádio",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<z.infer<typeof formSchema>> }) =>
      apiRequest(`/api/stadiums/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stadiums'] });
      setIsDialogOpen(false);
      setSelectedStadium(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Estádio atualizado com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar estádio",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/stadiums/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stadiums'] });
      toast({
        title: "Sucesso",
        description: "Estádio excluído com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir estádio",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log('Stadium form data:', data);
    if (selectedStadium) {
      updateMutation.mutate({ id: selectedStadium.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (stadium: Stadium) => {
    setSelectedStadium(stadium);
    form.reset({
      name: stadium.name,
      address: stadium.address || "",
      capacity: stadium.capacity || undefined,
      surface: stadium.surface || "",
      notes: stadium.notes || "",
      clubId: stadium.clubId,
      seasonId: stadium.seasonId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este estádio?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedStadium(null);
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Carregando estádios...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Estádios</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerenciar locais para jogos e torneios
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedStadium(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Estádio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {selectedStadium ? "Editar Estádio" : "Novo Estádio"}
              </DialogTitle>
              <DialogDescription>
                {selectedStadium 
                  ? "Atualizar as informações do estádio abaixo."
                  : "Adicionar novo local para jogos e torneios."
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Estádio *</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome do estádio" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Digite o endereço do estádio" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidade</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Digite a capacidade" 
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="surface"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Gramado</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Grama natural, Grama sintética" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Observações adicionais sobre o estádio" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending
                      ? "Salvando..."
                      : selectedStadium
                      ? "Atualizar Estádio"
                      : "Criar Estádio"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stadiums.map((stadium: Stadium) => (
          <Card key={stadium.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{stadium.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">
                      <MapPin className="h-3 w-3 mr-1" />
                      Local
                    </Badge>
                    {stadium.capacity && (
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {stadium.capacity.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(stadium)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(stadium.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {stadium.address && (
                <div className="flex items-start justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <div className="flex items-start space-x-2 flex-1">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span className="flex-1">{stadium.address}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 ml-2"
                    onClick={() => window.open(getGoogleMapsUrl(stadium.address), '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {stadium.surface && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></span>
                  <span>{stadium.surface}</span>
                </div>
              )}
              {stadium.notes && (
                <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <FileText className="h-4 w-4 mt-0.5" />
                  <span className="flex-1">{stadium.notes}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {stadiums.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Nenhum estádio ainda
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Comece adicionando locais para jogos e torneios.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Estádio
          </Button>
        </div>
      )}
    </div>
  );
}