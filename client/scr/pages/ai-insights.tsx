import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Brain, Target, TrendingUp, Users, AlertCircle, CheckCircle, Lightbulb } from "lucide-react";

interface AIInsight {
  type: 'performance' | 'training' | 'tactical' | 'individual' | 'team';
  title: string;
  insight: string;
  recommendations: string[];
  confidence: number;
  data_points: string[];
}

export default function AIInsights() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/ai/insights"],
    retry: false,
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/ai/generate-insights", "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/insights"] });
      toast({
        title: "Sucesso",
        description: "Insights de IA gerados com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao gerar insights. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-fluent-text-secondary">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return <TrendingUp className="w-5 h-5" />;
      case 'training':
        return <Target className="w-5 h-5" />;
      case 'tactical':
        return <Brain className="w-5 h-5" />;
      case 'individual':
        return <Users className="w-5 h-5" />;
      case 'team':
        return <Users className="w-5 h-5" />;
      default:
        return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return "Alta Confiança";
    if (confidence >= 0.6) return "Média Confiança";
    return "Baixa Confiança";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fluent-text">Insights de IA</h1>
          <p className="text-fluent-text-secondary mt-1">
            Análises inteligentes e recomendações baseadas em dados
          </p>
        </div>
        <Button
          onClick={() => generateInsightsMutation.mutate()}
          disabled={generateInsightsMutation.isPending}
          className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
        >
          <Brain className="w-4 h-4 mr-2" />
          {generateInsightsMutation.isPending ? "Gerando..." : "Gerar Insights"}
        </Button>
      </div>

      {/* Insights Grid */}
      {insightsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="fluent-shadow animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : insights && insights.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {insights.map((insight: AIInsight, index: number) => (
            <Card key={index} className="fluent-shadow hover:fluent-shadow-hover transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-blue-100 text-fluent-blue">
                      {getInsightIcon(insight.type)}
                    </div>
                    <CardTitle className="text-fluent-text">{insight.title}</CardTitle>
                  </div>
                  <Badge className={getConfidenceColor(insight.confidence)}>
                    {getConfidenceText(insight.confidence)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-fluent-text-secondary">{insight.insight}</p>
                
                {insight.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-fluent-text mb-2 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                      Recomendações
                    </h4>
                    <ul className="space-y-1">
                      {insight.recommendations.map((rec, recIndex) => (
                        <li key={recIndex} className="text-sm text-fluent-text-secondary flex items-start">
                          <span className="w-1.5 h-1.5 bg-fluent-blue rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insight.data_points.length > 0 && (
                  <div>
                    <h4 className="font-medium text-fluent-text mb-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1 text-blue-600" />
                      Pontos de Dados
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {insight.data_points.map((point, pointIndex) => (
                        <Badge key={pointIndex} variant="secondary" className="text-xs">
                          {point}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="fluent-shadow">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="w-12 h-12 text-fluent-text-secondary mb-4" />
            <h3 className="text-lg font-medium text-fluent-text mb-2">
              Nenhum insight disponível
            </h3>
            <p className="text-fluent-text-secondary text-center mb-6">
              Clique em "Gerar Insights" para analisar os dados do seu clube e receber
              recomendações inteligentes baseadas em IA.
            </p>
            <Button
              onClick={() => generateInsightsMutation.mutate()}
              disabled={generateInsightsMutation.isPending}
              className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
            >
              <Brain className="w-4 h-4 mr-2" />
              {generateInsightsMutation.isPending ? "Gerando..." : "Gerar Primeiros Insights"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}