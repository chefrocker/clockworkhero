import React, { useState } from 'react';
import { FaPlus, FaImage, FaTrash } from 'react-icons/fa';
import { Project } from '../../types';
import { AppIcon } from '../AppIcon';

interface Props {
    projects: Project[];
    onUpdate: (id: number, name: string, color: string, icon?: string, iconType?: 'app' | 'image') => void;
    onDelete: (id: number) => void;
    onAdd: (name: string, color: string, icon?: string, iconType?: 'app' | 'image') => void;
    onIconUpdate: (target: 'project', id: number) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProjectsTab: React.FC<Props> = ({ projects, onUpdate, onDelete, onAdd, onIconUpdate, onFileChange }) => {
    const [newProjName, setNewProjName] = useState("");
    const [newProjColor, setNewProjColor] = useState("#3498db");
    const [newProjIcon, setNewProjIcon] = useState("");
    const [newProjIconType, setNewProjIconType] = useState<'app' | 'image'>('app');

    return (
        <div>
            <h3 className="settings-h3" style={{ color: 'var(--text-color)' }}>Neues Projekt</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', padding: '20px', background: 'var(--bg-color)', borderRadius: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                    <label htmlFor="new-project-name" className="input-label">Name</label>
                    <input
                        id="new-project-name"
                        name="new-project-name"
                        className="input-text"
                        placeholder="z.B. Kunde A"
                        value={newProjName || ''}
                        onChange={e => setNewProjName(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="new-project-color" className="input-label">Farbe</label>
                    <input
                        id="new-project-color"
                        name="new-project-color"
                        type="color"
                        value={newProjColor || '#3498db'}
                        onChange={e => setNewProjColor(e.target.value)}
                        style={{ height: '42px', width: '60px', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label htmlFor="new-project-icon" className="input-label">Icon (App Name)</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <input
                            id="new-project-icon"
                            name="new-project-icon"
                            className="input-text"
                            placeholder="z.B. Photoshop"
                            value={newProjIconType === 'app' ? (newProjIcon || '') : ''}
                            onChange={e => { setNewProjIcon(e.target.value); setNewProjIconType('app'); }}
                            disabled={newProjIconType === 'image'}
                        />
                        <label htmlFor="project-icon-file" className="btn-secondary" style={{ padding: '10px', cursor: 'pointer' }} title="Bild hochladen">
                            <FaImage />
                            <input
                                id="project-icon-file"
                                name="project-icon-file"
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={onFileChange}
                            />
                        </label>
                    </div>
                </div>
                <button className="btn-save" onClick={() => { onAdd(newProjName, newProjColor, newProjIcon, newProjIconType); setNewProjName(""); setNewProjIcon(""); }} style={{ height: '42px' }}><FaPlus /> Erstellen</button>
            </div>

            <h3 className="settings-h3" style={{ color: 'var(--text-color)' }}>Vorhandene Projekte</h3>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                {projects.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '15px', borderBottom: '1px solid var(--border-color)', background: 'var(--panel-bg)', gap: '15px' }}>
                        <div
                            className="icon-editable"
                            onClick={() => onIconUpdate('project', p.id)}
                            title="Klicken um Icon zu ändern"
                            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', borderRadius: '6px' }}
                        >
                            {p.iconType === 'image' ? (
                                <img src={p.icon || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <AppIcon appName={p.icon || p.name} fallbackColor={p.color} />
                            )}
                        </div>
                        <label htmlFor={`proj-color-${p.id}`} className="sr-only" style={{ display: 'none' }}>Projektfarbe</label>
                        <input
                            id={`proj-color-${p.id}`}
                            name={`proj-color-${p.id}`}
                            type="color"
                            value={p.color || '#000000'}
                            onChange={(e) => onUpdate(p.id, p.name, e.target.value, p.icon, p.iconType as any)}
                            style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '50%' }}
                        />
                        <label htmlFor={`proj-name-${p.id}`} className="sr-only" style={{ display: 'none' }}>Projektname</label>
                        <input
                            id={`proj-name-${p.id}`}
                            name={`proj-name-${p.id}`}
                            className="input-text"
                            value={p.name || ''}
                            onChange={(e) => onUpdate(p.id, e.target.value, p.color, p.icon, p.iconType as any)}
                            style={{ flex: 1 }}
                        />
                        <button onClick={() => onDelete(p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '10px' }}><FaTrash /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};
