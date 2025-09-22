import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Globe, 
  CreditCard, 
  Wallet, 
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubdomainMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: string;
  price: number;
}

type PaymentMethod = 'WLD' | 'USDC' | 'ETH';
type MintStep = 'details' | 'payment' | 'confirm';

export const SubdomainMintModal: React.FC<SubdomainMintModalProps> = ({
  isOpen,
  onClose,
  subdomain,
  price
}) => {
  const [currentStep, setCurrentStep] = useState<MintStep>('details');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WLD');

  const paymentMethods = [
    { id: 'WLD' as PaymentMethod, name: 'World Token', icon: '🌍', rate: 7.58 },
    { id: 'USDC' as PaymentMethod, name: 'USDC', icon: '💵', rate: 1.0 },
    { id: 'ETH' as PaymentMethod, name: 'Ethereum', icon: '⟠', rate: 0.0004 }
  ];

  const selectedMethod = paymentMethods.find(m => m.id === paymentMethod)!;
  const convertedPrice = price * selectedMethod.rate;

  const handlePayment = () => {
    setCurrentStep('confirm');
    // Simulate payment processing
    setTimeout(() => {
      onClose();
      setCurrentStep('details');
    }, 3000);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-3 mb-6">
      {['details', 'payment', 'confirm'].map((step, index) => (
        <React.Fragment key={step}>
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-300",
            currentStep === step ? "bg-gradient-to-r from-[#D4AF37] to-[#F7E06C] text-black scale-110" :
            ['details', 'payment', 'confirm'].indexOf(currentStep) > index 
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white" 
              : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          )}>
            {['details', 'payment', 'confirm'].indexOf(currentStep) > index ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < 2 && (
            <div className={cn(
              "w-8 h-1 rounded-full transition-all duration-300",
              ['details', 'payment', 'confirm'].indexOf(currentStep) > index 
                ? "bg-gradient-to-r from-green-500 to-green-600" 
                : "bg-gray-200 dark:bg-gray-700"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 border-2 border-[#D4AF37]/30">
        <CardHeader className="pb-3 bg-gradient-to-r from-[#D4AF37]/10 to-[#F7E06C]/10">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5 text-[#D4AF37]" />
            Subdomain Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#D4AF37]/10 to-[#F7E06C]/10 rounded-xl border-2 border-[#D4AF37]/30 shadow-lg">
            <span className="font-mono text-xl font-bold text-[#D4AF37]" style={{ textShadow: '0 0 15px #D4AF37' }}>{subdomain}</span>
            <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30 px-3 py-1 text-sm font-medium">Available</Badge>
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
            <h4 className="font-medium text-sm">What's included:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                ENS subdomain resolution
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
        <Button onClick={() => setCurrentStep('payment')} className="gap-2">
          <CreditCard className="w-4 h-4" />
          Continue to Payment
        </Button>
      </div>
    </div>
  );


  const renderPaymentStep = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-primary" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center space-x-3 p-3 border-2 rounded-xl hover:bg-[#D4AF37]/5 transition-all duration-300 hover:border-[#D4AF37]/40 cursor-pointer group">
                <RadioGroupItem value={method.id} id={method.id} className="border-[#D4AF37] text-[#D4AF37]" />
                <Label htmlFor={method.id} className="flex-1 flex items-center gap-3 cursor-pointer">
                  <span className="text-xl group-hover:scale-110 transition-transform duration-200">{method.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold">{method.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {method.id === 'WLD' 
                        ? `${(price * method.rate).toFixed(2)} WLD`
                        : method.id === 'ETH'
                        ? `${(price * method.rate).toFixed(6)} ETH`
                        : `${(price * method.rate).toFixed(2)} ${method.id}`
                      }
                    </div>
                  </div>
                  {paymentMethod === method.id && (
                    <div className="w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-black" />
                    </div>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5 text-primary" />
            Price Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="flex justify-between items-center">
            <span>Subdomain ({subdomain.length} chars)</span>
            <span className="font-bold text-[#D4AF37]">${price.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between">
            <span>Network Fee</span>
            <span>$0.50 USD</span>
          </div>
          <Separator className="bg-[#D4AF37]/20" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-[#D4AF37]">${(price + 0.5).toFixed(2)} USD</span>
          </div>
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 bg-[#D4AF37]/5 p-2 rounded-lg">
            ≈ {convertedPrice.toFixed(selectedMethod.id === 'ETH' ? 6 : 2)} {selectedMethod.id}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep('details')}>
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
            <span className="font-medium">{subdomain}.namestone.eth</span>
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
      {isOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-lg z-40" />}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto max-h-[95vh] overflow-y-auto z-50 bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 border-2 border-[#D4AF37]/40 shadow-2xl rounded-xl p-0">
          {/* Header */}
          <DialogHeader className="pb-4 pt-6 px-6 bg-gradient-to-r from-[#D4AF37]/5 to-[#F7E06C]/5 border-b border-[#D4AF37]/20">
            <DialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#F7E06C] bg-clip-text text-transparent">
              Mint ENS Subdomain
            </DialogTitle>
          </DialogHeader>
          
          {/* Content */}
          <div className="px-6 pb-6 pt-2">
            {renderStepIndicator()}
            
            {currentStep === 'details' && renderDetailsStep()}
            {currentStep === 'payment' && renderPaymentStep()}
            {currentStep === 'confirm' && renderConfirmStep()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};