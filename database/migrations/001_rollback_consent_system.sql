-- ============================================================================
-- ROLLBACK MIGRATION: Remove User Consent Agreement System
-- ============================================================================
-- Migration ID: 001_rollback
-- Description: Removes consent management tables and functions
-- Version: 1.0.0
-- Created: 2025-01-27
-- Rollback for: 001_add_consent_system.sql
-- ============================================================================

BEGIN;

-- Check if migration needs to be rolled back
DO $rollback$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agreement_versions') THEN
        RAISE NOTICE 'Migration 001 not applied, nothing to rollback...';
        RETURN;
    END IF;
END
$rollback$;

-- ============================================================================
-- DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_agreement_versions_updated_at ON agreement_versions;
DROP TRIGGER IF EXISTS update_user_consents_updated_at ON user_consents;
DROP TRIGGER IF EXISTS ensure_single_current_version_trigger ON agreement_versions;
DROP TRIGGER IF EXISTS log_consent_action_trigger ON user_consents;

-- ============================================================================
-- DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS update_consent_updated_at_column();
DROP FUNCTION IF EXISTS ensure_single_current_version();
DROP FUNCTION IF EXISTS log_consent_action();
DROP FUNCTION IF EXISTS check_user_consent_validity(INTEGER);

-- ============================================================================
-- DROP TABLES (in reverse dependency order)
-- ============================================================================

DROP TABLE IF EXISTS consent_notifications CASCADE;
DROP TABLE IF EXISTS consent_audit_log CASCADE;
DROP TABLE IF EXISTS user_consents CASCADE;
DROP TABLE IF EXISTS agreement_versions CASCADE;

-- Remove migration record
DELETE FROM schema_migrations WHERE migration_id = '001';

COMMIT;

SELECT 'Migration 001 rollback completed successfully!' as message;