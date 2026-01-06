# Transport Options for n8n Access

Comparing methods to make n8n reachable via HTTPS.

## Current State

- n8n runs on Hetzner at `157.180.30.27:5678`
- Claude's egress proxy blocks direct IP access
- Need domain-based HTTPS URL

## Option 1: Tailscale Funnel

**How it works:**
- Tailscale provides a `*.ts.net` domain
- Traffic routes through Tailscale's infrastructure
- End-to-end encrypted

**Pros:**
- Simple setup (one command after enabling in admin)
- No DNS configuration needed
- Free tier sufficient
- Good for development/personal use

**Cons:**
- Depends on Tailscale service availability
- URL not memorable (`randomname.tail12345.ts.net`)
- Less control over caching/CDN

**Setup:**
1. Enable HTTPS in Tailscale DNS settings (done)
2. Add funnel attribute to ACL policy
3. Run `tailscale funnel 5678`

**Safety:** Medium - Tailscale handles auth, but endpoint is public

## Option 2: Cloudflare Tunnel

**How it works:**
- cloudflared daemon creates outbound tunnel
- Cloudflare provides domain routing
- Can use custom domain or `*.trycloudflare.com`

**Pros:**
- Free tier generous
- Custom domain support
- Built-in DDoS protection
- Access policies available

**Cons:**
- Requires cloudflared installation
- More configuration steps
- Cloudflare sees traffic (not E2E encrypted)

**Setup:**
1. Install cloudflared
2. `cloudflared tunnel login`
3. Create tunnel: `cloudflared tunnel create jen-n8n`
4. Configure: `cloudflared tunnel route dns jen-n8n n8n.yourdomain.com`
5. Run: `cloudflared tunnel run jen-n8n`

**Safety:** High - Can add Cloudflare Access policies

## Option 3: Reverse Proxy + Domain

**How it works:**
- Point domain to Hetzner IP
- Nginx/Caddy terminates SSL
- Proxies to localhost:5678

**Pros:**
- Full control
- Standard web infrastructure
- Can add any auth layer

**Cons:**
- Need to own/configure domain
- SSL certificate management
- Firewall configuration
- Most setup work

**Setup:**
1. Configure DNS A record to server IP
2. Install Caddy/Nginx
3. Configure reverse proxy with automatic SSL
4. Open port 443 in Hetzner firewall

**Safety:** High - Full control over auth and firewall

## Option 4: Hetzner Load Balancer

**How it works:**
- Hetzner managed load balancer
- Provides stable IP and optional domain
- SSL termination included

**Pros:**
- Managed service
- Integrates with Hetzner ecosystem
- Can add health checks

**Cons:**
- Monthly cost (~€5-10)
- Overkill for single service
- Still need domain for nice URL

**Safety:** High - Hetzner manages infrastructure

## Recommendation Matrix

| Factor | Tailscale | Cloudflare | Reverse Proxy | Hetzner LB |
|--------|-----------|------------|---------------|------------|
| Setup Speed | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐ |
| Cost | Free | Free | Free* | ~€5/mo |
| Custom Domain | No | Yes | Yes | Yes |
| Security Options | Basic | Excellent | Full Control | Good |
| Maintenance | Low | Low | Medium | Low |
| Independence | Medium | Low | High | Medium |

*Reverse proxy is free but requires domain (~$10/year)

## Current Decision

**For MVP/Now:** Tailscale Funnel
- Fastest to working state
- Good enough security for development
- Can migrate later if needed

**For Production:** Cloudflare Tunnel or Reverse Proxy
- Custom domain for professional appearance
- Better security policies
- More control over access

## Implementation Notes

Whichever transport is chosen:

1. **All n8n webhooks must require auth token** - Transport provides reachability, not security
2. **Log all requests** - For audit trail
3. **Rate limit** - Prevent abuse
4. **Document the URL** - Update Spine with current endpoint
