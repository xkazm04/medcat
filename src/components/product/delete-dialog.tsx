'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { motion, AnimatePresence } from 'motion/react'
import { deleteProduct } from '@/lib/actions/products'

interface DeleteDialogProps {
  productId: string
  productName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteDialog({
  productId,
  productName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteDialogProps) {
  const t = useTranslations('deleteDialog')
  const tCommon = useTranslations('common')
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProduct(productId)
      if (result.success) {
        onOpenChange(false)
        onDeleted?.()
      } else {
        // Could show a toast here, for now just log
        console.error('Failed to delete product:', result.error)
      }
    })
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal forceMount>
        <AnimatePresence>
          {open && (
            <>
              <AlertDialogPrimitive.Overlay asChild>
                <motion.div
                  className="fixed inset-0 bg-black/50 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                />
              </AlertDialogPrimitive.Overlay>
              <AlertDialogPrimitive.Content asChild>
                <motion.div
                  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-background border border-border rounded-lg shadow-lg p-6 max-w-md w-full"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <AlertDialogPrimitive.Title className="text-lg font-semibold">
                    {t('title')}
                  </AlertDialogPrimitive.Title>
                  <AlertDialogPrimitive.Description className="mt-2 text-muted-foreground">
                    {t('confirmation', { name: productName })}
                  </AlertDialogPrimitive.Description>
                  <div className="flex justify-end gap-3 mt-6">
                    <AlertDialogPrimitive.Cancel asChild>
                      <button
                        className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                        disabled={isPending}
                      >
                        {tCommon('cancel')}
                      </button>
                    </AlertDialogPrimitive.Cancel>
                    <AlertDialogPrimitive.Action asChild>
                      <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isPending ? tCommon('deleting') : tCommon('delete')}
                      </button>
                    </AlertDialogPrimitive.Action>
                  </div>
                </motion.div>
              </AlertDialogPrimitive.Content>
            </>
          )}
        </AnimatePresence>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
