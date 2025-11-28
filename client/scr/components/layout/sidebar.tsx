import { Link, useLocation } from "wouter";
import { useRBAC } from "@/hooks/useRBAC";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Home,
  Users, 
  Shield, 
  Dumbbell, 
  Trophy, 
  Heart, 
  Stethoscope, 
  DollarSign, 
  BarChart, 
  Settings,
  LogOut,
  Brain,
  MapPin,
  Sun,
  Activity,
  ShoppingBag,
  X
} from "lucide-react";
import { createContext, useContext, useState, useEffect } from "react";

const iconMap = {
  home: Home,
  users: Users,
  shield: Shield,
  dumbbell: Dumbbell,
  trophy: Trophy,
  heart: Heart,
  sun: Sun,
  activity: Activity,
  stethoscope: Stethoscope,
  'dollar-sign': DollarSign,
  'shopping-bag': ShoppingBag,
  'bar-chart': BarChart,
  brain: Brain,
  settings: Settings,
  'map-pin': MapPin
};

interface Club {
  id: number;
  name: string;
  shortName: string;
  description: string | null;
  foundedYear: number | null;
  country: string | null;
  city: string | null;
  badge: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

export default function Sidebar() {
  const [location] = useLocation();
  const { getNavigationItems, getRoleDisplayName, getRoleBadgeColor } = useRBAC();
  const { isOpen, setIsOpen } = useSidebar();
  
  const navigationItems = getNavigationItems();

  const { data: currentClub } = useQuery<Club | null>({
    queryKey: ["/api/auth/current-club"],
    retry: false,
  });

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, setIsOpen]);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          data-testid="sidebar-backdrop"
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed lg:static
          inset-y-0 left-0
          z-50 lg:z-0
          w-64 
          bg-white dark:bg-gray-900 
          border-r border-gray-200 dark:border-gray-700 
          flex flex-col h-screen
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        data-testid="sidebar"
      >
        {/* Header with close button - Fixed */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {/* Close button - mobile only */}
          <div className="lg:hidden flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-sidebar"
              className="h-10 w-10 p-0"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          {/* Club info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              {currentClub?.badge ? (
                <img 
                  src={`/uploads/badges/${currentClub.badge}`} 
                  alt={`${currentClub.name} badge`}
                  className="w-8 h-8 object-contain rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <Shield className={`w-6 h-6 text-white ${currentClub?.badge ? 'hidden' : ''}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                {currentClub?.name || "Sistema de Gestão"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {currentClub?.shortName || "Esportiva"}
              </p>
            </div>
          </div>
        </div>

        {/* User Role Badge - Fixed */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Badge className={`${getRoleBadgeColor()} font-medium`}>
            {getRoleDisplayName()}
          </Badge>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] || Home;
            const isActive = location === item.path;
            
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start ${
                  isActive 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                asChild
              >
                <Link href={item.path} onClick={handleLinkClick}>
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        {/* Logout - Fixed */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            onClick={() => window.location.href = '/api/logout'}
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </Button>
        </div>
      </div>
    </>
  );
}
