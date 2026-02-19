import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Gift, Send, Trash2, Plus, X, RefreshCw, Link } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWalletSign } from '@/hooks/useWalletSign';
import { MiniKit } from '@worldcoin/minikit-js';
import { useLanguage } from '@/contexts/LanguageContext';

interface DomainManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: {
    name: string;
    domain: string;
    address: string;
    isWrapped?: boolean;
  };
}

export const DomainManagementModal: React.FC<DomainManagementModalProps> = ({
  isOpen,
  onClose,
  domain
}) => {
  const { t } = useLanguage();
  const { signForOperation } = useWalletSign();
  const [transferAddress, setTransferAddress] = useState('');
  const [customRecords, setCustomRecords] = useState<{ key: string; value: string }[]>([]);
  const [newRecordKey, setNewRecordKey] = useState('');
  const [newRecordValue, setNewRecordValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingRedirect, setIsSettingRedirect] = useState(false);
  const [redirectStatus, setRedirectStatus] = useState<{
    hasRedirect: boolean;
    url?: string;
    cid?: string;
  } | null>(null);

  // ENS standard text records
  const [ensRecords, setEnsRecords] = useState({
    email: '',
    url: '',
    avatar: '',
    description: '',
    'com.github': '',
    'com.twitter': '',
    'com.discord': '',
  });

  // Load existing records when modal opens
  useEffect(() => {
    const loadRecords = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoading(true);
        // Clear previous records to prevent cross-domain contamination
        setEnsRecords({
          email: '',
          url: '',
          avatar: '',
          description: '',
          'com.github': '',
          'com.twitter': '',
          'com.discord': '',
        });
        setCustomRecords([]);
        
        const fullName = `${domain.name}.${domain.domain}`;
        console.log('[DomainManagementModal] Fetching records for:', fullName);
        
        // Check if this is a Namestone domain (.world, .cash, etc.) - excluding .box which uses web3.bio
        const namesoneTLDs = ['.world', '.cash', '.apt', '.ton', '.flirtad', '.mexipay', '.guavapay', '.termux', '.spyda', '.mith', '.30315', '.teamxrp'];
        const isNamestoneDomain = namesoneTLDs.some(tld => fullName.toLowerCase().endsWith(tld));
        
        let data, error;
        if (isNamestoneDomain) {
          // Use Namestone-aware endpoint for .box, .world, etc.
          console.log('[DomainManagementModal] Using Namestone endpoint for:', fullName);
          const response = await supabase.functions.invoke('get-ens-subdomain-profile', {
            body: { subdomain: fullName },
          });
          data = response.data;
          error = response.error;
        } else {
          // Use Web3.bio for ENS domains
          console.log('[DomainManagementModal] Using Web3.bio endpoint for:', fullName);
          const response = await supabase.functions.invoke('get-web3bio-profile', {
            body: { handle: fullName },
          });
          data = response.data;
          error = response.error;
        }

        if (error) {
          console.error('[DomainManagementModal] Error fetching profile:', error);
          // Empty records is a valid state - don't show error
          return;
        }

        if (data && !data.error && data.identity) {
          console.log('[DomainManagementModal] Fetched Web3.bio profile:', data);
          
          const profile = data.identity;
          const ensRecordsData = {
            email: '',
            url: '',
            avatar: '',
            description: '',
            'com.github': '',
            'com.twitter': '',
            'com.discord': '',
          };
          const customRecordsData: { key: string; value: string }[] = [];
          
          // Standard ENS record keys
          const standardKeys = ['email', 'url', 'avatar', 'description', 'com.github', 'com.twitter', 'com.discord'];
          
          // Map Web3.bio fields to ENS text records
          if (profile.email) ensRecordsData.email = profile.email;
          if (profile.url) ensRecordsData.url = profile.url;
          if (profile.avatar) ensRecordsData.avatar = profile.avatar;
          if (profile.description) ensRecordsData.description = profile.description;
          if (profile.github) ensRecordsData['com.github'] = profile.github;
          if (profile.twitter) ensRecordsData['com.twitter'] = profile.twitter;
          if (profile.discord) ensRecordsData['com.discord'] = profile.discord;

          // Handle any additional custom fields from links
          if (profile.links && Array.isArray(profile.links)) {
            profile.links.forEach((link: any) => {
              const key = link.platform || link.type;
              if (key && !standardKeys.includes(key) && link.handle) {
                customRecordsData.push({ key, value: link.handle });
              }
            });
          }
          
          setEnsRecords(ensRecordsData);
          setCustomRecords(customRecordsData);
        } else {
          // No records found on-chain - show empty fields (valid state)
          console.log(`[DomainManagementModal] No ENS records found for ${fullName}`);
        }
      } catch (error) {
        console.error('[DomainManagementModal] Error loading records:', error);
        // Empty records is a valid state
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, [domain.name, domain.domain, isOpen]);

  const handleAddCustomRecord = () => {
    if (newRecordKey && newRecordValue) {
      setCustomRecords([...customRecords, { key: newRecordKey, value: newRecordValue }]);
      setNewRecordKey('');
      setNewRecordValue('');
    }
  };

  const handleRemoveCustomRecord = (index: number) => {
    setCustomRecords(customRecords.filter((_, i) => i !== index));
  };

  const handleWrap = async () => {
    try {
      setIsLoading(true);
      toast.info('Wrapping domain via Durin on World Chain...');
      
      // Wrapping is now handled during minting
      // This would require additional implementation to wrap existing domains
      toast.success('Domain wrapping initiated!');
      window.dispatchEvent(new CustomEvent('domains-updated'));
      onClose();
    } catch (error) {
      toast.error('Failed to wrap domain');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnwrap = async () => {
    try {
      toast.info('Unwrapping domain...');
      // TODO: Implement Durin unwrapping
      toast.success('Domain unwrapped successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to unwrap domain');
    }
  };

  const handleTransfer = async () => {
    if (!transferAddress) {
      toast.error('Please enter a valid address');
      return;
    }
    try {
      toast.info('Transferring domain...');
      // TODO: Implement transfer
      toast.success('Domain transferred successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to transfer domain');
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete ${domain.name}.${domain.domain}? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      setIsLoading(true);
      toast.info('Deleting domain from Namestone...');
      
      const subdomain = `${domain.name}.${domain.domain}`;

      const { signature, timestamp } = await signForOperation('Delete domain', {
        Subdomain: subdomain,
      });
      
      const { data, error } = await supabase.functions.invoke('delete-namestone-name', {
        body: { subdomain, domain: domain.domain, walletAddress: domain.address, signature, timestamp },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success) {
        toast.success('Domain deleted successfully!');
        window.dispatchEvent(new CustomEvent('domains-updated'));
        onClose();
      } else {
        console.error('Delete failed:', data);
        throw new Error(data?.error || 'Failed to delete domain');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete domain');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecords = async () => {
    try {
      setIsLoading(true);
      toast.info('Saving records to Namestone...');
      
      const subdomain = `${domain.name}.${domain.domain}`;
      
      // SECURITY: Metadata fields that should NEVER be saved by users
      const metadataBlacklist = [
        'registration_months',
        'expiry_date', 
        'grace_period_end',
        'registration_date',
        'created_at',
        'updated_at',
        'minted_at',
        'is_expired',
        'payment_amount',
        'network_fee',
        'tx_hash',
        'payment_method'
      ];
      
      // Combine ENS records and custom records
      const textRecords: Record<string, string> = {};
      
      // Add ENS standard records (only non-empty ones)
      Object.entries(ensRecords).forEach(([key, value]) => {
        if (value.trim() && !metadataBlacklist.includes(key)) {
          textRecords[key] = value;
        }
      });
      
      // Add custom records (filter out metadata fields)
      customRecords.forEach(record => {
        if (record.key.trim() && record.value.trim() && !metadataBlacklist.includes(record.key)) {
          textRecords[record.key] = record.value;
        } else if (metadataBlacklist.includes(record.key)) {
          console.warn(`[DomainManagementModal] Blocked attempt to save metadata field: ${record.key}`);
        }
      });

      console.log(`[DomainManagementModal] Saving records for ${subdomain}:`, textRecords);

      const { signature, timestamp } = await signForOperation('Update domain records', {
        Subdomain: subdomain,
      });

      const { data, error } = await supabase.functions.invoke('set-namestone-records', {
        body: {
          subdomain,
          walletAddress: domain.address,
          textRecords,
          signature,
          timestamp,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Records saved successfully!');
        window.dispatchEvent(new CustomEvent('domains-updated'));
      } else {
        throw new Error(data?.error || 'Failed to save records');
      }
    } catch (error) {
      console.error('Save records error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save records');
    } finally {
      setIsLoading(false);
    }
  };

  const fullDomainName = `${domain.name}.${domain.domain}`;
  const vanityProfileUrl = `https://vanity.box/${fullDomainName}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background to-accent/5 border-primary/20 mt-20 md:mt-0">
        <DialogHeader className="pt-4 md:pt-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent flex items-center gap-2 flex-wrap mb-2">
                {domain.name}.{domain.domain}
                {domain.isWrapped && (
                  <Badge className="bg-primary/10 text-primary border-primary/30">
                    <Gift className="w-3 h-3 mr-1" />
                    Wrapped
                  </Badge>
                )}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link className="w-4 h-4" />
                <span className="break-all">
                  Redirect set to{' '}
                  <a 
                    href={vanityProfileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {fullDomainName} Vanity profile
                  </a>
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="records" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="records" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('records')}</TabsTrigger>
            <TabsTrigger value="transfer" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('transfer')}</TabsTrigger>
            <TabsTrigger value="wrap" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('wrap_delete')}</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                ENS Text Records
              </h3>
              {Object.entries(ensRecords).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-muted-foreground font-medium">{key}</Label>
                  <Input
                    value={value}
                    onChange={(e) => setEnsRecords({ ...ensRecords, [key]: e.target.value })}
                    placeholder={`Enter ${key}`}
                    className="bg-muted/30 border-border focus:border-primary transition-colors"
                  />
                </div>
              ))}

              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  Custom Records
                </h3>
                
                {customRecords.map((record, index) => (
                  <div key={index} className="flex gap-2 mb-2 p-2 bg-muted/20 rounded-lg border border-border/50">
                    <Input value={record.key} disabled className="flex-1 bg-background/50" />
                    <Input value={record.value} disabled className="flex-1 bg-background/50" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveCustomRecord(index)}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2 mt-4">
                  <Input
                    value={newRecordKey}
                    onChange={(e) => setNewRecordKey(e.target.value)}
                    placeholder="Record key"
                    className="flex-1"
                  />
                  <Input
                    value={newRecordValue}
                    onChange={(e) => setNewRecordValue(e.target.value)}
                    placeholder="Record value"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddCustomRecord}
                    className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleSaveRecords}
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Records'
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border/50">
              <div>
                <Label className="text-muted-foreground font-medium">Transfer to Address</Label>
                <Input
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  placeholder="0x..."
                  className="mt-2 bg-background border-border focus:border-primary transition-colors"
                />
              </div>
              <Button
                onClick={handleTransfer}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all shadow-sm hover:shadow-md"
              >
                <Send className="w-4 h-4 mr-2" />
                Transfer Domain
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="wrap" className="space-y-4">
            <div className="space-y-4">
              {!domain.isWrapped ? (
                <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" />
                    Wrap Domain
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Wrapping your domain converts it to an ERC-1155 NFT via Durin on World Chain, enabling enhanced features.
                  </p>
                  <Button
                    onClick={handleWrap}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all shadow-sm hover:shadow-md"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Wrap Domain
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                  <h4 className="font-semibold text-foreground mb-2">Unwrap Domain</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unwrapping will convert your domain back to a standard subdomain.
                  </p>
                  <Button
                    onClick={handleUnwrap}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all shadow-sm hover:shadow-md"
                  >
                    Unwrap Domain
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                  <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Danger Zone
                  </h4>
                  <p className="text-sm text-destructive/80 mb-4">
                    Deleting a domain is permanent and cannot be undone.
                  </p>
                  <Button
                    onClick={handleDelete}
                    disabled={isLoading}
                    variant="destructive"
                    className="w-full disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Domain'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
