import React from 'react';
import { Sun, Wind, Droplets } from 'lucide-react';

export const WeatherWidget: React.FC = () => {
  return (
    <div className="glass-card p-5 shadow-xl text-white flex flex-col justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-[0.1em] text-[#007AFF] font-bold mb-2">
          Environment Status
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-medium text-neutral-300">Cupertino, CA</div>
            <div className="text-2xl font-light text-white tracking-tight mt-0.5">72°F</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#007AFF]/20 flex items-center justify-center text-[#007AFF]">
            <Sun className="w-5 h-5 animate-spin" style={{ animationDuration: '30s' }} />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="w-full h-[2px] bg-neutral-800 rounded-full overflow-hidden mb-2.5">
          <div className="w-3/4 h-full bg-[#007AFF]" />
        </div>
        <div className="flex justify-between items-center text-[10px] text-neutral-400">
          <span>Partly Sunny</span>
          <span>H: 76° L: 58°</span>
        </div>
      </div>
    </div>
  );
};
