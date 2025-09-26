# Database Setup Guide

## Quick Setup (Recommended)

### For New Developers

1. **Install PostgreSQL** (if not already installed)
   - Download from: https://www.postgresql.org/download/
   - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres`

2. **One-Command Setup**
   ```bash
   npm run db:setup
   ```
   This will create the database and run all migrations.

3. **Alternative: Step-by-Step Setup**
   ```bash
   # Create database
   npm run db:create
   
   # Generate initial migration (if needed)
   npm run migration:generate src/migrations/InitialSetup
   
   # Run migrations
   npm run migration:run
   ```

## Available Database Commands

### Database Management
- `npm run db:create` - Create the agent_portal database
- `npm run db:drop` - Drop the agent_portal database  
- `npm run db:reset` - Drop and recreate the database (⚠️ Data loss!)
- `npm run db:setup` - Create database and run migrations

### Migration Management
- `npm run migration:generate <name>` - Generate new migration from entity changes
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert last migration
- `npm run migration:create <name>` - Create empty migration file

## Manual Setup

If you prefer to set up manually or the scripts don't work:

### 1. Create Database Manually

**Using psql:**
```bash
psql -U postgres -h localhost
CREATE DATABASE agent_portal;
\q
```

**Using pgAdmin:**
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click "Databases" → "Create" → "Database"
4. Name: `agent_portal`

### 2. Environment Configuration

Ensure your `.env` file has correct database settings:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_NAME=agent_portal
```

### 3. Run Migrations

```bash
npm run migration:run
```

## Troubleshooting

### Common Issues

**"database does not exist"**
- Run `npm run db:create` first
- Or create manually using psql/pgAdmin

**"password authentication failed"**
- Check your PostgreSQL password in `.env`
- Ensure PostgreSQL is running

**"connection refused"**
- Check if PostgreSQL service is running
- Verify host and port in `.env`

**"permission denied to create database"**
- Ensure your PostgreSQL user has CREATE DATABASE permissions
- Or use a superuser account

### PostgreSQL Service Commands

**Windows:**
```bash
# Start service
net start postgresql-x64-14

# Stop service  
net stop postgresql-x64-14
```

**macOS (Homebrew):**
```bash
# Start service
brew services start postgresql

# Stop service
brew services stop postgresql
```

**Linux (systemd):**
```bash
# Start service
sudo systemctl start postgresql

# Stop service
sudo systemctl stop postgresql
```

## Docker Alternative

If you prefer using Docker for development:

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: agent_portal
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Then run:
```bash
docker-compose up -d postgres
npm run migration:run
```

## Entity Changes & Migrations

When you modify entities:

1. **Generate Migration:**
   ```bash
   npm run migration:generate src/migrations/DescriptiveNameHere
   ```

2. **Review Generated Migration:**
   - Check the generated file in `src/migrations/`
   - Ensure it matches your intended changes

3. **Run Migration:**
   ```bash
   npm run migration:run
   ```

## Production Considerations

- Never use `synchronize: true` in production
- Always use migrations for schema changes
- Backup database before running migrations
- Test migrations on staging environment first
- Use environment-specific configuration files
