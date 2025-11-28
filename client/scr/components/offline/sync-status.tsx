import { useState, useEffect } from "react";
import { offlineSyncManager } from "@/lib/offlineSync";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Trash2
} from "lucide-react";

export function SyncStatus() {
  const [syncStatus, setSyncStatus] = useState(offlineSyncManager.getStatus());
  const [queuedOperations, setQueuedOperations] = useState([]);

  useEffect(() => {
    const updateStatus = () => {
      setSyncStatus(offlineSyncManager.getStatus());
      setQueuedOperations([]);
    };

    // Update status every second
    const interval = setInterval(updateStatus, 1000);

    // Listen for online/offline events
    const handleOnline = () => updateStatus();
    const handleOffline = () => updateStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const clearQueue = () => {
    offlineSyncManager.clearQueue();
    setQueuedOperations([]);
  };

  const getOperationTypeText = (type: string) => {
    switch (type) {
      case 'CREATE': return 'Criar';
      case 'UPDATE': return 'Atualizar';
      case 'DELETE': return 'Excluir';
      default: return type;
    }
  };

  const getModuleFromEndpoint = (endpoint: string) => {
    if (endpoint.includes('/teams')) return 'Equipes';
    if (endpoint.includes('/athletes')) return 'Atletas';
    if (endpoint.includes('/training')) return 'Treinos';
    if (endpoint.includes('/games')) return 'Jogos';
    if (endpoint.includes('/wellness')) return 'Wellness';
    if (endpoint.includes('/medical')) return 'Médico';
    if (endpoint.includes('/financial')) return 'Financeiro';
    return 'Sistema';
  };

  if (syncStatus.isOnline && syncStatus.queueLength === 0) {
    return null; // Don't show anything when online and no pending operations
  }

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {syncStatus.isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="font-medium">
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </span>
            {syncStatus.isProcessing && (
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            )}
          </div>
          
          {syncStatus.queueLength > 0 && (
            <Badge variant={syncStatus.isOnline ? "default" : "secondary"}>
              {syncStatus.queueLength} operações pendentes
            </Badge>
          )}
        </div>

        {syncStatus.queueLength > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {syncStatus.isOnline 
                  ? "Sincronizando dados..." 
                  : "Dados serão sincronizados quando a conexão for restaurada"
                }
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearQueue}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar Fila
              </Button>
            </div>

            <div className="max-h-32 overflow-y-auto space-y-1">
              {queuedOperations.slice(0, 5).map((operation) => (
                <div key={operation.id} className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded">
                  {operation.retryCount > 0 ? (
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                  ) : (
                    <Clock className="h-3 w-3 text-blue-500" />
                  )}
                  <span className="font-medium">
                    {getOperationTypeText(operation.type)}
                  </span>
                  <span className="text-gray-600">
                    em {getModuleFromEndpoint(operation.endpoint)}
                  </span>
                  {operation.retryCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Tentativa {operation.retryCount}
                    </Badge>
                  )}
                  <span className="text-gray-500 ml-auto">
                    {new Date(operation.timestamp).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              ))}
              {queuedOperations.length > 5 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{queuedOperations.length - 5} mais operações
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}