import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useStyleTheme, type StyleTheme } from "@/contexts/StyleThemeContext";
import { User, Palette, Bell, Shield, Globe, Monitor, Sun, Moon, Save, Check, Zap, Square, Link2, RefreshCw, Trash2, Plus, AlertTriangle, Mail, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import {
  getGoogleAuthUrl, disconnectGmail,
  getSenderRules, createSenderRule, updateSenderRule, deleteSenderRule,
  type SenderRule, type PipelineStep,
} from "@/api/gmail";
import { useGmailStatus, useSyncJob, useStartSync } from "@/hooks/useSync";
import { useQueryClient } from "@tanstack/react-query";

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
  const location = useLocation();
  const { colorMode, setColorMode } = useDarkMode();
  const { styleTheme, setStyleTheme } = useStyleTheme();
  const initialTab = (location.state as { tab?: SettingsTab } | null)?.tab ?? "profile";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
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
  const { data: gmailStatus } = useGmailStatus();
  const { syncing, syncJob } = useSyncJob();
  const { startSync } = useStartSync();
  const qc = useQueryClient();
  const [gmailLoading, setGmailLoading] = useState(false);
  const [senderRules, setSenderRules] = useState<SenderRule[]>([]);
  const [newRulePattern, setNewRulePattern] = useState("");
  const [newRuleType, setNewRuleType] = useState("credit_card");

  const loadRules = useCallback(async () => {
    try {
      if (gmailStatus?.connected) {
        const rules = await getSenderRules();
        setSenderRules(rules);
      }
    } catch { /* ignore */ }
  }, [gmailStatus?.connected]);

  useEffect(() => {
    if (activeTab === "integrations") loadRules();
  }, [activeTab, loadRules]);

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
      setSenderRules([]);
      qc.invalidateQueries({ queryKey: ["gmail-status"] });
      toast.success("Gmail disconnected");
    } catch { toast.error("Failed to disconnect"); }
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
              <div>
                <h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-1">Integrations</h3>
                <p className="text-[10px] text-muted-foreground">{'>'} connect external services to auto-import financial data</p>
              </div>

              {/* Gmail Card */}
              <div className="border border-border rounded-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-sm flex items-center justify-center ${gmailStatus?.connected ? "bg-primary/10" : "bg-muted"}`}>
                      <Mail className={`w-3.5 h-3.5 ${gmailStatus?.connected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-foreground">Gmail</div>
                      <div className="text-[9px] text-muted-foreground">Read-only access to financial emails</div>
                    </div>
                  </div>
                  {gmailStatus?.connected ? (
                    <div className="flex items-center gap-1.5">
                      {gmailStatus?.needs_reauth ? (
                        <span className="flex items-center gap-1 text-[9px] text-destructive font-medium"><AlertTriangle className="w-3 h-3" />Needs reconnect</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] text-green-500 font-medium"><CheckCircle2 className="w-3 h-3" />Connected</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">Not connected</span>
                  )}
                </div>

                <div className="p-4">
                  {!gmailStatus?.connected ? (
                    <div className="flex flex-col items-center py-6 gap-3">
                      <div className="w-12 h-12 rounded-sm bg-muted/50 flex items-center justify-center">
                        <Mail className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-foreground">Connect your Gmail account</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 max-w-xs">
                          Auto-import credit card alerts, bank statements, subscriptions, and investment emails
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 mt-1">
                        <button onClick={handleConnectGmail} disabled={gmailLoading}
                          className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-sm text-[10px] px-4 py-2 flex items-center gap-2">
                          <Link2 className="w-3.5 h-3.5" />{gmailLoading ? "Redirecting..." : "Connect Gmail"}
                        </button>
                        <div className="flex items-center gap-3 text-[9px] text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Read-only</span>
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Data stays local</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Reauth Banner */}
                      {gmailStatus?.needs_reauth && (
                        <div className="bg-destructive/10 border border-destructive/30 rounded-sm p-3 flex items-start gap-3">
                          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <div className="text-xs font-medium text-destructive">Reconnection Required</div>
                            <div className="text-[10px] text-destructive/80 mt-0.5">{gmailStatus?.reauth_reason || "Your Gmail authorization has expired."}</div>
                            <button onClick={handleConnectGmail} disabled={gmailLoading}
                              className="mt-2 bg-destructive text-destructive-foreground font-medium shadow-sm hover:bg-destructive/90 rounded-sm text-[10px] flex items-center gap-2">
                              <Link2 className="w-3.5 h-3.5" />{gmailLoading ? "Redirecting..." : "Reconnect Gmail"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Account info + actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-primary">{gmailStatus?.email?.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-foreground">{gmailStatus?.email}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {gmailStatus?.last_sync_at ? `Last sync ${new Date(gmailStatus.last_sync_at).toLocaleString()}` : "Never synced"}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => startSync()} disabled={syncing || !!gmailStatus?.needs_reauth}
                            className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-sm text-[10px] px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50">
                            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Syncing..." : "Sync Now"}
                          </button>
                          <button onClick={handleDisconnectGmail}
                            className="bg-card border border-border font-medium shadow-sm hover:bg-muted rounded-sm text-[10px] px-3 py-1.5 text-destructive border-destructive/30 flex items-center gap-1.5">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Pipeline Progress */}
                      {syncJob && (syncing || syncJob.status === "failed") && syncJob.steps && syncJob.steps.length > 0 && (
                        <div className="bg-muted/30 border border-border rounded-sm p-3 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline</span>
                            {syncJob.error_message && <span className="text-[9px] text-destructive truncate max-w-[200px]">{syncJob.error_message}</span>}
                          </div>
                          <div className="space-y-1.5">
                            {syncJob.steps.map((step) => (
                              <PipelineStepRow key={step.step_name} step={step} />
                            ))}
                          </div>
                        </div>
                      )}
                      {syncJob && !syncing && syncJob.status === "completed" && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-sm p-3 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          <span className="text-[10px] text-green-600 dark:text-green-400">
                            Synced {syncJob.new_messages} new emails, {syncJob.extracted_count} data points extracted
                          </span>
                        </div>
                      )}

                      {/* Sender Rules */}
                      <div className="pt-3 border-t border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Email Sender Rules</Label>
                          <span className="text-[9px] text-muted-foreground">{senderRules.filter(r => r.is_enabled).length}/{senderRules.length} active</span>
                        </div>
                        <div className="space-y-0.5 max-h-52 overflow-y-auto">
                          {senderRules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between py-1.5 px-2 rounded-sm hover:bg-secondary/30 group">
                              <div className="flex items-center gap-2 min-w-0">
                                <Switch checked={rule.is_enabled} onCheckedChange={() => handleToggleRule(rule)} />
                                <span className={`text-[10px] truncate ${rule.is_enabled ? "text-foreground" : "text-muted-foreground line-through"}`}>{rule.sender_pattern}</span>
                                <span className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary shrink-0">{rule.source_type}</span>
                              </div>
                              <button onClick={() => handleDeleteRule(rule.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {senderRules.length === 0 && (
                            <div className="text-[10px] text-muted-foreground py-3 text-center">No sender rules configured</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input value={newRulePattern} onChange={e => setNewRulePattern(e.target.value)}
                            placeholder="*@bank.com" className="bg-card border border-border shadow-sm text-[10px] flex-1" />
                          <select value={newRuleType} onChange={e => setNewRuleType(e.target.value)}
                            className="h-10 rounded-md bg-card border border-border shadow-sm px-2 text-[10px] text-foreground">
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

const STEP_LABELS: Record<string, string> = {
  fetch: "Fetching emails",
  classify: "Classifying senders",
  parse: "Parsing content",
  materialize: "Materializing data",
  classify_transactions: "Classifying transactions",
  detect_subscriptions: "Detecting subscriptions",
};

const PipelineStepRow = ({ step }: { step: PipelineStep }) => {
  const pct = step.total_items > 0 ? Math.round((step.processed_items / step.total_items) * 100) : 0;
  const statusColor = step.status === "completed" ? "text-green-500" : step.status === "running" ? "text-primary" : step.status === "failed" ? "text-destructive" : "text-muted-foreground";
  const statusIcon = step.status === "completed" ? "✓" : step.status === "running" ? "●" : step.status === "failed" ? "✗" : "○";

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className={`${statusColor} w-3 text-center`}>{statusIcon}</span>
      <span className="text-foreground flex-1">{STEP_LABELS[step.step_name] || step.step_name}</span>
      {step.status === "running" && step.total_items > 0 && (
        <span className="text-muted-foreground">{step.processed_items}/{step.total_items}</span>
      )}
      {step.status === "running" && step.total_items > 0 && (
        <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      )}
      {step.error_count > 0 && (
        <span className="text-destructive/70">{step.error_count} err</span>
      )}
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
