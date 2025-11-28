import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, DollarSign, Activity, Stethoscope } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Team } from "@shared/schema";

const userFormSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
  role: z.string().min(1, "Função é obrigatória"),
  dateOfBirth: z.string().optional(),
  teamId: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
}).refine((data) => {
  // Date of birth and team are required for athletes
  if (data.role === "atleta") {
    return !!data.dateOfBirth && !!data.teamId;
  }
  return true;
}, {
  message: "Data de nascimento e time são obrigatórios para atletas",
  path: ["dateOfBirth"],
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: any;
  onSuccess: () => void;
}

const roleOptions = [
  { value: "administrador", label: "Administrador", icon: Shield, color: "bg-red-100 text-red-800" },
  { value: "coordenador", label: "Coordenador", icon: Users, color: "bg-blue-100 text-blue-800" },
  { value: "comissao", label: "Comissão Técnica", icon: Users, color: "bg-blue-100 text-blue-800" },
  { value: "medico", label: "Equipe Médica", icon: Stethoscope, color: "bg-green-100 text-green-800" },
  { value: "atleta", label: "Atleta", icon: Users, color: "bg-purple-100 text-purple-800" },
  { value: "familiar", label: "Família", icon: Users, color: "bg-pink-100 text-pink-800" },
  { value: "torcedor", label: "Torcedor", icon: Activity, color: "bg-orange-100 text-orange-800" },
];

export default function UserForm({ user, onSuccess }: UserFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  // Fetch teams for athlete role
  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: currentUser?.clubId != null && currentUser?.seasonId != null,
  });
  
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      password: "",
      role: user?.role || "atleta",
      dateOfBirth: user?.dateOfBirth || "",
      teamId: user?.teamId?.toString() || "",
      permissions: user?.permissions || [],
      isActive: user?.isActive ?? true,
    },
  });
  
  const selectedRole = form.watch("role");

  const mutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (user) {
        return apiRequest(`/api/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/users", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: user ? "Usuário atualizado!" : "Usuário criado!",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar usuário",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="João" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sobrenome</FormLabel>
                <FormControl>
                  <Input placeholder="Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="joao@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!user && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha *</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Mínimo 6 caracteres" 
                    {...field} 
                    required
                    data-testid="input-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Função</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedRole === "atleta" && (
          <>
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento *</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      data-testid="input-date-of-birth"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-team">
                        <SelectValue placeholder="Selecione o time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams?.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name} - {team.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Usuário ativo</FormLabel>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={mutation.isPending} 
            className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
          >
            {mutation.isPending ? "Salvando..." : user ? "Atualizar" : "Criar Usuário"}
          </Button>
        </div>
      </form>
    </Form>
  );
}