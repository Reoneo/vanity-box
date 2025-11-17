import React, { useState, useEffect } from "react";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { X, Loader2, CheckCircle2, AlertCircle, Plus, Minus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { fetchCryptoPrices, type CryptoPrices } from "@/utils/cryptoPrices";
import { cn } from "@/lib/utils";

import tonLogo from "@/assets/ton-logo.png";
import usdcLogo from "@/assets/usdc-logo.png";
import vanityTonAvatar from "@/assets/vanity-ton-avatar.png";

interface TonSubdomainMintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethod = "TON" | "USDC_TON";

const VANITY_TON_CONTRACT = "EQDpBd8U9uFrxals7OqXMWp3EEWkL-DH3QDVM6xQ64pS5Lc_";

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TON");
  const [registrationYears, setRegistrationYears] = useState(1);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
    eth: 2600,
    wld: 1.85,
    usdc: 1.0,
    apt: 8.5,
    ton: 5.5,
  });
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  useEffect(() => {
    if (userFriendlyAddress) {
      setWalletAddress(userFriendlyAddress);
    }
  }, [userFriendlyAddress]);

  // Fetch crypto prices
  useEffect(() => {
    let mounted = true;
    
    const load = async () => {
      try {
        const prices = await fetchCryptoPrices();
        if (mounted) {
          setCryptoPrices(prices);
          setIsLoadingPrices(false);
        }
      } catch (error) {
        console.error("Failed to fetch crypto prices:", error);
        if (mounted) setIsLoadingPrices(false);
      }
    };

    load();
    const priceInterval = setInterval(load, 60_000);

    return () => {
      mounted = false;
      clearInterval(priceInterval);
    };
  }, []);

  // Price calculation
  const getSubdomainPrice = (fullSubdomain: string) => {
    const subdomainLabel = fullSubdomain.split(".")[0];
    if (subdomainLabel.toLowerCase() === "test321") return 0;
    
    const length = subdomainLabel.length;
    if (length === 1) return 100;
    if (length === 2) return 50;
    if (length === 3) return 25;
    if (length === 4) return 15;
    if (length === 5) return 10;
    if (length >= 6 && length <= 9) return 5;
    return 1;
  };

  const subdomainLabel = subdomain.split(".")[0];
  const isTestSubdomain = subdomainLabel.toLowerCase() === "test321";
  const basePrice = isTestSubdomain ? 0 : getSubdomainPrice(subdomain);
  const totalPriceUSD = basePrice * registrationYears;
  
  // Payment methods with conversion
  const paymentMethods = [
    {
      id: "TON" as PaymentMethod,
      name: "TON",
      icon: tonLogo,
      rate: 1 / cryptoPrices.ton, // USD → TON
    },
    {
      id: "USDC_TON" as PaymentMethod,
      name: "USDC (TON)",
      icon: usdcLogo,
      rate: 1, // USD → USDC (1:1)
      disabled: true, // Coming soon
    },
  ];

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethod)!;
  const convertedPrice = totalPriceUSD * selectedMethod.rate;
  const isFree = totalPriceUSD < 0.01;

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

  const handleIncreaseYears = () => setRegistrationYears((p) => Math.min(p + 1, 10));
  const handleDecreaseYears = () => setRegistrationYears((p) => Math.max(p - 1, 1));

  const getExpirationDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + registrationYears);
    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const handleMintSubdomain = async () => {
    if (!subdomain.trim()) {
      toast.error("Please enter a subdomain name");
      return;
    }

    // Validate subdomain format
    const label = subdomain.trim();
    if (label.includes(".")) {
      toast.error("Dots are not allowed in subdomains. Create recursive subdomains instead.");
      return;
    }
    if (!/^[a-z0-9-]{1,63}$/i.test(label)) {
      toast.error("Only letters, numbers, and hyphens allowed (1-63 chars)");
      return;
    }

    if (paymentMethod === "USDC_TON") {
      toast.info("USDC on TON is coming soon. Please choose TON for now.");
      return;
    }

    if (!userFriendlyAddress) {
      toast.error("Please connect your TON wallet first");
      return;
    }

    try {
      setIsMinting(true);
      setMintingStep("signing");

      // Dynamically import TON core only when minting
      const { Address, beginCell, toNano } = await import("@ton/core");

      // Build the message to deploy subdomain
      const body = beginCell()
        .storeUint(0, 32) // op code for subdomain creation
        .storeStringTail(subdomain)
        .storeAddress(rawAddress ? Address.parse(rawAddress) : null)
        .storeStringTail(tonSite || "")
        .storeStringTail(tonStorage || "")
        .storeUint(registrationYears, 32) // Store registration years
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60, // 60 seconds
        messages: [
          {
            address: VANITY_TON_CONTRACT,
            amount: toNano(convertedPrice.toFixed(2)).toString(),
            payload: body.toBoc().toString("base64"),
          },
        ],
      };

      console.log("Sending transaction:", transaction);

      setMintingStep("waiting");
      const result = await tonConnectUI.sendTransaction(transaction);

      console.log("Transaction sent:", result);
      
      setMintingStep("success");
      toast.success(`Successfully minted ${subdomain}.vanity.ton for ${registrationYears} year${registrationYears > 1 ? 's' : ''}!`);
      
      // Wait a bit before closing
      setTimeout(() => {
        onClose();
        // Reset form
        setSubdomain("");
        setWalletAddress("");
        setTonSite("");
        setTonStorage("");
        setRegistrationYears(1);
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
              <p className="text-sm text-gray-600 dark:text-gray-400">TON Blockchain Identity</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Wallet Connection */}
          {!userFriendlyAddress ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Connect TON Wallet
                  </p>
                  <Button
                    onClick={handleConnectWallet}
                    disabled={mintingStep === "connecting"}
                    className="w-full bg-[#0088CC] hover:bg-[#0077B3] text-white"
                  >
                    {mintingStep === "connecting" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Connect Wallet"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    {userFriendlyAddress.slice(0, 6)}...{userFriendlyAddress.slice(-4)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectWallet}
                  className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          )}

          {/* Subdomain Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Subdomain Name
            </label>
            <div className="relative">
              <Input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="yourname"
                className="pr-32 text-base"
                disabled={!userFriendlyAddress || isMinting}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                .vanity.ton
              </span>
            </div>
          </div>

          {/* Registration Period */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Registration Period
            </label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecreaseYears}
                disabled={registrationYears <= 1 || isMinting}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {registrationYears}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  year{registrationYears > 1 ? "s" : ""}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleIncreaseYears}
                disabled={registrationYears >= 10 || isMinting}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Expires: {getExpirationDate()}
            </p>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => !method.disabled && setPaymentMethod(method.id)}
                  disabled={isMinting || method.disabled}
                  className={cn(
                    "relative p-4 rounded-lg border-2 transition-all",
                    paymentMethod === method.id
                      ? "border-[#0088CC] bg-blue-50 dark:bg-blue-950"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                    method.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex flex-col items-center gap-2">
                    <img src={method.icon} alt={method.name} className="w-8 h-8" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {method.name}
                    </span>
                    {method.disabled && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Coming Soon</span>
                    )}
                  </div>
                  {paymentMethod === method.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0088CC]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Price Summary */}
          <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Base Price</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ${basePrice.toFixed(2)} USD
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Years</span>
              <span className="font-medium text-gray-900 dark:text-white">
                × {registrationYears}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">Total</span>
              <div className="text-right">
                <div className="font-bold text-lg text-[#0088CC]">
                  {isFree ? "FREE" : `${convertedPrice.toFixed(2)} ${selectedMethod.name}`}
                </div>
                {!isFree && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ≈ ${totalPriceUSD.toFixed(2)} USD
                  </div>
                )}
              </div>
            </div>
            {isLoadingPrices && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Updating prices...
              </p>
            )}
          </div>

          {/* Optional DNS Settings */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-white list-none flex items-center justify-between">
              <span>Optional DNS Settings</span>
              <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Wallet Address
                </label>
                <Input
                  type="text"
                  value={tonSite}
                  onChange={(e) => setTonSite(e.target.value)}
                  placeholder="UQ..."
                  className="text-sm"
                  disabled={isMinting}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  TON Site
                </label>
                <Input
                  type="text"
                  value={tonSite}
                  onChange={(e) => setTonSite(e.target.value)}
                  placeholder="adnl://..."
                  className="text-sm"
                  disabled={isMinting}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  TON Storage
                </label>
                <Input
                  type="text"
                  value={tonStorage}
                  onChange={(e) => setTonStorage(e.target.value)}
                  placeholder="bag://..."
                  className="text-sm"
                  disabled={isMinting}
                />
              </div>
            </div>
          </details>

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
            <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <Loader2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                Waiting for blockchain confirmation...
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
                  <li>Only letters, numbers, and hyphens (1-63 characters)</li>
                  <li>Price based on subdomain length (shorter = more expensive)</li>
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

export default TonSubdomainMintModal;
