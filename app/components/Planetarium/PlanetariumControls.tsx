/**
 * Fox AI 3D Planetarium — Tactical HUD Controls Overlay
 * Features 10-pill celestial switcher carousel, simulation speed control,
 * orbit toggles, reset overview, and real-time telemetry readout.
 */

import React from 'react';
import { motion } from 'motion/react';
import type { CelestialId } from '../../types';
import { CELESTIAL_BODIES, getCelestialBody } from './PlanetaryData';
import {
  Play,
  Pause,
  RotateCcw,
  Orbit,
  Info,
  Eye,
  Volume2,
} from 'lucide-react';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';

export interface PlanetariumControlsProps {
  focusedId: CelestialId;
  onSelectCelestial: (id: CelestialId) => void;
  simulationSpeed: number;
  onChangeSimulationSpeed: (speed: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  showOrbits: boolean;
  onToggleOrbits: () => void;
  showLabels?: boolean;
  onToggleLabels?: () => void;
  onResetCamera: () => void;
  isInfoCardOpen: boolean;
  onToggleInfoCard: () => void;
  audioLevel?: number;
  className?: string;
}

const SPEED_OPTIONS: { label: string; value: number }[] = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1.0 },
  { label: '2x', value: 2.0 },
  { label: '5x', value: 5.0 },
  { label: '10x', value: 10.0 },
];

export const PlanetariumControls: React.FC<PlanetariumControlsProps> = ({
  focusedId,
  onSelectCelestial,
  simulationSpeed,
  onChangeSimulationSpeed,
  isPaused,
  onTogglePause,
  showOrbits,
  onToggleOrbits,
  showLabels = true,
  onToggleLabels,
  onResetCamera,
  isInfoCardOpen,
  onToggleInfoCard,
  audioLevel = 0,
  className = '',
}) => {
  const { accentTheme } = useVoiceAssistant();
  const activeBody = getCelestialBody(focusedId);

  return (
    <div className={`pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 md:p-5 select-none ${className}`}>
      {/* ------------------------------------------------------------------- */}
      {/* Top HUD: 10-Pill Celestial Quick Switcher Carousel                   */}
      {/* ------------------------------------------------------------------- */}
      <div className="w-full flex justify-center items-center pointer-events-auto">
        <div className="max-w-[96vw] overflow-x-auto p-1 rounded-full bg-neutral-950/80 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center space-x-1 custom-scrollbar">
          {CELESTIAL_BODIES.map((body) => {
            const isSelected = focusedId === body.id;

            return (
              <button
                key={body.id}
                onClick={() => onSelectCelestial(body.id)}
                className={`relative z-10 flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'text-white font-bold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
                }`}
                title={`Inspect ${body.name} (${body.type})`}
              >
                {/* Active Sliding Pill Highlight */}
                {isSelected && (
                  <motion.div
                    layoutId="activeCelestialPill"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute inset-0 rounded-full z-[-1] border border-white/20"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.16)',
                      boxShadow: `0 0 12px ${body.glowColor}`,
                    }}
                  />
                )}

                {/* Body Colored Dot Indicator */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm transition-transform"
                  style={{
                    backgroundColor: body.color,
                    boxShadow: isSelected ? `0 0 8px ${body.color}` : 'none',
                    transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                  }}
                />

                <span className="leading-none tracking-tight">{body.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Bottom HUD: Telemetry Badge + Simulation Speed & Camera Dock         */}
      {/* ------------------------------------------------------------------- */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-auto">
        {/* Left Telemetry Card */}
        <div className="flex items-center space-x-3 px-3.5 py-2 rounded-2xl bg-neutral-950/80 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6)] text-xs text-neutral-300">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
            style={{ backgroundColor: activeBody.color }}
          />

          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5 font-mono">
              <span className="text-white font-bold tracking-tight">{activeBody.name}</span>
              <span className="text-[10px] text-neutral-400 uppercase">
                • {activeBody.distanceAu} AU
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono flex items-center space-x-2">
              <span>{activeBody.orbitalSpeedKmS} km/s</span>
              <span>•</span>
              <span className="truncate max-w-[120px] sm:max-w-[180px]">{activeBody.subtitle}</span>
            </div>
          </div>

          {/* Audio Reactivity Meter */}
          {audioLevel > 0.02 && (
            <div
              className="flex items-center space-x-1 px-2 py-0.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-[10px] font-mono text-cyan-300"
              title={`Live Audio Pulse: ${Math.round(audioLevel * 100)}%`}
            >
              <Volume2 className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>{Math.round(audioLevel * 100)}%</span>
            </div>
          )}
        </div>

        {/* Center / Right Tactical Control Dock */}
        <div className="flex items-center flex-wrap justify-center gap-2 p-1.5 rounded-2xl bg-neutral-950/80 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          {/* Pause / Play Button */}
          <button
            onClick={onTogglePause}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
            title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            aria-label={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-mono">{isPaused ? 'PAUSED' : 'LIVE'}</span>
          </button>

          {/* Speed Selector Buttons */}
          <div className="flex items-center space-x-0.5 p-0.5 rounded-xl bg-white/[0.04] border border-white/10">
            {SPEED_OPTIONS.map((opt) => {
              const isSelected = !isPaused && simulationSpeed === opt.value;

              return (
                <button
                  key={`speed-${opt.value}`}
                  onClick={() => onChangeSimulationSpeed(opt.value)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white/20 text-white font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={`Set Simulation Speed to ${opt.label}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-white/15 mx-0.5 hidden sm:block" />

          {/* Toggle Orbits Track */}
          <button
            onClick={onToggleOrbits}
            className={`p-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center space-x-1 ${
              showOrbits
                ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
            title={showOrbits ? 'Hide Orbit Tracks' : 'Show Orbit Tracks'}
            aria-label="Toggle Orbit Tracks"
          >
            <Orbit className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Orbits</span>
          </button>

          {/* Toggle Labels */}
          {onToggleLabels && (
            <button
              onClick={onToggleLabels}
              className={`p-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center space-x-1 ${
                showLabels
                  ? 'text-indigo-300 bg-indigo-500/10 border border-indigo-500/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
              title={showLabels ? 'Hide Celestial Labels' : 'Show Celestial Labels'}
              aria-label="Toggle Labels"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">Labels</span>
            </button>
          )}

          {/* Reset Camera Overview */}
          <button
            onClick={onResetCamera}
            className="p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center space-x-1"
            title="Reset Camera to Solar System Overview"
            aria-label="Reset Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">Reset</span>
          </button>

          {/* Info Card Toggle */}
          <button
            onClick={onToggleInfoCard}
            className={`p-2 rounded-xl text-xs transition-all cursor-pointer flex items-center space-x-1 ${
              isInfoCardOpen
                ? 'bg-white/20 text-white font-semibold shadow-inner border border-white/20'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
            style={{
              color: isInfoCardOpen ? accentTheme.primary : undefined,
            }}
            title={isInfoCardOpen ? 'Close Celestial Info Card' : 'Open Celestial Info Card'}
            aria-label="Toggle Celestial Info Card"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="text-[11px]">Info</span>
          </button>
        </div>
      </div>
    </div>
  );
};
