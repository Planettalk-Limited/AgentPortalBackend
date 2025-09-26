#!/bin/bash

# Script to create a new migration
# Usage: ./scripts/create-migration.sh MigrationName

if [ -z "$1" ]; then
    echo "Please provide a migration name"
    echo "Usage: ./scripts/create-migration.sh MigrationName"
    exit 1
fi

npm run migration:generate -- src/migrations/$1
