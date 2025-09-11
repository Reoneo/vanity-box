import React from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-secondary flex flex-col">
      <Header />
      
      {/* Hero Section - Top aligned for mobile */}
      <main className="flex-1 px-4 pt-8 md:pt-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
            Your Digital ID
          </h1>

          {/* Search Interface */}
          <div className="w-full max-w-md mx-auto">
            <SearchInterface />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 flex justify-center">
        <img 
          src="/lovable-uploads/39208f04-ef97-495d-b4bb-78351dbaf695.png" 
          alt="Vanity.box Logo" 
          className="w-16 h-16 object-contain"
        />
      </footer>
    </div>
  );
};

export default Index;
