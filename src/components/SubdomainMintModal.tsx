// src/components/SubdomainMintModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { fetchCryptoPrices, CryptoPrices } from "@/utils/cryptoPrices";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { MiniKit, Tokens } from "@worldcoin/minikit-js";
import { callEdge } from "@/lib/supaInvoke";
import { ensureReady, ensurePayPermission, safePay, sendHaptic } from "@/lib/minikit";

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
  domain?: string; // e.g., "30315.eth", "teamxrp.eth", "termux.eth", "smith.cash"
}

type PaymentMethod = "USDC" | "ETH" | "WLD";

export const SubdomainMintModal: React.FC<SubdomainMintModalProps> = ({
  isOpen,
  onClose,
  subdomain,
  price, // eslint-disable-line @typescript-eslint/no-unused-vars
  resultAvatar,
  domain = "smith.cash",
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const [registrationYears, setRegistrationYears] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("USDC");
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
    eth: 2600,
    wld: 1.85,
    usdc: 1.0,
  });
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [networkFeeUSD, setNetworkFeeUSD] = useState(0.15);

  // avoid duplicate pay calls
  const payInFlightRef = useRef(false);

  // free-mint threshold
  const EPSILON_FREE_USD = 0.01;

  // ---------- helpers ----------

  const ensureWalletConnected = async (): Promise<string> => {
    try {
      if (MiniKit.user?.walletAddress) {
        console.debug("[MiniKit] Wallet already connected:", MiniKit.user.walletAddress);
        return MiniKit.user.walletAddress;
      }

      console.debug("[MiniKit] Initiating walletAuth…");

      const authResult = await MiniKit.commandsAsync.walletAuth({
        nonce: Date.now().toString(),
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(Date.now() - 60 * 1000),
        statement: "Connect your wallet to mint subdomains",
      });

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
    // test321 is free for all domains
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

  // ---------- effects ----------

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new Event("mint-window-open"));
    } else {
      window.dispatchEvent(new Event("mint-window-close"));
    }
  }, [isOpen]);

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
        const { calculateNetworkFee } = await import("@/utils/worldChainGas");
        const fee = await calculateNetworkFee(150000);
        if (mounted) setNetworkFeeUSD(fee);
      } catch (error) {
        console.error("Failed to fetch network fee:", error);
        if (mounted) setNetworkFeeUSD(0.15);
      }
    };

    load();
    loadNetworkFee();

    const priceInterval = setInterval(load, 60_000);
    const feeInterval = setInterval(loadNetworkFee, 30_000);

    return () => {
      mounted = false;
      clearInterval(priceInterval);
      clearInterval(feeInterval);
    };
  }, []);

  // ---------- pricing ----------

  const paymentMethods = [
    {
      id: "USDC" as PaymentMethod,
      name: "USDC",
      icon: usdcLogo,
      rate: 1, // $ → USDC (1:1)
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

  const subdomainLabel = subdomain.split(".")[0];
  const effectiveNetworkFee = subdomainLabel.toLowerCase() === "test321" ? 0 : networkFeeUSD;

  const totalPrice = domainPrice * registrationYears + effectiveNetworkFee;
  const grandTotal = totalPrice;

  const convertedPrice = paymentMethod === "USDC" ? grandTotal : grandTotal * selectedMethod.rate;

  const isFree = grandTotal < EPSILON_FREE_USD;

  // ---------- handlers ----------

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

  // parse error context from Supabase invoke
  const extractInvokeError = (err: any): string => {
    const ctx = err?.context;
    if (typeof ctx === "string" && ctx.length) {
      try {
        const parsed = JSON.parse(ctx);
        if (parsed?.error) return String(parsed.error);
        return ctx;
      } catch {
        return ctx; // plain text from function
      }
    }
    if (typeof err?.message === "string" && err.message.length) {
      return err.message;
    }
    return "Mint failed (unknown error).";
  };

  const handleMintNow = async () => {
    if (isMinting) {
      console.debug("[Mint] Already minting, ignoring duplicate click");
      return;
    }

    setIsMinting(true);
    await sendHaptic("light");

    try {
      if (!isFree && isLoadingPrices) {
        toast.info("Fetching prices — try again in a moment.");
        return;
      }

      // Ensure MiniKit is ready
      await ensureReady();

      // 1) Ensure wallet connected (with timeout)
      let walletAddress: string;
      try {
        walletAddress = await Promise.race([
          ensureWalletConnected(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Wallet connection timeout")), 30_000)),
        ]);
      } catch (connError: any) {
        console.error("[Mint] Wallet connection error:", connError);
        toast.error(connError?.message || "Failed to connect wallet. Please try again.");
        return;
      }

      // 2) Payments - unified flow for all tokens
      let txHash: string | undefined;

      if (!isFree) {
        if (payInFlightRef.current) {
          console.debug("[MiniKit] Payment already in flight, ignoring");
          return;
        }
        payInFlightRef.current = true;

        try {
          // Request and verify payment permission
          toast.info("Requesting payment permission...");
          try {
            await ensurePayPermission();
          } catch (permError: any) {
            console.error("[Mint] Permission denied:", permError);
            toast.error("Payment permission required. Please grant access in World App.");
            return;
          }

          const paymentToast = toast.info("Processing payment…");

          // Unified Pay command - use exact SDK Token enums and proper token amounts
          let tokenSymbol: any;
          let tokenAmount: string;
          
          if (paymentMethod === "USDC") {
            tokenSymbol = Tokens.USDC;
            // USDC has 6 decimals, convert to smallest unit
            const usdcDecimals = 6;
            const amountInSmallestUnit = Math.floor(convertedPrice * Math.pow(10, usdcDecimals));
            tokenAmount = amountInSmallestUnit.toString();
          } else if (paymentMethod === "WLD") {
            tokenSymbol = Tokens.WLD;
            // WLD has 18 decimals, convert to smallest unit  
            const wldDecimals = 18;
            const amountInSmallestUnit = Math.floor(convertedPrice * Math.pow(10, wldDecimals));
            tokenAmount = amountInSmallestUnit.toString();
          } else {
            tokenSymbol = (Tokens as any).ETH ?? "ETH";
            // ETH has 18 decimals, convert to smallest unit
            const ethDecimals = 18;
            const amountInSmallestUnit = Math.floor(convertedPrice * Math.pow(10, ethDecimals));
            tokenAmount = amountInSmallestUnit.toString();
          }

          const paymentPayload: any = {
            reference: `${subdomain}-${walletAddress.slice(0, 6)}-${Date.now()}`,
            to: "0x71ab0b01e3ff45551e25b208e2a90298f73f7040",
            tokens: [{ symbol: tokenSymbol, token_amount: tokenAmount }],
            description: `Register ${subdomain} for ${registrationYears} ${
              registrationYears > 1 ? t("years") : t("year")
            }`,
          };

          console.log("[Payment] Initiating:", { paymentMethod, tokenAmount, payload: paymentPayload });

          // Use safePay with 8s timeout
          txHash = await safePay(paymentPayload, 8000);

          toast.dismiss(paymentToast);
          toast.success(`${paymentMethod} payment successful!`);
          await sendHaptic("success");

          // Persist txHash immediately
          const txMap = JSON.parse(localStorage.getItem("txMap") || "{}");
          txMap[subdomain.toLowerCase()] = txHash;
          localStorage.setItem("txMap", JSON.stringify(txMap));

        } catch (payErr: any) {
          console.error("[Mint] Payment error details:", payErr);
          
          let msg = "Payment processing failed. Please try again.";
          
          if (typeof payErr?.message === "string") {
            if (payErr.message.includes("timeout") || payErr.message.includes("taking longer") || payErr.message.includes("in progress")) {
              msg = "Payment confirmation in progress. Check World App to complete, then return here.";
            } else if (payErr.message.includes("canceled") || payErr.message.includes("denied")) {
              msg = "Payment was canceled. Please try again when ready.";
            } else if (payErr.message.includes("permission")) {
              msg = "Payment permission required. Please grant access in World App.";
            } else {
              msg = payErr.message;
            }
          }
          
          toast.error(msg, { duration: 6000 });
          await sendHaptic("error");
          return;
        } finally {
          payInFlightRef.current = false;
        }
      } else {
        txHash = "free-mint-" + Date.now();
        toast.success("Free mint - processing...");
      }

      // 3) Call Edge Function to mint
      const mintingToast = toast.info("Minting your subdomain…");

      try {
        const data = await Promise.race([
          callEdge<any>("mint-subdomain", {
            subdomain,
            walletAddress,
            txHash: txHash || "free-mint-" + Date.now(),
            domain,
            registrationMonths: registrationYears * 12,
            paymentMethod,
            paymentAmount: convertedPrice,
            networkFee: effectiveNetworkFee,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Minting timeout - please check My IDs in a moment")), 45_000),
          ),
        ]);

        // The echo function returns { ok: true, received: {...} }
        if (!data?.ok) {
          throw new Error(data?.error || "Mint function returned not-ok");
        }

        toast.dismiss(mintingToast);
        toast.success("Subdomain minted successfully!");

        // persist txHash
        const txMap = JSON.parse(localStorage.getItem("txMap") || "{}");
        txMap[subdomain.toLowerCase()] = txHash;
        localStorage.setItem("txMap", JSON.stringify(txMap));

        window.dispatchEvent(
          new CustomEvent("domains-updated", {
            detail: { subdomain, txHash },
          }),
        );
        onClose();

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("show-my-ids"));
        }, 500);
      } catch (mintErr: any) {
        toast.dismiss(mintingToast);
        throw mintErr;
      }
    } catch (e: any) {
      console.error("Minting error:", e);
      const errorMsg = e?.message || "Failed to mint subdomain. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsMinting(false);
      payInFlightRef.current = false;
    }
  };

  // ---------- render ----------

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-md mx-auto animate-in slide-in-from-right duration-500 fade-in max-h-[calc(100vh-100px)]">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        {/* Back */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 z-10 flex items-center gap-2 text-gray-900 dark:text-white hover:text-[#D4AF37] dark:hover:text-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>

        <div className="p-4 pt-16 pb-4 flex flex-col items-center space-y-3">
          {/* Avatar */}
          <div className="w-24 h-24 flex items-center justify-center rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.6)] bg-white dark:bg-gray-800">
            <img
              src={resultAvatar || (ensLogoBlue as unknown as string)}
              alt="Name"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
            {t("register")} {subdomain}
          </h2>

          {/* Years */}
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
                <div className="text-3xl font-bold text-[#D4AF37]">{registrationYears}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {registrationYears === 1 ? t("year") : t("years")}
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

          {/* Payment toggle */}
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

          {/* Price */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-4xl font-bold text-[#D4AF37]">
              <>
                {paymentMethod === "USDC" && `${convertedPrice.toFixed(2)} USDC`}
                {paymentMethod === "ETH" && `${convertedPrice.toFixed(6)} ETH`}
                {paymentMethod === "WLD" && `${convertedPrice.toFixed(4)} WLD`}
              </>
            </div>
            {isLoadingPrices && <div className="text-xs text-gray-500">Updating prices…</div>}
          </div>

          {/* Breakdown */}
          <div className="w-full max-w-sm space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-center text-sm">{t("cost_breakdown")}</h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {registrationYears} {registrationYears > 1 ? t("years") : t("year")}
                </span>
                <span className="font-medium text-[#D4AF37]">${(domainPrice * registrationYears).toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t("network_fee")} (World Chain)</span>
                <span className="font-medium text-[#D4AF37]">
                  {effectiveNetworkFee === 0
                    ? "FREE"
                    : effectiveNetworkFee < 0.03
                      ? "< $0.03"
                      : `$${effectiveNetworkFee.toFixed(2)}`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t("expires")}</span>
                <span className="font-medium text-gray-900 dark:text-white">{getExpirationDate()}</span>
              </div>

              <Separator className="my-1" />

              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">{t("total")}</span>
                <span className="font-bold text-gray-900 dark:text-white">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={handleMintNow}
              disabled={isMinting}
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
