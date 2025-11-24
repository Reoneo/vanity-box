import { createContext, useContext, useState, ReactNode } from "react";
import { Client } from "@xmtp/browser-sdk";

interface XmtpContextType {
  client: Client | null;
  setClient: (client: Client | null) => void;
}

const XmtpContext = createContext<XmtpContextType | undefined>(undefined);

interface XmtpProviderWrapperProps {
  children: ReactNode;
}

export const XmtpProviderWrapper = ({ children }: XmtpProviderWrapperProps) => {
  const [client, setClient] = useState<Client | null>(null);

  return (
    <XmtpContext.Provider value={{ client, setClient }}>
      {children}
    </XmtpContext.Provider>
  );
};

export const useXmtpClient = () => {
  const context = useContext(XmtpContext);
  if (context === undefined) {
    throw new Error("useXmtpClient must be used within XmtpProviderWrapper");
  }
  return context;
};
