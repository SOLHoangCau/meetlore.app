#!/usr/bin/env bash
# Chạy toàn bộ migration, seed và kiểm thử quyền trên một PostgreSQL 16 tạm. Cần chạy bằng root hoặc user có initdb.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
DIR=$(mktemp -d /tmp/trigiao-pg.XXXX); chown postgres "$DIR"; chmod 755 "$DIR"
run() { su postgres -s /bin/bash -c "$1"; }
cleanup() { run "$BIN/pg_ctl -D $DIR/data -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
run "$BIN/initdb -D $DIR/data -U postgres -A trust >/dev/null"
run "$BIN/pg_ctl -D $DIR/data -o '-p 54329 -k $DIR -c listen_addresses=' -w start >/dev/null"
P="psql -h $DIR -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
$P -f "$ROOT/supabase/tests/bootstrap.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do $P -f "$f"; done
$P -f "$ROOT/supabase/seed.sql"
$P -v vectors="$(cat "$ROOT/supabase/tests/points-vectors.json" | tr -d '\n')" -f "$ROOT/supabase/tests/tests.sql"
