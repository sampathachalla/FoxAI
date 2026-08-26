import React, { useState } from 'react';
import { ReminderWidget } from './Widgets/ReminderWidget';
import { WeatherWidget } from './Widgets/WeatherWidget';
import { NoteWidget } from './Widgets/NoteWidget';
import { DeviceControlWidget } from './Widgets/DeviceControlWidget';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';

export const ActionDeck: React.FC = () => {
  const {
    reminders,
    toggleReminder,
    deleteReminder,
    addReminder,
    notes,
    addNote,
    deleteNote,
    deviceSettings,
    updateDeviceSetting,
    accentTheme,
  } = useVoiceAssistant();

  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="w-full mx-auto px-1 mb-1 z-20">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400 hover:text-white transition-colors"
        >
          <LayoutGrid className="w-3.5 h-3.5" style={{ color: accentTheme.primary }} />
          <span>Modular Services & Intelligence Hub</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <span className="text-[10px] text-neutral-500 font-mono">Backend Latency: 12ms</span>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-in fade-in duration-200">
          <WeatherWidget />
          <ReminderWidget
            reminders={reminders}
            onToggle={toggleReminder}
            onDelete={deleteReminder}
            onAdd={addReminder}
          />
          <NoteWidget
            notes={notes}
            onAdd={addNote}
            onDelete={deleteNote}
          />
          <DeviceControlWidget
            settings={deviceSettings}
            onUpdate={updateDeviceSetting}
          />
        </div>
      )}
    </div>
  );
};
