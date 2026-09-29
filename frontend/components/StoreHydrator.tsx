"use client";

import { useEffect } from "react";
import { useGoalletStore } from "@/lib/store";

export function StoreHydrator() {
  useEffect(() => {
    useGoalletStore.persist.rehydrate();
  }, []);

  return null;
}
