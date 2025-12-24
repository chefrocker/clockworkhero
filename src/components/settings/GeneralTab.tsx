import React from 'react';
import { AppSettings, DaySchedule } from '../../types';
import { WorkScheduleEditor } from '../WorkScheduleEditor';

interface Props {
    settings: AppSettings;
    onChange: (s: AppSettings) => void;
    defaultSchedule: DaySchedule[];
}

export const GeneralTab: React.FC<Props> = ({ settings, onChange, defaultSchedule }) => {
    const toggleHiddenDay = (dayIndex: number) => {
        const currentHidden = settings.hiddenDays || [];
        let newHidden;
        if (currentHidden.includes(dayIndex)) {
            newHidden = currentHidden.filter(d => d !== dayIndex);
        } else {
            newHidden = [...currentHidden, dayIndex];
        }
        onChange({ ...settings, hiddenDays: newHidden });
    };

    return (
        <div>
            <WorkScheduleEditor
                weekSchedule={settings.weekSchedule || defaultSchedule}
                onChange={(schedule) => onChange({ ...settings, weekSchedule: schedule })}
            />

            <h3 className="settings-h3" style={{ marginTop: '40px', color: 'var(--text-color)' }}>Kalender Ansicht</h3>
            <p className="settings-desc" style={{ color: 'var(--text-secondary)' }}>Wähle die Tage, die in der Wochenansicht angezeigt werden sollen.</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map((day, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '8px 12px', background: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}>
                        <input
                            type="checkbox"
                            checked={!(settings.hiddenDays || []).includes(idx)}
                            onChange={() => toggleHiddenDay(idx)}
                        />
                        {day}
                    </label>
                ))}
            </div>

            <h3 className="settings-h3" style={{ marginTop: '40px', color: 'var(--text-color)' }}>Ziele</h3>
            <div className="input-group">
                <label className="input-label">Tagesziel (Stunden)</label>
                <input type="number" className="input-number" value={settings.dailyTarget || 0} onChange={e => onChange({ ...settings, dailyTarget: parseFloat(e.target.value) })} />
            </div>

            <h3 className="settings-h3" style={{ marginTop: '40px', color: 'var(--text-color)' }}>System</h3>
            <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-color)' }}>
                    <input
                        type="checkbox"
                        checked={settings.autostart || false}
                        onChange={e => onChange({ ...settings, autostart: e.target.checked })}
                    />
                    Mit Windows automatisch starten
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                    Die App wird beim Systemstart minimiert in der Taskleiste (Tray) gestartet.
                </p>
            </div>
        </div>
    );
};
