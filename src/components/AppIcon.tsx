import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
    FaChrome, FaFirefox, FaEdge, FaOpera, 
    FaSpotify, FaDiscord, FaSlack, FaWhatsapp, 
    FaCode, FaFolderOpen, FaCog, FaCalculator, FaCamera,
    FaQuestion
} from 'react-icons/fa';

// Nur verfügbare Icons importieren
import { SiAdobephotoshop, SiIntellijidea, SiNotion, SiPostman } from 'react-icons/si';

interface Props {
  appName?: string;
  path?: string;
  fallbackColor?: string;
  className?: string;
}

export const AppIcon: React.FC<Props> = ({ appName, path, fallbackColor, className }) => {
  const [iconSrc, setIconSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (path) {
      invoke<string>('get_exe_icon', { path })
        .then(data => { if (isMounted) setIconSrc(data); })
        .catch(() => { if (isMounted) setIconSrc(null); });
    }
    return () => { isMounted = false; };
  }, [path]);

  if (iconSrc) {
    return <img src={iconSrc} alt="" className={className} style={{width: '100%', height: '100%', objectFit: 'contain'}} />;
  }

  const name = appName?.toLowerCase() || "";
  const iconProps = { className, style: { width: '100%', height: '100%', color: fallbackColor || '#94a3b8' } };

  if (name.includes('chrome')) return <FaChrome {...iconProps} />;
  if (name.includes('firefox')) return <FaFirefox {...iconProps} />;
  if (name.includes('edge')) return <FaEdge {...iconProps} />;
  if (name.includes('opera')) return <FaOpera {...iconProps} />;
  
  if (name.includes('code') || name.includes('visual studio')) return <FaCode {...iconProps} />;
  if (name.includes('intellij')) return <SiIntellijidea {...iconProps} />;
  
  if (name.includes('photoshop')) return <SiAdobephotoshop {...iconProps} />;
  
  if (name.includes('spotify')) return <FaSpotify {...iconProps} />;
  if (name.includes('discord')) return <FaDiscord {...iconProps} />;
  if (name.includes('slack')) return <FaSlack {...iconProps} />;
  if (name.includes('whatsapp')) return <FaWhatsapp {...iconProps} />;
  
  if (name.includes('notion')) return <SiNotion {...iconProps} />;
  if (name.includes('postman')) return <SiPostman {...iconProps} />;
  
  if (name.includes('explorer') || name.includes('finder')) return <FaFolderOpen {...iconProps} />;
  if (name.includes('settings') || name.includes('einstellungen')) return <FaCog {...iconProps} />;
  if (name.includes('calc')) return <FaCalculator {...iconProps} />;
  if (name.includes('camera')) return <FaCamera {...iconProps} />;

  return <FaQuestion {...iconProps} style={{...iconProps.style, opacity: 0.5}} />;
};
