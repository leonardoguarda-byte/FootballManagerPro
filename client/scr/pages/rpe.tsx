import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Activity, Calendar, CheckCircle, AlertCircle, UserCheck, UserX, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import type { RpeEntry, TrainingSession, Athlete } from "@shared/schema";

// Type for RPE response statistics
interface AthleteWithResponse extends Athlete {
  responseCount?: number;
  lastResponse?: string;
}

interface DayRpeStats {
  date: string;
  label: string;
  responded: AthleteWithResponse[];
  notResponded: Athlete[];
  respondedCount: number;
  notRespondedCount: number;
}

interface RpeStats {
  today: DayRpeStats;
  yesterday: DayRpeStats;
  dayBeforeYesterday: DayRpeStats;
  totalAthletes: number;
}

export default function RPEPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [selectedResponseType, setSelectedResponseType] = useState<"responded" | "notResponded" | null>(null);
  const [selectedDay, setSelectedDay] = useState<"today" | "yesterday" | "dayBeforeYesterday" | null>(null);

  // Verificar se o usuário é um atleta
  if (!user || user.role?.toLowerCase() !== 'atleta' || !user.athleteId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">RPE - Avaliação Pós-Treino</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Apenas atletas podem preencher o formulário de RPE.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch today's training sessions only for RPE submission
  const { data: trainingSessions, isLoading: loadingSessions} = useQuery<TrainingSession[]>({
    queryKey: ["/api/training-sessions?today=true"],
  });

  // Get today's session (should be only one)
  const todaySession = trainingSessions && trainingSessions.length > 0 ? trainingSessions[0] : null;


  // Fetch RPE response statistics
  const { data: rpeStats, isLoading: loadingStats } = useQuery<RpeStats>({
    queryKey: ["/api/rpe-entries/response-stats"],
  });

  // Submit RPE entry
  const submitRpeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/rpe-entries", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "RPE Submetido",
        description: "Avaliação de esforço percebido registrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rpe-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rpe-entries/response-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao submeter RPE.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitRpe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!todaySession) {
      toast({
        title: "Erro",
        description: "Não há treino agendado para hoje.",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    
    const data = {
      athleteId: user.athleteId!, // Use logged athlete's ID
      trainingSessionId: todaySession.id,
      rpeValue: parseInt(formData.get("rpeScore") as string), // Field name in form is rpeScore
      perceivedExertion: formData.get("perceivedExertion") as string,
      muscularFatigue: parseInt(formData.get("muscularFatigue") as string),
      overallFeeling: formData.get("overallFeeling") as string,
      comments: formData.get("comments") as string || null,
      clubId: user.clubId,
      seasonId: user.seasonId,
    };

    submitRpeMutation.mutate(data);
  };

  const getTrainingSessionBadgeColor = (date: string) => {
    const sessionDate = parseISO(date);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "bg-green-100 text-green-800";
    if (diffDays === 1) return "bg-yellow-100 text-yellow-800";
    if (diffDays <= 3) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  // Fetch existing RPE entries to check for duplicates
  const { data: existingRpeEntries } = useQuery<RpeEntry[]>({
    queryKey: ["/api/rpe-entries"],
  });

  const hasRpeForSession = (sessionId: number) => {
    // Check if there's already an RPE for this specific session
    if (!existingRpeEntries || !user.athleteId) return false;
    return existingRpeEntries.some((entry: any) => 
      entry.athleteId === user.athleteId && entry.trainingSessionId === sessionId
    );
  };

  const openResponseDialog = (type: "responded" | "notResponded", day: "today" | "yesterday" | "dayBeforeYesterday") => {
    setSelectedResponseType(type);
    setSelectedDay(day);
    setShowResponseDialog(true);
  };

  if (loadingSessions || loadingStats) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">RPE - Avaliação Pós-Treino</h1>
          <p className="text-gray-600">Registro de Percepção de Esforço após sessões de treinamento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RPE Submission Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Submeter Nova Avaliação RPE
              </CardTitle>
              <CardDescription>
                Avalie a percepção de esforço imediatamente após o treino
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!todaySession ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum Treino Hoje</h3>
                  <p className="text-gray-500">
                    Não há sessão de treino agendada para hoje. O RPE só pode ser preenchido no dia do treino.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">Treino de Hoje</h3>
                    </div>
                    <p className="text-blue-800">
                      <span className="font-medium">{todaySession.title}</span> - {todaySession.type}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      {todaySession.startTime} às {todaySession.endTime} • {todaySession.location}
                    </p>
                  </div>

                  <form onSubmit={handleSubmitRpe} className="space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rpeScore">Escala RPE (6-20) *</Label>
                    <Input
                      id="rpeScore"
                      name="rpeScore"
                      type="number"
                      min="6"
                      max="20"
                      required
                      placeholder="Ex: 14"
                    />
                    <p className="text-sm text-gray-500">6=Muito Fácil, 20=Máximo</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="muscularFatigue">Fadiga Muscular (1-10) *</Label>
                    <Input
                      id="muscularFatigue"
                      name="muscularFatigue"
                      type="number"
                      min="1"
                      max="10"
                      required
                      placeholder="Ex: 7"
                    />
                    <p className="text-sm text-gray-500">1=Sem fadiga, 10=Exaustão</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="overallFeeling">Sensação Geral *</Label>
                    <Select name="overallFeeling" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Como se sentiu?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excelente">Excelente</SelectItem>
                        <SelectItem value="muito_bom">Muito Bom</SelectItem>
                        <SelectItem value="bom">Bom</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="ruim">Ruim</SelectItem>
                        <SelectItem value="muito_ruim">Muito Ruim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perceivedExertion">Descrição do Esforço Percebido *</Label>
                  <Select name="perceivedExertion" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Descreva o nível de esforço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="muito_leve">Muito Leve</SelectItem>
                      <SelectItem value="leve">Leve</SelectItem>
                      <SelectItem value="moderado">Moderado</SelectItem>
                      <SelectItem value="intenso">Intenso</SelectItem>
                      <SelectItem value="muito_intenso">Muito Intenso</SelectItem>
                      <SelectItem value="maximo">Máximo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comments">Comentários Adicionais</Label>
                  <Textarea
                    id="comments"
                    name="comments"
                    placeholder="Observações sobre o treino, dores, dificuldades..."
                    rows={3}
                  />
                </div>

                {todaySession && hasRpeForSession(todaySession.id) && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Já existe um RPE registrado para você neste treino.
                    </span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full"
                  data-testid="button-submit-rpe"
                  disabled={submitRpeMutation.isPending || (todaySession && hasRpeForSession(todaySession.id))}
                >
                  {submitRpeMutation.isPending ? "Submetendo..." : "Submeter RPE"}
                </Button>
              </form>
              </>
            )}
            </CardContent>
          </Card>
        </div>

        {/* RPE Response Statistics - Separated by Day */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                RPEs Respondidos
              </CardTitle>
              <CardDescription>
                Últimos 3 dias - Clique nos cards para ver detalhes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Today */}
                {rpeStats?.today && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {rpeStats.today.label}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div 
                        className="p-3 border-2 border-green-200 bg-green-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openResponseDialog("responded", "today")}
                        data-testid="card-today-responded"
                      >
                        <div className="text-center">
                          <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                          <div className="text-2xl font-bold text-green-600">
                            {rpeStats.today.respondedCount || 0}
                          </div>
                          <div className="text-xs text-green-700">Responderam</div>
                        </div>
                      </div>
                      <div 
                        className="p-3 border-2 border-red-200 bg-red-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openResponseDialog("notResponded", "today")}
                        data-testid="card-today-not-responded"
                      >
                        <div className="text-center">
                          <UserX className="h-5 w-5 text-red-600 mx-auto mb-1" />
                          <div className="text-2xl font-bold text-red-600">
                            {rpeStats.today.notRespondedCount || 0}
                          </div>
                          <div className="text-xs text-red-700">Não Responderam</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Yesterday */}
                {rpeStats?.yesterday && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {rpeStats.yesterday.label}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div 
                        className="p-3 border-2 border-green-200 bg-green-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openResponseDialog("responded", "yesterday")}
                        data-testid="card-yesterday-responded"
                      >
                        <div className="text-center">
                          <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                          <div className="text-2xl font-bold text-green-600">
                            {rpeStats.yesterday.respondedCount || 0}
                          </div>
                          <div className="text-xs text-green-700">Responderam</div>
                        </div>
                      </div>
                      <div 
                        className="p-3 border-2 border-red-200 bg-red-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openResponseDialog("notResponded", "yesterday")}
                        data-testid="card-yesterday-not-responded"
                      >
                        <div className="text-center">
                          <UserX className="h-5 w-5 text-red-600 mx-auto mb-1" />
                          <div className="text-2xl font-bold text-red-600">
                            {rpeStats.yesterday.notRespondedCount || 0}
                          </div>
                          <div className="text-xs text-red-700">Não Responderam</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Day Before Yesterday */}
                {rpeStats?.dayBeforeYesterday && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {rpeStats.dayBeforeYesterday.label}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div 
                        className="p-3 border-2 border-green-200 bg-green-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openResponseDialog("responded", "dayBeforeYesterday")}
                        data-testid="card-day-before-yesterday-responded"
                      >
                        <div className="text-center">
                          <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                          <div className="text-2xl font-bold text-green-600">
                            {rpeStats.dayBeforeYesterday.respondedCount || 0}
                          </div>
                          <div className="text-xs text-green-700">Responderam</div>
                        </div>
                      </div>
                      <div 
                        className="p-3 border-2 border-red-200 bg-red-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openResponseDialog("notResponded", "dayBeforeYesterday")}
                        data-testid="card-day-before-yesterday-not-responded"
                      >
                        <div className="text-center">
                          <UserX className="h-5 w-5 text-red-600 mx-auto mb-1" />
                          <div className="text-2xl font-bold text-red-600">
                            {rpeStats.dayBeforeYesterday.notRespondedCount || 0}
                          </div>
                          <div className="text-xs text-red-700">Não Responderam</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Total de Atletas</span>
                    </div>
                    <span className="font-semibold" data-testid="count-total">
                      {rpeStats?.totalAthletes || 0}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Response Details Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedResponseType === "responded" ? (
                <>
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Atletas que Responderam RPE - {selectedDay && rpeStats?.[selectedDay]?.label}
                </>
              ) : (
                <>
                  <UserX className="h-5 w-5 text-red-600" />
                  Atletas que Não Responderam RPE - {selectedDay && rpeStats?.[selectedDay]?.label}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {(() => {
              if (!selectedDay || !rpeStats?.[selectedDay]) {
                return (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum dado disponível
                  </p>
                );
              }

              const dayData = rpeStats[selectedDay];
              const athletes = selectedResponseType === "responded" 
                ? dayData.responded 
                : dayData.notResponded;

              if (!athletes || athletes.length === 0) {
                return (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum atleta nesta categoria
                  </p>
                );
              }

              return athletes.map((athlete: any) => (
                selectedResponseType === "responded" ? (
                  <div key={athlete.id} className="p-3 border-2 border-green-200 bg-green-50 rounded-lg" data-testid={`athlete-responded-${athlete.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-green-900">
                            {athlete.firstName} {athlete.lastName}
                          </p>
                          <p className="text-xs text-green-700">
                            Categoria: {Array.isArray(athlete.category) ? athlete.category.join(', ') : (athlete.category || "N/A")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-600 text-white">
                          {athlete.responseCount} {athlete.responseCount === 1 ? 'resposta' : 'respostas'}
                        </Badge>
                        {athlete.lastResponse && (
                          <p className="text-xs text-green-700 mt-1">
                            {format(new Date(athlete.lastResponse), 'dd/MM/yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={athlete.id} className="p-3 border-2 border-red-200 bg-red-50 rounded-lg" data-testid={`athlete-not-responded-${athlete.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-red-900">
                          {athlete.firstName} {athlete.lastName}
                        </p>
                        <p className="text-xs text-red-700">
                          Categoria: {Array.isArray(athlete.category) ? athlete.category.join(', ') : (athlete.category || "N/A")}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ));
            })()}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Total de atletas:</span>
              <span className="font-semibold">
                {selectedDay && rpeStats?.[selectedDay] && selectedResponseType 
                  ? (selectedResponseType === "responded" 
                      ? rpeStats[selectedDay].respondedCount || 0 
                      : rpeStats[selectedDay].notRespondedCount || 0)
                  : 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>Data:</span>
              <span>{selectedDay && rpeStats?.[selectedDay]?.date ? format(parseISO(rpeStats[selectedDay].date), 'dd/MM/yyyy') : '-'}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}