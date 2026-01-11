import React, { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Database from '@tauri-apps/plugin-sql';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { FaCog, FaSave, FaClock, FaPalette, FaDatabase, FaBriefcase, FaCheck, FaTimes, FaLock, FaUnlock, FaHdd, FaKey, FaUndo, FaInfoCircle, FaSun, FaMoon, FaFileExcel, FaTrash } from 'react-icons/fa';
import { AppSettings, Project, DaySchedule } from '../types';
import { AppIcon } from './AppIcon';
import { getCroppedImg } from '../utils/imageUtils';
import { getKnownApps, saveAppConfig, backupDatabase, restoreDatabase, saveSetting, exportAllLogsToExcel } from '../services/db';

// Import Sub-Components
import { GeneralTab } from './settings/GeneralTab';
import { ProjectsTab } from './settings/ProjectsTab';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    projects: Project[];
    onSaveSettings: (newSettings: AppSettings) => void;
    onUpdateProject: (id: number, name: string, color: string, icon?: string, iconType?: 'app' | 'image') => void;
    onDeleteProject: (id: number) => void;
    onAddProject: (name: string, color: string, icon?: string, iconType?: 'app' | 'image') => void;
    onResetData: () => void;
    db: Database | null;
}

function hslToHex(h: number, s: number, l: number) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function colorToHex(color: string): string {
    if (!color) return '#000000';
    if (color.startsWith('#')) return color;
    if (color.startsWith('hsl')) {
        const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (match) {
            return hslToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
        }
    }
    return '#000000';
}

function getDefaultWeekSchedule(): DaySchedule[] {
    const days = [
        { dayName: 'Montag', dayShort: 'Mo' },
        { dayName: 'Dienstag', dayShort: 'Di' },
        { dayName: 'Mittwoch', dayShort: 'Mi' },
        { dayName: 'Donnerstag', dayShort: 'Do' },
        { dayName: 'Freitag', dayShort: 'Fr' },
        { dayName: 'Samstag', dayShort: 'Sa' },
        { dayName: 'Sonntag', dayShort: 'So' }
    ];

    return days.map((d, idx) => ({
        ...d,
        isWorkday: idx < 5,
        blocks: idx < 5 ? [{ id: `block-${idx}-1`, start: "08:00", end: "17:00" }] : [],
        totalHours: idx < 5 ? 9 : 0
    }));
}

