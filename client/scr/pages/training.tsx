import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Clock, MapPin, Users, MoreVertical, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import AdvancedTrainingForm from "@/components/training/advanced-training-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { getTrainingTypeLabel } from "@/lib/trainingTypeLabels";

export default function Training() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const { toast } = useToast();
  const permissions = usePermissions();
  const queryClient = useQueryClient();

  const { data: trainingSessions, isLoading } = useQuery({
    queryKey: ["/api/training-sessions"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/training-sessions/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-sessions"] });
      toast({
        title: "Treino excluído",
        description: "O treino foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o treino.",
        variant: "destructive",
      });
    },
  });

  // Calendar helper functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(prevDate.getMonth() - 1);
      } else {
        newDate.setMonth(prevDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getSessionsForDay = (date: Date) => {
    if (!trainingSessions) return [];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return (trainingSessions as any[]).filter((session: any) => 
      session.date === dateStr
    );
  };

  const getTypeBadge = (type: string) => {
    const typeColors = {
      "technical": "bg-blue-100 text-blue-800",
      "physical": "bg-green-100 text-green-800", 
      "tactical": "bg-purple-100 text-purple-800",
      "psychological": "bg-orange-100 text-orange-800",
      "physical-tactical": "bg-teal-100 text-teal-800",
      "physical-technical": "bg-cyan-100 text-cyan-800",
      "technical-tactical": "bg-indigo-100 text-indigo-800",
    };
    
    return (
      <Badge className={typeColors[type as keyof typeof typeColors] || "bg-gray-100 text-gray-800"}>
        {getTrainingTypeLabel(type)}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fluent-text">Treinos</h1>
          <p className="text-fluent-text-secondary mt-1">Planejamento e gestão de sessões de treino</p>
        </div>
        {permissions.training.canCreate && (
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingSession(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
                onClick={() => setEditingSession(null)}
                data-testid="button-create-training"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Treino
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSession ? "Editar Treino" : "Novo Treino"}</DialogTitle>
              </DialogHeader>
              <AdvancedTrainingForm 
                onSuccess={() => {
                  setIsFormOpen(false);
                  setEditingSession(null);
                }} 
                editingSession={editingSession}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {getDaysInMonth(currentDate).map((day, index) => (
              <div key={index} className="min-h-[120px] p-1 border border-gray-100">
                {day && (
                  <>
                    <div className="text-sm font-medium mb-1">
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {getSessionsForDay(day).map((session: any) => (
                        <div key={session.id} className="relative group">
                          <Link href={`/training/${session.id}`}>
                            <div className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs p-1 rounded cursor-pointer transition-colors">
                              <div className="font-medium truncate pr-6">{session.title}</div>
                              <div className="flex items-center justify-between">
                                <span>{session.startTime}</span>
                                {getTypeBadge(session.type)}
                              </div>
                            </div>
                          </Link>
                          
                          {/* Action dropdown */}
                          {(permissions.training.canEdit || permissions.training.canDelete) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-1 right-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  data-testid={`button-menu-training-${session.id}`}
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-32">
                                {permissions.training.canEdit && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSession(session);
                                      setIsFormOpen(true);
                                    }}
                                    data-testid={`button-edit-training-${session.id}`}
                                  >
                                    <Edit className="w-3 h-3 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                )}
                                {permissions.training.canDelete && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-red-600 focus:text-red-600"
                                        data-testid={`button-delete-training-${session.id}`}
                                      >
                                        <Trash2 className="w-3 h-3 mr-2" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir treino</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir o treino "{session.title}"? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteMutation.mutate(session.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Show loading state if needed */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="text-fluent-text-secondary">Carregando treinos...</div>
        </div>
      )}

      {/* Show empty state only when no sessions exist */}
      {!isLoading && (!trainingSessions || (trainingSessions as any[]).length === 0) && (
        <Card className="fluent-shadow">
          <CardContent className="p-8 text-center">
            <div className="text-fluent-text-secondary">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Nenhum treino agendado</h3>
              <p className="mb-4">Comece criando sua primeira sessão de treino</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}