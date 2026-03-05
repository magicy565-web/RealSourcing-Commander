import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Inbox,
  MessageSquare,
  Users,
  Settings,
  Sparkles,
} from 'lucide-react';
import { hapticLight, hapticMedium } from '../lib/haptics';

export type TabId = 'home' | 'decisions' | 'chat' | 'agents' | 'settings';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  pendingDecisions?: number;
  unreadMessages?: number;
}

const tabs = [
  { id: 'home' as const, label: '首页', icon: Home },
  { id: 'decisions' as const, label: '决策', icon: Inbox },
  { id: 'chat' as const, label: '对话', icon: MessageSquare, isCenter: true },
  { id: 'agents' as const, label: '团队', icon: Users },
  { id: 'settings' as const, label: '设置', icon: Settings },
];

export function BottomNav({ activeTab, onTabChange, pendingDecisions = 0, unreadMessages = 0 }: BottomNavProps) {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Gradient overlay for seamless blend */}
      <div className="absolute inset-x-0 bottom-full h-8 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />
      
      {/* Navigation bar */}
      <div className="relative bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const hasBadge = (tab.id === 'decisions' && pendingDecisions > 0) ||
                            (tab.id === 'chat' && unreadMessages > 0);
            const badgeCount = tab.id === 'decisions' ? pendingDecisions : unreadMessages;
            
            // Center chat button with special styling
            if (tab.isCenter) {
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => {
                    hapticMedium();
                    onTabChange(tab.id);
                  }}
                  className="relative -mt-6"
                  whileTap={{ scale: 0.9 }}
                >
                  {/* Glowing ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                      boxShadow: isActive
                        ? '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)'
                        : '0 0 0px transparent',
                    }}
                    transition={{ duration: 0.3 }}
                  />
                  
                  {/* Button */}
                  <motion.div
                    className={`
                      relative w-14 h-14 rounded-full flex items-center justify-center
                      ${isActive 
                        ? 'bg-gradient-to-br from-violet-500 to-purple-600' 
                        : 'bg-gradient-to-br from-violet-500/50 to-purple-600/50'
                      }
                    `}
                    animate={{ scale: isActive ? 1.05 : 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {/* AI Sparkle effect when active */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-white/60 rounded-full"
                            animate={{
                              x: [0, 20, 40, 20, 0],
                              y: [0, -10, 0, 10, 0],
                              opacity: [0, 1, 0.5, 1, 0],
                            }}
                            transition={{
                              duration: 2,
                              delay: i * 0.5,
                              repeat: Infinity,
                            }}
                            style={{ left: `${30 + i * 10}%`, top: `${40 + i * 5}%` }}
                          />
                        ))}
                      </motion.div>
                    )}
                    
                    <Sparkles className="w-6 h-6 text-white" />
                  </motion.div>
                  
                  {/* Badge */}
                  {hasBadge && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-rose-500 rounded-full flex items-center justify-center"
                    >
                      <span className="text-xs font-bold text-white">{badgeCount}</span>
                    </motion.div>
                  )}
                </motion.button>
              );
            }
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => {
                  hapticLight();
                  onTabChange(tab.id);
                }}
                className="relative flex flex-col items-center justify-center w-16 py-1"
                whileTap={{ scale: 0.9 }}
              >
                {/* Active indicator */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute -top-2 w-1 h-1 bg-white rounded-full"
                    />
                  )}
                </AnimatePresence>
                
                {/* Icon */}
                <motion.div
                  animate={{
                    y: isActive ? -2 : 0,
                    color: isActive ? 'rgb(255, 255, 255)' : 'rgba(255, 255, 255, 0.4)',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <tab.icon className="w-5 h-5" />
                </motion.div>
                
                {/* Label */}
                <motion.span
                  animate={{
                    opacity: isActive ? 1 : 0.4,
                    y: isActive ? 0 : 2,
                  }}
                  className="text-xs mt-1 text-white"
                >
                  {tab.label}
                </motion.span>
                
                {/* Badge */}
                {hasBadge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0 right-2 min-w-4 h-4 px-1 bg-rose-500 rounded-full flex items-center justify-center"
                  >
                    <span className="text-[10px] font-bold text-white">{badgeCount > 99 ? '99+' : badgeCount}</span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}

// Page transition wrapper
export function PageTransition({ children, direction = 0 }: { 
  children: React.ReactNode; 
  direction?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction * 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -20 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 30,
        opacity: { duration: 0.2 }
      }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}
