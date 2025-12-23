# GTM OS Codebase Health Check Guide

This document provides a systematic debugging and health check process to ensure the codebase stays clean and maintainable.

## Quick Commands

```bash
# Run all checks
npm run build && npm run lint

# Type check only
npx tsc --noEmit
```

---

## 1. Duplicate Triggers & Race Conditions

### What to Check

Look for patterns that cause functions to execute multiple times unintentionally.

### Check useEffect Dependencies

```bash
# Find all useEffect hooks
grep -n "useEffect(" app/page.tsx
```

**Red Flags:**
- Multiple useEffects with overlapping triggers for the same action
- Callbacks in dependency arrays that aren't properly memoized
- Missing guards (`!loading`, `!data`) before async calls

### Pattern: Duplicate Trigger
```typescript
// BAD - Two triggers for same action
useEffect(() => {
  if (step === "research-company") runResearchPhase("company");
}, [currentStep]);

useEffect(() => {
  if (domain) runResearchPhase("company");  // DUPLICATE!
}, [domain]);
```

```typescript
// GOOD - Single trigger with proper guards
useEffect(() => {
  if (step === "research-company" && !research.company.loading && !research.company.initial) {
    runResearchPhase("company");
  }
}, [currentStep, research.company.loading, research.company.initial]);
```

### Pattern: Race Condition Guard
```typescript
// BAD - No guard against concurrent execution
async function generateReport() {
  const result = await callClaude(...);
  setReportData(result);
}

// GOOD - Guarded with state flag
const [isGenerating, setIsGenerating] = useState(false);

async function generateReport() {
  if (isGenerating) return;
  setIsGenerating(true);
  try {
    const result = await callClaude(...);
    setReportData(result);
  } finally {
    setIsGenerating(false);
  }
}
```

---

## 2. Dead Code Detection

### Find Unused Exports

```bash
# List all exports
grep -rn "^export " app/lib/ app/types/

# Cross-reference with imports
grep -rn "import.*from" app/
```

### Find Unused Functions

```bash
# Find function definitions
grep -n "function \w\+(" app/page.tsx
grep -n "const \w\+ = .*=>" app/page.tsx

# Search for their usage
grep -n "functionName" app/
```

### Check for Dead Mappings

Look for objects/maps where keys are never used:

```typescript
// Example: Check if all phase keys are valid steps
const phases = { "research-company": "company", "research-competitive": "competitive" };
// Verify "research-competitive" exists in steps array!
```

---

## 3. State Management Audit

### Large Dependency Arrays

```bash
# Find effects with many dependencies (warning sign)
grep -A 30 "useEffect(" app/page.tsx | grep -E "^\s*\], \["
```

**Fix Pattern - Debounced Persistence:**
```typescript
// BAD - Updates on every state change
useEffect(() => {
  localStorage.setItem(KEY, JSON.stringify(state));
}, [state1, state2, state3, /* 50 more... */]);

// GOOD - Debounced updates
const saveTimeoutRef = useRef<NodeJS.Timeout>();
useEffect(() => {
  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  saveTimeoutRef.current = setTimeout(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, 1000);
}, [/* critical state only */]);
```

### Check for Stale Closures

```bash
# Find async functions using state directly
grep -B 5 -A 10 "async function" app/page.tsx | grep -E "set\w+\("
```

---

## 4. API Call Patterns

### Verify All API Calls Have Error Handling

```bash
# Find callClaude/callClaudeJSON calls
grep -n "callClaude" app/page.tsx

# Check each has try/catch or fallback
```

**Required Pattern:**
```typescript
// All API calls should have:
// 1. Loading state
// 2. Error handling
// 3. User feedback on failure

setLoading(true);
try {
  const result = await callClaudeJSON<Type>(prompt, { fallback: defaultValue });
  setData(result);
} catch (error) {
  showError("Failed to load data");
} finally {
  setLoading(false);
}
```

### Check for Fire-and-Forget Calls

```bash
# Find async calls not awaited
grep -n "syncToHubSpot\|syncHubSpotContact" app/page.tsx
```

Fire-and-forget is OK for non-critical syncs, but should be logged.

---

## 5. Type Safety Checklist

### Find Any Types

```bash
# Search for explicit 'any'
grep -rn ": any" app/
grep -rn "as any" app/

# Search for implicit any (TypeScript strict mode catches these)
npx tsc --noEmit --strict
```

### Verify API Response Types

Check that all Claude API responses have typed interfaces:

```typescript
// In app/types/index.ts - should have interface for each JSON response:
export interface ICPDiscoveryResponse { ... }
export interface ProductExtractionResponse { ... }
export interface IcpResearchResponse { ... }
export interface CompetitiveAnalysisResponse { ... }
export interface ContentStrategyResponse { ... }
export interface AlphaSignalsResponse { ... }
export interface PillarContentResponse { ... }
export interface PodcastGuestsResponse { ... }
```

---

## 6. Memory Leak Prevention

### Check Cleanup in useEffects

```bash
# Find effects that set intervals/timeouts
grep -B 2 -A 10 "setInterval\|setTimeout" app/page.tsx
```

**Required Pattern:**
```typescript
useEffect(() => {
  const intervalId = setInterval(() => { ... }, 1000);
  return () => clearInterval(intervalId);  // MUST have cleanup
}, []);
```

### Check Observers

```bash
grep -n "IntersectionObserver\|MutationObserver\|ResizeObserver" app/
```

Each observer must have `.disconnect()` in cleanup.

---

## 7. Console & Debug Cleanup

### Find Console Logs

```bash
# Should be minimal in production
grep -rn "console.log\|console.warn\|console.error" app/

# Acceptable: error logging in catch blocks
# Remove: debug logs, commented-out code
```

---

## Health Check Checklist

Run through this before each release:

- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes (if configured)
- [ ] No duplicate useEffect triggers for same action
- [ ] All async functions have loading guards
- [ ] All API calls have error handling
- [ ] No `any` types in new code
- [ ] All useEffects have proper cleanup
- [ ] No dead code or unused exports
- [ ] Console logs removed (except error handlers)

---

## Known Issues & Technical Debt

### Current Issues (as of last audit)

| Issue | Location | Severity | Status |
|-------|----------|----------|--------|
| Large localStorage dependency array | page.tsx:263 | Medium | Open |
| Competitive runs parallel with report | page.tsx:1068 | Medium | Open |
| HubSpot sync is fire-and-forget | page.tsx:821 | Low | Acceptable |
| IntersectionObserver cleanup timing | page.tsx:282 | Low | Open |

### Recommended Future Improvements

1. **State Machine**: Replace multiple useEffects with XState or similar
2. **Debounced Persistence**: Add debounce to localStorage saves
3. **Error Boundary**: Add React error boundary component
4. **API Response Caching**: Implement SWR or React Query

---

## File Reference

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/page.tsx` | Main wizard UI & state | `runResearchPhase`, `generateReport`, `discoverICPs` |
| `app/lib/api.ts` | Claude API layer | `callClaude`, `callClaudeJSON`, `syncHubSpotContact` |
| `app/lib/parsers.ts` | Text parsing | `parseCompanyAnalysis`, `parseIcpResearch`, etc. |
| `app/lib/prompts.ts` | Prompt builders | `getCompanyPrompt`, `getICPPrompt`, etc. |
| `app/lib/formatters.ts` | Text formatting | `stripMarkdown`, `cleanResponse` |
| `app/types/index.ts` | TypeScript types | All interfaces |
| `app/constants/index.ts` | Config & steps | `steps`, `loadingStages`, etc. |
