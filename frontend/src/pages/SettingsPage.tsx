import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Palette, Sun, Moon, Monitor, Check, Link2, RefreshCw, Trash2, Plus, AlertTriangle, Mail, CheckCircle2, Clock, ShieldCheck, Save, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { getProfileApi, updateProfileApi } from "@/api/auth";
import {
  getGoogleAuthUrl, disconnectGmail,
  getSenderRules, createSenderRule, updateSenderRule, deleteSenderRule,
  type SenderRule, type PipelineStep,
} from "@/api/gmail";
import { useGmailStatus, useSyncJob, useStartSync } from "@/hooks/useSync";

type SettingsTab = "profile" | "appearance" | "integrations";

const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Link2 },
];

const SettingsPage = () => {
  const location = useLocation();
  const { colorMode, setColorMode } = useDarkMode();
  const qc = useQueryClient();
  const locState = location.state as { tab?: SettingsTab; promptSync?: boolean } | null;
  const initialTab = locState?.tab ?? "profile";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [showSyncPrompt, setShowSyncPrompt] = useState(locState?.promptSync === true);

  // Profile from API
  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: getProfileApi,
  });

  const [profileName, setProfileName] = useState("");
  const [profileDOB, setProfileDOB] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileName(profile.display_name || "");
      setProfileDOB(profile.date_of_birth || "");
      setCurrency(profile.currency || "INR");
    }
  }, [profile]);

  // Gmail integration state
  const { data: gmailStatus } = useGmailStatus();
  const { syncing, syncJob } = useSyncJob();
  const { startSync } = useStartSync();
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
    } catch {
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

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      await updateProfileApi({
        display_name: profileName,
        date_of_birth: profileDOB || null,
        currency,
      });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const avatarUrl = profile?.avatar_url;
  const initials = (profile?.display_name || profile?.username || "??").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className="bg-card border border-border shadow-sm rounded-xl p-6">

        {activeTab === "profile" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Profile Settings</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Manage your account information</p>
            </div>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-xl border border-border object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary/10 border border-border flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">{initials}</span>
                </div>
              )}
              <div>
                <div className="text-sm font-semibold text-foreground">{profile?.display_name || profile?.username || "—"}</div>
                <div className="text-sm text-muted-foreground">{profile?.email || "—"}</div>
                {!avatarUrl && gmailStatus?.connected && (
                  <div className="text-xs text-muted-foreground mt-0.5">Avatar synced from your Google account</div>
                )}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Display Name</Label>
                <Input value={profileName} onChange={e => setProfileName(e.target.value)} className="text-sm" placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Date of Birth</Label>
                <Input type="date" value={profileDOB} onChange={e => setProfileDOB(e.target.value)} className="text-sm" />
                <p className="text-xs text-muted-foreground">Used to unlock password-protected bank statement PDFs</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Currency</Label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="INR">₹ INR – Indian Rupee</option>
                  <option value="USD">$ USD – US Dollar</option>
                  <option value="EUR">€ EUR – Euro</option>
                  <option value="GBP">£ GBP – British Pound</option>
                </select>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-start gap-3">
              <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">Your data stays private</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your date of birth is stored securely and only used locally to generate PDF passwords for bank statements. It is never shared with third parties.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button onClick={handleSaveProfile} disabled={profileSaving} className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-lg text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />{profileSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "appearance" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Appearance</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Customize the look and feel</p>
            </div>
            <div className="space-y-3">
              <Label className="text-sm text-muted-foreground">Color Mode</Label>
              <div className="grid grid-cols-3 gap-3">
                {([{ id: "light" as const, icon: Sun, label: "Light" }, { id: "dark" as const, icon: Moon, label: "Dark" }, { id: "system" as const, icon: Monitor, label: "System" }]).map(t => (
                  <button key={t.id} onClick={() => setColorMode(t.id)}
                    className={`flex flex-col items-center gap-2.5 p-5 rounded-xl border-2 transition-all ${colorMode === t.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"}`}>
                    <t.icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{t.label}</span>
                    {colorMode === t.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "integrations" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Integrations</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Connect external services to auto-import financial data</p>
            </div>

            {/* Privacy notice for integrations */}
            <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-start gap-3">
              <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">How we handle your data</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  FinnLens requests read-only access to your Gmail. We only fetch and store financial emails (bank alerts, credit card statements, subscriptions) — personal emails are filtered out by sender rules. All data is stored locally on your machine and never leaves your device. You can disconnect at any time to revoke access and delete synced data.
                </p>
              </div>
            </div>

            {/* Gmail Card */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${gmailStatus?.connected ? "bg-primary/10" : "bg-muted"}`}>
                    <Mail className={`w-4 h-4 ${gmailStatus?.connected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Gmail</div>
                    <div className="text-xs text-muted-foreground">Read-only access to financial emails</div>
                  </div>
                </div>
                {gmailStatus?.connected ? (
                  <div className="flex items-center gap-1.5">
                    {gmailStatus?.needs_reauth ? (
                      <span className="flex items-center gap-1 text-xs text-destructive font-medium"><AlertTriangle className="w-3.5 h-3.5" />Needs reconnect</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-green-500 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Connected</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Not connected</span>
                )}
              </div>

              <div className="p-5">
                {!gmailStatus?.connected ? (
                  <div className="flex flex-col items-center py-8 gap-4">
                    <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Mail className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-foreground">Connect your Gmail account</div>
                      <div className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Auto-import credit card alerts, bank statements, subscriptions, and investment emails
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-3 mt-1">
                      <button onClick={handleConnectGmail} disabled={gmailLoading}
                        className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-lg text-sm px-5 py-2.5 flex items-center gap-2">
                        <Link2 className="w-4 h-4" />{gmailLoading ? "Redirecting..." : "Connect Gmail"}
                      </button>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Read-only access</span>
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Only financial emails</span>
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Disconnect anytime</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Initial sync prompt after Gmail connect */}
                    {showSyncPrompt && !syncing && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                        <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">Gmail connected! Start your first sync?</div>
                          <p className="text-sm text-muted-foreground mt-0.5">Import your financial emails to auto-detect transactions, bills, and subscriptions.</p>
                          <div className="flex gap-2 mt-3">
                            {[3, 6, 12].map(m => (
                              <button key={m} onClick={() => { startSync(m); setShowSyncPrompt(false); }}
                                className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${m === 6 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-card border border-border hover:bg-muted"}`}>
                                Last {m} months
                              </button>
                            ))}
                            <button onClick={() => setShowSyncPrompt(false)} className="text-sm px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-all">
                              Later
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reauth Banner */}
                    {gmailStatus?.needs_reauth && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-destructive">Reconnection Required</div>
                          <div className="text-sm text-destructive/80 mt-0.5">{gmailStatus?.reauth_reason || "Your Gmail authorization has expired."}</div>
                          <button onClick={handleConnectGmail} disabled={gmailLoading}
                            className="mt-2 bg-destructive text-destructive-foreground font-medium shadow-sm hover:bg-destructive/90 rounded-lg text-sm px-4 py-2 flex items-center gap-2">
                            <Link2 className="w-4 h-4" />{gmailLoading ? "Redirecting..." : "Reconnect Gmail"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Account info + actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{gmailStatus?.email?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{gmailStatus?.email}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {gmailStatus?.last_sync_at ? `Last sync ${new Date(gmailStatus.last_sync_at).toLocaleString()}` : "Never synced"}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startSync()} disabled={syncing || !!gmailStatus?.needs_reauth}
                          className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-lg text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50">
                          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Syncing..." : "Sync Now"}
                        </button>
                        <button onClick={handleDisconnectGmail}
                          className="bg-card border border-destructive/30 font-medium shadow-sm hover:bg-destructive/5 rounded-lg text-sm px-3 py-2 text-destructive flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Pipeline Progress */}
                    {syncJob && (syncing || syncJob.status === "failed") && syncJob.steps && syncJob.steps.length > 0 && (
                      <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-muted-foreground">Pipeline Progress</span>
                          {syncJob.error_message && <span className="text-xs text-destructive truncate max-w-[200px]">{syncJob.error_message}</span>}
                        </div>
                        <div className="space-y-2">
                          {syncJob.steps.map((step) => (
                            <PipelineStepRow key={step.step_name} step={step} />
                          ))}
                        </div>
                      </div>
                    )}
                    {syncJob && !syncing && syncJob.status === "completed" && (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-sm text-green-600 dark:text-green-400">
                          Synced {syncJob.new_messages} new emails, {syncJob.extracted_count} data points extracted
                        </span>
                      </div>
                    )}

                    {/* Sender Rules */}
                    <div className="pt-4 border-t border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-muted-foreground">Email Sender Rules</Label>
                        <span className="text-xs text-muted-foreground">{senderRules.filter(r => r.is_enabled).length}/{senderRules.length} active</span>
                      </div>
                      <div className="space-y-1 max-h-52 overflow-y-auto">
                        {senderRules.map(rule => (
                          <div key={rule.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 group">
                            <div className="flex items-center gap-3 min-w-0">
                              <Switch checked={rule.is_enabled} onCheckedChange={() => handleToggleRule(rule)} />
                              <span className={`text-sm truncate ${rule.is_enabled ? "text-foreground" : "text-muted-foreground line-through"}`}>{rule.sender_pattern}</span>
                              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-md bg-secondary shrink-0">{rule.source_type}</span>
                            </div>
                            <button onClick={() => handleDeleteRule(rule.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {senderRules.length === 0 && (
                          <div className="text-sm text-muted-foreground py-4 text-center">No sender rules configured</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input value={newRulePattern} onChange={e => setNewRulePattern(e.target.value)}
                          placeholder="*@bank.com" className="text-sm flex-1" />
                        <select value={newRuleType} onChange={e => setNewRuleType(e.target.value)}
                          className="h-10 rounded-lg bg-card border border-border px-3 text-sm text-foreground">
                          <option value="credit_card">Credit Card</option>
                          <option value="bank">Bank</option>
                          <option value="subscription">Subscription</option>
                          <option value="ecommerce">E-commerce</option>
                          <option value="bill">Bill</option>
                          <option value="investment">Investment</option>
                        </select>
                        <button onClick={handleAddRule} className="bg-card border border-border font-medium shadow-sm hover:bg-muted rounded-lg text-sm px-4 py-2 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" />Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
    <div className="flex items-center gap-2 text-sm">
      <span className={`${statusColor} w-4 text-center`}>{statusIcon}</span>
      <span className="text-foreground flex-1">{STEP_LABELS[step.step_name] || step.step_name}</span>
      {step.status === "running" && step.total_items > 0 && (
        <span className="text-xs text-muted-foreground">{step.processed_items}/{step.total_items}</span>
      )}
      {step.status === "running" && step.total_items > 0 && (
        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      )}
      {step.error_count > 0 && (
        <span className="text-xs text-destructive/70">{step.error_count} err</span>
      )}
    </div>
  );
};

export default SettingsPage;
