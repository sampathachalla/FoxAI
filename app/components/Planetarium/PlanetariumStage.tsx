/**
 * Fox AI 3D Planetarium — Main Stage Container Component
 * Orchestrates 60 FPS Canvas rendering, HUD Controls, Holographic Info Card,
 * Assistant Audio Reactivity, and localStorage persistence.
 */

import React, { useState, useCallback } from 'react';
import type { CelestialId } from '../../types';
import { StorageService } from '../../services/storage';
import { getCelestialBody } from './PlanetaryData';
import { SolarSystemCanvas } from './SolarSystemCanvas';
import { CelestialInfoCard } from './CelestialInfoCard';
import { PlanetariumControls } from './PlanetariumControls';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { Volume2, Mic } from 'lucide-react';

export const PlanetariumStage: React.FC = () => {
  const {
    audioLevel,
    frequencyData,
    accentTheme,
    status,
    speakingTranscript,
    currentTranscript,
  } = useVoiceAssistant();

  // Selected / Focused Celestial Target State (Persisted)
  const [focusedId, setFocusedId] = useState<CelestialId>(() =>
    StorageService.loadPlanetariumTarget('sun')
  );

  // Info Card Modal Visibility State
  const [isInfoCardOpen, setIsInfoCardOpen] = useState<boolean>(true);

  // Simulation Controls State
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Persist target selection
  const handleSelectCelestial = useCallback((id: CelestialId) => {
    setFocusedId(id);
    setIsInfoCardOpen(true);
    StorageService.savePlanetariumTarget(id);
  }, []);

  const handleResetCamera = useCallback(() => {
    setFocusedId('sun');
    StorageService.savePlanetariumTarget('sun');
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleToggleOrbits = useCallback(() => {
    setShowOrbits((prev) => !prev);
  }, []);

  const handleToggleLabels = useCallback(() => {
    setShowLabels((prev) => !prev);
  }, []);

  const handleToggleInfoCard = useCallback(() => {
    setIsInfoCardOpen((prev) => !prev);
  }, []);

  const activeBodyData = getCelestialBody(focusedId);

  return (
    <div className="relative w-full h-full flex flex-col items-stretch overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl select-none">
      {/* 1. HTML5 Canvas 3D Solar System Rendering Engine */}
      <SolarSystemCanvas
        focusedId={focusedId}
        onSelectCelestial={handleSelectCelestial}
        simulationSpeed={simulationSpeed}
        isPaused={isPaused}
        audioLevel={audioLevel}
        frequencyData={frequencyData}
        showOrbits={showOrbits}
        showLabels={showLabels}
        onResetCamera={handleResetCamera}
        className="w-full h-full"
      />

      {/* 2. Tactical HUD Controls (Top Selector Carousel & Bottom Speed/Dock) */}
      <PlanetariumControls
        focusedId={focusedId}
        onSelectCelestial={handleSelectCelestial}
        simulationSpeed={simulationSpeed}
        onChangeSimulationSpeed={setSimulationSpeed}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        showOrbits={showOrbits}
        onToggleOrbits={handleToggleOrbits}
        showLabels={showLabels}
        onToggleLabels={handleToggleLabels}
        onResetCamera={handleResetCamera}
        isInfoCardOpen={isInfoCardOpen}
        onToggleInfoCard={handleToggleInfoCard}
        audioLevel={audioLevel}
      />

      {/* 3. Holographic Celestial Info Card Overlay */}
      <CelestialInfoCard
        body={activeBodyData}
        isOpen={isInfoCardOpen}
        onClose={() => setIsInfoCardOpen(false)}
        onFocusCamera={handleSelectCelestial}
        onResetCamera={handleResetCamera}
      />

      {/* 4. Assistant Audio Speech Subtitle Live Overlay */}
      {(status === 'speaking' || status === 'listening') && (speakingTranscript || currentTranscript) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-[85vw] sm:max-w-md px-4 py-2 rounded-2xl bg-neutral-950/85 backdrop-blur-xl border border-white/20 shadow-2xl text-center flex items-center space-x-2.5 animate-in fade-in duration-200 pointer-events-none">
          {status === 'speaking' ? (
            <Volume2
              className="w-4 h-4 shrink-0 animate-pulse"
              style={{ color: accentTheme.primary }}
            />
          ) : (
            <Mic className="w-4 h-4 shrink-0 text-rose-400 animate-pulse" />
          )}
          <p className="text-xs text-white font-medium truncate font-sans">
            {speakingTranscript || currentTranscript}
          </p>
        </div>
      )}
    </div>
  );
};
