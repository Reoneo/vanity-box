import { createContext, useContext, useState, ReactNode } from "react";

interface XmtpContextType {
  client: any | null;
  setClient: (client: any | null) => void;
}

const XmtpContext = createContext<XmtpContextType | undefined>(undefined);

interface XmtpProviderWrapperProps {
  children: ReactNode;
}

export const XmtpProviderWrapper = ({ children }: XmtpProviderWrapperProps) => {
  const [client, setClient] = useState<any | null>(null);

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
