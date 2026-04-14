import React, { useState, useRef } from 'react';
import { FaPlus, FaImage, FaTrash, FaTimes } from 'react-icons/fa';
import Database from '@tauri-apps/plugin-sql';
import { Project } from '../../types';
import { AppIcon } from '../AppIcon';
import { countSessionsByProject } from '../../services/db';

interface Props {
    projects: Project[];
    db?: Database | null;
    onUpdate: (id: number, name: string, color: string, icon?: string, iconType?: 'app' | 'image') => void;
    onDelete: (id: number) => void;
    onAdd: (name: string, color: string, icon?: string, iconType?: 'app' | 'image') => void;
    onIconUpdate: (target: 'project', id: number) => void;
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProjectsTab: React.FC<Props> = ({ projects, db, onUpdate, onDelete, onAdd, onIconUpdate }) => {
    const [newProjName,      setNewProjName]      = useState('');
    const [newProjColor,     setNewProjColor]     = useState('#3498db');
    const [newProjAppIcon,   setNewProjAppIcon]   = useState('');         // App-Name als Icon
    const [newProjImageIcon, setNewProjImageIcon] = useState<string>(''); // Base64-Bild
    const [iconMode,         setIconMode]         = useState<'app' | 'image'>('app');
    // id des Projekts das auf Bestätigung wartet, sessionCount dazu
    const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string; sessionCount: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Bild direkt lesen (ohne Cropper) – für neue Projekte ausreichend
    const handleNewProjectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setNewProjImageIcon(reader.result as string);
            setIconMode('image');
        };
        reader.readAsDataURL(file);
        // Input zurücksetzen damit dasselbe Bild erneut gewählt werden kann
        e.target.value = '';
    };

    const handleDeleteClick = async (p: Project) => {
        const count = db ? await countSessionsByProject(db, p.id) : 0;
        setPendingDelete({ id: p.id, name: p.name, sessionCount: count });
    };

    const handleCreate = () => {
        const name = newProjName.trim();
        if (!name) return;
        const icon     = iconMode === 'image' ? newProjImageIcon : newProjAppIcon;
        const iconType = iconMode;
        onAdd(name, newProjColor, icon || undefined, iconType);
        // Felder zurücksetzen
        setNewProjName('');
        setNewProjAppIcon('');
        setNewProjImageIcon('');
        setIconMode('app');
    };

    return (
        <div>
            {/* ── Neues Projekt ─────────────────────────────────────── */}
            <h3 className="settings-h3" style={{ color: 'var(--text-color)' }}>Neues Projekt</h3>
            <div style={{
                display: 'flex', gap: '12px', marginBottom: '30px',
                padding: '20px', background: 'var(--bg-color)',
                borderRadius: '12px', alignItems: 'flex-end', flexWrap: 'wrap',
            }}>
                {/* Icon-Vorschau */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span className="input-label">Icon</span>
                    <div
                        style={{
                            width: '42px', height: '42px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--panel-bg)', borderRadius: '8px',
                            border: '1px dashed var(--border-color)', cursor: 'pointer',
                            position: 'relative', overflow: 'visible',
                        }}
                        title="Bild auswählen"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {iconMode === 'image' && newProjImageIcon ? (
                            <>
                                <img src={newProjImageIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }} />
                                <button
                                    onClick={e => { e.stopPropagation(); setNewProjImageIcon(''); setIconMode('app'); }}
                                    style={{
                                        position: 'absolute', top: -6, right: -6,
                                        width: '16px', height: '16px', borderRadius: '50%',
                                        background: '#ef4444', border: 'none', color: 'white',
                                        fontSize: '9px', cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', padding: 0,
                                    }}
                                    title="Bild entfernen"
                                ><FaTimes /></button>
                            </>
                        ) : (
                            <FaImage size={18} style={{ color: 'var(--text-secondary)' }} />
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleNewProjectImage}
                        />
                    </div>
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: '140px' }}>
                    <label htmlFor="new-project-name" className="input-label">Name</label>
                    <input
                        id="new-project-name"
                        name="new-project-name"
                        className="input-text"
                        placeholder="z.B. Kunde A"
                        value={newProjName}
                        onChange={e => setNewProjName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                </div>

                {/* Farbe */}
                <div>
                    <label htmlFor="new-project-color" className="input-label">Farbe</label>
                    <input
                        id="new-project-color"
                        name="new-project-color"
                        type="color"
                        value={newProjColor}
                        onChange={e => setNewProjColor(e.target.value)}
                        style={{ height: '42px', width: '60px', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
                    />
                </div>

                {/* App-Icon-Name (nur wenn kein Bild gewählt) */}
                {iconMode !== 'image' && (
                    <div style={{ flex: 1, minWidth: '120px' }}>
                        <label htmlFor="new-project-icon" className="input-label">App-Name (optional)</label>
                        <input
                            id="new-project-icon"
                            name="new-project-icon"
                            className="input-text"
                            placeholder="z.B. Photoshop"
                            value={newProjAppIcon}
                            onChange={e => { setNewProjAppIcon(e.target.value); setIconMode('app'); }}
                        />
                    </div>
                )}

                <button
                    className="btn-save"
                    onClick={handleCreate}
                    disabled={!newProjName.trim()}
                    style={{ height: '42px' }}
                >
                    <FaPlus /> Erstellen
                </button>
            </div>

            {/* ── Löschen-Bestätigung ───────────────────────────────── */}
            {pendingDelete && (
                <div style={{
                    marginBottom: '16px', padding: '16px 20px', borderRadius: '10px',
                    background: '#fef2f2', border: '1px solid #fecaca',
                }}>
                    <div style={{ fontWeight: 700, color: '#b91c1c', marginBottom: '6px' }}>
                        Projekt „{pendingDelete.name}" wirklich löschen?
                    </div>
                    {pendingDelete.sessionCount > 0 && (
                        <div style={{ fontSize: '0.85rem', color: '#7f1d1d', marginBottom: '10px' }}>
                            ⚠️ {pendingDelete.sessionCount} Session{pendingDelete.sessionCount !== 1 ? 'en' : ''} werden dabei als „Ohne Projekt" markiert.
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            className="btn-save"
                            style={{ background: '#ef4444', height: '36px' }}
                            onClick={() => { onDelete(pendingDelete.id); setPendingDelete(null); }}
                        >
                            Ja, löschen
                        </button>
                        <button
                            className="btn-secondary"
                            style={{ height: '36px' }}
                            onClick={() => setPendingDelete(null)}
                        >
                            Abbrechen
                        </button>
                    </div>
                </div>
            )}

            {/* ── Vorhandene Projekte ────────────────────────────────── */}
            <h3 className="settings-h3" style={{ color: 'var(--text-color)' }}>Vorhandene Projekte</h3>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                {projects.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Noch keine Projekte vorhanden.
                    </div>
                )}
                {projects.map(p => (
                    <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', padding: '15px',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'var(--panel-bg)', gap: '15px',
                    }}>
                        {/* Icon – klickbar für Bearbeitung */}
                        <div
                            className="icon-editable"
                            onClick={() => onIconUpdate('project', p.id)}
                            title="Klicken um Icon zu ändern"
                            style={{
                                width: '32px', height: '32px', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                background: 'var(--bg-color)', borderRadius: '6px',
                                cursor: 'pointer', overflow: 'visible', flexShrink: 0,
                            }}
                        >
                            {p.iconType === 'image'
                            ? <img src={p.icon || ''} alt="" style={{ width: '26px', height: '26px', objectFit: 'contain', display: 'block' }} />
                            : <AppIcon appName={p.icon || p.name} fallbackColor={p.color} size={24} />
                        }
                        </div>

                        {/* Farbe */}
                        <label htmlFor={`proj-color-${p.id}`} className="sr-only" style={{ display: 'none' }}>Projektfarbe</label>
                        <input
                            id={`proj-color-${p.id}`}
                            name={`proj-color-${p.id}`}
                            type="color"
                            value={p.color || '#000000'}
                            onChange={e => onUpdate(p.id, p.name, e.target.value, p.icon, p.iconType as any)}
                            style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '50%', flexShrink: 0 }}
                        />

                        {/* Name */}
                        <label htmlFor={`proj-name-${p.id}`} className="sr-only" style={{ display: 'none' }}>Projektname</label>
                        <input
                            id={`proj-name-${p.id}`}
                            name={`proj-name-${p.id}`}
                            className="input-text"
                            value={p.name || ''}
                            onChange={e => onUpdate(p.id, e.target.value, p.color, p.icon, p.iconType as any)}
                            style={{ flex: 1 }}
                        />

                        {/* Löschen */}
                        <button
                            onClick={() => handleDeleteClick(p)}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                            title="Projekt löschen"
                        >
                            <FaTrash />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
