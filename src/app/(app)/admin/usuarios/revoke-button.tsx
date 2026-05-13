"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { revokeInvitation } from "./actions";

export function RevokeButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm("¿Revocar esta invitación?")) return;
        startTransition(() => revokeInvitation(id));
      }}
      disabled={isPending}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
      Revocar
    </button>
  );
}
