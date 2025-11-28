import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Filter, Edit, Trash2, Eye, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import AthleteForm from "@/components/athletes/athlete-form";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";

export default function Athletes() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { toast } = useToast();
  const permissions = usePermissions();

  const { data: athletes, isLoading } = useQuery({
    queryKey: ["/api/athletes"],
    retry: false,
  });

  const { data: currentClub } = useQuery({
    queryKey: ["/api/auth/current-club"],
    retry: false,
  });

  const deleteAthleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/athletes/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      toast({
        title: "Atleta excluído",
        description: "O atleta foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao excluir atleta.",
        variant: "destructive",
      });
    },
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedAthletes = athletes?.filter((athlete: any) => {
    const categoryStr = Array.isArray(athlete.category) ? athlete.category.join(' ') : (athlete.category || '');
    return `${athlete.firstName} ${athlete.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.position?.toLowerCase().includes(searchTerm.toLowerCase());
  })?.sort((a: any, b: any) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case "name":
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case "position":
        aValue = a.position?.toLowerCase() || "";
        bValue = b.position?.toLowerCase() || "";
        break;
      case "category":
        aValue = Array.isArray(a.category) ? a.category.join(', ').toLowerCase() : (a.category?.toLowerCase() || "");
        bValue = Array.isArray(b.category) ? b.category.join(', ').toLowerCase() : (b.category?.toLowerCase() || "");
        break;
      case "age":
        aValue = a.dateOfBirth ? Math.floor((Date.now() - new Date(a.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
        bValue = b.dateOfBirth ? Math.floor((Date.now() - new Date(b.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
        break;
      case "jersey":
        aValue = a.jerseyNumber || 0;
        bValue = b.jerseyNumber || 0;
        break;
      case "status":
        aValue = a.status?.toLowerCase() || "";
        bValue = b.status?.toLowerCase() || "";
        break;
      default:
        aValue = a[sortBy];
        bValue = b[sortBy];
    }
    
    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  }) || [];

  const handleEdit = (athlete: any) => {
    setEditingAthlete(athlete);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este atleta?")) {
      deleteAthleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case "injured":
        return <Badge className="bg-red-100 text-red-800">Lesionado</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>;
      case "suspended":
        return <Badge className="bg-yellow-100 text-yellow-800">Suspenso</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fluent-text">Atletas</h1>
          <p className="text-fluent-text-secondary mt-1">Gestão completa de atletas do clube</p>
        </div>
        {permissions.athletes.canCreate && (
          <Dialog 
            open={isFormOpen} 
            onOpenChange={(open) => {
              setIsFormOpen(open);
              if (!open) setEditingAthlete(null);
            }}
          >
            <DialogTrigger asChild>
              <Button 
                className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
                onClick={() => {
                  setEditingAthlete(null); // Clear editing state when opening new form
                  setIsFormOpen(true);
                }}
                data-testid="button-create-athlete"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Atleta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAthlete ? "Editar Atleta" : "Novo Atleta"}
                </DialogTitle>
              </DialogHeader>
              <AthleteForm 
                athlete={editingAthlete} 
                clubId={currentClub?.id}
                seasonId={currentClub?.currentSeasonId}
                onSuccess={() => setIsFormOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="fluent-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-fluent-text-secondary" />
                <Input
                  placeholder="Buscar por nome, categoria ou posição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Athletes Table */}
      <Card className="fluent-shadow">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-fluent-text-secondary">Carregando atletas...</div>
            </div>
          ) : filteredAndSortedAthletes.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-fluent-text-secondary">
                {searchTerm ? "Nenhum atleta encontrado com os filtros aplicados." : "Nenhum atleta cadastrado."}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-fluent-divider">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent text-fluent-text"
                      onClick={() => handleSort("name")}
                    >
                      Nome
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent text-fluent-text"
                      onClick={() => handleSort("position")}
                    >
                      Posição
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent text-fluent-text"
                      onClick={() => handleSort("category")}
                    >
                      Categoria
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent text-fluent-text"
                      onClick={() => handleSort("age")}
                    >
                      Idade
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent text-fluent-text"
                      onClick={() => handleSort("jersey")}
                    >
                      Camisa
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent text-fluent-text"
                      onClick={() => handleSort("status")}
                    >
                      Status
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedAthletes.map((athlete: any) => (
                  <TableRow key={athlete.id} className="border-fluent-divider hover:bg-fluent-background-secondary">
                    <TableCell>
                      <Avatar className="w-8 h-8">
                        <AvatarImage 
                          src={athlete.profilePhoto} 
                          alt={`${athlete.firstName} ${athlete.lastName}`}
                        />
                        <AvatarFallback className="bg-fluent-blue text-white text-xs">
                          {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium text-fluent-text">
                      {athlete.firstName} {athlete.lastName}
                    </TableCell>
                    <TableCell className="text-fluent-text-secondary">
                      {athlete.position || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {Array.isArray(athlete.category) ? athlete.category.join(', ') : (athlete.category || "N/A")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-fluent-text-secondary">
                      {athlete.dateOfBirth 
                        ? Math.floor((Date.now() - new Date(athlete.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                        : "N/A"
                      } anos
                    </TableCell>
                    <TableCell className="text-fluent-text-secondary">
                      {athlete.jerseyNumber ? `#${athlete.jerseyNumber}` : "-"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(athlete.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8 w-8 p-0"
                        >
                          <Link href={`/athletes/${athlete.id}`} data-testid={`button-view-athlete-${athlete.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        {permissions.athletes.canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(athlete)}
                            className="h-8 w-8 p-0"
                            data-testid={`button-edit-athlete-${athlete.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {permissions.athletes.canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(athlete.id)}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                            data-testid={`button-delete-athlete-${athlete.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
