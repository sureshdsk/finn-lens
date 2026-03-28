import { create } from 'zustand'

interface SyncState {
  activeSyncJobId: number | null
  setActiveSyncJobId: (id: number | null) => void
}

export const useSyncStore = create<SyncState>()((set) => ({
  activeSyncJobId: null,
  setActiveSyncJobId: (id) => set({ activeSyncJobId: id }),
}))
