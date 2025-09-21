import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Globe, 
  Zap, 
  Shield, 
  CreditCard, 
  Wallet, 
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorldIdVerification } from '@/components/WorldIdVerification';

interface SubdomainMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: string;
  price: number;
}

type PaymentMethod = 'WLD' | 'USDC' | 'ETH';
type MintStep = 'details' | 'verify' | 'payment' | 'confirm';

export const SubdomainMintModal: React.FC<SubdomainMintModalProps> = ({
  isOpen,
  onClose,
  subdomain,
  price
}) => {
  const [currentStep, setCurrentStep] = useState<MintStep>('details');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WLD');
  const [isVerified, setIsVerified] = useState(false);
  const [realTimePrice, setRealTimePrice] = useState(price);

  // Simulate real-time price updates
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      // Simulate minor price fluctuations (±2%)
      const fluctuation = (Math.random() - 0.5) * 0.04;
      const newPrice = price * (1 + fluctuation);
      setRealTimePrice(Math.max(0.5, newPrice)); // Minimum price of $0.50
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, price]);

  const paymentMethods = [
    { id: 'WLD' as PaymentMethod, name: 'World Token', icon: '🌍', rate: 1.0 },
    { id: 'USDC' as PaymentMethod, name: 'USDC', icon: '💵', rate: 1.0 },
    { id: 'ETH' as PaymentMethod, name: 'Ethereum', icon: '⟠', rate: 0.0004 }
  ];

  const selectedMethod = paymentMethods.find(m => m.id === paymentMethod)!;
  const convertedPrice = realTimePrice * selectedMethod.rate;

  const handleVerificationComplete = () => {
    setIsVerified(true);
    setCurrentStep('payment');
  };

  const handlePayment = () => {
    setCurrentStep('confirm');
    // Simulate payment processing
    setTimeout(() => {
      onClose();
      setCurrentStep('details');
    }, 3000);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-3 mb-8">
      {['details', 'verify', 'payment', 'confirm'].map((step, index) => (
        <React.Fragment key={step}>
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-300",
            currentStep === step ? "bg-gradient-to-r from-[#D4AF37] to-[#F7E06C] text-black scale-110" :
            ['details', 'verify', 'payment', 'confirm'].indexOf(currentStep) > index 
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white" 
              : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          )}>
            {['details', 'verify', 'payment', 'confirm'].indexOf(currentStep) > index ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              index + 1
            )}
          </div>
          {index < 3 && (
            <div className={cn(
              "w-12 h-1 rounded-full transition-all duration-300",
              ['details', 'verify', 'payment', 'confirm'].indexOf(currentStep) > index 
                ? "bg-gradient-to-r from-green-500 to-green-600" 
                : "bg-gray-200 dark:bg-gray-700"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 border-2 border-[#D4AF37]/30">
        <CardHeader className="pb-4 bg-gradient-to-r from-[#D4AF37]/10 to-[#F7E06C]/10">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Globe className="w-6 h-6 text-[#D4AF37]" />
            Subdomain Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#D4AF37]/5 to-[#F7E06C]/5 rounded-xl border border-[#D4AF37]/20">
            <span className="font-mono text-xl font-bold text-[#D4AF37]" style={{ textShadow: '0 0 10px #D4AF37' }}>{subdomain}.vanity.₿ox</span>
            <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30 px-3 py-1">Available</Badge>
          </div>
          
          <div className="flex items-center justify-center p-4 bg-gradient-to-r from-[#D4AF37]/10 to-[#F7E06C]/10 rounded-xl border border-[#D4AF37]/20">
            <div className="flex items-center gap-2 text-2xl font-bold text-[#D4AF37]">
              <TrendingUp className="w-6 h-6" />
              <span>${realTimePrice.toFixed(2)} USD</span>
              <div className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                Live Price
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Length:</span>
              <span className="ml-2 font-medium">{subdomain.length} characters</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tier:</span>
              <span className="ml-2 font-medium">
                {subdomain.length <= 3 ? 'Premium' : 
                 subdomain.length <= 6 ? 'Standard' : 'Basic'}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">What's included:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                ENS subdomain resolution
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                World ID verification
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                Cross-chain address resolution
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                Web3 profile management
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => setCurrentStep('verify')} className="gap-2">
          <Shield className="w-4 h-4" />
          Continue to Verification
        </Button>
      </div>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            World ID Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WorldIdVerification onVerificationComplete={handleVerificationComplete} />
        </CardContent>
      </Card>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value={method.id} id={method.id} />
                <Label htmlFor={method.id} className="flex-1 flex items-center gap-3 cursor-pointer">
                  <span className="text-xl">{method.icon}</span>
                  <div>
                    <div className="font-medium">{method.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {(price * method.rate).toFixed(method.id === 'ETH' ? 6 : 2)} {method.id}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Price Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="flex justify-between items-center">
            <span>Subdomain ({subdomain.length} chars)</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
              <span className="font-bold text-[#D4AF37]">${realTimePrice.toFixed(2)} USD</span>
            </div>
          </div>
          <div className="flex justify-between">
            <span>Network Fee</span>
            <span>$0.50 USD</span>
          </div>
          <div className="flex justify-between">
            <span>World ID Verification</span>
            <span className="text-green-600 dark:text-green-400 font-medium">Free</span>
          </div>
          <Separator className="bg-[#D4AF37]/20" />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-[#D4AF37]">${(realTimePrice + 0.5).toFixed(2)} USD</span>
          </div>
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 bg-[#D4AF37]/5 p-2 rounded-lg">
            ≈ {convertedPrice.toFixed(selectedMethod.id === 'ETH' ? 6 : 2)} {selectedMethod.id}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep('verify')}>
          Back
        </Button>
        <Button onClick={handlePayment} className="gap-2">
          <Wallet className="w-4 h-4" />
          Pay with {selectedMethod.name}
        </Button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-success" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Payment Processing</h3>
        <p className="text-muted-foreground">
          Your subdomain is being minted on the blockchain
        </p>
      </div>

      <Card className="bg-gradient-subtle">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Clock className="w-4 h-4 animate-spin" />
            <span className="font-medium">{subdomain}.vanity.₿ox</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        This usually takes 1-2 minutes. You'll receive a confirmation once complete.
      </p>
    </div>
  );

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-40" />}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto z-50 bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 border-2 border-[#D4AF37]/30 shadow-2xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#F7E06C] bg-clip-text text-transparent">
            Mint ENS Subdomain
          </DialogTitle>
        </DialogHeader>
        
        {renderStepIndicator()}
        
        {currentStep === 'details' && renderDetailsStep()}
        {currentStep === 'verify' && renderVerifyStep()}
        {currentStep === 'payment' && renderPaymentStep()}
        {currentStep === 'confirm' && renderConfirmStep()}
        </DialogContent>
      </Dialog>
    </>
  );
};