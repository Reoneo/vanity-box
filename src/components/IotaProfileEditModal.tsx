import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Trash2, Loader2, Image, Globe, Mail, User, Link2, Fingerprint, ShieldCheck, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  OnchainProfileData,
  SocialLink,
  PlatformCode,
  getPlatformName,
  validateProfileData,
  saveProfileToIPFS,
  clearProfileCache,
} from '@/lib/iota/vanityProfile';
import { IdentityPanel } from '@/components/identity/IdentityPanel';
import { useIotaWallet } from '@/contexts/IotaWalletContext';
import { useVanityVerification } from '@/hooks/useVanityVerification';

interface IotaProfileEditModalProps {
  open: boolean;
  onClose: () => void;
  iotaName: string;
  nameObjectId: string;
  currentProfile: OnchainProfileData | null;
  linkedEvmAddress?: string | null;
  onProfileUpdated: () => void;
}

// Platform options for the dropdown — includes Discord (code 12)
const PLATFORM_OPTIONS = [
  { code: 1, name: 'X / Twitter', placeholder: 'https://x.com/username or @username' },
  { code: 2, name: 'LinkedIn', placeholder: 'https://linkedin.com/in/username or username' },
  { code: 3, name: 'Facebook', placeholder: 'https://facebook.com/username' },
  { code: 4, name: 'Instagram', placeholder: 'https://instagram.com/username or @username' },
  { code: 5, name: 'Bluesky', placeholder: 'https://bsky.app/profile/username' },
  { code: 6, name: 'WhatsApp', placeholder: 'https://wa.me/number' },
  { code: 7, name: 'Telegram', placeholder: 'https://t.me/username or username' },
  { code: 8, name: 'Reddit', placeholder: 'https://reddit.com/u/username' },
  { code: 9, name: 'Spotify', placeholder: 'https://open.spotify.com/user/...' },
  { code: 10, name: 'YouTube', placeholder: 'https://youtube.com/@channel' },
  { code: 11, name: 'GitHub', placeholder: 'https://github.com/username or username' },
  { code: 12, name: 'Discord', placeholder: 'Invite link or username' },
];

export function IotaProfileEditModal({
  open,
  onClose,
  iotaName,
  nameObjectId,
  currentProfile,
  linkedEvmAddress,
  onProfileUpdated,
}: IotaProfileEditModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('profile');
  const { address: iotaWalletAddress } = useIotaWallet();
  const [lastSaveResult, setLastSaveResult] = useState<{ ipfsCid: string; gatewayUrl: string } | null>(null);
  const vanityVerification = useVanityVerification();

  // Detect if current profile is NOT a .vanity.iota subdomain
  const isVanityIotaSubdomain = iotaName.toLowerCase().endsWith('.vanity.iota');
  const showVanitySection = !isVanityIotaSubdomain && !!linkedEvmAddress;
  
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
      setAvatarUrl('');
      setHeaderUrl('');
      setBio('');
      setEmail('');
      setWebsite('');
      setLinks([]);
    }
    setLastSaveResult(null);
  }, [currentProfile, open]);
  
  const handleAddLink = () => {
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

  // When saving, normalise Discord usernames to "discord:username" format
  const normaliseLinkForSave = (link: SocialLink): SocialLink => {
    if (link.platform === 12) {
      const raw = link.url.trim();
      // If it's a discord invite link, keep as-is
      if (/^https?:\/\//i.test(raw) && /discord\.(gg|com)/i.test(raw)) {
        return link;
      }
      // Otherwise store as discord:username
      const username = raw.replace(/^discord:/i, '').replace(/^@/, '').trim();
      return { ...link, url: `discord:${username}` };
    }
    return link;
  };
  
  const handleSave = async () => {
    const profileData: OnchainProfileData = {
      avatarUrl,
      headerUrl,
      bio,
      email,
      website,
      links: links.filter(l => l.url.trim()).map(normaliseLinkForSave),
    };
    
    const validation = validateProfileData(profileData);
    if (!validation.valid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }

    if (!iotaWalletAddress) {
      toast.error('Please connect your IOTA wallet first');
      return;
    }
    
    setIsPending(true);
    try {
      const result = await saveProfileToIPFS(iotaName, iotaWalletAddress, profileData);
      
      setLastSaveResult({
        ipfsCid: result.ipfsCid,
        gatewayUrl: result.gatewayUrl,
      });
      
      clearProfileCache(iotaName);
      
      toast.success('Profile saved to IPFS & notarized on IOTA!');
      onProfileUpdated();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit {iotaName}
          </DialogTitle>
          <DialogDescription>
            Profile stored on IPFS, integrity verified via IOTA notarization.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="identity" className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                Identity
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-0 flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="p-6 pt-4 space-y-4">
                {/* Last save result */}
                {lastSaveResult && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      CID: {lastSaveResult.ipfsCid.slice(0, 20)}...
                    </span>
                    <a 
                      href={lastSaveResult.gatewayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                
                {/* Avatar */}
                <div className="space-y-1.5">
                  <Label htmlFor="avatar" className="text-xs font-medium text-muted-foreground">Avatar URL</Label>
                  <div className="flex gap-3 items-center">
                    <Avatar className="h-12 w-12 flex-shrink-0 border border-border">
                      <AvatarImage src={avatarUrl} alt="Avatar" />
                      <AvatarFallback className="text-xs">?</AvatarFallback>
                    </Avatar>
                    <Input
                      id="avatar"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="flex-1 h-9 text-sm"
                    />
                  </div>
                </div>
                
                {/* Header */}
                <div className="space-y-1.5">
                  <Label htmlFor="header" className="text-xs font-medium text-muted-foreground">Header Image URL</Label>
                  <Input
                    id="header"
                    value={headerUrl}
                    onChange={(e) => setHeaderUrl(e.target.value)}
                    placeholder="https://example.com/header.png"
                    className="h-9 text-sm"
                  />
                </div>
                
                {/* Bio */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bio" className="text-xs font-medium text-muted-foreground">Bio</Label>
                    <span className="text-[10px] text-muted-foreground">{bio.length}/1000</span>
                  </div>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell the world about yourself..."
                    rows={2}
                    maxLength={1000}
                    className="text-sm resize-none"
                  />
                </div>
                
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    Stored on IPFS — publicly visible
                  </p>
                </div>
                
                {/* Website */}
                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-xs font-medium text-muted-foreground">Website</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yoursite.com"
                    className="h-9 text-sm"
                  />
                </div>
                
                {/* Social Links */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Social Links</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddLink}
                      disabled={links.length >= PLATFORM_OPTIONS.length}
                      className="h-7 text-xs px-2 text-[#D4AF37] hover:text-[#D4AF37]"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  {links.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      No social links added yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {links.map((link, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <select
                            value={link.platform}
                            onChange={(e) => handleLinkChange(index, 'platform', parseInt(e.target.value))}
                            className="h-9 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring min-w-[90px]"
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
                            className="flex-1 h-9 text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLink(index)}
                            className="flex-shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Sticky Profile Footer */}
            <div className="flex justify-end gap-3 p-6 pt-4 border-t bg-background flex-shrink-0">
              <Button variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isPending || !iotaWalletAddress}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving to IPFS...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </TabsContent>
          
          {/* Identity Tab */}
          <TabsContent value="identity" className="mt-0 flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 pt-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              <IdentityPanel 
                iotaName={iotaName} 
                walletAddress={iotaWalletAddress || ''} 
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
