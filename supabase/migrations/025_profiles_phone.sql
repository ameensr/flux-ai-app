-- Add phone column to profiles table for user profile editing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
