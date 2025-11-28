import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useRBAC } from "@/hooks/useRBAC";
import { apiRequest } from "@/lib/queryClient";
import { 
  Save, 
  RotateCcw, 
  Globe, 
  Newspaper, 
  Calendar, 
  Users, 
  ShoppingBag, 
  Plus,
  Trash2,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

interface HomepageContent {
  // Hero Section
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroImage: string;
  
  // About Section
  aboutTitle: string;
  aboutDescription: string;
  
  // News Section
  news: Array<{
    title: string;
    excerpt: string;
    date: string;
    image: string;
  }>;
  
  // Games Section
  games: Array<{
    date: string;
    opponent: string;
    time: string;
    location: string;
  }>;
  
  // Sponsors Section
  sponsors: Array<{
    name: string;
    logo: string;
  }>;
  
  // Merchandise Section
  merchandise: Array<{
    name: string;
    price: string;
    image: string;
  }>;
}

const defaultContent: HomepageContent = {
  heroTitle: "Natus Vincere Academy",
  heroSubtitle: "Academia de Futebol de Excelência",
  heroDescription: "Formando atletas de elite através de treinamento profissional, desenvolvimento técnico-tático e acompanhamento completo do desempenho.",
  heroImage: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&h=600&fit=crop",
  aboutTitle: "Sobre Nossa Academia",
  aboutDescription: "A Natus Vincere Academy é referência no desenvolvimento de jovens talentos do futebol. Com metodologia moderna, estrutura de primeira linha e comissão técnica experiente, preparamos atletas para os desafios do futebol profissional.",
  news: [
    {
      title: "Academia conquista título regional sub-15",
      excerpt: "Equipe venceu por 3x1 na grande final e conquista o campeonato regional",
      date: "5 de Outubro, 2025",
      image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=400&fit=crop"
    }
  ],
  games: [
    {
      date: "15 Out",
      opponent: "Adversário FC",
      time: "16:00",
      location: "Estádio Principal"
    }
  ],
  sponsors: [
    {
      name: "Parceiro 1",
      logo: "https://via.placeholder.com/150x60?text=Parceiro+1"
    }
  ],
  merchandise: [
    {
      name: "Camisa Oficial 2025",
      price: "R$ 199,90",
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop"
    }
  ]
};

export default function HomepageEditor() {
  const { isAdmin, currentClub } = useRBAC();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState<HomepageContent>(defaultContent);
  const [hasChanges, setHasChanges] = useState(false);

  // Load club data for the current club
  const { data: clubData } = useQuery<any>({
    queryKey: [`/api/clubs/${currentClub?.id}`],
    enabled: !!currentClub?.id,
    refetchOnMount: 'always',
  });

  // Load homepage content from backend
  const { data: configData } = useQuery({
    queryKey: ["/api/config"],
    retry: false,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    // Wait for config data to load
    if (!configData) return;
    
    // Merge club data with customizations
    // Priority: customizations > club data > defaults
    const homepageConfig = configData.find((config: any) => config.key === 'homepage_content');
    const customContent = homepageConfig?.value;
    
    // Build base content from club data or defaults
    const baseContent = {
      heroTitle: clubData?.name || defaultContent.heroTitle,
      heroSubtitle: clubData?.shortName || defaultContent.heroSubtitle,
      heroDescription: clubData?.description || defaultContent.heroDescription,
      heroImage: clubData?.logo || defaultContent.heroImage,
      aboutTitle: defaultContent.aboutTitle,
      aboutDescription: clubData?.description || defaultContent.aboutDescription,
      news: defaultContent.news,
      games: defaultContent.games,
      sponsors: defaultContent.sponsors,
      merchandise: defaultContent.merchandise,
    };

    // Apply customizations over base content
    setContent({
      heroTitle: customContent?.heroTitle ?? baseContent.heroTitle,
      heroSubtitle: customContent?.heroSubtitle ?? baseContent.heroSubtitle,
      heroDescription: customContent?.heroDescription ?? baseContent.heroDescription,
      heroImage: customContent?.heroImage ?? baseContent.heroImage,
      aboutTitle: customContent?.aboutTitle ?? baseContent.aboutTitle,
      aboutDescription: customContent?.aboutDescription ?? baseContent.aboutDescription,
      news: customContent?.news ?? baseContent.news,
      games: customContent?.games ?? baseContent.games,
      sponsors: customContent?.sponsors ?? baseContent.sponsors,
      merchandise: customContent?.merchandise ?? baseContent.merchandise,
    });
  }, [configData, clubData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (content: HomepageContent) => {
      return await apiRequest("/api/config", "POST", {
        key: "homepage_content",
        value: content,
        description: "Conteúdo da página inicial pública"
      });
    },
    onSuccess: () => {
      toast({
        title: "Homepage atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/homepage-content"] });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  // Delete customizations mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/config/homepage_content", "DELETE");
    },
    onSuccess: async () => {
      // Invalidate queries first
      await queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/public/homepage-content"] });
      
      let freshClubData = null;
      
      // Only fetch club data if we have a current club ID
      if (currentClub?.id) {
        try {
          freshClubData = await queryClient.fetchQuery<any>({
            queryKey: [`/api/clubs/${currentClub.id}`],
          });
        } catch (error) {
          console.error("Error fetching club data:", error);
        }
      }
      
      // Manually update content to club data immediately
      const baseContent = {
        heroTitle: freshClubData?.name || defaultContent.heroTitle,
        heroSubtitle: freshClubData?.shortName || defaultContent.heroSubtitle,
        heroDescription: freshClubData?.description || defaultContent.heroDescription,
        heroImage: freshClubData?.logo || defaultContent.heroImage,
        aboutTitle: defaultContent.aboutTitle,
        aboutDescription: freshClubData?.description || defaultContent.aboutDescription,
        news: defaultContent.news,
        games: defaultContent.games,
        sponsors: defaultContent.sponsors,
        merchandise: defaultContent.merchandise,
      };
      setContent(baseContent);
      setHasChanges(false);
      
      toast({
        title: "Customizações removidas",
        description: "Homepage restaurada com dados do clube.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao restaurar",
        description: "Ocorreu um erro ao restaurar a homepage.",
        variant: "destructive",
      });
    },
  });

  if (!isAdmin()) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-600">Acesso Negado</h2>
          <p className="text-gray-500 mt-2">Apenas administradores podem editar a homepage.</p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    saveMutation.mutate(content);
  };

  const handleReset = () => {
    if (window.confirm("Deseja remover todas as customizações e restaurar os dados do clube?")) {
      deleteMutation.mutate();
    }
  };

  const updateContent = (key: keyof HomepageContent, value: any) => {
    setContent(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addNewsItem = () => {
    setContent(prev => ({
      ...prev,
      news: [...prev.news, {
        title: "",
        excerpt: "",
        date: new Date().toLocaleDateString('pt-BR'),
        image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=400&fit=crop"
      }]
    }));
    setHasChanges(true);
  };

  const updateNewsItem = (index: number, field: string, value: string) => {
    setContent(prev => ({
      ...prev,
      news: prev.news.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
    setHasChanges(true);
  };

  const removeNewsItem = (index: number) => {
    setContent(prev => ({
      ...prev,
      news: prev.news.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };

  const addGame = () => {
    setContent(prev => ({
      ...prev,
      games: [...prev.games, {
        date: "",
        opponent: "",
        time: "",
        location: ""
      }]
    }));
    setHasChanges(true);
  };

  const updateGame = (index: number, field: string, value: string) => {
    setContent(prev => ({
      ...prev,
      games: prev.games.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
    setHasChanges(true);
  };

  const removeGame = (index: number) => {
    setContent(prev => ({
      ...prev,
      games: prev.games.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };

  const addSponsor = () => {
    setContent(prev => ({
      ...prev,
      sponsors: [...prev.sponsors, {
        name: "",
        logo: "https://via.placeholder.com/150x60?text=Logo"
      }]
    }));
    setHasChanges(true);
  };

  const updateSponsor = (index: number, field: string, value: string) => {
    setContent(prev => ({
      ...prev,
      sponsors: prev.sponsors.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
    setHasChanges(true);
  };

  const removeSponsor = (index: number) => {
    setContent(prev => ({
      ...prev,
      sponsors: prev.sponsors.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };

  const addMerchandise = () => {
    setContent(prev => ({
      ...prev,
      merchandise: [...prev.merchandise, {
        name: "",
        price: "",
        image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop"
      }]
    }));
    setHasChanges(true);
  };

  const updateMerchandise = (index: number, field: string, value: string) => {
    setContent(prev => ({
      ...prev,
      merchandise: prev.merchandise.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
    setHasChanges(true);
  };

  const removeMerchandise = (index: number) => {
    setContent(prev => ({
      ...prev,
      merchandise: prev.merchandise.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <Globe className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editor da Homepage</h1>
            <p className="text-gray-600">Personalize o conteúdo da página inicial pública do clube</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saveMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="hero">Início</TabsTrigger>
          <TabsTrigger value="about">Sobre</TabsTrigger>
          <TabsTrigger value="news">Notícias</TabsTrigger>
          <TabsTrigger value="games">Jogos</TabsTrigger>
          <TabsTrigger value="sponsors">Parceiros</TabsTrigger>
          <TabsTrigger value="store">Loja</TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Seção Principal (Hero)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="heroTitle">Título Principal</Label>
                <Input
                  id="heroTitle"
                  value={content.heroTitle}
                  onChange={(e) => updateContent('heroTitle', e.target.value)}
                  placeholder="Nome do clube"
                />
              </div>
              <div>
                <Label htmlFor="heroSubtitle">Subtítulo</Label>
                <Input
                  id="heroSubtitle"
                  value={content.heroSubtitle}
                  onChange={(e) => updateContent('heroSubtitle', e.target.value)}
                  placeholder="Slogan do clube"
                />
              </div>
              <div>
                <Label htmlFor="heroDescription">Descrição</Label>
                <Textarea
                  id="heroDescription"
                  value={content.heroDescription}
                  onChange={(e) => updateContent('heroDescription', e.target.value)}
                  placeholder="Descrição detalhada do clube"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="heroImage">URL da Imagem de Fundo</Label>
                <Input
                  id="heroImage"
                  value={content.heroImage}
                  onChange={(e) => updateContent('heroImage', e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Section */}
        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sobre a Academia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="aboutTitle">Título da Seção</Label>
                <Input
                  id="aboutTitle"
                  value={content.aboutTitle}
                  onChange={(e) => updateContent('aboutTitle', e.target.value)}
                  placeholder="Sobre Nossa Academia"
                />
              </div>
              <div>
                <Label htmlFor="aboutDescription">Descrição</Label>
                <Textarea
                  id="aboutDescription"
                  value={content.aboutDescription}
                  onChange={(e) => updateContent('aboutDescription', e.target.value)}
                  placeholder="Conte a história e missão da academia"
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* News Section */}
        <TabsContent value="news" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5" />
                  Últimas Notícias
                </CardTitle>
                <Button onClick={addNewsItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Notícia
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.news.map((item, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">Notícia #{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNewsItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={item.title}
                        onChange={(e) => updateNewsItem(index, 'title', e.target.value)}
                        placeholder="Título da notícia"
                      />
                    </div>
                    <div>
                      <Label>Resumo</Label>
                      <Textarea
                        value={item.excerpt}
                        onChange={(e) => updateNewsItem(index, 'excerpt', e.target.value)}
                        placeholder="Breve descrição"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Data</Label>
                        <Input
                          value={item.date}
                          onChange={(e) => updateNewsItem(index, 'date', e.target.value)}
                          placeholder="5 de Outubro, 2025"
                        />
                      </div>
                      <div>
                        <Label>URL da Imagem</Label>
                        <Input
                          value={item.image}
                          onChange={(e) => updateNewsItem(index, 'image', e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Games Section */}
        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Próximos Jogos
                </CardTitle>
                <Button onClick={addGame} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Jogo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.games.map((item, index) => (
                <Card key={index} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">Jogo #{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGame(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Data</Label>
                        <Input
                          value={item.date}
                          onChange={(e) => updateGame(index, 'date', e.target.value)}
                          placeholder="15 Out"
                        />
                      </div>
                      <div>
                        <Label>Horário</Label>
                        <Input
                          value={item.time}
                          onChange={(e) => updateGame(index, 'time', e.target.value)}
                          placeholder="16:00"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Adversário</Label>
                      <Input
                        value={item.opponent}
                        onChange={(e) => updateGame(index, 'opponent', e.target.value)}
                        placeholder="Nome do time adversário"
                      />
                    </div>
                    <div>
                      <Label>Local</Label>
                      <Input
                        value={item.location}
                        onChange={(e) => updateGame(index, 'location', e.target.value)}
                        placeholder="Nome do estádio"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sponsors Section */}
        <TabsContent value="sponsors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Nossos Parceiros
                </CardTitle>
                <Button onClick={addSponsor} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Parceiro
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.sponsors.map((item, index) => (
                <Card key={index} className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">Parceiro #{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSponsor(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <Label>Nome do Parceiro</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateSponsor(index, 'name', e.target.value)}
                        placeholder="Nome da empresa"
                      />
                    </div>
                    <div>
                      <Label>URL do Logo</Label>
                      <Input
                        value={item.logo}
                        onChange={(e) => updateSponsor(index, 'logo', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Merchandise Section */}
        <TabsContent value="store" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Loja Oficial
                </CardTitle>
                <Button onClick={addMerchandise} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.merchandise.map((item, index) => (
                <Card key={index} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">Produto #{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMerchandise(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <Label>Nome do Produto</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateMerchandise(index, 'name', e.target.value)}
                        placeholder="Camisa Oficial 2025"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Preço</Label>
                        <Input
                          value={item.price}
                          onChange={(e) => updateMerchandise(index, 'price', e.target.value)}
                          placeholder="R$ 199,90"
                        />
                      </div>
                      <div>
                        <Label>URL da Imagem</Label>
                        <Input
                          value={item.image}
                          onChange={(e) => updateMerchandise(index, 'image', e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
