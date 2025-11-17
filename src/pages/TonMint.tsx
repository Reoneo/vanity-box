import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, RefreshCw, Loader2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { fetchCryptoPrices, type CryptoPrices } from "@/utils/cryptoPrices";
import { cn } from "@/lib/utils";
import { Header } from "@/components/Header";

import tonLogo from "@/assets/ton-logo.png";
import usdcLogo from "@/assets/usdc-logo.png";
import vanityTonAvatar from "@/assets/vanity-ton-avatar.png";

type PaymentMethod = "TON" | "USDC";

// Recipient wallet address for all TON payments
const TON_RECIPIENT_WALLET = "UQAS1gnthmx0ojQ_6SXqybdADAupKxvj3CPfF-sGmkf1EFGE";

export const TonMint: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tonConnectUI] = useTonConnectUI();
  const userFriendlyAddress = useTonAddress();
  const rawAddress = useTonAddress(false);

  // Get subdomain and avatar from navigation state
  const { subdomain = "yourname", resultAvatar } = (location.state || {}) as {
    subdomain?: string;
    resultAvatar?: string;
  };

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
      rate: 1 / cryptoPrices.ton,
    },
    {
      id: "USDC" as PaymentMethod,
      name: "USDC",
      icon: usdcLogo,
      rate: 1,
    },
  ];

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethod)!;
  const convertedPrice = totalPriceUSD * selectedMethod.rate;
  const isFree = totalPriceUSD < 0.01;

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

  const handleConnectWallet = async () => {
    try {
      setMintingStep("connecting");
      await tonConnectUI.openModal();
      setMintingStep("idle");
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast.error("Failed to connect wallet");
      setMintingStep("idle");
    }
  };

  const handleMintSubdomain = async () => {
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
        .storeUint(paymentMethod === "TON" ? 0 : 1, 32) // op code: 0=TON, 1=USDC
        .storeStringTail(subdomain)
        .storeAddress(rawAddress ? Address.parse(rawAddress) : null)
        .storeUint(registrationYears, 32)
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60, // 60 seconds
        messages: [
          {
            address: TON_RECIPIENT_WALLET,
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
      
      // Wait a bit before navigating back
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      console.error("Failed to mint subdomain:", error);
      toast.error(error.message || "Failed to mint subdomain");
      setMintingStep("idle");
    } finally {
      setIsMinting(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
          {/* Header with Back and Refresh */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2 hover:bg-accent"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="gap-2 hover:bg-accent bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="relative">
                <img 
                  src={resultAvatar || vanityTonAvatar} 
                  alt={`${subdomain}.vanity.ton`}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-primary shadow-lg"
                />
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Register {subdomain}.vanity.ton
              </h1>
            </div>

            {/* Registration Years */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecreaseYears}
                disabled={registrationYears <= 1 || isMinting}
                className="rounded-full w-12 h-12 border-2"
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="text-center min-w-[80px]">
                <div className="text-4xl md:text-5xl font-bold text-foreground">{registrationYears}</div>
                <div className="text-sm text-muted-foreground">year{registrationYears > 1 ? "s" : ""}</div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleIncreaseYears}
                disabled={registrationYears >= 10 || isMinting}
                className="rounded-full w-12 h-12 border-2"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            {/* Payment Method Toggle Pills */}
            <div className="flex items-center justify-center gap-2">
              {paymentMethods.map((method) => (
                <Button
                  key={method.id}
                  onClick={() => !isMinting && setPaymentMethod(method.id)}
                  disabled={isMinting}
                  variant={paymentMethod === method.id ? "default" : "outline"}
                  className={cn(
                    "rounded-full px-6 py-2 font-semibold transition-all",
                    paymentMethod === method.id && "bg-primary text-primary-foreground"
                  )}
                >
                  {method.name}
                </Button>
              ))}
            </div>

            {/* Large Price Display */}
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold text-primary mb-2">
                {isFree ? "FREE" : `${convertedPrice.toFixed(2)} ${paymentMethod}`}
              </div>
              {isLoadingPrices && (
                <p className="text-xs text-muted-foreground">Updating prices...</p>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground text-center mb-3">Cost Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{registrationYears} year{registrationYears > 1 ? "s" : ""}</span>
                  <span className="font-medium text-primary">${totalPriceUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network Fee (TON Chain)</span>
                  <span className="font-medium text-green-600 dark:text-green-400">&lt; $0.03</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="font-medium text-foreground">{getExpirationDate()}</span>
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="flex justify-between text-base font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-primary">${totalPriceUSD.toFixed(2)}</span>
              </div>
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
              <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Loader2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  Waiting for blockchain confirmation...
                </p>
              </div>
            )}

            {mintingStep === "success" && (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <Loader2 className="w-5 h-5 text-green-600 dark:text-green-400 animate-spin" />
                <p className="text-sm text-green-900 dark:text-green-100">
                  Subdomain minted successfully! Redirecting...
                </p>
              </div>
            )}

            {/* Main CTA Button */}
            <Button
              onClick={userFriendlyAddress ? handleMintSubdomain : handleConnectWallet}
              disabled={isMinting || mintingStep === "connecting"}
              className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              {mintingStep === "connecting" ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : isMinting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Minting...
                </>
              ) : userFriendlyAddress ? (
                "Mint on TON Chain"
              ) : (
                "Connect TON Wallet"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TonMint;
