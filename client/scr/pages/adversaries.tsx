import { useState, useRef } from "react";
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
import { Plus, Edit, Trash2, Users, Phone, Mail, FileText, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertAdversaryTeamSchema, type AdversaryTeam } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

const formSchema = insertAdversaryTeamSchema.omit({ badgeUrl: true }).extend({
  badge: z.instanceof(File, "Arquivo do escudo é obrigatório").optional(),
});

export default function AdversariesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<AdversaryTeam | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Get club and season context from user data
  const clubId = user?.clubId;
  const seasonId = user?.seasonId;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      notes: "",
      clubId: user?.clubId || 0,
      seasonId: user?.seasonId || 0,
    },
  });

  const { data: adversaryTeams = [], isLoading } = useQuery({
    queryKey: ['/api/adversary-teams', clubId, seasonId],
    queryFn: () => apiRequest(`/api/adversary-teams?clubId=${clubId}&seasonId=${seasonId}`),
    enabled: !!clubId && !!seasonId && clubId > 0 && seasonId > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('contactName', data.contactName || '');
      formData.append('contactPhone', data.contactPhone || '');
      formData.append('contactEmail', data.contactEmail || '');
      formData.append('notes', data.notes || '');
      formData.append('clubId', data.clubId.toString());
      formData.append('seasonId', data.seasonId.toString());
      if (data.badge) {
        formData.append('badge', data.badge);
      }
      
      return fetch('/api/adversary-teams', {
        method: 'POST',
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adversary-teams'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Equipe adversária criada com sucesso",
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
        description: "Falha ao criar equipe adversária",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof formSchema> }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('contactName', data.contactName || '');
      formData.append('contactPhone', data.contactPhone || '');
      formData.append('contactEmail', data.contactEmail || '');
      formData.append('notes', data.notes || '');
      formData.append('clubId', data.clubId.toString());
      formData.append('seasonId', data.seasonId.toString());
      if (data.badge) {
        formData.append('badge', data.badge);
      }
      
      return fetch(`/api/adversary-teams/${id}`, {
        method: 'PUT',
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adversary-teams'] });
      setIsDialogOpen(false);
      setSelectedTeam(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Equipe adversária atualizada com sucesso",
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
        description: "Falha ao atualizar equipe adversária",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/adversary-teams/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adversary-teams'] });
      toast({
        title: "Sucesso",
        description: "Equipe adversária excluída com sucesso",
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
        description: "Falha ao excluir equipe adversária",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (selectedTeam) {
      updateMutation.mutate({ id: selectedTeam.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (team: AdversaryTeam) => {
    setSelectedTeam(team);
    form.reset({
      name: team.name,
      contactName: team.contactName || "",
      contactPhone: team.contactPhone || "",
      contactEmail: team.contactEmail || "",
      notes: team.notes || "",
      clubId: team.clubId,
      seasonId: team.seasonId,
    });
    // Clear file input when editing
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta equipe adversária?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedTeam(null);
    form.reset();
    // Clear file input when closing dialog
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Carregando equipes adversárias...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Equipes Adversárias</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerenciar equipes externas para torneios e jogos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedTeam(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Equipe Adversária
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {selectedTeam ? "Editar Equipe Adversária" : "Nova Equipe Adversária"}
              </DialogTitle>
              <DialogDescription>
                {selectedTeam 
                  ? "Atualizar as informações da equipe adversária abaixo."
                  : "Adicionar nova equipe externa para torneios e jogos."
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
                      <FormLabel>Nome da Equipe *</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome da equipe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="badge"
                  render={({ field: { onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Escudo da Equipe *</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                onChange(file);
                              }
                            }}
                            className="cursor-pointer"
                          />
                          <p className="text-sm text-gray-500">
                            Enviar imagem do escudo (PNG, JPG, etc.)
                          </p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Contato</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome da pessoa de contato" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone de Contato</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o telefone de contato" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail de Contato</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o e-mail de contato" {...field} />
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
                        <Textarea placeholder="Observações adicionais sobre a equipe" {...field} />
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
                      : selectedTeam
                      ? "Atualizar Equipe"
                      : "Criar Equipe"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adversaryTeams.map((team: AdversaryTeam) => (
          <Card key={team.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {team.badgeUrl && (
                    <img 
                      src={team.badgeUrl} 
                      alt={`${team.name} badge`}
                      className="w-10 h-10 object-cover rounded"
                    />
                  )}
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      <Users className="h-3 w-3 mr-1" />
                      Equipe Externa
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(team)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(team.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {team.contactName && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Users className="h-4 w-4" />
                  <span>{team.contactName}</span>
                </div>
              )}
              {team.contactPhone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Phone className="h-4 w-4" />
                  <span>{team.contactPhone}</span>
                </div>
              )}
              {team.contactEmail && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Mail className="h-4 w-4" />
                  <span>{team.contactEmail}</span>
                </div>
              )}
              {team.notes && (
                <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <FileText className="h-4 w-4 mt-0.5" />
                  <span className="flex-1">{team.notes}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {adversaryTeams.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Nenhuma equipe adversária ainda
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Comece adicionando equipes externas para torneios e jogos.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeira Equipe Adversária
          </Button>
        </div>
      )}
    </div>
  );
}