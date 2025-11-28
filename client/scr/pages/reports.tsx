import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  Users, 
  Dumbbell, 
  Trophy, 
  Heart, 
  Stethoscope, 
  DollarSign,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  Filter
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";

export default function Reports() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("30days");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getPeriodDates = () => {
    const today = new Date();
    switch (selectedPeriod) {
      case "7days":
        return {
          start: format(subDays(today, 7), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
          label: "Últimos 7 dias"
        };
      case "30days":
        return {
          start: format(subDays(today, 30), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
          label: "Últimos 30 dias"
        };
      case "3months":
        return {
          start: format(subMonths(today, 3), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
          label: "Últimos 3 meses"
        };
      case "custom":
        return {
          start: startDate || format(subDays(today, 30), 'yyyy-MM-dd'),
          end: endDate || format(today, 'yyyy-MM-dd'),
          label: "Período personalizado"
        };
      default:
        return {
          start: format(subDays(today, 30), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
          label: "Últimos 30 dias"
        };
    }
  };

  const period = getPeriodDates();

  // Data queries
  const { data: athletes } = useQuery({
    queryKey: ["/api/athletes"],
    retry: false,
  });

  const { data: trainingSessions } = useQuery({
    queryKey: ["/api/training-sessions"],
    retry: false,
  });

  const { data: games } = useQuery({
    queryKey: ["/api/games"],
    retry: false,
  });

  const { data: wellnessEntries } = useQuery({
    queryKey: ["/api/wellness-entries", { startDate: period.start, endDate: period.end }],
    retry: false,
  });

  const { data: medicalRecords } = useQuery({
    queryKey: ["/api/medical-records"],
    retry: false,
  });

  const { data: financialTransactions } = useQuery({
    queryKey: ["/api/financial-transactions", { startDate: period.start, endDate: period.end }],
    retry: false,
  });

  // Report calculations
  const getAthleteStats = () => {
    if (!athletes) return { total: 0, active: 0, injured: 0, byCategory: {} };

    const total = athletes.length;
    const active = athletes.filter((a: any) => a.status === "active").length;
    const injured = athletes.filter((a: any) => a.status === "injured").length;

    const byCategory: { [key: string]: number } = {};
    athletes.forEach((athlete: any) => {
      byCategory[athlete.category] = (byCategory[athlete.category] || 0) + 1;
    });

    return { total, active, injured, byCategory };
  };

  const getTrainingStats = () => {
    if (!trainingSessions) return { total: 0, byType: {}, byCategory: {} };

    const periodicSessions = trainingSessions.filter((session: any) => {
      const sessionDate = new Date(session.date);
      return sessionDate >= new Date(period.start) && sessionDate <= new Date(period.end);
    });

    const total = periodicSessions.length;
    
    const byType: { [key: string]: number } = {};
    const byCategory: { [key: string]: number } = {};

    periodicSessions.forEach((session: any) => {
      byType[session.type] = (byType[session.type] || 0) + 1;
      byCategory[session.category] = (byCategory[session.category] || 0) + 1;
    });

    return { total, byType, byCategory };
  };

  const getGameStats = () => {
    if (!games) return { total: 0, wins: 0, losses: 0, draws: 0, byCategory: {} };

    const periodicGames = games.filter((game: any) => {
      const gameDate = new Date(game.date);
      return gameDate >= new Date(period.start) && gameDate <= new Date(period.end) && game.status === "completed";
    });

    const total = periodicGames.length;
    let wins = 0, losses = 0, draws = 0;

    const byCategory: { [key: string]: { games: number, wins: number } } = {};

    periodicGames.forEach((game: any) => {
      if (game.ourScore !== null && game.opponentScore !== null) {
        if (game.ourScore > game.opponentScore) wins++;
        else if (game.ourScore < game.opponentScore) losses++;
        else draws++;
      }

      if (!byCategory[game.category]) {
        byCategory[game.category] = { games: 0, wins: 0 };
      }
      byCategory[game.category].games++;
      if (game.ourScore > game.opponentScore) {
        byCategory[game.category].wins++;
      }
    });

    return { total, wins, losses, draws, byCategory };
  };

  const getWellnessStats = () => {
    if (!wellnessEntries) return { entries: 0, avgMood: 0, avgSleep: 0, alertCount: 0 };

    const entries = wellnessEntries.length;
    if (entries === 0) return { entries: 0, avgMood: 0, avgSleep: 0, alertCount: 0 };

    const totalMood = wellnessEntries.reduce((sum: number, entry: any) => sum + (entry.mood || 0), 0);
    const totalSleep = wellnessEntries.reduce((sum: number, entry: any) => sum + (entry.sleepHours || 0), 0);
    const alertCount = wellnessEntries.filter((entry: any) => entry.mood < 4 || entry.sleepHours < 5 || entry.fatigue > 7 || entry.stress > 7).length;

    return {
      entries,
      avgMood: entries > 0 ? Math.round((totalMood / entries) * 10) / 10 : 0,
      avgSleep: entries > 0 ? Math.round((totalSleep / entries) * 10) / 10 : 0,
      alertCount
    };
  };

  const getMedicalStats = () => {
    if (!medicalRecords) return { total: 0, activeInjuries: 0, recoveredThisPeriod: 0 };

    const total = medicalRecords.length;
    const activeInjuries = medicalRecords.filter((record: any) => 
      record.type === "injury" && record.status === "active"
    ).length;

    const periodicRecords = medicalRecords.filter((record: any) => {
      const recordDate = new Date(record.date);
      return recordDate >= new Date(period.start) && recordDate <= new Date(period.end);
    });

    const recoveredThisPeriod = periodicRecords.filter((record: any) => 
      record.type === "injury" && record.status === "cleared"
    ).length;

    return { total, activeInjuries, recoveredThisPeriod };
  };

  const getFinancialStats = () => {
    if (!financialTransactions) return { income: 0, expenses: 0, balance: 0, transactions: 0 };

    const income = financialTransactions
      .filter((t: any) => t.type === "income")
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

    const expenses = financialTransactions
      .filter((t: any) => t.type === "expense")
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

    return {
      income,
      expenses,
      balance: income - expenses,
      transactions: financialTransactions.length
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const handleExportReport = async (reportType: string) => {
    try {
      toast({
        title: "Gerando PDF...",
        description: "Por favor, aguarde enquanto o relatório está sendo gerado",
      });

      // Build query params
      const params = new URLSearchParams({
        type: reportType,
        periodStart: period.start,
        periodEnd: period.end,
        periodLabel: period.label,
      });

      // Make API call to get PDF
      const response = await fetch(`/api/reports/export-pdf?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `relatorio_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF gerado com sucesso",
        description: "O relatório foi exportado em formato PDF",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório em PDF",
        variant: "destructive",
      });
    }
  };

  const handleExportReportByCategory = async (category: string) => {
    try {
      toast({
        title: "Gerando PDF...",
        description: category === 'all' 
          ? "Exportando todos os atletas por categoria" 
          : `Exportando atletas da categoria ${category}`,
      });

      // Build query params
      const params = new URLSearchParams({
        type: 'athletes',
        periodStart: period.start,
        periodEnd: period.end,
        periodLabel: period.label,
        category: category,
      });

      // Make API call to get PDF
      const response = await fetch(`/api/reports/export-pdf?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const categorySlug = category === 'all' ? 'todas-categorias' : category.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `relatorio_atletas_${categorySlug}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF gerado com sucesso",
        description: "O relatório foi exportado em formato PDF",
      });
    } catch (error) {
      console.error('Error exporting PDF by category:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório em PDF",
        variant: "destructive",
      });
    }
  };

  const athleteStats = useMemo(() => getAthleteStats(), [athletes]);
  const trainingStats = useMemo(() => getTrainingStats(), [trainingSessions, period.start, period.end]);
  const gameStats = useMemo(() => getGameStats(), [games, period.start, period.end]);
  const wellnessStats = useMemo(() => getWellnessStats(), [wellnessEntries]);
  const medicalStats = useMemo(() => getMedicalStats(), [medicalRecords, period.start, period.end]);
  const financialStats = useMemo(() => getFinancialStats(), [financialTransactions]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fluent-text">Relatórios</h1>
          <p className="text-fluent-text-secondary mt-1">Análises e estatísticas do clube</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => handleExportReport('general')} data-testid="button-export-general">
            <Download className="w-4 h-4 mr-2" />
            Exportar Geral
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="fluent-shadow">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="period">Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="3months">Últimos 3 meses</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === "custom" && (
              <>
                <div>
                  <Label htmlFor="startDate">Data Inicial</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data Final</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Sub-11">Sub-11</SelectItem>
                  <SelectItem value="Sub-13">Sub-13</SelectItem>
                  <SelectItem value="Sub-15">Sub-15</SelectItem>
                  <SelectItem value="Sub-17">Sub-17</SelectItem>
                  <SelectItem value="Sub-20">Sub-20</SelectItem>
                  <SelectItem value="Profissional">Profissional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-fluent-text-secondary">
            <Calendar className="w-4 h-4 inline mr-2" />
            Período selecionado: {period.label}
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="athletes">Atletas</TabsTrigger>
          <TabsTrigger value="training">Treinos</TabsTrigger>
          <TabsTrigger value="games">Jogos</TabsTrigger>
          <TabsTrigger value="wellness">Wellness</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="fluent-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Total de Atletas</p>
                    <p className="text-2xl font-bold text-fluent-text">{athleteStats.total}</p>
                    <p className="text-xs text-fluent-green">{athleteStats.active} ativos</p>
                  </div>
                  <Users className="w-8 h-8 text-fluent-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="fluent-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Treinos</p>
                    <p className="text-2xl font-bold text-fluent-text">{trainingStats.total}</p>
                    <p className="text-xs text-fluent-text-secondary">{period.label}</p>
                  </div>
                  <Dumbbell className="w-8 h-8 text-fluent-green" />
                </div>
              </CardContent>
            </Card>

            <Card className="fluent-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Jogos</p>
                    <p className="text-2xl font-bold text-fluent-text">{gameStats.total}</p>
                    <p className="text-xs text-fluent-green">{gameStats.wins} vitórias</p>
                  </div>
                  <Trophy className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="fluent-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Humor Médio</p>
                    <p className="text-2xl font-bold text-fluent-text">{wellnessStats.avgMood}</p>
                    <p className="text-xs text-fluent-text-secondary">{wellnessStats.entries} entradas</p>
                  </div>
                  <Heart className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="fluent-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Lesões Ativas</p>
                    <p className="text-2xl font-bold text-fluent-red">{medicalStats.activeInjuries}</p>
                    <p className="text-xs text-fluent-green">{medicalStats.recoveredThisPeriod} recuperados</p>
                  </div>
                  <Stethoscope className="w-8 h-8 text-fluent-red" />
                </div>
              </CardContent>
            </Card>

            <Card className="fluent-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Saldo</p>
                    <p className={`text-2xl font-bold ${financialStats.balance >= 0 ? 'text-fluent-green' : 'text-fluent-red'}`}>
                      {formatCurrency(financialStats.balance)}
                    </p>
                    <p className="text-xs text-fluent-text-secondary">{financialStats.transactions} transações</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-fluent-green" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="athletes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="fluent-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Distribuição por Status</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportReport('athletes')} data-testid="button-export-athletes">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fluent-text-secondary">Ativos</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-fluent-green h-2 rounded-full" 
                          style={{ width: `${(athleteStats.active / athleteStats.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{athleteStats.active}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fluent-text-secondary">Lesionados</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-fluent-red h-2 rounded-full" 
                          style={{ width: `${(athleteStats.injured / athleteStats.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{athleteStats.injured}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fluent-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Atletas por Categoria</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportReportByCategory('all')} data-testid="button-export-athletes-all-categories">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Todas
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(athleteStats.byCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-fluent-text-secondary">{category}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleExportReportByCategory(category)}
                        data-testid={`button-export-category-${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="fluent-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Treinos por Tipo</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportReport('training')} data-testid="button-export-training">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(trainingStats.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-fluent-text-secondary">
                        {type === "physical" ? "Físico" :
                         type === "technical" ? "Técnico" :
                         type === "tactical" ? "Tático" : "Psicológico"}
                      </span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="fluent-shadow">
              <CardHeader>
                <CardTitle>Treinos por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(trainingStats.byCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm text-fluent-text-secondary">{category}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="games" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="fluent-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Performance Geral</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportReport('games')} data-testid="button-export-games">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-fluent-text">{gameStats.total}</p>
                    <p className="text-sm text-fluent-text-secondary">Total de Jogos</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-fluent-green">{gameStats.wins}</p>
                      <p className="text-xs text-fluent-text-secondary">Vitórias</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-yellow-600">{gameStats.draws}</p>
                      <p className="text-xs text-fluent-text-secondary">Empates</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-fluent-red">{gameStats.losses}</p>
                      <p className="text-xs text-fluent-text-secondary">Derrotas</p>
                    </div>
                  </div>
                  {gameStats.total > 0 && (
                    <div className="text-center pt-4 border-t">
                      <p className="text-sm text-fluent-text-secondary">
                        Taxa de Vitórias: {Math.round((gameStats.wins / gameStats.total) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="fluent-shadow">
              <CardHeader>
                <CardTitle>Performance por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(gameStats.byCategory).map(([category, stats]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm text-fluent-text-secondary">{category}</span>
                      <div className="text-right">
                        <Badge variant="outline">
                          {stats.wins}/{stats.games}
                        </Badge>
                        <p className="text-xs text-fluent-text-secondary">
                          {stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="wellness" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="fluent-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Indicadores de Bem-estar</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportReport('wellness')} data-testid="button-export-wellness">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fluent-text-secondary">Humor Médio</span>
                    <span className="text-lg font-bold text-fluent-text">{wellnessStats.avgMood}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fluent-text-secondary">Sono Médio (horas)</span>
                    <span className="text-lg font-bold text-fluent-text">{wellnessStats.avgSleep}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fluent-text-secondary">Alertas</span>
                    <Badge className={wellnessStats.alertCount > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                      {wellnessStats.alertCount}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fluent-text-secondary">Total de Entradas</span>
                    <span className="text-lg font-bold text-fluent-text">{wellnessStats.entries}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fluent-shadow">
              <CardHeader>
                <CardTitle>Tendências</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <TrendingUp className="w-8 h-8 mx-auto text-fluent-blue mb-2" />
                    <p className="text-sm text-fluent-text-secondary">
                      Análise de tendências seria implementada aqui com gráficos temporais
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="fluent-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Resumo Financeiro</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExportReport('financial')} data-testid="button-export-financial">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fluent-text-secondary">Receitas</span>
                    <span className="text-lg font-bold text-fluent-green">
                      {formatCurrency(financialStats.income)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fluent-text-secondary">Despesas</span>
                    <span className="text-lg font-bold text-fluent-red">
                      {formatCurrency(financialStats.expenses)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-sm font-medium text-fluent-text">Saldo</span>
                    <span className={`text-xl font-bold ${financialStats.balance >= 0 ? 'text-fluent-green' : 'text-fluent-red'}`}>
                      {formatCurrency(financialStats.balance)}
                    </span>
                  </div>
                  <div className="text-center text-sm text-fluent-text-secondary">
                    {financialStats.transactions} transações no período
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="fluent-shadow">
              <CardHeader>
                <CardTitle>Indicadores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <PieChart className="w-8 h-8 mx-auto text-fluent-blue mb-2" />
                    <p className="text-sm text-fluent-text-secondary">
                      Gráfico de distribuição de receitas e despesas por categoria seria implementado aqui
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
