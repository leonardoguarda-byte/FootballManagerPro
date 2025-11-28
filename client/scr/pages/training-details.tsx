import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Users, ArrowLeft, Plus, Star, Edit2 } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import TrainingAttendanceForm from "@/components/training/training-attendance-form";
import { getTrainingTypeLabel } from "@/lib/trainingTypeLabels";

// Stage Drills Component
function StageDrills({ stageId }: { stageId: number }) {
  const { data: stageDrills, isLoading } = useQuery({
    queryKey: ["/api/training-stage-drills", stageId],
    queryFn: async () => {
      const response = await fetch(`/api/training-stage-drills/${stageId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch stage drills");
      return response.json();
    },
    enabled: !!stageId,
  });

  const { data: allDrills } = useQuery({
    queryKey: ["/api/training-drills"],
  });

  if (isLoading) {
    return <div className="text-sm text-fluent-text-secondary">Carregando exercícios...</div>;
  }

  if (!stageDrills || stageDrills.length === 0) {
    return (
      <div className="text-sm text-fluent-text-secondary italic">
        Nenhum exercício definido para esta etapa.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h5 className="font-medium text-sm text-fluent-text-secondary mb-3">Exercícios:</h5>
      <div className="grid gap-3">
        {stageDrills.map((stageDrill: any) => {
          const drill = allDrills?.find((d: any) => d.id === stageDrill.drillId);
          return (
            <div key={stageDrill.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h6 className="font-medium text-fluent-text">
                    {drill?.name || "Exercício não encontrado"}
                  </h6>
                  {drill?.description && (
                    <p className="text-sm text-fluent-text-secondary mt-1">
                      {drill.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-fluent-text-secondary">
                    {drill?.type && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {drill.type === 'technical' ? 'Técnico' :
                         drill.type === 'physical' ? 'Físico' :
                         drill.type === 'tactical' ? 'Tático' :
                         drill.type === 'psychological' ? 'Psicológico' : drill.type}
                      </span>
                    )}
                    {drill?.category && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                        {drill.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {stageDrill.notes && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-sm text-fluent-text-secondary">
                    <span className="font-medium">Notas:</span> {stageDrill.notes}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Training Report Component
function TrainingReportContent({ sessionId }: { sessionId: string }) {
  const { toast } = useToast();
  const [editingEvaluation, setEditingEvaluation] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEditEvaluation = (evaluation: any) => {
    setEditingEvaluation(evaluation);
    setIsEditDialogOpen(true);
  };

  const updateEvaluationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/training-evaluations/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Avaliação atualizada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training-reports", sessionId] });
      setIsEditDialogOpen(false);
      setEditingEvaluation(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar avaliação",
        variant: "destructive",
      });
    },
  });
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["/api/training-reports", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/training-reports/${sessionId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch report");
      return response.json();
    },
    enabled: !!sessionId,
  });

  if (reportLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">Carregando relatório...</div>
        </CardContent>
      </Card>
    );
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-fluent-text-secondary">
            Nenhum dado disponível para este treino
          </div>
        </CardContent>
      </Card>
    );
  }

  const { session, attendance, evaluations } = reportData;
  const attendanceArray = Array.isArray(attendance) ? attendance : [];
  const evaluationsArray = Array.isArray(evaluations) ? evaluations : [];
  
  // Calculate attendance from evaluations if attendance array is empty
  let totalAthletes = attendanceArray.length;
  let presentAthletes = attendanceArray.filter((a: any) => a.present);
  let absentAthletes = attendanceArray.filter((a: any) => !a.present);
  
  // If no attendance data, calculate from evaluations
  if (attendanceArray.length === 0 && evaluationsArray.length > 0) {
    totalAthletes = evaluationsArray.length;
    presentAthletes = evaluationsArray.filter((e: any) => e.attendance === true);
    absentAthletes = evaluationsArray.filter((e: any) => e.attendance === false);
  } else if (attendanceArray.length > 0) {
    // Use attendance data as is
    totalAthletes = attendanceArray.length;
    presentAthletes = attendanceArray.filter((a: any) => a.present);
    absentAthletes = attendanceArray.filter((a: any) => !a.present);
  }

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Informações do Treino
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-medium">Título</div>
              <div className="text-fluent-text-secondary">{session.title}</div>
            </div>
            <div>
              <div className="font-medium">Categoria</div>
              <div className="text-fluent-text-secondary">{session.category}</div>
            </div>
            <div>
              <div className="font-medium">Data</div>
              <div className="text-fluent-text-secondary">{new Date(session.date).toLocaleDateString('pt-BR')}</div>
            </div>
            <div>
              <div className="font-medium">Horário</div>
              <div className="text-fluent-text-secondary">{session.startTime} - {session.endTime}</div>
            </div>
            <div>
              <div className="font-medium">Local</div>
              <div className="text-fluent-text-secondary">{session.location}</div>
            </div>
            <div>
              <div className="font-medium">Tipo</div>
              <div className="text-fluent-text-secondary">{getTrainingTypeLabel(session.type)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Resumo de Presença
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalAthletes}</div>
              <div className="text-sm text-blue-800">Total de Atletas</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{presentAthletes.length}</div>
              <div className="text-sm text-green-800">Presentes</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{absentAthletes.length}</div>
              <div className="text-sm text-red-800">Ausentes</div>
            </div>
          </div>

          {/* Present Athletes */}
          {presentAthletes.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-green-600 mb-2">Atletas Presentes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {presentAthletes.map((athlete: any) => (
                  <div key={athlete.athleteId} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{athlete.firstName} {athlete.lastName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Absent Athletes */}
          {absentAthletes.length > 0 && (
            <div>
              <h4 className="font-medium text-red-600 mb-2">Atletas Ausentes</h4>
              <div className="space-y-2">
                {absentAthletes.map((athlete: any) => (
                  <div key={athlete.athleteId} className="p-2 bg-red-50 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>{athlete.firstName} {athlete.lastName}</span>
                    </div>
                    {athlete.justification && (
                      <div className="text-sm text-red-700 mt-1 ml-4">
                        Justificativa: {athlete.justification}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evaluations */}
      {evaluationsArray.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Avaliações dos Atletas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {evaluationsArray.map((evaluation: any) => (
                <div key={evaluation.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{evaluation.firstName} {evaluation.lastName}</h4>
                      <div className="text-sm text-fluent-text-secondary">
                        Posição: {evaluation.position}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-fluent-blue">
                          {evaluation.averageScore?.toFixed(1)}/10
                        </div>
                        <div className="text-sm text-fluent-text-secondary">Média Geral</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditEvaluation(evaluation)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-sm font-medium">Técnica</div>
                      <div className="text-lg font-bold text-fluent-blue">{evaluation.technicalScore}/10</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-sm font-medium">Físico</div>
                      <div className="text-lg font-bold text-fluent-blue">{evaluation.physicalScore}/10</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-sm font-medium">Tático</div>
                      <div className="text-lg font-bold text-fluent-blue">{evaluation.tacticalScore}/10</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-sm font-medium">Mental</div>
                      <div className="text-lg font-bold text-fluent-blue">{evaluation.mentalScore}/10</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-sm font-medium">Disciplina</div>
                      <div className="text-lg font-bold text-fluent-blue">{evaluation.disciplineScore}/10</div>
                    </div>
                  </div>
                  
                  {evaluation.notes && (
                    <div className="mt-3 p-3 bg-blue-50 rounded">
                      <div className="text-sm font-medium mb-1">Observações:</div>
                      <div className="text-sm text-fluent-text-secondary">{evaluation.notes}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Evaluation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Avaliação - {editingEvaluation?.firstName} {editingEvaluation?.lastName}</DialogTitle>
          </DialogHeader>
          {editingEvaluation && (
            <EditEvaluationForm
              evaluation={editingEvaluation}
              onSave={(data) => updateEvaluationMutation.mutate(data)}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateEvaluationMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Evaluation Form Component
function EditEvaluationForm({ evaluation, onSave, onCancel, isLoading }: {
  evaluation: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [scores, setScores] = useState({
    technicalRating: evaluation.technicalRating || 5,
    physicalRating: evaluation.physicalRating || 5,
    tacticalRating: evaluation.tacticalRating || 5,
    mentalRating: evaluation.mentalRating || 5,
    disciplineRating: evaluation.disciplineRating || 5,
    notes: evaluation.notes || "",
    strengths: evaluation.strengths || "",
    improvements: evaluation.improvements || "",
    attendance: evaluation.attendance !== false,
    justification: evaluation.justification || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...evaluation,
      ...scores,
    });
  };

  const RatingInput = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm text-fluent-text-secondary">{value}/10</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
          <Button
            key={rating}
            type="button"
            variant="outline"
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
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <RatingInput
          label="Habilidade Técnica"
          value={scores.technicalRating}
          onChange={(value) => setScores({ ...scores, technicalRating: value })}
        />
        <RatingInput
          label="Condição Física"
          value={scores.physicalRating}
          onChange={(value) => setScores({ ...scores, physicalRating: value })}
        />
        <RatingInput
          label="Entendimento Tático"
          value={scores.tacticalRating}
          onChange={(value) => setScores({ ...scores, tacticalRating: value })}
        />
        <RatingInput
          label="Aspecto Mental"
          value={scores.mentalRating}
          onChange={(value) => setScores({ ...scores, mentalRating: value })}
        />
        <RatingInput
          label="Disciplina"
          value={scores.disciplineRating}
          onChange={(value) => setScores({ ...scores, disciplineRating: value })}
        />
      </div>

      {/* Attendance Section */}
      <div className="space-y-3">
        <label className="text-sm font-medium block">Status de Presença</label>
        <div className="flex gap-3">
          <Button
            type="button"
            variant={scores.attendance ? "default" : "outline"}
            size="sm"
            className={scores.attendance ? "bg-green-600 hover:bg-green-700" : ""}
            onClick={() => setScores({ ...scores, attendance: true, justification: "" })}
          >
            Presente
          </Button>
          <Button
            type="button"
            variant={!scores.attendance ? "default" : "outline"}
            size="sm"
            className={!scores.attendance ? "bg-red-600 hover:bg-red-700" : ""}
            onClick={() => setScores({ ...scores, attendance: false })}
          >
            Ausente
          </Button>
        </div>
        {!scores.attendance && (
          <div>
            <label className="text-sm font-medium mb-2 block">Justificativa da Ausência</label>
            <textarea
              value={scores.justification}
              onChange={(e) => setScores({ ...scores, justification: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={3}
              placeholder="Digite o motivo da ausência..."
            />
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Pontos Fortes</label>
        <textarea
          value={scores.strengths}
          onChange={(e) => setScores({ ...scores, strengths: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-md resize-none"
          rows={3}
          placeholder="Destaque os pontos fortes do atleta no treino..."
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Pontos a Melhorar</label>
        <textarea
          value={scores.improvements}
          onChange={(e) => setScores({ ...scores, improvements: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-md resize-none"
          rows={3}
          placeholder="Indique áreas que precisam de melhoria..."
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Observações Gerais</label>
        <textarea
          value={scores.notes}
          onChange={(e) => setScores({ ...scores, notes: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-md resize-none"
          rows={4}
          placeholder="Observações gerais sobre o desempenho do atleta..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
}

export default function TrainingDetails() {
  const { id } = useParams();
  const { toast } = useToast();
  const [isEvaluationFormOpen, setIsEvaluationFormOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/training-sessions", id],
    queryFn: async () => {
      const response = await fetch(`/api/training-sessions/${id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch session");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: evaluations, isLoading: evaluationsLoading } = useQuery({
    queryKey: ["/api/training-evaluations", id],
    queryFn: async () => {
      const response = await fetch(`/api/training-evaluations?sessionId=${id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch evaluations");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: athletes } = useQuery({
    queryKey: ["/api/athletes"],
  });

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ["/api/training-stages", id],
    queryFn: async () => {
      const response = await fetch(`/api/training-stages/${id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch stages");
      return response.json();
    },
    enabled: !!id,
  });

  const handleEditEvaluation = (evaluation: any) => {
    setEditingEvaluation(evaluation);
    setIsEditDialogOpen(true);
  };

  const updateEvaluationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/training-evaluations/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Avaliação atualizada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training-evaluations", id] });
      setIsEditDialogOpen(false);
      setEditingEvaluation(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar avaliação",
        variant: "destructive",
      });
    },
  });

  const getTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      "physical": "bg-red-100 text-red-800",
      "technical": "bg-blue-100 text-blue-800",
      "tactical": "bg-green-100 text-green-800",
      "mental": "bg-purple-100 text-purple-800",
      "psychological": "bg-orange-100 text-orange-800",
      "physical-tactical": "bg-teal-100 text-teal-800",
      "physical-technical": "bg-cyan-100 text-cyan-800",
      "technical-tactical": "bg-indigo-100 text-indigo-800",
    };
    
    return (
      <Badge variant="default" className={typeColors[type] || "bg-gray-100 text-gray-800"}>
        {getTrainingTypeLabel(type)}
      </Badge>
    );
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fluent-text">Carregando detalhes do treino...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <div className="text-fluent-text-secondary">Treino não encontrado</div>
        <Link href="/training">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Treinos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/training">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-fluent-text">{session.title}</h1>
            <div className="flex items-center space-x-2 mt-1">
              {getTypeBadge(session.type)}
              <Badge variant="outline">{session.category}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Training Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Treino</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center text-fluent-text-secondary">
                <Calendar className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-medium">Data</div>
                  <div>{new Date(session.date).toLocaleDateString("pt-BR", {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</div>
                </div>
              </div>
              <div className="flex items-center text-fluent-text-secondary">
                <Clock className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-medium">Horário</div>
                  <div>{session.startTime} - {session.endTime}</div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center text-fluent-text-secondary">
                <MapPin className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-medium">Local</div>
                  <div>{session.location}</div>
                </div>
              </div>
              <div className="flex items-center text-fluent-text-secondary">
                <Users className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-medium">Categoria</div>
                  <div>{session.category}</div>
                </div>
              </div>
            </div>
          </div>
          {session.description && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="font-medium mb-2">Descrição</div>
              <p className="text-fluent-text-secondary">{session.description}</p>
            </div>
          )}
          {session.photos && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="font-medium mb-2">Fotos do Treino</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {JSON.parse(session.photos).map((photo: string, index: number) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Foto do treino ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Evaluations */}
      <Tabs defaultValue="structure" className="w-full">
        <TabsList>
          <TabsTrigger value="structure">Estrutura do Treino</TabsTrigger>
          <TabsTrigger value="evaluations">Avaliações dos Atletas</TabsTrigger>
          <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
          <TabsTrigger value="report">Relatório do Treino</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Etapas e Exercícios</CardTitle>
            </CardHeader>
            <CardContent>
              {stagesLoading ? (
                <div className="text-center py-8 text-fluent-text-secondary">
                  Carregando estrutura do treino...
                </div>
              ) : stages && stages.length > 0 ? (
                <div className="space-y-6">
                  {stages.map((stage: any, index: number) => (
                    <div key={stage.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">
                            Etapa {index + 1}: {stage.name}
                          </h4>
                          <p className="text-sm text-fluent-text-secondary">
                            Duração: {stage.duration} minutos
                          </p>
                        </div>
                      </div>
                      
                      <StageDrills stageId={stage.id} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-fluent-text-secondary">
                  Este treino não possui etapas definidas.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="evaluations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Avaliações dos Atletas</h3>
            <Dialog open={isEvaluationFormOpen} onOpenChange={setIsEvaluationFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Avaliação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Adicionar Avaliação do Atleta</DialogTitle>
                </DialogHeader>
                <TrainingAttendanceForm 
                  sessionId={parseInt(id!)} 
                  onClose={() => setIsEvaluationFormOpen(false)}
                  session={session}
                />
              </DialogContent>
            </Dialog>
          </div>

          {evaluationsLoading ? (
            <div className="text-center py-8 text-fluent-text-secondary">
              Carregando avaliações...
            </div>
          ) : evaluations && evaluations.length > 0 ? (
            <div className="grid gap-4">
              {evaluations.map((evaluation: any) => {
                const athlete = athletes?.find((a: any) => a.id === evaluation.athleteId);
                return (
                  <Card key={evaluation.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-fluent-text">
                            {athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Atleta não encontrado'}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <div className="text-sm text-fluent-text-secondary">Performance Técnica</div>
                              <div className="text-lg font-bold text-fluent-text">{evaluation.technicalRating}/10</div>
                            </div>
                            <div>
                              <div className="text-sm text-fluent-text-secondary">Performance Física</div>
                              <div className="text-lg font-bold text-fluent-text">{evaluation.physicalRating}/10</div>
                            </div>
                            <div>
                              <div className="text-sm text-fluent-text-secondary">Performance Tática</div>
                              <div className="text-lg font-bold text-fluent-text">{evaluation.tacticalRating}/10</div>
                            </div>
                            <div>
                              <div className="text-sm text-fluent-text-secondary">Performance Mental</div>
                              <div className="text-lg font-bold text-fluent-text">{evaluation.mentalRating}/10</div>
                            </div>
                          </div>
                          {evaluation.notes && (
                            <div className="mt-4">
                              <div className="text-sm text-fluent-text-secondary mb-1">Observações</div>
                              <p className="text-sm text-fluent-text">{evaluation.notes}</p>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEvaluation(evaluation)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-fluent-text-secondary">
                  Nenhuma avaliação registrada para este treino.
                  <br />
                  Clique em "Nova Avaliação" para começar.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas do Treino</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-fluent-text-secondary">
                Estatísticas detalhadas serão implementadas aqui
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <TrainingReportContent sessionId={id} />
        </TabsContent>
      </Tabs>

      {/* Edit Evaluation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Avaliação</DialogTitle>
          </DialogHeader>
          {editingEvaluation && (
            <EditEvaluationForm
              evaluation={editingEvaluation}
              onSave={(data) => updateEvaluationMutation.mutate(data)}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateEvaluationMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}