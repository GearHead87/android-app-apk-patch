import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../store'
import { apiLogin, apiVerifyOtp } from '../api'

const PROFESSIONS = [
  { id: '1', label: 'Doctor' },
  { id: '2', label: 'Intern Doctor' },
  { id: '3', label: 'Medical Student' },
  { id: '4', label: 'Pharmacist' },
  { id: '5', label: 'Pharma Professional' },
  { id: '6', label: 'Nurse' },
  { id: '7', label: 'Other Profession' },
]

export default function LoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [profession, setProfession] = useState('1')
  const [otp, setOtp] = useState('')
  const [userId, setUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await apiLogin({ name, mobile_number: mobile, profession })
      if (res.success && res.data?.authToken) {
        if (res.data.otpRequired) {
          setUserId(res.data.userId)
          setMsg(res.data.displayMessage ?? 'OTP sent to your mobile.')
          setStep('otp')
        } else {
          setAuth(res.data.authToken, res.data.userId)
          navigate('/app')
        }
      } else {
        setError(res.message ?? 'Login failed')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError(''); setLoading(true)
    try {
      const res = await apiVerifyOtp({ user_id: userId, otp })
      if (res.success && res.data?.authToken) {
        setAuth(res.data.authToken, res.data.userId)
        navigate('/app')
      } else {
        setError(res.message ?? 'Invalid OTP')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">💊</div>
        <h1 className="login-title">MedEx</h1>
        <p className="login-sub">Bangladesh Drug Reference</p>

        {step === 'form' ? (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Enter your name" required minLength={3}
              />
            </div>
            <div className="form-group">
              <label>Mobile Number</label>
              <input
                value={mobile} onChange={e => setMobile(e.target.value)}
                placeholder="01XXXXXXXXX" required type="tel"
              />
            </div>
            <div className="form-group">
              <label>Profession</label>
              <select value={profession} onChange={e => setProfession(e.target.value)}>
                {PROFESSIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In / Register'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleOtp}>
            {msg && <div className="form-info">{msg}</div>}
            <div className="form-group">
              <label>OTP Code</label>
              <input
                value={otp} onChange={e => setOtp(e.target.value)}
                placeholder="Enter OTP" required autoFocus
                inputMode="numeric" maxLength={6}
              />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
            <button type="button" className="back-btn" onClick={() => setStep('form')}>
              ← Back
            </button>
          </form>
        )}
        <p className="login-note">
          By signing in you agree to the{' '}
          <Link to="/app/terms">Terms &amp; Conditions</Link> and{' '}
          <Link to="/app/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
