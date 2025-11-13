import { NextResponse } from "next/server";
import { supabaseAdmin, hasSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET_ID = "important-docs";

export async function POST() {
  if (!hasSupabaseAdmin || !supabaseAdmin) {
    return NextResponse.json(
      {
        error:
          "Storage bucket missing and no service role key is configured. Please create the 'important-docs' bucket via Supabase SQL (see supabase-schema.sql) or set SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 501 }
    );
  }

  const { data, error } = await supabaseAdmin.storage.getBucket(BUCKET_ID);

  if (error && error.message !== "Bucket not found") {
    return NextResponse.json({ error: error.message }, { status: error.status ?? 500 });
  }

  if (!data) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_ID, {
      public: false,
    });

    if (createError && createError.message !== "Bucket already exists") {
      return NextResponse.json({ error: createError.message }, { status: createError.status ?? 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

