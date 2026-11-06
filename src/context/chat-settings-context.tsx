import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatSettings {
  allowEditing: boolean;
  allowDeleting: boolean;
}

interface ChatSettingsContextType {
  settings: ChatSettings;
  setSettings: React.Dispatch<React.SetStateAction<ChatSettings>>;
}

const ChatSettingsContext = createContext<ChatSettingsContextType | undefined>(undefined);

export const ChatSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ChatSettings>({
    allowEditing: true,
    allowDeleting: true,
  });

  return (
    <ChatSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </ChatSettingsContext.Provider>
  );
};

export const useChatSettings = () => {
  const context = useContext(ChatSettingsContext);
  if (context === undefined) {
    throw new Error('useChatSettings must be used within a ChatSettingsProvider');
  }
  return context;
};