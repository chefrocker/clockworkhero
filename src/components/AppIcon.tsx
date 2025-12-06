import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { IconType } from 'react-icons';
import { 
    FaChrome, FaFirefox, FaEdge, FaOpera, FaSafari,
    FaWindows, FaApple, FaLinux, 
    FaSpotify, FaDiscord, FaSlack, FaWhatsapp, FaTelegram,
    FaFileWord, FaFileExcel, FaFilePowerpoint, FaFilePdf, 
    FaCode, FaTerminal, FaGitAlt, FaFolderOpen, FaCog, FaCalculator, FaCamera,
    FaUsers, FaImage, FaPlayCircle
} from 'react-icons/fa';
import { VscCode, VscTerminal } from 'react-icons/vsc';
import { SiMicrosoftteams, SiAdobephotoshop, SiIntellijidea, SiVlc, SiNotion, SiPostman } from 'react-icons/si';

interface Props {
  path?: string;      
  appName?: string;   
  fallbackColor: string;
  className?: string;
}

// Globaler Cache
const iconCache = new Map<string, string>();

// Das Mapping (Fallback First)
const ICON_MAP: Record<string, IconType> = {
  'chrome': FaChrome, 'google chrome': FaChrome, 'firefox': FaFirefox, 'edge': FaEdge, 'opera': FaOpera,
  'word': FaFileWord, 'excel': FaFileExcel, 'powerpoint': FaFilePowerpoint, 'outlook': FaFileWord,
  'teams': FaUsers, 'pdf': FaFilePdf,
  'code': VscCode, 'vscode': VscCode, 'visual studio': VscCode, 'intellij': SiIntellijidea,
  'terminal': VscTerminal, 'powershell': VscTerminal, 'cmd': VscTerminal, 'git': FaGitAlt,
  'spotify': FaSpotify, 'discord': FaDiscord, 'slack': FaSlack, 'whatsapp': FaWhatsapp,
  'vlc': FaPlayCircle, 'photoshop': FaImage, 'explorer': FaFolderOpen, 'settings': FaCog
};

export const AppIcon: React.FC<Props> = ({ path, appName, fallbackColor, className }) => {
  // State nur für das echte Bild
  const [realIconSrc, setRealIconSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;

    // 1. Cache Check (Sofort anzeigen wenn da)
    if (iconCache.has(path)) {
        setRealIconSrc(iconCache.get(path)!);
        return;
    }

    // 2. Rust Call (Asynchron)
    let isMounted = true;
    
    // WICHTIG: Wir nutzen setTimeout, um den "flushSync" Fehler zu verhindern.
    // Wir schieben den Request aus dem Render-Zyklus raus.
    const timer = setTimeout(() => {
        invoke<string>('get_exe_icon', { path })
        .then((base64) => {
            if (isMounted && base64 && base64.length > 50) {
                iconCache.set(path, base64);
                setRealIconSrc(base64);
            }
        })
        .catch(() => {
            // Fehler ignorieren -> Wir bleiben einfach beim Fallback-Icon
        });
    }, 10);

    return () => { 
        isMounted = false; 
        clearTimeout(timer);
    };
  }, [path]);

  // --- RENDER LOGIK ---

  // 1. Haben wir ein echtes Icon geladen? Dann zeigen!
  if (realIconSrc) {
    return <img src={realIconSrc} alt={appName} className={className} style={{ objectFit: 'contain' }} />;
  }

  // 2. Wenn nicht: Zeige SOFORT das Fallback-Icon aus der Liste
  const searchString = (appName || path || '').toLowerCase();
  const matchedKey = Object.keys(ICON_MAP).find(key => searchString.includes(key));
  
  if (matchedKey) {
      const IconComponent = ICON_MAP[matchedKey];
      return <IconComponent style={{ color: fallbackColor }} className={className} />;
  }

  // 3. Wenn gar nichts passt: Initialen oder Windows Logo
  // Das verhindert leere Flecken
  return (
    <div className={className} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: fallbackColor, fontWeight: 'bold', fontSize: '0.8em', opacity: 0.7
    }}>
      <FaWindows />
    </div>
  );
};
