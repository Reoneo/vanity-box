// TonMint Page - Dedicated page for minting .vanity.ton subdomains
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Minus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCryptoPrices, CryptoPrices } from "@/utils/cryptoPrices";
import { toast } from "sonner";
import { useTonConnectUI } from "@tonconnect/ui-react";

import tonLogo from "@/assets/ton-logo.png";
import usdcLogo from "@/assets/usdc-logo.png";
import vanityTonAvatar from "@/assets/vanity-ton-avatar.png";

type PaymentMethod = "TON" | "USDC_TON";

const TON_RECIPIENT_WALLET = "UQAS1gnthmx0ojQ_6SXqybdADAupKxvj3CPfF-sGmkf1EFGE";

export const TonMint: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tonConnectUI] = useTonConnectUI();

  const subdomain = location.state?.subdomain || "";
  const resultAvatar = location.state?.resultAvatar || vanityTonAvatar;

  const [registrationYears, setRegistrationYears] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TON");
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
    eth: 2600, wld: 1.85, usdc: 1.0, apt: 8.5, ton: 5.5,
  });
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStep, setMintingStep] = useState<"idle" | "signing" | "waiting" | "success">("idle");
  const [networkFeeUSD] = useState(0.15);
  const mintInProgressRef = useRef(false);

  useEffect(() => {
    const loadPrices = async () => {
      setIsLoadingPrices(true);
      const prices = await fetchCryptoPrices();
      setCryptoPrices(prices);
      setIsLoadingPrices(false);
    };
    loadPrices();
    const interval = setInterval(loadPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSubdomainPrice = (fullSubdomain: string): number => {
    const length = fullSubdomain.replace('.vanity.ton', '').length;
    if (length === 1) return 100;
    if (length === 2) return 50;
    if (length === 3) return 25;
    if (length === 4) return 15;
    if (length === 5) return 10;
    if (length >= 6 && length <= 9) return 5;
    return 1;
  };

  const basePrice = getSubdomainPrice(subdomain);
  const totalPriceUSD = basePrice * registrationYears;
  const paymentMethods = [
    { id: "TON" as PaymentMethod, name: "TON", icon: tonLogo, rate: cryptoPrices.ton },
    { id: "USDC_TON" as PaymentMethod, name: "USDC", icon: usdcLogo, rate: cryptoPrices.usdc },
  ];
  const convertedPrice = totalPriceUSD / (paymentMethods.find(m => m.id === paymentMethod)?.rate || 1);

  const handleIncreaseYears = () => { if (registrationYears < 10) setRegistrationYears(registrationYears + 1); };
  const handleDecreaseYears = () => { if (registrationYears > 1) setRegistrationYears(registrationYears - 1); };
  const getExpirationDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + registrationYears);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleConnectWallet = async () => {
    try { await tonConnectUI.openModal(); } 
    catch (error) { console.error("Failed to open TON Connect modal:", error); toast.error("Failed to open wallet connection"); }
  };

  const handleMintSubdomain = async () => {
    if (mintInProgressRef.current) return;
    mintInProgressRef.current = true;
    setIsMinting(true);
    setMintingStep("signing");
    try {
      const { Address, beginCell, toNano } = await import("@ton/core");
      const recipientAddress = Address.parse(TON_RECIPIENT_WALLET);
      const amountInTON = paymentMethod === "TON" ? convertedPrice : 0;
      const amountInNano = toNano(amountInTON.toString());
      const payload = beginCell().storeUint(0, 32).storeStringTail(`Mint ${subdomain} for ${registrationYears} year(s)`).endCell();
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{ address: recipientAddress.toString(), amount: amountInNano.toString(), payload: payload.toBoc().toString("base64") }],
      };
      const result = await tonConnectUI.sendTransaction(transaction);
      setMintingStep("waiting");
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMintingStep("success");
      toast.success(`${subdomain} minted successfully!`);
      setTimeout(() => navigate("/"), 2000);
    } catch (error: any) {
      console.error("Minting failed:", error);
      toast.error(error?.message || "Failed to mint subdomain");
      setMintingStep("idle");
    } finally {
      setIsMinting(false);
      mintInProgressRef.current = false;
    }
  };

  const walletAddress = tonConnectUI.wallet?.account?.address;
  const isWalletConnected = !!walletAddress;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {mintingStep === "signing" && (
        <div className="absolute top-16 left-0 right-0 mx-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center z-10">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Please sign the transaction in your TON wallet...</p>
        </div>
      )}
      {mintingStep === "waiting" && (
        <div className="absolute top-16 left-0 right-0 mx-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-center z-10">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Processing your transaction...</p>
        </div>
      )}
      {mintingStep === "success" && (
        <div className="absolute top-16 left-0 right-0 mx-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center z-10">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">🎉 Successfully minted {subdomain}!</p>
        </div>
      )}

      <div className="p-4 pt-16 pb-4 flex flex-col items-center space-y-3">
        <div className="w-24 h-24 flex items-center justify-center rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.6)] bg-white dark:bg-gray-800">
          <img src={resultAvatar} alt="Name" className="w-full h-full object-cover" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">Register {subdomain}</h2>

        <div className="w-full max-w-sm space-y-1">
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleDecreaseYears} className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" disabled={registrationYears <= 1}>
              <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#D4AF37]">{registrationYears}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{registrationYears === 1 ? "Year" : "Years"}</div>
            </div>
            <button onClick={handleIncreaseYears} className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" disabled={registrationYears >= 10}>
              <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
          {paymentMethods.map((method) => (
            <button key={method.id} onClick={() => setPaymentMethod(method.id)} className={cn("px-4 py-1.5 rounded-full font-medium transition-all duration-200 text-sm", paymentMethod === method.id ? "bg-[#D4AF37] text-black shadow-md" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200")}>
              {method.name}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="text-4xl font-bold text-[#D4AF37]">
            {paymentMethod === "TON" && `${convertedPrice.toFixed(4)} TON`}
            {paymentMethod === "USDC_TON" && `${convertedPrice.toFixed(2)} USDC`}
          </div>
          {isLoadingPrices && <div className="text-xs text-gray-500">Updating prices…</div>}
        </div>

        <Separator className="my-2 bg-gray-200 dark:bg-gray-700" />

        <div className="w-full max-w-md space-y-2 px-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cost Breakdown</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Base Price</span><span className="font-medium text-gray-900 dark:text-white">${basePrice.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Registration Period</span><span className="font-medium text-gray-900 dark:text-white">{registrationYears} {registrationYears === 1 ? "year" : "years"}</span></div>
            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Subtotal</span><span className="font-medium text-gray-900 dark:text-white">${totalPriceUSD.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Network Fee</span><span className="font-medium text-gray-900 dark:text-white">${networkFeeUSD.toFixed(2)}</span></div>
            <Separator className="my-1 bg-gray-200 dark:bg-gray-700" />
            <div className="flex justify-between text-base font-semibold"><span className="text-gray-900 dark:text-white">Total (USD)</span><span className="text-[#D4AF37]">${(totalPriceUSD + networkFeeUSD).toFixed(2)}</span></div>
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700"><span className="text-gray-600 dark:text-gray-400">Expires On</span><span className="font-medium text-gray-900 dark:text-white">{getExpirationDate()}</span></div>
          </div>
        </div>

        <div className="w-full max-w-md px-4 pt-4">
          {!isWalletConnected ? (
            <Button onClick={handleConnectWallet} className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all">Connect TON Wallet</Button>
          ) : (
            <Button onClick={handleMintSubdomain} disabled={isMinting || isLoadingPrices} className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isMinting ? "Minting..." : "Mint on TON Chain"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TonMint;
