"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  /** When true, children render without an inner border-top wrapper.
   *  Use when the child already has its own bg/border/rounded container. */
  seamless?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  seamless = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors rounded-t-xl text-left"
      >
        {open ? (
          <ChevronDown size={16} className="text-gray-400 shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-gray-400 shrink-0" />
        )}
        <span className="text-base font-medium text-gray-700">{title}</span>
      </button>

      {open && (
        seamless ? (
          <>{children}</>
        ) : (
          <div className="border-t border-gray-100 rounded-b-xl overflow-hidden">{children}</div>
        )
      )}
    </div>
  );
}
