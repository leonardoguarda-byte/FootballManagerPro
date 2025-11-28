import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Trophy, Target, Activity, AlertCircle } from "lucide-react";

interface TrainingEvaluationFormProps {
  sessionId: number;
  onClose: () => void;
  session?: any;
}

export default function TrainingEvaluationForm({ sessionId, onClose }: TrainingEvaluationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [evaluationData, setEvaluationData] = useState({
    technicalRating: 5,
    physicalRating: 5,
    tacticalRating: 5,
    individualRating: 5,
    notes: ""
  });

  // Fetch athletes for selection
  const { data: athletes = [] } = useQuery({
    queryKey: ["/api/athletes"],
  });

  // Fetch existing evaluations for this session
  const { data: existingEvaluations = [] } = useQuery({
    queryKey: ["/api/training-evaluations", sessionId],
    queryFn: () => apiRequest(`/api/training-evaluations?sessionId=${sessionId}`),
  });

  const createEvaluation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/training-evaluations", "POST", {
        trainingSessionId: sessionId,
        athleteId: parseInt(selectedAthlete),
        attendance: true, // Default to true for evaluations
        technicalRating: data.technicalRating,
        physicalRating: data.physicalRating,
        tacticalRating: data.tacticalRating,
        individualRating: data.individualRating,
        notes: data.notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-evaluations"] });
      toast({
        title: "Avaliação criada",
        description: "A avaliação do atleta foi salva com sucesso."
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a avaliação.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthlete) {
      toast({
        title: "Erro",
        description: "Selecione um atleta para avaliar.",
        variant: "destructive"
      });
      return;
    }
    createEvaluation.mutate(evaluationData);
  };

  const handleRatingChange = (field: string, value: number) => {
    setEvaluationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTextChange = (field: string, value: string) => {
    setEvaluationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const RatingInput = ({ label, value, onChange, icon: Icon }: any) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </Label>
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
          <Button
            key={rating}
            type="button"
            variant={value >= rating ? "default" : "outline"}
            size="sm"
            className={`w-8 h-8 p-0 ${
              value >= rating 
                ? "bg-fluent-blue text-white" 
                : "hover:bg-fluent-blue hover:text-white"
            }`}
            onClick={() => onChange(rating)}
          >
            {rating}
          </Button>
        ))}
      </div>
      <div className="text-xs text-fluent-text-secondary">
        Nota: {value}/10
      </div>
    </div>
  );

  // Check if athlete already has evaluation
  const alreadyEvaluated = existingEvaluations.some(
    (evaluation: any) => evaluation.athleteId === parseInt(selectedAthlete)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Nova Avaliação de Treino
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
              <div className="flex items-center gap-2 mt-2 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Este atleta já foi avaliado neste treino.</span>
              </div>
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
            <RatingInput
              label="Habilidades Técnicas"
              value={evaluationData.technicalRating}
              onChange={(value: number) => handleRatingChange("technicalRating", value)}
              icon={Trophy}
            />

            <Separator />

            <RatingInput
              label="Condição Física"
              value={evaluationData.physicalRating}
              onChange={(value: number) => handleRatingChange("physicalRating", value)}
              icon={Activity}
            />

            <Separator />

            <RatingInput
              label="Entendimento Tático"
              value={evaluationData.tacticalRating}
              onChange={(value: number) => handleRatingChange("tacticalRating", value)}
              icon={Target}
            />

            <Separator />

            <RatingInput
              label="Avaliação Individual"
              value={evaluationData.individualRating}
              onChange={(value: number) => handleRatingChange("individualRating", value)}
              icon={Star}
            />
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
                placeholder="Adicione observações adicionais sobre o desempenho..."
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
          disabled={createEvaluation.isPending || !selectedAthlete}
          className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
        >
          {createEvaluation.isPending ? "Salvando..." : "Salvar Avaliação"}
        </Button>
      </div>
    </form>
  );
}