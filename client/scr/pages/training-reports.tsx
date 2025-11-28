import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Users, Star, Calendar, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TrainingReport {
  sessionId: number;
  sessionTitle: string;
  sessionDate: string;
  hasAttendance: boolean;
  evaluationCount: number;
  lastUpdated: string | null;
}

interface DetailedReport {
  session: any;
  attendance: any;
  evaluations: any[];
  athletes: any[];
  generatedAt: string;
}

export default function TrainingReports() {
  const [selectedReport, setSelectedReport] = useState<number | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["/api/training-reports"],
    queryFn: async () => {
      const response = await fetch("/api/training-reports", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
  });

  const { data: detailedReport } = useQuery({
    queryKey: ["/api/training-reports", selectedReport],
    queryFn: async () => {
      if (!selectedReport) return null;
      const response = await fetch(`/api/training-reports/${selectedReport}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch detailed report");
      return response.json();
    },
    enabled: !!selectedReport,
  });

  const getAttendanceStats = (attendanceData: any) => {
    if (!attendanceData || !attendanceData.attendanceData) return { present: 0, absent: 0 };
    
    const attendance = attendanceData.attendanceData;
    let present = 0;
    let absent = 0;
    
    Object.values(attendance).forEach((status: any) => {
      if (status === "present") present++;
      else if (status === "absent") absent++;
    });
    
    return { present, absent };
  };

  const getAthleteNameById = (athleteId: number, athletes: any[]) => {
    const athlete = athletes.find(a => a.id === athleteId);
    return athlete ? `${athlete.firstName} ${athlete.lastName}` : "Atleta não encontrado";
  };

  const getEvaluationAverage = (evaluation: any) => {
    const scores = [
      evaluation.technicalSkills,
      evaluation.physicalPerformance,
      evaluation.tacticalUnderstanding,
      evaluation.teamwork,
      evaluation.attitude
    ].filter(score => score !== null && score !== undefined);
    
    if (scores.length === 0) return 0;
    return (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando relatórios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Relatórios de Treino</h1>
      </div>

      <div className="grid gap-4">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum relatório encontrado
              </h3>
              <p className="text-gray-600">
                Os relatórios serão gerados automaticamente quando você marcar presença ou fazer avaliações nos treinos.
              </p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report: TrainingReport) => (
            <Card key={report.sessionId} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{report.sessionTitle}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(report.sessionDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {report.hasAttendance && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Users className="h-3 w-3 mr-1" />
                        Presença
                      </Badge>
                    )}
                    {report.evaluationCount > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Star className="h-3 w-3 mr-1" />
                        {report.evaluationCount} Avaliações
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {report.lastUpdated && (
                      <span>
                        Última atualização: {format(new Date(report.lastUpdated), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <Button 
                    onClick={() => setSelectedReport(report.sessionId)}
                    disabled={!report.hasAttendance && report.evaluationCount === 0}
                  >
                    Ver Relatório
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detailed Report Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailedReport?.session?.title || "Relatório do Treino"}
            </DialogTitle>
          </DialogHeader>

          {detailedReport && (
            <div className="space-y-6">
              {/* Training Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações do Treino</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Data</p>
                      <p>{format(new Date(detailedReport.session.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Categoria</p>
                      <p>{detailedReport.session.category}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-600">Descrição</p>
                      <p>{detailedReport.session.description || "Sem descrição"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance */}
              {detailedReport.attendance?.attendanceData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Lista de Presença
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const stats = getAttendanceStats(detailedReport.attendance);
                      return (
                        <>
                          <div className="flex gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm">Presentes: {stats.present}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm">Ausentes: {stats.absent}</span>
                            </div>
                          </div>
                          <Separator className="my-4" />
                          <div className="grid gap-2">
                            {Object.entries(detailedReport.attendance.attendanceData).map(([athleteId, status]: [string, any]) => {
                              const athleteName = getAthleteNameById(parseInt(athleteId), detailedReport.athletes);
                              return (
                                <div key={athleteId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span>{athleteName}</span>
                                  <div className="flex items-center gap-2">
                                    {status === "present" ? (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Presente
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Ausente
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Evaluations */}
              {detailedReport.evaluations && detailedReport.evaluations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Avaliações dos Atletas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailedReport.evaluations.map((evaluation: any, index: number) => {
                        const athleteName = getAthleteNameById(evaluation.athleteId, detailedReport.athletes);
                        const average = getEvaluationAverage(evaluation);
                        
                        return (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">{athleteName}</h4>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                Média: {average}/10
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-gray-600">Habilidades Técnicas:</span>
                                <span className="ml-2 font-medium">{evaluation.technicalSkills || "-"}/10</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Performance Física:</span>
                                <span className="ml-2 font-medium">{evaluation.physicalPerformance || "-"}/10</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Entendimento Tático:</span>
                                <span className="ml-2 font-medium">{evaluation.tacticalUnderstanding || "-"}/10</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Trabalho em Equipe:</span>
                                <span className="ml-2 font-medium">{evaluation.teamwork || "-"}/10</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Atitude:</span>
                                <span className="ml-2 font-medium">{evaluation.attitude || "-"}/10</span>
                              </div>
                            </div>
                            
                            {(evaluation.strengths || evaluation.improvements) && (
                              <div className="mt-3 pt-3 border-t">
                                {evaluation.strengths && (
                                  <div className="mb-2">
                                    <span className="text-sm font-medium text-green-700">Pontos Fortes:</span>
                                    <p className="text-sm text-gray-700 mt-1">{evaluation.strengths}</p>
                                  </div>
                                )}
                                {evaluation.improvements && (
                                  <div>
                                    <span className="text-sm font-medium text-orange-700">Melhorias:</span>
                                    <p className="text-sm text-gray-700 mt-1">{evaluation.improvements}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="text-center text-sm text-gray-500">
                Relatório gerado em {format(new Date(detailedReport.generatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}