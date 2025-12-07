import React, { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Database from '@tauri-apps/plugin-sql';
import { FaCog, FaSave, FaClock, FaPalette, FaDatabase, FaTrash, FaFileExcel, FaBriefcase, FaPlus, FaImage, FaCheck, FaTimes, FaLock, FaUnlock, FaHdd, FaKey, FaUndo, FaInfoCircle } from 'react-icons/fa';
import { AppSettings, Project, DaySchedule } from '../types';
import { AppIcon } from './AppIcon';
import { getCroppedImg } from '../utils/imageUtils';
import { getKnownApps, saveAppColor, exportAllLogsToExcel, backupDatabase, restoreDatabase, saveSetting } from '../services/db';
import { WorkScheduleEditor } from './WorkScheduleEditor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  projects: Project[];
  onSaveSettings: (newSettings: AppSettings) => void;
  // FIX: Typen von string zu 'app' | 'image' geändert
  onUpdateProject: (id: number, name: string, color: string, icon?: string, iconType?: 'app' | 'image') => void;
  onDeleteProject: (id: number) => void;
  // FIX: Typen von string zu 'app' | 'image' geändert
  onAddProject: (name: string, color: string, icon?: string, iconType?: 'app' | 'image') => void;
  onResetData: () => void;
  db: Database | null;
}

