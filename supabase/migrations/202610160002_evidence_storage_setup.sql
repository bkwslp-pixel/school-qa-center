-- =============================================================================
-- Migration: Setup Supabase Storage Bucket for School QA Evidence
-- Bucket Name: qa-evidence
-- =============================================================================

-- 1. Create the storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qa-evidence',
  'qa-evidence',
  true, -- Set to true for direct preview/access or false with signed URLs
  52428800, -- 50MB limit per file
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies for qa-evidence bucket
-- Allow public or authenticated read
CREATE POLICY "Public Read Evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'qa-evidence');

-- Allow authenticated users to upload evidence files
CREATE POLICY "Authenticated Upload Evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'qa-evidence'
  AND auth.role() = 'authenticated'
);

-- Allow uploaders or admins to update evidence files
CREATE POLICY "Authenticated Update Evidence"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'qa-evidence'
  AND auth.role() = 'authenticated'
);

-- Allow uploaders or admins to delete evidence files
CREATE POLICY "Authenticated Delete Evidence"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'qa-evidence'
  AND auth.role() = 'authenticated'
);
