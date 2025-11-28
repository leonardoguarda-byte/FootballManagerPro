import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Users, 
  Shield, 
  Bell, 
  Database, 
  FileText,
  Clock,
  MapPin,
  Phone,
  Mail,
  Building,
  Calendar,
  AlertCircle,
  Trash2,
  Search,
  BarChart3,
  Dumbbell,
  Trophy,
  Heart,
  Stethoscope,
  DollarSign,
  Brain,
  UserCog,
  Filter,
  SortAsc,
  SortDesc,
  X,
  Edit,
  UserPlus,
  Eye,
  EyeOff,
  Copy,
  Dices,
  Check,
  Globe,
  Palette,
  Type,
  Image as ImageIcon,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useRBAC } from "@/hooks/useRBAC";
import { MODULES, MODULE_INFO, UserRole } from "@shared/rbac";
import { Link } from "wouter";

interface ClubSettings {
  clubName: string;
  clubAddress: string;
  clubPhone: string;
  clubEmail: string;
  clubWebsite: string;
  clubLogo: string;
  seasonStart: string;
  seasonEnd: string;
  maxPlayersPerTeam: number;
  defaultTrainingDuration: number;
  requireMedicalClearance: boolean;
  enableNotifications: boolean;
  autoBackup: boolean;
  dataRetentionDays: number;
}

interface UserManagement {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLogin: string;
}

interface HomepageVisualConfig {
  colors: {
    heroGradientStart: string;
    heroGradientEnd: string;
    sectionBackground: string;
    formBackground: string;
    textPrimary: string;
    textSecondary: string;
    buttonPrimary: string;
    buttonSecondary: string;
    buttonText: string;
  };
  typography: {
    h1Size: number;
    h2Size: number;
    bodySize: number;
    fontFamily: string;
  };
  background: {
    heroImageUrl?: string;
    heroImageOpacity: number;
  };
}

