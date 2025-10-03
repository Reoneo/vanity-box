import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  Share2,
  Plus,
  Minus,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { fetchCryptoPrices, CryptoPrices } from '@/utils/cryptoPrices';
import usdcLogo from '@/assets/usdc-logo.png';
import ethLogoLight from '@/assets/eth-logo-light.png';
import ethLogoDark from '@/assets/eth-logo-dark.svg';
import ensLogoBlue from '@/assets/ens-logo-blue.png';
import wldLogoDark from '@/assets/wld-logo-dark.svg';
import wldLogoLight from '@/assets/wld-logo-light.png';

interface SubdomainMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: string;
  price: number;
  resultAvatar?: string;
}

type PaymentMethod = 'USDC' | 'ETH' | 'WLD';

export const SubdomainMintModal: React.FC<SubdomainMintModalProps> = ({
  isOpen,
  onClose,
  subdomain,
  price,
  resultAvatar
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [registrationYears, setRegistrationYears] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('USDC');
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({ eth: 2500, wld: 2.0, usdc: 1.0 });
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  // Fetch real-time crypto prices on mount
  useEffect(() => {
    const loadPrices = async () => {
      setIsLoadingPrices(true);
      const prices = await fetchCryptoPrices();
      setCryptoPrices(prices);
      setIsLoadingPrices(false);
    };
    loadPrices();
    
    // Refresh prices every 30 seconds
    const interval = setInterval(loadPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const paymentMethods = [
    { 
      id: 'USDC' as PaymentMethod, 
      name: 'USDC', 
      icon: usdcLogo,
      rate: 1 / cryptoPrices.usdc
    },
    { 
      id: 'ETH' as PaymentMethod, 
      name: 'ETH', 
      icon: theme === 'dark' ? ethLogoDark : ethLogoLight,
      rate: 1 / cryptoPrices.eth
    },
    { 
      id: 'WLD' as PaymentMethod, 
      name: 'WLD', 
      icon: theme === 'dark' ? wldLogoDark : wldLogoLight,
      rate: 1 / cryptoPrices.wld
    }
  ];

  const selectedMethod = paymentMethods.find(m => m.id === paymentMethod)!;
  const totalPrice = price * registrationYears;
  const networkFee = 1.26;
  const grandTotal = totalPrice + networkFee;
  const convertedPrice = grandTotal * selectedMethod.rate;

  const handleIncreaseYears = () => {
    setRegistrationYears(prev => Math.min(prev + 1, 10));
  };

  const handleDecreaseYears = () => {
    setRegistrationYears(prev => Math.max(prev - 1, 1));
  };

  const getExpirationDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + registrationYears);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-4 animate-in slide-in-from-right duration-500 fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <button className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors">
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Share</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col items-center space-y-6">
          {/* Result Avatar */}
          <div className="w-32 h-32 flex items-center justify-center rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.6)]">
            <img src={resultAvatar || ensLogoBlue} alt="Name" className="w-full h-full object-cover" />
          </div>

          {/* Subdomain Name */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
            Register {subdomain}
          </h2>

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
                  {registrationYears} year{registrationYears > 1 ? 's' : ''}
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
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
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
                  {paymentMethod === 'USDC' && `$${grandTotal.toFixed(2)}`}
                  {paymentMethod === 'ETH' && convertedPrice.toFixed(6)}
                  {paymentMethod === 'WLD' && convertedPrice.toFixed(4)}
                </>
              )}
            </div>
            {!isLoadingPrices && paymentMethod !== 'USDC' && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ≈ ${grandTotal.toFixed(2)} USD
              </div>
            )}
          </div>

          {/* Cost Breakdown */}
          <div className="w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-center">Cost Breakdown:</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Domain ({registrationYears} year{registrationYears > 1 ? 's' : ''})</span>
                <span className="font-medium text-gray-900 dark:text-white">${totalPrice.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Network Fee</span>
                <span className="font-medium text-gray-900 dark:text-white">${networkFee.toFixed(2)}</span>
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
            <Button className="w-full mt-4 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold py-6 text-lg">
              Mint Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
