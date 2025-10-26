import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import smithCashAvatar from '@/assets/smith-cash-avatar.png';

interface DomainEditPanelProps {
  domain: {
    name: string;
    domain: string;
    address: string;
    isWrapped?: boolean;
  };
}

export const DomainEditPanel: React.FC<DomainEditPanelProps> = ({ domain }) => {
  const [customRecords, setCustomRecords] = useState<{ key: string; value: string }[]>([]);
  const [newRecordKey, setNewRecordKey] = useState('');
  const [newRecordValue, setNewRecordValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transferAddress, setTransferAddress] = useState('');
  const [activeTab, setActiveTab] = useState('records');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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

  // Listen for domain action events
  useEffect(() => {
    const handleDomainAction = (e: any) => {
      if (e.detail?.action === 'transfer') {
        setActiveTab('transfer');
      } else if (e.detail?.action === 'edit') {
        setActiveTab('records');
      }
    };

    window.addEventListener('domain-action', handleDomainAction);
    return () => window.removeEventListener('domain-action', handleDomainAction);
  }, []);

  // Load existing records when component mounts
  useEffect(() => {
    const loadRecords = async () => {
      try {
        setIsLoading(true);
        const subdomain = `${domain.name}.${domain.domain}`;
        
        const { data, error } = await supabase.functions.invoke('get-namestone-records', {
          body: { subdomain, domain: domain.domain },
        });

        if (error) {
          console.error('Error fetching records:', error);
          return;
        }

        if (data?.success && data.textRecords) {
          const fetchedRecords = data.textRecords;
          
          // Populate ENS records
          const updatedEnsRecords = { ...ensRecords };
          Object.keys(ensRecords).forEach((key) => {
            if (fetchedRecords[key]) {
              updatedEnsRecords[key as keyof typeof ensRecords] = fetchedRecords[key];
            }
          });
          setEnsRecords(updatedEnsRecords);
          
          // Populate custom records
          const customKeys = Object.keys(fetchedRecords).filter(
            (key) => !Object.keys(ensRecords).includes(key)
          );
          const customRecordsArray = customKeys.map((key) => ({
            key,
            value: fetchedRecords[key],
          }));
          setCustomRecords(customRecordsArray);
        }
      } catch (error) {
        console.error('Error loading records:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, [domain]);

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
        window.dispatchEvent(new CustomEvent('back-to-domains'));
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

  const handleTransfer = () => {
    if (!transferAddress.trim()) {
      toast.error('Please enter a transfer address');
      return;
    }
    setIsConfirmOpen(true);
  };

  const confirmTransferAndSend = async () => {
    const to = transferAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
      toast.error('Invalid Ethereum address');
      return;
    }

    try {
      setIsLoading(true);
      toast.info('Transferring domain...');

      const subdomain = `${domain.name}.${domain.domain}`;

      const { data, error } = await supabase.functions.invoke('transfer-namestone-name', {
        body: { subdomain, toAddress: to },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Domain transferred successfully!');
        setTransferAddress('');
        window.dispatchEvent(new CustomEvent('domains-updated'));
        window.dispatchEvent(new CustomEvent('back-to-domains'));
      } else {
        throw new Error(data?.error || 'Failed to transfer domain');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to transfer domain');
    } finally {
      setIsLoading(false);
      setIsConfirmOpen(false);
    }
  };

  const handleSaveRecords = async () => {
    try {
      setIsLoading(true);
      toast.info('Saving records to Namestone...');
      
      const subdomain = `${domain.name}.${domain.domain}`;
      
      // Combine ENS records and custom records
      const textRecords: Record<string, string> = {};
      
      // Add ENS standard records (only non-empty ones)
      Object.entries(ensRecords).forEach(([key, value]) => {
        if (value.trim()) {
          textRecords[key] = value;
        }
      });
      
      // Add custom records
      customRecords.forEach(record => {
        if (record.key.trim() && record.value.trim()) {
          textRecords[record.key] = record.value;
        }
      });

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
    <div className="w-full max-w-2xl mx-auto bg-[hsl(var(--card))] dark:bg-[hsl(var(--card))] border border-border rounded-2xl shadow-lg p-6 luxury-card luxury-glow">
      {/* Domain Header */}
      <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-700">
        <div className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-border overflow-hidden bg-black/30 backdrop-blur-sm">
          <img
            src={smithCashAvatar}
            alt={domain.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2 break-words">
            {domain.name}.{domain.domain}
          </h2>
          <p className="font-mono text-sm text-gray-300">
            {domain.address.slice(0, 10)}...{domain.address.slice(-8)}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary dark:bg-muted">
          <TabsTrigger value="records" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Records</TabsTrigger>
          <TabsTrigger value="transfer" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Transfer</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4 mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-white">ENS Text Records</h3>
            {Object.entries(ensRecords).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label className="text-gray-300">{key}</Label>
                <Input
                  value={value}
                  onChange={(e) => setEnsRecords({ ...ensRecords, [key]: e.target.value })}
                  placeholder={`Enter ${key}`}
                  className="bg-secondary dark:bg-muted border-border text-foreground"
                />
              </div>
            ))}

            <div className="pt-4 border-t border-gray-700">
              <h3 className="font-semibold text-white mb-4">Custom Records</h3>
              
              {customRecords.map((record, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input value={record.key} disabled className="flex-1 bg-secondary dark:bg-muted text-foreground" />
                  <Input value={record.value} disabled className="flex-1 bg-secondary dark:bg-muted text-foreground" />
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
                  className="flex-1 bg-secondary dark:bg-muted border-border text-foreground"
                />
                <Input
                  value={newRecordValue}
                  onChange={(e) => setNewRecordValue(e.target.value)}
                  placeholder="Record value"
                  className="flex-1 bg-secondary dark:bg-muted border-border text-foreground"
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
              className="w-full bg-primary hover:bg-[hsl(var(--primary-glow))] text-primary-foreground font-semibold disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Records'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4 mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Transfer Domain</h3>
            <p className="text-sm text-gray-400">
              Transfer ownership of {domain.name}.{domain.domain} to another wallet address.
            </p>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Recipient Address</Label>
              <Input
                value={transferAddress}
                onChange={(e) => setTransferAddress(e.target.value)}
                placeholder="0x..."
                className="bg-secondary dark:bg-muted border-border text-foreground font-mono"
              />
            </div>

            <Button
              onClick={handleTransfer}
              disabled={isLoading || !transferAddress}
              className="w-full bg-primary hover:bg[hsl(var(--primary-glow))] text-primary-foreground font-semibold disabled:opacity-50"
            >
              {isLoading ? 'Transferring...' : 'Transfer Domain'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
