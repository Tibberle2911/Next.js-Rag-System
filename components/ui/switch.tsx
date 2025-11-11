'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all outline-none',
        'focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-400',
        'data-[state=unchecked]:bg-muted data-[state=unchecked]:border-border',
        'border-2 shadow-sm',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={
          'pointer-events-none block h-5 w-5 rounded-full transition-transform shadow-lg'
          + ' data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
          + ' data-[state=checked]:bg-white'
          + ' data-[state=unchecked]:bg-foreground/80'
          + ' border border-background'
        }
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
