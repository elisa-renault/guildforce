# Permissions Matrix (Operational)

This document is the practical role/access reference used by agents during testing, debugging, and screenshot automation.

## Global Roles

| Role | Scope | Expected Access | Expected Restriction |
|---|---|---|---|
| `user` | App-wide | Standard authenticated navigation and member-level actions | No `/admin` access |
| `moderator` | Platform support | Support/admin surfaces allowed to moderators | No full admin panel unless also `admin` |
| `admin` | Platform admin | Admin panel (`/admin`), user and guild management | Guild-specific GM privileges still depend on guild membership/role |

Source of truth:
- `public.user_roles`
- Helper RPC: `has_role(auth.uid(), '<role>')`

## Guild Membership Roles

| Guild Role (`guild_members.role`) | Scope | Expected Access | Expected Restriction |
|---|---|---|---|
| `member` | Guild features | Guild overview, wishes (self/allowed), poll participation (if targeted) | No GM-only guild settings actions |
| `officer` | Guild features + delegated permissions | Member-level access plus delegated actions via `guild_permissions`/`has_guild_permission` | No automatic GM-only actions unless explicitly granted |
| `gm` | Guild ownership operations | Full guild management (settings, members, rosters, polls, permissions) | Does not imply platform `admin` role |

Source of truth:
- `public.guild_members`
- Helper RPC: `is_guild_member`, `is_guild_gm`, `has_guild_permission`

## Route Expectations for E2E Packs

| Route | Member | Admin | Notes |
|---|---|---|---|
| `/guilds` | Allowed | Allowed | Requires authentication |
| `/profile` | Allowed | Allowed | Requires authentication |
| `/admin` | Denied | Allowed | Controlled by `has_role(..., 'admin')` |

## Practical QA Toggles (Single Battle.net Account)

When only one Battle.net account exists:

1. Record member state:
   - remove `admin` from `user_roles`
   - run `npm run e2e:auth:record member`
2. Record admin state:
   - add `admin` into `user_roles`
   - run `npm run e2e:auth:record admin`

Use role packs to automate screenshots after both states are recorded:

```bash
npm run e2e:snapshots:rolepack
```

## Validation Rules for Agents

- Always prefer server-enforced checks (RLS + helper RPC) over frontend assumptions.
- If behavior diverges from this matrix, inspect:
  - `public.user_roles`
  - `public.guild_members`
  - helper RPC return values (`has_role`, `has_guild_permission`, etc.)
  - `e2e/artifacts/*/summary.json` and `rolepack-summary.json`
