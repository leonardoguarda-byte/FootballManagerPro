import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, ShoppingBag, Users, MapPin, ExternalLink, ChevronRight, Heart } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Default content if no custom content is configured
const defaultContent = {
  heroTitle: "Natus Vincere Academy",
  heroSubtitle: "Academia de Futebol de Excelência",
  heroDescription: "Formando campeões dentro e fora de campo. Excelência no desenvolvimento de jovens talentos do futebol.",
  heroImage: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&h=600&fit=crop",
  aboutTitle: "Sobre Nossa Academia",
  aboutDescription: "A Natus Vincere Academy é uma instituição dedicada ao desenvolvimento integral de jovens atletas. Com mais de 15 anos de história, formamos não apenas jogadores de futebol excepcionais, mas também cidadãos preparados para os desafios da vida.",
  news: [
    {
      title: "Academia conquista título regional sub-15",
      excerpt: "Equipe venceu por 3x1 na grande final e conquista o campeonato regional",
      date: "5 de Outubro, 2025",
      image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=400&fit=crop"
    },
    {
      title: "Novo centro de treinamento é inaugurado",
      excerpt: "Instalações de última geração para desenvolvimento dos atletas",
      date: "2 de Outubro, 2025",
      image: "https://images.unsplash.com/photo-1624880357913-a8539238245b?w=800&h=400&fit=crop"
    },
    {
      title: "Atletas da base são convocados para seleção estadual",
      excerpt: "Três jogadores recebem convocação para representar o estado",
      date: "28 de Setembro, 2025",
      image: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800&h=400&fit=crop"
    },
  ],
  games: [
    { date: "15 Out", opponent: "FC Barcelona", time: "16:00", location: "Estádio Principal" },
    { date: "22 Out", opponent: "Real Madrid", time: "18:30", location: "Santiago Bernabéu" },
    { date: "29 Out", opponent: "Atlético Madrid", time: "15:00", location: "Estádio Principal" },
  ],
  sponsors: [
    { name: "Nike", logo: "https://via.placeholder.com/150x60?text=Nike" },
    { name: "Adidas", logo: "https://via.placeholder.com/150x60?text=Adidas" },
    { name: "Gatorade", logo: "https://via.placeholder.com/150x60?text=Gatorade" },
    { name: "Banco Nacional", logo: "https://via.placeholder.com/150x60?text=Banco+Nacional" },
  ],
  merchandise: [
    { name: "Camisa Oficial 2025", price: "R$ 199,90", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop" },
    { name: "Agasalho de Treino", price: "R$ 349,90", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop" },
    { name: "Boné Oficial", price: "R$ 79,90", image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop" },
    { name: "Mochila do Clube", price: "R$ 149,90", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop" },
  ]
};

const registrationFormSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  dateOfBirth: z.string().optional(), // Optional for familia/torcedor, required for atleta (validated on submit)
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  userType: z.enum(["atleta", "familiar", "torcedor", "comissao_tecnica", "coordenador", "medico"], {
    required_error: "Por favor, selecione um tipo de usuário",
  }),
  message: z.string().optional(),
});

type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

export default function Landing() {
  const { toast } = useToast();
  
  const handleMemberLogin = () => {
    window.location.href = "/api/login";
  };

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      email: "",
      phone: "",
      password: "",
      userType: "atleta" as const,
      message: "",
    },
  });

  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationFormValues) => {
      return await apiRequest("/api/public/register", "POST", data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sucesso!",
        description: data.message || "Inscrição enviada com sucesso!",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar inscrição",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationFormValues) => {
    registrationMutation.mutate(data);
  };

  // Load club data from public endpoint
  const { data: clubData } = useQuery({
    queryKey: ["/api/public/club"],
    retry: false,
  });

  // Load homepage customizations from public endpoint
  const { data: homepageContent } = useQuery({
    queryKey: ["/api/public/homepage-content"],
    retry: false,
  });

  // Load real store products from public endpoint
  const { data: storeProducts } = useQuery({
    queryKey: ["/api/public/store-products"],
    retry: false,
  });

  // Load real games highlights from public endpoint
  const { data: gamesHighlights } = useQuery({
    queryKey: ["/api/public/games-highlights"],
    retry: false,
  });

  // Load visual customizations from public endpoint
  const { data: visualConfig } = useQuery({
    queryKey: ["/api/config/homepage-visual"],
    retry: false,
  });

  // Merge club data with customizations and defaults
  // Priority: customizations > club data > defaults
  const content = {
    heroTitle: homepageContent?.heroTitle || clubData?.name || defaultContent.heroTitle,
    heroSubtitle: homepageContent?.heroSubtitle || clubData?.shortName || defaultContent.heroSubtitle,
    heroDescription: homepageContent?.heroDescription || clubData?.description || defaultContent.heroDescription,
    heroImage: homepageContent?.heroImage || clubData?.logo || defaultContent.heroImage,
    aboutTitle: homepageContent?.aboutTitle || defaultContent.aboutTitle,
    aboutDescription: homepageContent?.aboutDescription || clubData?.description || defaultContent.aboutDescription,
  };

  // Extrair categorias dos jogos em destaque (estrutura: { "sub-15": { past: [], next: [] } })
  const gameCategories = gamesHighlights || {};
  const hasRealGames = Object.keys(gameCategories).length > 0;
  
  // Fallback para jogos customizados ou padrão quando não há jogos reais
  const fallbackGames = homepageContent?.games || defaultContent.games;
  
  const latestNews = homepageContent?.news || defaultContent.news;
  const sponsors = homepageContent?.sponsors || defaultContent.sponsors;
  
  // Priority: custom homepage products > real store products > default mock data
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const realProducts = storeProducts?.map((product: any) => ({
    name: product.name,
    price: formatCurrency(parseFloat(product.price)),
    image: product.image || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
    description: product.description
  })) || [];

  const merchandise = homepageContent?.merchandise || (realProducts.length > 0 ? realProducts : defaultContent.merchandise);

  // Dynamic styles from visual config with safe fallbacks
  const heroGradientStart = visualConfig?.colors?.heroGradientStart || '#0078D4';
  const heroGradientEnd = visualConfig?.colors?.heroGradientEnd || '#1E40AF';
  const heroGradient = `linear-gradient(to bottom right, ${heroGradientStart}, ${heroGradientEnd})`;
  
  const heroBackground = visualConfig?.background?.heroImageUrl ? 
    `url(${visualConfig.background.heroImageUrl})` : 
    undefined;
  
  const heroBackgroundOpacity = visualConfig?.background?.heroImageOpacity !== undefined ? 
    visualConfig.background.heroImageOpacity / 100 : 
    1;

  return (
    <div 
      className="min-h-screen"
      style={{
        fontFamily: visualConfig?.typography?.fontFamily || 'Segoe UI, sans-serif',
        fontSize: visualConfig?.typography?.bodySize ? `${visualConfig.typography.bodySize}px` : '16px',
        color: visualConfig?.colors?.textPrimary || undefined,
        backgroundColor: visualConfig?.colors?.sectionBackground || '#f5f7fa',
      }}
    >
      {/* Header/Navigation */}
      <header className="fluent-shadow sticky top-0 z-50" style={{ backgroundColor: visualConfig?.colors?.sectionBackground || '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: visualConfig?.colors?.buttonPrimary || '#0078D4' }}
              >
                {clubData?.logo ? (
                  <img 
                    src={clubData.logo} 
                    alt={`${clubData.name} logo`}
                    className="w-10 h-10 object-contain rounded-full"
                  />
                ) : (
                  <Trophy className="w-7 h-7" style={{ color: visualConfig?.colors?.buttonText || '#ffffff' }} />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>{content.heroTitle}</h1>
                <p className="text-xs" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}99` : '#6B7280' }}>{content.heroSubtitle}</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <a href="#inicio" className="transition-colors" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>Início</a>
              <a href="#sobre" className="transition-colors" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>Sobre</a>
              <a href="#noticias" className="transition-colors" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>Notícias</a>
              <a href="#calendario" className="transition-colors" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>Calendário</a>
              <a href="#loja" className="transition-colors" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>Loja</a>
              <Button 
                onClick={handleMemberLogin}
                style={{
                  backgroundColor: visualConfig?.colors?.buttonPrimary || '#0078D4',
                  color: visualConfig?.colors?.buttonText || '#ffffff',
                }}
                className="hover:opacity-90"
                data-testid="button-member-login"
              >
                Acesso de Membros
              </Button>
            </nav>

            {/* Mobile Login Button */}
            <div className="md:hidden">
              <Button 
                onClick={handleMemberLogin} 
                size="sm"
                style={{
                  backgroundColor: visualConfig?.colors?.buttonPrimary || '#0078D4',
                  color: visualConfig?.colors?.buttonText || '#ffffff',
                }}
                className="hover:opacity-90"
                data-testid="button-member-login-mobile"
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        id="inicio" 
        className="relative py-12 md:py-24"
        style={{
          background: heroGradient || 'linear-gradient(to bottom right, #0078D4, #1E40AF)',
          backgroundImage: heroBackground ? `${heroBackground}, ${heroGradient || 'linear-gradient(to bottom right, #0078D4, #1E40AF)'}` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: heroBackground ? 'overlay' : undefined,
        }}
      >
        {heroBackground && (
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundColor: `rgba(0, 0, 0, ${1 - heroBackgroundOpacity})`,
              pointerEvents: 'none',
            }} 
          />
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <Badge 
            className="mb-4 md:mb-6 text-xs md:text-sm" 
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
            }}
          >Temporada 2025</Badge>
          <h1 
            className="font-bold mb-4 md:mb-6 text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
            style={{
              fontSize: visualConfig?.typography?.h1Size ? `${visualConfig.typography.h1Size}px` : undefined,
            }}
          >
            {content.heroTitle}
          </h1>
          <p 
            className="mb-6 md:mb-8 max-w-3xl mx-auto opacity-90 text-white text-base sm:text-lg md:text-xl"
            style={{
              fontSize: visualConfig?.typography?.h2Size ? `${visualConfig.typography.h2Size}px` : undefined,
            }}
          >
            {content.heroDescription}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4 sm:px-0">
            <Button 
              size="lg" 
              className="bg-white text-blue-700 hover:bg-gray-100 font-bold w-full sm:w-auto text-sm md:text-base"
              data-testid="button-join-academy"
              onClick={() => {
                document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Faça Parte do Clube
              <ChevronRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white bg-white/20 text-white hover:bg-white hover:text-blue-700 font-semibold w-full sm:w-auto text-sm md:text-base"
              data-testid="button-watch-highlights"
            >
              Assistir Melhores Momentos
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="py-12 md:py-20" style={{ backgroundColor: visualConfig?.colors?.sectionBackground || '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h2 
                className="font-bold mb-4 md:mb-6 text-2xl sm:text-3xl md:text-4xl"
                style={{
                  fontSize: visualConfig?.typography?.h1Size ? `${visualConfig.typography.h1Size * 0.8}px` : undefined,
                  color: visualConfig?.colors?.textPrimary || '#1A1A1A',
                }}
              >{content.aboutTitle}</h2>
              <p className="mb-6 text-base md:text-lg" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>
                {content.aboutDescription}
              </p>
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div>
                  <div className="text-2xl md:text-3xl font-bold mb-1 md:mb-2" style={{ color: visualConfig?.colors?.buttonPrimary || '#0078D4' }}>500+</div>
                  <div className="text-sm md:text-base" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>Atletas Formados</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold mb-1 md:mb-2" style={{ color: visualConfig?.colors?.buttonPrimary || '#0078D4' }}>25+</div>
                  <div className="text-sm md:text-base" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>Títulos Conquistados</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold mb-1 md:mb-2" style={{ color: visualConfig?.colors?.buttonPrimary || '#0078D4' }}>12</div>
                  <div className="text-sm md:text-base" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>Categorias de Base</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold mb-1 md:mb-2" style={{ color: visualConfig?.colors?.buttonPrimary || '#0078D4' }}>98%</div>
                  <div className="text-sm md:text-base" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>Taxa de Aprovação</div>
                </div>
              </div>
            </div>
            <div className="relative mt-6 md:mt-0">
              <img 
                src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop" 
                alt={clubData?.name || "Academia"}
                className="rounded-lg fluent-shadow-hover w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section id="noticias" className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 md:mb-12">
            <h2 
              className="font-bold mb-3 md:mb-4 text-2xl sm:text-3xl md:text-4xl"
              style={{
                fontSize: visualConfig?.typography?.h1Size ? `${visualConfig.typography.h1Size * 0.8}px` : undefined,
                color: visualConfig?.colors?.textPrimary || undefined,
              }}
            >Últimas Notícias</h2>
            <p className="text-base md:text-lg" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>Fique por dentro de tudo que acontece na academia</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {latestNews.map((news, index) => (
              <Card key={index} className="fluent-shadow hover:fluent-shadow-hover transition-shadow overflow-hidden" data-testid={`card-news-${index}`}>
                <img src={news.image} alt={news.title} className="w-full h-40 md:h-48 object-cover" />
                <CardHeader className="p-4 md:p-6">
                  <div className="text-xs md:text-sm mb-2" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>{news.date}</div>
                  <CardTitle className="text-base md:text-lg" style={{ fontSize: visualConfig?.typography?.h2Size ? `${visualConfig.typography.h2Size * 0.8}px` : undefined, color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>{news.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <p className="mb-3 md:mb-4 text-sm md:text-base" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>{news.excerpt}</p>
                  <Button variant="link" className="p-0 text-sm md:text-base" style={{ color: visualConfig?.colors?.buttonPrimary || '#0078D4' }} data-testid={`button-read-news-${index}`}>
                    Ler mais <ChevronRight className="ml-1 h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Calendar Section */}
      <section id="calendario" className="py-12 md:py-20" style={{ backgroundColor: visualConfig?.colors?.sectionBackground || '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 md:mb-12">
            <h2 
              className="font-bold mb-3 md:mb-4 text-2xl sm:text-3xl md:text-4xl"
              style={{
                fontSize: visualConfig?.typography?.h1Size ? `${visualConfig.typography.h1Size * 0.8}px` : undefined,
                color: visualConfig?.colors?.textPrimary || undefined,
              }}
            >Jogos em Destaque</h2>
            <p className="text-base md:text-lg" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>Últimos resultados e próximos confrontos por categoria</p>
          </div>

          {hasRealGames ? (
            <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
              {Object.entries(gameCategories).map(([category, games]: [string, any]) => {
                const formattedCategory = category.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join('-');
                
                return (
                <div key={category} className="space-y-3 md:space-y-4">
                  <h3 className="text-xl md:text-2xl font-bold" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>{formattedCategory}</h3>
                  
                  {/* Próximos jogos (exibir primeiro) */}
                  {games.next && games.next.length > 0 && (
                    <>
                      {games.next.map((game: any, index: number) => {
                        const isHomeGame = game.isHome !== false;
                        
                        return (
                          <Card key={`next-${index}`} className="fluent-shadow hover:fluent-shadow-hover transition-shadow" style={{ borderColor: visualConfig?.colors?.buttonPrimary || '#0078D4', borderWidth: '1px' }} data-testid={`card-game-${category}-next-${index}`}>
                            <CardContent className="p-3 md:p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 md:gap-4 flex-1">
                                  <div className="text-center min-w-[60px] md:min-w-[70px]">
                                    <Calendar className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" style={{ color: visualConfig?.colors?.buttonPrimary || '#0078D4' }} />
                                    <div className="font-bold text-xs md:text-sm" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>{game.date}</div>
                                    <div className="text-[10px] md:text-xs" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>{game.time}</div>
                                  </div>
                                  <div className="h-10 w-px hidden sm:block" style={{ backgroundColor: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}22` : '#e5e7eb' }} />
                                  <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                      <div className="font-semibold text-sm md:text-base" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>
                                        {isHomeGame ? `${clubData?.shortName || "ESU"} vs ${game.opponent}` : `${game.opponent} vs ${clubData?.shortName || "ESU"}`}
                                      </div>
                                      <Badge variant="outline" className="text-xs w-fit" style={{ color: visualConfig?.colors?.buttonPrimary || '#0078D4', borderColor: visualConfig?.colors?.buttonPrimary || '#0078D4' }}>Próximo</Badge>
                                    </div>
                                    <div className="flex items-center text-[10px] md:text-xs" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>
                                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                      <span className="line-clamp-1">{game.location}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </>
                  )}
                  
                  {/* Jogos passados (exibir depois do próximo) */}
                  {games.past && games.past.length > 0 && (
                    <>
                      {games.past.map((game: any, index: number) => {
                        const isHomeGame = game.isHome !== false;
                        
                        return (
                          <Card key={`past-${index}`} className="fluent-shadow hover:fluent-shadow-hover transition-shadow" data-testid={`card-game-${category}-past-${index}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="text-center min-w-[70px]">
                                    <Calendar className="w-5 h-5 mx-auto mb-1" style={{ color: visualConfig?.colors?.buttonPrimary || '#0078D4' }} />
                                    <div className="font-bold text-sm" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>{game.date}</div>
                                    <div className="text-xs" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>{game.time}</div>
                                  </div>
                                  <div className="h-10 w-px" style={{ backgroundColor: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}22` : '#e5e7eb' }} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="font-semibold" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>
                                        {isHomeGame ? `${clubData?.shortName || "ESU"} vs ${game.opponent}` : `${game.opponent} vs ${clubData?.shortName || "ESU"}`}
                                      </div>
                                      {game.ourScore !== undefined && game.opponentScore !== undefined && (
                                        <Badge variant={game.ourScore > game.opponentScore ? "default" : game.ourScore < game.opponentScore ? "destructive" : "secondary"}>
                                          {isHomeGame ? `${game.ourScore} x ${game.opponentScore}` : `${game.opponentScore} x ${game.ourScore}`}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center text-xs" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {game.location}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </>
                  )}
                </div>
                );
              })}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {fallbackGames.map((game: any, index: number) => {
                const isPastGame = game.status === 'completed' || (game.ourScore !== undefined && game.ourScore !== null);
                const isHomeGame = game.isHome !== false;
                
                return (
                  <Card key={index} className="fluent-shadow hover:fluent-shadow-hover transition-shadow" data-testid={`card-game-${index}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="text-center min-w-[80px]">
                            <Calendar className="w-6 h-6 mx-auto mb-1" style={{ color: visualConfig?.colors?.buttonPrimary || '#0078D4' }} />
                            <div className="font-bold" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>{game.date}</div>
                            <div className="text-sm" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>{game.time}</div>
                          </div>
                          <div className="h-12 w-px" style={{ backgroundColor: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}22` : '#e5e7eb' }} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold text-lg" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>
                                {isHomeGame ? `${clubData?.shortName || clubData?.name || "Clube"} vs ${game.opponent}` : `${game.opponent} vs ${clubData?.shortName || clubData?.name || "Clube"}`}
                              </div>
                              {isPastGame && game.ourScore !== undefined && game.opponentScore !== undefined && (
                                <Badge variant={game.ourScore > game.opponentScore ? "default" : game.ourScore < game.opponentScore ? "destructive" : "secondary"}>
                                  {isHomeGame ? `${game.ourScore} x ${game.opponentScore}` : `${game.opponentScore} x ${game.ourScore}`}
                                </Badge>
                              )}
                              {!isPastGame && <Badge variant="outline" style={{ color: visualConfig?.colors?.buttonPrimary || '#0078D4', borderColor: visualConfig?.colors?.buttonPrimary || '#0078D4' }}>Próximo</Badge>}
                            </div>
                            <div className="flex items-center text-sm" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>
                              <MapPin className="w-4 h-4 mr-1" />
                              {game.location}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" data-testid={`button-game-info-${index}`}>
                          {isPastGame ? "Ver Resumo" : "Ver Detalhes"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Sponsors Section */}
      <section className="py-10 md:py-16" style={{ backgroundColor: visualConfig?.colors?.sectionBackground ? `${visualConfig.colors.sectionBackground}dd` : '#f9fafb' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 md:mb-10">
            <h2 
              className="font-bold mb-2 text-xl md:text-3xl"
              style={{
                fontSize: visualConfig?.typography?.h2Size ? `${visualConfig.typography.h2Size}px` : undefined,
                color: visualConfig?.colors?.textPrimary || undefined,
              }}
            >Nossos Parceiros</h2>
            <p className="text-sm md:text-base" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>Empresas que apoiam o desenvolvimento do esporte</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 items-center">
            {sponsors.map((sponsor, index) => (
              <div key={index} className="flex items-center justify-center p-4 md:p-6 bg-white rounded-lg fluent-shadow" data-testid={`sponsor-${index}`}>
                <img src={sponsor.logo} alt={sponsor.name} className="max-h-8 md:max-h-12 opacity-60 hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop Section */}
      <section id="loja" className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 md:mb-12">
            <h2 
              className="font-bold mb-3 md:mb-4 text-2xl sm:text-3xl md:text-4xl"
              style={{
                fontSize: visualConfig?.typography?.h1Size ? `${visualConfig.typography.h1Size * 0.8}px` : undefined,
                color: visualConfig?.colors?.textPrimary || undefined,
              }}
            >Loja Oficial</h2>
            <p className="text-base md:text-lg" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>Vista as cores do {clubData?.name || "clube"}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {merchandise.map((item, index) => (
              <Card key={index} className="fluent-shadow hover:fluent-shadow-hover transition-shadow overflow-hidden" data-testid={`product-${index}`}>
                <img src={item.image} alt={item.name} className="w-full h-32 sm:h-40 md:h-48 object-cover" />
                <CardContent className="p-3 md:p-4">
                  <h3 className="font-semibold mb-2 text-sm md:text-base line-clamp-2" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>{item.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-base md:text-xl font-bold" style={{ color: visualConfig?.colors?.buttonPrimary || '#0078D4' }}>{item.price}</span>
                    <Button size="sm" variant="outline" className="h-11 w-11 lg:h-9 lg:w-9" data-testid={`button-buy-${index}`}>
                      <ShoppingBag className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-8 md:mt-10">
            <Button 
              size="lg"
              style={{
                backgroundColor: visualConfig?.colors?.buttonPrimary || '#0078D4',
                color: visualConfig?.colors?.buttonText || '#ffffff',
              }}
              className="hover:opacity-90 w-full sm:w-auto text-sm md:text-base"
              data-testid="button-view-all-products"
            >
              Ver Todos os Produtos
              <ExternalLink className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section - Registration Form */}
      <section 
        id="registro" 
        className="py-12 md:py-20"
        style={{
          background: visualConfig?.colors?.formBackground || heroGradient || 'linear-gradient(to bottom right, #0078D4, #1E40AF)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 md:mb-10" style={{ color: visualConfig?.colors?.textSecondary || '#ffffff' }}>
            <Users className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 opacity-90" />
            <h2 
              className="font-bold mb-3 md:mb-4 text-2xl sm:text-3xl md:text-4xl"
              style={{
                fontSize: visualConfig?.typography?.h1Size ? `${visualConfig.typography.h1Size}px` : undefined,
                color: visualConfig?.colors?.textSecondary || '#ffffff',
              }}
            >
              Faça Parte do Clube
            </h2>
            <p 
              className="opacity-90 text-sm sm:text-base md:text-lg"
              style={{
                fontSize: visualConfig?.typography?.h2Size ? `${visualConfig.typography.h2Size}px` : undefined,
                color: visualConfig?.colors?.textSecondary || '#ffffff',
              }}
            >
              Inscrições abertas para a temporada 2025. Preencha o formulário abaixo para fazer parte de uma das maiores academias de futebol do país.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold" style={{ color: visualConfig?.colors?.textSecondary || '#ffffff' }}>Nome *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Digite seu nome" 
                          className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                          data-testid="input-firstName"
                        />
                      </FormControl>
                      <FormMessage className="font-semibold" style={{ color: '#fcd34d' }} />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold" style={{ color: visualConfig?.colors?.textSecondary || '#ffffff' }}>Sobrenome *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Digite seu sobrenome" 
                          className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                          data-testid="input-lastName"
                        />
                      </FormControl>
                      <FormMessage className="font-semibold" style={{ color: '#fcd34d' }} />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold" style={{ color: visualConfig?.colors?.textSecondary || '#ffffff' }}>
                        Data de Nascimento {form.watch("userType") === "atleta" && "*"}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date"
                          className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                          data-testid="input-dateOfBirth"
                        />
                      </FormControl>
                      <FormMessage className="font-semibold" style={{ color: '#fcd34d' }} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold" style={{ color: visualConfig?.colors?.textSecondary || '#ffffff' }}>Email *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          placeholder="seu@email.com" 
                          className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage className="font-semibold" style={{ color: '#fcd34d' }} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold" style={{ color: visualConfig?.colors?.textSecondary || '#ffffff' }}>Telefone *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="(00) 00000-0000" 
                          className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage className="font-semibold" style={{ color: '#fcd34d' }} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold" style={{ color: visualConfig?.colors?.textSecondary || '#ffffff' }}>Senha *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password"
                          placeholder="Mínimo 6 caracteres" 
                          className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage className="font-semibold" style={{ color: '#fcd34d' }} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold" style={{ color: visualConfig?.colors?.textSecondary || '#ffffff' }}>Tipo de Usuário *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger 
                            className="bg-white border-gray-300 text-gray-900"
                            data-testid="select-userType"
                          >
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="atleta">Atleta</SelectItem>
                          <SelectItem value="familiar">Familiar</SelectItem>
                          <SelectItem value="torcedor">Torcedor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="font-semibold" style={{ color: '#fcd34d' }} />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold" style={{ color: visualConfig?.colors?.textSecondary || '#ffffff' }}>Mensagem/Motivação (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Conte-nos um pouco sobre sua motivação para fazer parte do nosso clube"
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 min-h-[120px]"
                        data-testid="textarea-message"
                      />
                    </FormControl>
                    <FormMessage className="font-semibold" style={{ color: '#fcd34d' }} />
                  </FormItem>
                )}
              />

              <div className="text-center pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={registrationMutation.isPending}
                  style={{
                    backgroundColor: visualConfig?.colors?.buttonSecondary || '#ffffff',
                    color: visualConfig?.colors?.buttonText || '#0078D4',
                  }}
                  className="hover:opacity-90 min-w-[200px]"
                  data-testid="button-submit-registration"
                >
                  {registrationMutation.isPending ? "Enviando..." : "Enviar Inscrição"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12" style={{ backgroundColor: visualConfig?.colors?.sectionBackground || '#ffffff', borderColor: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}22` : '#e5e7eb' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: visualConfig?.colors?.buttonPrimary || '#0078D4' }}>
                  {clubData?.logo ? (
                    <img 
                      src={clubData.logo} 
                      alt={`${clubData.name} logo`}
                      className="w-8 h-8 object-contain rounded-full"
                    />
                  ) : (
                    <Trophy className="w-6 h-6" style={{ color: visualConfig?.colors?.buttonText || '#ffffff' }} />
                  )}
                </div>
                <span className="text-lg font-bold" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>{clubData?.shortName || clubData?.name || "Clube"}</span>
              </div>
              <p className="text-sm" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>
                Formando campeões desde {clubData?.foundedYear || "2010"}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>Links Rápidos</h3>
              <ul className="space-y-2 text-sm" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>
                <li><a href="#sobre" className="transition-colors" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }} onMouseEnter={(e) => e.currentTarget.style.color = visualConfig?.colors?.buttonPrimary || '#0078D4'} onMouseLeave={(e) => e.currentTarget.style.color = visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280'}>Sobre Nós</a></li>
                <li><a href="#noticias" className="transition-colors" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }} onMouseEnter={(e) => e.currentTarget.style.color = visualConfig?.colors?.buttonPrimary || '#0078D4'} onMouseLeave={(e) => e.currentTarget.style.color = visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280'}>Notícias</a></li>
                <li><a href="#calendario" className="transition-colors" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }} onMouseEnter={(e) => e.currentTarget.style.color = visualConfig?.colors?.buttonPrimary || '#0078D4'} onMouseLeave={(e) => e.currentTarget.style.color = visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280'}>Calendário</a></li>
                <li><a href="#loja" className="transition-colors" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }} onMouseEnter={(e) => e.currentTarget.style.color = visualConfig?.colors?.buttonPrimary || '#0078D4'} onMouseLeave={(e) => e.currentTarget.style.color = visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280'}>Loja</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>Contato</h3>
              <ul className="space-y-2 text-sm" style={{ color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>
                <li>{clubData?.email || "contato@clube.com.br"}</li>
                <li>{clubData?.phone || "(11) 0000-0000"}</li>
                <li>{clubData?.city ? `${clubData.city}${clubData.state ? ` - ${clubData.state}` : ''}${clubData.country ? `, ${clubData.country}` : ''}` : "Cidade - Estado"}</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4" style={{ color: visualConfig?.colors?.textPrimary || '#1A1A1A' }}>Redes Sociais</h3>
              <div className="flex gap-3">
                <Button size="sm" variant="outline" className="w-10 h-10 p-0" data-testid="button-social-facebook">
                  <Heart className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="w-10 h-10 p-0" data-testid="button-social-instagram">
                  <Heart className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="w-10 h-10 p-0" data-testid="button-social-twitter">
                  <Heart className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="pt-8 text-center text-sm" style={{ borderTop: `1px solid ${visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}22` : '#e5e7eb'}`, color: visualConfig?.colors?.textPrimary ? `${visualConfig.colors.textPrimary}cc` : '#6B7280' }}>
            <p>© 2025 {clubData?.name || "Academia"}. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
