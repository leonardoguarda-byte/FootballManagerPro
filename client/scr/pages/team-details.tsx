import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Users, Trophy, MapPin, Calendar, Phone, Mail, Edit, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import TeamForm from "@/components/teams/team-form";
import AthleteForm from "@/components/athletes/athlete-form";
import { useState } from "react";

export default function TeamDetails() {
  const { id } = useParams();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false);
  
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: [`/api/teams/${id}`],
    enabled: !!id,
  });

  const { data: athletes = [] } = useQuery({
    queryKey: ["/api/athletes"],
  });

  // Filtrar atletas da equipe
  const teamAthletes = athletes.filter((athlete: any) => athlete.teamId === parseInt(id || "0"));

  if (teamLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="text-fluent-text-secondary">Carregando detalhes da equipe...</div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="text-fluent-text-secondary">Equipe não encontrada</div>
          <Link href="/teams">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar às Equipes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/teams">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-fluent-text flex items-center gap-3">
              <Trophy className="w-8 h-8 text-blue-600" />
              {team.name}
            </h1>
            <p className="text-fluent-text-secondary mt-1">{team.category}</p>
          </div>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              Editar Equipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Equipe</DialogTitle>
            </DialogHeader>
            <TeamForm
              team={team}
              onSuccess={() => {
                setIsEditDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Informações da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-fluent-text-secondary">Categoria</label>
                <p className="text-fluent-text">{team.category}</p>
              </div>
              {team.ageGroup && (
                <div>
                  <label className="text-sm font-medium text-fluent-text-secondary">Faixa Etária</label>
                  <p className="text-fluent-text">{team.ageGroup}</p>
                </div>
              )}
            </div>

            {team.description && (
              <div>
                <label className="text-sm font-medium text-fluent-text-secondary">Descrição</label>
                <p className="text-fluent-text mt-1">{team.description}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Badge variant={team.isActive ? "default" : "secondary"}>
                {team.isActive ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Staff Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Comissão Técnica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {team.coachName && (
              <div>
                <label className="text-sm font-medium text-fluent-text-secondary">Treinador Principal</label>
                <p className="text-fluent-text">{team.coachName}</p>
              </div>
            )}
            {team.assistantCoachName && (
              <div>
                <label className="text-sm font-medium text-fluent-text-secondary">Treinador Auxiliar</label>
                <p className="text-fluent-text">{team.assistantCoachName}</p>
              </div>
            )}
            {!team.coachName && !team.assistantCoachName && (
              <p className="text-fluent-text-secondary italic">Nenhum membro da comissão técnica cadastrado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Athletes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Atletas da Equipe ({teamAthletes.length})
              </CardTitle>
              <CardDescription>
                Lista completa dos atletas vinculados a esta equipe
              </CardDescription>
            </div>
            <Dialog open={isAddPlayerDialogOpen} onOpenChange={setIsAddPlayerDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Jogador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Jogador</DialogTitle>
                </DialogHeader>
                <AthleteForm
                  defaultTeamId={parseInt(id || "0")}
                  clubId={team?.clubId}
                  seasonId={team?.seasonId}
                  onSuccess={() => {
                    setIsAddPlayerDialogOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {teamAthletes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamAthletes.map((athlete: any) => (
                <div key={athlete.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-blue-100">
                    {athlete.profilePhoto ? (
                      <img 
                        src={athlete.profilePhoto} 
                        alt={`${athlete.firstName} ${athlete.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-600 font-medium">
                        {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-fluent-text">
                      {athlete.firstName} {athlete.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-fluent-text-secondary">{athlete.position}</span>
                      {athlete.jerseyNumber && (
                        <Badge variant="outline" className="text-xs">
                          #{athlete.jerseyNumber}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-fluent-text-secondary">Nenhum atleta vinculado a esta equipe</p>
              <Link href="/athletes">
                <Button variant="outline" className="mt-4">
                  Gerenciar Atletas
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{teamAthletes.length}</div>
            <p className="text-sm text-fluent-text-secondary">Total de Atletas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {teamAthletes.filter((a: any) => a.status === 'active').length}
            </div>
            <p className="text-sm text-fluent-text-secondary">Atletas Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {teamAthletes.filter((a: any) => a.jerseyNumber).length}
            </div>
            <p className="text-sm text-fluent-text-secondary">Com Número</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(teamAthletes.map((a: any) => a.position)).size}
            </div>
            <p className="text-sm text-fluent-text-secondary">Posições</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}