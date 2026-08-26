import React from 'react';
import { DeviceSettingState } from '../../types';
import { Moon, Shield, Wifi, Sparkles, Volume2 } from 'lucide-react';

interface DeviceControlWidgetProps {
  settings: DeviceSettingState;
  onUpdate: (key: keyof DeviceSettingState, value: any) => void;
}

export const DeviceControlWidget: React.FC<DeviceControlWidgetProps> = ({
  settings,
  onUpdate,
}) => {
  return (
    <div className="glass-card p-5 shadow-xl text-white flex flex-col justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-[0.1em] text-neutral-400 font-bold mb-3">
          System Controls
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Focus Mode */}
          <button
            onClick={() => onUpdate('focusMode', !settings.focusMode)}
            className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
              settings.focusMode
                ? 'bg-[#007AFF]/20 border-[#007AFF]/50 text-white'
                : 'bg-white/[0.03] border-white/5 text-neutral-400 hover:bg-white/[0.08]'
            }`}
          >
            <Moon className={`w-4 h-4 ${settings.focusMode ? 'text-[#007AFF]' : ''}`} />
            <div className="mt-2">
              <div className="text-[11px] font-medium leading-tight">Focus</div>
              <div className="text-[9px] text-neutral-400">
                {settings.focusMode ? 'Active' : 'Off'}
              </div>
            </div>
          </button>

          {/* Privacy Mode */}
          <button
            onClick={() => onUpdate('doNotDisturb', !settings.doNotDisturb)}
            className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
              settings.doNotDisturb
                ? 'bg-purple-500/20 border-purple-500/50 text-white'
                : 'bg-white/[0.03] border-white/5 text-neutral-400 hover:bg-white/[0.08]'
            }`}
          >
            <Shield className={`w-4 h-4 ${settings.doNotDisturb ? 'text-purple-400' : ''}`} />
            <div className="mt-2">
              <div className="text-[11px] font-medium leading-tight">Privacy</div>
              <div className="text-[9px] text-neutral-400">
                {settings.doNotDisturb ? 'Enforced' : 'Normal'}
              </div>
            </div>
          </button>
        </div>

        {/* Ambient Glow Toggle */}
        <div className="mt-2.5 flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-[11px] text-neutral-300 flex items-center space-x-1.5">
            <Sparkles className="w-3 h-3 text-[#007AFF]" />
            <span>Ambient Aura</span>
          </span>
          <button
            onClick={() => onUpdate('ambientGlow', !settings.ambientGlow)}
            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
              settings.ambientGlow ? 'bg-[#007AFF]' : 'bg-neutral-700'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                settings.ambientGlow ? 'translate-x-3.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-500">
        <span className="flex items-center space-x-1">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span>Wi-Fi 6E</span>
        </span>
        <span className="font-mono">12ms Latency</span>
      </div>
    </div>
  );
};
