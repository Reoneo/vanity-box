import React, { useState, useEffect } from "react";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Trash2, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Edit3
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import tonLogo from "@/assets/ton-logo.png";

interface TonDomainManagementPanelProps {
  domain: {
    subdomain: string;
    domain: string;
    wallet_address?: string;
  };
  onBack: () => void;
}

interface DnsRecords {
  wallet?: string;
  tonSite?: string;
  tonStorage?: string;
}

const VANITY_TON_CONTRACT = "EQDpBd8U9uFrxals7OqXMWp3EEWkL-DH3QDVM6xQ64pS5Lc_";

export const TonDomainManagementPanel: React.FC<TonDomainManagementPanelProps> = ({
  domain,
  onBack,
}) => {
  const [tonConnectUI] = useTonConnectUI();
  const userFriendlyAddress = useTonAddress();
  const rawAddress = useTonAddress(false);

  const [activeTab, setActiveTab] = useState("records");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // DNS Records state
  const [dnsRecords, setDnsRecords] = useState<DnsRecords>({
    wallet: domain.wallet_address || "",
    tonSite: "",
    tonStorage: "",
  });

  const [originalRecords, setOriginalRecords] = useState<DnsRecords>({});
  const [hasChanges, setHasChanges] = useState(false);

  const fullDomain = `${domain.subdomain}.${domain.domain}`;

  // Load existing DNS records
  useEffect(() => {
    loadDnsRecords();
  }, [domain]);

  // Check for changes
  useEffect(() => {
    const changed = 
      dnsRecords.wallet !== originalRecords.wallet ||
      dnsRecords.tonSite !== originalRecords.tonSite ||
      dnsRecords.tonStorage !== originalRecords.tonStorage;
    setHasChanges(changed);
  }, [dnsRecords, originalRecords]);

  const loadDnsRecords = async () => {
    setIsLoading(true);
    try {
      // For now, we'll load from the database
      // In a full implementation, you'd query the blockchain
      const { data, error } = await supabase
        .from("minted_domains")
        .select("*")
        .eq("subdomain", domain.subdomain)
        .eq("domain", domain.domain)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const records = {
          wallet: data.wallet_address || "",
          tonSite: "",
          tonStorage: "",
        };
        setDnsRecords(records);
        setOriginalRecords(records);
      }
    } catch (error) {
      console.error("Failed to load DNS records:", error);
      toast.error("Failed to load DNS records");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecords = async () => {
    if (!userFriendlyAddress) {
      toast.error("Please connect your TON wallet first");
      return;
    }

    try {
      setIsSaving(true);

      // Build the message to update subdomain DNS records
      const { Address, beginCell, toNano } = await import("@ton/core");
      const body = beginCell()
        .storeUint(1, 32) // op code for DNS update (different from creation)
        .storeStringTail(domain.subdomain)
        .storeAddress(dnsRecords.wallet ? Address.parse(dnsRecords.wallet) : null)
        .storeStringTail(dnsRecords.tonSite || "")
        .storeStringTail(dnsRecords.tonStorage || "")
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: [
          {
            address: VANITY_TON_CONTRACT,
            amount: toNano("0.05").toString(), // Small fee for update
            payload: body.toBoc().toString("base64"),
          },
        ],
      };

      console.log("Updating DNS records:", transaction);

      const result = await tonConnectUI.sendTransaction(transaction);
      console.log("Transaction sent:", result);

      // Update local state
      setOriginalRecords(dnsRecords);
      toast.success("DNS records updated successfully!");

      // Optionally update the database
      await supabase
        .from("minted_domains")
        .update({ wallet_address: dnsRecords.wallet })
        .eq("subdomain", domain.subdomain)
        .eq("domain", domain.domain);

    } catch (error: any) {
      console.error("Failed to save records:", error);
      toast.error(error.message || "Failed to save records");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (!window.confirm(`Are you sure you want to delete ${fullDomain}? This action cannot be undone.`)) {
      return;
    }

    if (!userFriendlyAddress) {
      toast.error("Please connect your TON wallet first");
      return;
    }

    try {
      setIsDeleting(true);

      // Build the message to delete subdomain
      const { beginCell, toNano } = await import("@ton/core");
      const body = beginCell()
        .storeUint(2, 32) // op code for deletion
        .storeStringTail(domain.subdomain)
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: [
          {
            address: VANITY_TON_CONTRACT,
            amount: toNano("0.01").toString(),
            payload: body.toBoc().toString("base64"),
          },
        ],
      };

      console.log("Deleting domain:", transaction);

      const result = await tonConnectUI.sendTransaction(transaction);
      console.log("Delete transaction sent:", result);

      toast.success("Domain deleted successfully!");

      // Delete from database
      await supabase
        .from("minted_domains")
        .delete()
        .eq("subdomain", domain.subdomain)
        .eq("domain", domain.domain);

      // Go back after successful deletion
      setTimeout(() => onBack(), 1500);

    } catch (error: any) {
      console.error("Failed to delete domain:", error);
      toast.error(error.message || "Failed to delete domain");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyAddress = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleResetChanges = () => {
    setDnsRecords(originalRecords);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <img src={tonLogo} alt="TON" className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {fullDomain}
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700">
                  TON Domain
                </Badge>
                {hasChanges && (
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700">
                    Unsaved Changes
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Status */}
      {!userFriendlyAddress && (
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-900 dark:text-amber-100">
                Connect your TON wallet to manage this domain
              </p>
              <Button
                onClick={() => tonConnectUI.openModal()}
                size="sm"
                className="ml-auto bg-[#0088CC] hover:bg-[#0077B3] text-white"
              >
                Connect Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="records">DNS Records</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                DNS Records
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {/* Wallet Address */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      Linked Wallet Address
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={dnsRecords.wallet}
                        onChange={(e) => setDnsRecords({ ...dnsRecords, wallet: e.target.value })}
                        placeholder="TON wallet address"
                        disabled={!userFriendlyAddress}
                        className="font-mono text-sm"
                      />
                      {dnsRecords.wallet && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopyAddress(dnsRecords.wallet!)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This wallet will be linked to your domain
                    </p>
                  </div>

                  <Separator />

                  {/* TON Site */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      TON Site (ADNL)
                      <Badge variant="secondary" className="text-xs">Optional</Badge>
                    </label>
                    <Input
                      value={dnsRecords.tonSite}
                      onChange={(e) => setDnsRecords({ ...dnsRecords, tonSite: e.target.value })}
                      placeholder="ADNL address for TON site"
                      disabled={!userFriendlyAddress}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Link your domain to a site in the ADNL network
                    </p>
                  </div>

                  <Separator />

                  {/* TON Storage */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      TON Storage
                      <Badge variant="secondary" className="text-xs">Optional</Badge>
                    </label>
                    <Input
                      value={dnsRecords.tonStorage}
                      onChange={(e) => setDnsRecords({ ...dnsRecords, tonStorage: e.target.value })}
                      placeholder="TON Storage bag ID"
                      disabled={!userFriendlyAddress}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Link your domain to a TON Storage item
                    </p>
                  </div>

                  {/* Action Buttons */}
                  {hasChanges && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleSaveRecords}
                        disabled={!userFriendlyAddress || isSaving}
                        className="flex-1 bg-[#0088CC] hover:bg-[#0077B3] text-white"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleResetChanges}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-xs text-blue-900 dark:text-blue-100">
                  <p className="font-semibold">About TON DNS Records:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Changes are recorded on the TON blockchain</li>
                    <li>Each update requires a small transaction fee (~0.05 TON)</li>
                    <li>Updates may take a few seconds to confirm</li>
                    <li>All fields are optional except wallet address</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-red-300 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-100">
                      Delete Domain
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      Permanently delete {fullDomain}. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteDomain}
                    disabled={!userFriendlyAddress || isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Domain
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Domain Info */}
          <Card>
            <CardHeader>
              <CardTitle>Domain Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="font-semibold text-gray-700 dark:text-gray-300">
                  Full Domain:
                </div>
                <div className="text-gray-900 dark:text-white font-mono">
                  {fullDomain}
                </div>

                <div className="font-semibold text-gray-700 dark:text-gray-300">
                  Subdomain:
                </div>
                <div className="text-gray-900 dark:text-white font-mono">
                  {domain.subdomain}
                </div>

                <div className="font-semibold text-gray-700 dark:text-gray-300">
                  Parent Domain:
                </div>
                <div className="text-gray-900 dark:text-white font-mono">
                  {domain.domain}
                </div>

                <div className="font-semibold text-gray-700 dark:text-gray-300">
                  Contract:
                </div>
                <div className="text-gray-900 dark:text-white font-mono text-xs flex items-center gap-2">
                  {VANITY_TON_CONTRACT.slice(0, 8)}...{VANITY_TON_CONTRACT.slice(-6)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopyAddress(VANITY_TON_CONTRACT)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TonDomainManagementPanel;
