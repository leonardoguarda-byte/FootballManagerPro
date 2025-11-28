import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertMedicalRecordSchema } from "@shared/schema";
import { Upload, X, FileText, Image } from "lucide-react";

const medicalFormSchema = insertMedicalRecordSchema.extend({
  date: z.string().min(1, "Data é obrigatória"),
  athleteId: z.string().min(1, "Atleta é obrigatório"),
  estimatedRecovery: z.string().optional(),
  actualRecovery: z.string().optional(),
  followUpDate: z.string().optional(),
});

type MedicalFormData = z.infer<typeof medicalFormSchema>;

interface MedicalFormProps {
  onSuccess: () => void;
}

export default function MedicalForm({ onSuccess }: MedicalFormProps) {
  const { toast } = useToast();
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const form = useForm<MedicalFormData>({
    resolver: zodResolver(medicalFormSchema),
    defaultValues: {
      athleteId: "",
      type: "",
      title: "",
      description: "",
      date: (() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })(),
      severity: "",
      bodyPart: "",
      estimatedRecovery: "",
      actualRecovery: "",
      status: "",
      doctorName: "",
      doctorNotes: "",
      followUpDate: "",
    },
  });

  const { data: athletes } = useQuery({
    queryKey: ["/api/athletes"],
    retry: false,
  });

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/medical-records/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const { filePaths } = await response.json();
      setAttachedFiles(prev => [...prev, ...filePaths]);

      toast({
        title: "Arquivos enviados",
        description: `${files.length} arquivo(s) enviado(s) com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Falha ao enviar arquivos.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (fileToRemove: string) => {
    setAttachedFiles(prev => prev.filter(file => file !== fileToRemove));
  };

  const getFileIcon = (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    return imageExtensions.includes(extension || '') ? Image : FileText;
  };

  const mutation = useMutation({
    mutationFn: async (data: MedicalFormData) => {
      console.log("Starting mutation with data:", data);
      const formattedData = {
        ...data,
        athleteId: parseInt(data.athleteId),
        estimatedRecovery: data.estimatedRecovery ? parseInt(data.estimatedRecovery) : null,
        actualRecovery: data.actualRecovery ? parseInt(data.actualRecovery) : null,
        followUpDate: data.followUpDate || null,
        attachments: attachedFiles,
      };
      console.log("Formatted data for API:", formattedData);
      const result = await apiRequest("/api/medical-records", "POST", formattedData);
      console.log("API response:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
      toast({
        title: "Registro médico criado",
        description: "O registro médico foi criado com sucesso.",
      });
      onSuccess();
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Erro",
        description: `Falha ao criar registro médico: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MedicalFormData) => {
    console.log("Form submission triggered with data:", data);
    console.log("Attached files:", attachedFiles);
    console.log("Form errors:", form.formState.errors);
    console.log("Form is valid:", form.formState.isValid);
    console.log("Form dirty fields:", form.formState.dirtyFields);
    
    // Force validation
    const isValid = form.trigger();
    console.log("Manual validation result:", isValid);
    
    if (!form.formState.isValid) {
      console.error("Form validation failed. Errors:", form.formState.errors);
      toast({
        title: "Erro de Validação",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    mutation.mutate(data);
  };

  const recordType = form.watch("type");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="athleteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Atleta</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o atleta" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {athletes?.map((athlete: any) => (
                      <SelectItem key={athlete.id} value={athlete.id.toString()}>
                        {athlete.firstName} {athlete.lastName} - {athlete.category}
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Registro</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="injury">Lesão</SelectItem>
                    <SelectItem value="medical_exam">Exame Médico</SelectItem>
                    <SelectItem value="treatment">Tratamento</SelectItem>
                    <SelectItem value="clearance">Liberação Médica</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {recordType === "injury" && (
            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gravidade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a gravidade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título/Diagnóstico</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Entorse de tornozelo, Exame físico de rotina" {...field} />
              </FormControl>
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
                  placeholder="Descrição detalhada do problema, exame ou tratamento"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {recordType === "injury" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bodyPart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parte do Corpo Afetada</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Tornozelo esquerdo, Joelho direito" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="recovering">Em Recuperação</SelectItem>
                        <SelectItem value="cleared">Liberado</SelectItem>
                        <SelectItem value="chronic">Crônico</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedRecovery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recuperação Estimada (dias)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="7" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actualRecovery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recuperação Real (dias)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="doctorName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Médico</FormLabel>
                <FormControl>
                  <Input placeholder="Dr. João Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="followUpDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Retorno</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="doctorNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações Médicas</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Recomendações, protocolo de tratamento, restrições, etc."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Seção de Upload de Arquivos */}
        <div className="space-y-4">
          <FormLabel>Anexos (Imagens e Documentos)</FormLabel>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-sm text-gray-600">
                {uploading ? "Enviando..." : "Clique para adicionar arquivos"}
              </div>
              <div className="text-xs text-gray-500">
                Imagens (JPG, PNG, GIF) e documentos (PDF, DOC, DOCX, TXT) até 10MB
              </div>
            </label>
          </div>

          {/* Lista de arquivos anexados */}
          {attachedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Arquivos anexados:</div>
              {attachedFiles.map((file, index) => {
                const IconComponent = getFileIcon(file);
                const fileName = file.split('/').pop() || file;
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 truncate max-w-xs">{fileName}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || uploading}
            className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
          >
            {mutation.isPending ? "Salvando..." : uploading ? "Enviando..." : "Criar Registro"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
