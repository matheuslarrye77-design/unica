-- Mural publications stay in public.unica_documents (ids feed, feed-preview, feed-development).
-- That document already holds title, body, images, author, comments and the rest of the post.
-- This migration only adds private storage for mural media. It does not delete or truncate documents.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'unica-mural',
  'unica-mural',
  false,
  209715200,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/mpeg',
    'audio/mp4',
    'audio/m4a',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/json'
  ]
)
on conflict (id) do nothing;
