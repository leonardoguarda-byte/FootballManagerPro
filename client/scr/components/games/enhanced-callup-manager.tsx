import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus, UserMinus, Star, Users, Target, PlayCircle, StopCircle, Crown, Shirt, Check, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EnhancedCallUpManagerProps {
  gameId: string | number;
  callUps: any[];
  gameStatus: string;
  athletes?: any[];
  game: any;
}

export function EnhancedCallUpManager({ gameId, callUps, gameStatus, athletes, game }: EnhancedCallUpManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [selectedFormation, setSelectedFormation] = useState("4-4-2");
  const [starters, setStarters] = useState<any[]>([]);
  const [bench, setBench] = useState<any[]>([]);
  const [captain, setCaptain] = useState<number | null>(null);
  const [positionToAssign, setPositionToAssign] = useState<string | null>(null);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
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

  // Filter athletes by game category
  const eligibleAthletes = athletes?.filter(athlete => {
    // Map game categories to athlete categories
    if (!game?.category || !athlete?.category) return true; // If no category info, show all
    
    // Convert game category to comparable format (remove hyphens, lowercase)
    const gameCategory = game.category.toLowerCase().replace('-', '');
    
    // Handle athlete.category as array (new format) or string (old format)
    const athleteCategories = Array.isArray(athlete.category) 
      ? athlete.category 
      : [athlete.category];
    
    // Check if game category matches any of the athlete's categories
    return athleteCategories.some(cat => 
      cat.toLowerCase().replace('-', '') === gameCategory
    );
  }) || [];

  // Athletes are now passed as props

  // Formation configurations with exact Brazilian tactical positions
  const formations = {
    "3-5-2": { 
      positions: ["GK", "ZAG", "ZAG", "ZAG", "CDM", "CDM", "LM", "RM", "CAM", "ATA", "ATA"],
      layout: [
        ["GK"],
        ["ZAG", "ZAG", "ZAG"],
        ["CDM", "CDM"],
        ["LM", "RM"],
        ["CAM"],
        ["ATA", "ATA"]
      ]
    },
    "3-4-3": { 
      positions: ["GK", "ZAG", "ZAG", "ZAG", "CDM", "LM", "RM", "MEI", "LW", "ATA", "RW"],
      layout: [
        ["GK"],
        ["ZAG", "ZAG", "ZAG"],
        ["CDM"],
        ["LM", "RM"],
        ["MEI"],
        ["LW", "ATA", "RW"]
      ]
    },
    "4-1-4-1": { 
      positions: ["GK", "LB", "ZAG", "ZAG", "RB", "CDM", "LM", "MC", "MC", "RM", "ATA"],
      layout: [
        ["GK"],
        ["LB", "ZAG", "ZAG", "RB"],
        ["CDM"],
        ["LM", "MC", "MC", "RM"],
        ["ATA"]
      ]
    },
    "4-1-2-3": { 
      positions: ["GK", "LB", "ZAG", "ZAG", "RB", "CDM", "MC", "MC", "LW", "ATA", "RW"],
      layout: [
        ["GK"],
        ["LB", "ZAG", "ZAG", "RB"],
        ["CDM"],
        ["MC", "MC"],
        ["LW", "ATA", "RW"]
      ]
    },
    "4-2-3-1": { 
      positions: ["GK", "LB", "ZAG", "ZAG", "RB", "CDM", "CDM", "LM", "CAM", "RM", "ATA"],
      layout: [
        ["GK"],
        ["LB", "ZAG", "ZAG", "RB"],
        ["CDM", "CDM"],
        ["LM", "RM"],
        ["CAM"],
        ["ATA"]
      ]
    },
    "4-2-1-3": { 
      positions: ["GK", "LB", "ZAG", "ZAG", "RB", "CDM", "MC", "MC", "LW", "ATA", "RW"],
      layout: [
        ["GK"],
        ["LB", "ZAG", "ZAG", "RB"],
        ["CDM"],
        ["MC", "MC"],
        ["LW", "ATA", "RW"]
      ]
    },
    "4-2-4": { 
      positions: ["GK", "LB", "ZAG", "ZAG", "RB", "CDM", "CDM", "LW", "RW", "ATA", "ATA"],
      layout: [
        ["GK"],
        ["LB", "ZAG", "ZAG", "RB"],
        ["CDM", "CDM"],
        ["LW", "RW"],
        ["ATA", "ATA"]
      ]
    },
    "4-3-3": { 
      positions: ["GK", "LB", "ZAG", "ZAG", "RB", "CDM", "MC", "MC", "LW", "ATA", "RW"],
      layout: [
        ["GK"],
        ["LB", "ZAG", "ZAG", "RB"],
        ["CDM"],
        ["MC", "MC"],
        ["LW", "ATA", "RW"]
      ]
    },
    "4-4-2": { 
      positions: ["GK", "LB", "ZAG", "ZAG", "RB", "LM", "MC", "MC", "RM", "ATA", "ATA"],
      layout: [
        ["GK"],
        ["LB", "ZAG", "ZAG", "RB"],
        ["LM", "RM"],
        ["MC", "MC"],
        ["ATA", "ATA"]
      ]
    },
    "4-4-2 Diamond": { 
      positions: ["GK", "LB", "ZAG", "ZAG", "RB", "CDM", "LM", "RM", "CAM", "ATA", "ATA"],
      layout: [
        ["GK"],
        ["LB", "ZAG", "ZAG", "RB"],
        ["CDM"],
        ["LM", "RM"],
        ["CAM"],
        ["ATA", "ATA"]
      ]
    },
    "5-3-2": { 
      positions: ["GK", "LWB", "ZAG", "ZAG", "ZAG", "RWB", "CDM", "MC", "MC", "ATA", "ATA"],
      layout: [
        ["GK"],
        ["LWB", "ZAG", "ZAG", "ZAG", "RWB"],
        ["CDM"],
        ["MC", "MC"],
        ["ATA", "ATA"]
      ]
    },
    "5-2-3": { 
      positions: ["GK", "LWB", "ZAG", "ZAG", "ZAG", "RWB", "CDM", "CDM", "LW", "ATA", "RW"],
      layout: [
        ["GK"],
        ["LWB", "ZAG", "ZAG", "ZAG", "RWB"],
        ["CDM", "CDM"],
        ["LW", "ATA", "RW"]
      ]
    }
  };

  const positions = [
    { value: "all", label: "Todas as Posições" },
    { value: "GK", label: "Goleiro (GK)" },
    { value: "CB", label: "Zagueiro Central (CB)" },
    { value: "ZAG", label: "Zagueiro (ZAG)" },
    { value: "LB", label: "Lateral Esquerdo (LB)" },
    { value: "RB", label: "Lateral Direito (RB)" },
    { value: "LWB", label: "Ala Esquerdo (LWB)" },
    { value: "RWB", label: "Ala Direito (RWB)" },
    { value: "CDM", label: "Volante (CDM)" },
    { value: "CM", label: "Meio-campista Central (CM)" },
    { value: "MC", label: "Meio-Campo (MC)" },
    { value: "LM", label: "Meia Esquerda (LM)" },
    { value: "RM", label: "Meia Direita (RM)" },
    { value: "CAM", label: "Meia Atacante (CAM)" },
    { value: "MEI", label: "Meia (MEI)" },
    { value: "LW", label: "Ponta Esquerda (LW)" },
    { value: "RW", label: "Ponta Direita (RW)" },
    { value: "ST", label: "Atacante (ST)" },
    { value: "ATA", label: "Atacante (ATA)" },
    { value: "goleiro", label: "Goleiro (antigo)" },
    { value: "zagueiro", label: "Zagueiro (antigo)" },
    { value: "lateral", label: "Lateral (antigo)" },
    { value: "volante", label: "Volante (antigo)" },
    { value: "meio-campo", label: "Meio-campo (antigo)" },
    { value: "atacante", label: "Atacante (antigo)" },
    { value: "ponta", label: "Ponta (antigo)" },
  ];

  // Call up athlete mutation
  const callUpMutation = useMutation({
    mutationFn: async (data: { athleteId: number; position?: string }) => {
      return apiRequest(`/api/games/${gameId}/call-ups`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/call-ups`] });
      toast({
        title: "Sucesso",
        description: "Atleta convocado com sucesso",
      });
    },
    onError: () => {
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
      return apiRequest(`/api/games/${gameId}/call-ups/${callUpId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/call-ups`] });
      toast({
        title: "Sucesso",
        description: "Convocação removida com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover convocação",
        variant: "destructive",
      });
    },
  });

  // Update callup status mutation
  const updateCallUpMutation = useMutation({
    mutationFn: async (data: { callUpId: number; status: string; isStarter?: boolean }) => {
      return apiRequest(`/api/games/${gameId}/call-ups/${data.callUpId}`, 'PATCH', {
        callUpStatus: data.status,
        isStarter: data.isStarter
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

  // Update lineup mutation
  const updateLineupMutation = useMutation({
    mutationFn: async (data: { callUpId: number; isStarter: boolean; position?: string }) => {
      return apiRequest(`/api/games/${gameId}/call-ups/${data.callUpId}`, 'PATCH', {
        isStarter: data.isStarter,
        position: data.position
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/call-ups`] });
      toast({
        title: "Sucesso",
        description: "Escalação atualizada",
      });
    },
  });

  // Toggle captain mutation
  const toggleCaptainMutation = useMutation({
    mutationFn: async (athleteId: number) => {
      return apiRequest(`/api/games/${gameId}/toggle-captain`, 'POST', { athleteId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/call-ups`] });
      toast({
        title: "Sucesso",
        description: "Capitão atualizado",
      });
    },
  });

  // Filter available athletes (from eligible athletes matching the game category)
  const availableAthletes = eligibleAthletes.filter((athlete: any) => {
    const isAlreadyCalledUp = (callUps || []).some((callUp: any) => callUp.athleteId === athlete.id);
    const matchesSearch = athlete.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         athlete.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = selectedPosition === "all" || athlete.position === selectedPosition;
    
    return !isAlreadyCalledUp && matchesSearch && matchesPosition;
  });

  // Only show confirmed call-ups (all call-ups are auto-confirmed now)
  const availableCallUps = (callUps || []).filter(callUp => callUp.callUpStatus !== 'declined');

  // Handle position click to assign players
  const handlePositionClick = (position: string) => {
    const availableStarterPlayers = availableCallUps.filter(callUp => 
      callUp.isStarter && !starters.some(starter => starter.position === position)
    );
    
    if (availableStarterPlayers.length === 0) {
      toast({
        title: "Nenhum jogador disponível",
        description: "Não há jogadores titulares disponíveis para esta posição",
        variant: "destructive",
      });
      return;
    }
    
    setPositionToAssign(position);
    setShowPlayerSelection(true);
  };

  // Assign player to position
  const assignPlayerToPosition = (playerId: number) => {
    if (!positionToAssign) return;
    
    const newStarters = [...starters];
    const existingIndex = newStarters.findIndex(s => s.position === positionToAssign);
    const playerCallUp = availableCallUps.find(callUp => callUp.athleteId === playerId && callUp.isStarter);
    
    if (!playerCallUp) return;
    
    const newPlayer = { ...playerCallUp, position: positionToAssign };
    
    if (existingIndex >= 0) {
      newStarters[existingIndex] = newPlayer;
    } else {
      newStarters.push(newPlayer);
    }
    
    setStarters(newStarters);
    setShowPlayerSelection(false);
    setPositionToAssign(null);
    
    toast({
      title: "Posição atribuída",
      description: `Jogador escalado na posição ${positionToAssign}`,
    });
  };

  const moveToStarters = (callUp: any) => {
    if (starters.length >= 11) {
      toast({
        title: "Limite atingido",
        description: "Time titular já possui 11 jogadores",
        variant: "destructive",
      });
      return;
    }
    updateLineupMutation.mutate({ callUpId: callUp.id, isStarter: true });
  };

  const moveToBench = (callUp: any) => {
    updateLineupMutation.mutate({ callUpId: callUp.id, isStarter: false });
  };

  const PlayerCard = ({ player, showActions = true, showLineupActions = false, isStarter = false }: any) => {
    // Find the athlete data from the athletes array
    const athlete = athletes?.find((a: any) => a.id === player.athleteId);
    
    return (
      <Card className="mb-2">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {athlete?.firstName?.charAt(0)}{athlete?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {athlete?.firstName} {athlete?.lastName}
                  </span>
                  {captain === player.athleteId && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Badge variant="outline" className="text-xs">
                    {player.position || athlete?.position || 'N/A'}
                  </Badge>
                  <span>#{athlete?.number || 'S/N'}</span>
                </div>
              </div>
            </div>
            
            {showActions && (
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeCallUpMutation.mutate(player.id)}
                  className="text-red-600 hover:bg-red-50"
                  title="Remover jogador"
                  data-testid={`button-remove-callup-${player.id}`}
                  disabled={gameStatus !== 'scheduled'}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {showLineupActions && (
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleCaptainMutation.mutate(player.athleteId)}
                  className={captain === player.athleteId ? "text-yellow-600 hover:bg-yellow-50" : "hover:bg-gray-50"}
                  title={captain === player.athleteId ? "Remover capitão" : "Definir como capitão"}
                  data-testid={`button-toggle-captain-${player.id}`}
                  disabled={gameStatus !== 'scheduled'}
                >
                  <Crown className="h-4 w-4" />
                </Button>
                {isStarter ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => moveToBench(player)}
                    className="hover:bg-orange-50"
                    title="Mover para o banco"
                    data-testid={`button-move-to-bench-${player.id}`}
                    disabled={gameStatus !== 'scheduled'}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => moveToStarters(player)}
                    className="hover:bg-green-50"
                    title="Colocar como titular"
                    data-testid={`button-move-to-starters-${player.id}`}
                    disabled={gameStatus !== 'scheduled' || starters.length >= 11}
                  >
                    <Shirt className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="squad" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="squad">Elenco</TabsTrigger>
          <TabsTrigger value="formation">Formação</TabsTrigger>
          <TabsTrigger value="lineup">Escalação</TabsTrigger>
          <TabsTrigger value="add">Adicionar</TabsTrigger>
        </TabsList>

        <TabsContent value="squad" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Jogadores Convocados ({callUps.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {availableCallUps.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum jogador convocado. Use a aba "Adicionar" para convocar jogadores.
                  </p>
                ) : (
                  availableCallUps.map(callUp => (
                    <PlayerCard key={callUp.id} player={callUp} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="formation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Configuração Tática
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Formação</Label>
                <Select value={selectedFormation} onValueChange={setSelectedFormation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(formations).map(formation => (
                      <SelectItem key={formation} value={formation}>
                        {formation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Formation Visualization - Vertical Field */}
              <div className="flex justify-center">
                <div className="bg-gradient-to-b from-green-400 to-green-500 border-2 border-white rounded-lg p-4 relative overflow-hidden w-80 h-96">
                  <div className="text-center text-sm text-white mb-2 font-semibold">
                    Campo - {selectedFormation}
                  </div>
                  
                  {/* Vertical Soccer field lines */}
                  <div className="absolute inset-3 border-2 border-white border-opacity-60 rounded-lg">
                    {/* Center line - horizontal */}
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white bg-opacity-60"></div>
                    {/* Center circle */}
                    <div className="absolute top-1/2 left-1/2 w-10 h-10 border-2 border-white border-opacity-60 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                    {/* Penalty areas - top and bottom */}
                    <div className="absolute left-1/2 top-0 w-16 h-10 border-2 border-t-0 border-white border-opacity-60 transform -translate-x-1/2"></div>
                    <div className="absolute left-1/2 bottom-0 w-16 h-10 border-2 border-b-0 border-white border-opacity-60 transform -translate-x-1/2"></div>
                    {/* Goal areas */}
                    <div className="absolute left-1/2 top-0 w-10 h-5 border-2 border-t-0 border-white border-opacity-60 transform -translate-x-1/2"></div>
                    <div className="absolute left-1/2 bottom-0 w-10 h-5 border-2 border-b-0 border-white border-opacity-60 transform -translate-x-1/2"></div>
                  </div>
                  
                  {/* Formation positions - properly spaced vertical arrangement */}
                  <div className="relative w-full h-80 mt-6">
                    {selectedFormation && formations[selectedFormation] && (
                      <div className="w-full h-full relative">
                        {formations[selectedFormation].layout.map((line, lineIndex) => {
                          // Calculate position from bottom (defensive) to top (attacking)
                          const totalLines = formations[selectedFormation].layout.length;
                          const positionFromBottom = totalLines - 1 - lineIndex;
                          const topPosition = 5 + (positionFromBottom / (totalLines - 1)) * 75;
                          
                          return (
                            <div 
                              key={lineIndex} 
                              className="absolute flex justify-center items-center w-full"
                              style={{ 
                                top: `${topPosition}%`,
                                left: '50%',
                                transform: 'translateX(-50%)'
                              }}
                            >
                              <div className="flex justify-center items-center w-full relative">
                                {line.map((position, posIndex) => {
                                  // Calculate proper positioning based on position type
                                  const positionsInLine = line.length;
                                  let leftPosition = 50; // Default center
                                  
                                  // Define central positions that should stay centered
                                  const centralPositions = ['GK', 'CDM', 'MC', 'CAM', 'ATA', 'MEI', 'ZAG'];
                                  const widePositions = ['LB', 'RB', 'LM', 'RM', 'LW', 'RW', 'LWB', 'RWB'];
                                  
                                  if (positionsInLine === 1) {
                                    leftPosition = 50; // Always center for single position
                                  } else if (positionsInLine === 2) {
                                    // Check if both are central positions (like CDM pair)
                                    if (centralPositions.includes(position)) {
                                      leftPosition = posIndex === 0 ? 40 : 60; // Close together for central positions
                                    } else {
                                      leftPosition = posIndex === 0 ? 25 : 75; // Wide spread for non-central
                                    }
                                  } else if (positionsInLine === 3) {
                                    if (posIndex === 0) leftPosition = 20; // Left wide
                                    else if (posIndex === 1) leftPosition = 50; // Center
                                    else leftPosition = 80; // Right wide
                                  } else if (positionsInLine === 4) {
                                    // For 4 positions (like defense line)
                                    if (posIndex === 0) leftPosition = 15; // Left back wide
                                    else if (posIndex === 1) leftPosition = 35; // Left center back
                                    else if (posIndex === 2) leftPosition = 65; // Right center back  
                                    else leftPosition = 85; // Right back wide
                                  } else if (positionsInLine === 5) {
                                    // For 5 positions (like 3-5-2 defense)
                                    leftPosition = 10 + (posIndex * 20); // Evenly spread
                                  }
                                  const positionKey = `${lineIndex}-${posIndex}`;
                                  const assignedPlayer = starters.find(p => p.position === position);
                                  const athlete = assignedPlayer ? athletes?.find((a: any) => a.id === assignedPlayer.athleteId) : null;
                                  
                                  return (
                                    <div key={positionKey} className="absolute flex flex-col items-center" style={{ left: `${leftPosition}%`, transform: 'translateX(-50%)' }}>
                                      <div 
                                        className={`w-10 h-10 border-2 border-white rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg transition-all cursor-pointer ${
                                          assignedPlayer 
                                            ? 'bg-blue-600 hover:bg-blue-700' 
                                            : 'bg-gray-500 hover:bg-gray-600 hover:scale-105'
                                        }`}
                                        onClick={() => handlePositionClick(position)}
                                        title={assignedPlayer ? `${athlete?.firstName} ${athlete?.lastName}` : `Clique para escalar jogador na posição ${position}`}
                                      >
                                        {assignedPlayer ? (
                                          <div className="text-center">
                                            <div className="text-xs">{athlete?.firstName?.charAt(0)}{athlete?.lastName?.charAt(0)}</div>
                                            <div className="text-xs">#{athlete?.number || '?'}</div>
                                          </div>
                                        ) : (
                                          <div className="text-center text-xs">{position}</div>
                                        )}
                                      </div>
                                      <span className="text-xs mt-1 text-white font-medium">{position}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lineup" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Titular */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <Shirt className="h-5 w-5 mr-2" />
                  Time Titular ({starters.length}/11)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {starters.map(starter => (
                    <PlayerCard 
                      key={starter.id} 
                      player={starter} 
                      showActions={false}
                      showLineupActions={true}
                      isStarter={true}
                    />
                  ))}
                  {starters.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      Nenhum jogador escalado como titular
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Banco de Reservas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-700">
                  <Users className="h-5 w-5 mr-2" />
                  Banco de Reservas ({bench.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bench.map(benchPlayer => (
                    <PlayerCard 
                      key={benchPlayer.id} 
                      player={benchPlayer} 
                      showActions={false}
                      showLineupActions={true}
                      isStarter={false}
                    />
                  ))}
                  {bench.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      Nenhum jogador no banco
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="h-5 w-5 mr-2" />
                Adicionar Jogadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search and filters */}
                <div className="flex space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar atleta..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(position => (
                        <SelectItem key={position.value} value={position.value}>
                          {position.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Available athletes */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableAthletes.map(athlete => (
                    <Card key={athlete.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gray-100">
                              {athlete.firstName?.charAt(0)}{athlete.lastName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {athlete.firstName} {athlete.lastName}
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Badge variant="outline" className="text-xs">
                                {athlete.position || 'N/A'}
                              </Badge>
                              <span>#{athlete.number || 'S/N'}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => callUpMutation.mutate({ 
                            athleteId: athlete.id, 
                            position: athlete.position 
                          })}
                          disabled={callUpMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Convocar
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {availableAthletes.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      Nenhum atleta disponível
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Player Selection Dialog */}
      <Dialog open={showPlayerSelection} onOpenChange={setShowPlayerSelection}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escalar jogador para {positionToAssign}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availableCallUps
              .filter(callUp => callUp.isStarter)
              .map(callUp => {
                const athlete = athletes?.find((a: any) => a.id === callUp.athleteId);
                if (!athlete) return null;
                
                return (
                  <div key={callUp.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {athlete.firstName?.charAt(0)}{athlete.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {athlete.firstName} {athlete.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          #{athlete.number || 'S/N'} • {athlete.position || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => assignPlayerToPosition(athlete.id)}
                    >
                      Escalar
                    </Button>
                  </div>
                );
              })
            }
            {availableCallUps.filter(callUp => callUp.isStarter).length === 0 && (
              <p className="text-center text-gray-500 py-4">
                Nenhum jogador titular disponível
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}