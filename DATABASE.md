# InsightDI Database Architecture & Operations Guide

InsightDI uses **PostgreSQL** as its single authoritative production and development database. Silent fallback to SQLite has been completely disabled to enforce data integrity, enterprise consistency, and single source-of-truth calculations across the backend and frontend.

---

## 1. Quick Startup & Shutdown

### Start PostgreSQL
To start the containerized PostgreSQL service:
```bash
docker compose up -d
```
Verify the container is healthy:
```bash
docker compose ps
```
The container `insightdi-postgres` will show `Up (healthy)` listening on `0.0.0.0:5432->5432`.

### Stop PostgreSQL
To stop the database while **preserving all data**:
```bash
docker compose down
```
> [!NOTE]
> `docker compose down` retains the named volume `insightdi_postgres_data`. All records, schemas, and sequences remain intact upon subsequent startup.

### Restart PostgreSQL
```bash
docker compose restart postgres
```

### View PostgreSQL Container Logs
```bash
docker compose logs -f postgres
```

---

## 2. Configuration & Environment Variables

InsightDI loads database credentials from environment variables. No secrets are hardcoded in source files.

### Root `.env` and `backend/.env`
```dotenv
# PostgreSQL Database Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=insightdi
POSTGRES_PORT=5432
POSTGRES_HOST=localhost

# Full SQLAlchemy Database URI
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/insightdi

# Single Database Enforcement
USE_SQLITE_FALLBACK=False
```

### Authoritative Database Enforcement
- [`backend/app/config.py`](file:///c:/Users/LOQ/OneDrive/Desktop/Insight-DI/backend/app/config.py):
  `USE_SQLITE_FALLBACK` is strictly `False`.
- [`backend/app/db/session.py`](file:///c:/Users/LOQ/OneDrive/Desktop/Insight-DI/backend/app/db/session.py):
  If PostgreSQL is unavailable at connection initialization, the backend raises an explicit `RuntimeError` rather than silently downgrading to SQLite:
  ```
  RuntimeError: FATAL: Unable to establish connection to PostgreSQL at postgresql://postgres:postgres@localhost:5432/insightdi.
  Ensure Docker is running and execute:
      docker compose up -d
  ```

---

## 3. Data Migration & Verification

InsightDI provides an automated migration pipeline that transfers all tables and records from SQLite to PostgreSQL with 100% data fidelity.

### Running Migration
```bash
cd backend
.venv\Scripts\python.exe scripts/migrate_sqlite_to_postgres.py
```

### Migration Pipeline Safeguards:
1. **Safety Backup**: Creates an untouched timestamped copy of `insightdi.db.backup` before any operations.
2. **DDL Introspection**: Auto-creates all tables via SQLAlchemy metadata models.
3. **Foreign Key Integrity**: Disables session replication constraints during bulk insertion and re-enables them immediately after.
4. **Data Type Handling**: Normalizes booleans, integers, floats, timestamps, JSON, and text fields.
5. **Sequence Synchronization**: Automatically resets all PostgreSQL sequences (`setval`) to `GREATEST(MAX(id), 1)` to prevent duplicate key collisions during future API uploads.
6. **SQL Compatibility Helpers**: Establishes dialect compatibility helper functions (e.g. `round(double precision, integer)`).
7. **Automated Audit**: Compares row counts between SQLite source and PostgreSQL destination with a strict equality check.

### Migrated Dataset Statistics (Verified):
| Table | Migrated Rows | Status |
| :--- | :--- | :--- |
| `users` | 1 | MATCH |
| `products` | 500 | MATCH |
| `customers` | 5,003 | MATCH |
| `orders` | 100,000 | MATCH |
| `order_items` | 159,770 | MATCH |
| `inventory` | 183,000 | MATCH |
| `marketing` | 1,830 | MATCH |
| `competitors` | 124,500 | MATCH |
| `promotions` | 9 | MATCH |
| `upload_metadata` | 1 | MATCH |
| `schema_mappings` | 6 | MATCH |
| `kpi_cache` | 0 | MATCH |
| `forecast_results` | 0 | MATCH |
| `rca_results` | 0 | MATCH |
| `recommendations` | 0 | MATCH |
| `simulation_history` | 0 | MATCH |
| **TOTAL** | **574,620** | **100% MATCH** |

---

## 4. Backup & Disaster Recovery

### Create a PostgreSQL Dump
```bash
docker exec -t insightdi-postgres pg_dump -U postgres -d insightdi -F c -b -v -f /tmp/insightdi_backup.dump
docker cp insightdi-postgres:/tmp/insightdi_backup.dump ./insightdi_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump
```

### Restore from PostgreSQL Dump
```bash
docker cp ./insightdi_backup.dump insightdi-postgres:/tmp/insightdi_backup.dump
docker exec -t insightdi-postgres pg_restore -U postgres -d insightdi -c -v /tmp/insightdi_backup.dump
```

### SQLite Legacy Backup
The original SQLite database is preserved at:
- `backend/insightdi.db.backup`
- `insightdi.db.backup`

---

## 5. KPI & Calculation Verification

All business KPIs calculated in [`backend/app/services/analytics_service.py`](file:///c:/Users/LOQ/OneDrive/Desktop/Insight-DI/backend/app/services/analytics_service.py) run directly against PostgreSQL and match raw SQL audits with 100% precision:

- **Active Products**: Distinct products with at least one order where `order_status NOT IN ('Cancelled', 'Returned')`.
- **Gross Margin**: Revenue-weighted gross margin: `(SUM(revenue) - SUM(cogs)) / SUM(revenue) * 100`.
- **Top 5 Revenue Share**: `(Top 5 Product Revenue / Total Active Product Revenue) * 100`.
- **Declining Products**: Products whose current period revenue is strictly less than their prior period revenue.

Verification suite:
```bash
cd backend
.venv\Scripts\python.exe tests/verify_products_audit.py
```

---

## 6. Troubleshooting

### 1. `RuntimeError: FATAL: Unable to establish connection to PostgreSQL`
**Cause**: The PostgreSQL Docker container is not running.
**Fix**: Run `docker compose up -d` and check status with `docker compose ps`.

### 2. `duplicate key value violates unique constraint` on upload
**Cause**: Sequence out of sync with migrated IDs.
**Fix**: Run `.venv\Scripts\python.exe scripts/reset_postgres_sequences.py`.

### 3. Port 5432 already allocated
**Cause**: Local PostgreSQL instance running natively on host machine.
**Fix**: Stop host PostgreSQL service (`net stop postgresql-x64-16`) or set `POSTGRES_PORT=5433` in `.env` and `docker-compose.yml`.
