import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Skeleton placeholder that mirrors the real ProfileCard layout on
 * mobile (avatar overlapping header on the left, action buttons on the right)
 * and desktop (banner header with avatar overlay at 25% from the left,
 * two-column body).
 */
export const ProfileCardSkeleton = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="w-full h-full flex flex-col bg-background overflow-hidden">
        {/* Banner */}
        <div className="relative w-full">
          <Skeleton className="w-full h-[140px] rounded-none" />
        </div>

        {/* Avatar (overlapping) + action buttons row */}
        <div className="flex gap-3 px-4 pt-2">
          <div className="w-[70%] flex flex-col items-center text-center">
            <div className="flex justify-center w-full -mt-16">
              <Skeleton className="h-28 w-28 rounded-2xl" />
            </div>
            {/* Display name + handle */}
            <Skeleton className="h-5 w-40 mt-3" />
            <Skeleton className="h-3 w-28 mt-2" />
            {/* Bio */}
            <Skeleton className="h-3 w-3/4 mt-3" />
            <Skeleton className="h-3 w-2/3 mt-2" />
          </div>
          <div className="w-[30%] flex flex-col gap-2 pt-2">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>

        {/* Social icons row */}
        <div className="flex items-center justify-center gap-3 mt-4 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-full" />
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-2 gap-3 px-4 mt-4 pb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Full-width banner with avatar overlay at ~25% from left */}
      <div className="relative w-full">
        <Skeleton className="w-full h-[240px] rounded-none" />
        <div className="absolute -bottom-20 left-[25%] -translate-x-1/2">
          <Skeleton className="h-44 w-44 rounded-2xl" />
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex-1 grid grid-cols-2 gap-6 px-8 pt-24 pb-8 overflow-hidden">
        {/* Left: name + bio + socials */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full max-w-md mt-2" />
          <Skeleton className="h-3 w-3/4 max-w-md" />
          <div className="flex items-center gap-3 mt-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Right: action buttons + tokens/nfts grid */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCardSkeleton;
