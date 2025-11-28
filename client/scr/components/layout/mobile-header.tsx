import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar";
import { useQuery } from "@tanstack/react-query";

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

export default function MobileHeader() {
  const { toggleSidebar } = useSidebar();
  
  const { data: currentClub } = useQuery<Club | null>({
    queryKey: ["/api/auth/current-club"],
    retry: false,
  });

  return (
    <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          data-testid="button-open-sidebar"
          className="mr-2"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {currentClub?.shortName || "Natus Vincere Academy"}
        </h1>
      </div>
    </div>
  );
}
