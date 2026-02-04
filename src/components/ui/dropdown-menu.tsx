"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, children, align = "right" }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Render trigger directly - it should handle its own click */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsOpen(!isOpen);
          }
        }}
      >
        {trigger}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="dropdown-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`absolute z-50 mt-1 min-w-[180px] bg-background border border-border rounded-md shadow-lg py-1 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function DropdownMenuItem({ children, onClick, disabled, className }: DropdownMenuItemProps) {
  return (
    <button
      onClick={() => {
        if (!disabled && onClick) {
          onClick();
        }
      }}
      disabled={disabled}
      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
        disabled
          ? "text-muted-foreground cursor-not-allowed"
          : "hover:bg-muted"
      } ${className || (disabled ? "" : "text-foreground")}`}
    >
      {children}
    </button>
  );
}

interface DropdownMenuSectionProps {
  children: ReactNode;
  className?: string;
}

export function DropdownMenuSection({ children, className }: DropdownMenuSectionProps) {
  return (
    <div className={`py-1 ${className || ""}`}>
      {children}
    </div>
  );
}

export function DropdownMenuDivider() {
  return <div className="my-1 border-t border-border" />;
}
