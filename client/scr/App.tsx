import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import ClubSelection from "@/pages/club-selection";
import Dashboard from "@/pages/dashboard";
import Athletes from "@/pages/athletes";
import AthleteDetails from "@/pages/athlete-details";
import Teams from "@/pages/teams";
import TeamDetails from "@/pages/team-details";
import Training from "@/pages/training";
import TrainingDetails from "@/pages/training-details";
import TrainingReports from "@/pages/training-reports";
import Games from "@/pages/games";
import GameEvaluations from "@/pages/game-evaluations";
import TournamentManagement from "@/pages/tournament-management";
import TournamentDetail from "@/pages/tournament-detail";
import MineiroTournament from "@/pages/mineiro-tournament";
import Wellness from "@/pages/wellness";
import Medical from "@/pages/medical";
import Financial from "@/pages/financial";
import Store from "@/pages/store";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import OfflineTest from "@/pages/offline-test";
import Download from "@/pages/download";
import AIInsights from "@/pages/ai-insights";
import UserRegistrations from "@/pages/user-registrations";
import Register from "@/pages/register";
import Adversaries from "@/pages/adversaries";
import Stadiums from "@/pages/stadiums";
import FitnessDashboard from "@/pages/fitness-dashboard";
import HomepageEditor from "@/pages/homepage-editor";
import NotFound from "@/pages/not-found";
import Sidebar, { SidebarProvider } from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import { SyncStatus } from "@/components/offline/sync-status";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-fluent-text">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/register" component={Register} />
        <Route path="/download" component={Download} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Check if user has selected a club and season
  if (!user?.clubId || !user?.seasonId) {
    return <ClubSelection />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-fluent-bg">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <MobileHeader />
          <div className="p-4">
            <SyncStatus />
          </div>
          <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/athletes" component={Athletes} />
          <Route path="/athletes/:id" component={AthleteDetails} />
          <Route path="/teams" component={Teams} />
          <Route path="/teams/:id" component={TeamDetails} />
          <Route path="/training" component={Training} />
          <Route path="/training/:id" component={TrainingDetails} />
          <Route path="/training/:id/reports" component={TrainingReports} />
          <Route path="/games" component={Games} />
          <Route path="/games/:id/evaluations" component={GameEvaluations} />
          <Route path="/tournament-management" component={TournamentManagement} />
          <Route path="/tournaments" component={TournamentManagement} />
          <Route path="/tournaments/:id" component={TournamentDetail} />
          <Route path="/mineiro-tournament" component={MineiroTournament} />
          <Route path="/adversaries" component={Adversaries} />
          <Route path="/stadiums" component={Stadiums} />
          <Route path="/wellness" component={Wellness} />
          <Route path="/fitness-dashboard" component={FitnessDashboard} />
          <Route path="/medical" component={Medical} />
          <Route path="/financial" component={Financial} />
          <Route path="/store" component={Store} />
          <Route path="/reports" component={Reports} />
          <Route path="/ai-insights" component={AIInsights} />
          <Route path="/user-registrations" component={UserRegistrations} />
          <Route path="/settings" component={Settings} />
          <Route path="/homepage-editor" component={HomepageEditor} />
          <Route path="/download" component={Download} />
          <Route path="/offline-test" component={OfflineTest} />
          <Route component={NotFound} />
        </Switch>
      </main>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
