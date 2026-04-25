# API Input Validation — How to Apply the Pattern

Every API route that accepts a request body **must** validate it with Zod before doing anything else. The pattern is established in `app/api/ratings/route.ts` (reference implementation). This doc explains how to replicate it for every other route.

## Why

- Untrusted input at the boundary is the #1 source of bugs and security issues. Anything a client sends is hostile until proven otherwise.
- Zod gives you runtime validation **and** compile-time types from one declaration. No duplicate interfaces. No drift.
- One shared error shape means the frontend can rely on the same response format on every route.

## The three files

| File | Purpose |
|---|---|
| `lib/http.ts` | Already exists. `validateBody<T>()` helper. Don't modify unless you know exactly why. |
| `app/api/<feature>/schema.ts` | One per route. Zod schema + inferred type. |
| `app/api/<feature>/route.ts` | Calls `validateBody` at the top, narrows, proceeds with typed data. |

## Step by step

### 1. Create `schema.ts` next to the route

```ts
import { z } from "zod";

export const createFooSchema = z.object({
  someId: z.string().min(1),
  count: z.number().int().min(0),          // .int() when Prisma column is Int
  title: z.string().trim().min(1).max(200),
  note: z.string().trim().max(500).optional(),
  active: z.boolean(),                      // strict boolean, no coercion
});

export type CreateFooInput = z.infer<typeof createFooSchema>;
```

**Naming:**

- **Schema const** — `camelCase`, action-prefixed: `createFooSchema`, `updateFooSchema`, `listFooQuerySchema`.
- **Inferred type** — `PascalCase`: `CreateFooInput`, `UpdateFooInput`.
- **One schema per operation.** Don't reuse `fooSchema` for create and update — they differ (update usually makes fields optional).

**Rules of thumb:**

- Prisma column is `Int` → add `.int()`.
- Every `string` gets `.trim()` before length checks (prevents whitespace garbage being stored).
- Every `string` has a `.max()` — **never** accept unbounded input (DoS vector).
- `.optional()` means "field may be omitted"; if you also want to reject empty strings, add `.min(1)`.
- Prefer strict `z.boolean()`. If you find yourself reaching for `z.coerce.boolean()`, that's a client bug — fix the client.

### 2. Wire it into `route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateBody } from "@/lib/http";   // no .ts extension
import { createFooSchema } from "./schema";
// ...other imports grouped here, at the top

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // 1. Auth check first
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  // 2. Validate body
  const validation = await validateBody(request, createFooSchema);
  if (!validation.ok) return validation.response;

  // 3. Typed data — destructure and use
  const { someId, count, title, note, active } = validation.data;

  // ...rest of the handler
}
```

That three-line block is always the same shape:

1. Call `validateBody`.
2. Early-return on failure. `validation.response` is a fully-formed 400 — don't build your own.
3. Destructure the typed data.

### 3. Manual smoke test before opening the PR

```bash
# valid — should 201
curl -X POST http://localhost:3000/api/foo \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <session cookie>' \
  -d '{"someId":"abc","count":3,"title":"hi","active":true}'

# invalid — should 400 with errors array
curl -X POST http://localhost:3000/api/foo \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <session cookie>' \
  -d '{"someId":"","count":3.5,"active":"true"}'

# malformed JSON — should 400 with "JSON inválido"
curl -X POST http://localhost:3000/api/foo \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <session cookie>' \
  -d 'not json'
```

The three responses tell you the three code paths work.

## Common mistakes — don't do these

| Mistake | Why it's wrong |
|---|---|
| `validation.data as CreateFooInput` | `data` is already typed. `as` hides bugs — delete the cast. |
| `if (validation instanceof Ok)` | `Ok` is a type, not a class. Use `if (validation.ok)`. |
| `import { validateBody } from "@/lib/http.ts"` | Drop the `.ts`. Matches the rest of the codebase. |
| Imports split across the file | All imports at the top. No imports after `export const dynamic`. |
| Forgetting `.int()` on integer fields | `3.7` slips through; Prisma crashes with 500 instead of returning 400. |
| `z.string()` without `.max()` | Clients can post 10MB strings. Always bound input. |
| `z.coerce.boolean()` | `"false"` coerces to `true` (truthy string). Strict `z.boolean()` is safer. |
| Forgetting `export` on the schema | Route can't import it. TS will tell you. |
| Fixing unrelated issues in the same PR | One concern per PR. Note the issue, open a follow-up. |

## Hover tip

If you hover over `validation.data` in the IDE and see a wall of `ZodObject<{...}, "strip", ZodTypeAny, ...>` — ignore it. Hover over the **destructured variables** instead:

```ts
const { someId, count, title } = validation.data;
//      ^string  ^number ^string   ← clean, readable hovers
```

The ugly generic form is technically correct; TS just doesn't expand it in hover tooltips. Destructuring bypasses the problem.

## Checklist before you open the PR

- [ ] `schema.ts` exists next to the route
- [ ] Schema const uses `camelCase`, action-prefixed (`createFooSchema`)
- [ ] Inferred type uses `PascalCase` (`CreateFooInput`)
- [ ] Every string has `.trim()` and `.max()`
- [ ] Every integer field has `.int()`
- [ ] Schema and type are both exported
- [ ] Route imports from `"@/lib/http"` (no `.ts` extension)
- [ ] Route uses `if (!validation.ok) return validation.response;` exactly
- [ ] No `as` casts on `validation.data`
- [ ] All imports at top of file
- [ ] No unrelated changes in the PR
- [ ] Smoke-tested: valid body 201s, invalid body returns 400 with field errors, malformed JSON returns 400

## Reference

The canonical example is `app/api/ratings/route.ts` + `app/api/ratings/schema.ts`. If your route should behave differently from the pattern (file uploads, streaming, etc.), **ask the Senior before inventing a new pattern.**
