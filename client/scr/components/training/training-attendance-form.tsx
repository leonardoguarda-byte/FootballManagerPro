import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Trophy, Target, Activity, AlertCircle, UserCheck, UserX, Users } from "lucide-react";

interface TrainingAttendanceFormProps {
  sessionId: number;
  onClose: () => void;
  session?: any;
}

export default function TrainingAttendanceForm({ sessionId, onClose, session }: TrainingAttendanceFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [attendanceData, setAttendanceData] = useState<Record<string, { present: boolean; justification: string }>>({});
  const [evaluationData, setEvaluationData] = useState<{
    technicalSkills: number;
    physicalCondition: number;
    tacticalUnderstanding: number;
    attitude: number;
    teamwork: number;
    notes: string;
    improvements: string;
    strengths: string;
    attendance: boolean;
    justification: string;
  }>({
    technicalSkills: 5,
    physicalCondition: 5,
    tacticalUnderstanding: 5,
    attitude: 5,
    teamwork: 5,
    notes: "",
    improvements: "",
    strengths: "",
    attendance: true,
    justification: ""
  });

  // Fetch teams to get athletes by category
  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const response = await fetch("/api/teams", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch teams");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch all athletes directly and filter by category from training session
  const { data: allAthletes = [] } = useQuery({
    queryKey: ["/api/athletes"],
    queryFn: async () => {
      const response = await fetch("/api/athletes", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch athletes");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // For now, show all athletes until we implement proper team-athlete relationships
  // TODO: Filter by training category when team relationships are properly set up
  const categoryAthletes = Array.isArray(allAthletes) ? allAthletes : [];

  // Fetch existing evaluations for this session
  const { data: existingEvaluations = [] } = useQuery({
    queryKey: ["/api/training-evaluations", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/training-evaluations?sessionId=${sessionId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch evaluations");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const createEvaluation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/training-evaluations", "POST", {
        trainingSessionId: sessionId,
        athleteId: parseInt(selectedAthlete),
        attendance: data.attendance !== false, // Default to true unless explicitly set to false
        technicalRating: data.technicalSkills,
        physicalRating: data.physicalCondition,
        tacticalRating: data.tacticalUnderstanding,
        mentalRating: data.attitude,
        disciplineRating: data.teamwork,
        notes: data.notes || "",
        strengths: data.strengths || "",
        improvements: data.improvements || "",
        justification: data.justification || "",
        evaluationDate: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-evaluations"] });
      toast({
        title: "Avaliação criada",
        description: "A avaliação do atleta foi salva com sucesso."
      });
      setSelectedAthlete("");
      setEvaluationData({
        technicalSkills: 5,
        physicalCondition: 5,
        tacticalUnderstanding: 5,
        attitude: 5,
        teamwork: 5,
        notes: "",
        improvements: "",
        strengths: ""
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a avaliação.",
        variant: "destructive"
      });
    }
  });

  const saveAttendance = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/training-attendance", "POST", {
        sessionId: sessionId,
        attendanceData: data,
        recordedBy: user?.id
      });
    },
    onSuccess: () => {
      toast({
        title: "Lista de presença salva",
        description: "A lista de presença foi registrada com sucesso."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a lista de presença.",
        variant: "destructive"
      });
    }
  });

  const handleEvaluationSubmit = (e: React.FormEvent) => {
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

  const handleAttendanceSubmit = () => {
    saveAttendance.mutate(attendanceData);
  };

  const handleRatingChange = (field: string, value: number | boolean) => {
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

  const handleAttendanceChange = (athleteId: string, present: boolean, justification: string = "") => {
    setAttendanceData(prev => ({
      ...prev,
      [athleteId]: { present, justification }
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

  const presentCount = Object.values(attendanceData).filter((a: any) => a.present === true).length;
  const absentCount = Object.values(attendanceData).filter((a: any) => a.present === false).length;

  return (
    <Tabs defaultValue="attendance" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="attendance" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Lista de Presença
        </TabsTrigger>
        <TabsTrigger value="evaluation" className="flex items-center gap-2">
          <Star className="w-4 h-4" />
          Avaliações
        </TabsTrigger>
      </TabsList>

      <TabsContent value="attendance" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Lista de Presença - {session?.category || "Categoria do Treino"}
            </CardTitle>
            {Object.keys(attendanceData).length > 0 && (
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <UserCheck className="w-4 h-4" />
                  Presentes: {presentCount}
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <UserX className="w-4 h-4" />
                  Ausentes: {absentCount}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryAthletes.length === 0 ? (
              <div className="text-center py-8 text-fluent-text-secondary">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum atleta encontrado para a categoria "{session?.category}"</p>
                <p className="text-sm mt-2">Verifique se existem atletas cadastrados nesta categoria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryAthletes.map((athlete: any) => {
                  const attendance = attendanceData[athlete.id] || { present: true, justification: "" };
                  
                  return (
                    <div key={athlete.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {athlete.firstName} {athlete.lastName}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={attendance.present ? "default" : "outline"}
                            size="sm"
                            className={attendance.present ? "bg-green-600 hover:bg-green-700" : ""}
                            onClick={() => handleAttendanceChange(athlete.id, true, "")}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Presente
                          </Button>
                          <Button
                            type="button"
                            variant={!attendance.present ? "default" : "outline"}
                            size="sm"
                            className={!attendance.present ? "bg-red-600 hover:bg-red-700" : ""}
                            onClick={() => handleAttendanceChange(athlete.id, false, attendance.justification)}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Ausente
                          </Button>
                        </div>
                      </div>
                      
                      {!attendance.present && (
                        <div>
                          <Label htmlFor={`justification-${athlete.id}`}>Justificativa da Ausência</Label>
                          <Textarea
                            id={`justification-${athlete.id}`}
                            value={attendance.justification}
                            onChange={(e) => handleAttendanceChange(athlete.id, false, e.target.value)}
                            placeholder="Digite o motivo da ausência..."
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {categoryAthletes.length > 0 && (
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleAttendanceSubmit}
                  disabled={saveAttendance.isPending}
                  className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
                >
                  {saveAttendance.isPending ? "Salvando..." : "Salvar Lista de Presença"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="evaluation" className="space-y-4">
        <form onSubmit={handleEvaluationSubmit} className="space-y-6">
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
                    {categoryAthletes.map((athlete: any) => {
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
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Avaliação de Desempenho
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Attendance Field */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Presença no Treino
                    </Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={evaluationData.attendance !== false ? "default" : "outline"}
                        size="sm"
                        className={evaluationData.attendance !== false ? "bg-green-600 hover:bg-green-700" : ""}
                        onClick={() => handleRatingChange("attendance", true)}
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        Presente
                      </Button>
                      <Button
                        type="button"
                        variant={evaluationData.attendance === false ? "default" : "outline"}
                        size="sm"
                        className={evaluationData.attendance === false ? "bg-red-600 hover:bg-red-700" : ""}
                        onClick={() => handleRatingChange("attendance", false)}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Ausente
                      </Button>
                    </div>
                    {evaluationData.attendance === false && (
                      <div>
                        <Label htmlFor="justification">Justificativa da Ausência</Label>
                        <Textarea
                          id="justification"
                          value={evaluationData.justification || ""}
                          onChange={(e) => handleTextChange("justification", e.target.value)}
                          placeholder="Digite o motivo da ausência..."
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />
                  <RatingInput
                    label="Habilidades Técnicas"
                    value={evaluationData.technicalSkills}
                    onChange={(value: number) => handleRatingChange("technicalSkills", value)}
                    icon={Trophy}
                  />

                  <Separator />

                  <RatingInput
                    label="Condição Física"
                    value={evaluationData.physicalCondition}
                    onChange={(value: number) => handleRatingChange("physicalCondition", value)}
                    icon={Activity}
                  />

                  <Separator />

                  <RatingInput
                    label="Entendimento Tático"
                    value={evaluationData.tacticalUnderstanding}
                    onChange={(value: number) => handleRatingChange("tacticalUnderstanding", value)}
                    icon={Target}
                  />

                  <Separator />

                  <RatingInput
                    label="Atitude e Comportamento"
                    value={evaluationData.attitude}
                    onChange={(value: number) => handleRatingChange("attitude", value)}
                    icon={Star}
                  />

                  <Separator />

                  <RatingInput
                    label="Trabalho em Equipe"
                    value={evaluationData.teamwork}
                    onChange={(value: number) => handleRatingChange("teamwork", value)}
                    icon={Trophy}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Observações Detalhadas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="strengths">Pontos Fortes</Label>
                    <Textarea
                      id="strengths"
                      value={evaluationData.strengths}
                      onChange={(e) => handleTextChange("strengths", e.target.value)}
                      placeholder="Descreva os principais pontos fortes observados..."
                      className="min-h-20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="improvements">Pontos de Melhoria</Label>
                    <Textarea
                      id="improvements"
                      value={evaluationData.improvements}
                      onChange={(e) => handleTextChange("improvements", e.target.value)}
                      placeholder="Descreva os aspectos que precisam ser melhorados..."
                      className="min-h-20"
                    />
                  </div>

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
            </>
          )}

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createEvaluation.isPending}
            >
              Fechar
            </Button>
            {selectedAthlete && (
              <Button
                type="submit"
                disabled={createEvaluation.isPending || !selectedAthlete}
                className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
              >
                {createEvaluation.isPending ? "Salvando..." : "Salvar Avaliação"}
              </Button>
            )}
          </div>
        </form>
      </TabsContent>
    </Tabs>
  );
}