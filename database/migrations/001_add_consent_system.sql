-- ============================================================================
-- MIGRATION: Add User Consent Agreement System
-- ============================================================================
-- Migration ID: 001
-- Description: Adds consent management tables and functions to existing database
-- Version: 1.0.0
-- Created: 2025-01-27
-- Rollback: 001_rollback_consent_system.sql
-- ============================================================================

BEGIN;

-- Check if migration has already been applied
DO $migration$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agreement_versions') THEN
        RAISE NOTICE 'Migration 001 already applied, skipping...';
        RETURN;
    END IF;
END
$migration$;

-- ============================================================================
-- CREATE CONSENT MANAGEMENT TABLES
-- ============================================================================

-- Agreement versions table
CREATE TABLE agreement_versions (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL UNIQUE,
    content JSONB NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_version_format CHECK (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
    CONSTRAINT valid_content_structure CHECK (jsonb_typeof(content) = 'object'),
    CONSTRAINT future_effective_date CHECK (effective_date >= created_at)
);

-- User consents table
CREATE TABLE user_consents (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agreement_version VARCHAR(50) NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    withdrawal_reason TEXT,
    withdrawal_ip_address INET,
    withdrawal_user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('active', 'withdrawn', 'expired')),
    CONSTRAINT valid_language CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    CONSTRAINT withdrawal_consistency CHECK (
        (status = 'withdrawn' AND withdrawal_date IS NOT NULL) OR 
        (status != 'withdrawn' AND withdrawal_date IS NULL)
    ),
    CONSTRAINT withdrawal_after_consent CHECK (
        withdrawal_date IS NULL OR withdrawal_date >= consent_date
    ),
    
    FOREIGN KEY (agreement_version) REFERENCES agreement_versions(version)
);

-- Consent audit log table
CREATE TABLE consent_audit_log (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    agreement_version VARCHAR(50),
    language VARCHAR(10),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(255),
    details JSONB DEFAULT '{}',
    
    CONSTRAINT valid_action CHECK (action IN (
        'consent_viewed', 'consent_given', 'consent_withdrawn', 
        'consent_expired', 'agreement_updated', 'consent_checked'
    )),
    CONSTRAINT valid_audit_details CHECK (jsonb_typeof(details) = 'object')
);

