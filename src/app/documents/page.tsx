"use client";

import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { uploadPdfDocument, deleteStoredDocument, getDocumentDownloadUrl } from "@/lib/documents";
import type { StoredDocument } from "@/types/finance";
import { CloudUpload, Download, Loader2, Trash2, FileText } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${sizes[i]}`;
}

function sortDocuments(documents: StoredDocument[]): StoredDocument[] {
  return documents.slice().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export default function DocumentsPage() {
  const documents = useFinanceStore((s) => s.documents);
  const addDocument = useFinanceStore((s) => s.addDocument);
  const removeDocument = useFinanceStore((s) => s.removeDocument);
  const updateDocument = useFinanceStore((s) => s.updateDocument);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sortedDocuments = useMemo(() => sortDocuments(documents), [documents]);

  const handleUpload = async (file: File | null) => {
    if (!file) {
      return;
    }
    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const metadata = await uploadPdfDocument(file);
      addDocument(metadata);
      setSuccess(`${file.name} uploaded successfully.`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document: StoredDocument) => {
    if (!confirm(`Delete ${document.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteStoredDocument(document.storagePath);
      removeDocument(document.id);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  const handleDownload = async (document: StoredDocument) => {
    setError(null);
    try {
      const url = await getDocumentDownloadUrl(document.storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create download link");
    }
  };

  const handleDescriptionChange = (id: string, description: string) => {
    updateDocument(id, { description: description.trim() || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Shared Documents</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Upload and access important PDFs for both of you in one secure place.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-medium">Upload a PDF document</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              PDFs are stored privately in Supabase Storage and synced across browsers.
            </p>
          </div>
          <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
            />
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <CloudUpload className="h-4 w-4" /> Select PDF
              </>
            )}
          </label>
        </div>
        {error && <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
        {success && <div className="mt-3 text-sm text-green-600 dark:text-green-400">{success}</div>}
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Stored PDFs</h2>
          <span className="text-xs text-zinc-500">
            {sortedDocuments.length} {sortedDocuments.length === 1 ? "document" : "documents"}
          </span>
        </div>
        {sortedDocuments.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">No documents uploaded yet.</div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sortedDocuments.map((document) => (
              <div key={document.id} className="px-4 py-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{document.name}</p>
                    <span className="text-xs text-zinc-500">{formatBytes(document.size)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Uploaded {new Date(document.uploadedAt).toLocaleString()} by {document.uploadedByEmail ?? "unknown"}
                  </p>
                  <textarea
                    value={document.description ?? ""}
                    onChange={(event) => handleDescriptionChange(document.id, event.target.value)}
                    placeholder="Add a short note (optional)"
                    className="mt-2 w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(document)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(document)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
