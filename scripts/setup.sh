#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# fgc-stream setup automation
#
# Automates everything that's genuinely scriptable via each platform's
# official CLI/API once you already have credentials for it. Does NOT
# and cannot automate: creating the accounts themselves, entering payment/
# identity info, or clicking through a dashboard's first-time application
# setup wizard (Clerk, Stripe Product creation could go either way — see
# below) — those gates exist specifically to stop automated signups, by
# every platform's own design, and no script legitimately bypasses them.
#
# Run this from Claude Code (or any terminal) after filling in
# scripts/.setup.env — see scripts/.setup.env.example for the full list
# and where to get each value. Each section below prints what it's about
# to do before doing it, and tells you exactly what to do by hand if a
# required tool/token is missing, rather than failing silently partway.
# ============================================================================

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -f scripts/.setup.env ]; then
  # shellcheck disable=SC1091
  source scripts/.setup.env
else
  echo "Missing scripts/.setup.env — copy scripts/.setup.env.example and fill it in first."
  exit 1
fi

section() { echo; echo "-- $1 --------------------------------------------"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required tool: $1 ($2)"; exit 1; }; }
manual() { echo "  [MANUAL STEP -- can't be scripted] $1"; }

# ----------------------------------------------------------------------------
section "0. Preflight"
# ----------------------------------------------------------------------------
need git "https://git-scm.com"
need gh "https://cli.github.com -- run 'gh auth login' after installing"
need npx "comes with Node.js 20+"
echo "Preflight OK."

# ----------------------------------------------------------------------------
section "1. GitHub repo"
# ----------------------------------------------------------------------------
if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote 'origin' already set -- skipping repo creation."
else
  gh repo create "${GITHUB_REPO_NAME:?set in .setup.env}" --private --source=. --remote=origin --push
fi

# ----------------------------------------------------------------------------
section "2. Neon (Postgres)"
# ----------------------------------------------------------------------------
if [ -n "${NEON_API_KEY:-}" ] && command -v neonctl >/dev/null 2>&1; then
  neonctl projects create --name fgc-stream --api-key "$NEON_API_KEY" --output json > /tmp/neon-project.json
  export DATABASE_URL
  DATABASE_URL=$(node -e "console.log(require('/tmp/neon-project.json').connection_uris[0].connection_uri)")
  echo "Neon project created. DATABASE_URL captured."
else
  manual "Create a Neon project at neon.tech, copy the pooled connection string, export it as DATABASE_URL before re-running this script (or paste into scripts/.setup.env)."
  DATABASE_URL="${DATABASE_URL:?see manual step above}"
fi

npx prisma migrate deploy
echo "Schema applied to Neon."

# ----------------------------------------------------------------------------
section "3. Upstash (Redis)"
# ----------------------------------------------------------------------------
if [ -n "${UPSTASH_API_KEY:-}" ] && [ -n "${UPSTASH_EMAIL:-}" ]; then
  RESP=$(curl -s -X POST "https://api.upstash.com/v2/redis/database" \
    -u "${UPSTASH_EMAIL}:${UPSTASH_API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"name":"fgc-stream","region":"us-east-1","tls":true}')
  REDIS_URL=$(echo "$RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(\`rediss://:\${j.password}@\${j.endpoint}:\${j.port}\`)})")
  echo "Upstash database created."
else
  manual "Create an Upstash Redis database at upstash.com, copy the rediss:// URL as REDIS_URL and the REST URL/token as UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN into scripts/.setup.env, re-run."
  REDIS_URL="${REDIS_URL:?see manual step above}"
fi

# ----------------------------------------------------------------------------
section "4. AWS -- S3 buckets, CloudFront, scoped IAM user"
# ----------------------------------------------------------------------------
if command -v aws >/dev/null 2>&1 && aws sts get-caller-identity >/dev/null 2>&1; then
  for BUCKET in "$S3_BUCKET_VODS" "$S3_BUCKET_CLIPS"; do
    aws s3api create-bucket --bucket "$BUCKET" --region "$AWS_REGION" \
      $( [ "$AWS_REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$AWS_REGION" ) \
      2>/dev/null || echo "  (bucket $BUCKET already exists -- continuing)"
    aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  done
  echo "Buckets ready. CloudFront distribution + Origin Access Control still need the console (one-time click-through -- see PHASE3_DEPLOYMENT_GUIDE.md Stage A.2, no good non-interactive CLI path for OAC setup)."
  manual "AWS Console -> CloudFront -> Create distribution -> origins = the two buckets above with Origin Access Control -> note the distribution domain as CLOUDFRONT_DOMAIN."

  aws iam create-user --user-name fgc-stream-media --output json >/dev/null 2>&1 || true
  cat > /tmp/fgc-stream-s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject"],
    "Resource": ["arn:aws:s3:::${S3_BUCKET_VODS}/*", "arn:aws:s3:::${S3_BUCKET_CLIPS}/*"]
  }]
}
EOF
  aws iam put-user-policy --user-name fgc-stream-media --policy-name fgc-stream-s3-scoped --policy-document file:///tmp/fgc-stream-s3-policy.json
  aws iam create-access-key --user-name fgc-stream-media --output json > /tmp/fgc-stream-iam-key.json
  echo "IAM user created with a scoped PutObject/GetObject-only policy -- credentials in /tmp/fgc-stream-iam-key.json (move these into your env vars, then delete that file)."
