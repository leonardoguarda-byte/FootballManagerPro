import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Stethoscope, AlertTriangle, Calendar, User, Clock, FileText, Image, Download } from "lucide-react";
import MedicalFormNew from "@/components/medical/medical-form-new";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Medical() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const { toast } = useToast();

  const { data: medicalRecords, isLoading } = useQuery({
    queryKey: ["/api/medical-records", selectedAthlete ? { athleteId: selectedAthlete } : {}],
    retry: false,
  });

  const { data: athletes } = useQuery({
    queryKey: ["/api/athletes"],
    retry: false,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log("Deleting medical record with ID:", id);
      try {
        const result = await apiRequest(`/api/medical-records/${id}`, "DELETE");
        console.log("Delete result:", result);
        return result;
      } catch (error) {
        console.error("Delete error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
      toast({
        title: "Sucesso",
        description: "Registro médico excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Delete mutation error:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir registro médico.",
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleDeleteRecord = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este registro médico?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingRecord(null);
  };

  const getFilteredRecords = () => {
    if (!medicalRecords) return [];
    return selectedAthlete 
      ? medicalRecords.filter((record: any) => record.athleteId.toString() === selectedAthlete)
      : medicalRecords;
  };

  const getFileIcon = (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    return imageExtensions.includes(extension || '') ? Image : FileText;
  };

  const handleFileDownload = (filePath: string) => {
    const fileName = filePath.split('/').pop() || 'file';
    const downloadUrl = `/uploads/${filePath}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMedicalStats = () => {
    if (!medicalRecords || !athletes) {
      return { activeInjuries: 0, totalRecords: 0, athletesWithInjuries: 0, pendingFollowUps: 0 };
    }

    const activeInjuries = medicalRecords.filter((record: any) => 
      record.type === "injury" && record.status === "active"
    ).length;

    const athletesWithActiveInjuries = new Set(
      medicalRecords
        .filter((record: any) => record.type === "injury" && record.status === "active")
        .map((record: any) => record.athleteId)
    ).size;

    const today = new Date();
    const pendingFollowUps = medicalRecords.filter((record: any) => 
      record.followUpDate && new Date(record.followUpDate) <= today
    ).length;

    return {
      activeInjuries,
      totalRecords: medicalRecords.length,
      athletesWithInjuries: athletesWithActiveInjuries,
      pendingFollowUps,
    };
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "injury":
        return <Badge className="bg-red-100 text-red-800">Lesão</Badge>;
      case "medical_exam":
        return <Badge className="bg-blue-100 text-blue-800">Exame</Badge>;
      case "treatment":
        return <Badge className="bg-green-100 text-green-800">Tratamento</Badge>;
      case "clearance":
        return <Badge className="bg-purple-100 text-purple-800">Liberação</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-red-100 text-red-800">Ativo</Badge>;
      case "recovering":
        return <Badge className="bg-yellow-100 text-yellow-800">Recuperando</Badge>;
      case "cleared":
        return <Badge className="bg-green-100 text-green-800">Liberado</Badge>;
      case "chronic":
        return <Badge className="bg-orange-100 text-orange-800">Crônico</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "low":
        return <Badge className="bg-green-100 text-green-800">Baixa</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Média</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800">Alta</Badge>;
      case "critical":
        return <Badge className="bg-red-100 text-red-800">Crítica</Badge>;
      default:
        return null;
    }
  };

  const stats = getMedicalStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fluent-text">Departamento Médico</h1>
          <p className="text-fluent-text-secondary mt-1">Gestão da saúde e lesões dos atletas</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-fluent-blue hover:bg-fluent-blue-dark text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRecord ? "Editar Registro Médico" : "Novo Registro Médico"}
              </DialogTitle>
            </DialogHeader>
            <MedicalFormNew 
              initialData={editingRecord} 
              onSuccess={handleFormClose} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="fluent-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fluent-text-secondary">Lesões Ativas</p>
                <p className="text-2xl font-bold text-fluent-red">{stats.activeInjuries}</p>
                <p className="text-xs text-fluent-text-secondary">Requer atenção</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-fluent-red" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fluent-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fluent-text-secondary">Atletas Afetados</p>
                <p className="text-2xl font-bold text-orange-600">{stats.athletesWithInjuries}</p>
                <p className="text-xs text-fluent-text-secondary">Com lesões ativas</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fluent-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fluent-text-secondary">Total de Registros</p>
                <p className="text-2xl font-bold text-fluent-text">{stats.totalRecords}</p>
                <p className="text-xs text-fluent-text-secondary">Histórico completo</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-fluent-blue" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fluent-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fluent-text-secondary">Retornos Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingFollowUps}</p>
                <p className="text-xs text-fluent-text-secondary">Follow-ups</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="fluent-shadow">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-fluent-text-secondary mb-2">
                Filtrar por Atleta
              </label>
              <select
                value={selectedAthlete}
                onChange={(e) => setSelectedAthlete(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Todos os atletas</option>
                {athletes?.map((athlete: any) => (
                  <option key={athlete.id} value={athlete.id.toString()}>
                    {athlete.firstName} {athlete.lastName} - {athlete.category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical Records */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-fluent-text-secondary">Carregando registros médicos...</div>
        </div>
      ) : getFilteredRecords().length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {getFilteredRecords().map((record: any) => {
            const athlete = athletes?.find((a: any) => a.id === record.athleteId);
            return (
              <Card key={record.id} className="fluent-shadow hover:fluent-shadow-hover transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-fluent-text">{record.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        {getTypeBadge(record.type)}
                        {record.status && getStatusBadge(record.status)}
                        {record.severity && getSeverityBadge(record.severity)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRecord(record)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Excluir
                        </Button>
                      </div>
                      <p className="text-sm font-medium text-fluent-text">
                        {athlete?.firstName} {athlete?.lastName}
                      </p>
                      <p className="text-xs text-fluent-text-secondary">{athlete?.category}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-fluent-text-secondary">
                      <Calendar className="w-4 h-4 mr-2" />
                      {format(new Date(record.date), 'dd/MM/yyyy')}
                    </div>
                    
                    {record.bodyPart && (
                      <div className="flex items-center text-sm text-fluent-text-secondary">
                        <span className="font-medium">Área afetada:</span>
                        <span className="ml-2">{record.bodyPart}</span>
                      </div>
                    )}

                    {record.doctorName && (
                      <div className="flex items-center text-sm text-fluent-text-secondary">
                        <Stethoscope className="w-4 h-4 mr-2" />
                        Dr. {record.doctorName}
                      </div>
                    )}

                    {record.description && (
                      <p className="text-sm text-fluent-text-secondary">
                        {record.description}
                      </p>
                    )}

                    {record.doctorNotes && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-fluent-text mb-1">Observações Médicas:</p>
                        <p className="text-sm text-fluent-text-secondary">{record.doctorNotes}</p>
                      </div>
                    )}

                    {/* Seção de Arquivos Anexados */}
                    {record.attachments && record.attachments.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-sm font-medium text-fluent-text mb-3">Arquivos Anexados:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {record.attachments.map((filePath: string, index: number) => {
                            const IconComponent = getFileIcon(filePath);
                            const fileName = filePath.split('/').pop() || filePath;
                            const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(filePath.split('.').pop()?.toLowerCase() || '');
                            
                            return (
                              <div key={index} className="group relative bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                                <div className="flex flex-col items-center space-y-2">
                                  {isImage ? (
                                    <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-200">
                                      <img 
                                        src={`/uploads/${filePath}`} 
                                        alt={fileName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          e.currentTarget.nextElementSibling!.style.display = 'flex';
                                        }}
                                      />
                                      <div className="w-full h-full hidden items-center justify-center">
                                        <IconComponent className="w-8 h-8 text-gray-400" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 bg-blue-100 rounded-md flex items-center justify-center">
                                      <IconComponent className="w-8 h-8 text-blue-600" />
                                    </div>
                                  )}
                                  <div className="text-center">
                                    <p className="text-xs text-gray-700 truncate max-w-full" title={fileName}>
                                      {fileName.length > 15 ? `${fileName.substring(0, 12)}...` : fileName}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleFileDownload(filePath)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(record.estimatedRecovery || record.actualRecovery || record.followUpDate) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                        {record.estimatedRecovery && (
                          <div>
                            <p className="text-xs text-fluent-text-secondary">Recuperação Estimada</p>
                            <p className="text-sm font-medium text-fluent-text">
                              {record.estimatedRecovery} dias
                            </p>
                          </div>
                        )}
                        {record.actualRecovery && (
                          <div>
                            <p className="text-xs text-fluent-text-secondary">Recuperação Real</p>
                            <p className="text-sm font-medium text-fluent-text">
                              {record.actualRecovery} dias
                            </p>
                          </div>
                        )}
                        {record.followUpDate && (
                          <div>
                            <p className="text-xs text-fluent-text-secondary">Próximo Retorno</p>
                            <p className="text-sm font-medium text-fluent-text">
                              {format(new Date(record.followUpDate), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="fluent-shadow">
          <CardContent className="p-8 text-center">
            <div className="text-fluent-text-secondary">
              {selectedAthlete 
                ? "Nenhum registro médico encontrado para este atleta."
                : "Nenhum registro médico encontrado. Comece criando um novo registro."
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
