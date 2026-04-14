# Update Workflow Examples

## Example 1: Valid Fix Request

**User Input:** "Fix 1.A.T6.1"

**Expected AI Response:**
1. ✅ Validate update ID exists and is available `- [ ]`
2. ✅ Update checklist status to `- [-]` (in progress)
3. ✅ Update progress tracking numbers (count in-progress, remaining, percentages)
4. ✅ Extract update details from instructions
5. ✅ Provide comprehensive implementation response
6. ✅ Implement the fix following all standards
7. ✅ Provide post-implementation summary
8. 🚨 **CRITICAL: Keep status as `- [-]` (in-progress) - DO NOT mark complete automatically**

## Example 2: Invalid Fix Request (Already Complete)

**User Input:** "Fix 1.A.T6.1" (when already marked `- [x]`)

**Expected AI Response:**
```
❌ **Invalid Update Request: 1.A.T6.1**

**Reason:** Update is already completed (marked with [x])

**Available Updates:** 
- 1.A.T6.2 - Show date in search results
- 1.A.T5.1 - Fix notes JSON display issue
- 1.A.T5.2 - Fix email truncation

Please select a valid update ID that is currently available (marked with [ ]).
```

## Example 3: Completion Request

**User Input:** "Update 1.A.T6.1 complete"

**Expected AI Response:**
1. ✅ Validate update was in progress `- [-]`
2. ✅ Update checklist status to `- [x]` (complete)
3. ✅ Count and update progress tracking numbers:
   - Count completed updates (marked with [x])
   - Count in-progress updates (marked with [-])
   - Calculate remaining updates
   - Update percentages in Progress Tracking section
4. ✅ Provide completion confirmation with updated progress
5. ✅ Suggest next recommended updates from same category

## Example 4: Database Update (.M suffix)

**User Input:** "Fix 1.A.T5.3.M"

**Expected AI Response:**
1. ✅ All standard validation and implementation steps
2. ✅ **PLUS** special database migration warnings
3. ✅ **PLUS** post-implementation database guidance
4. ✅ **PLUS** reminder not to mark complete until DB migrations done

## Workflow Validation Checklist

### For AI Assistant:
- [ ] Does the system validate update ID format?
- [ ] Does it check current status before proceeding?
- [ ] Does it update checklist status correctly ([ ] → [-] → [x])?
- [ ] Does it count and update progress tracking numbers dynamically?
- [ ] Does it update the Progress Tracking section with accurate counts?
- [ ] Does it calculate percentages correctly?
- [ ] Does it handle .M suffix updates specially?
- [ ] Does it provide comprehensive implementation details?
- [ ] Does it follow all coding standards from best-practices.mdc?
- [ ] Does it suggest relevant next updates from same category?

### For Users:
- [ ] Can users easily request fixes with "Fix [ID]" format?
- [ ] Are invalid requests clearly explained?
- [ ] Is the implementation process transparent?
- [ ] Are database requirements clearly communicated?
- [ ] Is completion tracking accurate?

This workflow ensures every Version 1.A update is handled consistently, thoroughly, and professionally.
