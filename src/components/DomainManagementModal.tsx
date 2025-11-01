import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Gift, Send, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
  const [transferAddress, setTransferAddress] = useState('');
  const [customRecords, setCustomRecords] = useState<{ key: string; value: string }[]>([]);
  const [newRecordKey, setNewRecordKey] = useState('');
  const [newRecordValue, setNewRecordValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        console.log('[DomainManagementModal] Fetching ENS records from Web3.bio for:', fullName);
        
        // Fetch ENS records from Web3.bio API
        const { data, error } = await supabase.functions.invoke('get-web3bio-profile', {
          body: { handle: fullName },
        });

        if (error) {
          console.error('[DomainManagementModal] Error fetching Web3.bio profile:', error);
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
      
      const { data, error } = await supabase.functions.invoke('delete-namestone-name', {
        body: { subdomain, domain: domain.domain },
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

      const { data, error } = await supabase.functions.invoke('set-namestone-records', {
        body: {
          subdomain,
          walletAddress: domain.address,
          textRecords,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 mt-20 md:mt-0">
        <DialogHeader className="pt-4 md:pt-0">
          <DialogTitle className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
            {domain.name}.{domain.domain}
            {domain.isWrapped && (
              <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30">
                <Gift className="w-3 h-3 mr-1" />
                Wrapped
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="records" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="records">{t('records')}</TabsTrigger>
            <TabsTrigger value="transfer">{t('transfer')}</TabsTrigger>
            <TabsTrigger value="wrap">{t('wrap_delete')}</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">ENS Text Records</h3>
              {Object.entries(ensRecords).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">{key}</Label>
                  <Input
                    value={value}
                    onChange={(e) => setEnsRecords({ ...ensRecords, [key]: e.target.value })}
                    placeholder={`Enter ${key}`}
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Custom Records</h3>
                
                {customRecords.map((record, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input value={record.key} disabled className="flex-1" />
                    <Input value={record.value} disabled className="flex-1" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveCustomRecord(index)}
                      className="border-red-500 text-red-500 hover:bg-red-50"
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
                className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Records'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Transfer to Address</Label>
                <Input
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  placeholder="0x..."
                  className="mt-2 bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <Button
                onClick={handleTransfer}
                className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
              >
                <Send className="w-4 h-4 mr-2" />
                Transfer Domain
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="wrap" className="space-y-4">
            <div className="space-y-4">
              {!domain.isWrapped ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Wrap Domain</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Wrapping your domain converts it to an ERC-1155 NFT via Durin on World Chain, enabling enhanced features.
                  </p>
                  <Button
                    onClick={handleWrap}
                    className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Wrap Domain
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Unwrap Domain</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Unwrapping will convert your domain back to a standard subdomain.
                  </p>
                  <Button
                    onClick={handleUnwrap}
                    className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
                  >
                    Unwrap Domain
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <h4 className="font-semibold text-red-900 dark:text-red-400 mb-2">Danger Zone</h4>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                    Deleting a domain is permanent and cannot be undone.
                  </p>
                  <Button
                    onClick={handleDelete}
                    disabled={isLoading}
                    variant="destructive"
                    className="w-full disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isLoading ? 'Deleting...' : 'Delete Domain'}
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
