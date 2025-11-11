"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { uploadToCloud, downloadFinanceDocument } from "@/lib/cloud-sync";
import { useFinanceStore } from "@/store/finance-store";
import {
  FinanceSyncDocument,
  FinanceSyncState,
  deserializeFinanceDocument,
  getFinanceSyncClientId,
  sanitizeFinanceSyncState,
} from "@/lib/sync/finance-sync-service";

type StoreState = ReturnType<typeof useFinanceStore.getState>;

type ProcessOrigin = "local" | "remote" | "initial";

function selectSyncState(state: StoreState): FinanceSyncState {
  return {
    accounts: state.accounts,
    stocks: state.stocks,
    expenses: state.expenses,
    incomes: state.incomes,
    goals: state.goals,
    portfolioHistory: state.portfolioHistory,
    assumptions: state.assumptions,
    customAssetReturns: state.customAssetReturns,
  } as FinanceSyncState;
}

function serializeStateForSync(state: StoreState) {
  const sanitized = sanitizeFinanceSyncState(selectSyncState(state));
  return JSON.stringify(sanitized);
}

export function RealtimeSyncListener() {
  const replaceWithCloudData = useFinanceStore((s) => s.replaceWithCloudData);

  const clientIdRef = useRef<string>(getFinanceSyncClientId());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const uploadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUploadingRef = useRef(false);
  const pendingUploadRef = useRef(false);
  const lastProcessedHashRef = useRef<string | null>(null);
  const lastUploadedDocumentRef = useRef<FinanceSyncDocument | null>(null);
  const lastCloudTokenRef = useRef<number>(useFinanceStore.getState().cloudSyncToken ?? 0);
  const lastSerializedStateRef = useRef<string>(serializeStateForSync(useFinanceStore.getState()));

  const applyDocument = (document: FinanceSyncDocument, origin: ProcessOrigin) => {
    if (!document?.meta?.hash) {
      return;
    }

    const hash = document.meta.hash;
    const isOwnDocument = document.meta.clientId === clientIdRef.current;
    const lastUploadedHash = lastUploadedDocumentRef.current?.meta.hash;

    if (hash === lastProcessedHashRef.current) {
      if (origin === "remote" && !isOwnDocument) {
        const state = deserializeFinanceDocument(document);
        replaceWithCloudData(state);
      }
      return;
    }

    if (isOwnDocument && hash === lastUploadedHash) {
      lastProcessedHashRef.current = hash;
      return;
    }

    const state = deserializeFinanceDocument(document);
    replaceWithCloudData(state);
    lastProcessedHashRef.current = hash;
    const latestState = useFinanceStore.getState();
    lastSerializedStateRef.current = serializeStateForSync(latestState);
    lastCloudTokenRef.current = latestState.cloudSyncToken ?? lastCloudTokenRef.current;
  };

  useEffect(() => {
    let active = true;

    const initializeForUser = async (userId: string) => {
      try {
        const document = await downloadFinanceDocument();
        if (!active) {
          return;
        }

        if (document) {
          applyDocument(document, "initial");
        } else {
          const state = useFinanceStore.getState();
          const result = await uploadToCloud(selectSyncState(state), { force: true });
          if (!active) {
            return;
          }
          lastUploadedDocumentRef.current = result.document;
          applyDocument(result.document, "local");
        }
      } catch (error) {
        console.error("Failed to initialise finance sync", error);
      }
    };

    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const channel = supabase.channel(`finance-doc:${user.id}`);
      channelRef.current = channel;

      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_documents",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<{ payload: FinanceSyncDocument | null }>) => {
          if (!active) {
            return;
          }
          const record = (payload.new ?? null) as { payload?: FinanceSyncDocument | null } | null;
          const document = record?.payload ?? null;
          if (document) {
            applyDocument(document, "remote");
          } else {
            void initializeForUser(user.id);
          }
        }
      );

      channel.subscribe();
      void initializeForUser(user.id);
    };

    void setup();

    return () => {
      active = false;
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [replaceWithCloudData]);

  useEffect(() => {
    const clearUploadTimeout = () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
    };

    const triggerUpload = async () => {
      clearUploadTimeout();

      if (isUploadingRef.current) {
        pendingUploadRef.current = true;
        return;
      }

      isUploadingRef.current = true;
      try {
        const state = useFinanceStore.getState();
        const result = await uploadToCloud(selectSyncState(state));
        lastUploadedDocumentRef.current = result.document;
        if (!result.skipped) {
          applyDocument(result.document, "local");
        }
      } catch (error) {
        console.error("Auto cloud upload failed", error);
      } finally {
        isUploadingRef.current = false;
        if (pendingUploadRef.current) {
          pendingUploadRef.current = false;
          scheduleUpload(500);
        }
      }
    };

    const scheduleUpload = (delay = 800) => {
      clearUploadTimeout();
      uploadTimeoutRef.current = setTimeout(() => {
        void triggerUpload();
      }, delay);
    };

    const unsubscribe = useFinanceStore.subscribe((state) => {
      const currentToken = state.cloudSyncToken ?? 0;
      const serialized = serializeStateForSync(state);

      if (currentToken !== lastCloudTokenRef.current) {
        lastCloudTokenRef.current = currentToken;
        lastSerializedStateRef.current = serialized;
        clearUploadTimeout();
        return;
      }

      if (serialized !== lastSerializedStateRef.current) {
        lastSerializedStateRef.current = serialized;
        scheduleUpload();
      }
    });

    return () => {
      clearUploadTimeout();
      unsubscribe();
    };
  }, []);

  return null;
}
