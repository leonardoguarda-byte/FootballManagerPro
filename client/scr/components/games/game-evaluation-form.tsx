import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface GameEvaluationFormProps {
  gameId: number;
  onClose: () => void;
}

export default function GameEvaluationForm({ gameId, onClose }: GameEvaluationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [evaluationData, setEvaluationData] = useState({
    overallRating: 5,
    technicalRating: 5,
    physicalRating: 5,
    tacticalRating: 5,
    mentalRating: 5,
    goals: 0,
    assists: 0,
    missedPasses: 0,
    ballSteals: 0,
    yellowCards: 0,
    redCards: 0,
    notes: ""
  });

  // Fetch athletes for selection
  const { data: athletes = [] } = useQuery({
    queryKey: ["/api/athletes"],
  });

  // Fetch existing evaluations for this game
  const { data: existingEvaluations = [] } = useQuery({
    queryKey: [`/api/game-evaluations?gameId=${gameId}`],
  });

  const createEvaluation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/game-evaluations", "POST", data);
    },
    onSuccess: () => {
      // Invalidate all evaluation-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/game-evaluations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/game-evaluations/${gameId}/by-evaluator`] });
      queryClient.invalidateQueries({ queryKey: [`/api/game-evaluations/${gameId}/average`] });
      toast({
        title: "Sucesso",
        description: "Avaliação criada com sucesso!",
      });
      onClose();
      // Reset form
      setSelectedAthlete("");
      setEvaluationData({
        overallRating: 5,
        technicalRating: 5,
        physicalRating: 5,
        tacticalRating: 5,
        mentalRating: 5,
        goals: 0,
        assists: 0,
        missedPasses: 0,
        ballSteals: 0,
        yellowCards: 0,
        redCards: 0,
        notes: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao criar avaliação.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthlete) {
      toast({
        title: "Erro",
        description: "Selecione um atleta para avaliar.",
        variant: "destructive",
      });
      return;
    }

    createEvaluation.mutate({
      gameId: parseInt(gameId.toString()),
      athleteId: parseInt(selectedAthlete),
      ...evaluationData,
    });
  };

  const handleRatingChange = (field: string, value: number[]) => {
    setEvaluationData(prev => ({
      ...prev,
      [field]: value[0]
    }));
  };

  const handleTextChange = (field: string, value: string) => {
    setEvaluationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const alreadyEvaluated = selectedAthlete && existingEvaluations.some(
    (evaluation: any) => evaluation.athleteId === parseInt(selectedAthlete)
  );

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return "Excelente";
    if (rating >= 4) return "Muito Bom";
    if (rating >= 3) return "Bom";
    if (rating >= 2) return "Regular";
    return "Precisa Melhorar";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Nova Avaliação de Jogo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="athlete">Atleta *</Label>
            <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o atleta" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((athlete: any) => {
                  const isEvaluated = existingEvaluations.some(
                    (evaluation: any) => evaluation.athleteId === athlete.id
                  );
                  return (
                    <SelectItem key={athlete.id} value={athlete.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{athlete.firstName} {athlete.lastName}</span>
                        {isEvaluated && (
                          <Badge variant="secondary" className="ml-2">
                            Avaliado
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {alreadyEvaluated && (
              <p className="text-sm text-orange-600 mt-1">
                Este atleta já foi avaliado neste jogo.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedAthlete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Avaliação de Desempenho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Rating */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Nota Geral</Label>
                <div className="flex items-center space-x-2">
                  <span className={`font-bold ${getRatingColor(evaluationData.overallRating)}`}>
                    {evaluationData.overallRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-fluent-text-secondary">
                    {getRatingLabel(evaluationData.overallRating)}
                  </span>
                </div>
              </div>
              <Slider
                value={[evaluationData.overallRating]}
                onValueChange={(value) => handleRatingChange("overallRating", value)}
                max={5}
                min={1}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Technical Rating */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Técnica</Label>
                <span className={`font-bold ${getRatingColor(evaluationData.technicalRating)}`}>
                  {evaluationData.technicalRating.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[evaluationData.technicalRating]}
                onValueChange={(value) => handleRatingChange("technicalRating", value)}
                max={5}
                min={1}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Physical Rating */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Física</Label>
                <span className={`font-bold ${getRatingColor(evaluationData.physicalRating)}`}>
                  {evaluationData.physicalRating.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[evaluationData.physicalRating]}
                onValueChange={(value) => handleRatingChange("physicalRating", value)}
                max={5}
                min={1}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Tactical Rating */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tática</Label>
                <span className={`font-bold ${getRatingColor(evaluationData.tacticalRating)}`}>
                  {evaluationData.tacticalRating.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[evaluationData.tacticalRating]}
                onValueChange={(value) => handleRatingChange("tacticalRating", value)}
                max={5}
                min={1}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Mental Rating */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mental</Label>
                <span className={`font-bold ${getRatingColor(evaluationData.mentalRating)}`}>
                  {evaluationData.mentalRating.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[evaluationData.mentalRating]}
                onValueChange={(value) => handleRatingChange("mentalRating", value)}
                max={5}
                min={1}
                step={0.1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {selectedAthlete && (
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas do Jogo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goals">Gols</Label>
                <Input
                  id="goals"
                  type="number"
                  min="0"
                  value={evaluationData.goals}
                  onChange={(e) => setEvaluationData({ ...evaluationData, goals: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="assists">Assistências</Label>
                <Input
                  id="assists"
                  type="number"
                  min="0"
                  value={evaluationData.assists}
                  onChange={(e) => setEvaluationData({ ...evaluationData, assists: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="missedPasses">Passes Errados</Label>
                <Input
                  id="missedPasses"
                  type="number"
                  min="0"
                  value={evaluationData.missedPasses}
                  onChange={(e) => setEvaluationData({ ...evaluationData, missedPasses: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ballSteals">Roubadas de Bola</Label>
                <Input
                  id="ballSteals"
                  type="number"
                  min="0"
                  value={evaluationData.ballSteals}
                  onChange={(e) => setEvaluationData({ ...evaluationData, ballSteals: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yellowCards">Cartões Amarelos</Label>
                <Input
                  id="yellowCards"
                  type="number"
                  min="0"
                  value={evaluationData.yellowCards}
                  onChange={(e) => setEvaluationData({ ...evaluationData, yellowCards: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="redCards">Cartões Vermelhos</Label>
                <Input
                  id="redCards"
                  type="number"
                  min="0"
                  value={evaluationData.redCards}
                  onChange={(e) => setEvaluationData({ ...evaluationData, redCards: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedAthlete && (
        <Card>
          <CardHeader>
            <CardTitle>Observações Detalhadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes">Observações Gerais</Label>
              <Textarea
                id="notes"
                value={evaluationData.notes}
                onChange={(e) => handleTextChange("notes", e.target.value)}
                placeholder="Adicione observações sobre o desempenho do atleta no jogo..."
                className="min-h-24"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={createEvaluation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={createEvaluation.isPending || !selectedAthlete || alreadyEvaluated}
          className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
        >
          {createEvaluation.isPending ? "Salvando..." : "Salvar Avaliação"}
        </Button>
      </div>
    </form>
  );
}