import { useState } from "react";
import { motion } from "framer-motion";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useStyleTheme, type StyleTheme } from "@/contexts/StyleThemeContext";
import { User, Palette, Bell, Shield, Globe, Monitor, Sun, Moon, Save, Check, Zap, Square } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type SettingsTab = "profile" | "appearance" | "notifications" | "privacy" | "general";

const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "general", label: "General", icon: Globe },
];

const SettingsPage = () => {
  const { colorMode, setColorMode } = useDarkMode();
  const { styleTheme, setStyleTheme } = useStyleTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profileName, setProfileName] = useState("John Doe");
  const [profileEmail, setProfileEmail] = useState("john@example.com");
  const [currency, setCurrency] = useState("INR");
  const [notifBudget, setNotifBudget] = useState(true);
  const [notifBills, setNotifBills] = useState(true);
  const [notifInvestments, setNotifInvestments] = useState(true);
  const [notifSubscriptions, setNotifSubscriptions] = useState(true);
  const [notifSound, setNotifSound] = useState(false);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(true);
  const [showBalances, setShowBalances] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [language, setLanguage] = useState("en");

  const handleSave = () => { toast.success("Settings saved successfully"); };

  return (
    <div className="space-y-5">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-mono uppercase tracking-wider whitespace-nowrap transition-all ${activeTab === tab.id ? "neon-text bg-primary/[0.08] neon-border border" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        className="terminal neon-border rounded-sm p-6 crt-overlay">
        <div className="relative z-10">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div><h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-1">Profile Settings</h3><p className="text-[10px] text-muted-foreground font-mono">{'>'} manage your account information</p></div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-sm terminal neon-border flex items-center justify-center"><span className="text-lg font-display font-bold neon-text">{profileName.slice(0, 2) || "??"}</span></div>
                <div><div className="text-sm font-mono font-bold text-foreground">{profileName || "Unknown"}</div><div className="text-[10px] text-muted-foreground font-mono">{profileEmail}</div></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Display Name</Label><Input value={profileName} onChange={e => setProfileName(e.target.value)} className="terminal neon-border text-xs font-mono" /></div>
                <div className="space-y-1.5"><Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Email</Label><Input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="terminal neon-border text-xs font-mono" /></div>
                <div className="space-y-1.5"><Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Currency</Label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-10 rounded-md terminal neon-border bg-card px-3 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="INR">₹ INR – Indian Rupee</option><option value="USD">$ USD – US Dollar</option><option value="EUR">€ EUR – Euro</option><option value="GBP">£ GBP – British Pound</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div><h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-1">Appearance</h3><p className="text-[10px] text-muted-foreground font-mono">{'>'} customize the look and feel</p></div>
              <div className="space-y-4">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Style Theme</Label>
                <div className="grid grid-cols-2 gap-3">
                  {([{ id: "retro" as StyleTheme, icon: Zap, label: "Retro Futurism", desc: "CRT scanlines, neon glows, cyberpunk" }, { id: "neubrutalism" as StyleTheme, icon: Square, label: "Neubrutalism", desc: "Bold borders, flat shadows, chunky" }]).map(s => (
                    <button key={s.id} onClick={() => setStyleTheme(s.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-sm terminal border transition-all ${styleTheme === s.id ? "neon-border neon-text" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      <s.icon className="w-5 h-5" /><span className="text-[10px] font-mono uppercase tracking-wider">{s.label}</span><span className="text-[9px] font-mono text-muted-foreground text-center">{s.desc}</span>{styleTheme === s.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Color Mode</Label>
                <div className="grid grid-cols-3 gap-3">
                  {([{ id: "light" as const, icon: Sun, label: "Light" }, { id: "dark" as const, icon: Moon, label: "Dark" }, { id: "system" as const, icon: Monitor, label: "System" }]).map(t => (
                    <button key={t.id} onClick={() => setColorMode(t.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-sm terminal border transition-all ${colorMode === t.id ? "neon-border neon-text" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      <t.icon className="w-5 h-5" /><span className="text-[10px] font-mono uppercase tracking-wider">{t.label}</span>{colorMode === t.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
              <SettingsRow label="Compact Mode" description="Reduce spacing and padding throughout the UI" checked={compactMode} onChange={setCompactMode} />
              <SettingsRow label="Animations" description="Enable motion effects and transitions" checked={animationsEnabled} onChange={setAnimationsEnabled} />
            </div>
          )}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div><h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-1">Notification Preferences</h3><p className="text-[10px] text-muted-foreground font-mono">{'>'} control what alerts you receive</p></div>
              <SettingsRow label="Budget Alerts" description="Get notified when approaching or exceeding budget limits" checked={notifBudget} onChange={setNotifBudget} />
              <SettingsRow label="Bill Reminders" description="Upcoming bill and credit card payment reminders" checked={notifBills} onChange={setNotifBills} />
              <SettingsRow label="Investment Updates" description="Portfolio performance and market movement alerts" checked={notifInvestments} onChange={setNotifInvestments} />
              <SettingsRow label="Subscription Renewals" description="Alerts before subscriptions auto-renew" checked={notifSubscriptions} onChange={setNotifSubscriptions} />
              <SettingsRow label="Sound Effects" description="Play a sound when notifications arrive" checked={notifSound} onChange={setNotifSound} />
            </div>
          )}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div><h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-1">Privacy & Security</h3><p className="text-[10px] text-muted-foreground font-mono">{'>'} manage data and security preferences</p></div>
              <SettingsRow label="Usage Analytics" description="Help improve FinnLens by sharing anonymous usage data" checked={analyticsOptIn} onChange={setAnalyticsOptIn} />
              <SettingsRow label="Show Balances" description="Display account balances on the dashboard overview" checked={showBalances} onChange={setShowBalances} />
              <SettingsRow label="Two-Factor Auth" description="Add an extra layer of security to your account" checked={twoFactor} onChange={setTwoFactor} />
              <div className="pt-2 border-t border-border"><button className="retro-button rounded-sm text-[10px] text-destructive border-destructive/30">Delete Account</button></div>
            </div>
          )}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div><h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-1">General</h3><p className="text-[10px] text-muted-foreground font-mono">{'>'} application preferences</p></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Language</Label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full max-w-xs h-10 rounded-md terminal neon-border bg-card px-3 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="en">English</option><option value="hi">हिन्दी (Hindi)</option><option value="ta">தமிழ் (Tamil)</option><option value="te">తెలుగు (Telugu)</option>
                </select>
              </div>
              <div className="pt-4 border-t border-border space-y-3"><h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Data Management</h4>
                <div className="flex gap-2"><button className="retro-button rounded-sm text-[10px]">Export Data</button><button className="retro-button rounded-sm text-[10px]">Import Data</button></div>
              </div>
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-border flex justify-end">
            <button onClick={handleSave} className="retro-button-solid rounded-sm text-[10px] flex items-center gap-2"><Save className="w-3.5 h-3.5" />Save Changes</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const SettingsRow = ({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
    <div><div className="text-xs font-mono font-medium text-foreground">{label}</div><div className="text-[10px] text-muted-foreground font-mono">{description}</div></div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default SettingsPage;
