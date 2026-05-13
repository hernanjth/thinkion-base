"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Wraps router.push() inside startTransition so React treats navigation as
 * interruptible: a second navigate() call while one is in-flight lets React
 * abandon the first render and start the second immediately.
 *
 * isPending is true from the moment navigate() is called until the new page
 * finishes rendering — use it to drive loading indicators.
 *
 * navigatingTo tracks which href is in-flight and resets automatically when
 * the pathname changes (i.e. navigation is complete).
 *
 * Note: HTTP-level cancellation of the RSC payload request is handled
 * automatically by Next.js when a new navigation starts. AbortController
 * is not needed here.
 */
export function useNavigation() {
  const [isPending, startTransition] = useTransition();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Clear the in-flight target once the pathname actually changes.
  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  function navigate(href: string) {
    setNavigatingTo(href);
    startTransition(() => {
      router.push(href);
    });
  }

  return { navigate, isPending, navigatingTo };
}
