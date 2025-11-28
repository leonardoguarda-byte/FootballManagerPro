import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TestMineiro() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const createMineiroTournament = useMutation({
    mutationFn: async () => {
      setIsCreating(true);
      const tournamentData = {
        name: "Campeonato Mineiro Sub-15/17",
        description: "Torneio oficial com formato Mineiro Sub-15/17",
        category: "Sub-15/17",
        format: "mineiro_sub_15_17",
        startDate: "2025-06-01",
        endDate: "2025-11-30",
        maxTeams: 44,
        status: "upcoming",
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
        rankingCriteria: "points,goal_difference,goals_for",
        teamsAdvancingPerGroup: 4
      };

      return await apiRequest("/api/tournaments", "POST", tournamentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Sucesso",
        description: "Torneio Mineiro criado! Redirecionando...",
      });
      setTimeout(() => {
        window.location.href = "/mineiro-tournament";
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar torneio",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsCreating(false);
    }
  });

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Teste - Criar Torneio Mineiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Clique para criar um torneio Mineiro Sub-15/17 e ser redirecionado para o novo sistema de gestão.
          </p>
          <Button 
            onClick={() => createMineiroTournament.mutate()}
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? "Criando..." : "Criar Torneio Mineiro"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}