import { createContext, useContext } from 'react';

export interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
  isOpen: boolean;
  shortcutLabel: string;
}

export const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);

  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }

  return context;
};
