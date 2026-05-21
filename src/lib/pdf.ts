/**
 * PDF generation helpers using @react-pdf/renderer.
 *
 * These functions abstract away the PDF generation and Supabase Storage upload
 * workflow. Import and use them in API route handlers (e.g. GET /api/quotes/[id]/pdf).
 *
 * Usage:
 *   const buffer = await generatePdf(MyDocument, { ...props });
 *   const url = await uploadPdfToStorage(buffer, `my-folder/${id}.pdf`);
 */

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Render a React PDF document component to a Buffer.
 *
 * @param element - A React element from @react-pdf/renderer (<Document> root)
 * @returns Buffer containing the PDF binary data
 *
 * @example
 *   import { MyPdfDocument } from "@/components/pdf/pdf-template";
 *   const buffer = await generatePdf(<MyPdfDocument title="Invoice #1" />);
 */
export async function generatePdf(element: ReactElement<DocumentProps>): Promise<Buffer> {
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}

/**
 * Upload a PDF buffer to Supabase Storage and return the public URL.
 *
 * @param buffer - The PDF buffer from generatePdf()
 * @param storagePath - Path inside the bucket, e.g. "invoices/2024/invoice-123.pdf"
 * @param bucket - Bucket name (defaults to SUPABASE_STORAGE_BUCKET_DOCS env var)
 * @returns Public URL of the uploaded PDF
 *
 * @example
 *   const url = await uploadPdfToStorage(buffer, `quotes/${quoteId}.pdf`);
 */
export async function uploadPdfToStorage(
  buffer: Buffer,
  storagePath: string,
  bucket?: string
): Promise<string> {
  const bucketName =
    bucket ??
    process.env.SUPABASE_STORAGE_BUCKET_DOCS ??
    "documentos";

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`PDF upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
  return data.publicUrl;
}
