import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MiniKit } from '@worldcoin/minikit-js';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Eye,
  Users,
  Globe,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorldIdVerificationProps {
  onVerificationComplete: () => void;
}

export const WorldIdVerification: React.FC<WorldIdVerificationProps> = ({
  onVerificationComplete
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [isHuman, setIsHuman] = useState(false);

  const handleVerify = async () => {
    if (!MiniKit.isInstalled()) {
      // For demo purposes outside World App
      setIsVerifying(true);
      setTimeout(() => {
        setVerificationStatus('success');
        setIsHuman(true);
        setIsVerifying(false);
        setTimeout(onVerificationComplete, 1000);
      }, 2000);
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('verifying');

    try {
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.verify({
        action: 'subdomain-mint',
        signal: ''
      });

      console.log('World ID verification result:', { commandPayload, finalPayload });

      if (finalPayload && 'status' in finalPayload && finalPayload.status === 'success') {
        setVerificationStatus('success');
        setIsHuman(true);
        setTimeout(onVerificationComplete, 1000);
      } else {
        setVerificationStatus('error');
      }
    } catch (error) {
      console.error('World ID verification failed:', error);
      setVerificationStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  const verificationFeatures = [
    {
      icon: Eye,
      title: 'Biometric Verification',
      description: 'Iris scan confirms you are a unique human'
    },
    {
      icon: Users,
      title: 'Sybil Resistance',
      description: 'One subdomain per verified human'
    },
    {
      icon: Globe,
      title: 'Privacy Preserving',
      description: 'Zero-knowledge proof of humanity'
    },
    {
      icon: Zap,
      title: 'Instant Process',
      description: 'Verification completes in seconds'
    }
  ];

  if (verificationStatus === 'success') {
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-success">Verification Complete!</h3>
          <p className="text-sm text-muted-foreground">
            You are verified as a unique human being
          </p>
          <Badge variant="default" className="gap-1">
            <Shield className="w-3 h-3" />
            World ID Verified
          </Badge>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-destructive">Verification Failed</h3>
          <p className="text-sm text-muted-foreground">
            Unable to verify your World ID. Please try again.
          </p>
        </div>
        <Button onClick={handleVerify} variant="outline">
          Retry Verification
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Verify Your Humanity</h3>
        <p className="text-sm text-muted-foreground">
          Prevent bots and ensure fair subdomain distribution
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {verificationFeatures.map((feature, index) => (
          <Card key={index} className="p-3 bg-gradient-subtle">
            <CardContent className="p-0 text-center space-y-2">
              <feature.icon className="w-5 h-5 text-primary mx-auto" />
              <div>
                <h4 className="text-xs font-medium">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <Button 
          onClick={handleVerify} 
          disabled={isVerifying}
          className="w-full gap-2"
        >
          {isVerifying ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Verify with World ID
            </>
          )}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          By verifying, you confirm you are a unique human and agree to our terms
        </p>
      </div>
    </div>
  );
};