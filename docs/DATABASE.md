# Database Setup Guide

This application uses PostgreSQL for data persistence. Follow this guide to set up your database.

## Prerequisites

- PostgreSQL 15 or higher installed
- Node.js 18+ installed
- Access to a PostgreSQL database

## Database Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Edit `.env.local` with your database credentials:**
   ```env
   # PostgreSQL Database Connection
   DATABASE_URL=postgresql://username:password@localhost:5432/arch_chat_db
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=arch_chat_db
   PGUSER=your_db_user
   PGPASSWORD=your_db_password
   ```

3. **Create the database:**
   ```bash
   createdb arch_chat_db
   ```

4. **Initialize the database schema:**
   ```bash
   npm run db:init
   ```

## Database Schema

The database includes the following tables:

### Core Tables
- **projects** - Main project information
- **sites** - Site location and details
- **tanks** - Tank specifications
- **regulations** - Legal classifications and codes
- **criteria** - Design criteria and safety factors
- **soil_layers** - Soil profile data
- **soil_profiles** - Groundwater levels
- **pile_catalog** - Available pile types

### Calculation Tables
- **calc_runs** - Calculation execution tracking
- **calc_results** - Calculation output data
- **llm_results** - AI-generated explanations

### System Tables
- **chat_sessions** - UI state persistence
- **audit_logs** - Change tracking

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Calculation Runs
- `POST /api/calc-runs` - Create calculation run
- `GET /api/calc-runs` - List calculation runs
- `GET /api/calc-runs/[runId]` - Get run status
- `PUT /api/calc-runs/[runId]` - Update run (for calculation service)

### Sessions
- `GET /api/sessions` - List chat sessions
- `POST /api/sessions` - Save/update session

## Data Flow

1. **User Input** → Phase forms collect data
2. **Save Project** → POST to `/api/projects` creates database records
3. **Run Calculation** → POST to `/api/calc-runs` queues calculation
4. **Calculation Service** → Updates run status via PUT
5. **View Results** → GET from `/api/calc-runs/[runId]`

## Security Considerations

- Use parameterized queries to prevent SQL injection
- Implement proper authentication before production use
- Consider Row Level Security (RLS) for multi-tenant setup
- Enable SSL for production database connections

## Backup and Maintenance

Regular backups are recommended:
```bash
pg_dump arch_chat_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

To restore:
```bash
psql arch_chat_db < backup_file.sql
```

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env.local`
- Ensure database exists: `psql -l`

### Schema Issues
- Drop and recreate schema: `npm run db:init`
- Check migration logs for errors

### Performance
- Create indexes are already included in schema
- Monitor with `EXPLAIN ANALYZE` for slow queries
- Consider connection pooling settings in production