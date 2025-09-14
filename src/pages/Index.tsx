import React from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';

const Index = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      
      <Header />
      
      {/* Hero Section - Top aligned for mobile */}
      <main className="flex-1 px-4 pt-8 md:pt-16 relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 leading-tight drop-shadow-lg">
            Your Digital ID
          </h1>

          {/* Search Interface */}
          <div className="w-full max-w-md mx-auto">
            <SearchInterface />
          </div>
        </div>
      </main>

      {/* Footer with Navy Gradient and Floating Gold Dots */}
      <footer className="py-16 relative z-10 overflow-hidden bg-gradient-to-b from-white to-[#1A1A2E]">
        {/* Floating Gold Dots */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-8 left-10 w-3 h-3 rounded-full bg-gradient-to-br from-[#F4E4BC] to-[#C9A876] animate-float opacity-80" />
          <div className="absolute bottom-12 right-20 w-2 h-2 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#C9A876] animate-subtleFloat" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 left-1/4 w-4 h-4 rounded-full bg-gradient-to-br from-[#F4E4BC] to-[#D4AF37] animate-shimmer opacity-70" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-16 right-1/3 w-3 h-3 rounded-full bg-gradient-to-br from-[#E6C77F] to-[#C9A876] animate-float" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-24 left-20 w-2 h-2 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] animate-subtleFloat" style={{ animationDelay: '1.5s' }} />
          <div className="absolute bottom-28 right-10 w-5 h-5 rounded-full bg-gradient-to-br from-[#F4E4BC] to-[#C9A876] animate-shimmer opacity-60" style={{ animationDelay: '3s' }} />
          <div className="absolute bottom-6 left-1/2 w-3 h-3 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E6C77F] animate-float" style={{ animationDelay: '2.5s' }} />
          <div className="absolute bottom-14 left-1/3 w-2 h-2 rounded-full bg-gradient-to-br from-[#F4E4BC] to-[#D4AF37] animate-subtleFloat" style={{ animationDelay: '0.8s' }} />
          <div className="absolute top-8 right-16 w-3 h-3 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4E4BC] animate-float" style={{ animationDelay: '3.2s' }} />
          <div className="absolute top-12 left-24 w-2 h-2 rounded-full bg-gradient-to-br from-[#E6C77F] to-[#C9A876] animate-subtleFloat" style={{ animationDelay: '1.8s' }} />
          <div className="absolute top-20 right-1/4 w-4 h-4 rounded-full bg-gradient-to-br from-[#F4E4BC] to-[#D4AF37] animate-shimmer opacity-70" style={{ animationDelay: '0.3s' }} />
          <div className="absolute top-16 left-1/3 w-3 h-3 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#C9A876] animate-float" style={{ animationDelay: '2.1s' }} />
        </div>
      </footer>
    </div>
  );
};

export default Index;
