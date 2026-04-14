import React from 'react';
import { AppSettings, DaySchedule } from '../../types';
import { WorkScheduleEditor } from '../WorkScheduleEditor';

interface Props {
    settings: AppSettings;
    onChange: (s: AppSettings) => void;
    defaultSchedule: DaySchedule[];
}

// FullCalendar-Nummerierung: 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa
const FC_DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** Liefert die FullCalendar-Indizes in der Anzeigereihenfolge für firstDay */
function getDayOrder(firstDay: 0 | 1 | 6): number[] {
    const all = [0, 1, 2, 3, 4, 5, 6];
    const start = all.indexOf(firstDay);
    return [...all.slice(start), ...all.slice(0, start)];
}

export const GeneralTab: React.FC<Props> = ({ settings, onChange, defaultSchedule }) => {
    const firstDay = settings.firstDayOfWeek ?? 1;
    const dayOrder = getDayOrder(firstDay as 0 | 1 | 6);

    const toggleHiddenDay = (fcIndex: number) => {
        const currentHidden = settings.hiddenDays || [];
        const newHidden = currentHidden.includes(fcIndex)
            ? currentHidden.filter(d => d !== fcIndex)
            : [...currentHidden, fcIndex];
        onChange({ ...settings, hiddenDays: newHidden });
    };

    const handleFirstDayChange = (value: 0 | 1 | 6) => {
        onChange({ ...settings, firstDayOfWeek: value });
    };

    return (
        <div>
            <WorkScheduleEditor
                weekSchedule={settings.weekSchedule || defaultSchedule}
                firstDayOfWeek={firstDay as 0 | 1 | 6}
                onChange={(schedule) => onChange({ ...settings, weekSchedule: schedule })}
            />

            {/* ── Kalender Ansicht ──────────────────────────────── */}
            <h3 className="settings-h3" style={{ marginTop: '40px', color: 'var(--text-color)' }}>
                Kalender Ansicht
            </h3>

            {/* Erster Wochentag */}
            <div className="input-group" style={{ marginBottom: '20px' }}>
                <label className="input-label">Erster Wochentag</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {([
                        { label: 'Montag',   value: 1 },
                        { label: 'Sonntag',  value: 0 },
                        { label: 'Samstag',  value: 6 },
                    ] as { label: string; value: 0 | 1 | 6 }[]).map(opt => (
                        <label
                            key={opt.value}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 14px',
                                background: firstDay === opt.value ? 'var(--primary, #3b82f6)' : 'var(--bg-color)',
                                color: firstDay === opt.value ? 'white' : 'var(--text-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: firstDay === opt.value ? 600 : 400,
                                transition: 'all 0.15s',
                            }}
                        >
                            <input
                                type="radio"
                                name="firstDayOfWeek"
                                value={opt.value}
                                checked={firstDay === opt.value}
                                onChange={() => handleFirstDayChange(opt.value)}
                                style={{ display: 'none' }}
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Sichtbare Wochentage */}
            <p className="settings-desc" style={{ color: 'var(--text-secondary)' }}>
                Wähle die Tage, die in der Wochenansicht angezeigt werden sollen.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {dayOrder.map(fcIdx => (
                    <label
                        key={fcIdx}
                        htmlFor={`show-day-${fcIdx}`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            cursor: 'pointer', padding: '8px 12px',
                            background: 'var(--bg-color)', borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-color)',
                        }}
                    >
                        <input
                            id={`show-day-${fcIdx}`}
                            name={`show-day-${fcIdx}`}
                            type="checkbox"
                            checked={!(settings.hiddenDays || []).includes(fcIdx)}
                            onChange={() => toggleHiddenDay(fcIdx)}
                        />
                        {FC_DAYS[fcIdx]}
                    </label>
                ))}
            </div>

            {/* ── Ziele ─────────────────────────────────────────── */}
            <h3 className="settings-h3" style={{ marginTop: '40px', color: 'var(--text-color)' }}>Ziele</h3>
            <div className="input-group">
                <label htmlFor="daily-target" className="input-label">Tagesziel (Stunden)</label>
                <input
                    id="daily-target"
                    name="daily-target"
                    type="number"
                    className="input-number"
                    value={settings.dailyTarget || 0}
                    onChange={e => onChange({ ...settings, dailyTarget: parseFloat(e.target.value) })}
                />
            </div>

            {/* ── System ────────────────────────────────────────── */}
            <h3 className="settings-h3" style={{ marginTop: '40px', color: 'var(--text-color)' }}>System</h3>
            <div className="input-group">
                <label htmlFor="autostart" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-color)' }}>
                    <input
                        id="autostart"
                        name="autostart"
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
