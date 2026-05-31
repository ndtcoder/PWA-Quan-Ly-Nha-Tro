-- Migration 004: New Features - Contract Scan PDF and Notes
-- Adds scan_pdf_url to contracts, notes to renter_profiles and profiles

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS scan_pdf_url TEXT;

ALTER TABLE renter_profiles ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;
