import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface AuthCtx {
  token: string
  userId: number | null
  setAuth: (token: string, userId?: number) => void
  clearAuth: () => void
  isLoggedIn: boolean
}

const Ctx = createContext<AuthCtx>({
  token: '', userId: null, isLoggedIn: false,
  setAuth: () => {}, clearAuth: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('mx_tok') ?? '')
  const [userId, setUserId] = useState<number | null>(() => {
    const v = localStorage.getItem('mx_uid')
    return v ? Number(v) : null
  })

  const setAuth = useCallback((t: string, uid?: number) => {
    setToken(t)
    localStorage.setItem('mx_tok', t)
    if (uid) { setUserId(uid); localStorage.setItem('mx_uid', String(uid)) }
  }, [])

  const clearAuth = useCallback(() => {
    setToken(''); setUserId(null)
    localStorage.removeItem('mx_tok'); localStorage.removeItem('mx_uid')
  }, [])

  return (
    <Ctx.Provider value={{ token, userId, setAuth, clearAuth, isLoggedIn: !!token }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
