import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Heart, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Users,
  Target,
  Bell
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FitnessAlert {
  id: number;
  athleteId: number;
  athleteName: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
}

interface AthleteRisk {
  id: number;
  name: string;
  position: string;
  overallRiskScore: number;
  riskLevel: string;
  readinessScore: number;
  recoveryStatus: string;
  assessmentDate: string;
}

interface DashboardData {
  athletes: AthleteRisk[];
  alertStats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
  };
}

export default function FitnessDashboard() {
  const { user } = useAuth();
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteRisk | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Get current club context
  const { data: currentClub } = useQuery({
    queryKey: ["/api/auth/current-club"],
  });

  const clubId = currentClub?.id;
  const seasonId = currentClub?.seasonId;

  // Fetch fitness dashboard data
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery<DashboardData>({
    queryKey: ["/api/fitness/dashboard", clubId, seasonId],
    enabled: !!clubId && !!seasonId,
  });

  // Fetch fitness alerts
  const { data: alerts, isLoading: loadingAlerts } = useQuery<FitnessAlert[]>({
    queryKey: ["/api/fitness/alerts", clubId, seasonId], 
    enabled: !!clubId && !!seasonId,
  });

  // Process all athletes fitness calculation
  const processAllMutation = useMutation({
    mutationFn: async () => {
      if (!clubId || !seasonId) throw new Error("Missing club or season");
      return apiRequest(`/api/fitness/process-all`, "POST", { clubId, seasonId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fitness/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fitness/alerts"] });
    },
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest(`/api/fitness/alerts/${alertId}/acknowledge`, "PATCH", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fitness/alerts"] });
    },
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'moderate': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getRecoveryIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'good': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'moderate': return <Activity className="w-4 h-4 text-yellow-500" />;
      case 'poor': return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case 'critical': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const openAthleteDetails = (athlete: AthleteRisk) => {
    setSelectedAthlete(athlete);
    setDetailsDialogOpen(true);
  };

  if (loadingDashboard) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fitness & Injury Risk Dashboard</h1>
          <p className="text-gray-600">Monitor player fitness and prevent injuries</p>
        </div>
        <Button 
          onClick={() => processAllMutation.mutate()}
          disabled={processAllMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {processAllMutation.isPending ? "Processing..." : "Update All Assessments"}
        </Button>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Athletes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.athletes.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active players
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.alertStats.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {dashboardData?.athletes.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Critical + High risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Train</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {dashboardData?.athletes.filter(a => a.riskLevel === 'low' || a.riskLevel === 'moderate').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Low + Moderate risk
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="athletes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="athletes">Athletes Status</TabsTrigger>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="athletes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Athlete Risk Assessment</CardTitle>
              <CardDescription>
                Current injury risk and readiness status for all athletes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.athletes.map((athlete) => (
                  <div 
                    key={athlete.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => openAthleteDetails(athlete)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getRiskColor(athlete.riskLevel)}`}></div>
                      <div>
                        <div className="font-medium">{athlete.name}</div>
                        <div className="text-sm text-gray-500">{athlete.position}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm font-medium">Risk Score</div>
                        <div className="text-lg">{athlete.overallRiskScore?.toFixed(0) || 'N/A'}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium">Readiness</div>
                        <div className="flex items-center space-x-1">
                          <span className="text-lg">{athlete.readinessScore?.toFixed(1) || 'N/A'}</span>
                          {getRecoveryIcon(athlete.recoveryStatus)}
                        </div>
                      </div>
                      
                      <Badge variant={athlete.riskLevel === 'critical' || athlete.riskLevel === 'high' ? 'destructive' : 'default'}>
                        {getRiskIcon(athlete.riskLevel)}
                        <span className="ml-1">{athlete.riskLevel}</span>
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {(!dashboardData?.athletes || dashboardData.athletes.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No athlete data available. Click "Update All Assessments" to generate fitness reports.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Fitness Alerts</CardTitle>
              <CardDescription>
                System-generated alerts requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts?.map((alert) => (
                  <Alert key={alert.id} className="relative">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center justify-between">
                      <span>{alert.title}</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                          disabled={acknowledgeAlertMutation.isPending}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    </AlertTitle>
                    <AlertDescription>
                      <div className="mt-2">
                        <div className="font-medium">{alert.athleteName}</div>
                        <div className="text-sm">{alert.message}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(alert.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
                
                {(!alerts || alerts.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No active alerts. All athletes are within safe parameters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Athlete Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAthlete?.name} - Fitness Details</DialogTitle>
            <DialogDescription>
              Detailed fitness and injury risk assessment
            </DialogDescription>
          </DialogHeader>
          
          {selectedAthlete && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Overall Risk Score:</span>
                        <span className="font-medium">{selectedAthlete.overallRiskScore?.toFixed(0) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk Level:</span>
                        <Badge variant={selectedAthlete.riskLevel === 'critical' || selectedAthlete.riskLevel === 'high' ? 'destructive' : 'default'}>
                          {selectedAthlete.riskLevel}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Assessment Date:</span>
                        <span>{selectedAthlete.assessmentDate ? new Date(selectedAthlete.assessmentDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Readiness Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Readiness Score:</span>
                        <span className="font-medium">{selectedAthlete.readinessScore?.toFixed(1) || 'N/A'}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recovery Status:</span>
                        <div className="flex items-center space-x-1">
                          {getRecoveryIcon(selectedAthlete.recoveryStatus)}
                          <span className="capitalize">{selectedAthlete.recoveryStatus || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span>Position:</span>
                        <span>{selectedAthlete.position}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {selectedAthlete.readinessScore && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Training Readiness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Readiness Level</span>
                        <span>{selectedAthlete.readinessScore.toFixed(1)}/10</span>
                      </div>
                      <Progress 
                        value={selectedAthlete.readinessScore * 10} 
                        className="h-2"
                      />
                      <div className="text-xs text-gray-500">
                        {selectedAthlete.readinessScore >= 8 ? 'Ready for full training intensity' :
                         selectedAthlete.readinessScore >= 6 ? 'Suitable for moderate training' :
                         selectedAthlete.readinessScore >= 4 ? 'Light training recommended' :
                         'Rest or recovery focus needed'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}