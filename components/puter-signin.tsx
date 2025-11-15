/**
 * Puter Sign-In Component
 * Displays authentication UI and blocks access until user signs in
 */

'use client'

import { usePuterAuth } from "@/lib/puter-auth"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, LogOut, User } from 'lucide-react'

export function PuterSignIn() {
  const { user, isAuthenticated, isLoading, signIn, signOut, getPuterClient } = usePuterAuth()
  
  const puterClient = getPuterClient()
  const puterAvailable = puterClient !== null
  
  // Show loading message if Puter is still initializing
  if (!puterAvailable && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Puter SDK...</p>
          <p className="text-xs text-muted-foreground">This may take a few seconds...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Initializing Puter...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Signed in as {user.username}
          </CardTitle>
          <CardDescription>
            You're using Puter AI with unlimited free access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={signOut} 
            variant="outline" 
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {puterAvailable ? 'Sign in Required' : 'Puter SDK Required'}
          </CardTitle>
          <CardDescription>
            {puterAvailable ? (
              'This application requires Puter authentication for unlimited free AI access. Sign in to continue.'
            ) : (
              'The Puter SDK could not be loaded. This application requires Puter for authentication and AI services.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {puterAvailable ? (
            <>
              <Alert>
                <AlertDescription>
                  <strong>Why Puter Authentication?</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>✓ Unlimited free AI API access</li>
                    <li>✓ No rate limits or quotas</li>
                    <li>✓ Secure cloud authentication</li>
                    <li>✓ Privacy-focused platform</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={signIn} 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in with Puter'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Don't have a Puter account? You'll be guided to create one during sign-in.
              </p>
            </>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Puter SDK Failed to Load</strong>
                  <p className="mt-2 text-sm">
                    The application cannot function without the Puter SDK. Possible causes:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Network connectivity issues</li>
                    <li>• Firewall or content blocker</li>
                    <li>• Browser security settings</li>
                    <li>• CDN service unavailable</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertDescription>
                  <strong>What you can try:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>1. Reload the page</li>
                    <li>2. Check your internet connection</li>
                    <li>3. Disable ad blockers or extensions</li>
                    <li>4. Try a different browser</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={() => window.location.reload()} 
                variant="default"
                className="w-full"
              >
                Reload Page
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
