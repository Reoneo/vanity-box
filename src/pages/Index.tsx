import React from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-secondary flex flex-col">
      <Header />
      
      {/* Hero Section - Full screen centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 space-y-8">
        {/* Logo Image */}
        <div className="mb-8">
          <img 
            src="/lovable-uploads/39208f04-ef97-495d-b4bb-78351dbaf695.png" 
            alt="Vanity.box Logo" 
            className="w-32 h-32 object-contain"
          />
        </div>

        {/* Main Heading */}
        <div className="text-center space-y-6 max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Your Digital ID
          </h1>
        </div>

        {/* Search Interface */}
        <div className="w-full max-w-md">
          <SearchInterface />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 flex justify-center">
        <img 
          src="/lovable-uploads/39208f04-ef97-495d-b4bb-78351dbaf695.png" 
          alt="Vanity.box Logo" 
          className="w-16 h-16 object-contain opacity-50"
        />
      </footer>
    </div>
  );
};

export default Index;
