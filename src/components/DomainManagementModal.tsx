import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Gift, Send, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

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
  const [transferAddress, setTransferAddress] = useState('');
  const [customRecords, setCustomRecords] = useState<{ key: string; value: string }[]>([]);
  const [newRecordKey, setNewRecordKey] = useState('');
  const [newRecordValue, setNewRecordValue] = useState('');

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
      toast.info('Wrapping domain via Durin on World Chain...');
      // TODO: Implement Durin wrapping
      toast.success('Domain wrapped successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to wrap domain');
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
      toast.info('Deleting domain...');
      // TODO: Implement delete
      toast.success('Domain deleted successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to delete domain');
    }
  };

  const handleSaveRecords = async () => {
    try {
      toast.info('Saving records...');
      // TODO: Implement record saving
      toast.success('Records saved successfully!');
    } catch (error) {
      toast.error('Failed to save records');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
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
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
            <TabsTrigger value="wrap">Wrap/Delete</TabsTrigger>
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
                className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold"
              >
                Save Records
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
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Domain
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
