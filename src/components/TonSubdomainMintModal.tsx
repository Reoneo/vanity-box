import React, { useState, useEffect } from "react";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Address, beginCell, toNano } from "@ton/core";

import tonLogo from "@/assets/ton-logo.png";
import vanityTonAvatar from "@/assets/vanity-ton-avatar.png";

interface TonSubdomainMintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VANITY_TON_CONTRACT = "EQDpBd8U9uFrxals7OqXMWp3EEWkL-DH3QDVM6xQ64pS5Lc_";
const SUBDOMAIN_PRICE_TON = "1"; // 1 TON per subdomain

export const TonSubdomainMintModal: React.FC<TonSubdomainMintModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [tonConnectUI] = useTonConnectUI();
  const userFriendlyAddress = useTonAddress();
  const rawAddress = useTonAddress(false);

  const [subdomain, setSubdomain] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [tonSite, setTonSite] = useState("");
  const [tonStorage, setTonStorage] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStep, setMintingStep] = useState<"idle" | "connecting" | "signing" | "waiting" | "success">("idle");

  useEffect(() => {
    if (userFriendlyAddress) {
      setWalletAddress(userFriendlyAddress);
    }
  }, [userFriendlyAddress]);

  const handleConnectWallet = async () => {
    try {
      setMintingStep("connecting");
      await tonConnectUI.openModal();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast.error("Failed to connect wallet");
      setMintingStep("idle");
    }
  };

  const handleMintSubdomain = async () => {
    if (!subdomain.trim()) {
      toast.error("Please enter a subdomain name");
      return;
    }

    // Validate subdomain format
    if (subdomain.includes(".")) {
      toast.error("Dots are not allowed in subdomains. Create recursive subdomains instead.");
      return;
    }

    if (!userFriendlyAddress) {
      toast.error("Please connect your TON wallet first");
      return;
    }

    try {
      setIsMinting(true);
      setMintingStep("signing");

      // Build the message to deploy subdomain
      const body = beginCell()
        .storeUint(0, 32) // op code for subdomain creation
        .storeStringTail(subdomain)
        .storeAddress(rawAddress ? Address.parse(rawAddress) : null)
        .storeStringTail(tonSite || "")
        .storeStringTail(tonStorage || "")
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60, // 60 seconds
        messages: [
          {
            address: VANITY_TON_CONTRACT,
            amount: toNano(SUBDOMAIN_PRICE_TON).toString(),
            payload: body.toBoc().toString("base64"),
          },
        ],
      };

      console.log("Sending transaction:", transaction);

      setMintingStep("waiting");
      const result = await tonConnectUI.sendTransaction(transaction);

      console.log("Transaction sent:", result);
      
      setMintingStep("success");
      toast.success(`Successfully minted ${subdomain}.vanity.ton!`);
      
      // Wait a bit before closing
      setTimeout(() => {
        onClose();
        // Reset form
        setSubdomain("");
        setWalletAddress("");
        setTonSite("");
        setTonStorage("");
        setMintingStep("idle");
      }, 2000);
    } catch (error: any) {
      console.error("Failed to mint subdomain:", error);
      toast.error(error.message || "Failed to mint subdomain");
      setMintingStep("idle");
    } finally {
      setIsMinting(false);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await tonConnectUI.disconnect();
      setWalletAddress("");
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <img src={vanityTonAvatar} alt="Vanity TON" className="w-12 h-12 rounded-full" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mint .vanity.ton</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">TON Blockchain Subdomain</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isMinting}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Wallet Connection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              TON Wallet
            </label>
            {userFriendlyAddress ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <img src={tonLogo} alt="TON" className="w-8 h-8" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {userFriendlyAddress.slice(0, 6)}...{userFriendlyAddress.slice(-4)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Connected</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectWallet}
                  disabled={isMinting}
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleConnectWallet}
                className="w-full bg-[#0088CC] hover:bg-[#0077B3] text-white"
                disabled={mintingStep === "connecting"}
              >
                {mintingStep === "connecting" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect TON Wallet"
                )}
              </Button>
            )}
          </div>

          <Separator className="bg-gray-200 dark:bg-gray-800" />

          {/* Subdomain Input */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Subdomain Name
            </label>
            <div className="relative">
              <Input
                placeholder="Enter subdomain (e.g., 'bob')"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                disabled={isMinting || !userFriendlyAddress}
                className="pr-32 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                .vanity.ton
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ⚠️ Dots are NOT allowed. For nested subdomains, create them recursively.
            </p>
          </div>

          {/* Optional DNS Settings */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              DNS Settings (Optional)
            </p>
            
            <div className="space-y-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">Linked Wallet</label>
              <Input
                placeholder="Leave empty to use connected wallet"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                disabled={isMinting}
                className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">TON Site</label>
              <Input
                placeholder="ADNL address (optional)"
                value={tonSite}
                onChange={(e) => setTonSite(e.target.value)}
                disabled={isMinting}
                className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">TON Storage</label>
              <Input
                placeholder="Storage bag ID (optional)"
                value={tonStorage}
                onChange={(e) => setTonStorage(e.target.value)}
                disabled={isMinting}
                className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-sm"
              />
            </div>
          </div>

          <Separator className="bg-gray-200 dark:bg-gray-800" />

          {/* Price Summary */}
          <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Subdomain Price</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{SUBDOMAIN_PRICE_TON} TON</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Plus network fees (estimated ~0.1 TON)
            </p>
          </div>

          {/* Status Messages */}
          {mintingStep === "signing" && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Please sign the transaction in your wallet...
              </p>
            </div>
          )}

          {mintingStep === "waiting" && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin" />
              <p className="text-sm text-amber-900 dark:text-amber-100">
                Transaction processing on TON blockchain...
              </p>
            </div>
          )}

          {mintingStep === "success" && (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-900 dark:text-green-100">
                Subdomain minted successfully!
              </p>
            </div>
          )}

          {/* Mint Button */}
          <Button
            onClick={handleMintSubdomain}
            disabled={!userFriendlyAddress || !subdomain.trim() || isMinting}
            className="w-full bg-[#0088CC] hover:bg-[#0077B3] text-white h-12 text-base font-semibold"
          >
            {isMinting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Minting...
              </>
            ) : (
              `Mint ${subdomain || "subdomain"}.vanity.ton`
            )}
          </Button>

          {/* Info Box */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <p className="font-semibold text-gray-900 dark:text-white">Important Notes:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Dots are NOT allowed in subdomain names</li>
                  <li>For nested subdomains (e.g., first.second.vanity.ton), create them recursively</li>
                  <li>First create "second.vanity.ton", then inside it create "first"</li>
                  <li>Transaction is irreversible once confirmed on blockchain</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
