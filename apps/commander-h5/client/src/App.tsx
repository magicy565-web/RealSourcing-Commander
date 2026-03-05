import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useState, createContext, useContext } from "react";
import { AuthContext, useAuthState } from "./hooks/useAuth";
import { isLoggedIn } from "./lib/api";

// ─── 核心页面 ─────────────────────────────────────────────────
import Login from "./pages/Login";
import BossWarroom from "./pages/BossWarroom";
import CommanderPhone from "./pages/CommanderPhone";
import NotificationCenter from "./pages/NotificationCenter";
import NotificationSettings from "./pages/NotificationSettings";
import TaskQueue from "./pages/TaskQueue";
import FeedPage from "./pages/FeedPage";
import AdminPage from "./pages/AdminPage";
import VideoFeedPlayer from "./pages/VideoFeedPlayer";
import AssetVault from "./pages/AssetVault";

// ─── 新增页面 ─────────────────────────────────────────────────
import WatchFace from "./pages/WatchFace";
import DecisionFeed from "./pages/DecisionFeed";
import AITraining from "./pages/AITraining";
import CommanderChat from "./pages/CommanderChat";
import DigitalAgents from "./pages/DigitalAgents";
import MarketRadar from "./pages/MarketRadar";
import InboundFunnel from "./pages/InboundFunnel";
import OutboundCampaigns from "./pages/OutboundCampaigns";
import ContentStudio from "./pages/ContentStudio";
import Settings from "./pages/Settings";

// ─── 受保护路由 ───────────────────────────────────────────────
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isLoggedIn()) {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

// ─── 用户类型 Context ─────────────────────────────────────────
export type UserPlan = "standard" | "enterprise";
interface UserPlanCtx {
  plan: UserPlan;
  setPlan: (p: UserPlan) => void;
  isEnterprise: boolean;
}
export const UserPlanContext = createContext<UserPlanCtx>({
  plan: "standard",
  setPlan: () => {},
  isEnterprise: false,
});
export function useUserPlan() {
  return useContext(UserPlanContext);
}

// ─── 全局通知设置 Context ─────────────────────────────────────
interface NotifSettingsCtx {
  pushHour: number;
  pushMinute: number;
  setPushTime: (h: number, m: number) => void;
}
export const NotifSettingsContext = createContext<NotifSettingsCtx>({
  pushHour: 8,
  pushMinute: 0,
  setPushTime: () => {},
});
export function useNotifSettings() {
  return useContext(NotifSettingsContext);
}

// ─── 页面包装器 ───────────────────────────────────────────────
function NotificationCenterPage() {
  const [, navigate] = useLocation();
  const { pushHour, pushMinute } = useNotifSettings();
  return (
    <div className="min-h-screen" style={{ background: "oklch(0.14 0.02 250)" }}>
      <NotificationCenter
        pushHour={pushHour}
        pushMinute={pushMinute}
        onBack={() => navigate("/boss-warroom")}
        onOpenSettings={() => navigate("/notification-settings")}
      />
    </div>
  );
}

function NotificationSettingsPage() {
  const [, navigate] = useLocation();
  const { setPushTime } = useNotifSettings();
  return (
    <div className="min-h-screen" style={{ background: "oklch(0.14 0.02 250)" }}>
      <NotificationSettings
        onBack={() => navigate("/notifications")}
        onSave={(h, m) => {
          setPushTime(h, m);
          navigate("/notifications");
        }}
      />
    </div>
  );
}

function TaskQueuePage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen" style={{ background: "oklch(0.14 0.02 250)" }}>
      <TaskQueue onBack={() => navigate("/boss-warroom")} />
    </div>
  );
}

function VideoFeedPlayerWrapper() {
  const [, navigate] = useLocation();
  return <VideoFeedPlayer onBack={() => navigate("/boss-warroom")} />;
}

function FeedPageWrapper() {
  return (
    <div className="min-h-screen" style={{ background: "oklch(0.14 0.02 250)" }}>
      <div className="max-w-md mx-auto h-screen flex flex-col">
        <FeedPage />
      </div>
    </div>
  );
}

function AdminPageWrapper() {
  return (
    <div className="min-h-screen" style={{ background: "oklch(0.14 0.02 250)" }}>
      <div className="max-w-md mx-auto h-screen flex flex-col">
        <AdminPage />
      </div>
    </div>
  );
}

// ─── 路由 ─────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      <Route path="/">{() => isLoggedIn() ? <Redirect to="/boss-warroom" /> : <Redirect to="/login" />}</Route>
      <Route path="/login" component={Login} />
      <Route path="/boss-warroom">{() => <ProtectedRoute component={BossWarroom} />}</Route>
      <Route path="/warroom">{() => <ProtectedRoute component={BossWarroom} />}</Route>
      <Route path="/phone">{() => <ProtectedRoute component={CommanderPhone} />}</Route>
      <Route path="/notifications">{() => <ProtectedRoute component={NotificationCenterPage} />}</Route>
      <Route path="/notification-settings">{() => <ProtectedRoute component={NotificationSettingsPage} />}</Route>
      <Route path="/task-queue">{() => <ProtectedRoute component={TaskQueuePage} />}</Route>
      <Route path="/video-feed">{() => <ProtectedRoute component={VideoFeedPlayerWrapper} />}</Route>
      <Route path="/feed">{() => <ProtectedRoute component={FeedPageWrapper} />}</Route>
      <Route path="/admin">{() => <ProtectedRoute component={AdminPageWrapper} />}</Route>
      <Route path="/asset-vault">{() => <ProtectedRoute component={AssetVault} />}</Route>
      
      {/* 新增路由 */}
      <Route path="/watch-face">{() => <ProtectedRoute component={WatchFace} />}</Route>
      <Route path="/decision-feed">{() => <ProtectedRoute component={DecisionFeed} />}</Route>
      <Route path="/ai-training">{() => <ProtectedRoute component={AITraining} />}</Route>
      <Route path="/commander-chat">{() => <ProtectedRoute component={CommanderChat} />}</Route>
      <Route path="/digital-agents">{() => <ProtectedRoute component={DigitalAgents} />}</Route>
      <Route path="/market-radar">{() => <ProtectedRoute component={MarketRadar} />}</Route>
      <Route path="/inbound-funnel">{() => <ProtectedRoute component={InboundFunnel} />}</Route>
      <Route path="/outbound-campaigns">{() => <ProtectedRoute component={OutboundCampaigns} />}</Route>
      <Route path="/content-studio">{() => <ProtectedRoute component={ContentStudio} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ─── App Root ─────────────────────────────────────────────────
function App() {
  const [pushHour, setPushHour] = useState(8);
  const [pushMinute, setPushMinute] = useState(0);
  const [plan, setPlan] = useState<UserPlan>("standard");
  const authState = useAuthState();
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthContext.Provider value={authState}>
          <UserPlanContext.Provider value={{
            plan,
            setPlan,
            isEnterprise: plan === "enterprise",
          }}>
            <NotifSettingsContext.Provider value={{
              pushHour,
              pushMinute,
              setPushTime: (h, m) => { setPushHour(h); setPushMinute(m); },
            }}>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </NotifSettingsContext.Provider>
          </UserPlanContext.Provider>
        </AuthContext.Provider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
