import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Clock, 
  Check, 
  X, 
  Trash2, 
  Eye, 
  UserPlus, 
  Users, 
  Calendar,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PendingRegistration {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: string;
  relationship?: string;
  athleteInfo?: any;
  familyAthleteId?: number;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

export default function UserRegistrations() {
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'view' | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["/api/pending-registrations"],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes, teamId }: { id: number; notes: string; teamId?: string }) => {
      return await apiRequest(`/api/pending-registrations/${id}/approve`, "POST", { notes, teamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      toast({
        title: "Cadastro aprovado!",
        description: "O usuário foi notificado e pode acessar a plataforma.",
      });
      setSelectedRegistration(null);
      setActionType(null);
      setNotes("");
      setSelectedTeamId("");
    },
    onError: () => {
      toast({
        title: "Erro ao aprovar",
        description: "Ocorreu um erro ao aprovar o cadastro.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      return await apiRequest(`/api/pending-registrations/${id}/reject`, "POST", { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-registrations"] });
      toast({
        title: "Cadastro rejeitado",
        description: "O usuário foi notificado sobre a rejeição.",
      });
      setSelectedRegistration(null);
      setActionType(null);
      setNotes("");
    },
    onError: () => {
      toast({
        title: "Erro ao rejeitar",
        description: "Ocorreu um erro ao rejeitar o cadastro.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/pending-registrations/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-registrations"] });
      toast({
        title: "Solicitação removida",
        description: "A solicitação foi removida permanentemente.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao remover",
        description: "Ocorreu um erro ao remover a solicitação.",
        variant: "destructive",
      });
    },
  });

  const handleAction = (registration: PendingRegistration, action: 'approve' | 'reject' | 'view') => {
    setSelectedRegistration(registration);
    setActionType(action);
    setNotes("");
    setSelectedTeamId("");
  };

  const handleConfirmAction = () => {
    if (!selectedRegistration) return;

    if (actionType === 'approve') {
      // For athletes, teamId is required
      if (selectedRegistration.userType === 'atleta' && !selectedTeamId) {
        toast({
          title: "Equipe obrigatória",
          description: "Selecione uma equipe para o atleta.",
          variant: "destructive",
        });
        return;
      }
      approveMutation.mutate({ 
        id: selectedRegistration.id, 
        notes,
        teamId: selectedRegistration.userType === 'atleta' ? selectedTeamId : undefined
      });
    } else if (actionType === 'reject') {
      rejectMutation.mutate({ id: selectedRegistration.id, notes });
    }
  };

  const handleDelete = (registration: PendingRegistration) => {
    if (confirm(`Tem certeza que deseja remover a solicitação de ${registration.firstName} ${registration.lastName}?`)) {
      deleteMutation.mutate(registration.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  const getUserTypeIcon = (userType: string) => {
    return userType === 'atleta' ? <UserPlus className="h-4 w-4" /> : <Users className="h-4 w-4" />;
  };

  const getUserTypeText = (userType: string) => {
    return userType === 'atleta' ? 'Atleta' : 'Familiar';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const pendingRegistrations = Array.isArray(registrations) ? registrations.filter((reg: PendingRegistration) => reg.status === 'pending') : [];
  const processedRegistrations = Array.isArray(registrations) ? registrations.filter((reg: PendingRegistration) => reg.status !== 'pending') : [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gerenciar Cadastros
          </h1>
          <p className="text-muted-foreground">
            Analise e aprove solicitações de cadastro de atletas e familiares
          </p>
        </div>
      </div>

      {pendingRegistrations.length === 0 && processedRegistrations.length === 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Nenhuma solicitação encontrada</AlertTitle>
          <AlertDescription>
            Não há solicitações de cadastro pendentes ou processadas no momento.
          </AlertDescription>
        </Alert>
      )}

      {pendingRegistrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Solicitações Pendentes ({pendingRegistrations.length})
            </CardTitle>
            <CardDescription>
              Solicitações aguardando aprovação do administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {pendingRegistrations.map((registration: PendingRegistration) => (
                <div key={registration.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {registration.firstName} {registration.lastName}
                        </h3>
                        <Badge className={getStatusColor(registration.status)}>
                          {getStatusText(registration.status)}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getUserTypeIcon(registration.userType)}
                          {getUserTypeText(registration.userType)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {registration.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {registration.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(registration.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>

                      {registration.relationship && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Parentesco:</strong> {registration.relationship}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(registration, 'view')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAction(registration, 'approve')}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleAction(registration, 'reject')}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {processedRegistrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitações Processadas ({processedRegistrations.length})</CardTitle>
            <CardDescription>
              Histórico de solicitações aprovadas ou rejeitadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {processedRegistrations.map((registration: PendingRegistration) => (
                <div key={registration.id} className="border rounded-lg p-4 space-y-3 opacity-75">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {registration.firstName} {registration.lastName}
                        </h3>
                        <Badge className={getStatusColor(registration.status)}>
                          {getStatusText(registration.status)}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getUserTypeIcon(registration.userType)}
                          {getUserTypeText(registration.userType)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Processado em {format(new Date(registration.reviewedAt!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>

                      {registration.notes && (
                        <div className="text-sm">
                          <strong>Observações:</strong> {registration.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(registration, 'view')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(registration)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={actionType !== null} onOpenChange={() => setActionType(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Aprovar Cadastro'}
              {actionType === 'reject' && 'Rejeitar Cadastro'}
              {actionType === 'view' && 'Detalhes da Solicitação'}
            </DialogTitle>
            <DialogDescription>
              {selectedRegistration && `${selectedRegistration.firstName} ${selectedRegistration.lastName}`}
            </DialogDescription>
          </DialogHeader>

          {selectedRegistration && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Nome Completo</Label>
                  <p className="text-sm">{selectedRegistration.firstName} {selectedRegistration.lastName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tipo de Usuário</Label>
                  <p className="text-sm">{getUserTypeText(selectedRegistration.userType)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm">{selectedRegistration.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Telefone</Label>
                  <p className="text-sm">{selectedRegistration.phone}</p>
                </div>
              </div>

              {selectedRegistration.relationship && (
                <div>
                  <Label className="text-sm font-medium">Parentesco</Label>
                  <p className="text-sm">{selectedRegistration.relationship}</p>
                </div>
              )}

              {selectedRegistration.athleteInfo && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Informações do Atleta</Label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedRegistration.athleteInfo.position && (
                      <div><strong>Posição:</strong> {selectedRegistration.athleteInfo.position}</div>
                    )}
                    {selectedRegistration.athleteInfo.dateOfBirth && (
                      <div><strong>Data de Nascimento:</strong> {format(new Date(selectedRegistration.athleteInfo.dateOfBirth), "dd/MM/yyyy")}</div>
                    )}
                    {selectedRegistration.athleteInfo.height && (
                      <div><strong>Altura:</strong> {selectedRegistration.athleteInfo.height}cm</div>
                    )}
                    {selectedRegistration.athleteInfo.weight && (
                      <div><strong>Peso:</strong> {selectedRegistration.athleteInfo.weight}kg</div>
                    )}
                  </div>
                  {selectedRegistration.athleteInfo.experience && (
                    <div>
                      <strong>Experiência:</strong>
                      <p className="text-sm mt-1">{selectedRegistration.athleteInfo.experience}</p>
                    </div>
                  )}
                  {selectedRegistration.athleteInfo.medicalInfo && (
                    <div>
                      <strong>Informações Médicas:</strong>
                      <p className="text-sm mt-1">{selectedRegistration.athleteInfo.medicalInfo}</p>
                    </div>
                  )}
                </div>
              )}

              {actionType === 'approve' && selectedRegistration.userType === 'atleta' && (
                <>
                  <div>
                    <Label htmlFor="team">Equipe *</Label>
                    <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                      <SelectTrigger className="mt-1" data-testid="select-team">
                        <SelectValue placeholder="Selecione a equipe do atleta" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team: any) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name} - {team.category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-sm text-blue-800">
                      <strong>Categoria automática:</strong> A categoria do atleta será calculada automaticamente com base na idade. 
                      Você poderá adicionar categorias adicionais posteriormente em Configurações → Usuários.
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {(actionType === 'approve' || actionType === 'reject') && (
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder={actionType === 'approve' ? "Observações sobre a aprovação (opcional)" : "Motivo da rejeição (recomendado)"}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              {actionType === 'view' ? 'Fechar' : 'Cancelar'}
            </Button>
            {actionType === 'approve' && (
              <Button
                onClick={handleConfirmAction}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? 'Aprovando...' : 'Aprovar Cadastro'}
              </Button>
            )}
            {actionType === 'reject' && (
              <Button
                variant="destructive"
                onClick={handleConfirmAction}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Rejeitando...' : 'Rejeitar Cadastro'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}