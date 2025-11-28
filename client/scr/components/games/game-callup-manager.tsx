import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Search, UserPlus, UserMinus, Check, X, Clock, Users, Target, Star, Bench, PlayCircle, StopCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GameCallUpManagerProps {
  gameId: string | number;
  callUps: any[];
  gameStatus: string;
}

export function GameCallUpManager({ gameId, callUps, gameStatus }: GameCallUpManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [selectedFormation, setSelectedFormation] = useState("4-4-2");
  const [starters, setStarters] = useState<any[]>([]);
  const [bench, setBench] = useState<any[]>([]);
  const [captain, setCaptain] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update starters and bench when callUps change
  useEffect(() => {
    const availablePlayers = callUps.filter(callUp => callUp.callUpStatus !== 'declined');
    const currentStarters = availablePlayers.filter(callUp => callUp.isStarter);
    const currentBench = availablePlayers.filter(callUp => !callUp.isStarter);
    
    setStarters(currentStarters);
    setBench(currentBench);
    
    // Set captain from existing data
    const captainPlayer = availablePlayers.find(callUp => callUp.isCaptain);
    if (captainPlayer) {
      setCaptain(captainPlayer.athleteId);
    }
  }, [callUps]);

  // Fetch available athletes
  const { data: athletes = [] } = useQuery({
    queryKey: ['/api/athletes'],
  });

  // Call up athlete mutation
  const callUpMutation = useMutation({
    mutationFn: async (data: { athleteId: number; position?: string }) => {
      return apiRequest(`/api/games/${gameId}/call-ups`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/call-ups`] });
      toast({
        title: "Sucesso",
        description: "Atleta convocado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao convocar atleta",
        variant: "destructive",
      });
    },
  });

  // Remove call up mutation
  const removeCallUpMutation = useMutation({
    mutationFn: async (callUpId: number) => {
      return apiRequest(`/api/games/${gameId}/call-ups/${callUpId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/call-ups`] });
      toast({
        title: "Sucesso",
        description: "Convocação removida com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover convocação",
        variant: "destructive",
      });
    },
  });

  // Update call up status mutation
  const updateCallUpMutation = useMutation({
    mutationFn: async (data: { callUpId: number; status: string }) => {
      return apiRequest(`/api/games/${gameId}/call-ups/${data.callUpId}`, {
        method: 'PATCH',
        body: JSON.stringify({ callUpStatus: data.status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/call-ups`] });
      toast({
        title: "Sucesso",
        description: "Status da convocação atualizado",
      });
    },
  });

  const positions = [
    { value: "all", label: "Todas as Posições" },
    { value: "GK", label: "Goleiro" },
    { value: "DEF", label: "Defensor" },
    { value: "MID", label: "Meio-Campo" },
    { value: "FWD", label: "Atacante" },
  ];

  // Filter athletes
  const filteredAthletes = athletes.filter((athlete: any) => {
    const matchesSearch = 
      athlete.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = selectedPosition === "all" || athlete.position === selectedPosition;
    
    return matchesSearch && matchesPosition;
  });

  // Get called up athlete IDs
  const calledUpAthleteIds = callUps.map(callUp => callUp.athleteId);

  // Available athletes (not called up)
  const availableAthletes = filteredAthletes.filter(
    (athlete: any) => !calledUpAthleteIds.includes(athlete.id)
  );

  const handleCallUp = (athleteId: number, position?: string) => {
    callUpMutation.mutate({ athleteId, position });
  };

  const handleRemoveCallUp = (callUpId: number) => {
    removeCallUpMutation.mutate(callUpId);
  };

  const handleUpdateStatus = (callUpId: number, status: string) => {
    updateCallUpMutation.mutate({ callUpId, status });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Confirmado</Badge>;
      case 'declined':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Recusado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  const getPositionLabel = (position: string) => {
    const pos = positions.find(p => p.value === position);
    return pos ? pos.label : position;
  };

  const isGameEditable = gameStatus === 'scheduled';

  return (
    <div className="space-y-6">
      {/* Called Up Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Jogadores Convocados ({callUps.length})</span>
            {isGameEditable && (
              <Badge variant="outline" className="text-blue-600">
                Editável
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {callUps.length === 0 ? (
            <div className="text-center py-8 text-fluent-text-secondary">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum jogador convocado ainda</p>
              <p className="text-sm">Comece selecionando jogadores abaixo</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {callUps.map((callUp: any) => {
                const athlete = athletes.find((a: any) => a.id === callUp.athleteId);
                if (!athlete) return null;

                return (
                  <div key={callUp.id} className="border border-fluent-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{athlete.firstName} {athlete.lastName}</h4>
                        <p className="text-sm text-fluent-text-secondary">
                          #{athlete.jerseyNumber} • {getPositionLabel(athlete.position)}
                        </p>
                      </div>
                      {isGameEditable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCallUp(callUp.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {getStatusBadge(callUp.callUpStatus)}
                      
                      {isGameEditable && callUp.callUpStatus === 'called' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(callUp.id, 'confirmed')}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(callUp.id, 'declined')}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Recusar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Players */}
      {isGameEditable && (
        <Card>
          <CardHeader>
            <CardTitle>Jogadores Disponíveis</CardTitle>
            <div className="flex space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar jogadores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.value} value={position.value}>
                      {position.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {availableAthletes.length === 0 ? (
              <div className="text-center py-8 text-fluent-text-secondary">
                <p>Nenhum jogador disponível com os filtros selecionados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableAthletes.map((athlete: any) => (
                  <div key={athlete.id} className="border border-fluent-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{athlete.firstName} {athlete.lastName}</h4>
                        <p className="text-sm text-fluent-text-secondary">
                          #{athlete.jerseyNumber} • {getPositionLabel(athlete.position)}
                        </p>
                        <p className="text-xs text-fluent-text-secondary">
                          {athlete.category}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCallUp(athlete.id, athlete.position)}
                        disabled={callUpMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Convocar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Call-up Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Convocação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-fluent-blue">{callUps.length}</div>
              <p className="text-sm text-fluent-text-secondary">Total Convocados</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {callUps.filter(c => c.callUpStatus === 'confirmed').length}
              </div>
              <p className="text-sm text-fluent-text-secondary">Confirmados</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {callUps.filter(c => c.callUpStatus === 'called').length}
              </div>
              <p className="text-sm text-fluent-text-secondary">Pendentes</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {callUps.filter(c => c.callUpStatus === 'declined').length}
              </div>
              <p className="text-sm text-fluent-text-secondary">Recusados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}