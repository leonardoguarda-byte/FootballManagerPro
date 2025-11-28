import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, Shirt, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GameLineupManagerProps {
  gameId: string;
  lineup: any[];
  formation: any;
  callUps: any[];
  gameStatus: string;
}

export function GameLineupManager({ gameId, lineup, formation, callUps, gameStatus }: GameLineupManagerProps) {
  const [selectedFormation, setSelectedFormation] = useState(formation?.formation || "4-4-2");
  const [draggedPlayer, setDraggedPlayer] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch athletes data for lineup
  const { data: athletes = [] } = useQuery({
    queryKey: ['/api/athletes'],
  });

  // Available formations
  const formations = [
    { value: "4-4-2", label: "4-4-2", positions: 11 },
    { value: "4-3-3", label: "4-3-3", positions: 11 },
    { value: "3-5-2", label: "3-5-2", positions: 11 },
    { value: "4-2-3-1", label: "4-2-3-1", positions: 11 },
    { value: "4-5-1", label: "4-5-1", positions: 11 },
    { value: "5-3-2", label: "5-3-2", positions: 11 },
  ];

  // Formation positions mapping
  const getFormationPositions = (formation: string) => {
    const positions: { [key: string]: { x: number; y: number; position: string }[] } = {
      "4-4-2": [
        { x: 10, y: 50, position: "GK" },  // Goalkeeper
        { x: 25, y: 20, position: "LB" },  // Left Back
        { x: 25, y: 40, position: "CB" },  // Center Back
        { x: 25, y: 60, position: "CB" },  // Center Back
        { x: 25, y: 80, position: "RB" },  // Right Back
        { x: 50, y: 20, position: "LM" },  // Left Midfielder
        { x: 50, y: 40, position: "CM" },  // Center Midfielder
        { x: 50, y: 60, position: "CM" },  // Center Midfielder
        { x: 50, y: 80, position: "RM" },  // Right Midfielder
        { x: 75, y: 35, position: "ST" },  // Striker
        { x: 75, y: 65, position: "ST" },  // Striker
      ],
      "4-3-3": [
        { x: 10, y: 50, position: "GK" },
        { x: 25, y: 20, position: "LB" },
        { x: 25, y: 40, position: "CB" },
        { x: 25, y: 60, position: "CB" },
        { x: 25, y: 80, position: "RB" },
        { x: 50, y: 30, position: "CM" },
        { x: 50, y: 50, position: "CM" },
        { x: 50, y: 70, position: "CM" },
        { x: 75, y: 20, position: "LW" },
        { x: 75, y: 50, position: "ST" },
        { x: 75, y: 80, position: "RW" },
      ],
      "3-5-2": [
        { x: 10, y: 50, position: "GK" },
        { x: 25, y: 30, position: "CB" },
        { x: 25, y: 50, position: "CB" },
        { x: 25, y: 70, position: "CB" },
        { x: 50, y: 15, position: "LWB" },
        { x: 50, y: 35, position: "CM" },
        { x: 50, y: 50, position: "CM" },
        { x: 50, y: 65, position: "CM" },
        { x: 50, y: 85, position: "RWB" },
        { x: 75, y: 40, position: "ST" },
        { x: 75, y: 60, position: "ST" },
      ],
    };
    return positions[formation] || positions["4-4-2"];
  };

  // Save formation mutation
  const saveFormationMutation = useMutation({
    mutationFn: async (formationData: { formation: string }) => {
      return apiRequest(`/api/games/${gameId}/formation`, {
        method: 'POST',
        body: JSON.stringify(formationData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/formation`] });
      toast({
        title: "Sucesso",
        description: "Formação salva com sucesso",
      });
    },
  });

  // Add to lineup mutation
  const addToLineupMutation = useMutation({
    mutationFn: async (data: { athleteId: number; position: string; isStarter: boolean; formationX?: number; formationY?: number; jerseyNumber?: number }) => {
      return apiRequest(`/api/games/${gameId}/lineup`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/lineup`] });
      toast({
        title: "Sucesso",
        description: "Jogador adicionado à escalação",
      });
    },
  });

  // Remove from lineup mutation
  const removeFromLineupMutation = useMutation({
    mutationFn: async (lineupId: number) => {
      return apiRequest(`/api/games/${gameId}/lineup/${lineupId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/lineup`] });
      toast({
        title: "Sucesso",
        description: "Jogador removido da escalação",
      });
    },
  });

  // Get called up athletes (exclude only declined)
  const calledUpAthletes = callUps
    .filter(callUp => callUp.callUpStatus !== 'declined')
    .map(callUp => athletes.find((athlete: any) => athlete.id === callUp.athleteId))
    .filter(Boolean);

  // Get lineup athletes IDs
  const lineupAthleteIds = lineup.map(l => l.athleteId);

  // Available athletes for lineup (called up but not in lineup)
  const availableAthletes = calledUpAthletes.filter(
    (athlete: any) => !lineupAthleteIds.includes(athlete.id)
  );

  // Starters and bench
  const starters = lineup.filter(l => l.isStarter);
  const bench = lineup.filter(l => !l.isStarter);

  const handleFormationChange = (newFormation: string) => {
    setSelectedFormation(newFormation);
    saveFormationMutation.mutate({ formation: newFormation });
  };

  const handleAddToLineup = (athleteId: number, isStarter: boolean, position?: string, x?: number, y?: number) => {
    const athlete = athletes.find((a: any) => a.id === athleteId);
    addToLineupMutation.mutate({
      athleteId,
      position: position || athlete?.position || "SUB",
      isStarter,
      formationX: x,
      formationY: y,
      jerseyNumber: athlete?.jerseyNumber,
    });
  };

  const handleRemoveFromLineup = (lineupId: number) => {
    removeFromLineupMutation.mutate(lineupId);
  };

  const handleDragStart = (athlete: any) => {
    setDraggedPlayer(athlete);
  };

  const handleDrop = (x: number, y: number, position: string) => {
    if (draggedPlayer) {
      handleAddToLineup(draggedPlayer.id, true, position, x, y);
      setDraggedPlayer(null);
    }
  };

  const isGameEditable = gameStatus === 'scheduled';

  return (
    <div className="space-y-6">
      {/* Formation Selector */}
      {isGameEditable && (
        <Card>
          <CardHeader>
            <CardTitle>Formação Tática</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Select value={selectedFormation} onValueChange={handleFormationChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formations.map((form) => (
                    <SelectItem key={form.value} value={form.value}>
                      {form.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline">
                {starters.length}/11 titulares
              </Badge>
              <Badge variant="secondary">
                {bench.length} reservas
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="formation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="formation">
            <Target className="h-4 w-4 mr-2" />
            Formação
          </TabsTrigger>
          <TabsTrigger value="starters">
            <Shirt className="h-4 w-4 mr-2" />
            Titulares
          </TabsTrigger>
          <TabsTrigger value="bench">
            <Bench className="h-4 w-4 mr-2" />
            Banco
          </TabsTrigger>
        </TabsList>

        {/* Formation View */}
        <TabsContent value="formation">
          <Card>
            <CardHeader>
              <CardTitle>Campo de Jogo - {selectedFormation}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-96 bg-green-100 border-2 border-white rounded-lg overflow-hidden"
                   style={{ backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 60\"><rect fill=\"%2322c55e\" width=\"100\" height=\"60\"/><rect fill=\"none\" stroke=\"white\" stroke-width=\"0.2\" x=\"0\" y=\"0\" width=\"100\" height=\"60\"/><rect fill=\"none\" stroke=\"white\" stroke-width=\"0.2\" x=\"0\" y=\"18\" width=\"16\" height=\"24\"/><rect fill=\"none\" stroke=\"white\" stroke-width=\"0.2\" x=\"0\" y=\"24\" width=\"6\" height=\"12\"/><rect fill=\"none\" stroke=\"white\" stroke-width=\"0.2\" x=\"84\" y=\"18\" width=\"16\" height=\"24\"/><rect fill=\"none\" stroke=\"white\" stroke-width=\"0.2\" x=\"94\" y=\"24\" width=\"6\" height=\"12\"/><circle fill=\"none\" stroke=\"white\" stroke-width=\"0.2\" cx=\"50\" cy=\"30\" r=\"10\"/><line stroke=\"white\" stroke-width=\"0.2\" x1=\"50\" y1=\"0\" x2=\"50\" y2=\"60\"/></svg>')" }}>
                
                {/* Formation Positions */}
                {getFormationPositions(selectedFormation).map((pos, index) => {
                  const playerInPosition = starters.find(s => 
                    Math.abs((s.formationX || 0) - pos.x) < 5 && 
                    Math.abs((s.formationY || 0) - pos.y) < 5
                  );
                  
                  const athlete = playerInPosition ? 
                    athletes.find((a: any) => a.id === playerInPosition.athleteId) : null;

                  return (
                    <div
                      key={index}
                      className="absolute w-12 h-12 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:bg-blue-700 transition-colors"
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(pos.x, pos.y, pos.position)}
                      title={pos.position}
                    >
                      {athlete ? (
                        <div className="text-center">
                          <div className="text-xs font-bold">
                            {athlete.jerseyNumber || '?'}
                          </div>
                          <div className="text-xs leading-none">
                            {athlete.firstName.charAt(0)}{athlete.lastName.charAt(0)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-xs">{pos.position}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Available Players for Formation */}
              {isGameEditable && availableAthletes.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Jogadores Disponíveis (Arraste para o campo)</h4>
                  <div className="flex flex-wrap gap-2">
                    {availableAthletes.map((athlete: any) => (
                      <div
                        key={athlete.id}
                        draggable
                        onDragStart={() => handleDragStart(athlete)}
                        className="bg-white border border-fluent-border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow"
                      >
                        <div className="text-sm font-medium">
                          #{athlete.jerseyNumber} {athlete.firstName} {athlete.lastName}
                        </div>
                        <div className="text-xs text-fluent-text-secondary">
                          {athlete.position}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Starters List */}
        <TabsContent value="starters">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Jogadores Titulares ({starters.length}/11)</span>
                {starters.length !== 11 && (
                  <Badge variant="destructive">Escalação Incompleta</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {starters.length === 0 ? (
                <div className="text-center py-8 text-fluent-text-secondary">
                  <Shirt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum titular definido</p>
                  <p className="text-sm">Use a formação para adicionar jogadores</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {starters.map((starter: any) => {
                    const athlete = athletes.find((a: any) => a.id === starter.athleteId);
                    if (!athlete) return null;

                    return (
                      <div key={starter.id} className="border border-fluent-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">
                              #{athlete.jerseyNumber} {athlete.firstName} {athlete.lastName}
                            </h4>
                            <p className="text-sm text-fluent-text-secondary">
                              {starter.position}
                            </p>
                          </div>
                          {isGameEditable && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveFromLineup(starter.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remover
                            </Button>
                          )}
                        </div>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Titular
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bench List */}
        <TabsContent value="bench">
          <Card>
            <CardHeader>
              <CardTitle>Banco de Reservas ({bench.length})</CardTitle>
              {isGameEditable && (
                <div className="flex flex-wrap gap-2">
                  {availableAthletes.map((athlete: any) => (
                    <Button
                      key={athlete.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddToLineup(athlete.id, false)}
                    >
                      + {athlete.firstName} {athlete.lastName}
                    </Button>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {bench.length === 0 ? (
                <div className="text-center py-8 text-fluent-text-secondary">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum reserva definido</p>
                  <p className="text-sm">Adicione jogadores ao banco de reservas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bench.map((benchPlayer: any) => {
                    const athlete = athletes.find((a: any) => a.id === benchPlayer.athleteId);
                    if (!athlete) return null;

                    return (
                      <div key={benchPlayer.id} className="border border-fluent-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">
                              #{athlete.jerseyNumber} {athlete.firstName} {athlete.lastName}
                            </h4>
                            <p className="text-sm text-fluent-text-secondary">
                              {athlete.position}
                            </p>
                          </div>
                          {isGameEditable && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveFromLineup(benchPlayer.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remover
                            </Button>
                          )}
                        </div>
                        <Badge variant="secondary">
                          Reserva
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}