import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { triggerSync, getSyncJob, getGmailStatus } from '@/api/gmail'
import { useSyncStore } from '@/stores/syncStore'
import { toast } from 'sonner'

export function useGmailStatus() {
  return useQuery({
    queryKey: ['gmail-status'],
    queryFn: getGmailStatus,
    retry: false,
    staleTime: 30_000,
  })
}

export function useSyncJob() {
  const { activeSyncJobId, setActiveSyncJobId } = useSyncStore()
  const qc = useQueryClient()
  const handledRef = useRef<number | null>(null)

  const query = useQuery({
    queryKey: ['sync-job', activeSyncJobId],
    queryFn: () => getSyncJob(activeSyncJobId!),
    enabled: activeSyncJobId !== null,
    refetchInterval: (query) => {
      const job = query.state.data
      if (!job) return 1500
      if (job.status === 'completed' || job.status === 'failed') return false
      return 1500
    },
  })

  const job = query.data

  useEffect(() => {
    if (!job || activeSyncJobId === null) return
    if (handledRef.current === job.id) return
    if (job.status !== 'completed' && job.status !== 'failed') return

    handledRef.current = job.id
    setActiveSyncJobId(null)
    qc.invalidateQueries({ queryKey: ['gmail-status'] })
    qc.invalidateQueries({ queryKey: ['credit-cards'] })
    qc.invalidateQueries({ queryKey: ['banking-accounts'] })
    qc.invalidateQueries({ queryKey: ['banking-summary'] })

    if (job.status === 'completed') {
      const parts: string[] = []
      if (job.new_messages > 0) parts.push(`${job.new_messages} new emails`)
      if (job.extracted_count > 0) parts.push(`${job.extracted_count} data points extracted`)
      const parseStep = job.steps?.find(s => s.step_name === 'parse')
      if (parseStep && parseStep.total_items > 0) parts.push(`${parseStep.total_items} emails parsed`)
      const materializeStep = job.steps?.find(s => s.step_name === 'materialize')
      if (materializeStep && materializeStep.total_items > 0) parts.push(`${materializeStep.total_items} records created`)
      toast.success(parts.length > 0 ? `Sync complete: ${parts.join(', ')}` : 'Sync complete — everything up to date')
    } else {
      toast.error(`Sync failed: ${job.error_message}`)
    }
  }, [job, activeSyncJobId, setActiveSyncJobId, qc])

  return {
    syncJob: job ?? null,
    syncing: activeSyncJobId !== null,
  }
}

export function useStartSync() {
  const { activeSyncJobId, setActiveSyncJobId } = useSyncStore()
  const { data: gmailStatus } = useGmailStatus()

  const mutation = useMutation({
    mutationFn: (months: number) => triggerSync(months),
    onSuccess: ({ sync_job_id }) => {
      setActiveSyncJobId(sync_job_id)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    },
  })

  const startSync = (months: number = 12) => {
    if (activeSyncJobId !== null) {
      toast.error('A sync is already in progress')
      return
    }
    if (gmailStatus?.needs_reauth) {
      toast.error('Gmail authorization expired. Reconnect in Settings.')
      return
    }
    if (!gmailStatus?.connected) {
      toast.error('Connect Gmail in Settings first.')
      return
    }
    mutation.mutate(months)
  }

  return { startSync, isTriggering: mutation.isPending }
}
