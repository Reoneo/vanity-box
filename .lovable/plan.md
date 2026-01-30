
## Plan: Position VANITY.BOX Text at Bottom of Header

### Problem
The "VANITY.BOX" text is appearing outside the header because the `bottom-1` positioning doesn't work correctly - the parent container with `h-full` doesn't have a proper height context since its ancestors don't propagate an explicit height.

### Solution
Give the logo container an explicit height of `h-20` (matching the header height) so the absolute positioning of the text works correctly. The text will then be positioned at the bottom of that container, layered over the logo.

### Changes Required

**File: `src/components/Header.tsx`**

Update the logo container in 3 locations to use explicit `h-20` height:

1. **Line 121** - Mobile (wallet connected):
   - Change: `<div className="relative flex items-center justify-center h-full">`
   - To: `<div className="relative flex items-center justify-center h-20">`

2. **Line 209** - Mobile (wallet disconnected, centered):
   - Change: `<div className="relative flex items-center justify-center h-full">`
   - To: `<div className="relative flex items-center justify-center h-20">`

3. **Line 264** - Desktop/Tablet (centered):
   - Change: `<div className="relative flex items-center justify-center h-full">`
   - To: `<div className="relative flex items-center justify-center h-20">`

### Result
- The logo stays in exactly the same position (centered in the `h-20` container)
- The "VANITY.BOX" text will be positioned at the bottom of the header (4px from bottom due to `bottom-1`)
- The text will layer over the logo without affecting its position
- Header size remains unchanged at `h-20`
