import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Calendar, User, TrendingUp, TrendingDown, Minus, BarChart3, Sun,
  Activity, Clock, CheckCircle, AlertCircle, FileText, Trash2, Users, UserCheck, UserX, Edit
} from "lucide-react";
import WellnessForm from "@/components/wellness/wellness-form";
import WellnessDetails from "@/components/wellness/wellness-details";
import { format, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RpeEntry, TrainingSession, Athlete } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export default function Wellness() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("wellness");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [reportAthleteId, setReportAthleteId] = useState<string>("");
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<"good" | "moderate" | "poor" | null>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [selectedResponseType, setSelectedResponseType] = useState<"responded" | "notResponded" | null>(null);
  const [selectedDay, setSelectedDay] = useState<"today" | "yesterday" | "dayBeforeYesterday" | null>(null);
  const [showWellnessResponseDialog, setShowWellnessResponseDialog] = useState(false);
  const [selectedWellnessResponseType, setSelectedWellnessResponseType] = useState<"responded" | "notResponded" | null>(null);
  const [selectedWellnessDay, setSelectedWellnessDay] = useState<"today" | "yesterday" | "dayBeforeYesterday" | null>(null);
  const [editingWellness, setEditingWellness] = useState<any | null>(null);
  const [editingRpe, setEditingRpe] = useState<any | null>(null);

  const today = new Date();
  const startDate = format(subDays(today, 30), 'yyyy-MM-dd');
  const endDate = format(today, 'yyyy-MM-dd');

  const { data: wellnessEntries, isLoading: loadingWellness } = useQuery({
    queryKey: ["/api/wellness-entries", { startDate, endDate }],
    retry: false,
  });

  const { data: athletes } = useQuery({
    queryKey: ["/api/athletes"],
    retry: false,
  });

  // Fetch today's training sessions for RPE submission
  const { data: todayTrainingSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["/api/training-sessions?today=true"],
  });

  // Fetch ALL training sessions for RPE history table
  const { data: allTrainingSessions } = useQuery({
    queryKey: ["/api/training-sessions"],
  });

  // Only today's session for RPE
  const todaySession = todayTrainingSessions && todayTrainingSessions.length > 0 ? todayTrainingSessions[0] : null;

  // Fetch RPE response statistics
  const { data: rpeStats, isLoading: loadingRpeStats } = useQuery({
    queryKey: ["/api/rpe-entries/response-stats"],
    enabled: !!user.clubId && !!user.seasonId,
  });

  // Fetch all RPE entries for reports tab
  const { data: rpeEntries } = useQuery({
    queryKey: ["/api/rpe-entries"],
    enabled: !!user.clubId && !!user.seasonId,
  });

  // Fetch wellness response statistics
  const { data: wellnessStats, isLoading: loadingWellnessStats } = useQuery({
    queryKey: ["/api/wellness-entries/response-stats"],
    enabled: !!user.clubId && !!user.seasonId,
  });

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
      const message = error?.response?.data?.message || error.message || "Erro ao submeter RPE.";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    },
  });

  const deleteWellnessMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/wellness-entries/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Entrada removida",
        description: "Entrada de wellness excluída com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wellness-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wellness-entries/response-stats"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a entrada de wellness.",
        variant: "destructive",
      });
    },
  });

  const deleteRpeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/rpe-entries/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "RPE removido",
        description: "Entrada de RPE excluída com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rpe-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rpe-entries/response-stats"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a entrada de RPE.",
        variant: "destructive",
      });
    },
  });

  const updateWellnessMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/wellness-entries/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Wellness atualizado",
        description: "Entrada de wellness atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wellness-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wellness-entries/response-stats"] });
      setEditingWellness(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || "Não foi possível atualizar a entrada de wellness.";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateRpeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/rpe-entries/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "RPE atualizado",
        description: "Entrada de RPE atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rpe-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rpe-entries/response-stats"] });
      setEditingRpe(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || "Não foi possível atualizar a entrada de RPE.";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitRpe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!user.athleteId) {
      toast({
        title: "Erro",
        description: "Usuário não está vinculado a um atleta.",
        variant: "destructive",
      });
      return;
    }
    
    if (!todaySession) {
      toast({
        title: "Erro",
        description: "Não há treino agendado para hoje.",
        variant: "destructive",
      });
      return;
    }
    
    const data = {
      athleteId: user.athleteId,
      trainingSessionId: todaySession.id,
      rpeValue: parseInt(formData.get("rpeScore") as string),
      perceivedExertion: formData.get("perceivedExertion") as string,
      muscularFatigue: parseInt(formData.get("muscularFatigue") as string),
      overallFeeling: formData.get("overallFeeling") as string,
      comments: formData.get("comments") as string || null,
      clubId: (user as any)?.clubId,
      seasonId: (user as any)?.seasonId,
    };

    submitRpeMutation.mutate(data);
  };

  const getRecentEntries = () => {
    if (!wellnessEntries) return [];
    return wellnessEntries
      .filter((entry: any) => selectedAthlete ? entry.athleteId.toString() === selectedAthlete : true)
      .slice(0, 10);
  };

  const getWellnessStats = () => {
    if (!wellnessEntries || wellnessEntries.length === 0 || !athletes) {
      return { good: 0, moderate: 0, poor: 0, total: 0 };
    }

    // Group entries by athlete and get last 7 entries for each
    const athleteAverages = new Map();
    
    athletes.forEach((athlete: any) => {
      const athleteEntries = wellnessEntries
        .filter((entry: any) => entry.athleteId === athlete.id)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7);
      
      if (athleteEntries.length > 0) {
        const avgMood = athleteEntries.reduce((sum: number, e: any) => sum + (e.mood || 0), 0) / athleteEntries.length;
        const avgSleep = athleteEntries.reduce((sum: number, e: any) => sum + (e.sleepQuality || 0), 0) / athleteEntries.length;
        const avgFatigue = athleteEntries.reduce((sum: number, e: any) => sum + (e.fatigueLevel || 0), 0) / athleteEntries.length;
        const avgStress = athleteEntries.reduce((sum: number, e: any) => sum + (e.stressLevel || 0), 0) / athleteEntries.length;
        
        athleteAverages.set(athlete.id, {
          avgMood,
          avgSleep,
          avgFatigue,
          avgStress
        });
      }
    });

    let good = 0;
    let moderate = 0;
    let poor = 0;

    athleteAverages.forEach((avg) => {
      if (avg.avgMood >= 7 && avg.avgSleep >= 7 && avg.avgFatigue <= 4 && avg.avgStress <= 4) {
        good++;
      } else if (avg.avgMood < 5 || avg.avgSleep < 5 || avg.avgFatigue > 6 || avg.avgStress > 6) {
        poor++;
      } else {
        moderate++;
      }
    });

    return { good, moderate, poor, total: wellnessEntries.length };
  };

  const getMoodIcon = (mood: number) => {
    if (mood >= 8) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (mood >= 6) return <Minus className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  // Format date without timezone conversion
  const formatDateLocal = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00'); // Force local midnight
    return date.toLocaleDateString('pt-BR');
  };

  const getTrainingSessionBadgeColor = (date: string) => {
    const sessionDate = new Date(date);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "bg-green-100 text-green-800";
    if (diffDays === 1) return "bg-yellow-100 text-yellow-800";
    if (diffDays <= 3) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const hasRpeForDay = (sessionId: number, athleteId: number) => {
    // Check if there's already an RPE for this specific session
    if (!rpeEntries) return false;
    return rpeEntries.some((entry: any) => 
      entry.athleteId === athleteId && entry.trainingSessionId === sessionId
    );
  };

  const stats = getWellnessStats();

  const getAthletesByCondition = (condition: "good" | "moderate" | "poor") => {
    if (!wellnessEntries || !athletes) return [];
    
    const athletesList: any[] = [];
    
    athletes.forEach((athlete: any) => {
      const athleteEntries = wellnessEntries
        .filter((entry: any) => entry.athleteId === athlete.id)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7);
      
      if (athleteEntries.length > 0) {
        const avgMood = athleteEntries.reduce((sum: number, e: any) => sum + (e.mood || 0), 0) / athleteEntries.length;
        const avgSleep = athleteEntries.reduce((sum: number, e: any) => sum + (e.sleepQuality || 0), 0) / athleteEntries.length;
        const avgFatigue = athleteEntries.reduce((sum: number, e: any) => sum + (e.fatigueLevel || 0), 0) / athleteEntries.length;
        const avgStress = athleteEntries.reduce((sum: number, e: any) => sum + (e.stressLevel || 0), 0) / athleteEntries.length;
        
        let matchesCondition = false;
        
        if (condition === "good") {
          matchesCondition = avgMood >= 7 && avgSleep >= 7 && avgFatigue <= 4 && avgStress <= 4;
        } else if (condition === "poor") {
          matchesCondition = avgMood < 5 || avgSleep < 5 || avgFatigue > 6 || avgStress > 6;
        } else {
          matchesCondition = !((avgMood >= 7 && avgSleep >= 7 && avgFatigue <= 4 && avgStress <= 4) ||
                              (avgMood < 5 || avgSleep < 5 || avgFatigue > 6 || avgStress > 6));
        }
        
        if (matchesCondition) {
          athletesList.push({
            athlete,
            avgMood: Math.round(avgMood * 10) / 10,
            avgSleep: Math.round(avgSleep * 10) / 10,
            avgFatigue: Math.round(avgFatigue * 10) / 10,
            avgStress: Math.round(avgStress * 10) / 10,
            entriesCount: athleteEntries.length,
            latestDate: athleteEntries[0].date
          });
        }
      }
    });

    return athletesList;
  };

  const getConditionTitle = () => {
    if (selectedCondition === "good") return "Atletas em Boa Condição";
    if (selectedCondition === "moderate") return "Atletas em Atenção";
    if (selectedCondition === "poor") return "Atletas em Situação Preocupante";
    return "";
  };

  const getConditionColor = () => {
    if (selectedCondition === "good") return "text-green-600";
    if (selectedCondition === "moderate") return "text-yellow-600";
    if (selectedCondition === "poor") return "text-red-600";
    return "";
  };

  const openResponseDialog = (type: "responded" | "notResponded", day: "today" | "yesterday" | "dayBeforeYesterday") => {
    setSelectedResponseType(type);
    setSelectedDay(day);
    setShowResponseDialog(true);
  };

  const openWellnessResponseDialog = (type: "responded" | "notResponded", day: "today" | "yesterday" | "dayBeforeYesterday") => {
    setSelectedWellnessResponseType(type);
    setSelectedWellnessDay(day);
    setShowWellnessResponseDialog(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fluent-text">Wellness & RPE</h1>
          <p className="text-fluent-text-secondary mt-1">Monitoramento de bem-estar e esforço percebido</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-3">
          <TabsTrigger value="wellness" data-testid="tab-wellness">
            <Sun className="w-4 h-4 mr-2" />
            Monitoramento Diário
          </TabsTrigger>
          <TabsTrigger value="rpe" data-testid="tab-rpe">
            <Activity className="w-4 h-4 mr-2" />
            RPE Pós-Treino
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">
            <FileText className="w-4 h-4 mr-2" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* Wellness Tab */}
        <TabsContent value="wellness" className="space-y-6">
          <div className="flex justify-end space-x-2">
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-fluent-blue text-fluent-blue hover:bg-fluent-blue hover:text-white" data-testid="button-wellness-details">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Análise Detalhada de Wellness</DialogTitle>
                </DialogHeader>
                <WellnessDetails />
              </DialogContent>
            </Dialog>

            {/* Only athletes can submit wellness entries */}
            {user.athleteId && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-fluent-blue hover:bg-fluent-blue-dark text-white" data-testid="button-new-wellness">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Entrada
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nova Entrada de Wellness</DialogTitle>
                  </DialogHeader>
                  <WellnessForm onSuccess={() => setIsFormOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="fluent-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Total de Entradas</p>
                    <p className="text-2xl font-bold text-fluent-text" data-testid="stat-total">{stats.total}</p>
                    <p className="text-xs text-fluent-text-secondary">Últimos 30 dias</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Sun className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="fluent-shadow cursor-pointer hover:shadow-lg transition-shadow" 
              onClick={() => {
                setSelectedCondition("good");
                setConditionDialogOpen(true);
              }}
              data-testid="card-good-condition"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Boa Condição</p>
                    <p className="text-2xl font-bold text-fluent-green" data-testid="stat-good">{stats.good}</p>
                    <p className="text-xs text-fluent-text-secondary">Atletas</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-fluent-green" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="fluent-shadow cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setSelectedCondition("moderate");
                setConditionDialogOpen(true);
              }}
              data-testid="card-moderate-condition"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Atenção</p>
                    <p className="text-2xl font-bold text-yellow-600" data-testid="stat-moderate">{stats.moderate}</p>
                    <p className="text-xs text-fluent-text-secondary">Atletas</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Minus className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="fluent-shadow cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setSelectedCondition("poor");
                setConditionDialogOpen(true);
              }}
              data-testid="card-poor-condition"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Preocupante</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="stat-poor">{stats.poor}</p>
                    <p className="text-xs text-fluent-text-secondary">Atletas</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary and Recent Entries */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wellness Summary */}
            <Card className="fluent-shadow">
              <CardHeader>
                <CardTitle className="text-fluent-text">Resumo Wellness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div 
                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    onClick={() => {
                      setSelectedCondition("good");
                      setConditionDialogOpen(true);
                    }}
                    data-testid="summary-good-condition"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-fluent-text-secondary">Boa Condição</span>
                      <span className="text-sm text-fluent-text">{stats.good}</span>
                    </div>
                    <Progress value={(stats.good / Math.max(stats.total, 1)) * 100} className="h-2" />
                  </div>
                  
                  <div 
                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    onClick={() => {
                      setSelectedCondition("moderate");
                      setConditionDialogOpen(true);
                    }}
                    data-testid="summary-moderate-condition"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-fluent-text-secondary">Atenção</span>
                      <span className="text-sm text-fluent-text">{stats.moderate}</span>
                    </div>
                    <Progress value={(stats.moderate / Math.max(stats.total, 1)) * 100} className="h-2" />
                  </div>
                  
                  <div 
                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    onClick={() => {
                      setSelectedCondition("poor");
                      setConditionDialogOpen(true);
                    }}
                    data-testid="summary-poor-condition"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-fluent-text-secondary">Preocupante</span>
                      <span className="text-sm text-fluent-text">{stats.poor}</span>
                    </div>
                    <Progress value={(stats.poor / Math.max(stats.total, 1)) * 100} className="h-2" />
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center text-sm text-fluent-text-secondary">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Últimos 30 dias</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wellness Response Statistics - Separated by Day */}
            <div className="lg:col-span-2">
              <Card className="fluent-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Respostas dos Últimos 3 Dias
                  </CardTitle>
                  <CardDescription>
                    Clique nos cards para ver detalhes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Today */}
                    {wellnessStats?.today && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {wellnessStats.today.label}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div 
                            className="p-3 border-2 border-green-200 bg-green-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => openWellnessResponseDialog("responded", "today")}
                            data-testid="card-today-responded-wellness"
                          >
                            <div className="text-center">
                              <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                              <div className="text-2xl font-bold text-green-600">
                                {wellnessStats.today.respondedCount || 0}
                              </div>
                              <div className="text-xs text-green-700">Responderam</div>
                            </div>
                          </div>
                          <div 
                            className="p-3 border-2 border-red-200 bg-red-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => openWellnessResponseDialog("notResponded", "today")}
                            data-testid="card-today-not-responded-wellness"
                          >
                            <div className="text-center">
                              <UserX className="h-5 w-5 text-red-600 mx-auto mb-1" />
                              <div className="text-2xl font-bold text-red-600">
                                {wellnessStats.today.notRespondedCount || 0}
                              </div>
                              <div className="text-xs text-red-700">Não Responderam</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Yesterday */}
                    {wellnessStats?.yesterday && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {wellnessStats.yesterday.label}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div 
                            className="p-3 border-2 border-green-200 bg-green-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => openWellnessResponseDialog("responded", "yesterday")}
                            data-testid="card-yesterday-responded-wellness"
                          >
                            <div className="text-center">
                              <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                              <div className="text-2xl font-bold text-green-600">
                                {wellnessStats.yesterday.respondedCount || 0}
                              </div>
                              <div className="text-xs text-green-700">Responderam</div>
                            </div>
                          </div>
                          <div 
                            className="p-3 border-2 border-red-200 bg-red-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => openWellnessResponseDialog("notResponded", "yesterday")}
                            data-testid="card-yesterday-not-responded-wellness"
                          >
                            <div className="text-center">
                              <UserX className="h-5 w-5 text-red-600 mx-auto mb-1" />
                              <div className="text-2xl font-bold text-red-600">
                                {wellnessStats.yesterday.notRespondedCount || 0}
                              </div>
                              <div className="text-xs text-red-700">Não Responderam</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Day Before Yesterday */}
                    {wellnessStats?.dayBeforeYesterday && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {wellnessStats.dayBeforeYesterday.label}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div 
                            className="p-3 border-2 border-green-200 bg-green-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => openWellnessResponseDialog("responded", "dayBeforeYesterday")}
                            data-testid="card-day-before-yesterday-responded-wellness"
                          >
                            <div className="text-center">
                              <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                              <div className="text-2xl font-bold text-green-600">
                                {wellnessStats.dayBeforeYesterday.respondedCount || 0}
                              </div>
                              <div className="text-xs text-green-700">Responderam</div>
                            </div>
                          </div>
                          <div 
                            className="p-3 border-2 border-red-200 bg-red-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => openWellnessResponseDialog("notResponded", "dayBeforeYesterday")}
                            data-testid="card-day-before-yesterday-not-responded-wellness"
                          >
                            <div className="text-center">
                              <UserX className="h-5 w-5 text-red-600 mx-auto mb-1" />
                              <div className="text-2xl font-bold text-red-600">
                                {wellnessStats.dayBeforeYesterday.notRespondedCount || 0}
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
                        <span className="font-semibold" data-testid="count-total-wellness">
                          {wellnessStats?.totalAthletes || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Athlete's Wellness History */}
          {user.athleteId && (
            <Card className="fluent-shadow">
              <CardHeader>
                <CardTitle className="text-fluent-text">Meus Registros de Wellness</CardTitle>
                <CardDescription>Histórico dos últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Sono (hrs)</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Qualidade</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Fadiga</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Estresse</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Humor</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {wellnessEntries
                          ?.filter((entry: any) => entry.athleteId === user.athleteId)
                          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((entry: any) => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">
                                {new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-4 py-3 text-sm">{entry.sleepHours || '-'}</td>
                              <td className="px-4 py-3 text-sm">{entry.sleepQuality || '-'}/10</td>
                              <td className="px-4 py-3 text-sm">{entry.fatigueLevel || '-'}/10</td>
                              <td className="px-4 py-3 text-sm">{entry.stressLevel || '-'}/10</td>
                              <td className="px-4 py-3 text-sm">{entry.mood || '-'}/10</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingWellness(entry)}
                                    data-testid={`button-edit-my-wellness-${entry.id}`}
                                    className="hover:bg-blue-50"
                                  >
                                    <Edit className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (window.confirm("Tem certeza que deseja excluir este registro?")) {
                                        deleteWellnessMutation.mutate(entry.id);
                                      }
                                    }}
                                    data-testid={`button-delete-my-wellness-${entry.id}`}
                                    className="hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {wellnessEntries?.filter((entry: any) => entry.athleteId === user.athleteId).length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        Nenhum registro de wellness encontrado
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RPE Tab */}
        <TabsContent value="rpe" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* RPE Submission Form - Only for Athletes */}
            {user.athleteId && (
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
                    {loadingSessions ? (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
                        <p className="text-gray-500">Carregando sessões de hoje...</p>
                      </div>
                    ) : !todaySession ? (
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
                          data-testid="input-rpe-score"
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
                          data-testid="input-muscular-fatigue"
                        />
                        <p className="text-sm text-gray-500">1=Sem fadiga, 10=Exaustão</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="overallFeeling">Sensação Geral *</Label>
                        <Select name="overallFeeling" required>
                          <SelectTrigger data-testid="select-overall-feeling">
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
                        <SelectTrigger data-testid="select-perceived-exertion">
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
                        data-testid="textarea-rpe-comments"
                      />
                    </div>

                    {todaySession && user.athleteId && hasRpeForDay(todaySession.id, user.athleteId) && (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">
                          Já existe um RPE registrado para você neste treino.
                        </span>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full bg-fluent-blue hover:bg-fluent-blue-dark"
                      disabled={submitRpeMutation.isPending || (todaySession && user.athleteId && hasRpeForDay(todaySession.id, user.athleteId))}
                      data-testid="button-submit-rpe"
                    >
                      {submitRpeMutation.isPending ? "Submetendo..." : "Submeter RPE"}
                    </Button>
                    </form>
                    </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* RPE Response Statistics - Separated by Day */}
            <div className={!user.athleteId ? "lg:col-span-3" : ""}>
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
                            data-testid="card-today-responded-rpe"
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
                            data-testid="card-today-not-responded-rpe"
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
                            data-testid="card-yesterday-responded-rpe"
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
                            data-testid="card-yesterday-not-responded-rpe"
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
                            data-testid="card-day-before-yesterday-responded-rpe"
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
                            data-testid="card-day-before-yesterday-not-responded-rpe"
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
                        <span className="font-semibold" data-testid="count-total-rpe">
                          {rpeStats?.totalAthletes || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Athlete's RPE History */}
          {user.athleteId && (
            <Card className="fluent-shadow">
              <CardHeader>
                <CardTitle className="text-fluent-text">Meus Registros de RPE</CardTitle>
                <CardDescription>Histórico dos últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data do Treino</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">RPE</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Fadiga Muscular</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Sensação Geral</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Esforço Percebido</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {rpeEntries
                          ?.filter((entry: any) => entry.athleteId === user.athleteId)
                          .sort((a: any, b: any) => {
                            const sessionA = allTrainingSessions?.find((s: any) => s.id === a.trainingSessionId);
                            const sessionB = allTrainingSessions?.find((s: any) => s.id === b.trainingSessionId);
                            const dateA = sessionA ? new Date(sessionA.date).getTime() : 0;
                            const dateB = sessionB ? new Date(sessionB.date).getTime() : 0;
                            return dateB - dateA;
                          })
                          .map((entry: any) => {
                            const session = allTrainingSessions?.find((s: any) => s.id === entry.trainingSessionId);
                            return (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">
                                  {session ? formatDateLocal(session.date) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <Badge className="bg-blue-100 text-blue-800">
                                    {entry.rpeValue}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">{entry.muscularFatigue}/10</td>
                                <td className="px-4 py-3 text-sm">{entry.overallFeeling}</td>
                                <td className="px-4 py-3 text-sm">{entry.perceivedExertion}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingRpe(entry)}
                                      data-testid={`button-edit-my-rpe-${entry.id}`}
                                      className="hover:bg-blue-50"
                                    >
                                      <Edit className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (window.confirm("Tem certeza que deseja excluir este registro?")) {
                                          deleteRpeMutation.mutate(entry.id);
                                        }
                                      }}
                                      data-testid={`button-delete-my-rpe-${entry.id}`}
                                      className="hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    {rpeEntries?.filter((entry: any) => entry.athleteId === user.athleteId).length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        Nenhum registro de RPE encontrado
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório Individual de Atleta</CardTitle>
              <CardDescription>
                Selecione um atleta para visualizar seu histórico de wellness e RPE
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md">
                <Label htmlFor="reportAthlete">Selecionar Atleta</Label>
                <Select value={reportAthleteId} onValueChange={setReportAthleteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um atleta" />
                  </SelectTrigger>
                  <SelectContent>
                    {athletes?.map((athlete: Athlete) => (
                      <SelectItem key={athlete.id} value={athlete.id.toString()}>
                        {athlete.firstName} {athlete.lastName} - {Array.isArray(athlete.category) ? athlete.category.join(', ') : athlete.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reportAthleteId && (
                <div className="space-y-6">
                  {/* RPE Response Status Card */}
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Status de Respostas RPE
                      </CardTitle>
                      <CardDescription>Últimos 3 dias</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const athleteRespondedData = rpeStats?.responded?.find((a: any) => a.id === parseInt(reportAthleteId));
                        const athleteNotRespondedData = rpeStats?.notResponded?.find((a: any) => a.id === parseInt(reportAthleteId));
                        
                        if (athleteRespondedData) {
                          return (
                            <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                  <UserCheck className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <p className="text-lg font-semibold text-green-900">Atleta Respondeu</p>
                                  <p className="text-sm text-green-700">
                                    {athleteRespondedData.responseCount} {athleteRespondedData.responseCount === 1 ? 'resposta' : 'respostas'} nos últimos 3 dias
                                  </p>
                                </div>
                              </div>
                              <div className="text-sm text-green-700">
                                <p><strong>Última resposta:</strong> {athleteRespondedData.lastResponse ? format(new Date(athleteRespondedData.lastResponse), 'dd/MM/yyyy HH:mm') : 'N/A'}</p>
                              </div>
                            </div>
                          );
                        } else if (athleteNotRespondedData) {
                          return (
                            <div className="p-4 border-2 border-red-200 bg-red-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                                  <UserX className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <p className="text-lg font-semibold text-red-900">Atleta Não Respondeu</p>
                                  <p className="text-sm text-red-700">Nenhum RPE registrado nos últimos 3 dias</p>
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="p-4 border-2 border-gray-200 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                                  <Users className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <p className="text-lg font-semibold text-gray-700">Informação não disponível</p>
                                  <p className="text-sm text-gray-600">Dados de resposta RPE não encontrados</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </CardContent>
                  </Card>

                  {/* Wellness Report */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sun className="h-5 w-5" />
                      Histórico de Wellness (Últimos 30 dias)
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Sono (hrs)</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Qualidade Sono</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Fadiga</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Estresse</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Humor</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Observações</th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {wellnessEntries
                              ?.filter((entry: any) => entry.athleteId === parseInt(reportAthleteId))
                              .map((entry: any) => (
                                <tr key={entry.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm">
                                    {new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="px-4 py-3 text-sm">{entry.sleepHours || '-'}</td>
                                  <td className="px-4 py-3 text-sm">{entry.sleepQuality || '-'}/10</td>
                                  <td className="px-4 py-3 text-sm">{entry.fatigueLevel || '-'}/10</td>
                                  <td className="px-4 py-3 text-sm">{entry.stressLevel || '-'}/10</td>
                                  <td className="px-4 py-3 text-sm">{entry.mood || '-'}/10</td>
                                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                    {entry.notes || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingWellness(entry)}
                                        data-testid={`button-edit-wellness-${entry.id}`}
                                        className="hover:bg-blue-50"
                                      >
                                        <Edit className="h-4 w-4 text-blue-600" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          if (window.confirm("Tem certeza que deseja excluir este registro de wellness?")) {
                                            deleteWellnessMutation.mutate(entry.id);
                                          }
                                        }}
                                        data-testid={`button-delete-wellness-${entry.id}`}
                                        className="hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {wellnessEntries?.filter((entry: any) => entry.athleteId === parseInt(reportAthleteId)).length === 0 && (
                          <div className="p-8 text-center text-gray-500">
                            Nenhum registro de wellness encontrado para este atleta
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RPE Report */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Histórico de RPE (Últimos 30 dias)
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">RPE</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Fadiga Muscular</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Sensação Geral</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Esforço Percebido</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Comentários</th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {rpeEntries
                              ?.filter((entry: any) => entry.athleteId === parseInt(reportAthleteId))
                              .map((entry: any) => {
                                const session = allTrainingSessions?.find((s: any) => s.id === entry.trainingSessionId);
                                return (
                                  <tr key={entry.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">
                                      {session ? formatDateLocal(session.date) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <Badge className="bg-blue-100 text-blue-800">
                                        {entry.rpeValue}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{entry.muscularFatigue}/10</td>
                                    <td className="px-4 py-3 text-sm">{entry.overallFeeling}</td>
                                    <td className="px-4 py-3 text-sm">{entry.perceivedExertion}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                      {entry.comments || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setEditingRpe(entry)}
                                          data-testid={`button-edit-rpe-${entry.id}`}
                                          className="hover:bg-blue-50"
                                        >
                                          <Edit className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (window.confirm("Tem certeza que deseja excluir este registro de RPE?")) {
                                              deleteRpeMutation.mutate(entry.id);
                                            }
                                          }}
                                          data-testid={`button-delete-rpe-${entry.id}`}
                                          className="hover:bg-red-50"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                        {rpeEntries?.filter((entry: any) => entry.athleteId === parseInt(reportAthleteId)).length === 0 && (
                          <div className="p-8 text-center text-gray-500">
                            Nenhum registro de RPE encontrado para este atleta
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Wellness Response Details Dialog */}
      <Dialog open={showWellnessResponseDialog} onOpenChange={setShowWellnessResponseDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedWellnessResponseType === "responded" ? (
                <>
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Atletas que Responderam Wellness - {selectedWellnessDay && wellnessStats?.[selectedWellnessDay]?.label}
                </>
              ) : (
                <>
                  <UserX className="h-5 w-5 text-red-600" />
                  Atletas que Não Responderam Wellness - {selectedWellnessDay && wellnessStats?.[selectedWellnessDay]?.label}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {(() => {
              if (!selectedWellnessDay || !wellnessStats?.[selectedWellnessDay]) {
                return (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum dado disponível
                  </p>
                );
              }

              const dayData = wellnessStats[selectedWellnessDay];
              const athletes = selectedWellnessResponseType === "responded" 
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
                selectedWellnessResponseType === "responded" ? (
                  <div key={athlete.id} className="p-3 border-2 border-green-200 bg-green-50 rounded-lg" data-testid={`athlete-responded-wellness-${athlete.id}`}>
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
                  <div key={athlete.id} className="p-3 border-2 border-red-200 bg-red-50 rounded-lg" data-testid={`athlete-not-responded-wellness-${athlete.id}`}>
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
                {selectedWellnessDay && wellnessStats?.[selectedWellnessDay] && selectedWellnessResponseType 
                  ? (selectedWellnessResponseType === "responded" 
                      ? wellnessStats[selectedWellnessDay].respondedCount || 0 
                      : wellnessStats[selectedWellnessDay].notRespondedCount || 0)
                  : 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>Data:</span>
              <span>{selectedWellnessDay && wellnessStats?.[selectedWellnessDay]?.date ? format(new Date(wellnessStats[selectedWellnessDay].date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Condition Athletes Dialog */}
      <Dialog open={conditionDialogOpen} onOpenChange={setConditionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={getConditionColor()}>{getConditionTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCondition && getAthletesByCondition(selectedCondition).length > 0 ? (
              getAthletesByCondition(selectedCondition).map((item: any) => (
                <div key={item.athlete?.id} className="p-4 border rounded-lg hover:bg-gray-50" data-testid={`athlete-condition-${item.athlete?.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-fluent-blue rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {item.athlete?.firstName?.[0]}{item.athlete?.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-fluent-text">
                          {item.athlete?.firstName} {item.athlete?.lastName}
                        </p>
                        <p className="text-sm text-fluent-text-secondary">
                          Média das últimas {item.entriesCount} {item.entriesCount === 1 ? 'entrada' : 'entradas'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-fluent-text-secondary">Humor</p>
                        <p className="font-semibold">{item.avgMood}/10</p>
                      </div>
                      <div>
                        <p className="text-fluent-text-secondary">Sono</p>
                        <p className="font-semibold">{item.avgSleep}/10</p>
                      </div>
                      <div>
                        <p className="text-fluent-text-secondary">Fadiga</p>
                        <p className="font-semibold">{item.avgFatigue}/10</p>
                      </div>
                      <div>
                        <p className="text-fluent-text-secondary">Estresse</p>
                        <p className="font-semibold">{item.avgStress}/10</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-fluent-text-secondary py-8">
                Nenhum atleta nesta condição
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* RPE Response Details Dialog */}
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
              <span>{selectedDay && rpeStats?.[selectedDay]?.date ? format(new Date(rpeStats[selectedDay].date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Wellness Dialog */}
      <Dialog open={!!editingWellness} onOpenChange={(open) => !open && setEditingWellness(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Registro de Wellness
            </DialogTitle>
          </DialogHeader>
          {editingWellness && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = {
                sleepHours: formData.get("sleepHours") ? parseFloat(formData.get("sleepHours") as string) : null,
                sleepQuality: formData.get("sleepQuality") ? parseInt(formData.get("sleepQuality") as string) : null,
                fatigueLevel: formData.get("fatigueLevel") ? parseInt(formData.get("fatigueLevel") as string) : null,
                stressLevel: formData.get("stressLevel") ? parseInt(formData.get("stressLevel") as string) : null,
                mood: formData.get("mood") ? parseInt(formData.get("mood") as string) : null,
                energyLevel: formData.get("energyLevel") ? parseInt(formData.get("energyLevel") as string) : null,
                hydrationLevel: formData.get("hydrationLevel") ? parseInt(formData.get("hydrationLevel") as string) : null,
                motivationLevel: formData.get("motivationLevel") ? parseInt(formData.get("motivationLevel") as string) : null,
                notes: formData.get("notes") as string || null,
              };
              updateWellnessMutation.mutate({ id: editingWellness.id, data });
            }} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sleepHours">Horas de Sono</Label>
                  <Input
                    id="sleepHours"
                    name="sleepHours"
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    defaultValue={editingWellness.sleepHours}
                    data-testid="input-edit-sleepHours"
                  />
                </div>
                <div>
                  <Label htmlFor="sleepQuality">Qualidade do Sono (1-10)</Label>
                  <Input
                    id="sleepQuality"
                    name="sleepQuality"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue={editingWellness.sleepQuality}
                    data-testid="input-edit-sleepQuality"
                  />
                </div>
                <div>
                  <Label htmlFor="fatigueLevel">Nível de Fadiga (1-10)</Label>
                  <Input
                    id="fatigueLevel"
                    name="fatigueLevel"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue={editingWellness.fatigueLevel}
                    data-testid="input-edit-fatigueLevel"
                  />
                </div>
                <div>
                  <Label htmlFor="stressLevel">Nível de Estresse (1-10)</Label>
                  <Input
                    id="stressLevel"
                    name="stressLevel"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue={editingWellness.stressLevel}
                    data-testid="input-edit-stressLevel"
                  />
                </div>
                <div>
                  <Label htmlFor="mood">Humor (1-10)</Label>
                  <Input
                    id="mood"
                    name="mood"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue={editingWellness.mood}
                    data-testid="input-edit-mood"
                  />
                </div>
                <div>
                  <Label htmlFor="energyLevel">Energia (1-10)</Label>
                  <Input
                    id="energyLevel"
                    name="energyLevel"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue={editingWellness.energyLevel}
                    data-testid="input-edit-energyLevel"
                  />
                </div>
                <div>
                  <Label htmlFor="hydrationLevel">Hidratação (1-10)</Label>
                  <Input
                    id="hydrationLevel"
                    name="hydrationLevel"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue={editingWellness.hydrationLevel}
                    data-testid="input-edit-hydrationLevel"
                  />
                </div>
                <div>
                  <Label htmlFor="motivationLevel">Motivação (1-10)</Label>
                  <Input
                    id="motivationLevel"
                    name="motivationLevel"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue={editingWellness.motivationLevel}
                    data-testid="input-edit-motivationLevel"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={editingWellness.notes || ""}
                  data-testid="textarea-edit-notes"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingWellness(null)} data-testid="button-cancel-edit-wellness">
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateWellnessMutation.isPending} data-testid="button-save-edit-wellness">
                  {updateWellnessMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit RPE Dialog */}
      <Dialog open={!!editingRpe} onOpenChange={(open) => !open && setEditingRpe(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Registro de RPE
            </DialogTitle>
          </DialogHeader>
          {editingRpe && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = {
                rpeValue: parseInt(formData.get("rpeValue") as string),
                muscularFatigue: parseInt(formData.get("muscularFatigue") as string),
                perceivedExertion: formData.get("perceivedExertion") as string,
                overallFeeling: formData.get("overallFeeling") as string,
                comments: formData.get("comments") as string || null,
              };
              updateRpeMutation.mutate({ id: editingRpe.id, data });
            }} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rpeValue">RPE (1-10)</Label>
                  <Input
                    id="rpeValue"
                    name="rpeValue"
                    type="number"
                    min="1"
                    max="10"
                    required
                    defaultValue={editingRpe.rpeValue}
                    data-testid="input-edit-rpeValue"
                  />
                </div>
                <div>
                  <Label htmlFor="muscularFatigue">Fadiga Muscular (1-10)</Label>
                  <Input
                    id="muscularFatigue"
                    name="muscularFatigue"
                    type="number"
                    min="1"
                    max="10"
                    required
                    defaultValue={editingRpe.muscularFatigue}
                    data-testid="input-edit-muscularFatigue"
                  />
                </div>
                <div>
                  <Label htmlFor="perceivedExertion">Esforço Percebido</Label>
                  <Select name="perceivedExertion" defaultValue={editingRpe.perceivedExertion} required>
                    <SelectTrigger data-testid="select-edit-perceivedExertion">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leve">Leve</SelectItem>
                      <SelectItem value="moderado">Moderado</SelectItem>
                      <SelectItem value="intenso">Intenso</SelectItem>
                      <SelectItem value="muito_intenso">Muito Intenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="overallFeeling">Sensação Geral</Label>
                  <Select name="overallFeeling" defaultValue={editingRpe.overallFeeling} required>
                    <SelectTrigger data-testid="select-edit-overallFeeling">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pessimo">Péssimo</SelectItem>
                      <SelectItem value="ruim">Ruim</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="bom">Bom</SelectItem>
                      <SelectItem value="excelente">Excelente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="comments">Comentários</Label>
                <Textarea
                  id="comments"
                  name="comments"
                  rows={3}
                  defaultValue={editingRpe.comments || ""}
                  data-testid="textarea-edit-comments"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingRpe(null)} data-testid="button-cancel-edit-rpe">
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateRpeMutation.isPending} data-testid="button-save-edit-rpe">
                  {updateRpeMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
