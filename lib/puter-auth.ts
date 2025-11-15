/**
 * Puter Authentication Client
 * Based on: https://developer.puter.com/tutorials/free-unlimited-auth-api/
 * 
 * Handles user authentication via Puter SDK
 * Provides authenticated API access for AI calls
 */

'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'

interface PuterUser {
  username: string
  email?: string
  [key: string]: any
}

interface PuterAuthContextType {
  user: PuterUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  getPuterClient: () => any
  getAuthToken: () => string | null
  logout: () => Promise<void>
}

const PuterAuthContext = createContext<PuterAuthContextType | undefined>(undefined)
const DEBUG = typeof window !== 'undefined' && (window as any).__PUTER_DEBUG__ === true || process.env.NEXT_PUBLIC_DEBUG === 'true'

export function PuterAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PuterUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [puterClient, setPuterClient] = useState<any>(null)

  useEffect(() => {
    initializePuter()
  }, [])

  function hasStoredToken(): boolean {
    if (typeof window === 'undefined') return false
    try {
      return !!(
        localStorage.getItem('puter.auth.token') ||
        sessionStorage.getItem('puter.auth.token')
      )
    } catch {
      return false
    }
  }

  async function initializePuter() {
    try {
      if (DEBUG) console.log('🔄 Initializing Puter auth...')
      if (typeof window === 'undefined') {
        setIsLoading(false)
        return
      }
      // Prefer window.puter loaded by <script src="https://js.puter.com/v2/"> for full browser features
      const winPuter = (window as any).puter
      if (winPuter && winPuter.auth) {
        if (DEBUG) console.log('✅ Using window.puter SDK')
        setPuterClient(winPuter)
        // Only check sign-in if a stored token exists to avoid whoami 401 noise
        if (hasStoredToken() && winPuter.auth.isSignedIn()) {
          try {
            const currentUser = await winPuter.auth.getUser()
            setUser(currentUser)
            if (DEBUG) console.log('✅ User already signed in:', currentUser.username)
          } catch (e) {
            if (DEBUG) console.warn('⚠️ Could not fetch user after isSignedIn true:', e)
          }
        }
        setIsLoading(false)
        return
      }
      // Fallback: attempt dynamic import (may not expose full browser functionality)
      if (DEBUG) console.log('📦 window.puter not found; attempting dynamic import("puter")')
      try {
        const puterModule = await import('puter')
        const puter = (puterModule as any).default || puterModule
        if (puter?.auth) {
          setPuterClient(puter)
          // Only check sign-in if a stored token exists
          if (hasStoredToken() && puter.auth.isSignedIn()) {
            try {
              const currentUser = await puter.auth.getUser()
              setUser(currentUser)
              if (DEBUG) console.log('✅ User signed in via imported SDK:', currentUser.username)
            } catch (e) {
              if (DEBUG) console.warn('⚠️ Failed to get user via imported SDK:', e)
            }
          }
        } else {
          if (DEBUG) console.error('❌ Imported Puter SDK lacks auth module')
        }
      } catch (importError) {
        if (DEBUG) console.error('❌ Dynamic import of Puter failed:', importError)
      }
    } catch (error) {
      if (DEBUG) console.error('Failed to initialize Puter:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function signIn() {
    if (!puterClient || !puterClient.auth) {
      if (DEBUG) console.error('❌ Puter client/auth not initialized; cannot sign in')
      return
    }
    try {
      setIsLoading(true)
      if (DEBUG) console.log('🔐 Initiating Puter sign-in...')
      await puterClient.auth.signIn()
      const isSignedIn = puterClient.auth.isSignedIn()
      if (isSignedIn) {
        try {
          const currentUser = await puterClient.auth.getUser()
          setUser(currentUser)
          if (DEBUG) console.log('✅ Sign-in success:', currentUser.username)
        } catch (e) {
          if (DEBUG) console.warn('⚠️ Sign-in completed but failed to fetch user:', e)
        }
      } else {
        if (DEBUG) console.warn('⚠️ Sign-in flow finished but user not signed in')
      }
    } catch (error) {
      if (DEBUG) console.error('Sign in failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function signOut() {
    if (!puterClient) return

    try {
      setIsLoading(true)
      await puterClient.auth.signOut()
      setUser(null)
    } catch (error) {
      if (DEBUG) console.error('Sign out failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Alias for signOut with local storage cleanup to fully reset session
  async function logout() {
    try {
      await signOut()
      // Attempt to clear potential cached tokens
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('puter.auth.token')
          sessionStorage.removeItem('puter.auth.token')
        } catch {}
      }
    } catch (e) {
      if (DEBUG) console.error('Logout encountered an error:', e)
      throw e
    }
  }

  function getPuterClient() {
    if (puterClient) return puterClient
    if (typeof window !== 'undefined' && (window as any).puter) return (window as any).puter
    return null
  }

  function getAuthToken(): string | null {
    if (!puterClient) return null
    // Preferred: direct property if exposed
    if (puterClient.authToken) return puterClient.authToken
    // Secondary: nested auth object
    if (puterClient.auth?.authToken) return puterClient.auth.authToken
    // Fallback: local/session storage
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('puter.auth.token') || sessionStorage.getItem('puter.auth.token')
      } catch {}
    }
    return null
  }

  const contextValue = useMemo<PuterAuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut,
    getPuterClient,
    getAuthToken,
    logout
  }), [user, isLoading])

  return React.createElement(PuterAuthContext.Provider, { value: contextValue }, children)
}

export function usePuterAuth() {
  const context = useContext(PuterAuthContext)
  if (context === undefined) {
    throw new Error('usePuterAuth must be used within a PuterAuthProvider')
  }
  return context
}
