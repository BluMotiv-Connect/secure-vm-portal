#!/bin/bash

# Complete Database Setup Script for Secure VM Portal
# This script sets up the database from scratch
# Version: 2.0.0

echo "=========================================="
echo "Secure VM Portal Database Setup"
echo "=========================================="
echo

# Database configuration
DB_NAME="secure_vm_portal"
DB_USER="vivinvarshans"  # Change this to your PostgreSQL username
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔍 Checking PostgreSQL connection..."
if ! command -v psql &> /dev/null; then
    echo "❌ Error: PostgreSQL (psql) is not installed or not in PATH"
    exit 1
fi

echo "📋 Database Name: $DB_NAME"
echo "👤 User: $DB_USER"
echo

# Ask for confirmation
read -p "⚠️  WARNING: This will recreate the database and DELETE ALL EXISTING DATA. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Setup cancelled by user"
    exit 0
fi

echo "🚀 Starting database setup..."
echo

# Step 1: Drop and recreate database
echo "📤 Dropping existing database (if exists)..."
psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null

echo "📥 Creating new database..."
psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to create database"
    exit 1
fi

# Step 2: Run the setup script
echo "🔧 Setting up database schema, tables, and functions..."
psql -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/setup_complete_database.sql"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to set up database schema"
    exit 1
fi

# Step 3: Create database user (optional)
echo "👤 Creating database user 'vmportal' (if not exists)..."
psql -U $DB_USER -d postgres -c "CREATE USER vmportal WITH PASSWORD 'vmportal123';" 2>/dev/null
psql -U $DB_USER -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO vmportal;" 2>/dev/null
psql -U $DB_USER -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vmportal;" 2>/dev/null
psql -U $DB_USER -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vmportal;" 2>/dev/null
psql -U $DB_USER -d $DB_NAME -c "GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO vmportal;" 2>/dev/null

# Step 4: Verify setup
echo "🔍 Verifying database setup..."
TABLE_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

echo "📊 Created $TABLE_COUNT tables"

# List all tables
echo "📋 Tables created:"
psql -U $DB_USER -d $DB_NAME -c "\dt" | grep -E "^ public"

echo
echo "✅ Database setup completed successfully!"
echo
echo "🔗 Connection details:"
echo "   Database: $DB_NAME"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   User: $DB_USER or vmportal"
echo "   Password: (your PostgreSQL password or 'vmportal123' for vmportal user)"
echo
echo "🚀 You can now start your application!"
echo "==========================================" 