import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Calendar, TrendingUp, Heart, Moon, Brain, Zap } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WellnessDetailsProps {
  athleteId?: number;
}

export default function WellnessDetails({ athleteId }: WellnessDetailsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedAthlete, setSelectedAthlete] = useState<string>(athleteId?.toString() || "all");

  const today = new Date();
  const startDate = format(subDays(today, parseInt(selectedPeriod)), 'yyyy-MM-dd');
  const endDate = format(today, 'yyyy-MM-dd');

  const { data: wellnessEntries, isLoading } = useQuery({
    queryKey: ["/api/wellness-entries", { 
      athleteId: selectedAthlete !== "all" ? parseInt(selectedAthlete) : undefined,
      startDate, 
      endDate 
    }],
    retry: false,
  });

  const { data: athletes } = useQuery({
    queryKey: ["/api/athletes"],
    retry: false,
  });

  const selectedAthleteData = athletes?.find((a: any) => a.id.toString() === selectedAthlete);

  // Preparar dados para gráficos
  const chartData = wellnessEntries?.map((entry: any) => ({
    date: format(parseISO(entry.date), 'dd/MM', { locale: ptBR }),
    fullDate: entry.date,
    rpe: entry.rpe,
    sleepQuality: entry.sleepQuality,
    sleepHours: parseFloat(entry.sleepHours || 0),
    fatigueLevel: entry.fatigueLevel,
    stressLevel: entry.stressLevel,
    mood: entry.mood,
    injuryStatus: entry.injuryStatus ? 1 : 0,
  })) || [];

  // Dados para gráfico radar da última entrada
  const latestEntry = wellnessEntries?.[0];
  const radarData = latestEntry ? [
    { metric: 'Sono', value: latestEntry.sleepQuality, fullMark: 10 },
    { metric: 'Humor', value: latestEntry.mood, fullMark: 10 },
    { metric: 'Fadiga', value: 10 - latestEntry.fatigueLevel, fullMark: 10 }, // Invertido para melhor visualização
    { metric: 'Estresse', value: 10 - latestEntry.stressLevel, fullMark: 10 }, // Invertido
    { metric: 'RPE', value: 10 - latestEntry.rpe, fullMark: 10 }, // Invertido
  ] : [];

  // Estatísticas calculadas
  const stats = {
    avgRPE: chartData.length > 0 ? (chartData.reduce((sum, entry) => sum + entry.rpe, 0) / chartData.length).toFixed(1) : '0',
    avgSleep: chartData.length > 0 ? (chartData.reduce((sum, entry) => sum + entry.sleepQuality, 0) / chartData.length).toFixed(1) : '0',
    avgSleepHours: chartData.length > 0 ? (chartData.reduce((sum, entry) => sum + entry.sleepHours, 0) / chartData.length).toFixed(1) : '0',
    avgMood: chartData.length > 0 ? (chartData.reduce((sum, entry) => sum + entry.mood, 0) / chartData.length).toFixed(1) : '0',
    injuryDays: chartData.filter(entry => entry.injuryStatus === 1).length,
    totalEntries: chartData.length,
  };

  const getRPEColor = (rpe: number) => {
    if (rpe <= 6) return "text-green-600";
    if (rpe <= 8) return "text-yellow-600";
    return "text-red-600";
  };

  const getMoodColor = (mood: number) => {
    if (mood >= 8) return "text-green-600";
    if (mood >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fluent-text">Carregando detalhes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-fluent-text">Atleta:</label>
          <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione um atleta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os atletas</SelectItem>
              {athletes?.map((athlete: any) => (
                <SelectItem key={athlete.id} value={athlete.id.toString()}>
                  {athlete.firstName} {athlete.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-fluent-text">Período:</label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedAthleteData && (
        <Card className="fluent-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Atleta: {selectedAthleteData.firstName} {selectedAthleteData.lastName}</span>
              <Badge variant="outline">{selectedAthleteData.position}</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="fluent-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-fluent-text-secondary">RPE Médio</p>
                <p className={`text-lg font-bold ${getRPEColor(parseFloat(stats.avgRPE))}`}>
                  {stats.avgRPE}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fluent-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Moon className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-fluent-text-secondary">Sono (Qualidade)</p>
                <p className="text-lg font-bold text-fluent-text">{stats.avgSleep}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fluent-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <div>
                <p className="text-sm text-fluent-text-secondary">Horas de Sono</p>
                <p className="text-lg font-bold text-fluent-text">{stats.avgSleepHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fluent-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-fluent-text-secondary">Humor Médio</p>
                <p className={`text-lg font-bold ${getMoodColor(parseFloat(stats.avgMood))}`}>
                  {stats.avgMood}/10
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fluent-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Heart className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-fluent-text-secondary">Dias c/ Lesão</p>
                <p className="text-lg font-bold text-red-600">{stats.injuryDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fluent-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-fluent-text-secondary">Total Entradas</p>
                <p className="text-lg font-bold text-fluent-text">{stats.totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de RPE e Humor */}
        <Card className="fluent-shadow">
          <CardHeader>
            <CardTitle>RPE e Humor ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip 
                  labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0) {
                      return format(parseISO(payload[0].payload.fullDate), "dd 'de' MMMM", { locale: ptBR });
                    }
                    return label;
                  }}
                />
                <Line type="monotone" dataKey="rpe" stroke="#8b5cf6" strokeWidth={2} name="RPE" />
                <Line type="monotone" dataKey="mood" stroke="#10b981" strokeWidth={2} name="Humor" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Sono */}
        <Card className="fluent-shadow">
          <CardHeader>
            <CardTitle>Qualidade e Horas de Sono</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0) {
                      return format(parseISO(payload[0].payload.fullDate), "dd 'de' MMMM", { locale: ptBR });
                    }
                    return label;
                  }}
                />
                <Bar dataKey="sleepQuality" fill="#3b82f6" name="Qualidade (1-10)" />
                <Bar dataKey="sleepHours" fill="#06b6d4" name="Horas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Fadiga e Estresse */}
        <Card className="fluent-shadow">
          <CardHeader>
            <CardTitle>Fadiga e Estresse</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip 
                  labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0) {
                      return format(parseISO(payload[0].payload.fullDate), "dd 'de' MMMM", { locale: ptBR });
                    }
                    return label;
                  }}
                />
                <Line type="monotone" dataKey="fatigueLevel" stroke="#f59e0b" strokeWidth={2} name="Fadiga" />
                <Line type="monotone" dataKey="stressLevel" stroke="#ef4444" strokeWidth={2} name="Estresse" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Radar da Última Entrada */}
        {latestEntry && (
          <Card className="fluent-shadow">
            <CardHeader>
              <CardTitle>Perfil Atual - {format(parseISO(latestEntry.date), "dd 'de' MMMM", { locale: ptBR })}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} />
                  <Radar
                    name="Wellness"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lista de Entradas Detalhadas */}
      <Card className="fluent-shadow">
        <CardHeader>
          <CardTitle>Histórico Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {wellnessEntries?.slice(0, 10).map((entry: any) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-center">
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Data</p>
                    <p className="text-sm text-fluent-text">
                      {format(parseISO(entry.date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">RPE</p>
                    <Badge className={getRPEColor(entry.rpe)}>{entry.rpe}/10</Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Sono</p>
                    <p className="text-sm text-fluent-text">{entry.sleepQuality}/10</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Horas</p>
                    <p className="text-sm text-fluent-text">{entry.sleepHours}h</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Humor</p>
                    <Badge className={getMoodColor(entry.mood)}>{entry.mood}/10</Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Fadiga</p>
                    <p className="text-sm text-fluent-text">{entry.fatigueLevel}/10</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-fluent-text-secondary">Lesão</p>
                    <Badge variant={entry.injuryStatus ? "destructive" : "secondary"}>
                      {entry.injuryStatus ? "Sim" : "Não"}
                    </Badge>
                  </div>
                </div>
                
                {entry.soreness && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-sm font-medium text-fluent-text-secondary">Dores:</p>
                    <p className="text-sm text-fluent-text">{entry.soreness}</p>
                  </div>
                )}
                
                {entry.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-sm font-medium text-fluent-text-secondary">Observações:</p>
                    <p className="text-sm text-fluent-text">{entry.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}