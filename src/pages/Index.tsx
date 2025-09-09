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
            Your <span className="bg-gradient-primary bg-clip-text text-transparent">web3</span> username
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Your identity across web3, one name for all your crypto addresses,
            and your decentralised website.
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
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground">Universal Search</h3>
            <p className="text-muted-foreground">Find any Web3 identity across ENS, Lens, Farcaster, and more protocols.</p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-2xl">🔗</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground">Cross-Chain</h3>
            <p className="text-muted-foreground">Resolve addresses across multiple blockchains and networks.</p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground">Verified</h3>
            <p className="text-muted-foreground">World App integration ensures verified human identities.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
