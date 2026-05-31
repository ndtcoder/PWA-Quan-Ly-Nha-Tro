-- Migration 001: Core Tables
-- Creates the foundational tables for the rental management system
-- Version: FINAL (includes all features as of current release)

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    subscription_plan TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('sysadmin', 'owner', 'manager', 'accountant', 'maintenance', 'cleaner', 'renter')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVITATIONS
-- ============================================================
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID UNIQUE DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'accountant', 'maintenance', 'cleaner', 'renter')),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    property_id UUID REFERENCES properties(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    ward TEXT,
    district TEXT,
    city TEXT,
    property_type TEXT CHECK (property_type IN ('house', 'apartment_building', 'villa')),
    total_units INT DEFAULT 0,
    description TEXT,
    thumbnail_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UNITS
-- ============================================================
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    unit_number TEXT NOT NULL,
    floor INT,
    area_sqm DECIMAL(6,2),
    base_rent DECIMAL(12,0) NOT NULL,
    deposit_amount DECIMAL(12,0),
    max_occupants INT DEFAULT 2,
    status TEXT DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    amenities JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UNIT CO-OWNERS
-- ============================================================
CREATE TABLE unit_co_owners (
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    share_percentage DECIMAL(5,2) DEFAULT 100,
    PRIMARY KEY (unit_id, profile_id)
);

-- ============================================================
-- RENTER PROFILES
-- ============================================================
CREATE TABLE renter_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID REFERENCES profiles(id),
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    id_number TEXT,
    id_issued_date DATE,
    id_issued_place TEXT,
    id_front_url TEXT,
    id_back_url TEXT,
    phone TEXT,
    email TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    hometown TEXT,
    occupation TEXT,
    workplace TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTRACTS
-- ============================================================
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    unit_id UUID NOT NULL REFERENCES units(id),
    renter_id UUID NOT NULL REFERENCES renter_profiles(id),
    created_by UUID REFERENCES profiles(id),
    contract_number TEXT UNIQUE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(12,0) NOT NULL,
    deposit_amount DECIMAL(12,0) NOT NULL,
    deposit_paid_date DATE,
    payment_due_day INT DEFAULT 5,
    max_occupants INT DEFAULT 2,
    terms TEXT,
    pdf_url TEXT,
    scan_pdf_url TEXT,
    signed_at TIMESTAMPTZ,
    terminated_at TIMESTAMPTZ,
    termination_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTRACT CO-RENTERS
-- ============================================================
CREATE TABLE contract_co_renters (
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    id_number TEXT,
    phone TEXT,
    PRIMARY KEY (contract_id, id_number)
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_properties
    BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_contracts
    BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);
CREATE INDEX idx_properties_organization_id ON properties(organization_id);
CREATE INDEX idx_units_organization_id ON units(organization_id);
CREATE INDEX idx_units_property_id_status ON units(property_id, status);
CREATE INDEX idx_renter_profiles_organization_id ON renter_profiles(organization_id);
CREATE INDEX idx_contracts_organization_id ON contracts(organization_id);
CREATE INDEX idx_contracts_unit_id_status ON contracts(unit_id, status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_co_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE renter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_co_renters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view profiles in their organization"
    ON profiles FOR ALL
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON invitations FOR ALL
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON properties FOR ALL
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON units FOR ALL
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON unit_co_owners FOR ALL
    USING (unit_id IN (
        SELECT id FROM units WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "org_isolation" ON renter_profiles FOR ALL
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON contracts FOR ALL
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON contract_co_renters FOR ALL
    USING (contract_id IN (
        SELECT id FROM contracts WHERE organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    ));
