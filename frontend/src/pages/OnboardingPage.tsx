import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ArrowRight, ArrowLeft, Mail, Shield, RefreshCw } from 'lucide-react'
import { getProfileApi, updateProfileApi } from '@/api/auth'
import { useGmailStatus, useStartSync } from '@/hooks/useSync'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

const STEPS = [
  { number: 1, label: 'Connected' },
  { number: 2, label: 'Profile' },
  { number: 3, label: 'Sync' },
]

export default function OnboardingPage() {
  const token = useAuthStore(s => s.token)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: gmailStatus, isLoading: gmailLoading } = useGmailStatus()
  const { startSync } = useStartSync()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncingMonths, setSyncingMonths] = useState<number | null>(null)

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getProfileApi,
    enabled: !!token,
  })

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    if (gmailStatus && !gmailStatus.connected && !gmailLoading) {
      navigate('/overview', { replace: true })
    }
  }, [token, gmailStatus, gmailLoading, navigate])

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || '')
      setDob(profile.date_of_birth || '')
    }
  }, [profile])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await updateProfileApi({
        display_name: name,
        date_of_birth: dob || null,
      })
      qc.invalidateQueries({ queryKey: ['user-profile'] })
      setStep(3)
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleStartSync = (months: number) => {
    setSyncingMonths(months)
    startSync(months)
    setTimeout(() => navigate('/settings?tab=integrations', { replace: true }), 1200)
  }

  const handleSkipSync = () => {
    navigate('/settings?tab=integrations', { replace: true })
  }

  if (!gmailStatus || gmailLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-lg mx-4">
        <div className="flex items-center justify-center gap-6 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center gap-2">
              {i > 0 && (
                <div className={`w-8 h-px ${s.number <= step ? 'bg-primary' : 'bg-border'}`} />
              )}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  s.number < step ? 'bg-primary text-primary-foreground' :
                  s.number === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {s.number < step ? <CheckCircle2 className="w-4 h-4" /> : s.number}
                </div>
                <span className={`text-xs ${s.number <= step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-card border border-border rounded-xl p-6 shadow-sm"
          >
            {step === 1 && (
              <div className="flex flex-col items-center text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Connected Successfully</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gmail linked to your FinnLens account
                  </p>
                </div>
                <div className="flex items-center gap-2.5 bg-muted/50 rounded-lg px-4 py-2.5">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{gmailStatus.email}</span>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="mt-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm px-5 py-2.5 flex items-center gap-2 hover:bg-primary/90 transition-all"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-foreground">Set Up Your Profile</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    This helps unlock password-protected bank statement PDFs
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name as on bank statements"
                      className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-start gap-3">
                  <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Your data stays on your machine</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your name and date of birth are stored locally and only used to generate passwords for your bank statement PDFs. They are never shared with any third party.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground border border-border hover:bg-muted/80 transition-all flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving || !name.trim()}
                    className="bg-primary text-primary-foreground font-medium rounded-lg text-sm px-5 py-2.5 flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Continue'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-foreground">Start Your First Sync</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Import your financial emails to auto-detect transactions, bills, and subscriptions
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Sync emails from</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[3, 6, 12].map(m => (
                      <button
                        key={m}
                        onClick={() => handleStartSync(m)}
                        disabled={syncingMonths !== null}
                        className={`py-4 rounded-lg text-sm font-medium transition-all border ${
                          syncingMonths === m
                            ? 'bg-primary text-primary-foreground border-primary'
                            : m === 6
                              ? 'bg-primary/5 border-primary/30 text-primary hover:bg-primary/10'
                              : 'bg-card border-border text-foreground hover:bg-muted/80'
                        }`}
                      >
                        {syncingMonths === m ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <RefreshCw className="w-4 h-4 animate-spin" /> Starting...
                          </span>
                        ) : (
                          `Last ${m} months`
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    disabled={syncingMonths !== null}
                    className="text-sm px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground border border-border hover:bg-muted/80 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleSkipSync}
                    disabled={syncingMonths !== null}
                    className="text-sm px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                  >
                    Set up later
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
