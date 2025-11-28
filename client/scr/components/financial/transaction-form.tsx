import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertFinancialTransactionSchema } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

const transactionFormSchema = z.object({
  type: z.string(),
  category: z.string(),
  description: z.string(),
  amount: z.string(),
  date: z.string(),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  athleteId: z.number().nullable().optional(),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  transaction?: any;
  onSuccess: () => void;
}

const categories = [
  "Mensalidades",
  "Uniformes", 
  "Equipamentos",
  "Salários",
  "Aluguel",
  "Transporte",
  "Alimentação",
  "Medicina Esportiva",
  "Marketing",
  "Energia Elétrica",
  "Internet",
  "Telefone",
  "Manutenção",
  "Material Esportivo",
  "Taxas e Impostos",
  "Seguros",
  "Hospedagem",
  "Patrocínios",
  "Bilheteria",
  "Outros"
];

export default function TransactionForm({ transaction, onSuccess }: TransactionFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: transaction?.type || "income",
      category: transaction?.category || "",
      description: transaction?.description || "",
      amount: transaction?.amount?.toString() || "0",
      date: transaction?.date || (() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })(),
      paymentMethod: transaction?.paymentMethod || "",
      reference: transaction?.reference || "",
      athleteId: transaction?.athleteId || null,
      notes: transaction?.notes || "",
    },
  });

  const { data: athletes } = useQuery({
    queryKey: ["/api/athletes"],
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const payload = {
        ...data,
        clubId: (user as any)?.clubId,
        seasonId: (user as any)?.seasonId,
      };
      
      if (transaction) {
        return apiRequest(`/api/financial-transactions/${transaction.id}`, "PATCH", payload);
      } else {
        return apiRequest("/api/financial-transactions", "POST", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-transactions"] });
      toast({
        title: "Sucesso",
        description: transaction 
          ? "Transação atualizada com sucesso!" 
          : "Transação criada com sucesso!",
      });
      form.reset();
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar transação",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransactionFormData) => {
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        field.onChange("0");
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          field.onChange(value);
                        }
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="athleteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Atleta (opcional)</FormLabel>
              <Select onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} value={field.value?.toString() || "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um atleta" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Nenhum atleta</SelectItem>
                  {athletes?.map((athlete: any) => (
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

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descrição da transação..." 
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
          >
            {mutation.isPending ? "Salvando..." : transaction ? "Atualizar" : "Criar Transação"}
          </Button>
        </div>
      </form>
    </Form>
  );
}