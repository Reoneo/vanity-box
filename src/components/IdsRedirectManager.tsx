import React, { useState } from "react";
import { fullEnsName, vanityProfileUrl } from "@/lib/ensRedirect/profile";
import { setCustomRedirect, setDefaultVanityRedirect } from "@/lib/ensRedirect/service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = {
  parentDomain: string;
  subname: string;
  currentRedirectUrl?: string | null;
};

export default function IdsRedirectManager({ 
  parentDomain, 
  subname, 
  currentRedirectUrl 
}: Props) {
  const [customUrl, setCustomUrl] = useState<string>(currentRedirectUrl || "");
  const [isSaving, setIsSaving] = useState(false);

  // Extract just the subdomain label (e.g., "test321" from "test321.30315.eth")
  const subnameLabel = subname.toLowerCase().replace(`.${parentDomain.toLowerCase()}`, '').trim();
  
  const name = fullEnsName(subnameLabel, parentDomain);
  const defaultUrl = vanityProfileUrl(subnameLabel, parentDomain);

  async function handleReset() {
    setIsSaving(true);
    try {
      const result = await setDefaultVanityRedirect(parentDomain, subnameLabel);
      
      if (result.success && result.url) {
        setCustomUrl(result.url);
        toast({
          title: "Reset to default",
          description: `Now redirecting to ${result.url}`,
        });
      } else {
        throw new Error(result.error || "Failed to reset redirect");
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to reset redirect",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await setCustomRedirect(parentDomain, subnameLabel, customUrl.trim());
      
      if (result.success && result.url) {
        toast({
          title: "Redirect updated",
          description: `Now redirecting to ${result.url}`,
        });
      } else {
        throw new Error(result.error || "Failed to update redirect");
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to update redirect",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Redirect Settings for {name}</CardTitle>
        <CardDescription>
          Control where <code className="text-xs bg-muted px-1 py-0.5 rounded">{name}.eth.limo</code> and ENS-aware apps will send visitors.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Default Vanity Profile */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div>
            <div className="font-medium text-sm mb-1">Default Vanity Profile</div>
            <div className="text-sm text-muted-foreground break-all font-mono">
              {defaultUrl}
            </div>
          </div>
          <Button 
            onClick={handleReset} 
            disabled={isSaving}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
        </div>

        {/* Custom URL */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="customUrl">Custom Destination (HTTPS)</Label>
            <Input 
              id="customUrl" 
              placeholder="https://your-site.example/page"
              value={customUrl} 
              onChange={(e) => setCustomUrl(e.target.value)}
              disabled={isSaving}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !customUrl.trim()}
            >
              Save Custom Link
            </Button>
            
            <a 
              className="text-sm underline flex items-center gap-1 hover:text-primary" 
              href={`https://${name}.eth.limo`} 
              target="_blank" 
              rel="noreferrer"
            >
              Test {name}.eth.limo
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Free to update anytime. Changes are instant at gateways like <code className="bg-muted px-1 py-0.5 rounded">*.eth.limo</code>.
        </div>
      </CardContent>
    </Card>
  );
}
