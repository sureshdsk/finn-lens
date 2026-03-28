export const DEMO_TOKEN = 'demo-finnlens-token'

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true'
}
