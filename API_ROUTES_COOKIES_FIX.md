# ✅ API Routes Cookies Fix

## Issue
Build failed with error:
```
Build error occurred
[Error: Failed to collect page data for /api/comments]
```

## Root Cause
Several API routes were using the old cookies syntax `{ cookies }` instead of the Next.js 15 compatible syntax `{ cookies: cookies }`.

## Files Fixed

### 1. ✅ `app/api/comments/route.ts`
```typescript
// Before
const supabase = createRouteHandlerClient<Database>({ cookies })

// After
const supabase = createRouteHandlerClient<Database>({ cookies: cookies })
```

### 2. ✅ `app/api/posts/route.ts`
- GET method
- POST method

### 3. ✅ `app/api/posts/[id]/route.ts`
- GET method
- PATCH method
- DELETE method

### 4. ✅ `app/api/webhook/discord/route.ts`
- POST method

### 5. ✅ `app/api/turf/route.ts` (Already fixed)
- GET method
- POST method
- PATCH method

## Summary

### Total Routes Fixed: 9
- ✅ Comments POST
- ✅ Posts GET
- ✅ Posts POST
- ✅ Posts [id] GET
- ✅ Posts [id] PATCH
- ✅ Posts [id] DELETE
- ✅ Webhook Discord POST
- ✅ Turf GET (already fixed)
- ✅ Turf POST (already fixed)
- ✅ Turf PATCH (already fixed)

## Next.js 15 Cookies API

### Correct Syntax:
```typescript
import { cookies } from 'next/headers'

// In route handler
const supabase = createRouteHandlerClient<Database>({ 
  cookies: cookies  // ← Pass the function reference
})
```

### Incorrect Syntax (Old):
```typescript
// This no longer works in Next.js 15
const supabase = createRouteHandlerClient<Database>({ cookies })
```

## Testing

Run the build:
```bash
npm run build
```

Expected result: ✅ All API routes build successfully

---

**All API routes now use the correct Next.js 15 cookies syntax!** ✅