-- Consent notifications table
CREATE TABLE consent_notifications (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    agreement_version VARCHAR(50),
    sent_to VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent',
    message TEXT,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT valid_notification_type CHECK (notification_type IN (
        'consent_withdrawn', 'consent_expired', 'new_user_consent', 
        'compliance_alert', 'agreement_updated'
    )),
    CONSTRAINT valid_notification_status CHECK (status IN ('sent', 'delivered', 'failed'))
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Agreement versions indexes
CREATE INDEX idx_agreement_versions_current ON agreement_versions(is_current) WHERE is_current = true;
CREATE INDEX idx_agreement_versions_effective ON agreement_versions(effective_date);
CREATE INDEX idx_agreement_versions_version ON agreement_versions(version);

-- User consents indexes
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_status ON user_consents(status);
CREATE INDEX idx_user_consents_version ON user_consents(agreement_version);
CREATE INDEX idx_user_consents_date ON user_consents(consent_date);
CREATE INDEX idx_user_consents_language ON user_consents(language);
CREATE INDEX idx_user_consents_active_user ON user_consents(user_id, status) WHERE status = 'active';

-- Consent audit log indexes
CREATE INDEX idx_consent_audit_user ON consent_audit_log(user_id);
CREATE INDEX idx_consent_audit_email ON consent_audit_log(user_email);
CREATE INDEX idx_consent_audit_action ON consent_audit_log(action);
CREATE INDEX idx_consent_audit_timestamp ON consent_audit_log(timestamp);
CREATE INDEX idx_consent_audit_version ON consent_audit_log(agreement_version);

-- Consent notifications indexes
CREATE INDEX idx_consent_notifications_user ON consent_notifications(user_id);
CREATE INDEX idx_consent_notifications_type ON consent_notifications(notification_type);
CREATE INDEX idx_consent_notifications_sent_at ON consent_notifications(sent_at);
CREATE INDEX idx_consent_notifications_status ON consent_notifications(status);

-- ============================================================================
-- CREATE FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp for consent tables
CREATE OR REPLACE FUNCTION update_consent_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$func$ LANGUAGE 'plpgsql';

-- Function to ensure only one current agreement version
CREATE OR REPLACE FUNCTION ensure_single_current_version()
RETURNS TRIGGER AS $func$
BEGIN
    IF NEW.is_current = true THEN
        UPDATE agreement_versions 
        SET is_current = false, updated_at = NOW()
        WHERE id != NEW.id AND is_current = true;
    END IF;
    RETURN NEW;
END;
$func$ LANGUAGE 'plpgsql';

-- Function to create audit log entry for consent actions
CREATE OR REPLACE FUNCTION log_consent_action()
RETURNS TRIGGER AS $func$
DECLARE
    action_type VARCHAR(50);
    user_email_val VARCHAR(255);
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_type := 'consent_given';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status AND NEW.status = 'withdrawn' THEN
            action_type := 'consent_withdrawn';
        ELSIF OLD.status != NEW.status AND NEW.status = 'expired' THEN
            action_type := 'consent_expired';
        ELSE
            action_type := 'consent_updated';
        END IF;
    END IF;
    
    SELECT email INTO user_email_val FROM users WHERE id = COALESCE(NEW.user_id, OLD.user_id);
    
    INSERT INTO consent_audit_log (
        user_id, user_email, action, agreement_version, language,
        ip_address, user_agent, details
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        user_email_val,
        action_type,
        COALESCE(NEW.agreement_version, OLD.agreement_version),
        COALESCE(NEW.language, OLD.language),
        COALESCE(NEW.ip_address, NEW.withdrawal_ip_address, OLD.ip_address),
        COALESCE(NEW.user_agent, NEW.withdrawal_user_agent, OLD.user_agent),
        jsonb_build_object(
            'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
            'new_status', CASE WHEN TG_OP != 'DELETE' THEN NEW.status ELSE NULL END,
            'withdrawal_reason', NEW.withdrawal_reason
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$func$ LANGUAGE 'plpgsql';

-- Function to check consent validity
CREATE OR REPLACE FUNCTION check_user_consent_validity(p_user_id INTEGER)
RETURNS TABLE (
    has_valid_consent BOOLEAN,
    consent_date TIMESTAMP WITH TIME ZONE,
    agreement_version VARCHAR(50),
    language VARCHAR(10),
    requires_new_consent BOOLEAN,
    current_version VARCHAR(50)
) AS $func$
DECLARE
    current_version_val VARCHAR(50);
    user_consent_record RECORD;
BEGIN
    SELECT version INTO current_version_val 
    FROM agreement_versions 
    WHERE is_current = true;
    
    SELECT * INTO user_consent_record
    FROM user_consents 
    WHERE user_id = p_user_id 
      AND status = 'active'
    ORDER BY consent_date DESC 
    LIMIT 1;
    
    RETURN QUERY SELECT
        CASE 
            WHEN user_consent_record.id IS NOT NULL 
                 AND user_consent_record.agreement_version = current_version_val 
            THEN true 
            ELSE false 
        END as has_valid_consent,
        user_consent_record.consent_date,
        user_consent_record.agreement_version,
        user_consent_record.language,
        CASE 
            WHEN user_consent_record.id IS NULL 
                 OR user_consent_record.agreement_version != current_version_val 
            THEN true 
            ELSE false 
        END as requires_new_consent,
        current_version_val as current_version;
END;
$func$ LANGUAGE 'plpgsql';

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

CREATE TRIGGER update_agreement_versions_updated_at 
    BEFORE UPDATE ON agreement_versions
    FOR EACH ROW EXECUTE FUNCTION update_consent_updated_at_column();

CREATE TRIGGER update_user_consents_updated_at 
    BEFORE UPDATE ON user_consents
    FOR EACH ROW EXECUTE FUNCTION update_consent_updated_at_column();

CREATE TRIGGER ensure_single_current_version_trigger
    BEFORE INSERT OR UPDATE ON agreement_versions
    FOR EACH ROW EXECUTE FUNCTION ensure_single_current_version();

CREATE TRIGGER log_consent_action_trigger
    AFTER INSERT OR UPDATE ON user_consents
    FOR EACH ROW EXECUTE FUNCTION log_consent_action();

-- ============================================================================
-- INSERT INITIAL DATA
-- ============================================================================

INSERT INTO agreement_versions (
    version, 
    content, 
    effective_date, 
    is_current,
    created_by
) VALUES (
    '1.0.0',
    '{
        "title": "User Consent Agreement for Portal Access",
        "sections": [
            {
                "id": "purpose",
                "title": "Purpose of This Agreement",
                "content": "This agreement outlines the terms of access and use of the portal, including responsibilities related to confidentiality, resource usage, data protection, and project conduct. It ensures compliance with applicable data protection laws including the General Data Protection Regulation (GDPR) and India''s Digital Personal Data Protection Act (DPDP Act, 2023)."
            },
            {
                "id": "voluntary_consent",
                "title": "Voluntary and Informed Consent",
                "content": "Your consent to this agreement is voluntary, and you may choose not to proceed without facing undue consequences. You are encouraged to read this agreement carefully and seek clarification before accepting. You may withdraw your consent at any time by contacting the support team, subject to organizational policies."
            },
            {
                "id": "consent_by_login",
                "title": "Consent by Login",
                "content": "By logging into this portal, you confirm that: You have read and understood the terms of this agreement. You voluntarily agree to comply with all terms outlined herein. If you do not agree, please refrain from logging in and contact support for assistance. A link to the full agreement is provided on the login page for your review."
            },
            {
                "id": "data_collection",
                "title": "Data Collection and Use",
                "content": "We collect personal data such as your name, email address, login timestamps, and usage activity for the purpose of access control, compliance monitoring, and performance tracking. Your data will be stored securely and used only for the purposes stated. You have the right to access, correct, or request deletion of your personal data."
            },
            {
                "id": "confidentiality",
                "title": "Confidentiality and Credential Use",
                "content": "You agree to maintain the confidentiality of your login credentials. You shall not share your username, password, or access rights with any other individual. All login and usage activities are monitored and recorded for security and compliance purposes."
            },
            {
                "id": "learning_resources",
                "title": "Use of Learning Resources",
                "content": "You acknowledge that the learning resources provided are paid and proprietary. You shall not copy, distribute, or share these resources with individuals outside the portal. These resources are intended solely to support your assigned deliverables."
            },
            {
                "id": "project_reporting",
                "title": "Project Status and Reporting",
                "content": "You agree to keep your project status updated regularly and accurately. You shall conduct all project-related activities in good faith. Accurate reporting is essential for resource planning and stakeholder communication."
            },
            {
                "id": "resource_use",
                "title": "Responsible Use of Resources",
                "content": "You shall not use portal resources for personal or non-work-related purposes. Virtual Machines (VMs) must be turned off when not in use to allow access for others. Work products must not be copied or transferred to personal storage (e.g., including OneDrive with your BluMotiv account, personal email accounts)."
            },
            {
                "id": "data_management",
                "title": "Data Management and Repository Use",
                "content": "All work products must be saved in the designated repository. You are responsible for ensuring that your work is up-to-date and properly maintained. You shall not delete or destroy any work products without prior written approval from the project lead or designated authority."
            },
            {
                "id": "intellectual_property",
                "title": "Intellectual Property and Ownership",
                "content": "All materials, data, and outputs created using portal resources remain the property of the organization. You shall not claim ownership or use these materials outside the scope of your assigned work."
            },
            {
                "id": "security",
                "title": "Security and Data Protection",
                "content": "You agree to follow all organizational policies related to data protection and cybersecurity. You shall immediately report any suspected security breaches or unauthorized access."
            },
            {
                "id": "monitoring",
                "title": "Monitoring and Compliance",
                "content": "You consent to monitoring of your activity on the portal to ensure compliance with these terms. Any misuse or breach of these terms may result in disciplinary action, including revocation of access."
            },
            {
                "id": "accessibility",
                "title": "Accessibility and Support",
                "content": "This agreement is available in multiple languages upon request to ensure understanding. For any questions or concerns, you may contact the support team at support@blumotiv.com."
            }
        ],
        "acknowledgment": {
            "title": "Acknowledgment",
            "content": "By checking the box below or digitally signing, you confirm: You have read and understood the terms of this agreement. You are providing your consent freely and voluntarily. You agree to comply with all terms outlined above.",
            "checkbox_text": "I agree to the terms and conditions of the User Consent Agreement."
        }
    }',
    NOW(),
    true,
    (SELECT id FROM users WHERE email = 'vivin@blumotiv.com' LIMIT 1)
);

-- Record migration completion
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_id VARCHAR(50) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

INSERT INTO schema_migrations (migration_id, description) 
VALUES ('001', 'Add User Consent Agreement System');

COMMIT;

SELECT 'Migration 001: User Consent Agreement System applied successfully!' as message;