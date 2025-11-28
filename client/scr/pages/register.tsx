import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, UserPlus, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const registrationSchema = z.object({
  email: z.string().email("Email inválido"),
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha obrigatória"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  userType: z.enum(["atleta", "familiar"], { required_error: "Selecione o tipo de usuário" }),
  relationship: z.string().optional(),
  familyAthleteId: z.number().optional(),
  athleteInfo: z.object({
    position: z.string().optional(),
    dateOfBirth: z.string().optional(),
    height: z.number().optional(),
    weight: z.number().optional(),
    experience: z.string().optional(),
    medicalInfo: z.string().optional(),
  }).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function Register() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
      phone: "",
      userType: "atleta",
      relationship: "",
      athleteInfo: {
        position: "",
        dateOfBirth: "",
        height: 0,
        weight: 0,
        experience: "",
        medicalInfo: "",
      },
    },
  });

  const { data: athletes = [] } = useQuery({
    queryKey: ["/api/athletes"],
    enabled: form.watch("userType") === "familiar",
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      return await apiRequest("/api/register", "POST", data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Cadastro enviado!",
        description: "Sua solicitação foi enviada com sucesso. Aguarde aprovação do administrador.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Ocorreu um erro ao enviar sua solicitação. Tente novamente.";
      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationFormData) => {
    registerMutation.mutate(data);
  };

  const userType = form.watch("userType");

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-600 dark:text-green-400">
              Cadastro Enviado!
            </CardTitle>
            <CardDescription>
              Sua solicitação foi enviada com sucesso. Você receberá um email quando sua conta for aprovada pelo administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => window.location.href = "/"}
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestão Clube Esportiva
          </CardTitle>
          <CardDescription className="text-lg">
            Solicite seu cadastro para acessar a plataforma
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Informação Importante</AlertTitle>
            <AlertDescription>
              Todos os cadastros passam por aprovação do administrador. Você será notificado por email quando sua conta for aprovada.
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome" {...field} />
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
                      <FormLabel>Sobrenome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu sobrenome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="seu@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone *</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Sua senha" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirme sua senha" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="userType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Usuário *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="atleta" id="atleta" />
                          <Label htmlFor="atleta" className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Atleta - Sou um jogador que deseja me cadastrar
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="familiar" id="familiar" />
                          <Label htmlFor="familiar" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Familiar - Sou responsável por um atleta
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {userType === "familiar" && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-semibold text-lg">Informações do Familiar</h3>
                  
                  <FormField
                    control={form.control}
                    name="relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parentesco *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o parentesco" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pai">Pai</SelectItem>
                            <SelectItem value="mae">Mãe</SelectItem>
                            <SelectItem value="responsavel">Responsável Legal</SelectItem>
                            <SelectItem value="tio">Tio(a)</SelectItem>
                            <SelectItem value="avo">Avô/Avó</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="familyAthleteId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Atleta Relacionado</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o atleta (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(athletes) && athletes.map((athlete: any) => (
                              <SelectItem key={athlete.id} value={athlete.id.toString()}>
                                {athlete.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {userType === "atleta" && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-semibold text-lg">Informações do Atleta</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="athleteInfo.position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Posição</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a posição" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="goleiro">Goleiro</SelectItem>
                              <SelectItem value="zagueiro">Zagueiro</SelectItem>
                              <SelectItem value="lateral">Lateral</SelectItem>
                              <SelectItem value="volante">Volante</SelectItem>
                              <SelectItem value="meia">Meia</SelectItem>
                              <SelectItem value="atacante">Atacante</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="athleteInfo.dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="athleteInfo.height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Altura (cm)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="175" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="athleteInfo.weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso (kg)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="70" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="athleteInfo.experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experiência no Futebol</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva sua experiência, clubes anteriores, tempo de prática, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="athleteInfo.medicalInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Informações Médicas</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Lesões anteriores, alergias, medicamentos em uso, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}