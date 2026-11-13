import { lazy, Suspense } from "react";

// Loaded as its own chunk so the 3D library never weighs down the first paint.
const Hyperspeed = lazy(() => import("@/components/Hyperspeed"));

/**
 * Profile loading screen: the golden hyperspeed animation on its own, shown
 * while a profile is being resolved so the page never goes blank.
 */
export const ProfileLoadingScreen = () => (
  <div className="fixed left-0 right-0 top-[38px] bottom-0 z-[9997] overflow-hidden bg-black">
    <div className="absolute inset-0">
      <Suspense fallback={null}>
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
      </Suspense>
    </div>
  </div>
);

export default ProfileLoadingScreen;
