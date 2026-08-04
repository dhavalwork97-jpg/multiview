# Running the LiveKit stage on Oracle Cloud Always Free instead of EC2

Replaces Stage B in `PHASE3_DEPLOYMENT_GUIDE.md` only — Stages A
(S3/CloudFront), C (clip worker), and D (wiring back into Vercel) are
unchanged.

**Why Oracle over AWS/GCP for this specific box:** AWS no longer gives
new accounts a lasting free EC2 instance (post-July-2025 accounts get a
6-month credit, not an ongoing free tier). Google Cloud's always-free
e2-micro (1 shared vCPU, 1GB RAM) is real but too small for LiveKit
Egress's Chrome-based recording jobs. Oracle's Always Free Ampere A1 tier
— 2 OCPU / 12GB RAM as of mid-2026 (down from an earlier 4/24 allowance,
worth double-checking against Oracle's current numbers at signup) — is
the only one of the three that's both genuinely free indefinitely and
large enough to be useful here. LiveKit's official images (`livekit-server`,
`egress`, `ingress`) are multi-arch and run on ARM without any changes to
`infra/livekit/`.

**Honest sizing note:** LiveKit's own docs suggest up to 4 CPUs per
concurrent room-composite Egress job. 2 OCPU comfortably handles the
server + ingress + a small number of concurrent recordings — enough to
develop against and run smaller events — but you'll want to size up (a
larger Oracle shape, no longer free, or a paid EC2/other VM) before
running dozens of stations recording simultaneously.

---

## B.1 — Sign up and request the Ampere shape

1. oracle.com/cloud/free → sign up. Card required for identity
   verification (standard across all three providers, not an
   Oracle-specific gate) — you won't be charged as long as you stay
   within Always Free limits.
2. Console → **Compute → Instances → Create Instance**.
3. Image: **Ubuntu 24.04**.
4. Shape: click **Change Shape** → **Ampere** → `VM.Standard.A1.Flex` →
   set 2 OCPUs / 12GB memory (the Always Free ceiling as of this
   writing).
5. Networking: create a new VCN if you don't have one, **assign a public
   IPv4 address**.
6. Add your SSH key, create.

If you get an "out of host capacity" error: ARM capacity in popular
regions is sometimes exhausted. Try a different availability domain
within the same region, or try again in a few minutes — this is a known,
common friction point with Oracle's free Ampere allocation, not a
mistake in your setup.

## B.2 — Open the ports (two layers, both required)

Oracle firewalls at both the cloud network level (Security List) and the
instance's own OS firewall — missing either one silently drops traffic.

**Security List** (Console → your VCN → Security Lists → default →
**Add Ingress Rules**), same port table as the EC2 guide:

| Port | Protocol | Purpose |
|---|---|---|
| 22 | TCP | SSH (your IP only) |
| 80, 443 | TCP | HTTP/TLS, LiveKit signaling |
| 1935 | TCP | RTMP ingest |
| 7881 | TCP | WebRTC over TCP (fallback) |
| 3478 | UDP | TURN |
| 5349 | TCP | TURN over TLS |
| 7885 | UDP | WHIP ingest |
| 50000–60000 | UDP | WebRTC media |

**OS firewall** (SSH in, then):

```bash
sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 1935 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 7881 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 3478 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 5349 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 7885 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 50000:60000 -j ACCEPT
sudo netfilter-persistent save   # or: sudo iptables-save > /etc/iptables/rules.v4
```

Ubuntu's default cloud image on OCI ships with fairly permissive
`iptables`, but this step is the single most common reason "it works on
EC2 instructions but not on Oracle" — don't skip it.

## B.3 — Everything else is identical to the EC2 guide

From here, follow `PHASE3_DEPLOYMENT_GUIDE.md` Stages B.2 (DNS) through
B.6 (start the stack) exactly as written — `docker compose up -d` pulls
the arm64 image variants automatically, no config changes needed. Same
for Stage D (wiring the webhook and env vars back into Vercel).

## What's different in practice, day to day

- **Idle reclamation**: Oracle can reclaim Always Free compute that
  shows sustained near-zero utilization. A media server that's actually
  handling station traffic during tournaments won't trigger this, but a
  box sitting completely idle between events for a long stretch might —
  worth knowing before you assume it'll always be there untouched.
- **No pre-auth surprises**: unlike Fly's small pre-authorization hold,
  Oracle's card-on-file is purely for identity verification at signup —
  nothing gets charged while you're inside Always Free limits.
