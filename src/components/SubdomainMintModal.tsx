// src/components/SubdomainMintModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Share2, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { fetchCryptoPrices, CryptoPrices } from "@/utils/cryptoPrices";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
// ⬇︎ MiniKit v0.5+ (uses install(), not init())
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from "@worldcoin/minikit-js";

import usdcLogo from "@/assets/usdc-logo.png";
import ethLogoLight from "@/assets/eth-logo-light.png";
import ethLogoDark from "@/assets/eth-logo-dark.svg";
import ensLogoBlue from "@/assets/ens-logo-blue.png";
import wldLogoDark from "@/assets/wld-logo-dark.svg";
import wldLogoLight from "@/assets/wld-logo-light.png";

interface SubdomainMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: string;
  price: number; // kept for compatibility; actual price computed from length
  resultAvatar?: string;
}

type PaymentMethod = "USDC" | "ETH" | "WLD";

export const SubdomainMintModal: React.FC<SubdomainMintModalProps> = ({
  isOpen,
  onClose,
  subdomain,
  price, // eslint-disable-line @typescript-eslint/no-unused-vars
  resultAvatar,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const [registrationYears, setRegistrationYears] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("USDC");
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
    eth: 2500,
    wld: 2.0,
    usdc: 1.0,
  });
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [networkFeeUSD, setNetworkFeeUSD] = useState(0.50);

  // Prevent double MiniKit install
  const miniKitInstalledRef = useRef(false);
  // Prevent duplicate pay calls
  const payInFlightRef = useRef(false);

  // --------------------- helpers ---------------------

  /**
   * Ensure wallet is connected - call walletAuth if needed
   */
  const ensureWalletConnected = async (): Promise<string> => {
    try {
      // Check if wallet is already connected
      if (MiniKit.user?.walletAddress) {
        console.debug("[MiniKit] Wallet already connected:", MiniKit.user.walletAddress);
        return MiniKit.user.walletAddress;
      }

      console.debug("[MiniKit] No wallet found, initiating walletAuth");
      
      // Trigger walletAuth command
      const authResult = await MiniKit.commandsAsync.walletAuth({
        nonce: Date.now().toString(),
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(Date.now() - 60 * 1000),
        statement: 'Connect your wallet to mint subdomains',
      });

      console.debug("[MiniKit] walletAuth result:", authResult);

      if (authResult?.finalPayload?.status === "success" && authResult.finalPayload.address) {
        console.debug("[MiniKit] Wallet connected:", authResult.finalPayload.address);
        return authResult.finalPayload.address;
      }

      throw new Error("Wallet authentication failed. Please try again.");
    } catch (e: any) {
      console.error("[MiniKit] Wallet connection failed:", e);
      throw new Error(e?.message || "Unable to connect wallet. Please try again.");
    }
  };

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

  // --------------------- effects ---------------------

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new Event("mint-window-open"));
      // Don't auto-auth on modal open - prevents deep-link loops
    } else {
      window.dispatchEvent(new Event("mint-window-close"));
    }
  }, [isOpen]);

  // Fetch live prices and refresh every 60s
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setIsLoadingPrices(true);
        const prices = await fetchCryptoPrices();
        if (mounted) setCryptoPrices(prices);
      } catch (e) {
        console.error("Price fetch failed:", e);
      } finally {
        if (mounted) setIsLoadingPrices(false);
      }
    };

    const loadNetworkFee = async () => {
      try {
        const { calculateNetworkFee } = await import('@/utils/worldChainGas');
        const fee = await calculateNetworkFee();
        if (mounted) setNetworkFeeUSD(fee);
      } catch (error) {
        console.error('Failed to fetch network fee:', error);
      }
    };

    load();
    loadNetworkFee();
    
    const priceInterval = setInterval(load, 60_000);
    const feeInterval = setInterval(loadNetworkFee, 15_000);
    
    return () => {
      mounted = false;
      clearInterval(priceInterval);
      clearInterval(feeInterval);
    };
  }, []);

  // --------------------- pricing ---------------------

  const paymentMethods = [
    {
      id: "USDC" as PaymentMethod,
      name: "USDC",
      icon: usdcLogo,
      rate: 1 / cryptoPrices.usdc, // $ → USDC
    },
    {
      id: "ETH" as PaymentMethod,
      name: "ETH",
      icon: theme === "dark" ? ethLogoDark : ethLogoLight,
      rate: 1 / cryptoPrices.eth, // $ → ETH
    },
    {
      id: "WLD" as PaymentMethod,
      name: "WLD",
      icon: theme === "dark" ? wldLogoDark : wldLogoLight,
      rate: 1 / cryptoPrices.wld, // $ → WLD
    },
  ];

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethod)!;
  const domainPrice = getSubdomainPrice(subdomain);
  const totalPrice = (domainPrice * registrationYears) + networkFeeUSD;
  const grandTotal = totalPrice;
  const convertedPrice = grandTotal * selectedMethod.rate;

  // --------------------- handlers ---------------------

  const handleIncreaseYears = () => setRegistrationYears((p) => Math.min(p + 1, 10));
  const handleDecreaseYears = () => setRegistrationYears((p) => Math.max(p - 1, 1));

  const getExpirationDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + registrationYears);
    return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  };

  const handleMintNow = async () => {
    // Prevent double-minting
    if (isMinting) {
      console.debug("[Mint] Already minting, ignoring duplicate click");
      return;
    }

    try {
      setIsMinting(true);

      // Guard: avoid race while prices are loading
      if (grandTotal > 0 && isLoadingPrices) {
        toast.info("Fetching prices — try again in a moment.");
        return;
      }

      // Ensure wallet is connected - will trigger walletAuth if needed
      const walletAddress = await ensureWalletConnected();

      let txHash: string | undefined;

      // Process payment only if grand total > 0
      if (grandTotal > 0) {
        // Guard: prevent duplicate pay calls
        if (payInFlightRef.current) {
          console.debug("[MiniKit] Payment already in flight, ignoring");
          return;
        }
        payInFlightRef.current = true;

        try {
          toast.info("Processing payment...");

          // ETH requires sendTransaction, USDC/WLD use pay command
          if (paymentMethod === "ETH") {
            // Custom ETH payment flow using sendTransaction
            const recipientAddress = "0x71ab0b01e3ff45551e25b208e2a90298f73f7040";
            const weiAmount = Math.floor(convertedPrice * 1e18).toString();

            const txPayload = {
              transaction: [
                {
                  address: recipientAddress,
                  abi: [],
                  functionName: "",
                  args: [],
                  value: weiAmount,
                },
              ],
            };

            console.debug("[MiniKit] ETH transaction payload:", txPayload);
            
            const { finalPayload } = await MiniKit.commandsAsync.sendTransaction(txPayload);
            console.debug("[MiniKit] ETH transaction finalPayload:", finalPayload);

            if (finalPayload.status === "success") {
              txHash = finalPayload.transaction_id;
              toast.success("ETH payment successful!");
            } else if (finalPayload.status === "error") {
              const errorMsg = (finalPayload as any).error_message || "ETH payment failed.";
              toast.error(errorMsg);
              return;
            } else {
              toast.error("ETH payment was cancelled.");
              return;
            }
          } else {
            // USDC/WLD payment flow using pay command
            const tokenEnum = paymentMethod === "USDC" ? Tokens.USDC : Tokens.WLD;
            const roundedAmount = Math.round(convertedPrice * 1000000) / 1000000;
            const amountAtomic = tokenToDecimals(roundedAmount, tokenEnum).toString();

            const paymentPayload: PayCommandInput = {
              reference: `subdomain-${subdomain}-${Date.now()}`,
              to: "0x71ab0b01e3ff45551e25b208e2a90298f73f7040",
              tokens: [
                {
                  symbol: tokenEnum,
                  token_amount: amountAtomic,
                },
              ],
              description: `Register ${subdomain} for ${registrationYears} year${registrationYears > 1 ? "s" : ""}`,
            };

            console.debug("[MiniKit] Payment payload:", paymentPayload);

            const { finalPayload } = await MiniKit.commandsAsync.pay(paymentPayload);
            console.debug("[MiniKit] Payment finalPayload:", finalPayload);

            if (finalPayload.status === "success") {
              txHash = finalPayload.transaction_id;
              toast.success("Payment successful!");
            } else if (finalPayload.status === "error") {
              const errorMsg = (finalPayload as any).error_message || "Payment failed.";
              toast.error(errorMsg);
              return;
            } else {
              toast.error("Payment was cancelled.");
              return;
            }
          }
        } catch (payErr: any) {
          const msg = typeof payErr?.message === "string" ? payErr.message : "Payment processing failed. Please try again.";
          toast.error(msg);
          return;
        } finally {
          payInFlightRef.current = false;
        }
      } else {
        // Free mint path - skip payment entirely
        toast.success("Free mint - processing...");
      }

      toast.info("Minting your subdomain...");

      const { data, error } = await supabase.functions.invoke("mint-subdomain", {
        body: { 
          subdomain, 
          walletAddress, 
          txHash: txHash || 'free-mint-' + Date.now() 
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success) {
        toast.success("Subdomain minted successfully!");
        window.dispatchEvent(new CustomEvent("domains-updated", { 
          detail: { txHash: txHash || 'free-mint-' + Date.now() } 
        }));
        onClose();
      } else {
        console.error('Mint failed:', data);
        throw new Error(data?.error || "Failed to mint subdomain.");
      }
    } catch (e: any) {
      console.error("Minting error:", e);
      toast.error(e?.message ?? "Failed to mint subdomain.");
    } finally {
      setIsMinting(false);
    }
  };

  // --------------------- render ---------------------

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-md mx-auto animate-in slide-in-from-right duration-500 fade-in max-h-[calc(100vh-100px)]">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        {/* Back Button - Top Left Corner */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 z-10 flex items-center gap-2 text-gray-900 dark:text-white hover:text-[#D4AF37] dark:hover:text-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>

        {/* Content */}
        <div className="p-4 pt-16 pb-4 flex flex-col items-center space-y-3">
          {/* Result Avatar */}
          <div className="w-24 h-24 flex items-center justify-center rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.6)] bg-white dark:bg-gray-800">
            <img
              src={resultAvatar || (ensLogoBlue as unknown as string)}
              alt="Name"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Subdomain Name */}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">{t('register')} {subdomain}</h2>

          {/* Registration Duration Selector */}
          <div className="w-full max-w-sm space-y-1">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleDecreaseYears}
                className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={registrationYears <= 1}
              >
                <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>

              <div className="text-center">
                <div className="text-3xl font-bold text-[#D4AF37]">
                  {registrationYears} {registrationYears > 1 ? t('years') : t('year')}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {registrationYears * 12} {t('month_registration')}
                </div>
              </div>

              <button
                onClick={handleIncreaseYears}
                className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={registrationYears >= 10}
              >
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Payment Method Toggle */}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full font-medium transition-all duration-200 text-sm",
                  paymentMethod === method.id
                    ? "bg-[#D4AF37] text-black shadow-md"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
                )}
              >
                {method.name}
              </button>
            ))}
          </div>

          {/* Price Display */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-4xl font-bold text-[#D4AF37]">
              {isLoadingPrices ? (
                <span className="text-xl">Loading...</span>
              ) : (
                <>
                  {paymentMethod === "USDC" && `$${grandTotal.toFixed(2)}`}
                  {paymentMethod === "ETH" && `${convertedPrice.toFixed(6)} ETH`}
                  {paymentMethod === "WLD" && `${convertedPrice.toFixed(4)} WLD`}
                </>
              )}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="w-full max-w-sm space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-center text-sm">{t('cost_breakdown')}</h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {registrationYears} {registrationYears > 1 ? t('years_registration') : t('year_registration')}
                </span>
                <span className="font-medium text-[#D4AF37]">
                  {domainPrice === 0 ? "FREE" : `$${(domainPrice * registrationYears).toFixed(2)}`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('network_fee')}</span>
                <span className="font-medium text-[#D4AF37]">${networkFeeUSD.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('expires')}</span>
                <span className="font-medium text-gray-900 dark:text-white">{getExpirationDate()}</span>
              </div>

              <Separator className="my-1" />

              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">{t('total')}</span>
                <span className="font-bold text-gray-900 dark:text-white">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Mint Now Button */}
            <Button
              onClick={handleMintNow}
              disabled={isMinting || (grandTotal > 0 && isLoadingPrices)}
              className="w-full mt-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold py-5 text-base disabled:opacity-50"
            >
              {isMinting ? "Minting..." : "Mint Now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubdomainMintModal;
