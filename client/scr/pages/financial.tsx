import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, TrendingUp, TrendingDown, Calendar, Receipt, Edit2, Trash2 } from "lucide-react";
import TransactionForm from "@/components/financial/transaction-form";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Financial() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const { toast } = useToast();

  const getCurrentPeriod = () => {
    const today = new Date();
    if (selectedPeriod === "current") {
      return {
        startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
        label: "Este mês"
      };
    } else {
      const lastMonth = subMonths(today, 1);
      return {
        startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
        label: "Mês anterior"
      };
    }
  };

  const period = getCurrentPeriod();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/financial-transactions", { startDate: period.startDate, endDate: period.endDate }],
    retry: false,
  });

  const { data: athletes } = useQuery({
    queryKey: ["/api/athletes"],
    retry: false,
  });

  const getFinancialStats = () => {
    if (!transactions) {
      return { totalIncome: 0, totalExpenses: 0, balance: 0, transactionCount: 0 };
    }

    const income = transactions
      .filter((t: any) => t.type === "income")
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

    const expenses = transactions
      .filter((t: any) => t.type === "expense")
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      transactionCount: transactions.length,
    };
  };

  const getIncomeTransactions = () => {
    return transactions?.filter((t: any) => t.type === "income") || [];
  };

  const getExpenseTransactions = () => {
    return transactions?.filter((t: any) => t.type === "expense") || [];
  };

  const getCategoryTotals = (type: "income" | "expense") => {
    if (!transactions) return [];
    
    const filteredTransactions = transactions.filter((t: any) => t.type === type);
    const categories: { [key: string]: number } = {};
    
    filteredTransactions.forEach((t: any) => {
      categories[t.category] = (categories[t.category] || 0) + parseFloat(t.amount);
    });
    
    return Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    return type === "income" ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  const stats = getFinancialStats();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/financial-transactions/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-transactions"] });
      toast({
        title: "Sucesso",
        description: "Transação excluída com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir transação",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta transação?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setSelectedTransaction(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fluent-text">Gestão Financeira</h1>
          <p className="text-fluent-text-secondary mt-1">Controle de receitas e despesas do clube</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="current">Este mês</option>
            <option value="previous">Mês anterior</option>
          </select>
          <Button 
            className="bg-fluent-blue hover:bg-fluent-blue-dark text-white" 
            data-testid="button-nova-transacao"
            onClick={() => {
              setSelectedTransaction(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
          <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedTransaction ? "Editar Transação" : "Nova Transação"}</DialogTitle>
              </DialogHeader>
              <TransactionForm 
                transaction={selectedTransaction} 
                onSuccess={() => handleFormClose(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="fluent-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fluent-text-secondary">Receitas</p>
                <p className="text-2xl font-bold text-fluent-green">
                  {formatCurrency(stats.totalIncome)}
                </p>
                <p className="text-xs text-fluent-text-secondary">{period.label}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-fluent-green" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fluent-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fluent-text-secondary">Despesas</p>
                <p className="text-2xl font-bold text-fluent-red">
                  {formatCurrency(stats.totalExpenses)}
                </p>
                <p className="text-xs text-fluent-text-secondary">{period.label}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-fluent-red" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fluent-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fluent-text-secondary">Saldo</p>
                <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-fluent-green' : 'text-fluent-red'}`}>
                  {formatCurrency(stats.balance)}
                </p>
                <p className="text-xs text-fluent-text-secondary">
                  {stats.balance >= 0 ? 'Positivo' : 'Negativo'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-fluent-blue" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fluent-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fluent-text-secondary">Transações</p>
                <p className="text-2xl font-bold text-fluent-text">{stats.transactionCount}</p>
                <p className="text-xs text-fluent-text-secondary">{period.label}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Categories */}
        <Card className="fluent-shadow">
          <CardHeader>
            <CardTitle className="text-fluent-text">Principais Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="income" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income">Receitas</TabsTrigger>
                <TabsTrigger value="expense">Despesas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="income" className="space-y-3">
                {getCategoryTotals("income").map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm text-fluent-text">{category}</span>
                    <span className="text-sm font-medium text-fluent-green">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="expense" className="space-y-3">
                {getCategoryTotals("expense").map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm text-fluent-text">{category}</span>
                    <span className="text-sm font-medium text-fluent-red">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card className="fluent-shadow">
            <CardHeader>
              <CardTitle className="text-fluent-text">Transações Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-fluent-text-secondary">Carregando transações...</div>
              ) : transactions && transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.slice(0, 10).map((transaction: any) => {
                    const athlete = transaction.athleteId 
                      ? athletes?.find((a: any) => a.id === transaction.athleteId)
                      : null;
                    
                    return (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-fluent-text">
                              {transaction.description}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-fluent-text-secondary">
                              <span>{transaction.category}</span>
                              <span>•</span>
                              <span>{format(new Date(transaction.date), 'dd/MM/yyyy')}</span>
                              {athlete && (
                                <>
                                  <span>•</span>
                                  <span>{athlete.firstName} {athlete.lastName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`text-sm font-bold ${
                              transaction.type === "income" ? "text-fluent-green" : "text-fluent-red"
                            }`}>
                              {transaction.type === "income" ? "+" : "-"}
                              {formatCurrency(parseFloat(transaction.amount))}
                            </p>
                            {transaction.paymentMethod && (
                              <p className="text-xs text-fluent-text-secondary">
                                {transaction.paymentMethod}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(transaction)}
                              className="h-8 w-8 p-0"
                              data-testid={`button-edit-${transaction.id}`}
                            >
                              <Edit2 className="h-4 w-4 text-fluent-blue" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(transaction.id)}
                              className="h-8 w-8 p-0"
                              data-testid={`button-delete-${transaction.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-fluent-text-secondary">
                  Nenhuma transação encontrada para o período selecionado.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
