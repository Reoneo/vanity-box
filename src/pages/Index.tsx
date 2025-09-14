import React from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#1A1A2E] flex flex-col relative overflow-hidden">
      {/* Background Pattern with Gold Dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-3 h-3 rounded-full bg-gradient-to-br from-[#F4E4BC] to-[#C9A876] animate-float opacity-80" />
        <div className="absolute top-32 right-20 w-2 h-2 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#C9A876] animate-subtleFloat" style={{ animationDelay: '1s' }} />
        <div className="absolute top-60 left-1/4 w-4 h-4 rounded-full bg-gradient-to-br from-[#F4E4BC] to-[#D4AF37] animate-shimmer opacity-70" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-40 right-1/3 w-3 h-3 rounded-full bg-gradient-to-br from-[#E6C77F] to-[#C9A876] animate-float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-60 left-20 w-2 h-2 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] animate-subtleFloat" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-80 right-10 w-5 h-5 rounded-full bg-gradient-to-br from-[#F4E4BC] to-[#C9A876] animate-shimmer opacity-60" style={{ animationDelay: '3s' }} />
      </div>
      
      <Header />
      
      {/* Hero Section - Top aligned for mobile */}
      <main className="flex-1 px-4 pt-8 md:pt-16 relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight drop-shadow-lg">
            Your Digital ID
          </h1>

          {/* Search Interface */}
          <div className="w-full max-w-md mx-auto">
            <SearchInterface />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 flex justify-center relative z-10">
        <img 
          src="/lovable-uploads/39208f04-ef97-495d-b4bb-78351dbaf695.png" 
          alt="Vanity.box Logo" 
          className="w-16 h-16 object-contain drop-shadow-lg"
        />
      </footer>
    </div>
  );
};

export default Index;
