import { Skeleton } from "@/components/ui/skeleton";

export const ProfileSkeleton = () => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="relative">
        <Skeleton className="w-full h-48 rounded-t-lg" />
        <div className="absolute -bottom-16 left-8">
          <Skeleton className="w-32 h-32 rounded-full border-4 border-background" />
        </div>
      </div>

      {/* Profile Info Skeleton */}
      <div className="pt-20 px-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
        
        {/* Stats Skeleton */}
        <div className="flex gap-6 pt-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>

        {/* Social Links Skeleton */}
        <div className="flex gap-3 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-10 h-10 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const ProfileCardSkeleton = () => {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
};
