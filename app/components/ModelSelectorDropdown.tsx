import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  ChevronDown,
  Cpu,
  Layers,
  X,
} from 'lucide-react';
import { AI_PROVIDERS, AIModelOption, getModelById, getProviderById } from '../utils/aiModels';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { SoundFXService } from '../utils/audio';

interface ModelSelectorDropdownProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'popover' | 'embedded';
  onModelSelected?: (model: AIModelOption) => void;
}

export const ModelSelectorDropdown: React.FC<ModelSelectorDropdownProps> = ({
  isOpen = true,
  onClose,
  variant = 'popover',
  onModelSelected,
}) => {
  const { enginePrefs, setEnginePrefs, accentTheme, deviceSettings } = useVoiceAssistant();

  const currentModel = useMemo(() => {
    return getModelById(enginePrefs.model);
  }, [enginePrefs.model]);

  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    enginePrefs.provider || currentModel.providerId || 'gemini'
  );
  const [isProviderMenuOpen, setIsProviderMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync selected provider with active model
  useEffect(() => {
    if (currentModel?.providerId) {
      setSelectedProviderId(currentModel.providerId);
    }
  }, [currentModel?.providerId]);

  // Handle outside click when in popover mode
  useEffect(() => {
    if (variant !== 'popover' || !isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, variant]);

  const currentProvider = useMemo(() => {
    return getProviderById(selectedProviderId);
  }, [selectedProviderId]);

  const handleSelectModel = (model: AIModelOption) => {
    setEnginePrefs({
      ...enginePrefs,
      model: model.id,
      provider: model.providerId,
    });

    if (deviceSettings.soundEffects) {
      SoundFXService.getInstance().playChime('click');
    }

    onModelSelected?.(model);
    if (variant === 'popover') {
      onClose?.();
    }
  };

  const handleSelectProvider = (providerId: string) => {
    setSelectedProviderId(providerId);
    setIsProviderMenuOpen(false);

    // Auto-select the first popular or first model of that provider
    const prov = getProviderById(providerId);
    if (prov && prov.models.length > 0) {
      const defaultModel = prov.models.find((m) => m.isPopular) || prov.models[0];
      setEnginePrefs({
        ...enginePrefs,
        model: defaultModel.id,
        provider: prov.id,
      });
      if (deviceSettings.soundEffects) {
        SoundFXService.getInstance().playChime('click');
      }
      onModelSelected?.(defaultModel);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`w-full text-left font-sans ${
        variant === 'popover'
          ? 'bg-[#121216] border border-white/15 rounded-2xl p-4 shadow-2xl overflow-hidden'
          : 'bg-[#121216]/90 border border-white/[0.08] rounded-2xl p-4'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center space-x-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: `${accentTheme.primary}20`, color: accentTheme.primary }}
          >
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-white tracking-wide">
            Select Provider & Model
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 1. Classic Provider Dropdown */}
      <div className="mt-3.5 space-y-1.5">
        <label className="text-[11px] font-medium text-neutral-400 block">
          AI Provider
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProviderMenuOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: currentProvider.iconColor }}
              />
              <span className="truncate">{currentProvider.name}</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                isProviderMenuOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </button>

          {/* Provider Dropdown List */}
          <AnimatePresence>
            {isProviderMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#1a1a20] border border-white/15 rounded-xl shadow-xl p-1 space-y-0.5 overflow-hidden"
              >
                {AI_PROVIDERS.map((provider) => {
                  const isSelected = selectedProviderId === provider.id;
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => handleSelectProvider(provider.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-white/15 text-white font-medium'
                          : 'text-neutral-300 hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: provider.iconColor }}
                        />
                        <span>{provider.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Classic Model List */}
      <div className="mt-3.5 space-y-1.5">
        <label className="text-[11px] font-medium text-neutral-400 block">
          Available Models ({currentProvider.models.length})
        </label>

        <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
          {currentProvider.models.map((model) => {
            const isSelected =
              enginePrefs.model.toLowerCase() === model.name.toLowerCase() ||
              enginePrefs.model.toLowerCase() === model.id.toLowerCase();

            return (
              <button
                key={model.id}
                type="button"
                onClick={() => handleSelectModel(model)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/15 border-white/30 text-white shadow-sm'
                    : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06] text-neutral-300'
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: `${accentTheme.primary}70`,
                      }
                    : undefined
                }
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {model.name}
                    </span>
                    {model.isPopular && (
                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-neutral-400 truncate mt-0.5">
                    {model.description}
                  </p>
                </div>

                <div className="shrink-0 flex items-center space-x-1.5">
                  {isSelected ? (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-black font-bold"
                      style={{ backgroundColor: accentTheme.primary }}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {model.speed}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Status */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-neutral-400">
        <div className="flex items-center space-x-1.5 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="truncate">
            Selected: <strong className="text-white">{enginePrefs.model}</strong>
          </span>
        </div>
        <span className="text-neutral-500 shrink-0">{currentProvider.shortName}</span>
      </div>
    </div>
  );
};
