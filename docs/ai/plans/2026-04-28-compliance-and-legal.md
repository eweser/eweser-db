# Compliance and Legal — Pre-Launch Requirements

**Date:** 2026-04-28
**Status:** Blocking — must be resolved before public launch of eweser.com with real user signups.

---

## Why This Matters

EweserDB's sync server (Hocuspocus) stores Yjs document state server-side. Transport is encrypted (HTTPS/WSS), but the server holds plaintext content for synced rooms. Until E2EE ships, operating eweser.com puts Jacob in the legal position of a traditional cloud storage host — with all the obligations that entails.

The current ToS and Privacy stubs in `packages/app/src/pages.tsx` (lines 1723–1776) are three-paragraph placeholders. They are not adequate for public users.

---

## Current State

| Item                           | Location                                     | Status                                         |
| ------------------------------ | -------------------------------------------- | ---------------------------------------------- |
| Terms of Service               | `packages/app` `/statement/terms-of-service` | Stub — 3 paragraphs                            |
| Privacy Policy                 | `packages/app` `/statement/privacy`          | Stub — 3 paragraphs                            |
| DMCA Agent                     | US Copyright Office                          | Not registered                                 |
| Abuse contact                  | Anywhere                                     | Not published                                  |
| Prohibited content policy      | ToS                                          | Not present                                    |
| Account deletion / data export | Auth server                                  | Partial (delete account exists in better-auth) |
| GDPR data subject rights       | Auth server                                  | Partial                                        |

---

## Risk Areas

### 1. CSAM (Child Sexual Abuse Material)

- **Risk level:** Critical
- US federal law (18 U.S.C. § 2258A) requires providers who discover CSAM to report it to NCMEC immediately. There is no safe harbor exemption from this obligation, regardless of encryption.
- **Required actions:**
  - Explicit prohibition in ToS
  - Abuse report mechanism (email address minimum)
  - Response process documented internally

### 2. DMCA / Copyright

- **Risk level:** High for EU/US public launch
- US safe harbor (17 U.S.C. § 512) requires:
  1. A registered DMCA agent with the US Copyright Office (copyright.gov/dmca-directory, ~$6/year)
  2. Published takedown policy in ToS or a dedicated `/dmca` page
  3. Counter-notice procedure documented
  4. Responding "expeditiously" to valid takedown notices
- Without this, any copyright holder can sue directly without sending a notice first.
- **Required actions:**
  - Register DMCA agent before launch
  - Add takedown/counter-notice policy to ToS

### 3. GDPR (EU users) and CCPA (California users)

- **Risk level:** High if EU or CA users sign up
- GDPR requires:
  - Lawful basis for processing (legitimate interest or consent)
  - Data subject rights: access, rectification, erasure, portability
  - Data retention limits stated
  - Privacy Policy that names what is collected, why, and how long
- CCPA requires similar rights for California residents.
- **Required actions:**
  - Real Privacy Policy covering: what is collected, retention period, rights, contact
  - Account deletion that actually purges user data from Postgres and Hocuspocus
  - Data export capability (can be manual initially)

### 4. General Abuse / Illegal Content

- **Risk level:** Medium
- Without a prohibited-content clause and abuse contact, there is no mechanism to receive reports or demonstrate good-faith removal.
- **Required actions:**
  - Prohibited content list in ToS (illegal content, harassment, malware distribution, etc.)
  - `abuse@eweser.com` or equivalent published contact

---

## Action Items (Prioritised)

### Must-do before any public launch

- [ ] **Replace ToS stub** with a real document covering:
  - Account requirements
  - Prohibited content (illegal material, CSAM, harassment, malware)
  - Ownership: user retains data ownership; eweser.com hosts to provide the service
  - Termination rights: we can terminate accounts that violate ToS
  - Limitation of liability and warranty disclaimer
  - Governing law (choose a jurisdiction)

- [ ] **Replace Privacy Policy stub** with a real document covering:
  - What is collected: email, name, IP at signup/login, Yjs room content on sync
  - Why: to operate the service
  - Retention: session data, account data, synced room data
  - Data subject rights (access, deletion, export) and how to exercise them
  - Third-party processors (Postgres host, Railway/DO, email provider)
  - Contact address

- [ ] **Register DMCA agent** with the US Copyright Office
  - Takes ~10 minutes at copyright.gov
  - Costs ~$6/year
  - Required before safe harbor applies

- [ ] **Publish abuse contact** (`abuse@eweser.com` or equivalent) in footer and ToS

### Should-do before or shortly after launch

- [ ] **Implement account deletion** that removes: better-auth user record, Postgres rows, Hocuspocus room data for rooms owned by that user
- [ ] **Add data export** endpoint or manual process so users can get their data
- [ ] **Add cookie/tracking notice** if any analytics (GA, Plausible, etc.) are added — currently landing page has no analytics, keep it that way unless this is planned

### Deferred (post-launch or when relevant)

- [ ] E2EE for synced rooms — reduces (but does not eliminate) server-side content exposure. Blocked by MCP/AI access design conflict (see notes below).
- [ ] Formal DPA (Data Processing Agreement) for B2B or enterprise use
- [ ] Age verification — if the product is ever intended for minors, COPPA applies
- [ ] Cookie consent banner — only needed if cookies beyond session auth are set

---

## E2EE Note

E2EE is in direct conflict with the MCP/AI access feature:

- True E2EE means the server cannot read room content
- MCP tools (`eweser_get_documents`, `eweser_search`) require the server (or the MCP process) to read content
- Resolution options: client-side decryption in a trusted process, key delegation per agent, or per-room E2EE opt-in

E2EE should not be rushed as a compliance shortcut — it will not eliminate CSAM/DMCA obligations and will break MCP if not designed carefully. The compliance actions above are cheaper and more immediately necessary.

---

## Where ToS and Privacy Live

Currently the stubs are in `packages/app/src/pages.tsx` at routes `/statement/terms-of-service` and `/statement/privacy`. These are linked from the sign-in and sign-up pages.

Before launch:

- Replace the stub React components with real content (can remain as React components or be migrated to the Astro landing site)
- Add footer links to Terms and Privacy on the landing page (`packages/landing`)
- Consider a canonical URL at `eweser.com/legal/terms` and `eweser.com/legal/privacy` for discoverability

---

## Related Files

- `packages/app/src/pages.tsx` lines 1723–1776 — current stubs
- `docs/security-go-live-checklist.md` — security checks (separate from legal compliance)
- `docs/security-incident-response.md` — incident response (covers breach notification, relevant to GDPR)
