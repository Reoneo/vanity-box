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
import { MiniKit } from "@worldcoin/minikit-js";

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
  price: number; // kept for backwards compatibility (not used; price recalculated by length)
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

  const [registrationYears, setRegistrationYears] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("USDC");
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
    eth: 2500,
    wld: 2.0,
    usdc: 1.0,
  });
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [isMinting, setIsMinting] = useState(false);

  // Track MiniKit init so we don't double-init
  const miniKitReadyRef = useRef(false);

  // --- Helpers ---------------------------------------------------------------

  const initMiniKitIfNeeded = async () => {
    try {
      if (!miniKitReadyRef.current) {
        await MiniKit.init({
          app_id: import.meta.env.VITE_MINIKIT_APP_ID,
          // environment: import.meta.env.VITE_MINIKIT_ENV ?? 'production',
        });
        miniKitReadyRef.current = true;
      }

      // Ensure a connected user/wallet
      if (!MiniKit.user?.walletAddress) {
        await MiniKit.commandsAsync.connect();
      }
    } catch (e) {
      console.error("MiniKit init/connect failed:", e);
      throw new Error("Unable to connect to World App. Please try again.");
    }
  };

  const getSubdomainPrice = (fullSubdomain: string) => {
    const subdomainLabel = fullSubdomain.split(".")[0];

    // Free test
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

  // --- Effects ---------------------------------------------------------------

  // Dispatch events when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new Event("mint-window-open"));
      // Pre-initialize MiniKit when the modal opens for smoother UX
      initMiniKitIfNeeded().catch(() => {
        /* handled in initMiniKitIfNeeded */
      });
    } else {
      window.dispatchEvent(new Event("mint-window-close"));
    }
  }, [isOpen]);

  // Fetch real-time crypto prices on mount and poll every 60s
  useEffect(() => {
    let isMounted = true;

    const loadPrices = async () => {
      try {
        setIsLoadingPrices(true);
        const prices = await fetchCryptoPrices();
        if (isMounted) setCryptoPrices(prices);
      } catch (e) {
        console.error("Failed to fetch prices:", e);
      } finally {
        if (isMounted) setIsLoadingPrices(false);
      }
    };

    loadPrices();
    const interval = setInterval(loadPrices, 60_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // --- Pricing ---------------------------------------------------------------

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
  const totalPrice = domainPrice * registrationYears;
  const networkFee = domainPrice > 0 ? 0.5 : 0; // $0.50 on paid mints
  const grandTotal = totalPrice + networkFee;
  const convertedPrice = grandTotal * selectedMethod.rate;

  // --- Handlers --------------------------------------------------------------

  const handleIncreaseYears = () => {
    setRegistrationYears((prev) => Math.min(prev + 1, 10));
  };
  const handleDecreaseYears = () => {
    setRegistrationYears((prev) => Math.max(prev - 1, 1));
  };
  const getExpirationDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + registrationYears);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const handleMintNow = async () => {
    try {
      setIsMinting(true);

      // Avoid minting while prices are loading for paid flows
      if (grandTotal > 0 && isLoadingPrices) {
        toast.info("Fetching prices—please try again in a moment.");
        return;
      }

      // Ensure MiniKit is ready + user connected
      await initMiniKitIfNeeded();

      const walletAddress = MiniKit.user?.walletAddress;
      if (!walletAddress) {
        throw new Error("Please connect your wallet first.");
      }

      let txHash: string | undefined;

      if (grandTotal > 0) {
        toast.info("Processing payment...");

        // Use canonical symbols expected by MiniKit
        const tokenSymbol: PaymentMethod = paymentMethod; // 'USDC' | 'ETH' | 'WLD'

        const paymentPayload = {
          reference: `subdomain-${subdomain}-${Date.now()}`,
          to: "0x71ab0b01e3ff45551e25b208e2a90298f73f7040", // recipient
          tokens: [
            {
              symbol: tokenSymbol as any,
              token_amount: convertedPrice.toFixed(6), // keep precision for ETH; OK for USDC/WLD too
            },
          ],
          description: `Register ${subdomain} for ${registrationYears} year${registrationYears > 1 ? "s" : ""}`,
        };

        console.log("Initiating payment:", paymentPayload);

        try {
          const paymentResponse = await MiniKit.commandsAsync.pay(paymentPayload);

          if (!paymentResponse || !paymentResponse.finalPayload) {
            throw new Error("Payment was cancelled or failed to initialize.");
          }

          const { finalPayload } = paymentResponse;

          if (finalPayload.status === "success") {
            txHash = finalPayload.transaction_id;
            toast.success("Payment successful!");
          } else if (finalPayload.status === "cancelled") {
            throw new Error("Payment was cancelled.");
          } else {
            throw new Error("Payment failed.");
          }
        } catch (payError: any) {
          console.error("Payment error:", payError);
          const msg =
            typeof payError?.message === "string" && payError.message.toLowerCase().includes("cancel")
              ? "Payment was cancelled."
              : "Payment processing failed. Please try again.";
          throw new Error(msg);
        }
      } else {
        toast.success("Free mint - processing...");
      }

      toast.info("Minting your subdomain...");

      const { data, error } = await supabase.functions.invoke("mint-subdomain", {
        body: {
          subdomain,
          walletAddress,
          txHash, // undefined for free mints
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Subdomain minted successfully!");
        window.dispatchEvent(new CustomEvent("domains-updated"));
        onClose();
      } else {
        throw new Error(data?.error || "Failed to mint subdomain.");
      }
    } catch (error: any) {
      console.error("Minting error:", error);
      toast.error(error?.message ?? "Failed to mint subdomain.");
    } finally {
      setIsMinting(false);
    }
  };

  // --- Render ----------------------------------------------------------------

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-4 animate-in slide-in-from-right duration-500 fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#D4AF37] bg-[#D4AF37]">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-black hover:text-black/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <button className="flex items-center gap-2 text-black hover:text-black/80 transition-colors">
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Share</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col items-center space-y-6">
          {/* Result Avatar */}
          <div className="w-32 h-32 flex items-center justify-center rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.6)]">
            <img
              src={resultAvatar || (ensLogoBlue as unknown as string)}
              alt="Name"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Subdomain Name */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center">Register {subdomain}</h2>

          {/* Registration Duration Selector */}
          <div className="w-full max-w-sm space-y-2">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleDecreaseYears}
                className="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={registrationYears <= 1}
              >
                <Minus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              <div className="text-center">
                <div className="text-4xl font-bold text-[#D4AF37]">
                  {registrationYears} year{registrationYears > 1 ? "s" : ""}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {registrationYears * 12} Month Registration
                </div>
              </div>

              <button
                onClick={handleIncreaseYears}
                className="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={registrationYears >= 10}
              >
                <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Payment Method Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={cn(
                  "px-6 py-2 rounded-full font-medium transition-all duration-200",
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
          <div className="flex flex-col items-center gap-2">
            <div className="text-5xl font-bold text-[#D4AF37]">
              {isLoadingPrices ? (
                <span className="text-2xl">Loading...</span>
              ) : (
                <>
                  {paymentMethod === "USDC" && `$${grandTotal.toFixed(2)}`}
                  {paymentMethod === "ETH" && convertedPrice.toFixed(6)}
                  {paymentMethod === "WLD" && convertedPrice.toFixed(4)}
                </>
              )}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-center">Cost Breakdown:</h3>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Domain ({registrationYears} year{registrationYears > 1 ? "s" : ""})
                </span>
                <span className="font-medium text-[#D4AF37]">
                  {domainPrice === 0 ? "FREE" : `$${totalPrice.toFixed(2)}`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Network Fee (World Chain)</span>
                <span className="font-medium text[#D4AF37]">
                  {networkFee === 0 ? "FREE" : `$${networkFee.toFixed(2)}`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Expires</span>
                <span className="font-medium text-gray-900 dark:text-white">{getExpirationDate()}</span>
              </div>

              <Separator className="my-2" />

              <div className="flex items-center justify-between text-base">
                <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                <span className="font-bold text-gray-900 dark:text-white">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Mint Now Button */}
            <Button
              onClick={handleMintNow}
              disabled={isMinting || (grandTotal > 0 && isLoadingPrices)}
              className="w-full mt-4 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold py-6 text-lg disabled:opacity-50"
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
