// src/components/SubdomainMintModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { CryptoPrices } from "@/utils/cryptoPrices";
import { useCryptoPrices } from "@/contexts/CryptoPriceContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { callEdge } from "@/lib/supaInvoke";
import { setDefaultVanityRedirect } from "@/lib/ensRedirect/service";
import { fullEnsName } from "@/lib/ensRedirect/profile";
import { ensureReady, safePay, sendHaptic, getMiniKitStatus } from "@/lib/minikit";
import { usePetraWallet } from "@/hooks/use-petra-wallet";
import { isTelegramWebView } from "@/lib/telegram";
import { useWalletConnect } from "@/contexts/WalletConnectContext";
import { useSendTransaction, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, parseUnits, erc20Abi } from "viem";

import usdcLogo from "@/assets/usdc-logo.png";
import ensLogoBlue from "@/assets/ens-logo-blue.png";
import wldLogoDark from "@/assets/wld-logo-dark.svg";
import wldLogoLight from "@/assets/wld-logo-light.png";
import ethLogoDark from "@/assets/eth-logo-dark.png";
import ethLogoLight from "@/assets/eth-logo-light.png";
import aptosLogo from "@/assets/aptos-logo.png";

interface SubdomainMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: string;
  price: number; // kept for compatibility; actual price computed from length
  resultAvatar?: string;
  domain?: string; // e.g., "30315.eth", "teamxrp.eth", "termux.eth", "smith.cash"
}

type PaymentMethod = "USDC" | "WLD" | "ETH" | "APT";

type PaymentFlowStep = 
  | "idle" 
  | "checking_minikit" 
  | "connecting_wallet" 
  | "preparing_payment"
  | "processing_payment" 
  | "verifying_payment"
  | "minting";

// USDC contract addresses per chain
const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',     // Ethereum Mainnet
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',   // Polygon
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',    // Optimism
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // Base
  56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',    // BSC (18 decimals)
  43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
  480: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1',   // World Chain
};

// USDC decimals per chain (most are 6, BSC is 18)
const USDC_DECIMALS: Record<number, number> = {
  1: 6, 137: 6, 42161: 6, 10: 6, 8453: 6, 56: 18, 43114: 6, 480: 6,
};

const PAYMENT_RECEIVER = '0x71ab0b01e3ff45551e25b208e2a90298f73f7040' as `0x${string}`;

