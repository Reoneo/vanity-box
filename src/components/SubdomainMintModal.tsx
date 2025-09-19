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
  Zap, 
  Shield, 
  CreditCard, 
  Wallet, 
  CheckCircle,
  Clock,
  DollarSign
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

  const paymentMethods = [
    { id: 'WLD' as PaymentMethod, name: 'World Token', icon: '🌍', rate: 1.0 },
    { id: 'USDC' as PaymentMethod, name: 'USDC', icon: '💵', rate: 1.0 },
    { id: 'ETH' as PaymentMethod, name: 'Ethereum', icon: '⟠', rate: 0.0004 }
  ];

  const selectedMethod = paymentMethods.find(m => m.id === paymentMethod)!;
  const convertedPrice = price * selectedMethod.rate;

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
    <div className="flex items-center justify-center gap-2 mb-6">
      {['details', 'verify', 'payment', 'confirm'].map((step, index) => (
        <React.Fragment key={step}>
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
            currentStep === step ? "bg-primary text-primary-foreground" :
            ['details', 'verify', 'payment', 'confirm'].indexOf(currentStep) > index 
              ? "bg-success text-success-foreground" 
              : "bg-muted text-muted-foreground"
          )}>
            {['details', 'verify', 'payment', 'confirm'].indexOf(currentStep) > index ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < 3 && (
            <div className={cn(
              "w-8 h-0.5",
              ['details', 'verify', 'payment', 'confirm'].indexOf(currentStep) > index 
                ? "bg-success" 
                : "bg-muted"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Subdomain Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gradient-subtle rounded-lg">
            <span className="font-mono text-lg">{subdomain}.vanity.₿ox</span>
            <Badge variant="default">Available</Badge>
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
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>Subdomain ({subdomain.length} chars)</span>
            <span>${price} USD</span>
          </div>
          <div className="flex justify-between">
            <span>Network Fee</span>
            <span>$0.50 USD</span>
          </div>
          <div className="flex justify-between">
            <span>World ID Verification</span>
            <span className="text-success">Free</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>${(price + 0.5).toFixed(2)} USD</span>
          </div>
          <div className="text-center text-sm text-muted-foreground">
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
      {isOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto z-50">
        <DialogHeader>
          <DialogTitle className="text-center">
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