import React from 'react';
import { Header } from '@/components/Header';
import { SearchInterface } from '@/components/SearchInterface';
import patternTiles from '@/assets/pattern-tiles.jpeg';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      
      <Header />
      
      {/* Hero Section - Top aligned for mobile */}
      <main className="flex-1 px-4 pt-8 md:pt-16 relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 dark:text-gold leading-tight drop-shadow-lg">
            Coming 🔜
          </h1>

          {/* Search Interface */}
          <div className="w-full max-w-md mx-auto">
            <SearchInterface />
          </div>
        </div>
        
        {/* Pattern Tiles Row */}
        <div className="mt-16 flex justify-center overflow-hidden">
          <div className="flex space-x-2">
            <img src={patternTiles} alt="Pattern Tile" className="w-32 h-32 object-cover" />
            <img src={patternTiles} alt="Pattern Tile" className="w-32 h-32 object-cover" />
            <img src={patternTiles} alt="Pattern Tile" className="w-32 h-32 object-cover" />
            <img src={patternTiles} alt="Pattern Tile" className="w-32 h-32 object-cover" />
            <img src={patternTiles} alt="Pattern Tile" className="w-32 h-32 object-cover" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
