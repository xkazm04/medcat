"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Bookmark, BookmarkPlus, Trash2, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSavedViews } from "@/lib/hooks/use-saved-views";

export function SavedViews() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const { views, saveView, deleteView, isFull } = useSavedViews();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("savedViews");

  const hasFilters = Array.from(searchParams.entries()).some(([key]) =>
    ["search", "vendor", "category", "material", "ceMarked", "mdrClass", "manufacturer", "minPrice", "maxPrice"].includes(key)
  );

  const handleSave = () => {
    if (newName.trim() && hasFilters) {
      saveView(newName.trim(), searchParams.toString());
      setNewName("");
      setIsSaving(false);
    }
  };

  const handleApply = (params: string) => {
    startTransition(() => {
      router.push(`?${params}`);
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
      >
        <Bookmark className="h-3.5 w-3.5" />
        <span>{t("title")}</span>
        {views.length > 0 && (
          <span className="ml-auto text-xs bg-muted px-1.5 rounded">{views.length}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-hidden"
            >
              {/* Save current view */}
              {hasFilters && !isFull && (
                <div className="p-2 border-b border-border">
                  {isSaving ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSave()}
                        placeholder={t("namePlaceholder")}
                        className="flex-1 text-sm px-2 py-1 border border-border rounded bg-transparent outline-none focus:border-accent"
                        autoFocus
                      />
                      <button onClick={handleSave} className="p-1 text-accent hover:bg-muted rounded" aria-label="Save">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setIsSaving(false)} className="p-1 text-muted-foreground hover:bg-muted rounded" aria-label="Cancel">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsSaving(true)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-accent hover:bg-green-light/50 rounded transition-colors"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                      {t("saveCurrentView")}
                    </button>
                  )}
                </div>
              )}
              {isFull && hasFilters && (
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                  {t("maxViews")}
                </div>
              )}

              {/* Saved views list */}
              {views.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  <p>{t("noViews")}</p>
                  <p className="text-xs mt-1">{t("noViewsDesc")}</p>
                </div>
              ) : (
                <div className="max-h-[200px] overflow-y-auto py-1">
                  {views.map(view => (
                    <div
                      key={view.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors group"
                    >
                      <button
                        onClick={() => handleApply(view.params)}
                        className="flex-1 text-sm text-left truncate"
                      >
                        {view.name}
                      </button>
                      <button
                        onClick={() => deleteView(view.id)}
                        className="p-1 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                        aria-label={t("delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
