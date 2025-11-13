import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import type { StoredDocument } from "@/types/finance";

const BUCKET_ID = "important-docs";

function sanitizeFilename(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9-_\.]+/g, "-");
}

export async function uploadPdfDocument(file: File): Promise<StoredDocument> {
  const isPdfMime =
    file.type === "application/pdf" ||
    file.type === "application/x-pdf" ||
    file.type === "application/octet-stream" ||
    file.type === "";
  const hasPdfExtension = file.name?.toLowerCase().endsWith(".pdf");

  if (!isPdfMime && !hasPdfExtension) {
    throw new Error("Only PDF files are supported at the moment.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  const safeName = sanitizeFilename(file.name || "document.pdf") || "document.pdf";
  const extension = safeName.toLowerCase().endsWith(".pdf") ? "" : ".pdf";
  const filename = `${safeName}${extension}`;
  const path = `${user.id}/${uuidv4()}-${filename}`;

  const { error } = await supabase.storage.from(BUCKET_ID).upload(path, file, {
    contentType: "application/pdf",
  });

  if (error) {
    console.error("Failed to upload document", error);
    throw new Error(error.message ?? "Failed to upload document");
  }

  const uploadedAt = new Date().toISOString();

  return {
    id: uuidv4(),
    name: file.name,
    size: file.size,
    storagePath: path,
    uploadedAt,
    uploadedById: user.id,
    uploadedByEmail: user.email,
  } satisfies StoredDocument;
}

export async function deleteStoredDocument(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_ID).remove([storagePath]);
  if (error) {
    console.error("Failed to delete document", error);
    throw new Error(error.message ?? "Failed to delete document");
  }
}

export async function getDocumentDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET_ID).createSignedUrl(storagePath, 60 * 10);
  if (error || !data?.signedUrl) {
    console.error("Failed to create download URL", error);
    throw new Error(error?.message ?? "Failed to create download link");
  }
  return data.signedUrl;
}
