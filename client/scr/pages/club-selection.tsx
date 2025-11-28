import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Calendar, Users, MoreVertical, Edit, Trash2, Trophy, MapPin, Globe } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface Club {
  id: number;
  name: string;
  shortName: string;
  description: string | null;
  foundedYear: number | null;
  country: string | null;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Season {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  clubId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ClubSelection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "administrador";
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [isEditingClub, setIsEditingClub] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [newClub, setNewClub] = useState({
    name: "",
    shortName: "",
    description: "",
    foundedYear: "",
    country: "",
    city: "",
    seasonType: "calendar" as "calendar" | "sport",
    badgeFile: null as File | null,
  });

  const { data: clubs, isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/clubs"],
  });

  const { data: seasons, isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ["/api/seasons", selectedClub?.id],
    queryFn: () => selectedClub ? apiRequest(`/api/seasons/${selectedClub.id}`) : Promise.resolve([]),
    enabled: !!selectedClub,
  });

  const createClubMutation = useMutation({
    mutationFn: async (clubData: FormData) => {
      const response = await fetch("/api/clubs", {
        method: "POST",
        body: clubData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Clube criado",
        description: "Clube criado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      setIsCreatingClub(false);
      setNewClub({
        name: "",
        shortName: "",
        description: "",
        foundedYear: "",
        country: "",
        city: "",
        seasonType: "calendar",
        badgeFile: null,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar clube. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateClubMutation = useMutation({
    mutationFn: async (clubData: FormData) => {
      const clubId = clubData.get('id');
      const response = await fetch(`/api/clubs/${clubId}`, {
        method: "PUT",
        body: clubData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Clube atualizado",
        description: "Clube atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/current-club"] });
      setIsEditingClub(false);
      setEditingClub(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar clube. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteClubMutation = useMutation({
    mutationFn: async (clubId: number) => {
      return apiRequest(`/api/clubs/${clubId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Clube excluído",
        description: "Clube excluído com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      setSelectedClub(null);
      setSelectedSeason(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir clube. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteAllClubsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/clubs", "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Todos os clubes excluídos",
        description: "Todos os clubes foram excluídos com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      setSelectedClub(null);
      setSelectedSeason(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir todos os clubes. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const selectClubMutation = useMutation({
    mutationFn: async ({ clubId, seasonId }: { clubId: number; seasonId: number }) => {
      return apiRequest("/api/user/select-club", "POST", { clubId, seasonId });
    },
    onSuccess: () => {
      toast({
        title: "Clube selecionado",
        description: "Clube e temporada selecionados com sucesso!",
      });
      // Reload the page to trigger the main app
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao selecionar clube. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleCreateClub = () => {
    const formData = new FormData();
    formData.append('name', newClub.name);
    formData.append('shortName', newClub.shortName);
    formData.append('description', newClub.description);
    if (newClub.foundedYear) {
      formData.append('foundedYear', newClub.foundedYear);
    }
    formData.append('country', newClub.country);
    formData.append('city', newClub.city);
    formData.append('seasonType', newClub.seasonType);
    formData.append('isActive', 'true');
    
    if (newClub.badgeFile) {
      formData.append('badge', newClub.badgeFile);
    }
    
    createClubMutation.mutate(formData);
  };

  const handleEditClub = (club: Club) => {
    setEditingClub(club);
    setNewClub({
      name: club.name,
      shortName: club.shortName,
      description: club.description || "",
      foundedYear: club.foundedYear?.toString() || "",
      country: club.country || "",
      city: club.city || "",
      seasonType: "calendar",
      badgeFile: null,
    });
    setIsEditingClub(true);
  };

  const handleUpdateClub = () => {
    if (!editingClub) return;
    
    const formData = new FormData();
    formData.append('id', editingClub.id.toString());
    formData.append('name', newClub.name);
    formData.append('shortName', newClub.shortName);
    formData.append('description', newClub.description);
    if (newClub.foundedYear) {
      formData.append('foundedYear', newClub.foundedYear);
    }
    formData.append('country', newClub.country);
    formData.append('city', newClub.city);
    
    if (newClub.badgeFile) {
      formData.append('badge', newClub.badgeFile);
    }
    
    updateClubMutation.mutate(formData);
  };

  const handleDeleteClub = (clubId: number) => {
    if (window.confirm("Tem certeza que deseja excluir este clube? Esta ação não pode ser desfeita.")) {
      deleteClubMutation.mutate(clubId);
    }
  };

  const handleSelectClub = () => {
    if (selectedClub && selectedSeason) {
      selectClubMutation.mutate({
        clubId: selectedClub.id,
        seasonId: selectedSeason.id,
      });
    }
  };

  if (clubsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando clubes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-6 shadow-lg">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Sistema de Gestão Esportiva
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Plataforma completa para gerenciamento de clubes, torneios e atletas
          </p>
        </div>

        <div className="space-y-8">
          {/* Club Selection */}
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-7 w-7 text-blue-600" />
                  </div>
                  Clubes Disponíveis
                </h2>
                <div className="flex gap-2">
                {isAdmin && clubs && clubs.length > 0 && (
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      if (window.confirm("Tem certeza que deseja excluir TODOS os clubes? Esta ação não pode ser desfeita e removerá todos os dados associados.")) {
                        deleteAllClubsMutation.mutate();
                      }
                    }}
                    disabled={deleteAllClubsMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteAllClubsMutation.isPending ? "Excluindo..." : "Excluir Todos"}
                  </Button>
                )}
                  {isAdmin && (
                    <Dialog open={isCreatingClub} onOpenChange={setIsCreatingClub}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Clube
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Novo Clube</DialogTitle>
                          <DialogDescription>
                            Preencha as informações do novo clube
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">Nome do Clube</Label>
                            <Input
                              id="name"
                              value={newClub.name}
                              onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                              placeholder="Ex: Futebol Clube Barcelona"
                            />
                          </div>
                          <div>
                            <Label htmlFor="shortName">Nome Curto</Label>
                            <Input
                              id="shortName"
                              value={newClub.shortName}
                              onChange={(e) => setNewClub({ ...newClub, shortName: e.target.value })}
                              placeholder="Ex: FCB"
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                              id="description"
                              value={newClub.description}
                              onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                              placeholder="Descrição do clube"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="foundedYear">Ano de Fundação</Label>
                              <Input
                                id="foundedYear"
                                type="number"
                                value={newClub.foundedYear}
                                onChange={(e) => setNewClub({ ...newClub, foundedYear: e.target.value })}
                                placeholder="1899"
                              />
                            </div>
                            <div>
                              <Label htmlFor="country">País</Label>
                              <Input
                                id="country"
                                value={newClub.country}
                                onChange={(e) => setNewClub({ ...newClub, country: e.target.value })}
                                placeholder="Brasil"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="city">Cidade</Label>
                            <Input
                              id="city"
                              value={newClub.city}
                              onChange={(e) => setNewClub({ ...newClub, city: e.target.value })}
                              placeholder="São Paulo"
                            />
                          </div>
                          <div>
                            <Label htmlFor="seasonType">Tipo de Temporada</Label>
                            <Select
                              value={newClub.seasonType}
                              onValueChange={(value: "calendar" | "sport") => 
                                setNewClub({ ...newClub, seasonType: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de temporada" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="calendar">
                                  <div className="flex flex-col">
                                    <span className="font-medium">Ano Civil</span>
                                    <span className="text-sm text-muted-foreground">Janeiro - Dezembro</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="sport">
                                  <div className="flex flex-col">
                                    <span className="font-medium">Temporada Esportiva</span>
                                    <span className="text-sm text-muted-foreground">Julho - Junho</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground mt-1">
                              Define como as temporadas serão organizadas no clube
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="badge">Badge do Clube</Label>
                            <Input
                              id="badge"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setNewClub({ ...newClub, badgeFile: file });
                                }
                              }}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                              Formato: JPG, PNG, GIF (máx. 5MB)
                            </p>
                          </div>
                          <Button
                            onClick={handleCreateClub}
                            disabled={!newClub.name || !newClub.shortName || createClubMutation.isPending}
                            className="w-full"
                          >
                            {createClubMutation.isPending ? "Criando..." : "Criar Clube"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
              </div>
            </div>

            <div className="grid gap-6">
              {clubs?.map((club) => (
                <Card
                  key={club.id}
                  className={`cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group border-0 ${
                    selectedClub?.id === club.id
                      ? "ring-2 ring-blue-500 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 shadow-xl scale-[1.02]"
                      : "bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
                  }`}
                  onClick={() => setSelectedClub(club)}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        {club.badge ? (
                          <div className="flex-shrink-0">
                            <img 
                              src={`/uploads/badges/${club.badge}`}
                              alt={`Badge do ${club.name}`}
                              className="w-16 h-16 object-cover rounded-xl border-2 border-gray-200 shadow-sm group-hover:shadow-md transition-shadow"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-xl flex items-center justify-center border-2 border-blue-200 group-hover:from-blue-200 group-hover:to-indigo-300 transition-all duration-300">
                            <Building2 className="w-10 h-10 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">{club.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
                              {club.shortName}
                            </span>
                            {selectedClub?.id === club.id && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                Selecionado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-60 hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleEditClub(club);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClub(club.id);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </CardTitle>
                    {club.description && (
                      <CardDescription className="mt-2 text-gray-600">{club.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {club.foundedYear && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-500">Fundado:</span>
                            <span className="ml-1 font-semibold text-gray-900">{club.foundedYear}</span>
                          </div>
                        </div>
                      )}
                      {club.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-500">Cidade:</span>
                            <span className="ml-1 font-semibold text-gray-900">{club.city}</span>
                          </div>
                        </div>
                      )}
                      {club.country && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-500">País:</span>
                            <span className="ml-1 font-semibold text-gray-900">{club.country}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          club.isActive ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className={`ml-1 font-semibold ${
                            club.isActive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {club.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!clubs || clubs.length === 0) && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Building2 className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Nenhum clube encontrado</p>
                    {isAdmin && (
                      <Button onClick={() => setIsCreatingClub(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeiro Clube
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Season Selection */}
          <div className="space-y-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-7 w-7 text-green-600" />
                </div>
                Temporadas
              </h2>
              {selectedClub && (
                <p className="text-lg text-gray-600">
                  Temporadas disponíveis para <span className="font-semibold text-blue-600">{selectedClub.name}</span>
                </p>
              )}
            </div>

            {!selectedClub ? (
              <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <Calendar className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecione um Clube</h3>
                  <p className="text-gray-600 text-center max-w-sm">
                    Escolha um clube da lista para visualizar suas temporadas disponíveis
                  </p>
                </CardContent>
              </Card>
            ) : seasonsLoading ? (
              <Card className="bg-blue-50/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                  <p className="text-blue-700 font-medium">Carregando temporadas...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {seasons?.map((season) => (
                  <Card
                    key={season.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 ${
                      selectedSeason?.id === season.id
                        ? "ring-2 ring-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg scale-[1.02]"
                        : "bg-white/90 backdrop-blur-sm hover:bg-white shadow-md"
                    }`}
                    onClick={() => setSelectedSeason(season)}
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{season.name}</h3>
                            <p className="text-sm text-gray-600 font-normal">
                              {new Date(season.startDate).toLocaleDateString('pt-BR')} - {new Date(season.endDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {season.isActive && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                              Ativa
                            </span>
                          )}
                          {selectedSeason?.id === season.id && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                              Selecionada
                            </span>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}

                {(!seasons || seasons.length === 0) && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600">Nenhuma temporada encontrada para este clube</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {selectedClub && selectedSeason && (
          <div className="mt-12">
            <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 shadow-xl">
              <CardContent className="text-center py-8">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Pronto para começar!</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Você selecionou <span className="font-semibold text-blue-600">{selectedClub.name}</span> e a temporada <span className="font-semibold text-green-600">{selectedSeason.name}</span>
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleSelectClub}
                  disabled={selectClubMutation.isPending}
                  className="px-12 py-4 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {selectClubMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                      Acessando Sistema...
                    </>
                  ) : (
                    <>
                      <Users className="h-6 w-6 mr-3" />
                      Acessar Sistema de Gestão
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>

      {/* Edit Club Dialog */}
      <Dialog open={isEditingClub} onOpenChange={setIsEditingClub}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Clube</DialogTitle>
            <DialogDescription>
              Atualize as informações do clube
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome do Clube</Label>
              <Input
                id="edit-name"
                value={newClub.name}
                onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                placeholder="Ex: Futebol Clube Barcelona"
              />
            </div>
            <div>
              <Label htmlFor="edit-shortName">Nome Curto</Label>
              <Input
                id="edit-shortName"
                value={newClub.shortName}
                onChange={(e) => setNewClub({ ...newClub, shortName: e.target.value })}
                placeholder="Ex: FCB"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={newClub.description}
                onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                placeholder="Descrição do clube"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-foundedYear">Ano de Fundação</Label>
                <Input
                  id="edit-foundedYear"
                  type="number"
                  value={newClub.foundedYear}
                  onChange={(e) => setNewClub({ ...newClub, foundedYear: e.target.value })}
                  placeholder="1899"
                />
              </div>
              <div>
                <Label htmlFor="edit-country">País</Label>
                <Input
                  id="edit-country"
                  value={newClub.country}
                  onChange={(e) => setNewClub({ ...newClub, country: e.target.value })}
                  placeholder="Brasil"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-city">Cidade</Label>
              <Input
                id="edit-city"
                value={newClub.city}
                onChange={(e) => setNewClub({ ...newClub, city: e.target.value })}
                placeholder="São Paulo"
              />
            </div>
            <div>
              <Label htmlFor="edit-badge">Escudo do Clube</Label>
              <Input
                id="edit-badge"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setNewClub({ ...newClub, badgeFile: file });
                  }
                }}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Formato: JPG, PNG, GIF (máx. 5MB)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdateClub}
                disabled={!newClub.name || !newClub.shortName || updateClubMutation.isPending}
                className="flex-1"
              >
                {updateClubMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingClub(false);
                  setEditingClub(null);
                  setNewClub({
                    name: "",
                    shortName: "",
                    description: "",
                    foundedYear: "",
                    country: "",
                    city: "",
                  });
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}