// HELPER: HSL zu Hex Konverter für Color Picker
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
    blocks: idx < 5 ? [{
      id: `block-${idx}-1`,
      start: "08:00",
      end: "17:00"
    }] : [],
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
  
  const [newProjName, setNewProjName] = useState("");
  const [newProjColor, setNewProjColor] = useState("#3498db");
  const [newProjIcon, setNewProjIcon] = useState(""); 
  const [newProjIconType, setNewProjIconType] = useState<'app' | 'image'>('app');

  const [knownApps, setKnownApps] = useState<{name: string, color: string}[]>([]);
  const [appSearch, setAppSearch] = useState("");

  const [dbPasswordInput, setDbPasswordInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isDbUnlocked, setIsDbUnlocked] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [editingProjId, setEditingProjId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
        const initSettings = { ...settings };
        if (!initSettings.weekSchedule || initSettings.weekSchedule.length === 0) {
            initSettings.weekSchedule = getDefaultWeekSchedule();
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, projId: number | null) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCropImageSrc(reader.result as string);
        setEditingProjId(projId);
      });
      reader.readAsDataURL(file);
    }
  };

  const saveCroppedImage = async () => {
    if (cropImageSrc && croppedAreaPixels) {
        try {
            const croppedImageBase64 = await getCroppedImg(cropImageSrc, croppedAreaPixels);
            if (editingProjId === null) {
                setNewProjIcon(croppedImageBase64);
                setNewProjIconType('image');
            } else {
                const proj = projects.find(p => p.id === editingProjId);
                if (proj) onUpdateProject(proj.id, proj.name, proj.color, croppedImageBase64, 'image');
            }
            setCropImageSrc(null);
            setZoom(1);
        } catch (e) { console.error(e); }
    }
  };

  const handleAppColorChange = async (name: string, color: string) => {
      if (db) {
          await saveAppColor(db, name, color);
          setKnownApps(prev => prev.map(a => a.name === name ? {...a, color} : a));
      }
  };

  const handleDbUnlock = () => {
      if (dbPasswordInput === settings.adminPassword) {
          setIsDbUnlocked(true);
          setDbPasswordInput("");
      } else {
          alert("Falsches Passwort!");
      }
  };

  const handleSetPassword = async () => {
      if (!newPassword) return;
      if (db) {
          await saveSetting(db, 'adminPassword', newPassword);
          setHasPassword(true);
          onSaveSettings({...localSettings, adminPassword: newPassword});
          alert("Passwortschutz aktiviert!");
          setNewPassword("");
      }
  };

  const handleRemovePassword = async () => {
      if (window.confirm("Passwortschutz wirklich entfernen?")) {
          if (db) {
              await saveSetting(db, 'adminPassword', "");
              setHasPassword(false);
              setIsDbUnlocked(true);
              onSaveSettings({...localSettings, adminPassword: ""});
          }
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
              <div style={{flex: 1, position: 'relative'}}>
                  <Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
              </div>
              <div style={{padding: '20px', background: '#2c3e50', display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center'}}>
                  <span style={{fontWeight: 'bold', color: 'white'}}>Zoom:</span>
                  <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} />
                  <button className="btn-secondary" onClick={() => setCropImageSrc(null)}><FaTimes /> Abbrechen</button>
                  <button className="btn-save" onClick={saveCroppedImage}><FaCheck /> Übernehmen</button>
              </div>
          </div>
      )}

      <div className="modal-content" onClick={e => e.stopPropagation()} style={{width: '900px', height: '700px', display: 'flex', flexDirection: 'column'}}>
        
        <div className="modal-header" style={{background: '#2c3e50', padding: '20px 30px'}}>
          <FaCog size={24} />
          <h2 style={{margin: 0}}>Einstellungen</h2>
        </div>

        <div style={{display: 'flex', flex: 1, overflow: 'hidden'}}>
            
            <div style={{width: '220px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '20px 0'}}>
                <TabButton icon={<FaClock />} label="Allgemein" active={activeTab === 'general'} onClick={() => setActiveTab('general')} />
                <TabButton icon={<FaPalette />} label="Tracking & Design" active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} />
                <TabButton icon={<FaBriefcase />} label="Projekte" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
                <TabButton icon={<FaPalette />} label="Activity Farben" active={activeTab === 'colors'} onClick={() => setActiveTab('colors')} />
                <TabButton icon={<FaDatabase />} label="Datenbank" active={activeTab === 'database'} onClick={() => setActiveTab('database')} />
                <TabButton icon={<FaInfoCircle />} label="Über" active={activeTab === 'about'} onClick={() => setActiveTab('about')} />
            </div>

            <div style={{flex: 1, padding: '40px', overflowY: 'auto'}}>
                
                {activeTab === 'general' && (
                    <div>
                        <WorkScheduleEditor
                            weekSchedule={localSettings.weekSchedule || getDefaultWeekSchedule()}
                            onChange={(schedule) => setLocalSettings({ ...localSettings, weekSchedule: schedule })}
                        />
                        
                        <h3 className="settings-h3" style={{ marginTop: '40px' }}>Ziele</h3>
                        <div className="input-group">
                            <label className="input-label">Tagesziel (Stunden)</label>
                            <input
                                type="number"
                                className="input-number"
                                value={localSettings.dailyTarget || 0}
                                onChange={e => setLocalSettings({ ...localSettings, dailyTarget: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'tracking' && (
                    <div>
                        <h3 className="settings-h3">Activity Stream</h3>
                        <div style={{marginBottom: '30px', background: '#f1f5f9', padding: '20px', borderRadius: '8px'}}>
                            <label className="input-label">Gruppierung: {localSettings.groupingThreshold} Minuten</label>
                            <input type="range" min="1" max="60" step="1" style={{width: '100%', marginTop: '10px'}} value={localSettings.groupingThreshold || 5} onChange={e => setLocalSettings({...localSettings, groupingThreshold: parseInt(e.target.value)})} />
                        </div>
                        <h3 className="settings-h3">Design</h3>
                        <div className="input-group">
                            <label className="input-label">Theme</label>
                            <select className="input-select" value={localSettings.theme || 'light'} onChange={e => setLocalSettings({...localSettings, theme: e.target.value})}>
                                <option value="light">Modern Light</option>
                            </select>
                        </div>
                    </div>
                )}

                {activeTab === 'projects' && (
                    <div>
                        <h3 className="settings-h3">Neues Projekt</h3>
                        <div style={{display: 'flex', gap: '10px', marginBottom: '30px', padding: '20px', background: '#f1f5f9', borderRadius: '12px', alignItems: 'flex-end'}}>
                            <div style={{flex: 1}}>
                                <label className="input-label">Name</label>
                                <input className="input-text" placeholder="z.B. Kunde A" value={newProjName || ''} onChange={e => setNewProjName(e.target.value)} />
                            </div>
                            <div>
                                <label className="input-label">Farbe</label>
                                <input type="color" value={newProjColor || '#3498db'} onChange={e => setNewProjColor(e.target.value)} style={{height: '42px', width: '60px', border: 'none', cursor: 'pointer', borderRadius: '6px'}} />
                            </div>
                            <div style={{flex: 1}}>
                                <label className="input-label">Icon (App Name)</label>
                                <div style={{display: 'flex', gap: '5px'}}>
                                    <input className="input-text" placeholder="z.B. Photoshop" value={newProjIconType === 'app' ? (newProjIcon || '') : ''} onChange={e => { setNewProjIcon(e.target.value); setNewProjIconType('app'); }} disabled={newProjIconType === 'image'} />
                                    <label className="btn-secondary" style={{padding: '10px', cursor: 'pointer'}} title="Bild hochladen">
                                        <FaImage />
                                        <input type="file" accept="image/*" style={{display: 'none'}} onChange={e => handleFileChange(e, null)} />
                                    </label>
                                </div>
                            </div>
                            <button className="btn-save" onClick={() => { onAddProject(newProjName, newProjColor, newProjIcon, newProjIconType); setNewProjName(""); setNewProjIcon(""); }} style={{height: '42px'}}><FaPlus /> Erstellen</button>
                        </div>

                        <h3 className="settings-h3">Vorhandene Projekte</h3>
                        <div style={{border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden'}}>
                            {projects.map(p => (
                                <div key={p.id} style={{display: 'flex', alignItems: 'center', padding: '15px', borderBottom: '1px solid #f1f5f9', background: 'white', gap: '15px'}}>
                                    <div style={{width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '6px'}}>
                                        {p.iconType === 'image' ? (
                                            <img src={p.icon || ''} alt="" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                                        ) : (
                                            <AppIcon appName={p.icon || p.name} fallbackColor={p.color} />
                                        )}
                                    </div>
                                    <input type="color" value={p.color || '#000000'} onChange={(e) => onUpdateProject(p.id, p.name, e.target.value, p.icon, p.iconType as any)} style={{width: '30px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '50%'}} />
                                    <input className="input-text" value={p.name || ''} onChange={(e) => onUpdateProject(p.id, e.target.value, p.color, p.icon, p.iconType as any)} style={{flex: 1}} />
                                    <button onClick={() => onDeleteProject(p.id)} style={{color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '10px'}}><FaTrash /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'colors' && (
                    <div>
                        <h3 className="settings-h3">Activity Farben</h3>
                        <p className="settings-desc">Hier kannst du Farben für erkannte Programme festlegen.</p>
                        <input className="input-text" placeholder="Suchen..." value={appSearch} onChange={e => setAppSearch(e.target.value)} style={{marginBottom: '20px'}} />
                        
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px', maxHeight: '400px', overflowY: 'auto'}}>
                            {knownApps.filter(a => a.name.toLowerCase().includes(appSearch.toLowerCase())).map(app => (
                                <div key={app.name} style={{background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <div style={{width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '6px'}}>
                                        <AppIcon appName={app.name} fallbackColor={app.color} />
                                    </div>
                                    <div style={{flex: 1, overflow: 'hidden'}}>
                                        <div style={{fontSize: '0.9rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={app.name}>{app.name}</div>
                                    </div>
                                    <input type="color" value={colorToHex(app.color)} onChange={e => handleAppColorChange(app.name, e.target.value)} style={{width: '30px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '50%'}} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'database' && (
                    <div>
                        <h3 className="settings-h3">Datenbank Verwaltung</h3>
                        
                        {!isDbUnlocked ? (
                            <div style={{background: '#f8fafc', padding: '30px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0'}}>
                                <FaLock size={32} style={{color: '#94a3b8', marginBottom: '15px'}} />
                                <p>Dieser Bereich ist geschützt.</p>
                                <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px'}}>
                                    <input type="password" placeholder="Passwort" className="input-text" style={{width: '200px'}} value={dbPasswordInput} onChange={e => setDbPasswordInput(e.target.value)} />
                                    <button className="btn-save" onClick={handleDbUnlock}><FaUnlock /> Entsperren</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{animation: 'fadeIn 0.3s'}}>
                                
                                <div style={{marginBottom: '30px', padding: '20px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0'}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                                        <FaKey color="#16a34a" />
                                        <span style={{fontWeight: 'bold', color: '#166534'}}>Sicherheit</span>
                                    </div>
                                    {hasPassword ? (
                                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                            <span style={{color: '#166534'}}>Passwortschutz ist aktiv.</span>
                                            <button className="btn-secondary" onClick={handleRemovePassword} style={{borderColor: '#ef4444', color: '#ef4444'}}>Schutz entfernen</button>
                                        </div>
                                    ) : (
                                        <div style={{display: 'flex', gap: '10px'}}>
                                            <input type="password" placeholder="Neues Passwort setzen" className="input-text" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                            <button className="btn-save" onClick={handleSetPassword} style={{background: '#16a34a'}}>Aktivieren</button>
                                        </div>
                                    )}
                                </div>

                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px'}}>
                                    <div className="dashboard-card" style={{alignItems: 'flex-start'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                                            <FaHdd size={24} color="#3b82f6" />
                                            <span style={{fontWeight: 'bold'}}>Backup</span>
                                        </div>
                                        <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '15px'}}>Erstelle eine Kopie der gesamten Datenbank.</p>
                                        <button className="btn-secondary" onClick={backupDatabase} style={{width: '100%'}}>Backup erstellen</button>
                                    </div>

                                    <div className="dashboard-card" style={{alignItems: 'flex-start'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                                            <FaUndo size={24} color="#f59e0b" />
                                            <span style={{fontWeight: 'bold'}}>Wiederherstellen</span>
                                        </div>
                                        <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '15px'}}>Lade ein Backup. ACHTUNG: Überschreibt alles!</p>
                                        <button className="btn-secondary" onClick={restoreDatabase} style={{width: '100%'}}>Backup laden</button>
                                    </div>

                                    <div className="dashboard-card" style={{alignItems: 'flex-start'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                                            <FaFileExcel size={24} color="#10b981" />
                                            <span style={{fontWeight: 'bold'}}>Log Export</span>
                                        </div>
                                        <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '15px'}}>Exportiere ALLE rohen Activity-Logs als Excel.</p>
                                        <button className="btn-secondary" onClick={() => db && exportAllLogsToExcel(db)} style={{width: '100%'}}>Logs exportieren</button>
                                    </div>
                                </div>

                                <h3 className="settings-h3" style={{color: '#ef4444'}}>Gefahrenzone</h3>
                                <div style={{border: '1px solid #fee2e2', background: '#fef2f2', padding: '20px', borderRadius: '8px'}}>
                                    <p className="settings-desc" style={{color: '#b91c1c'}}>Löscht alle Logs, Zeiten und Einstellungen unwiderruflich.</p>
                                    <button onClick={() => { if(window.confirm("Wirklich ALLES löschen?")) onResetData(); }} style={{width: '100%', padding: '15px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'}}>
                                        <FaTrash /> Datenbank zurücksetzen
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'about' && (
                    <div style={{textAlign: 'center', padding: '40px'}}>
                        <h2 style={{color: '#2c3e50', marginBottom: '10px'}}>ClockworkHero</h2>
                        <div style={{fontSize: '1.2rem', color: '#64748b', marginBottom: '30px'}}>Version 0.9.1</div>
                        
                        <div style={{background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '600px', margin: '0 auto', textAlign: 'left'}}>
                            <h4 style={{marginTop: 0}}>MIT License</h4>
                            <p style={{fontSize: '0.9rem', color: '#475569', lineHeight: '1.6'}}>
                                Copyright (c) 2025 Sandro Ballarini
                            </p>
                            <p style={{fontSize: '0.9rem', color: '#475569', lineHeight: '1.6'}}>
                                Permission is hereby granted, free of charge, to any person obtaining a copy
                                of this software and associated documentation files (the "Software"), to deal
                                in the Software without restriction, including without limitation the rights
                                to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                                copies of the Software, and to permit persons to whom the Software is
                                furnished to do so, subject to the following conditions:
                            </p>
                            <p style={{fontSize: '0.9rem', color: '#475569', lineHeight: '1.6'}}>
                                The above copyright notice and this permission notice shall be included in all
                                copies or substantial portions of the Software.
                            </p>
                            <p style={{fontSize: '0.9rem', color: '#475569', lineHeight: '1.6'}}>
                                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                                IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                                FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                                AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                                LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                                OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                                SOFTWARE.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>Abbrechen</button>
          <button className="btn-save" onClick={() => { onSaveSettings(localSettings); onClose(); }}>
            <FaSave style={{marginRight: '5px'}}/> Einstellungen speichern
          </button>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ icon, label, active, onClick }: any) => (
    <div onClick={onClick} style={{padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: active ? 'white' : 'transparent', color: active ? '#2c3e50' : '#64748b', fontWeight: active ? '700' : '500', borderLeft: active ? '4px solid #3498db' : '4px solid transparent', transition: 'all 0.2s', fontSize: '0.95rem'}}>
        {icon} {label}
    </div>
);
