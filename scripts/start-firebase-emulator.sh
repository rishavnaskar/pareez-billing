#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_ACCOUNT="${GOOGLE_APPLICATION_CREDENTIALS:-${ROOT}/scripts/serviceAccountKey.json}"
SERVICE_ACCOUNT_PROJECT_ID="$(node -e "try{const sa=require(process.argv[1]);console.log(sa.project_id||'');}catch(e){process.exit(0);}" "$SERVICE_ACCOUNT" 2>/dev/null || true)"
PROJECT_ID="${FIREBASE_PROJECT_ID:-${SERVICE_ACCOUNT_PROJECT_ID:-pareez-billing-local}}"
FIRESTORE_PORT="${FIRESTORE_EMULATOR_PORT:-8080}"
UI_PORT="${FIREBASE_EMULATOR_UI_PORT:-4000}"

# Pick firebase CLI (prefers global, falls back to npx)
if command -v firebase >/dev/null 2>&1; then
  FIREBASE_CMD=(firebase)
else
  FIREBASE_CMD=(npx firebase)
fi

if [ ! -f "$SERVICE_ACCOUNT" ]; then
  echo "Missing service account key at $SERVICE_ACCOUNT."
  echo "Download it from Firebase Console (Project Settings → Service Accounts) and place it there."
  exit 1
fi

# Point admin SDK to emulator
export GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT"
export FIRESTORE_EMULATOR_HOST="localhost:${FIRESTORE_PORT}"
export GOOGLE_CLOUD_PROJECT="$PROJECT_ID"
export GCLOUD_PROJECT="$PROJECT_ID"

echo "Using project: $PROJECT_ID"
echo "Firestore emulator host: $FIRESTORE_EMULATOR_HOST"

# Start emulator (runs until you stop the script)
"${FIREBASE_CMD[@]}" emulators:start \
  --only firestore \
  --project "$PROJECT_ID" \
  --config "$ROOT/firebase.json" \
  --import "$ROOT/.firebase-data" \
  --export-on-exit "$ROOT/.firebase-data" &
EMULATOR_PID=$!
trap 'kill "$EMULATOR_PID" >/dev/null 2>&1 || true' EXIT

printf 'Waiting for Firestore emulator on port %s' "$FIRESTORE_PORT"
for _ in {1..30}; do
  if nc -z localhost "$FIRESTORE_PORT" >/dev/null 2>&1; then
    echo " - ready."
    READY=1
    break
  fi
  printf '.'
  sleep 1
done

if [ -z "${READY:-}" ]; then
  echo "\nFirestore emulator did not start; see logs above." >&2
  exit 1
fi

# Seed branches into the emulator
FIRESTORE_EMULATOR_HOST="localhost:${FIRESTORE_PORT}" node "$ROOT/scripts/initialize-branches.js"

echo "\nFirestore emulator is running (PID: $EMULATOR_PID)."
echo "UI: http://localhost:${UI_PORT}/"
echo "Press Ctrl+C to stop."
wait "$EMULATOR_PID"
