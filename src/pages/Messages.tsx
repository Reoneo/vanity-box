import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Home, MessageSquare, MessageSquarePlus, Search, Shield, Lock, User } from "lucide-react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatThread } from "@/components/chat/ChatThread";
import { NewConversationModal } from "@/components/chat/NewConversationModal";
import { useMessaging } from "@/hooks/useMessaging";
import { useIotaWallet } from "@/contexts/IotaWalletContext";
import { useWalletConnect } from "@/contexts/WalletConnectContext";
import { getLinkedDomain } from "@/lib/messaging/linkDomain";
import { loadAllDeviceKeys } from "@/lib/crypto/keyVault";
import { toast } from "sonner";
import { useSignMessage, useAccount } from "wagmi";
import { Header } from "@/components/Header";
import Dock from "@/components/Dock";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { NetworkIcon } from "@/components/NetworkIcon";

export default function Messages() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, setTheme } = useTheme();
  const { address: iotaAddress } = useIotaWallet();
  const { address: evmAddress, isConnected: walletConnected, openChainModal } = useWalletConnect();
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [showNewConvo, setShowNewConvo] = useState(false);

  useEffect(() => {
    const linked = getLinkedDomain();
    if (linked) setDomain(linked);

    // Use the async vault loader (vault is encrypted, not raw JSON)
    (async () => {
      try {
        const allKeys = await loadAllDeviceKeys();
        const vaultDomains = Object.keys(allKeys);
        if (vaultDomains.length > 0) {
          const normalizedLinked = linked?.toLowerCase().trim();
          const vaultDomain = normalizedLinked && (allKeys[normalizedLinked] || vaultDomains.find(k => k.toLowerCase().trim() === normalizedLinked))
            ? (normalizedLinked)
            : vaultDomains[0];
          if (vaultDomain && !linked) setDomain(vaultDomain);
        }
      } catch (err) {
        console.warn("Failed to load device keys from vault:", err);
      }

      // Wallet address comes from connected wallets
      if (iotaAddress) setWalletAddress(iotaAddress);
      else if (evmAddress) setWalletAddress(evmAddress);
    })();
  }, [iotaAddress, evmAddress]);

  // Wallet signing for EVM identity registration
  const { signMessageAsync } = useSignMessage();
  const { address: wagmiAddress } = useAccount();
  const signMessageFn = useCallback(async (message: string) => {
    return signMessageAsync({ message, account: wagmiAddress! });
  }, [signMessageAsync, wagmiAddress]);

  const {
    isRegistered, isLoading, conversations, activeConversation,
    messages, register, fetchConversations, startConversation,
    sendMessage, openConversation, setActiveConversation,
  } = useMessaging(walletAddress, domain, signMessageFn);

  useEffect(() => {
    if (isRegistered && walletAddress && domain) fetchConversations();
  }, [isRegistered, walletAddress, domain, fetchConversations]);

  const handleStartConversation = async (recipientDomain: string) => {
    const convId = await startConversation(recipientDomain);
    if (convId) {
      setShowNewConvo(false);
      openConversation(convId);
    } else {
      toast.error("Failed to start conversation");
    }
  };

  // Dock items — always include Search; hide Messages on /messages
  const isMessagesRoute = /^\/(messages|chat)\b/.test(pathname);
  const dockItems = [
    {
      icon: <Home className="w-6 h-6 text-[#D4AF37]" />,
      label: "Home",
      onClick: () => navigate("/"),
      isActive: false,
    },
    {
      icon: <User className="w-6 h-6 text-[#D4AF37]" />,
      label: "Profile",
      onClick: () => {
        const linked = getLinkedDomain();
        if (linked || domain) navigate(`/${linked || domain}`);
        else navigate("/");
      },
      isActive: false,
    },
    // Messages icon hidden on messages route
    ...(!isMessagesRoute
      ? [
          {
            icon: <MessageSquare className="w-6 h-6 text-[#D4AF37]" />,
            label: "Messages",
            onClick: () => navigate("/messages"),
            isActive: false,
          },
        ]
      : []),
    {
      icon: <Search className="w-6 h-6 text-[#D4AF37]" />,
      label: "Search",
      onClick: () => navigate("/"),
      isActive: false,
    },
  ];

  // Not connected state
  if (!walletAddress && !domain) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Lock className="w-16 h-16 text-[#D4AF37] mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">E2EE Messages</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Connect your wallet and link a domain to start sending end-to-end encrypted messages anchored to your on-chain identity.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#D4AF37]/90 transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  // Not registered state
  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Shield className="w-16 h-16 text-[#D4AF37] mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Set Up Encrypted Messaging</h1>
        <p className="text-muted-foreground mb-2 max-w-md">
          Generate your device encryption keys and register your identity.
        </p>
        <p className="text-sm text-muted-foreground/70 mb-2 max-w-md">
          Domain: <span className="text-[#D4AF37] font-mono">{domain || "Not linked"}</span>
        </p>
        {domain ? (
          <button
            onClick={register}
            disabled={isLoading}
            className="px-6 py-3 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Generating keys…" : "Generate Keys & Register"}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Visit your profile first, then come back here to set up messaging.
          </p>
        )}
        <button
          onClick={() => navigate("/")}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-black dark:bg-black flex flex-col relative overflow-hidden">
      {/* Gold side borders */}
      <div className="fixed inset-0 border-l-2 border-r-2 border-[#D4AF37] pointer-events-none z-50" />

      {/* Content wrapper — full viewport, no scroll */}
      <div className="h-dvh flex flex-col relative z-40">
        {/* App Header — fixed at top */}
        <div className="flex-shrink-0">
          <Header />
        </div>

        {/* Messages Header — no sticky, just fixed in flex flow */}
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-y-2 border-[#D4AF37] bg-background/80 backdrop-blur-md">
          <button
            onClick={() => {
              if (activeConversation) {
                setActiveConversation(null);
              } else {
                const linked = getLinkedDomain();
                if (linked) navigate(`/${linked}`);
                else navigate(-1 as any);
              }
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">
              {activeConversation ? "Chat" : "Messages"}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" />
              End-to-end encrypted
            </p>
          </div>
          {!activeConversation && (
            <button
              onClick={() => setShowNewConvo(true)}
              className="p-2 rounded-lg bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 transition-colors"
            >
              <MessageSquarePlus className="w-5 h-5 text-[#D4AF37]" />
            </button>
          )}
        </header>

        {/* Main content — fills remaining space, internal scroll only */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex-1 flex flex-col overflow-hidden border-x-2 border-[#D4AF37]">
            {activeConversation ? (
              <ChatThread
                messages={messages}
                onSend={(text) => sendMessage(activeConversation, text)}
                domain={domain || ""}
              />
            ) : (
              <ConversationList
                conversations={conversations}
                onSelect={openConversation}
                domain={domain || ""}
              />
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 py-1 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] border-t-2 border-[#D4AF37] z-[9999]">
          <div className="container mx-auto px-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <LanguageSelector />
            </div>
            <div className="text-black absolute left-1/2 transform -translate-x-1/2 font-normal whitespace-nowrap">
              © 2026 vanity.box. All rights reserved.
            </div>
            <div className="flex items-center gap-3">
              {walletConnected && (
                <button onClick={openChainModal} className="hover:opacity-70 transition-opacity" aria-label="Switch Network">
                  <NetworkIcon size={20} />
                </button>
              )}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover:opacity-70 transition-opacity"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-6 h-6 text-black" /> : <Moon className="w-6 h-6 text-black" />}
              </button>
            </div>
          </div>
        </footer>

        {/* Dock */}
        <Dock items={dockItems} />
      </div>

      {/* New conversation modal */}
      {showNewConvo && (
        <NewConversationModal
          onClose={() => setShowNewConvo(false)}
          onStart={handleStartConversation}
        />
      )}
    </div>
  );
}
