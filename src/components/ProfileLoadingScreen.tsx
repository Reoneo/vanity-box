import { lazy, Suspense } from "react";
import { ProfileCardSkeleton } from "@/components/ProfileCardSkeleton";

// Loaded as its own chunk so the 3D library never weighs down the first paint;
// the skeleton is already on screen while this chunk arrives.
const Hyperspeed = lazy(() => import("@/components/Hyperspeed"));

/**
 * Profile loading screen: the golden hyperspeed backdrop with the
 * layout-matched profile skeleton floating over it, so the page never
 * goes blank while a profile is being resolved.
 */
export const ProfileLoadingScreen = () => (
  <div className="fixed left-0 right-0 top-[38px] bottom-0 z-[9997] flex flex-col overflow-hidden bg-black">
    <div className="absolute inset-0">
      <Hyperspeed
        curve="racing"
        roadWidth={9}
        density={30}
        poles={50}
        tailColors={["#eec02f", "#8d6919", "#eab308"]}
        headColors={["#f1eece", "#e6e2b1", "#dfd98a"]}
        poleColors={["#f1eece"]}
        interactive={false}
        boosting
        className="h-full w-full"
      />
    </div>
    <div
      className="profile-loading-skeleton relative flex-1 overflow-hidden pb-0 md:pb-[140px]"
      style={{ minHeight: 0 }}
    >
      <ProfileCardSkeleton />
    </div>
  </div>
);

export default ProfileLoadingScreen;
