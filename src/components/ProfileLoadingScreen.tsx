/** Keep navigation stable while resolving a profile, without placeholder cards. */
export const ProfileLoadingScreen = () => (
  <div
    role="status"
    aria-label="Loading profile"
    className="fixed left-[2px] right-[2px] top-[38px] bottom-[38px] z-[9997] flex items-center justify-center bg-background"
  >
    <span className="h-6 w-6 rounded-full border-2 border-primary/25 border-t-primary motion-safe:animate-spin" aria-hidden="true" />
  </div>
);

export default ProfileLoadingScreen;