else
  manual "Install/configure the AWS CLI ('aws configure') with credentials that can create S3 buckets and IAM users, re-run this section."
fi

# ----------------------------------------------------------------------------
section "5. Vercel -- app deploy + env vars"
# ----------------------------------------------------------------------------
if command -v vercel >/dev/null 2>&1; then
  vercel link --yes
  for VAR in DATABASE_URL REDIS_URL UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN \
             NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY \
             STRIPE_SECRET_KEY STRIPE_PREMIUM_PRICE_ID \
             AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION S3_BUCKET_VODS S3_BUCKET_CLIPS; do
    VALUE="${!VAR:-}"
    if [ -n "$VALUE" ]; then
      echo "$VALUE" | vercel env add "$VAR" production --force >/dev/null
    fi
  done
  vercel deploy --prod
  echo "Vercel deployed. Remaining vars (NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SOCKET_URL, LIVEKIT_*, webhook secrets) need the URLs from later sections -- this script prints a final checklist at the end."
else
  manual "npm i -g vercel && vercel login, re-run this section."
fi

# ----------------------------------------------------------------------------
section "6. Render -- socket / clip-worker / ai-worker via Blueprint"
# ----------------------------------------------------------------------------
echo "Render's Blueprint (render.yaml) deploy is dashboard-initiated only as of this writing -- no public API endpoint to trigger a fresh Blueprint deploy non-interactively."
manual "render.com dashboard -> New -> Blueprint -> connect this repo -> it reads render.yaml automatically. Fill in each service's env vars per SETUP_GUIDE.md section 8's table."
manual "Once created, note the socket service's URL for the next section."

# ----------------------------------------------------------------------------
section "7. GitHub Actions secrets"
# ----------------------------------------------------------------------------
gh secret set PRODUCTION_DATABASE_URL --body "$DATABASE_URL"
if [ -n "${MEDIA_SERVER_HOST:-}" ]; then
  gh secret set MEDIA_SERVER_HOST --body "$MEDIA_SERVER_HOST"
  gh secret set MEDIA_SERVER_SSH_USER --body "${MEDIA_SERVER_SSH_USER:-ubuntu}"
  gh secret set MEDIA_SERVER_SSH_KEY < "${MEDIA_SERVER_SSH_KEY_FILE:?set path in .setup.env}"
  echo "GitHub Actions secrets set."
else
  manual "MEDIA_SERVER_HOST not set -- the media server VM (section 8) doesn't exist yet. Re-run just this section after provisioning it."
fi

# ----------------------------------------------------------------------------
section "8. LiveKit media server VM"
# ----------------------------------------------------------------------------
manual "VM provisioning (Oracle Cloud or EC2) is intentionally NOT scripted here -- it involves real money/quota decisions (instance size, region) and account-specific capacity constraints that a blind script shouldn't make for you. Follow ORACLE_FREE_TIER_DEPLOYMENT.md or PHASE3_DEPLOYMENT_GUIDE.md Stage B, then come back and fill in MEDIA_SERVER_HOST etc. and re-run section 7 above, plus set LIVEKIT_* in Vercel."

# ----------------------------------------------------------------------------
section "9. Clerk + Stripe webhooks"
# ----------------------------------------------------------------------------
manual "Both need your live Vercel URL to register against, and both are one-time dashboard clicks (Clerk: Webhooks -> Add Endpoint; Stripe: same) rather than something worth scripting for a one-time setup -- see SETUP_GUIDE.md section 6."

# ----------------------------------------------------------------------------
section "Done -- what's left"
# ----------------------------------------------------------------------------
cat <<'EOF'
Automated: GitHub repo, Neon schema, S3 buckets + scoped IAM user,
Vercel deploy with the env vars that were available, GitHub Actions
secrets (partial -- media server ones need the VM to exist first).

Still needs you, by design (see comments above for why each one can't
be scripted): CloudFront distribution click-through, Render Blueprint
deploy, the media server VM itself, and registering the Clerk/Stripe
webhooks once a live URL exists.

Full reference for every remaining step: SETUP_GUIDE.md.
EOF
