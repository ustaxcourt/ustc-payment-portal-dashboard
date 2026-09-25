#!/usr/bin/env bash
# Syncs the dev Entra app's preview redirect URIs with the repo's branches.
# Only writes when DRY_RUN=false.

set -euo pipefail

: "${GITHUB_REPOSITORY:?}" "${ENTRA_APP_OBJECT_ID:?}" "${AMPLIFY_APP_ID:?}"
DRY_RUN="${DRY_RUN:-true}"
MAX_REMOVALS="${MAX_REMOVALS:-10}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_URI="https://graph.microsoft.com/v1.0/applications/${ENTRA_APP_OBJECT_ID}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

report() {
  printf '%s\n' "$*"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    printf '%s\n' "$*" >> "$GITHUB_STEP_SUMMARY"
  fi
}

gh api --paginate "repos/${GITHUB_REPOSITORY}/branches?per_page=100" \
  | jq -r '.[].name' > "$WORK_DIR/branches.txt"

az rest --method GET --uri "${APP_URI}?\$select=web" > "$WORK_DIR/app.json"

# Dry runs plan past the limit so the whole diff is visible; live runs enforce it.
if [ "$DRY_RUN" = "false" ]; then plan_limit="$MAX_REMOVALS"; else plan_limit=256; fi

jq -n \
  --rawfile branches "$WORK_DIR/branches.txt" \
  --slurpfile app "$WORK_DIR/app.json" \
  --arg appId "$AMPLIFY_APP_ID" \
  --argjson maxRemovals "$plan_limit" \
  '{
    current: ($app[0].web.redirectUris // []),
    branches: ($branches | split("\n") | map(select(length > 0))),
    amplifyAppId: $appId,
    maxRemovals: $maxRemovals
  }' > "$WORK_DIR/input.json"

if ! node "$SCRIPT_DIR/plan.ts" < "$WORK_DIR/input.json" > "$WORK_DIR/plan.json" 2> "$WORK_DIR/plan.err"; then
  report "## Entra preview redirect URIs"
  report ""
  report "❌ No changes made: $(cat "$WORK_DIR/plan.err")"
  exit 1
fi

added=$(jq '.added | length' "$WORK_DIR/plan.json")
removed=$(jq '.removed | length' "$WORK_DIR/plan.json")

report "## Entra preview redirect URIs"
report ""
report "Dry run: \`${DRY_RUN}\` · Adding ${added}, removing ${removed}, $(jq '.next | length' "$WORK_DIR/plan.json") after sync"
report ""
report "$(jq -r '
  (.added[] | "- ➕ `\(.)`"),
  (.removed[] | "- ➖ `\(.)`"),
  (.skipped[] | "- ⚠️ skipped `\(.branch)`: \(.reason)")
' "$WORK_DIR/plan.json")"

if [ "$added" -eq 0 ] && [ "$removed" -eq 0 ]; then
  report "No changes."
  exit 0
fi

if [ "$DRY_RUN" != "false" ]; then
  if [ "$removed" -gt "$MAX_REMOVALS" ]; then
    report "⚠️ A live run would refuse this: ${removed} removals is over the limit of ${MAX_REMOVALS}."
  fi
  report "Dry run: Entra was not changed."
  exit 0
fi

jq '{ web: { redirectUris: .next } }' "$WORK_DIR/plan.json" > "$WORK_DIR/body.json"
az rest --method PATCH --uri "$APP_URI" \
  --headers "Content-Type=application/json" \
  --body "@$WORK_DIR/body.json"

# Graph can serve the old list briefly after a write, so poll before failing.
for attempt in 1 2 3 4 5; do
  az rest --method GET --uri "${APP_URI}?\$select=web" > "$WORK_DIR/after.json"
  if jq -e --slurpfile plan "$WORK_DIR/plan.json" \
    '(.web.redirectUris | sort) == ($plan[0].next | sort)' \
    "$WORK_DIR/after.json" > /dev/null; then
    report "Entra updated and verified."
    exit 0
  fi
  echo "Read-back does not match yet (attempt ${attempt}/5)" >&2
  sleep 6
done

report "Entra does not match the plan after the update. Check the app's redirect URIs."
exit 1
