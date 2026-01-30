
## Plan: Make Header Logo Fully Visible

### Problem
The logo currently has a `-mt-14` (negative top margin) which pushes half of it above the header, making only the bottom portion visible.

### Solution
Remove the negative margin (`-mt-14`) from the logo image in all three header instances. This will bring the full logo into view while keeping:
- The "VANITY.BOX" text in its current position
- The header height unchanged at `h-20`

### Changes Required

**File: `src/components/Header.tsx`**

Update the logo styling in 3 locations:

1. **Line 125** - Mobile (wallet connected):
   - Change: `className="h-28 w-auto object-contain -mt-14"`
   - To: `className="h-28 w-auto object-contain"`

2. **Line 212** - Mobile (wallet disconnected, centered):
   - Change: `className="h-28 w-auto object-contain -mt-14"`
   - To: `className="h-28 w-auto object-contain"`

3. **Line 268** - Desktop/Tablet (centered):
   - Change: `className="h-28 w-auto object-contain -mt-14"`
   - To: `className="h-28 w-auto object-contain"`

### Result
The logo will be fully visible within the header, positioned above the "VANITY.BOX" text. The text will remain at the bottom of the header container as it currently is.
