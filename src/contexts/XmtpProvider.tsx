import { XMTPProvider } from "@xmtp/react-sdk";
import { ReactNode } from "react";

interface XmtpProviderWrapperProps {
  children: ReactNode;
}

export const XmtpProviderWrapper = ({ children }: XmtpProviderWrapperProps) => {
  return (
    <XMTPProvider>
      {children}
    </XMTPProvider>
  );
};
