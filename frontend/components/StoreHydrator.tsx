"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export function StoreHydrator() {
  useEffect(() => {
    Promise.resolve(useAuthStore.persist.rehydrate()).finally(() => {
      useAuthStore.getState().setHasHydrated(true);
    });
  }, []);

  return null;
}
