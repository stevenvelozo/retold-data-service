#!/bin/bash
# ==============================================================================
# Data Cloner Integration Tests — All Storage Engines
#
# Starts Docker containers for MySQL, PostgreSQL, and MSSQL, creates the
# required test databases, then runs the full integration test suite against
# every engine (SQLite runs without Docker).
#
# Usage:
#   ./test/run-integration-tests.sh              # All engines
#   ./test/run-integration-tests.sh sqlite        # SQLite only (no Docker)
#   ./test/run-integration-tests.sh mysql         # MySQL only
#   ./test/run-integration-tests.sh mysql,mssql   # Specific engines
#
# Prerequisites:
#   - Docker (and docker compose) installed and running
#   - Node.js and npm
#   - npm install already run in retold-data-service
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
HARNESS_DIR="$(cd "$PROJECT_DIR/../retold-harness" 2>/dev/null && pwd)" || true

# ---- Parse arguments ----
ENGINES="${1:-sqlite,mysql,postgresql,mssql}"

# ---- Credentials (match retold-harness/docker-compose.yml) ----
MYSQL_ROOT_PASSWORD="1234567890"
MYSQL_TEST_DB="retold_cloner_test"

POSTGRESQL_PASSWORD="retold1234567890"
POSTGRESQL_TEST_DB="retold_cloner_test"

MSSQL_SA_PASSWORD="Retold1234567890!"
MSSQL_TEST_DB="retold_cloner_test"

# ---- Colours ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No colour

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] WARNING:${NC} $*"; }
err()  { echo -e "${RED}[$(date +%H:%M:%S)] ERROR:${NC} $*"; }
ok()   { echo -e "${GREEN}[$(date +%H:%M:%S)] OK:${NC} $*"; }

needs_docker()
{
	[[ "$ENGINES" == *mysql* ]] || [[ "$ENGINES" == *postgresql* ]] || [[ "$ENGINES" == *mssql* ]]
}

# ---- Check prerequisites ----
if needs_docker; then
	if ! command -v docker &>/dev/null; then
		err "Docker is not installed. Install Docker to test non-SQLite engines."
		err "Or run:  $0 sqlite"
		exit 1
	fi
	if ! docker info &>/dev/null; then
		err "Docker daemon is not running. Start Docker first."
		exit 1
	fi
fi

if [ -z "$HARNESS_DIR" ] || [ ! -d "$HARNESS_DIR" ]; then
	err "retold-harness not found at $PROJECT_DIR/../retold-harness"
	err "Make sure retold-harness is cloned as a sibling of retold-data-service."
	exit 1
fi

# ---- Start Docker containers ----
start_containers()
{
	log "Starting Docker containers..."
	cd "$HARNESS_DIR"

	local SERVICES=""
	[[ "$ENGINES" == *mysql* ]]      && SERVICES="$SERVICES mysql"
	[[ "$ENGINES" == *postgresql* ]] && SERVICES="$SERVICES postgresql"
	[[ "$ENGINES" == *mssql* ]]      && SERVICES="$SERVICES mssql"

	if [ -n "$SERVICES" ]; then
		docker compose up -d $SERVICES
		log "Waiting for containers to become healthy..."
	fi

	cd "$PROJECT_DIR"
}

# Wait for a container to be healthy (or timeout after N seconds)
wait_healthy()
{
	local CONTAINER="$1"
	local TIMEOUT="${2:-120}"
	local ELAPSED=0

	while [ $ELAPSED -lt $TIMEOUT ]; do
		local STATUS
		STATUS="$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "missing")"
		if [ "$STATUS" = "healthy" ]; then
			return 0
		fi
		sleep 2
		ELAPSED=$((ELAPSED + 2))
	done

	err "$CONTAINER did not become healthy within ${TIMEOUT}s (status: $STATUS)"
	return 1
}

