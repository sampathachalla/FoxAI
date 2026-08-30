/**
 * Fox AI 3D Planetarium — Holographic Celestial Info Card
 * Displays rich glassmorphic telemetry, scientific metrics, 3 educational facts,
 * and camera action triggers for the currently selected celestial body.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { CelestialBodyData, CelestialId } from '../../types';
import {
  X,
  Crosshair,
  RotateCcw,
  Sparkles,
  Compass,
  Thermometer,
  Gauge,
  Clock,
  Ruler,
  Orbit,
  Moon,
  Zap,
  Disc,
  Flame,
  Globe,
  Radio,
} from 'lucide-react';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';

export interface CelestialInfoCardProps {
  body: CelestialBodyData | null;
  isOpen: boolean;
  onClose: () => void;
  onFocusCamera?: (id: CelestialId) => void;
  onResetCamera?: () => void;
  className?: string;
}

export const CelestialInfoCard: React.FC<CelestialInfoCardProps> = ({
  body,
  isOpen,
  onClose,
  onFocusCamera,
  onResetCamera,
  className = '',
}) => {
  const { accentTheme } = useVoiceAssistant();

  if (!body) return null;

  const isSun = body.id === 'sun';

  const getTypeBadgeStyle = () => {
    switch (body.type) {
      case 'star':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'terrestrial':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'gas_giant':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'ice_giant':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'dwarf_planet':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  const formatTypeName = (type: string) => {
    switch (type) {
      case 'star':
        return 'Central Star (G2V)';
      case 'terrestrial':
        return 'Terrestrial Planet';
      case 'gas_giant':
        return 'Jovian Gas Giant';
      case 'ice_giant':
        return 'Ice Giant';
      case 'dwarf_planet':
        return 'Dwarf Planet';
      default:
        return type;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={`celestial-card-${body.id}`}
          initial={{ opacity: 0, x: 24, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 24, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed md:absolute right-3 sm:right-6 top-16 md:top-6 bottom-20 md:bottom-auto w-[calc(100vw-1.5rem)] sm:w-[420px] md:w-[450px] max-h-[calc(100vh-8.5rem)] md:max-h-[calc(100vh-5rem)] z-40 flex flex-col rounded-3xl backdrop-blur-2xl bg-neutral-950/85 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white overflow-hidden ${className}`}
          style={{
            boxShadow: `0 10px 40px -10px ${body.glowColor}, 0 0 0 1px rgba(255,255,255,0.12)`,
          }}
        >
          {/* Top Holographic Header Bar */}
          <div className="relative px-5 pt-5 pb-4 border-b border-white/10 shrink-0 bg-gradient-to-b from-white/[0.06] to-transparent">
            {/* Ambient Body Glow */}
            <div
              className="absolute top-0 right-0 w-48 h-32 blur-3xl opacity-30 pointer-events-none rounded-full"
              style={{ backgroundColor: body.color }}
            />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center space-x-3.5">
                {/* Celestial Color Indicator Avatar */}
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center relative shadow-lg shrink-0 border border-white/25 overflow-hidden"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${body.color}, ${body.secondaryColor})`,
                    boxShadow: `0 0 20px ${body.glowColor}`,
                  }}
                >
                  {isSun ? (
                    <Flame className="w-6 h-6 text-white animate-pulse" />
                  ) : body.hasRings ? (
                    <Disc className="w-6 h-6 text-white/90" />
                  ) : (
                    <Globe className="w-6 h-6 text-white/90" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                      {body.name}
                    </h2>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold uppercase tracking-wider border ${getTypeBadgeStyle()}`}
                    >
                      {formatTypeName(body.type)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-medium truncate max-w-[240px]">
                    {body.subtitle}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 border border-transparent hover:border-white/10"
                title="Close Celestial Info Card"
                aria-label="Close Info Card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scientific Tagline */}
            <div className="mt-3 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center space-x-2">
              <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
              <p className="text-[11px] text-cyan-200 font-medium italic truncate">
                "{body.tagline}"
              </p>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar text-neutral-200 text-xs">
            {/* Summary Description */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 leading-relaxed text-neutral-300">
              <p className="text-xs">{body.description}</p>
            </div>

            {/* Scientific Physical Metrics Section */}
            <div>
              <div className="flex items-center space-x-2 mb-2.5">
                <Gauge className="w-3.5 h-3.5" style={{ color: accentTheme.primary }} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
                  Physical & Orbital Metrics
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Diameter */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-center space-x-1.5 text-neutral-400 mb-0.5">
                    <Ruler className="w-3 h-3 text-cyan-400" />
                    <span className="text-[10px] uppercase font-semibold tracking-wide">Diameter</span>
                  </div>
                  <div className="text-xs font-bold text-white font-mono">
                    {body.diameterKm.toLocaleString()} km
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {body.relativeDiameter}× Earth
                  </div>
                </div>

                {/* Distance From Sun */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-center space-x-1.5 text-neutral-400 mb-0.5">
                    <Orbit className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] uppercase font-semibold tracking-wide">Distance Sun</span>
                  </div>
                  <div className="text-xs font-bold text-white font-mono">
                    {isSun ? '0 km (Center)' : `${body.distanceFromSunMillionKm.toLocaleString()}M km`}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {isSun ? 'Orbital Origin' : `${body.distanceAu} AU`}
                  </div>
                </div>

                {/* Orbital Period */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-center space-x-1.5 text-neutral-400 mb-0.5">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] uppercase font-semibold tracking-wide">Orbital Period</span>
                  </div>
                  <div className="text-xs font-bold text-white font-mono">
                    {isSun ? 'N/A (~230M yr)' : `${body.orbitalPeriodDays.toLocaleString()} d`}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {isSun ? 'Galactic Center' : `${body.orbitalPeriodYears} Earth yr`}
                  </div>
                </div>

                {/* Orbital Speed */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-center space-x-1.5 text-neutral-400 mb-0.5">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-[10px] uppercase font-semibold tracking-wide">Orbital Speed</span>
                  </div>
                  <div className="text-xs font-bold text-white font-mono">
                    {isSun ? '0 km/s (Origin)' : `${body.orbitalSpeedKmS} km/s`}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {isSun ? 'Static Anchor' : 'Mean velocity'}
                  </div>
                </div>

                {/* Rotation Period */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-center space-x-1.5 text-neutral-400 mb-0.5">
                    <Compass className="w-3 h-3 text-purple-400" />
                    <span className="text-[10px] uppercase font-semibold tracking-wide">Day Length</span>
                  </div>
                  <div className="text-xs font-bold text-white font-mono">
                    {Math.abs(body.rotationPeriodHours).toLocaleString()} hrs
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {body.rotationPeriodHours < 0 ? 'Retrograde spin' : 'Prograde spin'}
                  </div>
                </div>

                {/* Surface Temperature */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-center space-x-1.5 text-neutral-400 mb-0.5">
                    <Thermometer className="w-3 h-3 text-rose-400" />
                    <span className="text-[10px] uppercase font-semibold tracking-wide">Temperature</span>
                  </div>
                  <div className="text-xs font-bold text-white font-mono truncate" title={body.surfaceTemperatureC}>
                    {body.surfaceTemperatureC}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {body.surfaceTemperatureK}
                  </div>
                </div>

                {/* Gravity */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-center space-x-1.5 text-neutral-400 mb-0.5">
                    <Globe className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] uppercase font-semibold tracking-wide">Gravity</span>
                  </div>
                  <div className="text-xs font-bold text-white font-mono">
                    {body.gravityMs2} m/s²
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {body.gravityG}g (Earth = 1.0g)
                  </div>
                </div>

                {/* Moons & Ring System */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-center space-x-1.5 text-neutral-400 mb-0.5">
                    <Moon className="w-3 h-3 text-teal-400" />
                    <span className="text-[10px] uppercase font-semibold tracking-wide">Moons & Rings</span>
                  </div>
                  <div className="text-xs font-bold text-white font-mono">
                    {body.moonsCount} {body.moonsCount === 1 ? 'Moon' : 'Moons'}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {body.hasRings ? 'Ring system: Yes' : 'Ring system: None'}
                  </div>
                </div>

                {/* Axial Tilt */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="text-[10px] uppercase font-semibold text-neutral-400 mb-0.5">
                    Axial Tilt
                  </div>
                  <div className="text-xs font-bold text-white font-mono">
                    {body.axialTiltDeg}°
                  </div>
                </div>

                {/* Orbital Inclination */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="text-[10px] uppercase font-semibold text-neutral-400 mb-0.5">
                    Orbital Inclination
                  </div>
                  <div className="text-xs font-bold text-white font-mono">
                    {body.orbitalInclinationDeg}°
                  </div>
                </div>
              </div>
            </div>

            {/* 3-Part Educational Scientific Facts */}
            <div>
              <div className="flex items-center space-x-2 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
                  Key Scientific Discoveries
                </span>
              </div>

              <div className="space-y-2">
                {body.facts.map((fact, idx) => (
                  <div
                    key={`fact-${idx}`}
                    className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-start space-x-2.5 hover:bg-white/[0.07] transition-colors"
                  >
                    <div
                      className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                      style={{
                        backgroundColor: `${body.color}25`,
                        color: body.color,
                        border: `1px solid ${body.color}50`,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <p className="text-[11px] leading-relaxed text-neutral-300">
                      {fact}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Action Triggers */}
          <div className="p-4 border-t border-white/10 bg-neutral-950/90 shrink-0 flex items-center gap-2.5">
            <button
              onClick={() => onFocusCamera?.(body.id)}
              className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/15 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              title={`Focus 3D camera onto ${body.name}`}
            >
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span>Focus Camera</span>
            </button>

            <button
              onClick={onResetCamera}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-2xl bg-white/[0.05] hover:bg-white/10 text-neutral-300 hover:text-white font-medium text-xs border border-white/10 transition-all cursor-pointer active:scale-[0.98]"
              title="Reset 3D camera to solar system overview"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
