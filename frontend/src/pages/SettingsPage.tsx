import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useStyleTheme, type StyleTheme } from "@/contexts/StyleThemeContext";
import { User, Palette, Bell, Shield, Globe, Monitor, Sun, Moon, Save, Check, Zap, Square, Link2, RefreshCw, Trash2, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import {
  getGmailStatus, getGoogleAuthUrl, disconnectGmail, triggerSync, getSyncJob,
  getSenderRules, createSenderRule, updateSenderRule, deleteSenderRule,
  type GmailStatus, type SyncJob, type SenderRule,
} from "@/api/gmail";

type SettingsTab = "profile" | "appearance" | "integrations" | "notifications" | "privacy" | "general";

const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Link2 },
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

  // Gmail integration state
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false, email: "", last_sync_at: null, is_active: false });
  const [gmailLoading, setGmailLoading] = useState(false);
  const [syncJob, setSyncJob] = useState<SyncJob | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [senderRules, setSenderRules] = useState<SenderRule[]>([]);
  const [newRulePattern, setNewRulePattern] = useState("");
  const [newRuleType, setNewRuleType] = useState("credit_card");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadGmailStatus = useCallback(async () => {
    try {
      const status = await getGmailStatus();
      setGmailStatus(status);
      if (status.connected) {
        const rules = await getSenderRules();
        setSenderRules(rules);
      }
    } catch { /* not connected */ }
  }, []);

  useEffect(() => {
    if (activeTab === "integrations") loadGmailStatus();
  }, [activeTab, loadGmailStatus]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleConnectGmail = async () => {
    setGmailLoading(true);
    try {
      const { url, code_verifier } = await getGoogleAuthUrl();
      sessionStorage.setItem("gmail_code_verifier", code_verifier);
      window.location.href = url;
    } catch (err) {
      toast.error("Failed to start Gmail connection");
      setGmailLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await disconnectGmail();
      setGmailStatus({ connected: false, email: "", last_sync_at: null, is_active: false });
      setSenderRules([]);
      toast.success("Gmail disconnected");
    } catch { toast.error("Failed to disconnect"); }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncJob(null);
    try {
      const { sync_job_id } = await triggerSync();
      // Poll for progress
      pollRef.current = setInterval(async () => {
        try {
          const job = await getSyncJob(sync_job_id);
          setSyncJob(job);
          if (job.status === "completed" || job.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setSyncing(false);
            if (job.status === "completed") {
              toast.success(`Sync complete: ${job.new_messages} new emails, ${job.extracted_count} extracted`);
              loadGmailStatus();
            } else {
              toast.error(`Sync failed: ${job.error_message}`);
            }
          }
        } catch { /* ignore poll errors */ }
      }, 2000);
    } catch (err) {
      setSyncing(false);
      toast.error(err instanceof Error ? err.message : "Sync failed");
    }
  };

  const handleAddRule = async () => {
    if (!newRulePattern.trim()) return;
    try {
      const rule = await createSenderRule({ sender_pattern: newRulePattern, source_type: newRuleType });
      setSenderRules(prev => [...prev, rule]);
      setNewRulePattern("");
      toast.success("Rule added");
    } catch { toast.error("Failed to add rule"); }
  };

  const handleToggleRule = async (rule: SenderRule) => {
    try {
      const updated = await updateSenderRule(rule.id, { is_enabled: !rule.is_enabled });
      setSenderRules(prev => prev.map(r => r.id === rule.id ? updated : r));
    } catch { toast.error("Failed to update rule"); }
  };

  const handleDeleteRule = async (id: number) => {
    try {
      await deleteSenderRule(id);
      setSenderRules(prev => prev.filter(r => r.id !== id));
    } catch { toast.error("Failed to delete rule"); }
  };

  const handleSave = () => { toast.success("Settings saved successfully"); };

  return (
    <div className="space-y-5">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] uppercase tracking-wider whitespace-nowrap transition-all ${activeTab === tab.id ? "text-primary bg-primary/[0.08] border-border border" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        className="bg-card border border-border shadow-sm rounded-sm p-6">
        <div className="relative z-10">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div><h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-1">Profile Settings</h3><p className="text-[10px] text-muted-foreground">{'>'} manage your account information</p></div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-sm bg-card border border-border shadow-sm flex items-center justify-center"><span className="text-lg font-semibold text-primary">{profileName.slice(0, 2) || "??"}</span></div>
                <div><div className="text-sm font-bold text-foreground">{profileName || "Unknown"}</div><div className="text-[10px] text-muted-foreground">{profileEmail}</div></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Display Name</Label><Input value={profileName} onChange={e => setProfileName(e.target.value)} className="bg-card border border-border shadow-sm text-xs" /></div>
                <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</Label><Input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="bg-card border border-border shadow-sm text-xs" /></div>
                <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Currency</Label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-10 rounded-md bg-card border border-border shadow-sm bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="INR">₹ INR – Indian Rupee</option><option value="USD">$ USD – US Dollar</option><option value="EUR">€ EUR – Euro</option><option value="GBP">£ GBP – British Pound</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div><h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-1">Appearance</h3><p className="text-[10px] text-muted-foreground">{'>'} customize the look and feel</p></div>
              <div className="space-y-4">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Style Theme</Label>
                <div className="grid grid-cols-2 gap-3">
                  {([{ id: "retro" as StyleTheme, icon: Zap, label: "Retro Futurism", desc: "CRT scanlines, neon glows, cyberpunk" }, { id: "neubrutalism" as StyleTheme, icon: Square, label: "Neubrutalism", desc: "Bold borders, flat shadows, chunky" }]).map(s => (
                    <button key={s.id} onClick={() => setStyleTheme(s.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-sm bg-muted/50 border transition-all ${styleTheme === s.id ? "border-border text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      <s.icon className="w-5 h-5" /><span className="text-[10px] uppercase tracking-wider">{s.label}</span><span className="text-[9px] text-muted-foreground text-center">{s.desc}</span>{styleTheme === s.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Color Mode</Label>
                <div className="grid grid-cols-3 gap-3">
                  {([{ id: "light" as const, icon: Sun, label: "Light" }, { id: "dark" as const, icon: Moon, label: "Dark" }, { id: "system" as const, icon: Monitor, label: "System" }]).map(t => (
                    <button key={t.id} onClick={() => setColorMode(t.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-sm bg-muted/50 border transition-all ${colorMode === t.id ? "border-border text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      <t.icon className="w-5 h-5" /><span className="text-[10px] uppercase tracking-wider">{t.label}</span>{colorMode === t.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
              <SettingsRow label="Compact Mode" description="Reduce spacing and padding throughout the UI" checked={compactMode} onChange={setCompactMode} />
              <SettingsRow label="Animations" description="Enable motion effects and transitions" checked={animationsEnabled} onChange={setAnimationsEnabled} />
            </div>
          )}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              <div><h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-1">Integrations</h3><p className="text-[10px] text-muted-foreground">{'>'} connect external services to auto-import data</p></div>

              {/* Gmail Connection */}
              <div className="space-y-4">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Gmail</Label>
                {!gmailStatus.connected ? (
                  <div className="flex items-center gap-4">
                    <button onClick={handleConnectGmail} disabled={gmailLoading}
                      className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-sm text-[10px] flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5" />{gmailLoading ? "Redirecting..." : "Connect Gmail"}
                    </button>
                    <span className="text-[10px] text-muted-foreground">Read-only access to financial emails</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-foreground">{gmailStatus.email}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {gmailStatus.last_sync_at ? `Last sync: ${new Date(gmailStatus.last_sync_at).toLocaleString()}` : "Never synced"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSync} disabled={syncing}
                          className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-sm text-[10px] flex items-center gap-2">
                          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Syncing..." : "Sync Now"}
                        </button>
                        <button onClick={handleDisconnectGmail}
                          className="bg-card border border-border font-medium shadow-sm hover:bg-muted rounded-sm text-[10px] text-destructive border-destructive/30 flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5" />Disconnect
                        </button>
                      </div>
                    </div>

                    {/* Sync Progress */}
                    {syncJob && syncing && (
                      <div className="bg-card border border-border shadow-sm rounded-sm p-4 space-y-2">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-primary uppercase">{syncJob.status}</span>
                          <span className="text-muted-foreground">{syncJob.processed_messages}/{syncJob.total_messages}</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300 rounded-full"
                            style={{ width: syncJob.total_messages ? `${(syncJob.processed_messages / syncJob.total_messages) * 100}%` : "0%" }} />
                        </div>
                      </div>
                    )}
                    {syncJob && !syncing && syncJob.status === "completed" && (
                      <div className="text-[10px] text-muted-foreground">
                        Last sync: {syncJob.new_messages} new emails, {syncJob.extracted_count} data points extracted
                      </div>
                    )}

                    {/* Sender Rules */}
                    <div className="pt-3 border-t border-border space-y-3">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sender Rules</Label>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {senderRules.map(rule => (
                          <div key={rule.id} className="flex items-center justify-between py-1.5 px-2 rounded-sm hover:bg-secondary/30">
                            <div className="flex items-center gap-2">
                              <Switch checked={rule.is_enabled} onCheckedChange={() => handleToggleRule(rule)} />
                              <span className="text-[10px] text-foreground">{rule.sender_pattern}</span>
                              <span className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">{rule.source_type}</span>
                            </div>
                            <button onClick={() => handleDeleteRule(rule.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input value={newRulePattern} onChange={e => setNewRulePattern(e.target.value)}
                          placeholder="*@bank.com" className="bg-card border border-border shadow-sm text-[10px] flex-1" />
                        <select value={newRuleType} onChange={e => setNewRuleType(e.target.value)}
                          className="h-10 rounded-md bg-card border border-border shadow-sm bg-card px-2 text-[10px] text-foreground">
                          <option value="credit_card">Credit Card</option>
                          <option value="bank">Bank</option>
                          <option value="subscription">Subscription</option>
                          <option value="ecommerce">E-commerce</option>
                          <option value="bill">Bill</option>
                          <option value="investment">Investment</option>
                        </select>
                        <button onClick={handleAddRule} className="bg-card border border-border font-medium shadow-sm hover:bg-muted rounded-sm text-[10px] flex items-center gap-1">
                          <Plus className="w-3 h-3" />Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div><h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-1">Notification Preferences</h3><p className="text-[10px] text-muted-foreground">{'>'} control what alerts you receive</p></div>
              <SettingsRow label="Budget Alerts" description="Get notified when approaching or exceeding budget limits" checked={notifBudget} onChange={setNotifBudget} />
              <SettingsRow label="Bill Reminders" description="Upcoming bill and credit card payment reminders" checked={notifBills} onChange={setNotifBills} />
              <SettingsRow label="Investment Updates" description="Portfolio performance and market movement alerts" checked={notifInvestments} onChange={setNotifInvestments} />
              <SettingsRow label="Subscription Renewals" description="Alerts before subscriptions auto-renew" checked={notifSubscriptions} onChange={setNotifSubscriptions} />
              <SettingsRow label="Sound Effects" description="Play a sound when notifications arrive" checked={notifSound} onChange={setNotifSound} />
            </div>
          )}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div><h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-1">Privacy & Security</h3><p className="text-[10px] text-muted-foreground">{'>'} manage data and security preferences</p></div>
              <SettingsRow label="Usage Analytics" description="Help improve FinnLens by sharing anonymous usage data" checked={analyticsOptIn} onChange={setAnalyticsOptIn} />
              <SettingsRow label="Show Balances" description="Display account balances on the dashboard overview" checked={showBalances} onChange={setShowBalances} />
              <SettingsRow label="Two-Factor Auth" description="Add an extra layer of security to your account" checked={twoFactor} onChange={setTwoFactor} />
              <div className="pt-2 border-t border-border"><button className="bg-card border border-border font-medium shadow-sm hover:bg-muted rounded-sm text-[10px] text-destructive border-destructive/30">Delete Account</button></div>
            </div>
          )}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div><h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-1">General</h3><p className="text-[10px] text-muted-foreground">{'>'} application preferences</p></div>
              <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Language</Label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full max-w-xs h-10 rounded-md bg-card border border-border shadow-sm bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="en">English</option><option value="hi">हिन्दी (Hindi)</option><option value="ta">தமிழ் (Tamil)</option><option value="te">తెలుగు (Telugu)</option>
                </select>
              </div>
              <div className="pt-4 border-t border-border space-y-3"><h4 className="text-[10px] uppercase tracking-wider text-muted-foreground">Data Management</h4>
                <div className="flex gap-2"><button className="bg-card border border-border font-medium shadow-sm hover:bg-muted rounded-sm text-[10px]">Export Data</button><button className="bg-card border border-border font-medium shadow-sm hover:bg-muted rounded-sm text-[10px]">Import Data</button></div>
              </div>
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-border flex justify-end">
            <button onClick={handleSave} className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-sm text-[10px] flex items-center gap-2"><Save className="w-3.5 h-3.5" />Save Changes</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const SettingsRow = ({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
    <div><div className="text-xs font-medium text-foreground">{label}</div><div className="text-[10px] text-muted-foreground">{description}</div></div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default SettingsPage;
