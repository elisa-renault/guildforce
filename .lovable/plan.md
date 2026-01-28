
# Root Cause Analysis: Battle.net Rank Sync Bug

## Problem Summary

Mey (user `bb0f743b-...`) is the Guild Master of "Effective Chaos" with her character **Daphny-Darkspear**, but her `wow_guild_memberships` table shows `rank_index: 7` instead of `rank_index: 0` (Guild Master). This prevents the system from recognizing her as GM, resulting in lost access to guild management.

---

## Root Cause Identified

### The Bug: **Roster Matching Does NOT Check Realm**

The critical issue is in the Edge Function at **line 1896-1897**:

```javascript
const rosterMember = rosterMembers.find(
  (m: any) => m.character?.name?.toLowerCase() === insertedChar.name.toLowerCase()
);
```

This code matches roster members **by name only**, ignoring the realm. When a user has multiple characters with the same name on different realms, the wrong roster entry can be matched.

### Why Mey Got rank_index: 7

1. Mey has multiple "Daphny" characters across realms:
   - **Daphny-Darkspear** (level 80, GM of Effective Chaos, rank 0)  
   - **Daphny-Antonidas** (level 15, also in guild, rank 1)

2. The Blizzard roster for "Effective Chaos" shows:
   - `Daphny` from `darkspear` → rank 0 (Guild Master)
   - `Daphny` from `antonidas` → rank 1

3. During sync, when processing Daphny-Darkspear, the code finds the **first** `Daphny` in the roster array. Due to array iteration order not being guaranteed, it sometimes matches Daphny-Antonidas instead of Daphny-Darkspear.

4. The sync then writes **rank 7** (or whichever wrong rank was matched) to `wow_guild_memberships` for Daphny-Darkspear.

### Evidence from Database

**wow_guild_memberships (WRONG - what sync produced):**
| char_name | realm_slug | rank_index |
|-----------|------------|------------|
| Daphny    | darkspear  | **7**      |

**guild_roster_cache (CORRECT - from Blizzard API):**
| character_name | character_realm_slug | rank_index | is_guild_master |
|----------------|----------------------|------------|-----------------|
| Daphny         | darkspear            | **0**      | true            |
| Daphny         | antonidas            | 1          | false           |

---

## Technical Details

### Current Flow (Buggy)
```text
1. Fetch roster from Blizzard (array of ~100 members)
2. For each user character in guild:
   → Find roster member WHERE name = character.name
   → Set rank = rosterMember.rank
```

### Problem
The `.find()` returns the **first** match by name, which may not be the correct realm's character. Cross-realm guilds are common in modern WoW, so multiple characters with the same name can exist in one roster.

---

## Solution

### Fix the Matching Logic

Update line 1896-1897 to include **realm matching**:

```javascript
const rosterMember = rosterMembers.find(
  (m: any) => 
    m.character?.name?.toLowerCase() === insertedChar.name.toLowerCase() &&
    m.character?.realm?.slug?.toLowerCase() === insertedChar.realm_slug.toLowerCase()
);
```

### Implementation Steps

1. **Update Edge Function** (`supabase/functions/battlenet-auth/index.ts`)
   - Fix the roster member matching to include realm slug comparison
   - Add fallback for edge cases where realm data might be missing

2. **Add Logging** for Debugging
   - Log when multiple characters with the same name are found
   - Log the matched realm to catch future mismatches

3. **Immediate Data Fix**
   - Run a SQL migration to fix Mey's data and set her as guild owner/GM
   - Update her `wow_guild_memberships` to show correct rank 0

### Code Changes

File: `supabase/functions/battlenet-auth/index.ts`

**Before (line ~1896-1898):**
```javascript
const rosterMember = rosterMembers.find(
  (m: any) => m.character?.name?.toLowerCase() === insertedChar.name.toLowerCase()
);
```

**After:**
```javascript
// Match by BOTH name AND realm to handle cross-realm guilds
const rosterMember = rosterMembers.find(
  (m: any) => 
    m.character?.name?.toLowerCase() === insertedChar.name.toLowerCase() &&
    m.character?.realm?.slug?.toLowerCase() === insertedChar.realm_slug?.toLowerCase()
);

// Fallback: if no exact match, try name-only (for legacy/edge cases)
const fallbackMember = rosterMember || rosterMembers.find(
  (m: any) => m.character?.name?.toLowerCase() === insertedChar.name.toLowerCase()
);
```

### Database Migration

```sql
-- Fix Mey's guild ownership and role
UPDATE public.guilds
SET owner_id = 'bb0f743b-112d-4c39-a0eb-05fef3604955'
WHERE id = '6d5dc465-62b2-4816-93a8-1b7d438841ba';

UPDATE public.guild_members
SET role = 'gm'
WHERE guild_id = '6d5dc465-62b2-4816-93a8-1b7d438841ba'
AND user_id = 'bb0f743b-112d-4c39-a0eb-05fef3604955';

-- Fix the incorrect rank in wow_guild_memberships for Daphny-Darkspear
UPDATE public.wow_guild_memberships
SET rank_index = 0, rank_name = 'Guild Master'
WHERE character_id = '2520a54a-0de1-4be6-a351-c7b8d855d45d'
AND guild_name ILIKE 'Effective Chaos';
```

---

## Summary

| Issue | Root Cause | Fix |
|-------|------------|-----|
| GM rank not syncing correctly | Roster matching by name only, ignoring realm | Add realm slug to the matching condition |
| Mey lost GM access | Sync wrote wrong rank | Database migration to fix her data |
| Cross-realm guild issues | Multiple characters with same name | Match on name + realm_slug |

After implementing this fix, Battle.net syncs will correctly identify Guild Masters even when users have duplicate character names across realms.
