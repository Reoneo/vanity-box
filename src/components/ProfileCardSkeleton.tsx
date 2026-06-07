import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lightweight skeleton placeholder mirroring the ProfileCard layout.
 * Shown while a profile (or cross-chain linked profile) is loading so
 * the user never sees an interim half-rendered card.
 */
export const ProfileCardSkeleton = () => {
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header / banner */}
      <div className="relative w-full">
        <Skeleton className="w-full h-[140px] md:h-[200px] rounded-none" />

        {/* Avatar — desktop centered, mobile left */}
        <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 -bottom-12 md:-bottom-16">
          <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 md:px-8 pt-16 md:pt-20 pb-6 flex flex-col gap-4 overflow-hidden">
        {/* Name + handle */}
        <div className="flex flex-col items-start md:items-center gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Bio */}
        <div className="flex flex-col items-center gap-2 w-full">
          <Skeleton className="h-3 w-3/4 max-w-md" />
          <Skeleton className="h-3 w-2/3 max-w-md" />
        </div>

        {/* Social icons row */}
        <div className="flex items-center justify-center gap-3 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-full" />
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileCardSkeleton;