# ---- Create test databases ----
create_mysql_db()
{
	log "Waiting for MySQL to be healthy..."
	wait_healthy "retold-harness-mysql" 120

	log "Creating MySQL database '${MYSQL_TEST_DB}'..."
	docker exec retold-harness-mysql mysql \
		-uroot "-p${MYSQL_ROOT_PASSWORD}" \
		-e "CREATE DATABASE IF NOT EXISTS \`${MYSQL_TEST_DB}\`;" 2>/dev/null
	ok "MySQL database '${MYSQL_TEST_DB}' ready"
}

create_postgresql_db()
{
	log "Waiting for PostgreSQL to be healthy..."
	wait_healthy "retold-harness-postgresql" 120

	log "Creating PostgreSQL database '${POSTGRESQL_TEST_DB}'..."
	# createdb returns 0 even if DB exists when using IF NOT EXISTS via psql
	docker exec retold-harness-postgresql psql \
		-U postgres \
		-tc "SELECT 1 FROM pg_database WHERE datname = '${POSTGRESQL_TEST_DB}'" \
		| grep -q 1 \
		|| docker exec retold-harness-postgresql psql \
			-U postgres \
			-c "CREATE DATABASE ${POSTGRESQL_TEST_DB};"
	ok "PostgreSQL database '${POSTGRESQL_TEST_DB}' ready"
}

create_mssql_db()
{
	log "Waiting for MSSQL to be healthy..."
	wait_healthy "retold-harness-mssql" 120

	log "Creating MSSQL database '${MSSQL_TEST_DB}'..."
	docker exec retold-harness-mssql /opt/mssql-tools18/bin/sqlcmd \
		-S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C \
		-Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${MSSQL_TEST_DB}') CREATE DATABASE [${MSSQL_TEST_DB}];" 2>/dev/null
	ok "MSSQL database '${MSSQL_TEST_DB}' ready"
}

# ---- Main ----

log "Engines requested: ${ENGINES}"
log "Project dir: ${PROJECT_DIR}"
log "Harness dir: ${HARNESS_DIR}"
echo ""

# Start Docker containers if needed
if needs_docker; then
	start_containers

	# Create test databases in parallel where possible
	[[ "$ENGINES" == *mysql* ]]      && create_mysql_db
	[[ "$ENGINES" == *postgresql* ]] && create_postgresql_db
	[[ "$ENGINES" == *mssql* ]]      && create_mssql_db

	echo ""
fi

# ---- Set environment variables ----
if [[ "$ENGINES" == *mysql* ]]; then
	export MYSQL_HOST="localhost"
	export MYSQL_PORT="3306"
	export MYSQL_USER="root"
	export MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD}"
	export MYSQL_DATABASE="${MYSQL_TEST_DB}"
	ok "MySQL env configured (localhost:3306, db=${MYSQL_TEST_DB})"
fi

if [[ "$ENGINES" == *postgresql* ]]; then
	export POSTGRESQL_HOST="localhost"
	export POSTGRESQL_PORT="5432"
	export POSTGRESQL_USER="postgres"
	export POSTGRESQL_PASSWORD="${POSTGRESQL_PASSWORD}"
	export POSTGRESQL_DATABASE="${POSTGRESQL_TEST_DB}"
	ok "PostgreSQL env configured (localhost:5432, db=${POSTGRESQL_TEST_DB})"
fi

if [[ "$ENGINES" == *mssql* ]]; then
	export MSSQL_HOST="localhost"
	export MSSQL_PORT="1433"
	export MSSQL_USER="sa"
	export MSSQL_PASSWORD="${MSSQL_SA_PASSWORD}"
	export MSSQL_DATABASE="${MSSQL_TEST_DB}"
	ok "MSSQL env configured (localhost:1433, db=${MSSQL_TEST_DB})"
fi

echo ""
log "Running integration tests..."
echo ""

# ---- Run tests ----
cd "$PROJECT_DIR"
node test/run-integration-tests.js --skip-puppeteer --engines="${ENGINES}"
TEST_EXIT=$?

echo ""
if [ $TEST_EXIT -eq 0 ]; then
	ok "All integration tests passed!"
else
	err "Some tests failed (exit code: ${TEST_EXIT})"
fi

exit $TEST_EXIT
