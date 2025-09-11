import React from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';
import { AnnouncementCard } from '@/components/AnnouncementCard';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-secondary">
      <Header />
      
      {/* Hero Section */}
      <main className="container mx-auto px-4 pt-16 pb-24 space-y-12">
        {/* Main Heading */}
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Vanity.<span className="bg-gradient-primary bg-clip-text text-transparent">₿ox</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Human-verified ENS subdomains for the Web3 world. Your unique identity,
            verified by World ID, secured on-chain.
          </p>
        </div>

        {/* Search Interface */}
        <div className="max-w-2xl mx-auto">
          <SearchInterface />
        </div>

        {/* Announcement Card */}
        <div className="max-w-2xl mx-auto">
          <AnnouncementCard />
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto pt-16">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground">World ID Verified</h3>
            <p className="text-muted-foreground">Biometric verification ensures one subdomain per unique human being.</p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground">Instant Minting</h3>
            <p className="text-muted-foreground">Mint your ENS subdomain in seconds with WLD, USDC, or ETH.</p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-2xl">🌐</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground">Universal Resolution</h3>
            <p className="text-muted-foreground">Your subdomain resolves across all Web3 apps and wallets.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
