import { supabase } from './supabase';
import type { FinanceState, StoredDocument } from '@/types/finance';
import type { GermanTaxScenario } from '@/types/tax';
import {
  FinanceSyncDocument,
  FinanceSyncState,
  buildFinanceDocument,
  deserializeFinanceDocument,
  getFinanceSyncClientId,
  sanitizeFinanceSyncState,
} from '@/lib/sync/finance-sync-service';

let cachedDocument: FinanceSyncDocument | null = null;
let lastUploadedHash: string | null = null;

function toSyncState(
  state: FinanceState & {
    customAssetReturns: Record<string, number>;
    taxScenarios?: GermanTaxScenario[];
    documents?: StoredDocument[];
  }
): FinanceSyncState {
  return {
    ...state,
    customAssetReturns: state.customAssetReturns ?? {},
    taxScenarios: state.taxScenarios ?? [],
    documents: state.documents ?? [],
  } as FinanceSyncState;
}

export async function uploadToCloud(
  rawState: FinanceState & { customAssetReturns: Record<string, number>; documents?: StoredDocument[]; taxScenarios?: GermanTaxScenario[] },
  options?: { force?: boolean }
): Promise<{ success: true; skipped: boolean; document: FinanceSyncDocument }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const clientId = getFinanceSyncClientId();
  const document = buildFinanceDocument(toSyncState(rawState), clientId);

  if (!options?.force && lastUploadedHash && lastUploadedHash === document.meta.hash) {
    cachedDocument = document;
    return { success: true, skipped: true, document };
  }

  const { error } = await supabase
    .from('finance_documents')
    .upsert({
      user_id: user.id,
      payload: document,
      updated_at: document.meta.updatedAt,
    });

  if (error) throw error;

  cachedDocument = document;
  lastUploadedHash = document.meta.hash;

  return { success: true, skipped: false, document };
}

export async function downloadFinanceDocument(): Promise<FinanceSyncDocument | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('finance_documents')
    .select('payload')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data?.payload) {
    return null;
  }

  const document = data.payload as FinanceSyncDocument;
  cachedDocument = document;
  lastUploadedHash = document.meta?.hash ?? null;

  return document;
}

export async function downloadFromCloud(): Promise<(FinanceState & { customAssetReturns: Record<string, number> }) | null> {
  const document = await downloadFinanceDocument();
  if (!document) {
    return null;
  }
  const state = deserializeFinanceDocument(document);
  return sanitizeFinanceSyncState({
    ...state,
    customAssetReturns: state.customAssetReturns ?? {},
  });
}

export async function getLastSyncTime(): Promise<Date | null> {
  const document = cachedDocument ?? (await downloadFinanceDocument());
  if (!document) {
    return null;
  }
  return document.meta?.updatedAt ? new Date(document.meta.updatedAt) : null;
}

export function getCachedFinanceDocument(): FinanceSyncDocument | null {
  return cachedDocument;
}

export function resetCachedFinanceDocument() {
  cachedDocument = null;
  lastUploadedHash = null;
}

