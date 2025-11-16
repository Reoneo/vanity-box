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
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { callEdge } from "@/lib/supaInvoke";
import { setDefaultVanityRedirect } from "@/lib/ensRedirect/service";
import { fullEnsName } from "@/lib/ensRedirect/profile";
import { ensureReady, ensurePayPermission, safePay, sendHaptic, getMiniKitStatus } from "@/lib/minikit";
import { usePetraWallet } from "@/hooks/use-petra-wallet";

import usdcLogo from "@/assets/usdc-logo.png";
import ensLogoBlue from "@/assets/ens-logo-blue.png";
import wldLogoDark from "@/assets/wld-logo-dark.svg";
import wldLogoLight from "@/assets/wld-logo-light.png";
import aptosLogo from "@/assets/aptos-logo.png";

interface SubdomainMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: string;
  price: number; // kept for compatibility; actual price computed from length
  resultAvatar?: string;
  domain?: string; // e.g., "30315.eth", "teamxrp.eth", "termux.eth", "smith.cash"
}

type PaymentMethod = "USDC" | "WLD" | "APT";

type PaymentFlowStep = 
  | "idle" 
  | "checking_minikit" 
  | "connecting_wallet" 
  | "requesting_permission"
  | "preparing_payment"
  | "processing_payment" 
  | "verifying_payment"
  | "minting";

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
  const { account, connect, isConnected, isInstalled, signAndSubmitTransaction } = usePetraWallet();
  
  // Check if this is an Aptos domain
  const isAptosDomain = domain.toLowerCase().endsWith('.apt');

  const [registrationYears, setRegistrationYears] = useState(1);
  // Default payment method based on domain type
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    isAptosDomain ? "APT" : "USDC"
  );
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
    eth: 2600,
    wld: 1.85,
    usdc: 1.0,
    apt: 8.5, // Add APT price
  });
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [networkFeeUSD, setNetworkFeeUSD] = useState(0.15);
  
  // MiniKit status tracking
  const [miniKitStatus, setMiniKitStatus] = useState<"checking" | "ready" | "unavailable">("checking");
  const [miniKitError, setMiniKitError] = useState<string>("");
  
  // Wallet connection countdown
  const [walletConnectionTimeRemaining, setWalletConnectionTimeRemaining] = useState<number | null>(null);
  
  // Payment flow step tracking
  const [paymentFlowStep, setPaymentFlowStep] = useState<PaymentFlowStep>("idle");

  // avoid duplicate pay calls
  const payInFlightRef = useRef(false);
  const payInFlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Check MiniKit status on modal open
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new Event("mint-window-open"));
      
      // Check MiniKit availability
      setMiniKitStatus("checking");
      setMiniKitError("");
      
      const checkMiniKit = async () => {
        try {
          await ensureReady();
          const status = getMiniKitStatus();
          console.log("[Modal] MiniKit status on open:", status);
          setMiniKitStatus("ready");
          setMiniKitError("");
        } catch (e: any) {
          console.error("[Modal] MiniKit check failed:", e);
          setMiniKitStatus("unavailable");
          setMiniKitError(e?.message || "MiniKit not available");
        }
      };
      
      checkMiniKit();
    } else {
      window.dispatchEvent(new Event("mint-window-close"));
      // Reset payment lock when modal closes
      payInFlightRef.current = false;
      if (payInFlightTimeoutRef.current) {
        clearTimeout(payInFlightTimeoutRef.current);
        payInFlightTimeoutRef.current = null;
      }
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

  // Payment methods - conditional on domain type
  const paymentMethods = isAptosDomain 
    ? [
        {
          id: "APT" as PaymentMethod,
          name: "APT",
          icon: aptosLogo,
          rate: 1 / cryptoPrices.apt, // $ → APT
        },
        {
          id: "USDC" as PaymentMethod,
          name: "USDC",
          icon: usdcLogo,
          rate: 1, // $ → USDC (1:1)
        },
      ]
    : [
        {
          id: "USDC" as PaymentMethod,
          name: "USDC",
          icon: usdcLogo,
          rate: 1, // $ → USDC (1:1)
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

    // Route to appropriate minting flow
    if (isAptosDomain) {
      await handleAptosMint();
    } else {
      await handleWorldChainMint();
    }
  };

  const handleAptosMint = async () => {
    setIsMinting(true);
    
    try {
      // Check if Petra wallet is installed
      if (!isInstalled) {
        toast.error("Petra Wallet is not installed. Please install it to mint .apt domains.");
        return;
      }

      // Connect to Petra wallet if not connected
      if (!isConnected) {
        toast.info("Please connect your Petra wallet...");
        await connect();
      }

      if (!account?.address) {
        toast.error("Failed to connect to Petra wallet");
        return;
      }

      // Calculate payment amount
      const paymentAmountUSD = grandTotal;
      const paymentAmountCrypto = convertedPrice;
      
      // Determine which token to use and contract address
      const isUSDC = paymentMethod === "USDC";
      const tokenSymbol = isUSDC ? "USDC" : "APT";
      
      // Aptos USDC contract address (mainnet)
      const USDC_ADDRESS = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";
      
      // Payment receiver address (replace with your actual receiver address)
      const RECEIVER_ADDRESS = "0x742d35cc6634c0532925a3b844bc9e7de5c05b0f0000000000000000000000001"; // TODO: Replace with actual receiver
      
      toast.info(`Preparing ${tokenSymbol} payment of ${paymentAmountCrypto.toFixed(isUSDC ? 2 : 4)} ${tokenSymbol}...`);
      
      try {
        // Build transaction based on payment method
        let transaction;
        
        if (isUSDC) {
          // USDC transfer (using coin transfer for fungible assets)
          const amountInOctas = Math.floor(paymentAmountCrypto * 1_000_000); // USDC has 6 decimals
          
          transaction = {
            type: "entry_function_payload",
            function: "0x1::coin::transfer",
            type_arguments: [USDC_ADDRESS],
            arguments: [RECEIVER_ADDRESS, amountInOctas.toString()],
          };
        } else {
          // APT transfer (native token)
          const amountInOctas = Math.floor(paymentAmountCrypto * 100_000_000); // APT has 8 decimals
          
          transaction = {
            type: "entry_function_payload",
            function: "0x1::aptos_account::transfer",
            type_arguments: [],
            arguments: [RECEIVER_ADDRESS, amountInOctas.toString()],
          };
        }
        
        toast.info("Please approve the transaction in Petra Wallet...");
        
        // Sign and submit transaction using Petra wallet
        const txResponse = await signAndSubmitTransaction(transaction);
        
        console.log("[Aptos] Transaction submitted:", txResponse);
        toast.info("Transaction submitted! Waiting for confirmation...");
        
        // Wait a moment for transaction to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Call the edge function to register the subdomain
        toast.info("Registering your .apt subdomain...");
        const response = await callEdge<any>("mint-apt-subdomain", {
          subdomain,
          walletAddress: account.address,
          domain,
          registrationMonths: registrationYears * 12,
          paymentAmount: paymentAmountUSD,
          paymentMethod: tokenSymbol,
          txHash: txResponse.hash || txResponse,
        });

        if (response.success) {
          toast.success(`Successfully minted ${subdomain}!`);
          await sendHaptic("success");
          
          // Set default redirect
          const fullName = `${subdomain}.${domain}`;
          await setDefaultVanityRedirect(fullName, account.address);
          
          onClose();
        } else {
          toast.error("Failed to register .apt subdomain on-chain");
        }
      } catch (txError: any) {
        console.error("[Aptos] Transaction error:", txError);
        if (txError.message?.includes("User rejected")) {
          toast.error("Transaction rejected by user");
        } else {
          toast.error(txError.message || "Transaction failed");
        }
        throw txError;
      }
    } catch (error: any) {
      console.error("[Aptos Mint] Error:", error);
      toast.error(error.message || "Failed to mint .apt subdomain");
      await sendHaptic("error");
    } finally {
      setIsMinting(false);
    }
  };

  const handleWorldChainMint = async () => {

    setIsMinting(true);
    setPaymentFlowStep("checking_minikit");
    
    // Persist to localStorage for recovery
    localStorage.setItem('paymentFlowState', JSON.stringify({
      subdomain,
      paymentMethod,
      amount: convertedPrice,
      step: 'checking_minikit',
      timestamp: Date.now(),
    }));
    
    console.log("[PaymentFlow] Starting mint flow", { 
      subdomain, 
      paymentMethod, 
      amount: convertedPrice,
      isFree,
      registrationYears 
    });
    
    await sendHaptic("light");

    try {
      if (!isFree && isLoadingPrices) {
        setPaymentFlowStep("idle");
        localStorage.removeItem('paymentFlowState');
        toast.info("Fetching prices — try again in a moment.");
        return;
      }

      // Ensure MiniKit is ready
      console.log("[PaymentFlow] Step: checking_minikit");
      
      try {
        await ensureReady();
        const status = getMiniKitStatus();
        console.log("[PaymentFlow] MiniKit ready:", status);
      } catch (readyError: any) {
        setPaymentFlowStep("idle");
        localStorage.removeItem('paymentFlowState');
        
        const errorMsg = readyError?.message || "MiniKit not available";
        const isInWorldApp = typeof (window as any).WorldApp !== "undefined" || 
                            navigator.userAgent.includes("World App");
        
        if (isInWorldApp) {
          toast.error("Failed to connect to World App. Please close and reopen this mini app. [ERR_MINIKIT_INIT_FAILED]", { duration: 8000 });
        } else {
          toast.error("Please open this app in World App to complete payment. [ERR_MINIKIT_NOT_INSTALLED]", { duration: 8000 });
        }
        return;
      }

      // 1) Ensure wallet connected (with 90s timeout and countdown)
      setPaymentFlowStep("connecting_wallet");
      localStorage.setItem('paymentFlowState', JSON.stringify({
        subdomain, paymentMethod, amount: convertedPrice,
        step: 'connecting_wallet', timestamp: Date.now()
      }));
      console.log("[PaymentFlow] Step: connecting_wallet");
      
      let walletAddress: string;
      try {
        toast.info("Please approve wallet connection in World App (90s)");
        
        // Start countdown timer
        setWalletConnectionTimeRemaining(90);
        const countdownInterval = setInterval(() => {
          setWalletConnectionTimeRemaining(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownInterval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
        
        walletAddress = await Promise.race([
          ensureWalletConnected(),
          new Promise<never>((_, reject) => 
            setTimeout(() => {
              clearInterval(countdownInterval);
              reject(new Error("Wallet connection timed out"));
            }, 90_000)
          ),
        ]);
        
        clearInterval(countdownInterval);
        setWalletConnectionTimeRemaining(null);
        console.log("[PaymentFlow] Wallet connected:", walletAddress);
        
      } catch (connError: any) {
        setWalletConnectionTimeRemaining(null);
        setPaymentFlowStep("idle");
        localStorage.removeItem('paymentFlowState');
        console.error("[PaymentFlow] Wallet connection failed:", connError);
        
        const isTimeout = connError?.message?.includes("timeout") || connError?.message?.includes("timed out");
        const errorMsg = isTimeout
          ? "Wallet connection timed out. Please approve the connection request in World App within 90 seconds. [ERR_WALLET_TIMEOUT]"
          : (connError?.message || "Failed to connect wallet. [ERR_WALLET_DENIED]");
          
        toast.error(errorMsg, { duration: 8000 });
        return;
      }

      // 2) Payments - World App payment flow with backend verification
      let txHash: string | undefined;

      if (!isFree) {
        if (payInFlightRef.current) {
          console.debug("[MiniKit] Payment already in flight, ignoring");
          toast.warning("Payment already in progress. Please wait...");
          return;
        }
        payInFlightRef.current = true;
        
        // Set 2-minute safety timeout for payment lock
        payInFlightTimeoutRef.current = setTimeout(() => {
          console.warn("[MiniKit] Payment lock timeout - resetting after 2 minutes");
          payInFlightRef.current = false;
          payInFlightTimeoutRef.current = null;
        }, 120_000);

        try {
          // Step 1: Initiate payment reference in backend
          setPaymentFlowStep("preparing_payment");
          localStorage.setItem('paymentFlowState', JSON.stringify({
            subdomain, paymentMethod, amount: convertedPrice,
            step: 'preparing_payment', timestamp: Date.now()
          }));
          console.log("[PaymentFlow] Step: preparing_payment");
          
          toast.info("Preparing payment...");
          const initResponse = await callEdge<{ reference: string }>("initiate-payment", {
            subdomain,
            domain,
            walletAddress,
            paymentAmount: convertedPrice,
            paymentMethod,
          });

          const { reference } = initResponse;
          console.log("[PaymentFlow] Payment reference created:", reference);

          // Step 2: Request payment permission
          setPaymentFlowStep("requesting_permission");
          localStorage.setItem('paymentFlowState', JSON.stringify({
            subdomain, paymentMethod, amount: convertedPrice, reference,
            step: 'requesting_permission', timestamp: Date.now()
          }));
          console.log("[PaymentFlow] Step: requesting_permission");
          
          toast.info("Requesting payment permission...");
          try {
            await ensurePayPermission();
            console.log("[PaymentFlow] Permission granted");
          } catch (permError: any) {
            setPaymentFlowStep("idle");
            localStorage.removeItem('paymentFlowState');
            console.error("[PaymentFlow] Permission denied:", permError);
            toast.error("Payment permission required. Please enable 'Pay' permission in World App settings. [ERR_PERMISSION_DENIED]", { duration: 8000 });
            return;
          }

          // Step 3: Execute payment via World App
          setPaymentFlowStep("processing_payment");
          localStorage.setItem('paymentFlowState', JSON.stringify({
            subdomain, paymentMethod, amount: convertedPrice, reference,
            step: 'processing_payment', timestamp: Date.now()
          }));
          
          // Build payment payload using tokenToDecimals
          let tokenSymbol: any;
          let tokenAmount: string;
          
          if (paymentMethod === "USDC") {
            tokenSymbol = Tokens.USDC;
            tokenAmount = tokenToDecimals(convertedPrice, Tokens.USDC).toString();
          } else if (paymentMethod === "WLD") {
            tokenSymbol = Tokens.WLD;
            tokenAmount = tokenToDecimals(convertedPrice, Tokens.WLD).toString();
          } else {
            // This shouldn't happen since ETH is removed
            throw new Error("Unsupported payment method");
          }

          const paymentPayload: any = {
            reference, // Use backend-generated reference
            to: "0x71ab0b01e3ff45551e25b208e2a90298f73f7040",
            tokens: [{ symbol: tokenSymbol, token_amount: tokenAmount }],
            description: `Register ${subdomain} for ${registrationYears} ${
              registrationYears > 1 ? t("years") : t("year")
            }`,
          };

          console.log("[PaymentFlow] Step: processing_payment", { paymentMethod, tokenAmount, reference });

          const paymentToast = toast.info("Opening World App payment...");
          const transactionId = await safePay(paymentPayload, 20000);
          console.log("[PaymentFlow] Transaction ID received:", transactionId);

          toast.dismiss(paymentToast);

          // Step 4: Verify payment with backend
          setPaymentFlowStep("verifying_payment");
          localStorage.setItem('paymentFlowState', JSON.stringify({
            subdomain, paymentMethod, amount: convertedPrice, reference, transactionId,
            step: 'verifying_payment', timestamp: Date.now()
          }));
          console.log("[PaymentFlow] Step: verifying_payment", { transactionId, reference });
          
          const verifyToast = toast.info("Verifying payment on blockchain...");
          
          try {
            const verifyResponse = await callEdge<{ success: boolean; txHash: string }>("verify-payment", {
              transactionId,
              reference,
            });

            if (!verifyResponse.success) {
              throw new Error("Payment verification failed");
            }

            txHash = verifyResponse.txHash;
            console.log("[PaymentFlow] Payment verified, txHash:", txHash);

            toast.dismiss(verifyToast);
            toast.success(`${paymentMethod} payment verified!`);
            await sendHaptic("success");

            // Persist txHash
            const txMap = JSON.parse(localStorage.getItem("txMap") || "{}");
            txMap[subdomain.toLowerCase()] = txHash;
            localStorage.setItem("txMap", JSON.stringify(txMap));

          } catch (verifyErr: any) {
            setPaymentFlowStep("idle");
            localStorage.removeItem('paymentFlowState');
            toast.dismiss(verifyToast);
            console.error("[PaymentFlow] Verification failed:", verifyErr);
            toast.error(`Payment verification failed. Your payment may still be processing. Reference: ${reference} [ERR_VERIFICATION_FAILED]`, { duration: 10000 });
            return;
          }

        } catch (payErr: any) {
          console.error("[Mint] Payment error details:", {
            error: payErr,
            message: payErr?.message,
            subdomain,
            paymentMethod,
            amount: convertedPrice,
            timestamp: new Date().toISOString(),
          });
          
          let msg = "Payment processing failed. [ERR_PAYMENT_FAILED]";
          let errorCode = "ERR_PAYMENT_FAILED";
          
          if (typeof payErr?.message === "string") {
            if (payErr.message.includes("timeout") || payErr.message.includes("taking longer") || payErr.message.includes("in progress")) {
              msg = "Payment confirmation in progress. Check World App to complete, then return here. [ERR_PAYMENT_TIMEOUT]";
              errorCode = "ERR_PAYMENT_TIMEOUT";
            } else if (payErr.message.includes("canceled") || payErr.message.includes("denied")) {
              msg = "Payment was canceled. Please try again when ready. [ERR_PAYMENT_CANCELED]";
              errorCode = "ERR_PAYMENT_CANCELED";
            } else if (payErr.message.includes("permission")) {
              msg = "Payment permission required. Please grant access in World App. [ERR_PERMISSION_DENIED]";
              errorCode = "ERR_PERMISSION_DENIED";
            } else if (payErr.message.includes("whitelist")) {
              msg = "Payment address not whitelisted. Please contact support. [ERR_WHITELIST]";
              errorCode = "ERR_WHITELIST";
            } else {
              msg = payErr.message + " [ERR_PAYMENT_FAILED]";
            }
          }
          
          console.error(`[Mint] Payment failed with error code: ${errorCode}`);
          toast.error(msg, { duration: 8000 });
          await sendHaptic("error");
          return;
        } finally {
          payInFlightRef.current = false;
          if (payInFlightTimeoutRef.current) {
            clearTimeout(payInFlightTimeoutRef.current);
            payInFlightTimeoutRef.current = null;
          }
        }
      } else {
        txHash = "free-mint-" + Date.now();
        toast.success("Free mint - processing...");
      }

      // 3) Call Edge Function to mint
      setPaymentFlowStep("minting");
      localStorage.setItem('paymentFlowState', JSON.stringify({
        subdomain, paymentMethod, amount: convertedPrice, txHash,
        step: 'minting', timestamp: Date.now()
      }));
      console.log("[PaymentFlow] Step: minting", { subdomain, walletAddress, txHash });
      
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

        console.log("[PaymentFlow] Mint successful:", data);
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

        // Auto-set default Vanity redirect
        try {
          const redirectResult = await setDefaultVanityRedirect(domain || "", subdomain);
          if (redirectResult.success) {
            console.log("Default redirect set:", redirectResult);
            toast.success(`Redirect set to ${fullEnsName(subdomain, domain || "")} Vanity profile`, {
              duration: 5000,
            });
          }
        } catch (redirectErr: any) {
          console.error("Failed to set redirect:", redirectErr);
          toast.info("Minted successfully! You can set redirect in My IDs.", {
            duration: 5000,
          });
        }
        
        setPaymentFlowStep("idle");
        localStorage.removeItem('paymentFlowState');
        onClose();

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("show-my-ids"));
        }, 500);
      } catch (mintErr: any) {
        setPaymentFlowStep("idle");
        localStorage.removeItem('paymentFlowState');
        console.error("[PaymentFlow] Mint failed:", mintErr);
        toast.dismiss(mintingToast);
        throw mintErr;
      }
    } catch (e: any) {
      console.error("[Mint] Top-level error:", {
        error: e,
        message: e?.message,
        stack: e?.stack,
        subdomain,
        timestamp: new Date().toISOString(),
      });
      
      let errorMsg = "Failed to mint subdomain. [ERR_MINT_FAILED]";
      if (e?.message && !e.message.includes("[ERR_")) {
        errorMsg = e.message + " [ERR_MINT_FAILED]";
      } else if (e?.message) {
        errorMsg = e.message;
      }
      
      toast.error(errorMsg, { duration: 8000 });
    } finally {
      setIsMinting(false);
      setPaymentFlowStep("idle");
      setWalletConnectionTimeRemaining(null);
      localStorage.removeItem('paymentFlowState');
      payInFlightRef.current = false;
      if (payInFlightTimeoutRef.current) {
        clearTimeout(payInFlightTimeoutRef.current);
        payInFlightTimeoutRef.current = null;
      }
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
        
        {/* MiniKit Status Badge */}
        {miniKitStatus === "unavailable" && (
          <div className="absolute top-6 right-6 z-10 flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900 rounded-full cursor-pointer" onClick={async () => {
            setMiniKitStatus("checking");
            try {
              await ensureReady();
              setMiniKitStatus("ready");
              setMiniKitError("");
            } catch (e: any) {
              setMiniKitStatus("unavailable");
              setMiniKitError(e?.message || "MiniKit not available");
            }
          }}>
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">Refresh</span>
          </div>
        )}
        
        
        {/* Wallet Connection Timer with Cancel Button */}
        {walletConnectionTimeRemaining !== null && (
          <div className="absolute top-20 left-0 right-0 z-10 flex flex-col items-center gap-2">
            <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Waiting for wallet approval... ({walletConnectionTimeRemaining}s)
              </span>
            </div>
            {walletConnectionTimeRemaining < 60 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setWalletConnectionTimeRemaining(null);
                  setIsMinting(false);
                  setPaymentFlowStep("idle");
                  toast.info("Wallet connection canceled. Click Mint Now to try again.");
                }}
                className="text-xs hover:bg-white/10"
              >
                Cancel & Retry
              </Button>
            )}
          </div>
        )}

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
                {paymentMethod === "WLD" && `${convertedPrice.toFixed(4)} WLD`}
                {paymentMethod === "APT" && `${convertedPrice.toFixed(4)} APT`}
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
                <span className="text-gray-600 dark:text-gray-400">
                  {t("network_fee")} ({isAptosDomain ? "Aptos" : "World Chain"})
                </span>
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
              disabled={
                isMinting || 
                (isAptosDomain ? (!isInstalled || !isConnected) : (miniKitStatus === "unavailable" || miniKitStatus === "checking"))
              }
              className="w-full mt-3 bg-gradient-to-r from-[#D4AF37] to-[#F2D574] hover:from-[#C9A532] hover:to-[#E8C760] text-black font-bold text-lg h-14 rounded-full shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMinting 
                ? "Processing..." 
                : isAptosDomain
                  ? (!isInstalled ? "Install Petra Wallet" : !isConnected ? "Connect Petra Wallet" : "Mint Now")
                  : miniKitStatus === "unavailable" 
                    ? "Open in World App to Mint"
                    : miniKitStatus === "checking"
                      ? "Checking World App..."
                      : "Mint Now"}
            </Button>
          </div>
        </div>
        
        {/* Payment Flow Step Indicator */}
        {paymentFlowStep !== "idle" && (
          <div className="absolute bottom-24 left-4 right-4 z-20">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {paymentFlowStep === "checking_minikit" && "Checking World App..."}
                    {paymentFlowStep === "connecting_wallet" && "Connecting wallet..."}
                    {paymentFlowStep === "requesting_permission" && "Requesting payment permission..."}
                    {paymentFlowStep === "preparing_payment" && "Preparing payment..."}
                    {paymentFlowStep === "processing_payment" && "Processing payment..."}
                    {paymentFlowStep === "verifying_payment" && "Verifying on blockchain..."}
                    {paymentFlowStep === "minting" && "Minting subdomain..."}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {paymentFlowStep === "connecting_wallet" && "Approve in World App"}
                    {paymentFlowStep === "requesting_permission" && "Grant pay permission"}
                    {paymentFlowStep === "processing_payment" && "Check World App to complete"}
                    {paymentFlowStep === "verifying_payment" && "This may take a few seconds..."}
                    {paymentFlowStep === "minting" && "Almost done!"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubdomainMintModal;
