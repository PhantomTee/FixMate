-- Add image URL support to chat messages
alter table messages add column if not exists image_url text;
