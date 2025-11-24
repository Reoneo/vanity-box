import { ReactNode } from "react";

interface XmtpProviderWrapperProps {
  children: ReactNode;
}

// Simplified provider - XMTP client management moved to hook
export const XmtpProviderWrapper = ({ children }: XmtpProviderWrapperProps) => {
  return <>{children}</>;
};
