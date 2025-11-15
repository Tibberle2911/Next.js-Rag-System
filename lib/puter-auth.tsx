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
}

const PuterAuthContext = createContext<PuterAuthContextType | undefined>(undefined)

export function PuterAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PuterUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [puterClient, setPuterClient] = useState<any>(null)

  useEffect(() => {
    initializePuter()
  }, [])

  async function initializePuter() {
    try {
      console.log('🔄 Loading Puter SDK...')
      
      // Load Puter SDK from CDN instead of npm package
      // The npm package may not work properly in browser context
      if (typeof window !== 'undefined') {
        // Check if puter is already loaded from CDN
        if ((window as any).puter) {
          const puter = (window as any).puter
          console.log('✅ Puter SDK already loaded from CDN')
          
          // Verify that the auth module is available
          if (!puter.auth) {
            console.error('❌ Puter SDK loaded but auth module is not available')
            setPuterClient(null)
            return
          }
          
          setPuterClient(puter)

          // Check if user is already authenticated (synchronous method)
          const isSignedIn = puter.auth.isSignedIn()
          console.log('🔍 User signed in status:', isSignedIn)
          console.log('🔍 Puter authToken:', puter.authToken)
          console.log('🔍 Puter auth.authToken:', puter.auth?.authToken)
          
          if (isSignedIn) {
            try {
              const currentUser = await puter.auth.getUser()
              setUser(currentUser)
              console.log('✅ User already authenticated:', currentUser.username)
              console.log('✅ Auth token available:', !!puter.authToken)
            } catch (error) {
              console.warn('⚠️ Could not get user info:', error)
            }
          }
          
          return
        }
        
        // If not loaded, load it dynamically
        console.log('📦 Loading Puter SDK from CDN...')
        const script = document.createElement('script')
        script.src = 'https://js.puter.com/v2/'
        script.async = true
        
        script.onload = () => {
          console.log('✅ Puter SDK loaded from CDN')
          const puter = (window as any).puter
          
          if (!puter || !puter.auth) {
            console.error('❌ Puter SDK loaded but not properly initialized')
            setPuterClient(null)
            setIsLoading(false)
            return
          }
          
          setPuterClient(puter)
          
          // Check if user is already authenticated
          const isSignedIn = puter.auth.isSignedIn()
          console.log('🔍 User signed in status:', isSignedIn)
          
          if (isSignedIn) {
            puter.auth.getUser().then((currentUser: any) => {
              setUser(currentUser)
              console.log('✅ User already authenticated:', currentUser.username)
            }).catch((error: any) => {
              console.warn('⚠️ Could not get user info:', error)
            })
          }
          
          setIsLoading(false)
        }
        
        script.onerror = () => {
          console.error('❌ Failed to load Puter SDK from CDN')
          setPuterClient(null)
          setIsLoading(false)
        }
        
        document.head.appendChild(script)
        return
      }
    } catch (error: any) {
      console.error('❌ Failed to initialize Puter SDK:', error.message || error)
      console.error('Full error:', error)
      console.warn('⚠️ App will require Puter authentication to continue')
      setPuterClient(null)
    } finally {
      // Only set loading to false if we're not waiting for script to load
      if (typeof window === 'undefined' || (window as any).puter) {
        setIsLoading(false)
      }
    }
  }

  async function signIn() {
    if (!puterClient) {
      const errorMsg = 'Puter SDK not initialized. Please wait for initialization to complete.'
      console.error('❌', errorMsg)
      return
    }

    if (!puterClient.auth) {
      const errorMsg = 'Puter auth module not available'
      console.error('❌', errorMsg)
      return
    }

    try {
      setIsLoading(true)
      console.log('🔐 Starting Puter sign-in flow...')
      
      // Puter will redirect to login page, then return
      await puterClient.auth.signIn()
      
      console.log('🔄 Checking sign-in status...')
      
      // Check if sign-in was successful (synchronous)
      const isSignedIn = puterClient.auth.isSignedIn()
      
      if (isSignedIn) {
        // After successful sign-in, get user info
        const currentUser = await puterClient.auth.getUser()
        setUser(currentUser)
        console.log('✅ Sign-in successful:', currentUser.username)
      } else {
        console.warn('⚠️ Sign-in process completed but user is not signed in')
      }
    } catch (error) {
      console.error('❌ Sign in failed:', error)
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
      console.error('Sign out failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  function getPuterClient() {
    return puterClient
  }

  function getAuthToken(): string | null {
    if (!puterClient) {
      console.warn('⚠️ Cannot get auth token: Puter client not initialized')
      return null
    }
    
    // Try multiple ways to get the auth token from Puter SDK
    // Method 1: Direct authToken property
    if (puterClient.authToken) {
      console.log('✅ Retrieved auth token from puterClient.authToken')
      return puterClient.authToken
    }
    
    // Method 2: From auth module
    if (puterClient.auth && puterClient.auth.authToken) {
      console.log('✅ Retrieved auth token from puterClient.auth.authToken')
      return puterClient.auth.authToken
    }
    
    // Method 3: From session/storage
    if (typeof window !== 'undefined') {
      try {
        const storedToken = localStorage.getItem('puter.auth.token') || 
                           sessionStorage.getItem('puter.auth.token')
        if (storedToken) {
          console.log('✅ Retrieved auth token from browser storage')
          return storedToken
        }
      } catch (e) {
        console.warn('Could not access browser storage:', e)
      }
    }
    
    console.warn('⚠️ No auth token found - user may not be signed in')
    return null
  }

  const contextValue = useMemo<PuterAuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut,
    getPuterClient,
    getAuthToken
  }), [user, isLoading])

  return (
    <PuterAuthContext.Provider value={contextValue}>
      {children}
    </PuterAuthContext.Provider>
  )
}

export function usePuterAuth() {
  const context = useContext(PuterAuthContext)
  if (context === undefined) {
    throw new Error('usePuterAuth must be used within a PuterAuthProvider')
  }
  return context
}
