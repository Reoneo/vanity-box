import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, MessageSquare, MessageSquarePlus, Shield, Lock, User } from "lucide-react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatThread } from "@/components/chat/ChatThread";
import { NewConversationModal } from "@/components/chat/NewConversationModal";
import { useMessaging } from "@/hooks/useMessaging";
import { useIotaWallet } from "@/contexts/IotaWalletContext";
import { useWalletConnect } from "@/contexts/WalletConnectContext";
import { getLinkedDomain } from "@/lib/messaging/linkDomain";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import Dock from "@/components/Dock";

export default function Messages() {
  const navigate = useNavigate();
  const { address: iotaAddress } = useIotaWallet();
  const { address: evmAddress } = useWalletConnect();
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [showNewConvo, setShowNewConvo] = useState(false);

  useEffect(() => {
    // 1. Check linked domain from profile route / VP verification
    const linked = getLinkedDomain();
    if (linked) {
      setDomain(linked);
    }

    // 2. Try to get wallet from key vault (has registered keys)
    try {
      const vault = localStorage.getItem("vanitybox_msg_vault");
      if (vault) {
        const parsed = JSON.parse(vault);
        // Prefer the linked domain's vault entry, else first available
        const vaultDomain = linked && parsed[linked] ? linked : Object.keys(parsed)[0];
        if (vaultDomain) {
          if (!linked) setDomain(vaultDomain);
          setWalletAddress(parsed[vaultDomain]?.walletAddress || iotaAddress || evmAddress || null);
          return;
        }
      }
    } catch {}
    
    // 3. Fall back to connected wallet
    if (iotaAddress) {
      setWalletAddress(iotaAddress);
    } else if (evmAddress) {
      setWalletAddress(evmAddress);
    }
  }, [iotaAddress, evmAddress]);

  const {
    isRegistered,
    isLoading,
    conversations,
    activeConversation,
    messages,
    register,
    fetchConversations,
    startConversation,
    sendMessage,
    openConversation,
    setActiveConversation,
  } = useMessaging(walletAddress, domain);

  // Fetch conversations on mount
  useEffect(() => {
    if (isRegistered && walletAddress && domain) {
      fetchConversations();
    }
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

  // Not connected state
  if (!walletAddress && !domain) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Lock className="w-16 h-16 text-[#D4AF37] mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          E2EE Messages
        </h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Connect your wallet and link a domain to start sending end-to-end
          encrypted messages anchored to your on-chain identity.
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
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Set Up Encrypted Messaging
        </h1>
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* App Header */}
      <Header />

      {/* Messages Header with gold border */}
      <header className="flex items-center gap-3 px-4 py-3 border-y-2 border-[#D4AF37] bg-background/80 backdrop-blur-md sticky top-20 z-50">
        <button
          onClick={() => {
            if (activeConversation) {
              setActiveConversation(null);
            } else {
              // Navigate back to the linked profile instead of home
              const linked = getLinkedDomain();
              if (linked) {
                navigate(`/${linked}`);
              } else {
                navigate(-1 as any);
              }
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

      {/* Main content */}
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

      {/* Bottom gold border */}
      <div className="border-t-2 border-[#D4AF37]" />

      {/* Dock */}
      <Dock
        items={[
          {
            icon: <Home className="w-6 h-6 text-[#D4AF37]" />,
            label: "Home",
            onClick: () => navigate("/"),
          },
          {
            icon: <User className="w-6 h-6 text-[#D4AF37]" />,
            label: "Profile",
            onClick: () => {
              const linked = getLinkedDomain();
              if (linked || domain) navigate(`/${linked || domain}`);
              else navigate("/");
            },
          },
          {
            icon: <MessageSquare className="w-6 h-6 text-[#D4AF37]" />,
            label: "Messages",
            onClick: () => navigate("/messages"),
            isActive: true,
          },
        ]}
      />

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
