-- Add staff profile columns to invitations table for the direct-add-staff flow
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS notes TEXT;

-- Make expires_at nullable (no longer needed for direct-add flow)
ALTER TABLE invitations ALTER COLUMN expires_at DROP NOT NULL;

-- Add address column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
