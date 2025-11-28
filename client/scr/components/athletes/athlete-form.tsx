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
import { FileUpload } from "@/components/ui/file-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertAthleteSchema } from "@shared/schema";

const athleteFormSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  dateOfBirth: z.string().min(1, "Data de nascimento é obrigatória"),
  position: z.string().optional(),
  category: z.string().optional(),
  dominantFoot: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  teamId: z.string().optional().transform((val) => val ? parseInt(val) : null),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  schoolName: z.string().optional(),
  schoolGrade: z.string().optional(),
  status: z.string().default("active"),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  notes: z.string().optional(),
});

type AthleteFormData = z.infer<typeof athleteFormSchema>;

interface AthleteFormProps {
  athlete?: any;
  defaultTeamId?: number;
  clubId?: number;
  seasonId?: number;
  onSuccess: () => void;
}

export default function AthleteForm({ athlete, defaultTeamId, clubId, seasonId, onSuccess }: AthleteFormProps) {
  const { toast } = useToast();
  
  // Estados para os arquivos de upload
  const [uploadedFiles, setUploadedFiles] = useState<{
    profilePhoto?: File | null;
    addressProof?: File | null;
    identityDocument?: File | null;
    birthCertificate?: File | null;
    medicalCertificate?: File | null;
    electrocardiogram?: File | null;
    athleteBond?: File | null;
  }>({});

  // Buscar equipes para seleção
  const { data: teams } = useQuery({
    queryKey: ["/api/teams"],
    retry: false,
  });
  
  const form = useForm<AthleteFormData>({
    resolver: zodResolver(athleteFormSchema),
    defaultValues: {
      firstName: athlete?.firstName || "",
      lastName: athlete?.lastName || "",
      dateOfBirth: athlete?.dateOfBirth || "",
      position: athlete?.position || "",
      category: athlete?.category ? (Array.isArray(athlete.category) ? athlete.category[0] : athlete.category) : "",
      dominantFoot: athlete?.dominantFoot || "right",
      height: athlete?.height || "",
      weight: athlete?.weight || "",
      street: athlete?.street || "",
      number: athlete?.number || "",
      complement: athlete?.complement || "",
      neighborhood: athlete?.neighborhood || "",
      city: athlete?.city || "",
      state: athlete?.state || "",
      zipCode: athlete?.zipCode || "",
      phone: athlete?.phone || "",
      emergencyContact: athlete?.emergencyContact || "",
      emergencyPhone: athlete?.emergencyPhone || "",
      schoolName: athlete?.schoolName || "",
      schoolGrade: athlete?.schoolGrade || "",
      status: athlete?.status || "active",
      contractStart: athlete?.contractStart || "",
      contractEnd: athlete?.contractEnd || "",
      notes: athlete?.notes || "",
      teamId: athlete?.teamId?.toString() || (defaultTeamId ? defaultTeamId.toString() : ""),
    },
  });

  // Função para fazer upload dos arquivos
  const uploadFiles = async () => {
    const formData = new FormData();
    let hasFiles = false;

    if (uploadedFiles.profilePhoto) {
      formData.append('profilePhoto', uploadedFiles.profilePhoto);
      hasFiles = true;
    }
    if (uploadedFiles.addressProof) {
      formData.append('addressProof', uploadedFiles.addressProof);
      hasFiles = true;
    }
    if (uploadedFiles.identityDocument) {
      formData.append('identityDocument', uploadedFiles.identityDocument);
      hasFiles = true;
    }
    if (uploadedFiles.birthCertificate) {
      formData.append('birthCertificate', uploadedFiles.birthCertificate);
      hasFiles = true;
    }
    if (uploadedFiles.medicalCertificate) {
      formData.append('medicalCertificate', uploadedFiles.medicalCertificate);
      hasFiles = true;
    }
    if (uploadedFiles.electrocardiogram) {
      formData.append('electrocardiogram', uploadedFiles.electrocardiogram);
      hasFiles = true;
    }
    if (uploadedFiles.athleteBond) {
      formData.append('athleteBond', uploadedFiles.athleteBond);
      hasFiles = true;
    }

    if (!hasFiles) return {};

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro no upload dos arquivos');
      }

      const result = await response.json();
      return result.files || {};
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: AthleteFormData) => {
      console.log("Mutation started with data:", data);
      
      // Primeiro fazer upload dos arquivos se houver
      console.log("Starting file upload...");
      const uploadedFileUrls = await uploadFiles();
      console.log("File upload completed:", uploadedFileUrls);

      // Use the clubId and seasonId passed as props
      console.log("Using clubId:", clubId);
      console.log("Using seasonId:", seasonId);

      const formattedData = {
        ...data,
        clubId: clubId || null,
        seasonId: seasonId || null,
        // Convert single category to array for both create and update
        category: data.category ? [data.category] : (athlete?.category || ["Sub-15"]),
        dominantFoot: data.dominantFoot || "right", // Default dominantFoot
        height: data.height ? parseFloat(data.height) : null,
        weight: data.weight ? parseFloat(data.weight) : null,
        contractStart: data.contractStart || null,
        contractEnd: data.contractEnd || null,
        phone: data.phone || null,
        street: data.street || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        emergencyContact: data.emergencyContact || null,
        emergencyPhone: data.emergencyPhone || null,
        schoolName: data.schoolName || null,
        schoolGrade: data.schoolGrade || null,
        notes: data.notes || null,
        // Adicionar os URLs dos arquivos
        profilePhoto: uploadedFileUrls.profilePhoto || athlete?.profilePhoto || null,
        addressProof: uploadedFileUrls.addressProof || athlete?.addressProof || null,
        identityDocument: uploadedFileUrls.identityDocument || athlete?.identityDocument || null,
        birthCertificate: uploadedFileUrls.birthCertificate || athlete?.birthCertificate || null,
        medicalCertificate: uploadedFileUrls.medicalCertificate || athlete?.medicalCertificate || null,
        electrocardiogram: uploadedFileUrls.electrocardiogram || athlete?.electrocardiogram || null,
        athleteBond: uploadedFileUrls.athleteBond || athlete?.athleteBond || null,
      };

      console.log("Final formatted data:", formattedData);
      
      if (athlete) {
        console.log("Updating existing athlete...");
        await apiRequest(`/api/athletes/${athlete.id}`, "PUT", formattedData);
      } else {
        console.log("Creating new athlete...");
        await apiRequest("/api/athletes", "POST", formattedData);
      }
      
      console.log("API request completed successfully");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      if (defaultTeamId) {
        queryClient.invalidateQueries({ queryKey: ["/api/teams", defaultTeamId] });
      }
      toast({
        title: athlete ? "Atleta atualizado" : "Atleta cadastrado",
        description: athlete 
          ? "Os dados do atleta foram atualizados com sucesso."
          : "O atleta foi cadastrado com sucesso.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: athlete 
          ? "Falha ao atualizar atleta." 
          : "Falha ao cadastrar atleta.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AthleteFormData) => {
    console.log("Form submission started");
    console.log("Athlete form data:", data);
    console.log("Athlete form errors:", form.formState.errors);
    console.log("Form validation state:", form.formState.isValid);
    
    // Check if form has validation errors (excluding clubId/seasonId as they're handled separately)
    const relevantErrors = Object.keys(form.formState.errors).filter(key => key !== 'clubId' && key !== 'seasonId');
    if (relevantErrors.length > 0) {
      console.log("Form has validation errors, submission blocked");
      return;
    }
    
    console.log("Calling mutation...");
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-fluent-text">Informações Pessoais</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do atleta" {...field} />
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
                    <Input placeholder="Sobrenome do atleta" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dateOfBirth"
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

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Rua/Avenida</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da rua ou avenida" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input placeholder="123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="complement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Complemento</FormLabel>
                <FormControl>
                  <Input placeholder="Apartamento, bloco, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do bairro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da cidade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <Input placeholder="UF" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <Input placeholder="00000-000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Sports Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-fluent-text">Informações Esportivas</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="position"
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
                      <SelectItem value="GK">Goleiro (GK)</SelectItem>
                      <SelectItem value="CB">Zagueiro Central (CB)</SelectItem>
                      <SelectItem value="ZAG">Zagueiro (ZAG)</SelectItem>
                      <SelectItem value="LB">Lateral Esquerdo (LB)</SelectItem>
                      <SelectItem value="RB">Lateral Direito (RB)</SelectItem>
                      <SelectItem value="LWB">Ala Esquerdo (LWB)</SelectItem>
                      <SelectItem value="RWB">Ala Direito (RWB)</SelectItem>
                      <SelectItem value="CDM">Volante (CDM)</SelectItem>
                      <SelectItem value="CM">Meio-campista Central (CM)</SelectItem>
                      <SelectItem value="MC">Meio-Campo (MC)</SelectItem>
                      <SelectItem value="LM">Meia Esquerda (LM)</SelectItem>
                      <SelectItem value="RM">Meia Direita (RM)</SelectItem>
                      <SelectItem value="CAM">Meia Atacante (CAM)</SelectItem>
                      <SelectItem value="MEI">Meia (MEI)</SelectItem>
                      <SelectItem value="LW">Ponta Esquerda (LW)</SelectItem>
                      <SelectItem value="RW">Ponta Direita (RW)</SelectItem>
                      <SelectItem value="ST">Atacante (ST)</SelectItem>
                      <SelectItem value="ATA">Atacante (ATA)</SelectItem>
                      <SelectItem value="goleiro">Goleiro (antigo)</SelectItem>
                      <SelectItem value="zagueiro">Zagueiro (antigo)</SelectItem>
                      <SelectItem value="lateral">Lateral (antigo)</SelectItem>
                      <SelectItem value="volante">Volante (antigo)</SelectItem>
                      <SelectItem value="meio-campo">Meio-campo (antigo)</SelectItem>
                      <SelectItem value="atacante">Atacante (antigo)</SelectItem>
                      <SelectItem value="ponta">Ponta (antigo)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <SelectItem value="Sub-11">Sub-11</SelectItem>
                      <SelectItem value="Sub-13">Sub-13</SelectItem>
                      <SelectItem value="Sub-15">Sub-15</SelectItem>
                      <SelectItem value="Sub-17">Sub-17</SelectItem>
                      <SelectItem value="Sub-20">Sub-20</SelectItem>
                      <SelectItem value="Profissional">Profissional</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipe</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a equipe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams?.map((team: any) => (
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
          </div>

          <FormField
            control={form.control}
            name="dominantFoot"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pé Dominante</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o pé dominante" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="right">Destro</SelectItem>
                    <SelectItem value="left">Canhoto</SelectItem>
                    <SelectItem value="both">Ambidestro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Altura (cm)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="175" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="70" {...field} />
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
                      <SelectItem value="injured">Lesionado</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-fluent-text">Contato de Emergência</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="emergencyContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Contato</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do responsável" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergencyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone de Emergência</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* School Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-fluent-text">Informações Escolares</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Escola</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da instituição de ensino" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="schoolGrade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Série/Ano</FormLabel>
                  <FormControl>
                    <Input placeholder="9º ano, 2º colegial, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Contract Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-fluent-text">Informações Contratuais</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contractStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Início do Contrato</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fim do Contrato</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Document Uploads */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-fluent-text">Documentos</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Photo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-fluent-text">
                Foto do Atleta
              </label>
              <FileUpload
                onFileSelect={(file) => setUploadedFiles(prev => ({ ...prev, profilePhoto: file }))}
                accept="image/*"
                maxSize={5}
                currentFile={athlete?.profilePhoto}
                placeholder="Fazer upload da foto do atleta"
              />
            </div>

            {/* Address Proof */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-fluent-text">
                Comprovante de Endereço
              </label>
              <FileUpload
                onFileSelect={(file) => setUploadedFiles(prev => ({ ...prev, addressProof: file }))}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={5}
                currentFile={athlete?.addressProof}
                placeholder="Fazer upload do comprovante de endereço"
              />
            </div>

            {/* Identity Document */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-fluent-text">
                Documento de Identidade
              </label>
              <FileUpload
                onFileSelect={(file) => setUploadedFiles(prev => ({ ...prev, identityDocument: file }))}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={5}
                currentFile={athlete?.identityDocument}
                placeholder="Fazer upload do documento de identidade"
              />
            </div>

            {/* Birth Certificate */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-fluent-text">
                Certidão de Nascimento
              </label>
              <FileUpload
                onFileSelect={(file) => setUploadedFiles(prev => ({ ...prev, birthCertificate: file }))}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={5}
                currentFile={athlete?.birthCertificate}
                placeholder="Fazer upload da certidão de nascimento"
              />
            </div>

            {/* Medical Certificate */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-fluent-text">
                Atestado Médico
              </label>
              <FileUpload
                onFileSelect={(file) => setUploadedFiles(prev => ({ ...prev, medicalCertificate: file }))}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={5}
                currentFile={athlete?.medicalCertificate}
                placeholder="Fazer upload do atestado médico (opcional)"
              />
              <p className="text-xs text-gray-500">
                Documento opcional para atestar a aptidão física do atleta
              </p>
            </div>

            {/* Electrocardiogram */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-fluent-text">
                Eletrocardiograma
              </label>
              <FileUpload
                onFileSelect={(file) => setUploadedFiles(prev => ({ ...prev, electrocardiogram: file }))}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={5}
                currentFile={athlete?.electrocardiogram}
                placeholder="Fazer upload do eletrocardiograma (opcional)"
              />
              <p className="text-xs text-gray-500">
                Documento opcional do exame de eletrocardiograma do atleta
              </p>
            </div>

            {/* Athlete Bond */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-fluent-text">
                Documento de Vínculo
              </label>
              <FileUpload
                onFileSelect={(file) => setUploadedFiles(prev => ({ ...prev, athleteBond: file }))}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={5}
                currentFile={athlete?.athleteBond}
                placeholder="Fazer upload do documento de vínculo (opcional)"
              />
              <p className="text-xs text-gray-500">
                Documento opcional de vínculo do atleta ao clube
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações adicionais sobre o atleta"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              console.log("Debug - Form state:", {
                isValid: form.formState.isValid,
                isDirty: form.formState.isDirty,
                errors: form.formState.errors,
                values: form.getValues()
              });
            }}
          >
            Debug Form
          </Button>
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
            disabled={mutation.isPending}
            className="bg-fluent-blue hover:bg-fluent-blue-dark text-white"
          >
            {mutation.isPending ? "Salvando..." : athlete ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
