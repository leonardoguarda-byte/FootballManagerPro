import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Image } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Simplified form schema
const medicalFormSchema = z.object({
  athleteId: z.string().min(1, "Atleta é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  severity: z.string().min(1, "Gravidade é obrigatória"),
  status: z.string().min(1, "Status é obrigatório"),
  bodyPart: z.string().optional(),
  doctorName: z.string().optional(),
  doctorNotes: z.string().optional(),
  followUpDate: z.string().optional(),
});

type MedicalFormData = z.infer<typeof medicalFormSchema>;

interface MedicalFormProps {
  onSuccess: () => void;
  initialData?: any;
}

export default function MedicalFormNew({ onSuccess, initialData }: MedicalFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [attachedFiles, setAttachedFiles] = useState<string[]>(initialData?.attachments || []);
  const [uploading, setUploading] = useState(false);
  
  const form = useForm<MedicalFormData>({
    resolver: zodResolver(medicalFormSchema),
    defaultValues: {
      athleteId: initialData?.athleteId?.toString() || "",
      type: initialData?.type || "injury",
      title: initialData?.title || "",
      description: initialData?.description || "",
      severity: initialData?.severity || "medium",
      status: initialData?.status || "active",
      bodyPart: initialData?.bodyPart || "",
      doctorName: initialData?.doctorName || "",
      doctorNotes: initialData?.doctorNotes || "",
      followUpDate: initialData?.followUpDate || "",
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
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setAttachedFiles(prev => [...prev, ...result.filePaths]);
      
      toast({
        title: "Arquivos enviados",
        description: `${files.length} arquivo(s) enviado(s) com sucesso.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: "Falha ao enviar arquivos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (filePath: string) => {
    setAttachedFiles(prev => prev.filter(f => f !== filePath));
  };

  const mutation = useMutation({
    mutationFn: async (data: MedicalFormData) => {
      const payload = {
        ...data,
        athleteId: parseInt(data.athleteId),
        clubId: (user as any)?.clubId,
        seasonId: (user as any)?.seasonId,
        date: initialData?.date || (() => {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        followUpDate: data.followUpDate || null,
        attachments: attachedFiles,
      };
      
      console.log("Submitting medical record:", payload);
      
      if (initialData?.id) {
        // Update existing record
        return await apiRequest(`/api/medical-records/${initialData.id}`, "PATCH", payload);
      } else {
        // Create new record
        return await apiRequest("/api/medical-records", "POST", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
      toast({
        title: initialData?.id ? "Registro médico atualizado" : "Registro médico criado",
        description: "O registro foi salvo com sucesso.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Create error:", error);
      toast({
        title: "Erro",
        description: `Falha ao criar registro: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: MedicalFormData) => {
    console.log("Form submitted:", data);
    mutation.mutate(data);
  };

  const getFileIcon = (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    return imageExtensions.includes(extension || '') ? Image : FileText;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="athleteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Atleta *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um atleta" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.isArray(athletes) && athletes.map((athlete: any) => (
                      <SelectItem key={athlete.id} value={athlete.id.toString()}>
                        {athlete.firstName} {athlete.lastName}
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
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="injury">Lesão</SelectItem>
                    <SelectItem value="illness">Doença</SelectItem>
                    <SelectItem value="checkup">Check-up</SelectItem>
                    <SelectItem value="treatment">Tratamento</SelectItem>
                    <SelectItem value="surgery">Cirurgia</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Lesão no joelho direito" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gravidade *</FormLabel>
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

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="recovering">Em Recuperação</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="chronic">Crônico</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bodyPart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parte do Corpo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Joelho direito" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva os sintomas, causa da lesão, etc."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  placeholder="Notas e recomendações do médico"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* File Upload Section */}
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
            {mutation.isPending ? "Salvando..." : (initialData?.id ? "Atualizar Registro" : "Criar Registro")}
          </Button>
        </div>
      </form>
    </Form>
  );
}