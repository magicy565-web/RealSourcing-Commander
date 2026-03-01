import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import CommanderPhone from "./pages/CommanderPhone";
import WebDashboard from "./pages/WebDashboard";
import LandingPage from "./pages/LandingPage";
import NotificationCenter from "./pages/NotificationCenter";
import NotificationSettings from "./pages/NotificationSettings";
import TikTokManager from "./pages/TikTokManager";
import FacebookManager from "./pages/FacebookManager";
import LinkedInManager from "./pages/LinkedInManager";
import WhatsAppManager from "./pages/WhatsAppManager";
import OpenClawDetail from "./pages/OpenClawDetail";
import MarketExpansion from "./pages/MarketExpansion";
import ProductLaunch from "./pages/ProductLaunch";
import GeoOptimizer from "./pages/GeoOptimizer";
import { useState, createContext, useContext } from "react";
import { AuthContext, useAuthState } from "./hooks/useAuth";
import { isLoggedIn } from "./lib/api";
import Login from "./pages/Login";
import StyleTraining from "./pages/StyleTraining";
import TaskQueue from "./pages/TaskQueue";
// Phase 3
import FeedPage from "./pages/FeedPage";
import AdminPage from "./pages/AdminPage";
import VideoFeedPlayer from "./pages/VideoFeedPlayer";
// Phase 5
import MultiAccountManager from "./pages/MultiAccountManager";
import ROICalculator from "./pages/ROICalculator";

// ─── 受保护路由 ───────────────────────────────────────────────
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isLoggedIn()) {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

// ─── 用户类型 Context（标准版 vs 独立部署版）─────────────────────

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

// ─── 通知中心路由包装（带返回和设置跳转）────────────────────────

function NotificationCenterPage() {
  const [, navigate] = useLocation();
  const { pushHour, pushMinute } = useNotifSettings();
  return (
    <div className="min-h-screen" style={{ background: "oklch(0.14 0.02 250)" }}>
      <NotificationCenter
        pushHour={pushHour}
        pushMinute={pushMinute}
        onBack={() => navigate("/phone")}
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

// ─── 路由 ─────────────────────────────────────────────────────

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={Login} />
      <Route path="/phone">{() => <ProtectedRoute component={CommanderPhone} />}</Route>
      <Route path="/web">{() => <ProtectedRoute component={WebDashboard} />}</Route>
      <Route path="/notifications">{() => <ProtectedRoute component={NotificationCenterPage} />}</Route>
      <Route path="/notification-settings">{() => <ProtectedRoute component={NotificationSettingsPage} />}</Route>
      <Route path="/tiktok">{() => <ProtectedRoute component={TikTokManager} />}</Route>
      <Route path="/facebook">{() => <ProtectedRoute component={FacebookManager} />}</Route>
      <Route path="/linkedin">{() => <ProtectedRoute component={LinkedInManager} />}</Route>
      <Route path="/whatsapp">{() => <ProtectedRoute component={WhatsAppManager} />}</Route>
      <Route path="/openclaw">{() => <ProtectedRoute component={OpenClawDetail} />}</Route>
      <Route path="/market">{() => <ProtectedRoute component={MarketExpansion} />}</Route>
      <Route path="/product-launch">{() => <ProtectedRoute component={ProductLaunch} />}</Route>
      <Route path="/geo">{() => <ProtectedRoute component={GeoOptimizer} />}</Route>
      <Route path="/style-training">{() => <ProtectedRoute component={StyleTrainingPage} />}</Route>
      <Route path="/task-queue">{() => <ProtectedRoute component={TaskQueuePage} />}</Route>
      {/* Phase 5 新增路由 */}
      <Route path="/multi-account">{() => <ProtectedRoute component={MultiAccountManager} />}</Route>
      <Route path="/roi">{() => <ProtectedRoute component={ROICalculator} />}</Route>
      {/* Phase 3 新增路由 */}
      <Route path="/video-feed">{() => <ProtectedRoute component={VideoFeedPlayerWrapper} />}</Route>
      <Route path="/feed">{() => <ProtectedRoute component={FeedPageWrapper} />}</Route>
      <Route path="/admin">{() => <ProtectedRoute component={AdminPageWrapper} />}</Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ─── 页面包装器 ─────────────────────────────────────────────────────
function StyleTrainingPage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen" style={{ background: "oklch(0.14 0.02 250)" }}>
      <StyleTraining onBack={() => navigate("/phone")} />
    </div>
  );
}

function TaskQueuePage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen" style={{ background: "oklch(0.14 0.02 250)" }}>
      <TaskQueue onBack={() => navigate("/phone")} />
    </div>
  );
}

// Phase 3 视频信息流包装器
function VideoFeedPlayerWrapper() {
  const [, navigate] = useLocation();
  return <VideoFeedPlayer onBack={() => navigate('/phone')} />;
}

// Phase 3 页面包装器
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
