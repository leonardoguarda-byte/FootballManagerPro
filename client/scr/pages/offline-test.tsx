import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import { offlineSyncManager } from "@/lib/offlineSync";
import { useToast } from "@/hooks/use-toast";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Plus,
  Edit,
  Trash2,
  TestTube,
  AlertTriangle
} from "lucide-react";

export default function OfflineTest() {
  const { toast } = useToast();
  const [teamName, setTeamName] = useState("");
  const [isOnlineSimulation, setIsOnlineSimulation] = useState(navigator.onLine);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['/api/teams'],
  });

  const createTeamMutation = useOfflineMutation({
    endpoint: '/api/teams',
    method: 'POST',
    invalidateQueries: ['/api/teams'],
    optimisticUpdate: {
      queryKey: ['/api/teams'],
      updater: (old: any, newTeam: any) => 
        old ? [...old, { ...newTeam, id: `temp-${Date.now()}` }] : [{ ...newTeam, id: `temp-${Date.now()}` }]
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Equipe de teste criada com sucesso",
      });
      setTeamName("");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar equipe. Será sincronizado quando online.",
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useOfflineMutation({
    endpoint: '/api/teams',
    method: 'DELETE',
    invalidateQueries: ['/api/teams'],
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Equipe excluída com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao excluir equipe. Será sincronizado quando online.",
        variant: "destructive",
      });
    },
  });

  const simulateOffline = () => {
    // Simulate offline mode by dispatching offline event
    window.dispatchEvent(new Event('offline'));
    setIsOnlineSimulation(false);
    toast({
      title: "Modo Offline Simulado",
      description: "Agora testando funcionalidade offline",
      variant: "default",
    });
  };

  const simulateOnline = () => {
    // Simulate online mode by dispatching online event
    window.dispatchEvent(new Event('online'));
    setIsOnlineSimulation(true);
    toast({
      title: "Modo Online Restaurado",
      description: "Reconectado - sincronizando dados...",
      variant: "default",
    });
  };

  const createTestTeam = () => {
    if (!teamName.trim()) {
      toast({
        title: "Nome Obrigatório",
        description: "Digite um nome para a equipe de teste",
        variant: "destructive",
      });
      return;
    }

    createTeamMutation.mutate({
      name: teamName,
      category: "Teste",
      ageGroup: "Juvenil",
      description: `Equipe de teste criada em modo ${isOnlineSimulation ? 'online' : 'offline'}`,
      coachName: "Técnico Teste",
      assistantCoachName: "Auxiliar Teste",
      isActive: true,
    });
  };

  const deleteTestTeam = (teamId: string) => {
    deleteTeamMutation.mutate(teamId);
  };

  const clearOfflineQueue = () => {
    offlineSyncManager.clearQueue();
    toast({
      title: "Fila Limpa",
      description: "Todas as operações pendentes foram removidas",
    });
  };

  const queueStatus = offlineSyncManager.getQueueStatus();
  const queuedOperations = offlineSyncManager.getQueuedOperations();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teste de Sincronização Offline</h1>
          <p className="text-muted-foreground">
            Demonstração das funcionalidades de sincronização offline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOnlineSimulation ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Wifi className="w-3 h-3 mr-1" />
              Online
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>
      </div>

      {/* Connection Simulation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Controles de Simulação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={simulateOffline} 
              disabled={!isOnlineSimulation}
              variant="destructive"
              size="sm"
            >
              <WifiOff className="w-4 h-4 mr-2" />
              Simular Offline
            </Button>
            <Button 
              onClick={simulateOnline} 
              disabled={isOnlineSimulation}
              variant="default"
              size="sm"
            >
              <Wifi className="w-4 h-4 mr-2" />
              Restaurar Online
            </Button>
            <Button 
              onClick={clearOfflineQueue} 
              variant="outline"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Fila
            </Button>
          </div>
          
          {!isOnlineSimulation && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                Modo offline ativo. Operações serão armazenadas para sincronização posterior.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Status */}
      {queueStatus.queueLength > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className={`w-5 h-5 ${queueStatus.isProcessing ? 'animate-spin' : ''}`} />
              Status da Fila de Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {queueStatus.queueLength} operações pendentes
              </p>
              
              <div className="space-y-1">
                {queuedOperations.slice(0, 3).map((operation) => (
                  <div key={operation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <span>{operation.type} em {operation.endpoint}</span>
                    <span className="text-muted-foreground">
                      {new Date(operation.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                ))}
                {queuedOperations.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{queuedOperations.length - 3} mais operações
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Criar Equipe de Teste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="teamName">Nome da Equipe</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Digite o nome da equipe de teste..."
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={createTestTeam}
                disabled={createTeamMutation.isPending}
              >
                {createTeamMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Criar Equipe
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams List */}
      <Card>
        <CardHeader>
          <CardTitle>Equipes Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Carregando equipes...</span>
            </div>
          ) : teams && teams.length > 0 ? (
            <div className="space-y-2">
              {teams.map((team: any) => (
                <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{team.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {team.category} - {team.ageGroup}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTestTeam(team.id)}
                      disabled={deleteTeamMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhuma equipe encontrada</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}