import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
    FaChrome, FaFirefox, FaEdge, FaOpera,
    FaSpotify, FaDiscord, FaSlack, FaWhatsapp,
    FaCode, FaFolderOpen, FaCog, FaCalculator, FaCamera,
    FaQuestion,
} from 'react-icons/fa';
import { SiAdobephotoshop, SiIntellijidea, SiNotion, SiPostman } from 'react-icons/si';

interface Props {
    appName?: string;
    path?: string;
    fallbackColor?: string;
    className?: string;
    /** Explizite Größe in px – macht Icon-Darstellung in jedem Layout zuverlässig */
    size?: number;
}

export const AppIcon: React.FC<Props> = ({
    appName,
    path,
    fallbackColor,
    className,
    size = 20,
}) => {
    const [iconSrc, setIconSrc] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (path) {
            invoke<string>('get_exe_icon', { path })
                .then(data  => { if (isMounted) setIconSrc(data); })
                .catch(()   => { if (isMounted) setIconSrc(null); });
        } else {
            setIconSrc(null);
        }
        return () => { isMounted = false; };
    }, [path]);

    const px = `${size}px`;

    // ── Natives EXE-Icon (PNG via Tauri) ─────────────────────────────────────
    if (iconSrc) {
        return (
            <img
                src={iconSrc}
                alt=""
                className={className}
                style={{ width: px, height: px, objectFit: 'contain', display: 'block', flexShrink: 0 }}
            />
        );
    }

    // ── Bekannte App-Icons (React Icons) ─────────────────────────────────────
    const name = appName?.toLowerCase() || '';
    const svgStyle: React.CSSProperties = {
        width: px, height: px,
        color: fallbackColor || '#94a3b8',
        flexShrink: 0,
        display: 'block',
    };
    const p = { className, style: svgStyle, size };

    if (name.includes('chrome'))                           return <FaChrome          {...p} />;
    if (name.includes('firefox'))                          return <FaFirefox         {...p} />;
    if (name.includes('edge'))                             return <FaEdge            {...p} />;
    if (name.includes('opera'))                            return <FaOpera           {...p} />;
    if (name.includes('code') || name.includes('visual studio')) return <FaCode     {...p} />;
    if (name.includes('intellij'))                         return <SiIntellijidea    {...p} />;
    if (name.includes('photoshop'))                        return <SiAdobephotoshop  {...p} />;
    if (name.includes('spotify'))                          return <FaSpotify         {...p} />;
    if (name.includes('discord'))                          return <FaDiscord         {...p} />;
    if (name.includes('slack'))                            return <FaSlack           {...p} />;
    if (name.includes('whatsapp'))                         return <FaWhatsapp        {...p} />;
    if (name.includes('notion'))                           return <SiNotion          {...p} />;
    if (name.includes('postman'))                          return <SiPostman         {...p} />;
    if (name.includes('explorer') || name.includes('finder')) return <FaFolderOpen  {...p} />;
    if (name.includes('settings') || name.includes('einstellungen')) return <FaCog  {...p} />;
    if (name.includes('calc'))                             return <FaCalculator      {...p} />;
    if (name.includes('camera'))                           return <FaCamera          {...p} />;

    return <FaQuestion {...p} style={{ ...svgStyle, opacity: 0.5 }} />;
};
