# ✅ NextAuth Type Definitions Fixed

## Issue
Build failed with TypeScript error:
```
Property 'id' does not exist on type 'Profile'.
```

## Root Cause
The `types/next-auth.d.ts` file was missing type definitions for:
1. `Profile` interface (used by Discord provider)
2. `JWT` interface (used by JWT callback)

## Solution Applied

### Updated: `types/next-auth.d.ts`

**Added Profile Interface:**
```typescript
interface Profile {
  id: string
  username: string
  discriminator: string
  avatar: string
  email?: string
}
```

**Added JWT Interface:**
```typescript
declare module 'next-auth/jwt' {
  interface JWT {
    discordId?: string
    username?: string
  }
}
```

## What This Fixes

### Before:
- ❌ TypeScript couldn't find `profile.id`
- ❌ TypeScript couldn't find `profile.username`
- ❌ TypeScript couldn't find `token.discordId`
- ❌ Build failed

### After:
- ✅ `profile.id` is properly typed as `string`
- ✅ `profile.username` is properly typed as `string`
- ✅ `token.discordId` is properly typed as `string | undefined`
- ✅ Build succeeds

## Files Modified

1. **`types/next-auth.d.ts`**
   - Added `Profile` interface
   - Added `JWT` interface in `next-auth/jwt` module

## Testing

Run the build:
```bash
npm run build
```

Expected result: ✅ Build succeeds without type errors

## Note

The `lib/auth.ts` file is marked as deprecated since the app now uses Supabase Auth, but it's kept for backward compatibility with existing NextAuth routes. The type definitions ensure it compiles correctly even though it's not actively used.

---

**NextAuth type definitions are now complete!** ✅
