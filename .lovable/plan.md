
Goal
- Remove the visible blank gap above the fixed footer in mobile “Profile view” by making the profile container extend all the way down to the footer (same “background reaches the bottom” behavior you already have on desktop).

What’s causing the gap (based on the code)
- The profile is rendered inside a fixed-position wrapper in `src/components/SearchInterface.tsx`:
  - `top-[80px] bottom-[100px] md:bottom-[140px]`
- On mobile, that `bottom-[100px]` literally reserves 100px of empty space at the bottom of the viewport. Since the footer is fixed at `bottom-0`, you end up with a visible “dead zone” between where the profile stops and where the footer starts.
- You confirmed:
  - It happens in “Profile view only”
  - The dock is visible
  - The gap is constant (not related to address bar resizing)

Design decision (what we’ll do)
- Make the profile wrapper extend to the bottom of the viewport on mobile: `bottom-0`
- Keep desktop behavior as-is (`md:bottom-[140px]`) if you still want desktop spacing reserved for UI elements.
- Ensure the profile content remains readable/not hidden behind the dock/footer by managing padding inside the scrollable profile content (not by shrinking the container with `bottom-[100px]`).

Implementation steps (no guesswork; exact targets)
1) Update the fixed profile wrapper in `src/components/SearchInterface.tsx`
   - Locate the wrapper currently:
     - `className="fixed left-0 right-0 top-[80px] bottom-[100px] md:bottom-[140px] ..."`
   - Change it to:
     - `bottom-0 md:bottom-[140px]`
   - Rationale:
     - This removes the forced 100px empty space on mobile while preserving whatever desktop layout spacing you intended.

2) Verify mobile profile scrolling + dock overlap behavior
   - After step (1), the profile background will reach the footer, but the dock (which is `position: fixed`) will still sit on top of content.
   - We’ll confirm whether the bottom-most profile content gets obscured behind the dock/footer.
   - If it does, we will adjust *internal padding* (not container bottom) in the mobile profile layout:
     - `src/components/ProfileCard.tsx` mobile root currently includes `pb-20`
     - We may tune this value slightly (e.g., `pb-24` / `pb-28`) so the last items in the profile are never hidden behind the dock, while still keeping the container `bottom-0` to eliminate the gap.

3) Validate against the “footer must be fixed” requirement
   - We will not change the footer positioning (it stays `fixed bottom-0 left-0 right-0`) to preserve your keyboard behavior constraint on mobile.
   - The fix is entirely about the profile container’s bottom boundary.

4) Quick QA checklist (mobile)
   - Open a profile on a small phone viewport.
   - Confirm:
     - No blank strip/gap above the footer.
     - Profile background reaches the footer cleanly.
     - Dock still floats above content (no layout shift).
     - Bottom-most profile content isn’t trapped behind the dock/footer.

Files we’ll touch
- `src/components/SearchInterface.tsx` (required): change `bottom-[100px]` → `bottom-0` for mobile profile container.
- `src/components/ProfileCard.tsx` (optional, only if needed): adjust mobile bottom padding to ensure content isn’t obscured by the dock/footer after the container is allowed to reach the bottom.

Risks / edge cases
- If anything relied on the old reserved 100px bottom space (unlikely, since that was creating the visible gap), removing it could reveal dock overlap. That’s why step (2) includes padding adjustment inside the scrollable content instead of reintroducing a “gap” by shrinking the container.
