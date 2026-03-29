export const DEMO_TOKEN = 'demo-finnlens-token'

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true'
}

export function showDemoLandingPage(): boolean {
  return import.meta.env.VITE_DEMO_LANDING_PAGE === 'true'
}