export const SettingsModal: React.FC<Props> = ({
    isOpen, onClose, settings, projects,
    onSaveSettings, onUpdateProject, onDeleteProject, onAddProject,
    onResetData, db
}) => {

    const [activeTab, setActiveTab] = useState<'general' | 'tracking' | 'projects' | 'colors' | 'database' | 'about'>('general');
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

    // State für Image Cropper
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [editingProjId, setEditingProjId] = useState<number | null>(null);
    const [editingAppName, setEditingAppName] = useState<string | null>(null);

    // State für Colors Tab
    const [knownApps, setKnownApps] = useState<{ name: string, color: string, icon?: string }[]>([]);
    const [appSearch, setAppSearch] = useState("");

    // State für Database Tab
    const [dbPasswordInput, setDbPasswordInput] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isDbUnlocked, setIsDbUnlocked] = useState(false);
    const [hasPassword, setHasPassword] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const initSettings = { ...settings };
            if (!initSettings.weekSchedule || initSettings.weekSchedule.length === 0) {
                initSettings.weekSchedule = getDefaultWeekSchedule();
            }
            if (!initSettings.hiddenDays) {
                initSettings.hiddenDays = [];
            }
            setLocalSettings(initSettings);

            const hasPw = !!settings.adminPassword;
            setHasPassword(hasPw);
            if (!hasPw) setIsDbUnlocked(true);
            else setIsDbUnlocked(false);
        }
    }, [isOpen, settings]);

    useEffect(() => {
        if (activeTab === 'colors' && db) {
            getKnownApps(db).then(setKnownApps);
        }
    }, [activeTab, db]);

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleIconUpdate = async (target: 'project' | 'app', idOrName: string | number) => {
        try {
            const file = await open({
                multiple: false,
                filters: [{ name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'webp', 'ico'] }]
            });

            if (!file) return;
            const contents = await readFile(file as string);
            let binary = '';
            const bytes = new Uint8Array(contents);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
            const base64 = btoa(binary);
            const dataUrl = `data:image/png;base64,${base64}`;

            setCropImageSrc(dataUrl);

            if (target === 'project') {
                setEditingProjId(idOrName as number);
                setEditingAppName(null);
            } else {
                setEditingAppName(idOrName as string);
                setEditingProjId(null);
            }
        } catch (e) {
            console.error("Fehler beim Icon-Update:", e);
            alert("Fehler beim Laden des Bildes.");
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropImageSrc(reader.result as string);
                setEditingProjId(null); // Wird für neues Projekt genutzt
            });
            reader.readAsDataURL(file);
        }
    };

    const saveCroppedImage = async () => {
        if (cropImageSrc && croppedAreaPixels) {
            try {
                const croppedImageBase64 = await getCroppedImg(cropImageSrc, croppedAreaPixels);

                if (editingProjId !== null) {
                    const proj = projects.find(p => p.id === editingProjId);
                    if (proj) onUpdateProject(proj.id, proj.name, proj.color, croppedImageBase64, 'image');
                } else if (editingAppName !== null) {
                    if (db) {
                        const app = knownApps.find(a => a.name === editingAppName);
                        if (app) {
                            await saveAppConfig(db, editingAppName, app.color, croppedImageBase64);
                            setKnownApps(prev => prev.map(a => a.name === editingAppName ? { ...a, icon: croppedImageBase64 } : a));
                        }
                    }
                } else {
                    // Hier müssten wir den State an ProjectsTab weitergeben, das ist komplexer.
                    // Vereinfachung: Wir speichern es temporär im LocalStorage oder nutzen einen Context.
                    // Da wir hier refactorn, lassen wir das "Neue Projekt Icon" Feature kurz außen vor oder lösen es anders.
                    // Für jetzt: Alert.
                    alert("Bitte erstelle das Projekt zuerst, dann klicke auf das Icon zum Bearbeiten.");
                }
                setCropImageSrc(null);
                setZoom(1);
                setEditingProjId(null);
                setEditingAppName(null);
            } catch (e) { console.error(e); }
        }
    };

    const handleAppColorChange = async (name: string, color: string) => {
        if (db) {
            await saveAppConfig(db, name, color);
            setKnownApps(prev => prev.map(a => a.name === name ? { ...a, color } : a));
        }
    };

    const handleDbUnlock = () => {
        if (dbPasswordInput === settings.adminPassword) { setIsDbUnlocked(true); setDbPasswordInput(""); } else { alert("Falsches Passwort!"); }
    };
    const handleSetPassword = async () => {
        if (!newPassword || !db) return;
        await saveSetting(db, 'adminPassword', newPassword);
        setHasPassword(true); onSaveSettings({ ...localSettings, adminPassword: newPassword }); alert("Passwortschutz aktiviert!"); setNewPassword("");
    };
    const handleRemovePassword = async () => {
        if (window.confirm("Passwortschutz wirklich entfernen?") && db) {
            await saveSetting(db, 'adminPassword', "");
            setHasPassword(false); setIsDbUnlocked(true); onSaveSettings({ ...localSettings, adminPassword: "" });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>

            {cropImageSrc && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10000, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column'
                }} onClick={e => e.stopPropagation()}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                    </div>
                    <div style={{ padding: '20px', background: '#2c3e50', display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
                        <label htmlFor="zoom-slider" style={{ fontWeight: 'bold', color: 'white' }}>Zoom:</label>
                        <input id="zoom-slider" name="zoom-slider" type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} />
                        <button className="btn-secondary" onClick={() => setCropImageSrc(null)}><FaTimes /> Abbrechen</button>
                        <button className="btn-save" onClick={saveCroppedImage}><FaCheck /> Übernehmen</button>
                    </div>
                </div>
            )}

            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '900px', height: '700px', display: 'flex', flexDirection: 'column' }}>

                <div className="modal-header" style={{ background: '#2c3e50', padding: '20px 30px' }}>
                    <FaCog size={24} />
                    <h2 style={{ margin: 0 }}>Einstellungen</h2>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    <div style={{ width: '220px', background: 'var(--bg-color)', borderRight: '1px solid var(--border-color)', padding: '20px 0' }}>
                        <TabButton icon={<FaClock />} label="Allgemein" active={activeTab === 'general'} onClick={() => setActiveTab('general')} />
                        <TabButton icon={<FaPalette />} label="Tracking & Design" active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} />
                        <TabButton icon={<FaBriefcase />} label="Projekte" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
                        <TabButton icon={<FaPalette />} label="Activity Farben" active={activeTab === 'colors'} onClick={() => setActiveTab('colors')} />
                        <TabButton icon={<FaDatabase />} label="Datenbank" active={activeTab === 'database'} onClick={() => setActiveTab('database')} />
                        <TabButton icon={<FaInfoCircle />} label="Über" active={activeTab === 'about'} onClick={() => setActiveTab('about')} />
                    </div>

                    <div style={{ flex: 1, padding: '40px', overflowY: 'auto', background: 'var(--panel-bg)' }}>

                        {activeTab === 'general' && (
                            <GeneralTab
                                settings={localSettings}
                                onChange={setLocalSettings}
                                defaultSchedule={getDefaultWeekSchedule()}
                            />
                        )}

                        {activeTab === 'tracking' && (
                            <div>
                                <h3 className="settings-h3" style={{ color: 'var(--text-color)' }}>Design</h3>
                                <div className="input-group" style={{ marginBottom: '20px' }}>
                                    <label className="input-label">Erscheinungsbild</label>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <button className="btn-secondary" style={{ background: !localSettings.darkMode ? '#3b82f6' : 'transparent', color: !localSettings.darkMode ? 'white' : 'var(--text-color)', borderColor: !localSettings.darkMode ? '#3b82f6' : 'var(--border-color)' }} onClick={() => setLocalSettings({ ...localSettings, darkMode: false })}><FaSun /> Light Mode</button>
                                        <button className="btn-secondary" style={{ background: localSettings.darkMode ? '#3b82f6' : 'transparent', color: localSettings.darkMode ? 'white' : 'var(--text-color)', borderColor: localSettings.darkMode ? '#3b82f6' : 'var(--border-color)' }} onClick={() => setLocalSettings({ ...localSettings, darkMode: true })}><FaMoon /> Dark Mode</button>
                                    </div>
                                </div>
                                <h3 className="settings-h3" style={{ color: 'var(--text-color)' }}>Activity Stream</h3>
                                <div style={{ marginBottom: '30px', background: 'var(--bg-color)', padding: '20px', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <label className="input-label" style={{ margin: 0 }}>Gruppierung: {localSettings.groupingThreshold} Minuten</label>
                                        <label htmlFor="auto-grouping" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-color)' }}>
                                            <input
                                                id="auto-grouping"
                                                name="auto-grouping"
                                                type="checkbox"
                                                checked={localSettings.autoGrouping}
                                                onChange={e => setLocalSettings({ ...localSettings, autoGrouping: e.target.checked })}
                                            />
                                            Automatik
                                        </label>
                                    </div>
                                    <label htmlFor="grouping-threshold" className="sr-only" style={{ display: 'none' }}>Gruppierungs-Schwellenwert</label>
                                    <input
                                        id="grouping-threshold"
                                        name="grouping-threshold"
                                        type="range"
                                        min="1"
                                        max="240"
                                        step="1"
                                        style={{ width: '100%', opacity: localSettings.autoGrouping ? 0.4 : 1, pointerEvents: localSettings.autoGrouping ? 'none' : 'auto' }}
                                        value={localSettings.groupingThreshold || 5}
                                        onChange={e => setLocalSettings({ ...localSettings, groupingThreshold: parseInt(e.target.value) })}
                                    />
                                    {localSettings.autoGrouping && (
                                        <p style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '8px' }}>Das Programm wählt den besten Schwellenwert automatisch.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'projects' && (
                            <ProjectsTab
                                projects={projects}
                                onUpdate={onUpdateProject}
                                onDelete={onDeleteProject}
                                onAdd={onAddProject}
                                onIconUpdate={handleIconUpdate}
                                onFileChange={handleFileChange}
                            />
                        )}

                        {activeTab === 'colors' && (
                            <div>
                                <h3 className="settings-h3" style={{ color: 'var(--text-color)' }}>Activity Farben & Icons</h3>
                                <p className="settings-desc" style={{ color: 'var(--text-secondary)' }}>Klicke auf das Icon, um ein eigenes Bild hochzuladen.</p>
                                <label htmlFor="app-search" className="sr-only" style={{ display: 'none' }}>Programme suchen</label>
                                <input id="app-search" name="app-search" className="input-text" placeholder="Suchen..." value={appSearch} onChange={e => setAppSearch(e.target.value)} style={{ marginBottom: '20px' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                                    {knownApps.filter(a => a.name.toLowerCase().includes(appSearch.toLowerCase())).map(app => (
                                        <div key={app.name} style={{ background: 'var(--bg-color)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div className="icon-editable" onClick={() => handleIconUpdate('app', app.name)} title="Klicken um Icon zu ändern" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                                                {app.icon ? <img src={app.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <AppIcon appName={app.name} fallbackColor={app.color} />}
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-color)' }} title={app.name}>{app.name}</div>
                                            </div>
                                            <label htmlFor={`app-color-${app.name}`} className="sr-only" style={{ display: 'none' }}>Farbe für {app.name}</label>
                                            <input
                                                id={`app-color-${app.name}`}
                                                name={`app-color-${app.name}`}
                                                type="color"
                                                value={colorToHex(app.color)}
                                                onChange={e => handleAppColorChange(app.name, e.target.value)}
                                                style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '50%' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'database' && (
                            <div>
                                <h3 className="settings-h3" style={{ color: 'var(--text-color)' }}>Datenbank Verwaltung</h3>
                                {!isDbUnlocked ? (
                                    <div style={{ background: 'var(--bg-color)', padding: '30px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                        <FaLock size={32} style={{ color: 'var(--text-secondary)', marginBottom: '15px' }} />
                                        <p style={{ color: 'var(--text-color)' }}>Dieser Bereich ist geschützt.</p>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
                                            <label htmlFor="db-unlock-password" className="sr-only" style={{ display: 'none' }}>Passwort zum Entsperren</label>
                                            <input
                                                id="db-unlock-password"
                                                name="db-unlock-password"
                                                type="password"
                                                placeholder="Passwort"
                                                className="input-text"
                                                style={{ width: '200px' }}
                                                value={dbPasswordInput}
                                                onChange={e => setDbPasswordInput(e.target.value)}
                                            />
                                            <button className="btn-save" onClick={handleDbUnlock}><FaUnlock /> Entsperren</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ animation: 'fadeIn 0.3s' }}>
                                        <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                <FaKey color="#10b981" /> <span style={{ fontWeight: 'bold', color: '#047857' }}>Sicherheit</span>
                                            </div>
                                            {hasPassword ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#047857' }}>Passwortschutz ist aktiv.</span>
                                                    <button className="btn-secondary" onClick={handleRemovePassword} style={{ borderColor: '#ef4444', color: '#ef4444' }}>Schutz entfernen</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <label htmlFor="new-admin-password" className="sr-only" style={{ display: 'none' }}>Neues Admin Passwort</label>
                                                    <input
                                                        id="new-admin-password"
                                                        name="new-admin-password"
                                                        type="password"
                                                        placeholder="Neues Passwort setzen"
                                                        className="input-text"
                                                        value={newPassword}
                                                        onChange={e => setNewPassword(e.target.value)}
                                                    />
                                                    <button className="btn-save" onClick={handleSetPassword} style={{ background: '#10b981' }}>Aktivieren</button>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                                            <div className="dashboard-card" style={{ alignItems: 'flex-start', background: 'var(--bg-color)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><FaHdd size={24} color="#3b82f6" /><span style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>Backup</span></div>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Erstelle eine Kopie der gesamten Datenbank.</p>
                                                <button className="btn-secondary" onClick={backupDatabase} style={{ width: '100%' }}>Backup erstellen</button>
                                            </div>
                                            <div className="dashboard-card" style={{ alignItems: 'flex-start', background: 'var(--bg-color)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><FaUndo size={24} color="#f59e0b" /><span style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>Wiederherstellen</span></div>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Lade ein Backup. ACHTUNG: Überschreibt alles!</p>
                                                <button className="btn-secondary" onClick={restoreDatabase} style={{ width: '100%' }}>Backup laden</button>
                                            </div>
                                            <div className="dashboard-card" style={{ alignItems: 'flex-start', background: 'var(--bg-color)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><FaFileExcel size={24} color="#10b981" /><span style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>Log Export</span></div>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Exportiere ALLE rohen Activity-Logs als Excel.</p>
                                                <button className="btn-secondary" onClick={() => db && exportAllLogsToExcel(db)} style={{ width: '100%' }}>Logs exportieren</button>
                                            </div>
                                        </div>
                                        <h3 className="settings-h3" style={{ color: '#ef4444' }}>Gefahrenzone</h3>
                                        <div style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '8px' }}>
                                            <p className="settings-desc" style={{ color: '#b91c1c' }}>Löscht alle Logs, Zeiten und Einstellungen unwiderruflich.</p>
                                            <button onClick={() => { if (window.confirm("Wirklich ALLES löschen?")) onResetData(); }} style={{ width: '100%', padding: '15px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}><FaTrash /> Datenbank zurücksetzen</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'about' && (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <h2 style={{ color: 'var(--text-color)', marginBottom: '10px' }}>ClockworkHero</h2>
                                <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '30px' }}>Version 0.9.5</div>
                                <div style={{ background: 'var(--bg-color)', padding: '30px', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
                                    <h4 style={{ marginTop: 0, color: 'var(--text-color)' }}>MIT License</h4>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>Copyright (c) 2025 Sandro Ballarini</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-close" onClick={onClose}>Abbrechen</button>
                    <button className="btn-save" onClick={() => { onSaveSettings(localSettings); onClose(); }}>
                        <FaSave style={{ marginRight: '5px' }} /> Einstellungen speichern
                    </button>
                </div>
            </div>
        </div>
    );
};

const TabButton = ({ icon, label, active, onClick }: any) => (
    <div onClick={onClick} style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: active ? 'var(--panel-bg)' : 'transparent', color: active ? 'var(--text-color)' : 'var(--text-secondary)', fontWeight: active ? '700' : '500', borderLeft: active ? '4px solid #3498db' : '4px solid transparent', transition: 'all 0.2s', fontSize: '0.95rem' }}>
        {icon} {label}
    </div>
);
