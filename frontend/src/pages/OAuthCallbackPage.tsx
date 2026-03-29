import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeGoogleCode } from '@/api/gmail'
import { toast } from 'sonner'

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setStatus('error')
      setErrorMsg('No authorization code received')
      return
    }

    const codeVerifier = sessionStorage.getItem('gmail_code_verifier')
    if (!codeVerifier) {
      setStatus('error')
      setErrorMsg('Missing code verifier. Please try connecting again from Settings.')
      return
    }

    exchangeGoogleCode(code, codeVerifier)
      .then(() => {
        sessionStorage.removeItem('gmail_code_verifier')
        toast.success('Gmail connected successfully')
        navigate('/onboarding', { replace: true })
      })
      .catch((err) => {
        console.error('OAuth callback error:', err)
        setStatus('error')
        setErrorMsg(err.message || 'Failed to connect Gmail')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'monospace' }}>
        <div style={{ textAlign: 'center', padding: '2rem', border: '1px solid #333', borderRadius: '4px', maxWidth: '400px' }}>
          <p style={{ color: '#ef4444', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Connection Failed</p>
          <p style={{ color: '#888', fontSize: '11px', marginBottom: '1.5rem' }}>{errorMsg}</p>
          <button
            onClick={() => navigate('/settings', { replace: true })}
            style={{ padding: '8px 16px', fontSize: '11px', background: '#1a1a1a', color: '#e5e5e5', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer' }}
          >
            Back to Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connecting Gmail...</p>
      </div>
    </div>
  )
}
