"use client";

import { useEffect } from "react";
import { useGoalletStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";

export function StoreHydrator() {
  useEffect(() => {
    useGoalletStore.persist.rehydrate();
    Promise.resolve(useAuthStore.persist.rehydrate()).finally(() => {
      useAuthStore.getState().setHasHydrated(true);
    });
  }, []);

  return null;
}
