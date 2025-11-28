import { useMutation, useQueryClient, MutationFunction } from "@tanstack/react-query";
import { offlineSyncManager, offlineCapableRequest } from "@/lib/offlineSync";
import { useToast } from "@/hooks/use-toast";

interface UseOfflineMutationOptions<TData, TVariables> {
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  invalidateQueries?: string[];
  optimisticUpdate?: {
    queryKey: string[];
    updater: (oldData: any, variables: TVariables) => any;
  };
}

export function useOfflineMutation<TData = any, TVariables = any>({
  endpoint,
  method,
  onSuccess,
  onError,
  invalidateQueries = [],
  optimisticUpdate
}: UseOfflineMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutationFn: MutationFunction<TData, TVariables> = async (variables) => {
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method !== 'DELETE' && variables) {
      requestInit.body = JSON.stringify(variables);
    }

    return offlineCapableRequest(endpoint, requestInit);
  };

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      if (optimisticUpdate) {
        await queryClient.cancelQueries({ queryKey: optimisticUpdate.queryKey });

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(optimisticUpdate.queryKey);

        // Optimistically update to the new value
        queryClient.setQueryData(optimisticUpdate.queryKey, (old: any) =>
          optimisticUpdate.updater(old, variables)
        );

        // Return a context object with the snapshotted value
        return { previousData };
      }
    },
    onSuccess: (data, variables) => {
      // Show success message for offline operations
      const syncStatus = offlineSyncManager.getQueueStatus();
      if (!syncStatus.isOnline && syncStatus.queueLength > 0) {
        toast({
          title: "Operação Salva",
          description: "Os dados serão sincronizados quando a conexão for restaurada.",
          variant: "default",
        });
      }

      // Invalidate and refetch
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      onSuccess?.(data, variables);
    },
    onError: (error: Error, variables, context: any) => {
      // If we had an optimistic update, roll it back
      if (optimisticUpdate && context?.previousData) {
        queryClient.setQueryData(optimisticUpdate.queryKey, context.previousData);
      }

      // Show error message
      toast({
        title: "Erro na Operação",
        description: error.message || "Falha ao executar a operação.",
        variant: "destructive",
      });

      onError?.(error, variables);
    },
  });
}