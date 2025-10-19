# ✅ Client Component Fix

## Issue
Build failed during prerendering with error:
```
Error: Event handlers cannot be passed to Client Component props.
  {variant: "ghost", onClick: function onClick, ...}
```

## Root Cause
The `app/not-found.tsx` page was trying to use an `onClick` handler on a Button component, but the page was a server component by default. In Next.js 15, pages are server components unless marked with `'use client'`.

## Solution

### Updated: `app/not-found.tsx`

**Added `'use client'` directive:**
```typescript
'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  // ... component code with onClick handler
}
```

## Why This Works

### Server Components (Default):
- ❌ Cannot use `onClick`, `useState`, `useEffect`, etc.
- ❌ Cannot pass event handlers to client components
- ✅ Can use async/await
- ✅ Can directly access databases

### Client Components (`'use client'`):
- ✅ Can use `onClick`, `useState`, `useEffect`, etc.
- ✅ Can pass event handlers to other components
- ❌ Cannot use async/await in component function
- ❌ Cannot directly access databases

## The Button in Question

```typescript
<Button
  variant="ghost"
  onClick={() => window.history.back()}  // ← This requires 'use client'
  className="flex items-center gap-2"
>
  <ArrowLeft className="w-4 h-4" />
  Go Back
</Button>
```

## Files That Are Client Components

✅ `app/not-found.tsx` - Now has `'use client'`
✅ `app/turf/page.tsx` - Already has `'use client'`
✅ `components/turf/TurfMap.tsx` - Already has `'use client'`
✅ `components/turf/MapView.tsx` - Already has `'use client'`
✅ All UI components in `components/ui/` - Already have `'use client'`

## Files That Are Server Components

✅ `app/admin/page.tsx` - Server component (uses async/await, Supabase)
✅ `app/page.tsx` - Server component (uses async/await, Supabase)
✅ `app/gallery/page.tsx` - Server component (uses async/await, Supabase)

## Testing

Run the build:
```bash
npm run build
```

Expected result: ✅ Build succeeds without prerender errors

---

**Client component issue resolved!** ✅
