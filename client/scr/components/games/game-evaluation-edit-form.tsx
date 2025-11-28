import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GameEvaluationEditFormProps {
  evaluation: any;
  gameId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GameEvaluationEditForm({ evaluation, gameId, onClose, onSuccess }: GameEvaluationEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const safeRating = (value: any): number => {
    if (value === null || value === undefined) return 5;
    const num = Number(value);
    return isNaN(num) ? 5 : num;
  };

  const [evaluationData, setEvaluationData] = useState({
    overallRating: safeRating(evaluation.overallRating),
    technicalRating: safeRating(evaluation.technicalRating),
    physicalRating: safeRating(evaluation.physicalRating),
    tacticalRating: safeRating(evaluation.tacticalRating),
    mentalRating: safeRating(evaluation.mentalRating),
    goals: evaluation.goals || 0,
    assists: evaluation.assists || 0,
    missedPasses: evaluation.missedPasses || 0,
    ballSteals: evaluation.ballSteals || 0,
    yellowCards: evaluation.yellowCards || 0,
    redCards: evaluation.redCards || 0,
    notes: evaluation.notes || ""
  });

  const updateEvaluation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/game-evaluations/${evaluation.id}`, "PUT", data);
    },
    onSuccess: (updatedEvaluation) => {
      // Invalidate all evaluation-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/game-evaluations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/game-evaluations/${gameId}/by-evaluator`] });
      queryClient.invalidateQueries({ queryKey: [`/api/game-evaluations/${gameId}/average`] });
      
      toast({
        title: "Sucesso",
        description: "Avaliação atualizada com sucesso!",
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar avaliação.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEvaluation.mutate(evaluationData);
  };

  const handleRatingChange = (field: string, value: number[]) => {
    setEvaluationData(prev => ({
      ...prev,
      [field]: value[0]
    }));
  };

  const handleTextChange = (field: string, value: string | number) => {
    setEvaluationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
            <Star className="w-5 h-5" />
            Editar Avaliação de Desempenho
          </CardTitle>
          <p className="text-sm text-fluent-text-secondary">
            Editando avaliação do atleta
          </p>
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

      {/* Statistics Section */}
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

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={updateEvaluation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={updateEvaluation.isPending}
          className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
        >
          {updateEvaluation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
}