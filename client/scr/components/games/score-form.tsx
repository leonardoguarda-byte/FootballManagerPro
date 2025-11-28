import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ScoreFormProps {
  game: any;
  onSubmit: (data: { id: number; ourScore: number; opponentScore: number }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ScoreForm({ game, onSubmit, onCancel, isLoading }: ScoreFormProps) {
  const [ourScore, setOurScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ id: game.id, ourScore, opponentScore });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center">
        <h3 className="font-medium text-fluent-text">
          {game.isHome ? "Nós" : game.opponent} vs {game.isHome ? game.opponent : "Nós"}
        </h3>
        <p className="text-sm text-fluent-text-secondary">
          {new Date(game.date).toLocaleDateString("pt-BR")} - {game.location}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <Label className="block text-sm font-medium text-fluent-text mb-2">
            {game.isHome ? "Nosso placar" : game.opponent}
          </Label>
          <Input
            type="number"
            min="0"
            value={game.isHome ? ourScore : opponentScore}
            onChange={(e) => game.isHome ? setOurScore(Number(e.target.value)) : setOpponentScore(Number(e.target.value))}
            className="text-center text-2xl font-bold"
          />
        </div>
        
        <div className="text-center">
          <Label className="block text-sm font-medium text-fluent-text mb-2">
            {game.isHome ? game.opponent : "Nosso placar"}
          </Label>
          <Input
            type="number"
            min="0"
            value={game.isHome ? opponentScore : ourScore}
            onChange={(e) => game.isHome ? setOpponentScore(Number(e.target.value)) : setOurScore(Number(e.target.value))}
            className="text-center text-2xl font-bold"
          />
        </div>
      </div>

      <div className="flex space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-fluent-blue hover:bg-fluent-blue-dark text-white"
        >
          {isLoading ? "Salvando..." : "Salvar Resultado"}
        </Button>
      </div>
    </form>
  );
}