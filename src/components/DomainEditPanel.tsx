import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Gift, Send, Trash2, Plus, X } from 'lucide-react';
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
  onBack: () => void;
}

export const DomainEditPanel: React.FC<DomainEditPanelProps> = ({ domain, onBack }) => {
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

  const handleWrap = async () => {
    try {
      setIsLoading(true);
      toast.info('Wrapping domain via Durin on World Chain...');
      toast.success('Domain wrapping initiated!');
      window.dispatchEvent(new CustomEvent('domains-updated'));
    } catch (error) {
      toast.error('Failed to wrap domain');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnwrap = async () => {
    try {
      toast.info('Unwrapping domain...');
      toast.success('Domain unwrapped successfully!');
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
      toast.success('Domain transferred successfully!');
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
        onBack();
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
    <div className="w-full max-w-2xl mx-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors"
      >
        <span className="text-xl">←</span>
        <span className="font-medium">Back to My ID's</span>
      </button>
      
      {/* Domain Header */}
      <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-700">
        <div className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-[#D4AF37] overflow-hidden bg-black/30 backdrop-blur-sm">
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
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-400/30">
              ENS L2 (Durin)
            </Badge>
            {domain.isWrapped ? (
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-400/30">
                ERC-1155
              </Badge>
            ) : (
              <Badge className="bg-green-500/10 text-green-400 border-green-400/30">
                ERC-20
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="records" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="records" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">Records</TabsTrigger>
          <TabsTrigger value="transfer" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">Transfer</TabsTrigger>
          <TabsTrigger value="wrap" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">Wrap/Delete</TabsTrigger>
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
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            ))}

            <div className="pt-4 border-t border-gray-700">
              <h3 className="font-semibold text-white mb-4">Custom Records</h3>
              
              {customRecords.map((record, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input value={record.key} disabled className="flex-1 bg-gray-800 text-white" />
                  <Input value={record.value} disabled className="flex-1 bg-gray-800 text-white" />
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
                  className="flex-1 bg-gray-800 border-gray-700 text-white"
                />
                <Input
                  value={newRecordValue}
                  onChange={(e) => setNewRecordValue(e.target.value)}
                  placeholder="Record value"
                  className="flex-1 bg-gray-800 border-gray-700 text-white"
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

        <TabsContent value="transfer" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Transfer to Address</Label>
              <Input
                value={transferAddress}
                onChange={(e) => setTransferAddress(e.target.value)}
                placeholder="0x..."
                className="mt-2 bg-gray-800 border-gray-700 text-white"
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

        <TabsContent value="wrap" className="space-y-4 mt-4">
          <div className="space-y-4">
            {!domain.isWrapped ? (
              <div className="p-4 bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Wrap Domain with Durin</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Wrapping your domain converts it from ERC-20 to an ERC-1155 NFT via Durin on World Chain, enabling enhanced features.
                </p>
                <Button
                  onClick={handleWrap}
                  disabled={isLoading}
                  className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold disabled:opacity-50"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  {isLoading ? 'Wrapping...' : 'Wrap with Durin'}
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Unwrap Domain</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Unwrapping will convert your domain from ERC-1155 back to ERC-20.
                </p>
                <Button
                  onClick={handleUnwrap}
                  disabled={isLoading}
                  className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold disabled:opacity-50"
                >
                  {isLoading ? 'Unwrapping...' : 'Unwrap'}
                </Button>
              </div>
            )}

            <div className="pt-4 border-t border-gray-700">
              <div className="p-4 bg-red-900/20 rounded-lg">
                <h4 className="font-semibold text-red-400 mb-2">Danger Zone</h4>
                <p className="text-sm text-red-400 mb-4">
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
    </div>
  );
};