// Chain name helper
const getChainName = (id: number | null): string => {
  const names: Record<number, string> = {
    1: 'Ethereum', 137: 'Polygon', 42161: 'Arbitrum', 10: 'Optimism',
    8453: 'Base', 56: 'BSC', 43114: 'Avalanche', 480: 'World Chain',
  };
  return names[id || 0] || 'Unknown';
};

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
  const { account, connect, isConnected: isPetraConnected, isInstalled, signAndSubmitTransaction } = usePetraWallet();
  const { prices: cryptoPrices, isLoading: isLoadingPrices } = useCryptoPrices();
  
  // EVM wallet connection via RainbowKit/wagmi
  const { isConnected: isEvmWalletConnected, address: evmAddress, chainId, openModal: openWalletModal } = useWalletConnect();
  
  // Wagmi hooks for browser wallet transactions
  const { sendTransactionAsync, isPending: isSendingEth } = useSendTransaction();
  const { writeContractAsync, isPending: isWritingContract } = useWriteContract();
  
  // Check if this is an Aptos domain
  const isAptosDomain = domain.toLowerCase().endsWith('.apt');

  const [registrationYears, setRegistrationYears] = useState(1);
  // Default payment method based on domain type
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    isAptosDomain ? "APT" : "USDC"
  );
  const [isMinting, setIsMinting] = useState(false);
  const [networkFeeUSD, setNetworkFeeUSD] = useState(0.15);
  
  // Aptos wallet balance states
  const [aptBalance, setAptBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
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

  // Load Aptos wallet balance when connected
  useEffect(() => {
    const loadAptosBalance = async () => {
      if (!isAptosDomain || !isPetraConnected || !account?.address) {
        return;
      }

      setIsLoadingBalance(true);
      try {
        // Call edge function to get balance
        const balanceData = await callEdge<any>("get-aptos-balance", {
          address: account.address,
        });

        if (balanceData.success) {
          setAptBalance(balanceData.aptBalance || 0);
          setUsdcBalance(balanceData.usdcBalance || 0);
        }
      } catch (error) {
        console.error("[Aptos] Failed to load balance:", error);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    loadAptosBalance();
  }, [isAptosDomain, isPetraConnected, account?.address]);

  // Set network fee based on domain type
  useEffect(() => {
    if (isAptosDomain) {
      setNetworkFeeUSD(0.001);
    } else {
      setNetworkFeeUSD(0.15);
    }
  }, [isAptosDomain]);

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
          id: "ETH" as PaymentMethod,
          name: "ETH",
          icon: theme === "dark" ? ethLogoDark : ethLogoLight,
          rate: 1 / cryptoPrices.eth, // $ → ETH
        },
      ];

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethod)!;
  
  const subdomainLabel = subdomain.split(".")[0];
  
  // Make test321 completely free for testing
  const isTestSubdomain = subdomainLabel.toLowerCase() === "test321";
  const baseDomainPrice = isTestSubdomain ? 0 : getSubdomainPrice(subdomain);
  const domainPrice = baseDomainPrice;
  
  const effectiveNetworkFee = isTestSubdomain ? 0 : networkFeeUSD;

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
    } else if (isEvmWalletConnected && evmAddress) {
      // Browser wallet connected - use wagmi for EVM payment
      await handleBrowserWalletMint();
    } else if (miniKitStatus === "ready") {
      // In World App - use MiniKit
      await handleWorldChainMint();
    } else {
      // No wallet connected - prompt to connect
      toast.info("Please connect a wallet to continue");
      openWalletModal();
    }
  };

  const handleAptosMint = async () => {
    setIsMinting(true);
    
    try {
      // Check if Petra wallet is installed
      if (!isInstalled) {
        toast.error("Petra Wallet is not installed. Please install it from petra.app");
        window.open("https://petra.app/", "_blank");
        return;
      }

      // Connect to Petra wallet if not connected
      if (!isPetraConnected) {
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
      
      // Check if user has sufficient balance
      const currentBalance = isUSDC ? usdcBalance : aptBalance;
      if (currentBalance !== null && currentBalance < paymentAmountCrypto) {
        toast.error(`Insufficient ${tokenSymbol} balance. You have ${currentBalance.toFixed(4)} ${tokenSymbol} but need ${paymentAmountCrypto.toFixed(4)} ${tokenSymbol}`);
        return;
      }
      
      // Aptos USDC contract address (mainnet)
      const USDC_ADDRESS = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";
      
      // Payment receiver address
      const RECEIVER_ADDRESS = "0x71ab0b01e3ff45551e25b208e2a90298f73f7040";
      
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
        
        toast.info(`Please approve the transaction in Petra Wallet...`, { duration: 10000 });
        
        // Sign and submit transaction using Petra wallet
        const txResponse = await signAndSubmitTransaction(transaction);
        
        console.log("[Aptos] Transaction submitted:", txResponse);
        toast.success("Payment transaction confirmed!");
        
        // Show minting progress
        const mintingToast = toast.loading("Registering your .apt subdomain on-chain...");
        
        // Wait a moment for transaction to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Call the edge function to register the subdomain
        const response = await callEdge<any>("mint-apt-subdomain", {
          subdomain,
          walletAddress: account.address,
          domain,
          registrationMonths: registrationYears * 12,
          paymentAmount: paymentAmountUSD,
          paymentMethod: tokenSymbol,
          txHash: txResponse.hash || txResponse,
        });

        toast.dismiss(mintingToast);

        if (response.success) {
          toast.success(`Successfully minted ${subdomain}! 🎉`, { duration: 5000 });
          await sendHaptic("success");
          
          // Set default redirect with proper error handling
          try {
            const redirectResult = await setDefaultVanityRedirect(domain, subdomain);
            if (redirectResult.success) {
              console.log("APT redirect set:", redirectResult);
              toast.success(`Redirect set to ${subdomain}.${domain} Vanity profile`, {
                duration: 5000,
              });
            }
          } catch (redirectErr: any) {
            console.error("Failed to set APT redirect:", redirectErr);
            toast.info("Minted successfully! You can set redirect in My IDs.", {
              duration: 5000,
            });
          }
          
          // Show transaction details
          if (txResponse.hash) {
            toast.info(
              <div>
                Transaction: <a href={`https://explorer.aptoslabs.com/txn/${txResponse.hash}?network=mainnet`} target="_blank" rel="noopener noreferrer" className="underline">View on Explorer</a>
              </div>,
              { duration: 10000 }
            );
          }
          
          onClose();
        } else {
          toast.error("Failed to register .apt subdomain on-chain");
        }
      } catch (txError: any) {
        console.error("[Aptos] Transaction error:", txError);
        if (txError.message?.includes("User rejected") || txError.message?.includes("User canceled")) {
          toast.error("Transaction cancelled by user");
        } else if (txError.message?.includes("Insufficient balance")) {
          toast.error("Insufficient balance to complete transaction");
        } else {
          toast.error(txError.message || "Transaction failed. Please try again.");
        }
        throw txError;
      }
    } catch (error: any) {
      console.error("[Aptos Mint] Error:", error);
      if (!error.message?.includes("cancelled") && !error.message?.includes("rejected")) {
        toast.error(error.message || "Failed to mint .apt subdomain");
      }
      await sendHaptic("error");
    } finally {
      setIsMinting(false);
    }
  };

  // Browser wallet payment handler (MetaMask, Rainbow, etc.)
  const handleBrowserWalletMint = async () => {
    setIsMinting(true);
    setPaymentFlowStep("preparing_payment");
    
    console.log("[BrowserWallet] Starting mint flow", { 
      subdomain, 
      paymentMethod, 
      amount: convertedPrice,
      chainId,
      evmAddress,
      isFree,
    });
    
    try {
      if (!evmAddress || !chainId) {
        toast.error("Please connect your wallet first");
        openWalletModal();
        return;
      }
      
      // Check if USDC is supported on this chain
      const usdcAddress = USDC_ADDRESSES[chainId];
      
      if (paymentMethod === "USDC" && !usdcAddress) {
        toast.error(`USDC is not supported on ${getChainName(chainId)}. Please switch to a supported network or use ETH.`);
        return;
      }
      
      let txHash: string;
      
      if (isFree) {
        // Skip payment for free mints
        txHash = "free-mint-" + Date.now();
        toast.success("Free mint - processing...");
      } else if (paymentMethod === "ETH") {
        // Native ETH transfer
        setPaymentFlowStep("processing_payment");
        toast.info("Please confirm the ETH transaction in your wallet...", { duration: 30000 });
        
        // Convert USD amount to ETH (convertedPrice is already in ETH from rate calculation)
        const hash = await sendTransactionAsync({
          to: PAYMENT_RECEIVER,
          value: parseEther(convertedPrice.toFixed(18)),
        });
        
        txHash = hash;
        toast.success("ETH payment confirmed!");
        
      } else if (paymentMethod === "USDC") {
        // ERC20 USDC transfer
        setPaymentFlowStep("processing_payment");
        toast.info("Please confirm the USDC transfer in your wallet...", { duration: 30000 });
        
        const decimals = USDC_DECIMALS[chainId] || 6;
        const amount = parseUnits(convertedPrice.toFixed(decimals), decimals);
        
        const hash = await writeContractAsync({
          address: usdcAddress!,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [PAYMENT_RECEIVER, amount],
        } as any); // Type assertion needed for wagmi v2 with dynamic chain
        
        txHash = hash;
        toast.success("USDC payment confirmed!");
      } else {
        throw new Error("Unsupported payment method for browser wallet");
      }
      
      console.log("[BrowserWallet] Transaction hash:", txHash);
      
      // Call the mint edge function
      setPaymentFlowStep("minting");
      const mintingToast = toast.info("Minting your subdomain...");
      
      const data = await callEdge<any>("mint-subdomain", {
        subdomain,
        walletAddress: evmAddress,
        txHash,
        domain,
        registrationMonths: registrationYears * 12,
        paymentMethod,
        paymentAmount: convertedPrice,
        networkFee: effectiveNetworkFee,
        chainId,
      });
      
      toast.dismiss(mintingToast);
      
      if (data?.ok) {
        toast.success("Subdomain minted successfully! 🎉");
        await sendHaptic("success");
        
        // Persist txHash
        const txMap = JSON.parse(localStorage.getItem("txMap") || "{}");
        txMap[subdomain.toLowerCase()] = txHash;
        localStorage.setItem("txMap", JSON.stringify(txMap));
        
        window.dispatchEvent(
          new CustomEvent("domains-updated", {
            detail: { subdomain, txHash },
          }),
        );
        
        // Set default redirect
        if (!data?.redirectSuccess) {
          try {
            const redirectResult = await setDefaultVanityRedirect(domain || "", subdomain);
            if (redirectResult.success) {
              console.log("Redirect set:", redirectResult);
              toast.success(`Redirect set to ${fullEnsName(subdomain, domain || "")} Vanity profile`, { duration: 5000 });
            }
          } catch (redirectErr: any) {
            console.error("Redirect failed:", redirectErr);
            toast.info("Minted successfully! You can set redirect in My IDs.", { duration: 5000 });
          }
        } else {
          toast.success(`Redirect set to ${fullEnsName(subdomain, domain || "")} Vanity profile`, { duration: 5000 });
        }
        
        onClose();
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("show-my-ids"));
        }, 500);
      } else {
        throw new Error(data?.error || "Mint failed");
      }
      
    } catch (error: any) {
      console.error("[BrowserWallet] Payment error:", error);
      
      if (error.message?.includes("rejected") || error.message?.includes("denied") || error.message?.includes("User rejected")) {
        toast.error("Transaction rejected. Please try again when ready.");
      } else if (error.message?.includes("insufficient")) {
        toast.error("Insufficient balance for this transaction.");
      } else {
        toast.error(error.message || "Payment failed. Please try again.");
      }
      await sendHaptic("error");
    } finally {
      setIsMinting(false);
      setPaymentFlowStep("idle");
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
      
      // CRITICAL: Ensure we're in World App environment, not Telegram
      if (isTelegramWebView()) {
        setPaymentFlowStep("idle");
        localStorage.removeItem('paymentFlowState');
        console.error("[PaymentFlow] ERROR: Attempted to use World App payment in Telegram environment");
        toast.error("World Chain payments are only available in World App. Please use TON wallet for payments in Telegram.", { duration: 8000 });
        return;
      }
      
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
        const countdownInterval = window.setInterval(() => {
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

          // Step 2: Execute payment via World App (permission handled internally by pay command)
          setPaymentFlowStep("processing_payment");
          localStorage.setItem('paymentFlowState', JSON.stringify({
            subdomain, paymentMethod, amount: convertedPrice, reference,
            step: 'processing_payment', timestamp: Date.now()
          }));
          
          // Build payment payload - CRITICAL: Must use whole numbers (integers) for token amounts
          let tokenSymbol: any;
          let tokenAmount: string;
          
          if (paymentMethod === "USDC") {
            tokenSymbol = Tokens.USDC;
            // USDC has 6 decimals - convert and round to ensure whole number
            const rawAmount = tokenToDecimals(convertedPrice, Tokens.USDC);
            tokenAmount = Math.floor(rawAmount).toString();
          } else if (paymentMethod === "ETH") {
            // ETH payments - calculate token amount manually (18 decimals)
            tokenSymbol = "ETH"; // Use string literal for ETH
            // Convert USD to ETH (convertedPrice is already in ETH from the rate calculation)
            const ethInWei = convertedPrice * Math.pow(10, 18);
            tokenAmount = Math.floor(ethInWei).toString();
          } else {
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

        // Only attempt frontend redirect if edge function failed
        if (!data?.redirectSuccess) {
          try {
            const redirectResult = await setDefaultVanityRedirect(domain || "", subdomain);
            if (redirectResult.success) {
              console.log("Frontend fallback redirect set:", redirectResult);
              toast.success(`Redirect set to ${fullEnsName(subdomain, domain || "")} Vanity profile`, {
                duration: 5000,
              });
            }
          } catch (redirectErr: any) {
            console.error("Frontend redirect also failed:", redirectErr);
            toast.info("Minted successfully! You can set redirect in My IDs.", {
              duration: 5000,
            });
          }
        } else {
          console.log("Edge function already set redirect successfully");
          toast.success(`Redirect set to ${fullEnsName(subdomain, domain || "")} Vanity profile`, {
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
    <div className="w-full max-w-md mx-auto animate-in slide-in-from-right duration-500 fade-in mt-20">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-visible flex flex-col relative">
        {/* Back */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 z-10 flex items-center gap-2 text-gray-900 dark:text-white hover:text-[#D4AF37] dark:hover:text-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">{t('back')}</span>
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
            <span className="text-xs font-medium text-red-700 dark:text-red-300">{t('refresh')}</span>
          </div>
        )}
        
        
        {/* Wallet Connection Timer with Cancel Button */}
        {walletConnectionTimeRemaining !== null && (
          <div className="absolute top-20 left-0 right-0 z-10 flex flex-col items-center gap-2">
            <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t('waiting_for_wallet')} ({walletConnectionTimeRemaining}s)
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
                {t('cancel_retry')}
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
                {paymentMethod === "ETH" && `${convertedPrice.toFixed(6)} ETH`}
                {paymentMethod === "APT" && `${convertedPrice.toFixed(4)} APT`}
              </>
            </div>
            {isLoadingPrices && <div className="text-xs text-gray-500">{t('updating_prices')}</div>}
            {isAptosDomain && isPetraConnected && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                {isLoadingBalance ? (
                  <div>{t('loading_balance')}</div>
                ) : (
                  <>
                    {paymentMethod === "APT" && aptBalance !== null && (
                      <div>{t('balance')}: {aptBalance.toFixed(4)} APT</div>
                    )}
                    {paymentMethod === "USDC" && usdcBalance !== null && (
                      <div>{t('balance')}: {usdcBalance.toFixed(2)} USDC</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Breakdown */}
          <div className="w-full max-w-sm space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-center text-sm">{t("cost_breakdown")}</h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {registrationYears} {registrationYears > 1 ? t("years") : t("year")}
                </span>
                <span className="font-medium text-[#D4AF37]">
                  {paymentMethod === "USDC" && `${(domainPrice * registrationYears).toFixed(2)} USDC`}
                  {paymentMethod === "WLD" && `${((domainPrice * registrationYears) / cryptoPrices.wld).toFixed(4)} WLD`}
                  {paymentMethod === "ETH" && `${((domainPrice * registrationYears) / cryptoPrices.eth).toFixed(6)} ETH`}
                  {paymentMethod === "APT" && `${((domainPrice * registrationYears) / cryptoPrices.apt).toFixed(4)} APT`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t("network_fee")} ({isAptosDomain ? "Aptos" : isEvmWalletConnected ? getChainName(chainId) : "World Chain"})
                </span>
                <span className="font-medium text-[#D4AF37]">
                  {effectiveNetworkFee === 0 ? (
                    "FREE"
                  ) : effectiveNetworkFee < 0.03 && paymentMethod === "USDC" ? (
                    "< 0.03 USDC"
                  ) : (
                    <>
                      {paymentMethod === "USDC" && `${effectiveNetworkFee.toFixed(2)} USDC`}
                      {paymentMethod === "WLD" && `${(effectiveNetworkFee / cryptoPrices.wld).toFixed(4)} WLD`}
                      {paymentMethod === "ETH" && `${(effectiveNetworkFee / cryptoPrices.eth).toFixed(6)} ETH`}
                      {paymentMethod === "APT" && `${effectiveNetworkFee.toFixed(2)} APT`}
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t("expires")}</span>
                <span className="font-medium text-gray-900 dark:text-white">{getExpirationDate()}</span>
              </div>

              <Separator className="my-1" />

              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">{t("total")}</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {paymentMethod === "USDC" && `${grandTotal.toFixed(2)} USDC`}
                  {paymentMethod === "WLD" && `${(grandTotal / cryptoPrices.wld).toFixed(4)} WLD`}
                  {paymentMethod === "ETH" && `${(grandTotal / cryptoPrices.eth).toFixed(6)} ETH`}
                  {paymentMethod === "APT" && `${(grandTotal / cryptoPrices.apt).toFixed(4)} APT`}
                </span>
              </div>
            </div>

            <Button
              onClick={handleMintNow}
              disabled={
                isMinting || 
                (isAptosDomain 
                  ? (!isInstalled || !isPetraConnected) 
                  : (!isEvmWalletConnected && miniKitStatus !== "ready"))
              }
              className="w-full mt-3 bg-gradient-to-r from-[#D4AF37] to-[#F2D574] hover:from-[#C9A532] hover:to-[#E8C760] text-black font-bold text-lg h-14 rounded-full shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMinting 
                ? t('processing')
                : isAptosDomain
                  ? (!isInstalled ? t('install_petra_wallet') : !isPetraConnected ? t('connect_petra_wallet') : t('mint_now'))
                  : isEvmWalletConnected
                    ? t('mint_now')
                    : miniKitStatus === "ready"
                      ? t('mint_now')
                      : t('connect_wallet')}
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
                    {paymentFlowStep === "checking_minikit" && t('checking_world_app_step')}
                    {paymentFlowStep === "connecting_wallet" && t('connecting_wallet')}
                    {paymentFlowStep === "preparing_payment" && t('preparing_payment')}
                    {paymentFlowStep === "processing_payment" && t('processing_payment')}
                    {paymentFlowStep === "verifying_payment" && t('verifying_blockchain')}
                    {paymentFlowStep === "minting" && t('minting_subdomain')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {paymentFlowStep === "connecting_wallet" && (isEvmWalletConnected ? t('approve_in_wallet') : t('approve_in_world_app'))}
                    {paymentFlowStep === "processing_payment" && (isEvmWalletConnected ? t('confirm_in_wallet') : t('check_world_app'))}
                    {paymentFlowStep === "verifying_payment" && t('verifying_wait')}
                    {paymentFlowStep === "minting" && t('almost_done')}
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
