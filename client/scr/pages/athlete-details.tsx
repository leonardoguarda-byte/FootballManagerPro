import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  School, 
  FileText, 
  Download,
  Edit,
  ArrowLeft,
  Users,
  Trophy,
  Activity,
  Heart,
  DollarSign
} from "lucide-react";
import AthleteForm from "@/components/athletes/athlete-form";

export default function AthleteDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: athlete, isLoading } = useQuery({
    queryKey: ["/api/athletes", id],
    queryFn: async () => {
      const response = await fetch(`/api/athletes/${id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao carregar atleta");
      }
      return response.json();
    },
    retry: false,
  });

  const { data: team } = useQuery({
    queryKey: ["/api/teams", athlete?.teamId],
    queryFn: async () => {
      if (!athlete?.teamId) return null;
      const response = await fetch(`/api/teams/${athlete.teamId}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!athlete?.teamId,
    retry: false,
  });

  const { data: medicalRecords } = useQuery({
    queryKey: ["/api/medical-records", "athlete", id],
    queryFn: async () => {
      const response = await fetch(`/api/medical-records?athleteId=${id}`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    retry: false,
  });

  const { data: wellnessEntries } = useQuery({
    queryKey: ["/api/wellness-entries", "athlete", id],
    queryFn: async () => {
      const response = await fetch(`/api/wellness-entries?athleteId=${id}`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Atleta não encontrado</h2>
          <p className="text-gray-600 mt-2">O atleta solicitado não existe ou foi removido.</p>
          <Button 
            onClick={() => setLocation("/athletes")} 
            className="mt-4"
          >
            Voltar para Atletas
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "injured": return "bg-red-100 text-red-800";
      case "suspended": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Ativo";
      case "inactive": return "Inativo";
      case "injured": return "Lesionado";
      case "suspended": return "Suspenso";
      default: return status;
    }
  };

  const formatDominantFoot = (foot: string) => {
    switch (foot) {
      case "right": return "Destro";
      case "left": return "Canhoto";
      case "both": return "Ambidestro";
      default: return foot;
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/athletes")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-fluent-text">
              {athlete.firstName} {athlete.lastName}
            </h1>
            <p className="text-gray-600">{athlete.position} - {Array.isArray(athlete.category) ? athlete.category.join(', ') : athlete.category}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(athlete.status)}>
            {getStatusText(athlete.status)}
          </Badge>
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Edit className="h-4 w-4" />
                <span>Editar</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Atleta</DialogTitle>
              </DialogHeader>
              <AthleteForm 
                athlete={athlete}
                onSuccess={() => {
                  setShowEditDialog(false);
                  window.location.reload();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informações Pessoais</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {athlete.profilePhoto && (
              <div className="flex justify-center mb-4">
                <img 
                  src={athlete.profilePhoto} 
                  alt={`${athlete.firstName} ${athlete.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {new Date(athlete.dateOfBirth).toLocaleDateString('pt-BR')} 
                  ({calculateAge(athlete.dateOfBirth)} anos)
                </span>
              </div>
              
              {athlete.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{athlete.phone}</span>
                </div>
              )}
              
              {athlete.address && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{athlete.address}</span>
                </div>
              )}
              
              {team && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{team.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sports Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Informações Esportivas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Posição:</span>
                <p>{athlete.position}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Categoria:</span>
                <p>{Array.isArray(athlete.category) ? athlete.category.join(', ') : athlete.category}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Pé Dominante:</span>
                <p>{formatDominantFoot(athlete.dominantFoot)}</p>
              </div>
              {athlete.jerseyNumber && (
                <div>
                  <span className="font-medium text-gray-700">Camisa:</span>
                  <p>#{athlete.jerseyNumber}</p>
                </div>
              )}
              {athlete.height && (
                <div>
                  <span className="font-medium text-gray-700">Altura:</span>
                  <p>{athlete.height} cm</p>
                </div>
              )}
              {athlete.weight && (
                <div>
                  <span className="font-medium text-gray-700">Peso:</span>
                  <p>{athlete.weight} kg</p>
                </div>
              )}
            </div>
            
            {(athlete.contractStart || athlete.contractEnd) && (
              <>
                <Separator />
                <div>
                  <span className="font-medium text-gray-700">Contrato:</span>
                  <p className="text-sm">
                    {athlete.contractStart && new Date(athlete.contractStart).toLocaleDateString('pt-BR')}
                    {athlete.contractStart && athlete.contractEnd && " - "}
                    {athlete.contractEnd && new Date(athlete.contractEnd).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Documentos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {athlete.identityDocument && (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">Documento de Identidade</span>
                <Button size="sm" variant="ghost" asChild>
                  <a href={athlete.identityDocument} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}
            
            {athlete.birthCertificate && (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">Certidão de Nascimento</span>
                <Button size="sm" variant="ghost" asChild>
                  <a href={athlete.birthCertificate} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}
            
            {athlete.addressProof && (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">Comprovante de Endereço</span>
                <Button size="sm" variant="ghost" asChild>
                  <a href={athlete.addressProof} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}
            
            {athlete.medicalCertificate && (
              <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                <span className="text-sm font-medium text-green-800">Atestado Médico</span>
                <Button size="sm" variant="ghost" asChild>
                  <a href={athlete.medicalCertificate} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 text-green-600" />
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emergency Contact & School */}
      {(athlete.emergencyContact || athlete.schoolName) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {athlete.emergencyContact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Contato de Emergência</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{athlete.emergencyContact}</p>
                {athlete.emergencyPhone && (
                  <p className="text-sm text-gray-600">{athlete.emergencyPhone}</p>
                )}
              </CardContent>
            </Card>
          )}
          
          {athlete.schoolName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <School className="h-5 w-5" />
                  <span>Informações Escolares</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{athlete.schoolName}</p>
                {athlete.schoolGrade && (
                  <p className="text-sm text-gray-600">{athlete.schoolGrade}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button 
          variant="outline" 
          className="h-20 flex flex-col items-center justify-center space-y-2"
          onClick={() => setLocation(`/medical?athleteId=${id}`)}
        >
          <Heart className="h-6 w-6 text-red-500" />
          <span className="text-sm">Registros Médicos</span>
          {medicalRecords && medicalRecords.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {medicalRecords.length}
            </Badge>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          className="h-20 flex flex-col items-center justify-center space-y-2"
          onClick={() => setLocation(`/wellness?athleteId=${id}`)}
        >
          <Activity className="h-6 w-6 text-blue-500" />
          <span className="text-sm">Bem-estar</span>
          {wellnessEntries && wellnessEntries.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {wellnessEntries.length}
            </Badge>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          className="h-20 flex flex-col items-center justify-center space-y-2"
          onClick={() => setLocation(`/training?athleteId=${id}`)}
        >
          <Trophy className="h-6 w-6 text-yellow-500" />
          <span className="text-sm">Treinamentos</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="h-20 flex flex-col items-center justify-center space-y-2"
          onClick={() => setLocation(`/games?athleteId=${id}`)}
        >
          <Users className="h-6 w-6 text-green-500" />
          <span className="text-sm">Jogos</span>
        </Button>
      </div>

      {/* Notes */}
      {athlete.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{athlete.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}