#!/bin/bash

# Get database configuration
source ../config/database.conf

# Run the migration
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f ../migrations/012_session_tracking.sql

echo "Migration completed successfully" 