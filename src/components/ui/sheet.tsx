'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { forwardRef, ComponentPropsWithoutRef, ReactNode } from 'react'

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-50 bg-black/40 ${className || ''}`}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

interface SheetContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'left' | 'right'
  children?: ReactNode
}

const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', children, className, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay asChild>
        <motion.div
          key="sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      </SheetOverlay>
      <DialogPrimitive.Content ref={ref} asChild {...props}>
        <motion.div
          key="sheet-content"
          initial={{ x: side === 'right' ? '100%' : '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: side === 'right' ? '100%' : '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`fixed z-50 h-full bg-background border-l border-border shadow-lg ${
            side === 'right' ? 'right-0 top-0' : 'left-0 top-0'
          } ${className || ''}`}
          style={className?.includes('!w-auto') ? undefined : { width: 'min(1000px, 95vw)' }}
        >
          <SheetClose className="absolute right-4 top-4 p-2 rounded-md hover:bg-muted transition-colors z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
          {children}
        </motion.div>
      </DialogPrimitive.Content>
    </SheetPortal>
  )
)
SheetContent.displayName = 'SheetContent'

interface SheetHeaderProps {
  children: ReactNode
  className?: string
}

const SheetHeader = ({ children, className }: SheetHeaderProps) => (
  <div className={`px-6 py-4 border-b-2 border-green-border ${className || ''}`}>
    {children}
  </div>
)

const SheetTitle = DialogPrimitive.Title
const SheetDescription = DialogPrimitive.Description

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
}
