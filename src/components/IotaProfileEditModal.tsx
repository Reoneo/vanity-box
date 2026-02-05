import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Plus, Trash2, Loader2, Image, Globe, Mail, User, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  OnchainProfileData,
  SocialLink,
  PlatformCode,
  getPlatformName,
  validateProfileData,
  VANITY_PROFILE_PACKAGE_ID,
  VANITY_PROFILE_REGISTRY_ID,
  clearProfileCache,
} from '@/lib/iota/vanityProfile';

interface IotaProfileEditModalProps {
  open: boolean;
  onClose: () => void;
  iotaName: string;
  nameObjectId: string;
  currentProfile: OnchainProfileData | null;
  onProfileUpdated: () => void;
}

// Platform options for the dropdown
const PLATFORM_OPTIONS = [
  { code: 1, name: 'X / Twitter', placeholder: 'https://x.com/username' },
  { code: 2, name: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
  { code: 3, name: 'Facebook', placeholder: 'https://facebook.com/username' },
  { code: 4, name: 'Instagram', placeholder: 'https://instagram.com/username' },
  { code: 5, name: 'Bluesky', placeholder: 'https://bsky.app/profile/username' },
  { code: 6, name: 'WhatsApp', placeholder: 'https://wa.me/number' },
  { code: 7, name: 'Telegram', placeholder: 'https://t.me/username' },
  { code: 8, name: 'Reddit', placeholder: 'https://reddit.com/u/username' },
  { code: 9, name: 'Spotify', placeholder: 'https://open.spotify.com/user/...' },
  { code: 10, name: 'YouTube', placeholder: 'https://youtube.com/@channel' },
  { code: 11, name: 'GitHub', placeholder: 'https://github.com/username' },
];

export function IotaProfileEditModal({
  open,
  onClose,
  iotaName,
  nameObjectId,
  currentProfile,
  onProfileUpdated,
}: IotaProfileEditModalProps) {
  const [isPending, setIsPending] = useState(false);
  
  // Form state
  const [avatarUrl, setAvatarUrl] = useState('');
  const [headerUrl, setHeaderUrl] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [links, setLinks] = useState<SocialLink[]>([]);
  
  // Initialize form from current profile
  useEffect(() => {
    if (currentProfile) {
      setAvatarUrl(currentProfile.avatarUrl || '');
      setHeaderUrl(currentProfile.headerUrl || '');
      setBio(currentProfile.bio || '');
      setEmail(currentProfile.email || '');
      setWebsite(currentProfile.website || '');
      setLinks(currentProfile.links || []);
    } else {
      // Reset to empty for new profile
      setAvatarUrl('');
      setHeaderUrl('');
      setBio('');
      setEmail('');
      setWebsite('');
      setLinks([]);
    }
  }, [currentProfile, open]);
  
  const handleAddLink = () => {
    // Find first unused platform
    const usedPlatforms = new Set(links.map(l => l.platform));
    const availablePlatform = PLATFORM_OPTIONS.find(p => !usedPlatforms.has(p.code as PlatformCode));
    
    if (availablePlatform) {
      setLinks([...links, { platform: availablePlatform.code as PlatformCode, url: '' }]);
    } else {
      toast.error('All social platforms already added');
    }
  };
  
  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };
  
  const handleLinkChange = (index: number, field: 'platform' | 'url', value: string | number) => {
    const newLinks = [...links];
    if (field === 'platform') {
      newLinks[index] = { ...newLinks[index], platform: value as PlatformCode };
    } else {
      newLinks[index] = { ...newLinks[index], url: value as string };
    }
    setLinks(newLinks);
  };
  
  const handleSave = async () => {
    // Validate
    const profileData: OnchainProfileData = {
      avatarUrl,
      headerUrl,
      bio,
      email,
      website,
      links: links.filter(l => l.url.trim()),
    };
    
    const validation = validateProfileData(profileData);
    if (!validation.valid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }
    
    // Check if contract is configured
    if (!VANITY_PROFILE_PACKAGE_ID || !VANITY_PROFILE_REGISTRY_ID) {
      toast.error('Onchain profile contract not yet deployed. The Move contract must be deployed to IOTA mainnet before profile editing is available.');
      return;
    }
    
    // TODO: When contract is deployed, use useSignAndExecuteTransaction hook from @iota/dapp-kit
    // For now, show a message that the contract needs to be deployed first
    toast.info('Onchain profile editing will be available once the Move contract is deployed to IOTA mainnet.');
    
    /*
    // Transaction building code - uncomment when contract is deployed:
    import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
    import { Transaction } from '@iota/iota-sdk/transactions';
    
    const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
    
    const tx = new Transaction();
    tx.moveCall({
      target: `${VANITY_PROFILE_PACKAGE_ID}::profiles::upsert_profile`,
      arguments: [
        tx.object(VANITY_PROFILE_REGISTRY_ID),
        tx.pure.id(nameObjectId),
        tx.pure.string(avatarUrl),
        tx.pure.string(headerUrl),
        tx.pure.string(bio),
        tx.pure.string(email),
        tx.pure.string(website),
      ],
    });
    
    signAndExecute({ transaction: tx }, {
      onSuccess: () => {
        toast.success('Profile updated onchain!');
        clearProfileCache(VANITY_PROFILE_REGISTRY_ID, nameObjectId);
        onProfileUpdated();
        onClose();
      },
      onError: (error) => {
        toast.error(`Transaction failed: ${error.message}`);
      },
    });
    */
  };
  
  const isContractReady = !!(VANITY_PROFILE_PACKAGE_ID && VANITY_PROFILE_REGISTRY_ID);
  
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Onchain Profile
          </DialogTitle>
          <DialogDescription>
            Update your {iotaName} profile stored on the IOTA blockchain.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="p-6 pt-4 space-y-6">
            {/* Contract not deployed warning */}
            {!isContractReady && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Contract Not Deployed</p>
                  <p className="text-xs opacity-80 mt-1">
                    The onchain profile Move contract has not been deployed yet. 
                    Profile editing will be available once the contract is live on IOTA mainnet.
                  </p>
                </div>
              </div>
            )}
            
            {/* Avatar URL */}
            <div className="space-y-2">
              <Label htmlFor="avatar" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Avatar URL
              </Label>
              <div className="flex gap-3">
                <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-muted">
                  <AvatarImage src={avatarUrl} alt="Avatar preview" />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
                <Input
                  id="avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Max 512 characters</p>
            </div>
            
            {/* Header URL */}
            <div className="space-y-2">
              <Label htmlFor="header" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Header Image URL
              </Label>
              {headerUrl && (
                <div className="w-full h-24 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={headerUrl} 
                    alt="Header preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
              <Input
                id="header"
                value={headerUrl}
                onChange={(e) => setHeaderUrl(e.target.value)}
                placeholder="https://example.com/header.png"
              />
              <p className="text-xs text-muted-foreground">Max 512 characters</p>
            </div>
            
            <Separator />
            
            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the world about yourself..."
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">{bio.length}/1000 characters</p>
            </div>
            
            {/* Email with warning */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>Warning: Email stored onchain is public and permanent.</span>
              </div>
            </div>
            
            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yoursite.com"
              />
            </div>
            
            <Separator />
            
            {/* Social Links */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Social Links
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLink}
                  disabled={links.length >= PLATFORM_OPTIONS.length}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Link
                </Button>
              </div>
              
              {links.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No social links added yet
                </p>
              ) : (
                <div className="space-y-3">
                  {links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={link.platform}
                        onChange={(e) => handleLinkChange(index, 'platform', parseInt(e.target.value))}
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {PLATFORM_OPTIONS.map((p) => (
                          <option 
                            key={p.code} 
                            value={p.code}
                            disabled={links.some((l, i) => i !== index && l.platform === p.code)}
                          >
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={link.url}
                        onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                        placeholder={PLATFORM_OPTIONS.find(p => p.code === link.platform)?.placeholder}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLink(index)}
                        className="flex-shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isPending || !isContractReady}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save to Blockchain'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
