# Create Update Instructions Examples

## Example 1: Generate New Update Instructions

**User Input:** "Generate update 1.B instructions based on: The mobile app crashes when users try to upload photos, search results don't show properly on tablets, and we need a dark mode toggle in settings."

**Expected AI Response:**
1. ✅ Validate version format (1.B is valid)
2. ✅ Check if document exists (should not exist yet)
3. ✅ Create directory structure: `Update Instructions/1/B/`
4. ✅ Parse feedback into individual issues:
   - Mobile photo upload crashes
   - Tablet search results display issues  
   - Dark mode toggle needed
5. ✅ Generate appropriate update IDs:
   - 1.B.T4.1 - Fix mobile photo upload crashes
   - 1.B.T6.1 - Fix tablet search results display
   - 1.B.T7.1 - Add dark mode toggle to settings
6. ✅ Create comprehensive document with checklist
7. ✅ Provide generation summary

## Example 2: Add to Existing Instructions

**User Input:** "Add the following to update 1.A instructions: Users can't delete events, and the calendar view is slow on older devices."

**Expected AI Response:**
1. ✅ Validate existing document exists
2. ✅ Parse current update IDs to find next available numbers
3. ✅ Generate new update IDs:
   - 1.A.M6.23 - Enable event deletion functionality
   - 1.A.T1.3 - Optimize calendar view performance
4. ✅ Add to appropriate categories in existing document
5. ✅ Update checklist with new items
6. ✅ Update progress tracking numbers
7. ✅ Provide update summary

## Example 3: Invalid Generation Request

**User Input:** "Generate update 1.A instructions based on new feedback"

**Expected AI Response:**
```markdown
❌ **Update Instructions Already Exist: Version 1.A**

**Existing File:** `Update Instructions/1/A/VERSION_1A_UPDATE_INSTRUCTIONS.md`

**Options:**
- Use "Add [feedback] to update 1.A instructions" to add new updates
- Use "Update 1.A instructions with [feedback]" to modify existing
- Specify a new version (e.g., "1.B") for new document
```

## Example 4: Database Update Detection

**User Input:** "Generate update 1.C instructions based on: We need to add user roles to the database, and the login system needs two-factor authentication."

**Expected AI Response:**
1. ✅ Detect database changes needed
2. ✅ Generate update IDs with .M suffix:
   - 1.C.A2.1.M - Add user roles to database schema
   - 1.C.A2.2.M - Implement two-factor authentication
3. ✅ Include database migration warnings
4. ✅ Create document with proper .M handling

## Example 5: System-Wide Updates

**User Input:** "Generate update 1.D instructions based on: All pages need better error handling, and we need to implement analytics tracking across the app."

**Expected AI Response:**
1. ✅ Identify system-wide changes
2. ✅ Generate SYSTEM update IDs:
   - 1.D.SYSTEM.1 - Implement comprehensive error handling
   - 1.D.SYSTEM.2 - Add analytics tracking system
3. ✅ Create appropriate documentation

## Validation Checklist

### For AI Assistant:
- [ ] Does the system validate version format correctly?
- [ ] Does it check for existing documents before generating?
- [ ] Does it parse feedback into discrete, actionable items?
- [ ] Does it generate proper sequential update IDs?
- [ ] Does it detect database changes and add .M suffix?
- [ ] Does it create comprehensive checklists?
- [ ] Does it update existing documents properly?
- [ ] Does it maintain document structure and formatting?

### For Users:
- [ ] Can users easily generate new instruction documents?
- [ ] Can users add feedback to existing documents?
- [ ] Are invalid requests handled with clear explanations?
- [ ] Is the generated content comprehensive and actionable?
- [ ] Are database requirements clearly identified?

This system ensures consistent, comprehensive update instruction generation that integrates seamlessly with the existing development workflow.
