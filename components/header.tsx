"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BarChart3, MessageSquare, Sparkles, Zap, Settings, Github, Menu, X, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePuterAuth } from '@/lib/puter-auth'
import { LogOut } from 'lucide-react'

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigationItems = [
    {
      href: '/',
      label: 'Chat',
      icon: MessageSquare,
      description: 'AI-powered conversation interface'
    },
    {
      href: '/evaluation',
      label: 'Evaluation',
      icon: BarChart3,
      description: 'Performance metrics and analysis'
    },
    {
      href: '/monitoring',
      label: 'Monitoring',
      icon: Activity,
      description: 'Live system health and request metrics'
    },
    {
      href: '/scalability',
      label: 'Scalability',
      icon: Zap,
      description: 'Load tests & RAG optimizations'
    },
    {
      href: '/operations',
      label: 'Operations',
      icon: Settings,
      description: 'Production maintenance procedures'
    },
    {
      href: '/github',
      label: 'GitHub',
      icon: Github,
      description: 'Repository and source code'
    }
  ]

  const { isAuthenticated, user, logout, signOut, isLoading } = usePuterAuth() as any
  const [logoutPending, setLogoutPending] = useState(false)

  async function handleLogout() {
    if (logoutPending) return
    setLogoutPending(true)
    try {
      const fn = typeof logout === 'function' ? logout : (typeof signOut === 'function' ? signOut : null)
      if (!fn) throw new Error('Logout function unavailable in auth context')
      await fn()
    } catch (e) {
      console.error('Logout failed:', e)
    } finally {
      setLogoutPending(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Digital Twin</h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium hidden sm:block">AI Professional Profile Assistant</p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button 
                    variant={isActive ? "default" : "ghost"} 
                    size="sm" 
                    className={cn(
                      "relative flex items-center gap-1.5 px-2 xl:px-3 py-2 h-8 xl:h-9 transition-all duration-200",
                      "hover:scale-105 active:scale-95",
                      isActive && "shadow-sm shadow-primary/20"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                    <span className="font-medium text-xs xl:text-sm">{item.label}</span>
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                    )}
                  </Button>
                </Link>
              )
            })}
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                disabled={logoutPending || isLoading}
                onClick={handleLogout}
                className="relative flex items-center gap-1.5 px-2 xl:px-3 py-2 h-8 xl:h-9 hover:bg-destructive/10 text-destructive"
              >
                <LogOut className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                <span className="font-medium text-xs xl:text-sm">{logoutPending ? 'Logging out...' : (user?.username ? `Logout (${user.username})` : 'Logout')}</span>
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-border/40">
            <nav className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-4">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={isActive ? "default" : "ghost"} 
                      size="sm" 
                      className={cn(
                        "w-full justify-start gap-2 h-10",
                        isActive && "shadow-sm shadow-primary/20"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </Button>
                  </Link>
                )
              })}
            </nav>
            {isAuthenticated && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={logoutPending || isLoading}
                  onClick={handleLogout}
                  className="text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" /> {logoutPending ? 'Logging out...' : 'Logout'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