export default function SettingsPage() {
  const { isAdmin } = useRBAC();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const [clubSettings, setClubSettings] = useState<ClubSettings>({
    clubName: "Gestão Clube Esportiva",
    clubAddress: "",
    clubPhone: "",
    clubEmail: "",
    clubWebsite: "",
    clubLogo: "",
    seasonStart: "",
    seasonEnd: "",
    maxPlayersPerTeam: 25,
    defaultTrainingDuration: 90,
    requireMedicalClearance: true,
    enableNotifications: true,
    autoBackup: true,
    dataRetentionDays: 365
  });

  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'atleta',
    dateOfBirth: '',
    teamId: '',
    sendInvite: true
  });

  // Default homepage visual configuration
  const defaultVisualConfig: HomepageVisualConfig = {
    colors: {
      heroGradientStart: "#0ea5e9",
      heroGradientEnd: "#1d4ed8",
      sectionBackground: "#ffffff",
      formBackground: "#f9fafb",
      textPrimary: "#111827",
      textSecondary: "#6b7280",
      buttonPrimary: "#0ea5e9",
      buttonSecondary: "#6b7280",
      buttonText: "#ffffff"
    },
    typography: {
      h1Size: 48,
      h2Size: 32,
      bodySize: 16,
      fontFamily: "Segoe UI"
    },
    background: {
      heroImageUrl: "",
      heroImageOpacity: 100
    }
  };

  const [visualConfig, setVisualConfig] = useState<HomepageVisualConfig>(defaultVisualConfig);

  // Password change states
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Enhanced module access configuration with permission levels
  const [moduleAccessConfig, setModuleAccessConfig] = useState<Record<UserRole, Record<string, 'none' | 'read' | 'edit'>>>({
    administrador: Object.values(MODULES).reduce((acc, module) => ({ ...acc, [module]: 'edit' }), {}),
    coordenador: Object.values(MODULES).reduce((acc, module) => ({ 
      ...acc, 
      [module]: module === MODULES.FINANCIAL ? 'none' : 'edit' 
    }), {}),
    comissao: Object.values(MODULES).reduce((acc, module) => ({ 
      ...acc, 
      [module]: [MODULES.DASHBOARD, MODULES.ATHLETES, MODULES.TEAMS, MODULES.TRAINING, MODULES.GAMES, MODULES.WELLNESS, MODULES.REPORTS, MODULES.AI_INSIGHTS].includes(module) 
        ? (module === MODULES.ATHLETES ? 'read' : 'edit') 
        : 'none' 
    }), {}),
    medico: Object.values(MODULES).reduce((acc, module) => ({ 
      ...acc, 
      [module]: [MODULES.DASHBOARD, MODULES.ATHLETES, MODULES.WELLNESS, MODULES.MEDICAL, MODULES.REPORTS].includes(module) 
        ? (module === MODULES.MEDICAL ? 'edit' : 'read') 
        : 'none' 
    }), {}),
    atleta: Object.values(MODULES).reduce((acc, module) => ({ 
      ...acc, 
      [module]: [MODULES.DASHBOARD, MODULES.WELLNESS, MODULES.TRAINING, MODULES.GAMES].includes(module) 
        ? (module === MODULES.WELLNESS ? 'edit' : 'read') 
        : 'none' 
    }), {}),
    familiar: Object.values(MODULES).reduce((acc, module) => ({ 
      ...acc, 
      [module]: [MODULES.DASHBOARD, MODULES.WELLNESS].includes(module) 
        ? (module === MODULES.WELLNESS ? 'edit' : 'read') 
        : 'none' 
    }), {})
  });

  // Load module access configuration from backend
  const { data: moduleAccessData } = useQuery({
    queryKey: ["/api/module-access"],
    retry: false,
  });

  // Update local state when backend data loads
  useEffect(() => {
    if (moduleAccessData?.moduleAccessConfig) {
      setModuleAccessConfig(moduleAccessData.moduleAccessConfig);
    }
  }, [moduleAccessData]);

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserManagement | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [editUserData, setEditUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    isActive: true,
    password: '',
    confirmPassword: '',
    athleteId: null as number | null,
    athleteCategories: [] as string[]
  });

  // Load club settings from system config
  const { data: configData } = useQuery({
    queryKey: ["/api/config"],
    retry: false,
  });

  // Load users for user management
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Load teams for athlete user creation
  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    retry: false,
  });

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    
    let filtered = users.filter((user: any) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower);
      
      // Role filter
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      
      // Status filter
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort users
    filtered.sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "email":
          aValue = a.email?.toLowerCase() || "";
          bValue = b.email?.toLowerCase() || "";
          break;
        case "role":
          aValue = a.role || "";
          bValue = b.role || "";
          break;
        case "status":
          aValue = a.isActive ? "active" : "inactive";
          bValue = b.isActive ? "active" : "inactive";
          break;
        default:
          return 0;
      }
      
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [users, searchTerm, roleFilter, statusFilter, sortBy, sortOrder]);

  // Load homepage visual config
  const { data: visualConfigData } = useQuery({
    queryKey: ["/api/config/homepage-visual"],
    retry: false,
  });

  // Update local state when visual config data loads
  useEffect(() => {
    if (visualConfigData) {
      setVisualConfig(prev => ({ ...prev, ...visualConfigData }));
    }
  }, [visualConfigData]);

  // Update club settings when config data loads
  useEffect(() => {
    if (configData) {
      const clubConfig = configData.find((config: any) => config.key === 'club_settings');
      if (clubConfig && clubConfig.value) {
        setClubSettings(prev => ({ ...prev, ...clubConfig.value }));
      }
    }
  }, [configData]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: ClubSettings) => {
      const response = await fetch("/api/config", {
        method: "POST",
        body: JSON.stringify({
          key: "club_settings",
          value: settings,
          description: "Configurações gerais do clube"
        }),
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserManagement> }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    },
  });

  // Module access configuration mutation
  const saveModuleAccessMutation = useMutation({
    mutationFn: async (config: Record<UserRole, string[]>) => {
      const response = await fetch("/api/module-access", {
        method: "POST",
        body: JSON.stringify({ moduleAccessConfig: config }),
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuração salva",
        description: "Configurações de acesso aos módulos foram atualizadas.",
      });
      setHasChanges(false);
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  // Save visual config mutation
  const saveVisualConfigMutation = useMutation({
    mutationFn: async (config: HomepageVisualConfig) => {
      return await apiRequest("/api/config/homepage-visual", "POST", config);
    },
    onSuccess: () => {
      toast({
        title: "Aparência salva",
        description: "As configurações visuais da homepage foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/config/homepage-visual"] });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações visuais.",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: keyof ClubSettings, value: any) => {
    setClubSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Module access configuration functions
  const toggleModuleAccess = (role: UserRole, module: string) => {
    setModuleAccessConfig(prev => {
      const currentLevel = prev[role][module] || 'none';
      const nextLevel = currentLevel === 'none' ? 'read' : 
                       currentLevel === 'read' ? 'edit' : 'none';
      
      return {
        ...prev,
        [role]: {
          ...prev[role],
          [module]: nextLevel
        }
      };
    });
    setHasChanges(true);
  };

  const setModulePermission = (role: UserRole, module: string, permission: 'none' | 'read' | 'edit') => {
    setModuleAccessConfig(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [module]: permission
      }
    }));
    setHasChanges(true);
  };

  const saveModuleAccess = () => {
    saveModuleAccessMutation.mutate(moduleAccessConfig);
  };

  const resetModuleAccess = () => {
    setModuleAccessConfig({
      administrador: Object.values(MODULES).reduce((acc, module) => ({ ...acc, [module]: 'edit' }), {}),
      coordenador: Object.values(MODULES).reduce((acc, module) => ({ 
        ...acc, 
        [module]: module === MODULES.FINANCIAL ? 'none' : 'edit' 
      }), {}),
      comissao: Object.values(MODULES).reduce((acc, module) => ({ 
        ...acc, 
        [module]: [MODULES.DASHBOARD, MODULES.ATHLETES, MODULES.TEAMS, MODULES.TRAINING, MODULES.GAMES, MODULES.WELLNESS, MODULES.REPORTS, MODULES.AI_INSIGHTS].includes(module) 
          ? (module === MODULES.ATHLETES ? 'read' : 'edit') 
          : 'none' 
      }), {}),
      medico: Object.values(MODULES).reduce((acc, module) => ({ 
        ...acc, 
        [module]: [MODULES.DASHBOARD, MODULES.ATHLETES, MODULES.WELLNESS, MODULES.MEDICAL, MODULES.REPORTS].includes(module) 
          ? (module === MODULES.MEDICAL ? 'edit' : 'read') 
          : 'none' 
      }), {}),
      atleta: Object.values(MODULES).reduce((acc, module) => ({ 
        ...acc, 
        [module]: [MODULES.DASHBOARD, MODULES.WELLNESS, MODULES.TRAINING, MODULES.GAMES].includes(module) 
          ? (module === MODULES.WELLNESS ? 'edit' : 'read') 
          : 'none' 
      }), {}),
      familiar: Object.values(MODULES).reduce((acc, module) => ({ 
        ...acc, 
        [module]: [MODULES.DASHBOARD, MODULES.WELLNESS].includes(module) 
          ? (module === MODULES.WELLNESS ? 'edit' : 'read') 
          : 'none' 
      }), {})
    });
    setHasChanges(true);
  };

  const getModuleIcon = (module: string) => {
    const iconMap: Record<string, any> = {
      [MODULES.DASHBOARD]: BarChart3,
      [MODULES.ATHLETES]: Users,
      [MODULES.TEAMS]: Users,
      [MODULES.TRAINING]: Dumbbell,
      [MODULES.GAMES]: Trophy,
      [MODULES.WELLNESS]: Heart,
      [MODULES.MEDICAL]: Stethoscope,
      [MODULES.FINANCIAL]: DollarSign,
      [MODULES.REPORTS]: FileText,
      [MODULES.AI_INSIGHTS]: Brain,
      [MODULES.SETTINGS]: Settings,
      [MODULES.USER_MANAGEMENT]: UserCog
    };
    return iconMap[module] || Settings;
  };

  // Edit user functions
  const openEditDialog = async (user: any) => {
    setEditingUser(user);
    
    // If user is an athlete, fetch athlete data to get categories
    let athleteCategories: string[] = [];
    let athleteId: number | null = null;
    
    if (user.role === 'atleta' && user.athleteId) {
      try {
        const response = await fetch(`/api/athletes/${user.athleteId}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const athlete = await response.json();
          athleteCategories = athlete.category || [];
          athleteId = athlete.id;
        }
      } catch (error) {
        console.error('Failed to fetch athlete data:', error);
      }
    }
    
    setEditUserData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      role: user.role || '',
      isActive: user.isActive,
      password: '',
      confirmPassword: '',
      athleteId,
      athleteCategories
    });
    setShowEditDialog(true);
  };

  const closeEditDialog = () => {
    setShowEditDialog(false);
    setEditingUser(null);
    setShowPassword(false);
    setPasswordCopied(false);
    setEditUserData({
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      isActive: true,
      password: '',
      confirmPassword: '',
      athleteId: null,
      athleteCategories: []
    });
  };

  const generateRandomPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setEditUserData(prev => ({
      ...prev,
      password: password,
      confirmPassword: password
    }));
    setShowPassword(true);
    toast({
      title: "Senha gerada",
      description: "Uma senha segura foi gerada automaticamente.",
    });
  };

  const copyPasswordToClipboard = async () => {
    if (!editUserData.password) return;
    
    try {
      await navigator.clipboard.writeText(editUserData.password);
      setPasswordCopied(true);
      toast({
        title: "Senha copiada!",
        description: "A senha foi copiada para a área de transferência.",
      });
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a senha.",
        variant: "destructive",
      });
    }
  };

  const validateEditForm = () => {
    if (!editUserData.firstName.trim() || !editUserData.lastName.trim() || !editUserData.email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome, sobrenome e email são obrigatórios.",
        variant: "destructive",
      });
      return false;
    }

    if (editUserData.password && editUserData.password !== editUserData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A senha e confirmação devem ser iguais.",
        variant: "destructive",
      });
      return false;
    }

    if (editUserData.password && editUserData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleEditUser = async () => {
    if (!validateEditForm() || !editingUser) return;

    const updates: any = {
      firstName: editUserData.firstName.trim(),
      lastName: editUserData.lastName.trim(),
      email: editUserData.email.trim(),
      role: editUserData.role,
      isActive: editUserData.isActive
    };

    // Only include password if it's provided
    if (editUserData.password) {
      updates.password = editUserData.password;
    }

    // If user is an athlete and has athleteId, update athlete categories
    if (editUserData.role === 'atleta' && editUserData.athleteId) {
      try {
        await apiRequest(`/api/athletes/${editUserData.athleteId}`, "PUT", {
          category: editUserData.athleteCategories
        });
      } catch (error) {
        console.error('Failed to update athlete categories:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar as categorias do atleta.",
          variant: "destructive"
        });
        return;
      }
    }

    updateUserMutation.mutate({ 
      userId: editingUser.id, 
      updates 
    });
    closeEditDialog();
  };

  const saveSettings = () => {
    saveSettingsMutation.mutate(clubSettings);
  };

  const resetToDefaults = () => {
    setClubSettings({
      clubName: "Gestão Clube Esportiva",
      clubAddress: "",
      clubPhone: "",
      clubEmail: "",
      clubWebsite: "",
      clubLogo: "",
      seasonStart: "",
      seasonEnd: "",
      maxPlayersPerTeam: 25,
      defaultTrainingDuration: 90,
      requireMedicalClearance: true,
      enableNotifications: true,
      autoBackup: true,
      dataRetentionDays: 365
    });
    setHasChanges(true);
  };

  const updateUserRole = (userId: string, role: string) => {
    updateUserMutation.mutate({ userId, updates: { role } });
  };

  const toggleUserStatus = (userId: string, isActive: boolean) => {
    updateUserMutation.mutate({ userId, updates: { isActive } });
  };

  // Add new user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const response = await fetch("/api/users", {
        method: "POST",
        body: JSON.stringify({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          dateOfBirth: userData.dateOfBirth,
          teamId: userData.teamId,
          sendInvite: userData.sendInvite
        }),
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Erro ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário adicionado",
        description: "O novo usuário foi criado com sucesso.",
      });
      setShowAddUserForm(false);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'atleta',
        dateOfBirth: '',
        teamId: '',
        sendInvite: true
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar usuário",
        description: error.message || "Não foi possível criar o novo usuário.",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: { currentPassword: string; newPassword: string }) => {
      return await apiRequest('/api/auth/change-password', 'POST', passwordData);
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso.",
      });
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChangingPassword(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Não foi possível alterar a senha.",
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = () => {
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword
    });
  };

  const addNewUser = () => {
    addUserMutation.mutate(newUser);
  };

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/users/${userId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir usuário",
        description: "Não foi possível remover o usuário.",
        variant: "destructive",
      });
    },
  });

  // Send password email mutation
  const sendPasswordEmailMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      return await apiRequest("/api/users/send-password", "POST", { userId, password });
    },
    onSuccess: () => {
      toast({
        title: "E-mail enviado!",
        description: "A senha foi enviada para o e-mail do usuário.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar e-mail",
        description: error?.message || "Não foi possível enviar o e-mail com a senha.",
        variant: "destructive",
      });
    },
  });

  const deleteUser = (userId: string, userName: string) => {
    if (confirm(`Tem certeza que deseja excluir o usuário ${userName}? Esta ação não pode ser desfeita.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const sendPasswordByEmail = () => {
    if (!editingUser || !editUserData.password) {
      toast({
        title: "Senha não disponível",
        description: "Gere ou digite uma senha antes de enviar por e-mail.",
        variant: "destructive",
      });
      return;
    }

    sendPasswordEmailMutation.mutate({
      userId: editingUser.id,
      password: editUserData.password
    });
  };

  // Visual config handlers
  const handleVisualConfigChange = (category: keyof HomepageVisualConfig, key: string, value: any) => {
    setVisualConfig(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const saveVisualConfig = () => {
    saveVisualConfigMutation.mutate(visualConfig);
  };

  const resetVisualConfig = () => {
    setVisualConfig(defaultVisualConfig);
    toast({
      title: "Configurações restauradas",
      description: "As configurações visuais foram restauradas aos valores padrão.",
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{isAdmin() ? 'Configurações do Sistema' : 'Meu Perfil'}</h1>
            <p className="text-gray-600">{isAdmin() ? 'Configure as preferências e parâmetros da academia' : 'Altere sua senha e gerencie suas informações'}</p>
          </div>
        </div>
        
        {isAdmin() && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              disabled={saveSettingsMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrões
            </Button>
            <Button
              onClick={saveSettings}
              disabled={!hasChanges || saveSettingsMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveSettingsMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue={isAdmin() ? "club" : "profile"} className="w-full">
        {isAdmin() ? (
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="club">Clube</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
            <TabsTrigger value="modules">Módulos</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="w-full">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="club" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Informações do Clube
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clubName">Nome do Clube</Label>
                  <Input
                    id="clubName"
                    value={clubSettings.clubName}
                    onChange={(e) => handleSettingChange('clubName', e.target.value)}
                    placeholder="Nome da academia de futebol"
                  />
                </div>
                <div>
                  <Label htmlFor="clubEmail">Email do Clube</Label>
                  <Input
                    id="clubEmail"
                    type="email"
                    value={clubSettings.clubEmail}
                    onChange={(e) => handleSettingChange('clubEmail', e.target.value)}
                    placeholder="contato@clube.com"
                  />
                </div>
                <div>
                  <Label htmlFor="clubPhone">Telefone</Label>
                  <Input
                    id="clubPhone"
                    value={clubSettings.clubPhone}
                    onChange={(e) => handleSettingChange('clubPhone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="clubWebsite">Website</Label>
                  <Input
                    id="clubWebsite"
                    value={clubSettings.clubWebsite}
                    onChange={(e) => handleSettingChange('clubWebsite', e.target.value)}
                    placeholder="https://www.clube.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="clubAddress">Endereço Completo</Label>
                <Textarea
                  id="clubAddress"
                  value={clubSettings.clubAddress}
                  onChange={(e) => handleSettingChange('clubAddress', e.target.value)}
                  placeholder="Endereço completo do clube"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Temporada e Configurações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="seasonStart">Início da Temporada</Label>
                  <Input
                    id="seasonStart"
                    type="date"
                    value={clubSettings.seasonStart}
                    onChange={(e) => handleSettingChange('seasonStart', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="seasonEnd">Fim da Temporada</Label>
                  <Input
                    id="seasonEnd"
                    type="date"
                    value={clubSettings.seasonEnd}
                    onChange={(e) => handleSettingChange('seasonEnd', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maxPlayers">Máximo de Jogadores por Equipe</Label>
                  <Input
                    id="maxPlayers"
                    type="number"
                    value={clubSettings.maxPlayersPerTeam}
                    onChange={(e) => handleSettingChange('maxPlayersPerTeam', parseInt(e.target.value))}
                    min="15"
                    max="35"
                  />
                </div>
                <div>
                  <Label htmlFor="trainingDuration">Duração Padrão do Treino (minutos)</Label>
                  <Input
                    id="trainingDuration"
                    type="number"
                    value={clubSettings.defaultTrainingDuration}
                    onChange={(e) => handleSettingChange('defaultTrainingDuration', parseInt(e.target.value))}
                    min="60"
                    max="180"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Página Inicial Pública
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Personalize o conteúdo da página inicial pública do clube, incluindo hero, notícias, jogos, parceiros e loja.
              </p>
              <Link href="/homepage-editor">
                <Button className="w-full md:w-auto">
                  <Globe className="h-4 w-4 mr-2" />
                  Editar Homepage
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança e Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir Atestado Médico</Label>
                  <p className="text-sm text-gray-500">
                    Todos os atletas devem ter atestado médico válido
                  </p>
                </div>
                <Switch
                  checked={clubSettings.requireMedicalClearance}
                  onCheckedChange={(checked) => handleSettingChange('requireMedicalClearance', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações do Sistema</Label>
                  <p className="text-sm text-gray-500">
                    Enviar notificações por email sobre eventos importantes
                  </p>
                </div>
                <Switch
                  checked={clubSettings.enableNotifications}
                  onCheckedChange={(checked) => handleSettingChange('enableNotifications', checked)}
                />
              </div>
              
              <Separator />
              
              <div>
                <Label htmlFor="dataRetention">Retenção de Dados (dias)</Label>
                <Input
                  id="dataRetention"
                  type="number"
                  value={clubSettings.dataRetentionDays}
                  onChange={(e) => handleSettingChange('dataRetentionDays', parseInt(e.target.value))}
                  min="30"
                  max="3650"
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Tempo que os dados são mantidos antes da exclusão automática
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Controle de Acesso aos Módulos
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure quais módulos cada perfil de usuário pode acessar
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetModuleAccess}
                    disabled={saveModuleAccessMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar Padrão
                  </Button>
                  <Button
                    onClick={saveModuleAccess}
                    disabled={!hasChanges || saveModuleAccessMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveModuleAccessMutation.isPending ? "Salvando..." : "Salvar Configuração"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Role-based module access configuration */}
                {(['administrador', 'coordenador', 'comissao', 'medico', 'atleta', 'familiar'] as UserRole[]).map((role) => {
                  const roleDisplayNames = {
                    administrador: 'Administrador',
                    coordenador: 'Coordenador',
                    comissao: 'Comissão Técnica',
                    medico: 'Médico',
                    atleta: 'Atleta',
                    familiar: 'Familiar'
                  };
                  
                  const roleColors = {
                    administrador: 'bg-red-100 text-red-800 border-red-200',
                    coordenador: 'bg-blue-100 text-blue-800 border-blue-200',
                    comissao: 'bg-green-100 text-green-800 border-green-200',
                    medico: 'bg-purple-100 text-purple-800 border-purple-200',
                    atleta: 'bg-orange-100 text-orange-800 border-orange-200',
                    familiar: 'bg-gray-100 text-gray-800 border-gray-200'
                  };

                  const roleModules = moduleAccessConfig[role] || {};
                  const totalModules = Object.values(MODULES).length;
                  const enabledCount = Object.values(roleModules).filter(level => level !== 'none').length;

                  return (
                    <div key={role} className="border rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${roleColors[role]}`}>
                            {roleDisplayNames[role]}
                          </span>
                          <div className="text-sm text-gray-600">
                            {enabledCount} de {totalModules} módulos habilitados
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {Math.round((enabledCount / totalModules) * 100)}% de acesso
                          </div>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(enabledCount / totalModules) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(MODULES)
                          .filter(([key, module]) => module !== MODULES.RPE) // Remove RPE separado, já incluído em Wellness
                          .map(([key, module]) => {
                          const permissionLevel = roleModules[module] || 'none';
                          const isEnabled = permissionLevel !== 'none';
                          const moduleInfo = MODULE_INFO[module];
                          const IconComponent = getModuleIcon(module);

                          return (
                            <div
                              key={module}
                              className={`relative border rounded-lg p-4 transition-all duration-200 min-h-[140px] ${
                                permissionLevel === 'edit'
                                  ? 'border-green-300 bg-green-50 shadow-sm'
                                  : permissionLevel === 'read'
                                  ? 'border-blue-300 bg-blue-50 shadow-sm'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex flex-col h-full">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                                    permissionLevel === 'edit' ? 'bg-green-100 text-green-600' :
                                    permissionLevel === 'read' ? 'bg-blue-100 text-blue-600' : 
                                    'bg-gray-100 text-gray-500'
                                  }`}>
                                    <IconComponent className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className={`font-medium text-sm ${
                                      permissionLevel === 'edit' ? 'text-green-900' :
                                      permissionLevel === 'read' ? 'text-blue-900' :
                                      'text-gray-700'
                                    }`}>
                                      {moduleInfo.name}
                                    </h4>
                                    <p className={`text-xs mt-1 ${
                                      permissionLevel === 'edit' ? 'text-green-700' :
                                      permissionLevel === 'read' ? 'text-blue-700' :
                                      'text-gray-500'
                                    }`}>
                                      {moduleInfo.description}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="mt-auto">
                                  <div className="flex flex-col gap-2">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium text-center ${
                                      permissionLevel === 'edit' ? 'bg-green-100 text-green-700' :
                                      permissionLevel === 'read' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {permissionLevel === 'edit' ? 'Editar' :
                                       permissionLevel === 'read' ? 'Visualizar' : 'Bloqueado'}
                                    </span>
                                    <div className="flex justify-center gap-2">
                                      {['none', 'read', 'edit'].map((level) => (
                                        <button
                                          key={level}
                                          onClick={() => setModulePermission(role, module, level as 'none' | 'read' | 'edit')}
                                          className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                                            permissionLevel === level
                                              ? level === 'edit' ? 'bg-green-500 border-green-500 text-white' :
                                                level === 'read' ? 'bg-blue-500 border-blue-500 text-white' :
                                                'bg-gray-500 border-gray-500 text-white'
                                              : 'border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50'
                                          }`}
                                          title={level === 'edit' ? 'Editar' : level === 'read' ? 'Visualizar' : 'Bloqueado'}
                                        >
                                          <span className="text-xs font-bold">
                                            {level === 'edit' ? 'E' : level === 'read' ? 'L' : 'X'}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary section */}
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo de Permissões</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(MODULES)
                    .filter(([key, module]) => module !== MODULES.RPE) // Remove RPE separado, já incluído em Wellness
                    .map(([key, module]) => {
                    const moduleInfo = MODULE_INFO[module];
                    const IconComponent = getModuleIcon(module);
                    const rolesWithAccess = (['administrador', 'coordenador', 'comissao', 'medico', 'atleta', 'familiar'] as UserRole[])
                      .map(role => ({
                        role,
                        permission: moduleAccessConfig[role]?.[module] || 'none'
                      }))
                      .filter(({ permission }) => permission !== 'none');

                    return (
                      <div key={module} className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-gray-900">{moduleInfo.name}</h4>
                            <p className="text-xs text-gray-500">{rolesWithAccess.length} perfis com acesso</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {rolesWithAccess.map(({ role, permission }) => {
                            const roleDisplayNames = {
                              administrador: 'Admin',
                              coordenador: 'Coord',
                              comissao: 'Técnico',
                              medico: 'Médico',
                              atleta: 'Atleta',
                              familiar: 'Familiar'
                            };
                            return (
                              <div key={role} className="flex items-center justify-between text-xs">
                                <span className="font-medium">{roleDisplayNames[role]}</span>
                                <span className={`px-2 py-1 rounded-full ${
                                  permission === 'edit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {permission === 'edit' ? 'Editar' : 'Visualizar'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gerenciamento de Usuários
                </div>
                <Button
                  onClick={() => setShowAddUserForm(true)}
                  size="sm"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Adicionar Usuário
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showAddUserForm && (
                <Card className="mb-6 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Adicionar Novo Usuário</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newUserFirstName">Nome</Label>
                        <Input
                          id="newUserFirstName"
                          value={newUser.firstName}
                          onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="Nome do usuário"
                          data-testid="input-first-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newUserLastName">Sobrenome</Label>
                        <Input
                          id="newUserLastName"
                          value={newUser.lastName}
                          onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Sobrenome do usuário"
                          data-testid="input-last-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newUserEmail">Email</Label>
                        <Input
                          id="newUserEmail"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@exemplo.com"
                          data-testid="input-email"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newUserPassword">Senha *</Label>
                        <Input
                          id="newUserPassword"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Mínimo 6 caracteres"
                          data-testid="input-password"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="newUserRole">Papel no Sistema</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Selecione o papel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrador">Administrador</SelectItem>
                            <SelectItem value="coordenador">Coordenador</SelectItem>
                            <SelectItem value="comissao">Comissão Técnica</SelectItem>
                            <SelectItem value="medico">Médico</SelectItem>
                            <SelectItem value="atleta">Atleta</SelectItem>
                            <SelectItem value="familiar">Familiar</SelectItem>
                            <SelectItem value="torcedor">Torcedor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Campos específicos para atletas */}
                      {newUser.role === 'atleta' && (
                        <>
                          <div>
                            <Label htmlFor="newUserDateOfBirth">Data de Nascimento *</Label>
                            <Input
                              id="newUserDateOfBirth"
                              type="date"
                              value={newUser.dateOfBirth}
                              onChange={(e) => setNewUser(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                              data-testid="input-date-of-birth"
                            />
                          </div>
                          <div>
                            <Label htmlFor="newUserTeam">Time *</Label>
                            <Select
                              value={newUser.teamId}
                              onValueChange={(value) => setNewUser(prev => ({ ...prev, teamId: value }))}
                            >
                              <SelectTrigger data-testid="select-team">
                                <SelectValue placeholder="Selecione o time" />
                              </SelectTrigger>
                              <SelectContent>
                                {teams.map((team: any) => (
                                  <SelectItem key={team.id} value={team.id.toString()}>
                                    {team.name} - {team.category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newUser.sendInvite}
                        onCheckedChange={(checked) => setNewUser(prev => ({ ...prev, sendInvite: checked }))}
                      />
                      <Label>Enviar convite por email</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddUserForm(false);
                          setNewUser({
                            firstName: '',
                            lastName: '',
                            email: '',
                            password: '',
                            role: 'atleta',
                            dateOfBirth: '',
                            teamId: '',
                            sendInvite: true
                          });
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={addNewUser}
                        disabled={addUserMutation.isPending || !newUser.firstName || !newUser.email}
                      >
                        {addUserMutation.isPending ? "Adicionando..." : "Adicionar Usuário"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search and Filter Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Gerenciar Usuários ({filteredAndSortedUsers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nome, sobrenome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setSearchTerm("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Filter Controls */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Filtros:</span>
                    </div>
                    
                    {/* Role Filter */}
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todas as funções" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as funções</SelectItem>
                        <SelectItem value="administrador">Administrador</SelectItem>
                        <SelectItem value="coordenador">Coordenador</SelectItem>
                        <SelectItem value="comissao">Comissão Técnica</SelectItem>
                        <SelectItem value="medico">Médico</SelectItem>
                        <SelectItem value="atleta">Atleta</SelectItem>
                        <SelectItem value="familiar">Familiar</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Todos status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Inativos</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort Options */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Nome</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="role">Função</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort Order */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="flex items-center gap-2"
                    >
                      {sortOrder === "asc" ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      )}
                      {sortOrder === "asc" ? "A-Z" : "Z-A"}
                    </Button>

                    {/* Clear Filters */}
                    {(searchTerm || roleFilter !== "all" || statusFilter !== "all" || sortBy !== "name" || sortOrder !== "asc") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setRoleFilter("all");
                          setStatusFilter("all");
                          setSortBy("name");
                          setSortOrder("asc");
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {filteredAndSortedUsers && filteredAndSortedUsers.length > 0 ? (
                  filteredAndSortedUsers.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">
                          Último acesso: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('pt-BR') : 'Nunca'}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Select
                          value={user.role}
                          onValueChange={(value) => updateUserRole(user.id, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrador">Administrador</SelectItem>
                            <SelectItem value="coordenador">Coordenador</SelectItem>
                            <SelectItem value="comissao">Comissão Técnica</SelectItem>
                            <SelectItem value="medico">Médico</SelectItem>
                            <SelectItem value="atleta">Atleta</SelectItem>
                            <SelectItem value="familiar">Familiar</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={(checked) => toggleUserStatus(user.id, checked)}
                          />
                          <Label className="text-xs text-gray-500">
                            {user.isActive ? 'Ativo' : 'Inativo'}
                          </Label>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                          disabled={deleteUserMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum usuário encontrado</p>
                    {searchTerm || roleFilter !== "all" || statusFilter !== "all" ? (
                      <div className="space-y-2">
                        <p className="text-sm">Tente ajustar os filtros ou termo de busca</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setRoleFilter("all");
                            setStatusFilter("all");
                          }}
                        >
                          Limpar filtros
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm">Adicione o primeiro usuário ao sistema</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Aparência da Homepage</h3>
              <p className="text-gray-600">Personalize cores, tipografia e estilos da página inicial pública</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetVisualConfig}
                disabled={saveVisualConfigMutation.isPending}
                data-testid="button-reset-visual-config"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrões
              </Button>
              <Button
                onClick={saveVisualConfig}
                disabled={saveVisualConfigMutation.isPending}
                data-testid="button-save-visual-config"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveVisualConfigMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>

          {/* Colors Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Cores Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="heroGradientStart">Cor Hero (Gradiente Inicial)</Label>
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      id="heroGradientStart"
                      type="color"
                      value={visualConfig.colors.heroGradientStart}
                      onChange={(e) => handleVisualConfigChange('colors', 'heroGradientStart', e.target.value)}
                      className="w-20 h-10"
                      data-testid="input-hero-gradient-start"
                    />
                    <Input
                      type="text"
                      value={visualConfig.colors.heroGradientStart}
                      onChange={(e) => handleVisualConfigChange('colors', 'heroGradientStart', e.target.value)}
                      placeholder="#0ea5e9"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="heroGradientEnd">Cor Hero (Gradiente Final)</Label>
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      id="heroGradientEnd"
                      type="color"
                      value={visualConfig.colors.heroGradientEnd}
                      onChange={(e) => handleVisualConfigChange('colors', 'heroGradientEnd', e.target.value)}
                      className="w-20 h-10"
                      data-testid="input-hero-gradient-end"
                    />
                    <Input
                      type="text"
                      value={visualConfig.colors.heroGradientEnd}
                      onChange={(e) => handleVisualConfigChange('colors', 'heroGradientEnd', e.target.value)}
                      placeholder="#1d4ed8"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="sectionBackground">Cor de Fundo das Seções</Label>
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      id="sectionBackground"
                      type="color"
                      value={visualConfig.colors.sectionBackground}
                      onChange={(e) => handleVisualConfigChange('colors', 'sectionBackground', e.target.value)}
                      className="w-20 h-10"
                      data-testid="input-section-background"
                    />
                    <Input
                      type="text"
                      value={visualConfig.colors.sectionBackground}
                      onChange={(e) => handleVisualConfigChange('colors', 'sectionBackground', e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="formBackground">Cor de Fundo do Formulário</Label>
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      id="formBackground"
                      type="color"
                      value={visualConfig.colors.formBackground}
                      onChange={(e) => handleVisualConfigChange('colors', 'formBackground', e.target.value)}
                      className="w-20 h-10"
                      data-testid="input-form-background"
                    />
                    <Input
                      type="text"
                      value={visualConfig.colors.formBackground}
                      onChange={(e) => handleVisualConfigChange('colors', 'formBackground', e.target.value)}
                      placeholder="#f9fafb"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="textPrimary">Cor do Texto Principal</Label>
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      id="textPrimary"
                      type="color"
                      value={visualConfig.colors.textPrimary}
                      onChange={(e) => handleVisualConfigChange('colors', 'textPrimary', e.target.value)}
                      className="w-20 h-10"
                      data-testid="input-text-primary"
                    />
                    <Input
                      type="text"
                      value={visualConfig.colors.textPrimary}
                      onChange={(e) => handleVisualConfigChange('colors', 'textPrimary', e.target.value)}
                      placeholder="#111827"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="textSecondary">Cor do Texto Secundário</Label>
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      id="textSecondary"
                      type="color"
                      value={visualConfig.colors.textSecondary}
                      onChange={(e) => handleVisualConfigChange('colors', 'textSecondary', e.target.value)}
                      className="w-20 h-10"
                      data-testid="input-text-secondary"
                    />
                    <Input
                      type="text"
                      value={visualConfig.colors.textSecondary}
                      onChange={(e) => handleVisualConfigChange('colors', 'textSecondary', e.target.value)}
                      placeholder="#6b7280"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Tipografia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="h1Size">Tamanho dos Títulos (H1): {visualConfig.typography.h1Size}px</Label>
                  <Slider
                    id="h1Size"
                    min={32}
                    max={72}
                    step={2}
                    value={[visualConfig.typography.h1Size]}
                    onValueChange={(values) => handleVisualConfigChange('typography', 'h1Size', values[0])}
                    className="mt-2"
                    data-testid="slider-h1-size"
                  />
                </div>

                <div>
                  <Label htmlFor="h2Size">Tamanho dos Subtítulos (H2): {visualConfig.typography.h2Size}px</Label>
                  <Slider
                    id="h2Size"
                    min={24}
                    max={48}
                    step={2}
                    value={[visualConfig.typography.h2Size]}
                    onValueChange={(values) => handleVisualConfigChange('typography', 'h2Size', values[0])}
                    className="mt-2"
                    data-testid="slider-h2-size"
                  />
                </div>

                <div>
                  <Label htmlFor="bodySize">Tamanho do Texto Normal: {visualConfig.typography.bodySize}px</Label>
                  <Slider
                    id="bodySize"
                    min={14}
                    max={20}
                    step={1}
                    value={[visualConfig.typography.bodySize]}
                    onValueChange={(values) => handleVisualConfigChange('typography', 'bodySize', values[0])}
                    className="mt-2"
                    data-testid="slider-body-size"
                  />
                </div>

                <div>
                  <Label htmlFor="fontFamily">Família de Fonte</Label>
                  <Select
                    value={visualConfig.typography.fontFamily}
                    onValueChange={(value) => handleVisualConfigChange('typography', 'fontFamily', value)}
                  >
                    <SelectTrigger id="fontFamily" className="mt-2" data-testid="select-font-family">
                      <SelectValue placeholder="Selecione a fonte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Segoe UI">Segoe UI</SelectItem>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Background Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Imagens de Fundo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label htmlFor="heroImageUrl">URL da Imagem de Fundo do Hero</Label>
                  <Input
                    id="heroImageUrl"
                    type="text"
                    value={visualConfig.background.heroImageUrl || ""}
                    onChange={(e) => handleVisualConfigChange('background', 'heroImageUrl', e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="mt-2"
                    data-testid="input-hero-image-url"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Cole a URL de uma imagem externa ou deixe em branco para usar o gradiente
                  </p>
                </div>

                <div>
                  <Label htmlFor="heroImageOpacity">Opacidade da Imagem de Fundo: {visualConfig.background.heroImageOpacity}%</Label>
                  <Slider
                    id="heroImageOpacity"
                    min={0}
                    max={100}
                    step={5}
                    value={[visualConfig.background.heroImageOpacity]}
                    onValueChange={(values) => handleVisualConfigChange('background', 'heroImageOpacity', values[0])}
                    className="mt-2"
                    data-testid="slider-hero-opacity"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buttons Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Cores dos Botões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="buttonPrimary">Cor dos Botões Primários</Label>
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      id="buttonPrimary"
                      type="color"
                      value={visualConfig.colors.buttonPrimary}
                      onChange={(e) => handleVisualConfigChange('colors', 'buttonPrimary', e.target.value)}
                      className="w-20 h-10"
                      data-testid="input-button-primary"
                    />
                    <Input
                      type="text"
                      value={visualConfig.colors.buttonPrimary}
                      onChange={(e) => handleVisualConfigChange('colors', 'buttonPrimary', e.target.value)}
                      placeholder="#0ea5e9"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="buttonSecondary">Cor dos Botões Secundários</Label>
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      id="buttonSecondary"
                      type="color"
                      value={visualConfig.colors.buttonSecondary}
                      onChange={(e) => handleVisualConfigChange('colors', 'buttonSecondary', e.target.value)}
                      className="w-20 h-10"
                      data-testid="input-button-secondary"
                    />
                    <Input
                      type="text"
                      value={visualConfig.colors.buttonSecondary}
                      onChange={(e) => handleVisualConfigChange('colors', 'buttonSecondary', e.target.value)}
                      placeholder="#6b7280"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="buttonText">Cor do Texto dos Botões</Label>
                  <div className="flex gap-2 items-center mt-2">
                    <Input
                      id="buttonText"
                      type="color"
                      value={visualConfig.colors.buttonText}
                      onChange={(e) => handleVisualConfigChange('colors', 'buttonText', e.target.value)}
                      className="w-20 h-10"
                      data-testid="input-button-text"
                    />
                    <Input
                      type="text"
                      value={visualConfig.colors.buttonText}
                      onChange={(e) => handleVisualConfigChange('colors', 'buttonText', e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Preview dos Botões</h4>
                <div className="flex gap-4 flex-wrap">
                  <Button 
                    style={{ 
                      backgroundColor: visualConfig.colors.buttonPrimary, 
                      color: visualConfig.colors.buttonText 
                    }}
                    data-testid="button-preview-primary"
                  >
                    Botão Primário
                  </Button>
                  <Button 
                    variant="outline"
                    style={{ 
                      borderColor: visualConfig.colors.buttonSecondary,
                      color: visualConfig.colors.buttonSecondary
                    }}
                    data-testid="button-preview-secondary"
                  >
                    Botão Secundário
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança e Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Alterar Senha</h4>
                <p className="text-sm text-gray-500">
                  Para sua segurança, altere sua senha regularmente
                </p>
                
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="current-password">Senha Atual *</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      placeholder="Digite sua senha atual"
                      className="mt-1"
                      data-testid="input-current-password"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new-password">Nova Senha *</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      placeholder="Digite a nova senha (mínimo 6 caracteres)"
                      className="mt-1"
                      data-testid="input-new-password"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirm-password">Confirmar Nova Senha *</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      placeholder="Confirme a nova senha"
                      className="mt-1"
                      data-testid="input-confirm-password"
                    />
                  </div>
                  
                  <Button
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    className="w-full"
                    data-testid="button-change-password"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {changePasswordMutation.isPending ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup e Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Backup Automático</Label>
                  <p className="text-sm text-gray-500">
                    Realizar backup automático dos dados diariamente
                  </p>
                </div>
                <Switch
                  checked={clubSettings.autoBackup}
                  onCheckedChange={(checked) => handleSettingChange('autoBackup', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Ações de Manutenção</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Exportar Dados
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Relatório do Sistema
                  </Button>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">Importante</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Recomendamos fazer backup regular dos dados importantes.
                      Em caso de problemas, entre em contato com o suporte técnico.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Altere as informações do usuário. A senha é opcional - deixe em branco para manter a atual.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 overflow-y-auto max-h-[calc(90vh-12rem)]">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  value={editUserData.firstName}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome *</Label>
                <Input
                  id="lastName"
                  value={editUserData.lastName}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Sobrenome"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select
                value={editUserData.role}
                onValueChange={(value) => setEditUserData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="coordenador">Coordenador</SelectItem>
                  <SelectItem value="comissao">Comissão Técnica</SelectItem>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="atleta">Atleta</SelectItem>
                  <SelectItem value="familiar">Familiar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category selection for athletes */}
            {editUserData.role === 'atleta' && editUserData.athleteId && (
              <div className="space-y-2">
                <Label>Categorias</Label>
                <div className="text-sm text-gray-500 mb-2">
                  Selecione as categorias que o atleta pode jogar
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['Sub-11', 'Sub-13', 'Sub-15', 'Sub-17', 'Sub-20', 'Profissional'].map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`category-${category}`}
                        checked={editUserData.athleteCategories.includes(category)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditUserData(prev => ({
                              ...prev,
                              athleteCategories: [...prev.athleteCategories, category]
                            }));
                          } else {
                            setEditUserData(prev => ({
                              ...prev,
                              athleteCategories: prev.athleteCategories.filter(c => c !== category)
                            }));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor={`category-${category}`} className="text-sm">
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={editUserData.isActive}
                onCheckedChange={(checked) => setEditUserData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Usuário ativo</Label>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <Label className="text-sm font-medium">Alterar Senha (Opcional)</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateRandomPassword}
                    className="flex items-center gap-2"
                    data-testid="button-generate-password"
                  >
                    <Dices className="h-4 w-4" />
                    Gerar Senha
                  </Button>
                  {editUserData.password && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={sendPasswordByEmail}
                      disabled={sendPasswordEmailMutation.isPending}
                      className="flex items-center gap-2"
                      data-testid="button-send-password-email"
                    >
                      <Mail className="h-4 w-4" />
                      {sendPasswordEmailMutation.isPending ? "Enviando..." : "Enviar por E-mail"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-blue-800 dark:text-blue-200">
                    <strong>Sobre o envio de senha por e-mail:</strong>
                    <p className="mt-1">
                      Por segurança, as senhas são criptografadas e não podem ser recuperadas. O botão "Enviar por E-mail" aparece apenas quando você gera uma nova senha ou digita uma nova senha manualmente.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={editUserData.password}
                    onChange={(e) => setEditUserData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Deixe em branco para manter a atual"
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    {editUserData.password && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={copyPasswordToClipboard}
                        className="h-8 w-8 p-0"
                        title="Copiar senha"
                      >
                        {passwordCopied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-8 w-8 p-0"
                      title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={editUserData.confirmPassword}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirme a nova senha"
                />
              </div>
              
              {editUserData.password && (
                <div className="text-xs text-gray-500">
                  A senha deve ter pelo menos 6 caracteres
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}