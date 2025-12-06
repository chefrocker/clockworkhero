import React from 'react';
import { IconType } from 'react-icons';
import { 
    FaChrome, FaFirefox, FaEdge, FaOpera, FaSafari,
    FaWindows, FaApple, FaLinux, 
    FaSpotify, FaDiscord, FaSlack, FaWhatsapp, FaTelegram,
    FaFileWord, FaFileExcel, FaFilePowerpoint, FaFilePdf, FaFileCode,
    FaCode, FaTerminal, FaGitAlt, FaFolderOpen, FaCog, FaCalculator, FaCamera
} from 'react-icons/fa';
import { VscCode, VscTerminal, VscDebugConsole } from 'react-icons/vsc';
import { SiMicrosoftteams, SiAdobephotoshop, SiAdobeillustrator, SiAdobepremierepro, SiIntellijidea, SiVlc, SiNotion, SiObsstudio, SiPostman } from 'react-icons/si';

interface Props {
  path?: string; // Kann Pfad oder Name sein (z.B. "chrome.exe" oder "Google Chrome")
  fallbackColor: string;
  className?: string;
}

// 1. DAS MAPPING-OBJEKT (Dictionary)
// Key: Suchbegriff (kleingeschrieben), Value: Icon Component
const ICON_MAP: Record<string, IconType> = {
  // Browser
  'chrome': FaChrome,
  'google chrome': FaChrome,
  'firefox': FaFirefox,
  'mozilla': FaFirefox,
  'edge': FaEdge,
  'msedge': FaEdge,
  'opera': FaOpera,
  'safari': FaSafari,
  'brave': FaChrome, // Brave nutzt oft Chrome-Basis

  // Office
  'word': FaFileWord,
  'winword': FaFileWord,
  'excel': FaFileExcel,
  'powerpoint': FaFilePowerpoint,
  'powerpnt': FaFilePowerpoint,
  'outlook': FaFileWord, // Outlook Icon fehlt in FA Free, Word als Platzhalter oder Mail Icon
  'teams': SiMicrosoftteams,
  'onenote': FaFileWord,
  'pdf': FaFilePdf,
  'acrobat': FaFilePdf,

  // Dev
  'code': VscCode,
  'vscode': VscCode,
  'visual studio': VscCode,
  'intellij': SiIntellijidea,
  'idea': SiIntellijidea,
  'terminal': VscTerminal,
  'powershell': VscTerminal,
  'cmd': VscTerminal,
  'git': FaGitAlt,
  'postman': SiPostman,
  'node': FaCode,
  'python': FaCode,
  'rust': FaCode,

  // Media / Social
  'spotify': FaSpotify,
  'discord': FaDiscord,
  'slack': FaSlack,
  'whatsapp': FaWhatsapp,
  'telegram': FaTelegram,
  'vlc': SiVlc,
  'obs': SiObsstudio,
  'photoshop': SiAdobephotoshop,
  'illustrator': SiAdobeillustrator,
  'premiere': SiAdobepremierepro,
  'notion': SiNotion,

  // System
  'explorer': FaFolderOpen,
  'finder': FaFolderOpen,
  'settings': FaCog,
  'einstellungen': FaCog,
  'calc': FaCalculator,
  'calculator': FaCalculator,
  'camera': FaCamera,
};

// Optionale Farb-Overrides für bekannte Apps
const COLOR_MAP: Record<string, string> = {
  'chrome': '#f1c40f',
  'firefox': '#e67e22',
  'edge': '#0078d7',
  'word': '#2b579a',
  'excel': '#217346',
  'powerpoint': '#d24726',
  'teams': '#6264a7',
  'spotify': '#1db954',
  'discord': '#5865f2',
  'vscode': '#007acc',
  'code': '#007acc',
};

export const AppIcon: React.FC<Props> = ({ path, fallbackColor, className }) => {
  const searchString = (path || '').toLowerCase();

  // 2. SUCHE IM MAPPING
  // Wir suchen den ersten Key, der im Suchstring enthalten ist
  const matchedKey = Object.keys(ICON_MAP).find(key => searchString.includes(key));

  // 3. ICON WÄHLEN
  const IconComponent = matchedKey ? ICON_MAP[matchedKey] : FaWindows;

  // 4. FARBE WÄHLEN (Optional: Wenn wir eine Markenfarbe kennen, nutzen wir sie, sonst Fallback)
  // Wir nutzen hier aber meistens die Farbe, die vom Parent kommt (fallbackColor), 
  // damit es zum Block passt. Wenn du lieber Markenfarben willst, nutze specificColor.
  const specificColor = matchedKey && COLOR_MAP[matchedKey] ? COLOR_MAP[matchedKey] : fallbackColor;

  // Wir geben das Icon zurück. 
  // WICHTIG: Wir nutzen 'fallbackColor' für das Icon selbst, damit es harmonisch aussieht,
  // oder 'specificColor' wenn du es bunt willst. Hier nehme ich specificColor für Wiedererkennung.
  return <IconComponent style={{ color: specificColor }} className={className} />;
};
