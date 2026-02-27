import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
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
      <Route path="/phone" component={CommanderPhone} />
      <Route path="/web" component={WebDashboard} />
      <Route path="/notifications" component={NotificationCenterPage} />
      <Route path="/notification-settings" component={NotificationSettingsPage} />
      <Route path="/tiktok" component={TikTokManager} />
      <Route path="/facebook" component={FacebookManager} />
      <Route path="/linkedin" component={LinkedInManager} />
      <Route path="/whatsapp" component={WhatsAppManager} />
      <Route path="/openclaw" component={OpenClawDetail} />
      <Route path="/market" component={MarketExpansion} />
      <Route path="/product-launch" component={ProductLaunch} />
      <Route path="/geo" component={GeoOptimizer} />
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

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
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
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
