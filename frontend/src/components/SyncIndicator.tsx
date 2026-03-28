import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGmailStatus, useSyncJob, useStartSync } from '@/hooks/useSync'
import { RefreshCw, AlertTriangle, Check, ChevronDown, Mail } from 'lucide-react'
import type { PipelineStep } from '@/api/gmail'

const STEP_LABELS: Record<string, string> = {
  fetch: 'Fetching emails',
  classify: 'Classifying',
  parse: 'Parsing',
  materialize: 'Materializing',
  classify_transactions: 'Classifying txns',
  detect_subscriptions: 'Detecting subscriptions',
}

export default function SyncIndicator() {
  const { data: gmailStatus } = useGmailStatus()
  const { syncJob, syncing } = useSyncJob()
  const { startSync, isTriggering } = useStartSync()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!syncing) setOpen(false)
  }, [syncing])

  if (!gmailStatus?.connected) {
    return (
      <button
        onClick={() => navigate('/settings', { state: { tab: 'integrations' } })}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 transition-all"
      >
        <Mail className="w-3.5 h-3.5" />
        Connect Gmail
      </button>
    )
  }

  if (gmailStatus.needs_reauth) {
    return (
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/20 transition-all"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Reconnect Gmail
      </button>
    )
  }

  const isActive = syncing || isTriggering
  const activeStep = syncJob?.steps?.find(s => s.status === 'running')
  const completedSteps = syncJob?.steps?.filter(s => s.status === 'completed').length ?? 0
  const totalSteps = syncJob?.steps?.length ?? 0
  const neverSynced = !gmailStatus.last_sync_at

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          if (isActive) {
            setOpen(!open)
          } else if (neverSynced) {
            setOpen(!open)
          } else {
            startSync()
          }
        }}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
          isActive
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/80'
        }`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isActive ? 'animate-spin' : ''}`} />
        {isActive ? (
          <span className="flex items-center gap-1.5">
            {activeStep ? STEP_LABELS[activeStep.step_name] || activeStep.step_name : 'Starting...'}
            {activeStep && activeStep.total_items > 0 && (
              <span className="text-primary/60">{activeStep.processed_items}/{activeStep.total_items}</span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        ) : neverSynced ? (
          <span className="flex items-center gap-1">
            Gmail Sync
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        ) : (
          'Sync'
        )}
      </button>

      {/* Month picker dropdown */}
      {open && !isActive && neverSynced && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-card border border-border shadow-lg rounded-lg p-2 z-50">
          <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-1">Sync emails from</div>
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => { setOpen(false); startSync(m) }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/80 rounded-lg transition-colors"
            >
              Last {m} months
            </button>
          ))}
        </div>
      )}

      {/* Pipeline progress dropdown */}
      {open && isActive && syncJob?.steps && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-card border border-border shadow-lg rounded-lg p-4 z-50">
          <div className="text-xs font-medium text-muted-foreground mb-3">Pipeline Progress</div>
          <div className="space-y-2">
            {syncJob.steps.map((step) => (
              <StepRow key={step.step_name} step={step} />
            ))}
          </div>
          {totalSteps > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 text-right">{completedSteps}/{totalSteps} steps</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StepRow({ step }: { step: PipelineStep }) {
  const pct = step.total_items > 0 ? Math.round((step.processed_items / step.total_items) * 100) : 0
  const icon = step.status === 'completed' ? <Check className="w-3 h-3 text-green-500" />
    : step.status === 'running' ? <RefreshCw className="w-3 h-3 text-primary animate-spin" />
    : step.status === 'failed' ? <AlertTriangle className="w-3 h-3 text-destructive" />
    : <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />

  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className={`flex-1 ${step.status === 'running' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {STEP_LABELS[step.step_name] || step.step_name}
      </span>
      {step.status === 'running' && step.total_items > 0 && (
        <>
          <span className="text-xs text-muted-foreground tabular-nums">{step.processed_items}/{step.total_items}</span>
          <div className="w-10 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
      {step.error_count > 0 && (
        <span className="text-xs text-destructive/70">{step.error_count} err</span>
      )}
    </div>
  )
}
