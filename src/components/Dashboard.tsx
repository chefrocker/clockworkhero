import React, { useEffect, useState } from 'react';
import Database from '@tauri-apps/plugin-sql';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area,
    BarChart, Bar
} from 'recharts';
import {
    FaArrowUp, FaArrowDown, FaMinus, FaChartLine, FaFilter,
    FaFileExcel, FaCheckSquare, FaSquare, FaFire, FaBolt,
    FaClock, FaBrain, FaSun, FaMoon, FaRegSun
} from 'react-icons/fa';
import { getDashboardStats, DashboardStats, DashboardFilter } from '../services/analyticsService';
import { exportDashboardAnalysis } from '../services/exportService';
import { Project } from '../types';
import { AppIcon } from './AppIcon';

interface Props {
    db: Database | null;
    projects: Project[];
}

// ─── Kleine Hilfs-Komponenten ────────────────────────────────────────────────

const StatCard: React.FC<{
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    accent?: string;
}> = ({ label, value, sub, accent }) => (
    <div className="dashboard-card" style={accent ? { borderLeft: `4px solid ${accent}` } : {}}>
        <div className="card-label">{label}</div>
        <div className="card-value">{value}</div>
        {sub && <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '5px' }}>{sub}</div>}
    </div>
);

const ScoreRing: React.FC<{ value: number; color: string; size?: number }> = ({ value, color, size = 80 }) => {
    const r      = (size / 2) - 8;
    const circ   = 2 * Math.PI * r;
    const filled = circ * (value / 100);
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
        </svg>
    );
};

// ─── Haupt-Komponente ────────────────────────────────────────────────────────

export const Dashboard: React.FC<Props> = ({ db, projects }) => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [startDate, setStartDate]     = useState<string>("");
    const [endDate, setEndDate]         = useState<string>("");
    const [selectedProjIds, setSelectedProjIds] = useState<number[]>([]);
    const [showFilterMenu, setShowFilterMenu]   = useState(false);
    const [activeView, setActiveView] = useState<'projects' | 'activity' | 'insights'>('projects');

    useEffect(() => {
        const end   = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 13);
        setStartDate(start.toISOString().slice(0, 10));
        setEndDate(end.toISOString().slice(0, 10));
    }, []);

    useEffect(() => {
        if (db && startDate && endDate) {
            const filter: DashboardFilter = {
                start: new Date(startDate),
                end:   new Date(endDate),
                projectIds: selectedProjIds
            };
            getDashboardStats(db, filter).then(setStats);
        }
    }, [db, startDate, endDate, selectedProjIds]);

    const toggleProject = (id: number) => {
        setSelectedProjIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const setRangeDays = (days: number) => {
        const end   = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (days - 1));
        setStartDate(start.toISOString().slice(0, 10));
        setEndDate(end.toISOString().slice(0, 10));
    };

    if (!stats) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Lade Daten...</div>;

    const patternIcon = stats.workPattern === 'early'   ? <FaSun />
                      : stats.workPattern === 'night'   ? <FaMoon />
                      : stats.workPattern === 'late'    ? <FaRegSun />
                      : <FaChartLine />;
    const patternLabel = stats.workPattern === 'early'   ? 'Frühaufsteher'
                       : stats.workPattern === 'night'   ? 'Nachtmensch'
                       : stats.workPattern === 'late'    ? 'Nachmittags-Typ'
                       : 'Ausgeglichener Typ';

    return (
        <div style={{ padding: '30px', height: '100%', overflowY: 'auto', background: '#f8fafc' }}>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaChartLine /> Dashboard
                    </h2>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '5px' }}>
                        {stats.periodLabel} • {selectedProjIds.length === 0 ? "Alle Projekte" : `${selectedProjIds.length} Projekte ausgewählt`}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {(['projects', 'activity', 'insights'] as const).map(v => (
                        <button
                            key={v}
                            className="btn-secondary"
                            onClick={() => setActiveView(v)}
                            style={{
                                background: activeView === v ? '#3b82f6' : 'white',
                                color:      activeView === v ? 'white'   : '#1e293b',
                            }}
                        >
                            {v === 'projects' ? 'Projekte' : v === 'activity' ? 'Programme' : '✨ Einblicke'}
                        </button>
                    ))}
                    <button className="btn-secondary" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                        <FaFilter /> Filter
                    </button>
                    <button className="btn-save" onClick={() => exportDashboardAnalysis(stats)} style={{ background: '#10b981' }}>
                        <FaFileExcel /> Export
                    </button>
                </div>
            </div>

            {/* ── Filter-Panel ─────────────────────────────────────────────── */}
            {showFilterMenu && (
                <div style={{
                    background: 'white', padding: '20px', borderRadius: '12px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px',
                    border: '1px solid #e2e8f0', animation: 'fadeIn 0.2s'
                }}>
                    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#475569' }}>Zeitraum</h4>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <button className="btn-secondary" onClick={() => setRangeDays(7)}>7 Tage</button>
                                <button className="btn-secondary" onClick={() => setRangeDays(14)}>14 Tage</button>
                                <button className="btn-secondary" onClick={() => setRangeDays(30)}>30 Tage</button>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <label htmlFor="db-start" className="sr-only" style={{ display: 'none' }}>Von</label>
                                <input id="db-start" name="db-start" type="date" className="input-text" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <span style={{ color: '#94a3b8' }}>bis</span>
                                <label htmlFor="db-end" className="sr-only" style={{ display: 'none' }}>Bis</label>
                                <input id="db-end" name="db-end" type="date" className="input-text" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h4 style={{ margin: 0, color: '#475569' }}>Projekte filtern</h4>
                                <button style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', padding: 0, cursor: 'pointer' }} onClick={() => setSelectedProjIds([])}>Alle auswählen</button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                                {projects.map(p => {
                                    const isSelected = selectedProjIds.length === 0 || selectedProjIds.includes(p.id);
                                    return (
                                        <div key={p.id} onClick={() => toggleProject(p.id)} style={{
                                            padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer',
                                            border: `1px solid ${isSelected ? p.color : '#e2e8f0'}`,
                                            background: isSelected ? p.color : 'white',
                                            color: isSelected ? 'white' : '#64748b',
                                            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                                        }}>
                                            {isSelected ? <FaCheckSquare size={12} /> : <FaSquare size={12} />}
                                            {p.name}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                VIEW: PROJEKTE
            ════════════════════════════════════════════════════════════════ */}
            {activeView === 'projects' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <StatCard
                            label="Gesamtzeit"
                            value={<>{stats.totalHours} <span className="card-unit">Std</span></>}
                            sub={`Ø ${stats.avgDaily} Std / Arbeitstag`}
                        />
                        {stats.projectDistribution.length > 0 && (
                            <StatCard
                                label="Hauptfokus (Projekt)"
                                value={<span style={{ fontSize: '1.4rem' }}>{stats.projectDistribution[0].name}</span>}
                                sub={<>{stats.projectDistribution[0].percentage}% der Projektzeit</>}
                                accent={stats.projectDistribution[0].color}
                            />
                        )}
                    </div>

                    <div className="dashboard-panel" style={{ marginBottom: '30px' }}>
                        <h3 className="panel-title">Projekt-Verlauf (Schichtdiagramm)</h3>
                        <ResponsiveContainer width="100%" height={400} debounce={50}>
                            <AreaChart data={stats.history}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} minTickGap={30} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                <Legend />
                                {projects.map(p => (
                                    <Area key={p.id} type="monotone" dataKey={p.name} stackId="1"
                                        stroke={p.color} fill={p.color} fillOpacity={0.6} />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px', marginBottom: '30px' }}>
                        <div className="dashboard-panel">
                            <h3 className="panel-title">Projekt-Verteilung</h3>
                            <ResponsiveContainer width="100%" height={350} debounce={50}>
                                <PieChart>
                                    <Pie data={stats.projectDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                                        {stats.projectDistribution.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => [`${v} Std`, 'Dauer']} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="dashboard-panel">
                            <h3 className="panel-title">Aktivitäts-Peaks (Tageszeit)</h3>
                            <ResponsiveContainer width="100%" height={350} debounce={50}>
                                <AreaChart data={stats.peakHours}>
                                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} interval={2} dy={5} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                    <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '10px' }}>
                                <strong>Aktivste Zeit:</strong> {stats.peakHourLabel}
                            </p>
                        </div>
                    </div>

                    <div className="dashboard-panel">
                        <h3 className="panel-title">Trends & Veränderungen</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '15px' }}>
                            Vergleich mit dem vorherigen Zeitraum gleicher Länge.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {stats.trends.length === 0 && <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Keine Vergleichsdaten vorhanden.</div>}
                            {stats.trends.slice(0, 8).map((trend, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: '700', color: '#334155' }}>{trend.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{trend.currentHours} Std aktuell vs. {trend.prevHours} Std bisher</div>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold',
                                        color:      trend.changePercent > 0 ? '#10b981' : trend.changePercent < 0 ? '#ef4444' : '#94a3b8',
                                        background: trend.changePercent > 0 ? '#ecfdf5' : trend.changePercent < 0 ? '#fef2f2' : '#f1f5f9',
                                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem'
                                    }}>
                                        {trend.changePercent > 0 ? <FaArrowUp size={10} /> : trend.changePercent < 0 ? <FaArrowDown size={10} /> : <FaMinus size={10} />}
                                        {Math.abs(trend.changePercent)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                VIEW: PROGRAMME
            ════════════════════════════════════════════════════════════════ */}
            {activeView === 'activity' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <StatCard
                            label="Aktivitäten / Tag"
                            value={stats.avgEntriesPerDay}
                            sub="Durchschnittliche App-Wechsel pro Tag"
                        />
                        <StatCard
                            label="Konsistenz"
                            value={<>{stats.consistencyScore}<span className="card-unit">%</span></>}
                            sub={
                                <div style={{ height: '4px', width: '100%', background: '#e2e8f0', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${stats.consistencyScore}%`, background: '#3b82f6' }} />
                                </div>
                            }
                        />
                    </div>

                    <div className="dashboard-panel" style={{ marginBottom: '30px' }}>
                        <h3 className="panel-title">Wichtigste Programme</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '10px' }}>
                            {stats.programUsage.slice(0, 10).map((prog, idx) => {
                                const totalMinutes = Math.round(prog.value * 60);
                                const h = Math.floor(totalMinutes / 60);
                                const m = totalMinutes % 60;
                                const timeStr = `${h}h ${m}m`;
                                return (
                                    <div key={idx} style={{
                                        width: '80px', height: '100px', borderRadius: '12px', background: 'white',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
                                        padding: '10px'
                                    }} title={`${prog.name}: ${timeStr}`}>
                                        <div style={{ width: '40px', height: '40px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {prog.icon
                                                ? <img src={prog.icon} alt={prog.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                : <AppIcon appName={prog.name} path={(prog as any).exePath} fallbackColor={prog.color} />
                                            }
                                        </div>
                                        <div style={{ background: '#3b82f6', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                                            {timeStr}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                            {prog.name}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="dashboard-panel">
                        <h3 className="panel-title">Programm-Nutzung (Prozentuale Verteilung)</h3>
                        <ResponsiveContainer width="100%" height={350} debounce={50}>
                            <PieChart>
                                <Pie data={stats.programUsage} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                                    {stats.programUsage.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => [`${v} Std`, 'Dauer']} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                VIEW: EINBLICKE (Insights)
            ════════════════════════════════════════════════════════════════ */}
            {activeView === 'insights' && (
                <>
                    {/* ── Top-Stats-Zeile ─────────────────────────────────── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>

                        {/* Streak */}
                        <div className="dashboard-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: '4px' }}><FaFire /></div>
                            <div className="card-value" style={{ color: '#f59e0b' }}>{stats.streak}</div>
                            <div className="card-label" style={{ marginTop: '4px' }}>Tage Streak</div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Rekord: {stats.longestStreak} Tage</div>
                        </div>

                        {/* Fokus-Score */}
                        <div className="dashboard-card" style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ScoreRing value={stats.focusScore} color="#6366f1" />
                                <div style={{ position: 'absolute', fontSize: '1.2rem', fontWeight: 800, color: '#6366f1' }}>
                                    {stats.focusScore}
                                </div>
                            </div>
                            <div className="card-label" style={{ marginTop: '4px' }}>Fokus-Score</div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                                {stats.focusScore >= 70 ? 'Sehr fokussiert' : stats.focusScore >= 40 ? 'Moderat' : 'Viele App-Wechsel'}
                            </div>
                        </div>

                        {/* Arbeitsprofil */}
                        <div className="dashboard-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', color: '#3b82f6', marginBottom: '4px' }}>{patternIcon}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{patternLabel}</div>
                            <div className="card-label" style={{ marginTop: '4px' }}>Arbeitsmuster</div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Peak: {stats.peakHourLabel}</div>
                        </div>

                        {/* Arbeitstage */}
                        <div className="dashboard-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', color: '#10b981', marginBottom: '4px' }}><FaBolt /></div>
                            <div className="card-value" style={{ color: '#10b981' }}>{stats.totalWorkDays}</div>
                            <div className="card-label" style={{ marginTop: '4px' }}>Arbeitstage gesamt</div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>seit Programmstart</div>
                        </div>
                    </div>

                    {/* ── Aktivitäts-Heatmap ──────────────────────────────── */}
                    <div className="dashboard-panel" style={{ marginBottom: '30px' }}>
                        <h3 className="panel-title">Aktivitäts-Heatmap (letzte 12 Wochen)</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                            Ähnlich wie GitHub-Beitragsdiagramm — je dunkler, desto mehr Stunden.
                        </p>
                        <div style={{ overflowX: 'auto' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateRows: 'repeat(7, 16px)',
                                gridAutoFlow: 'column',
                                gap: '3px',
                                width: 'max-content',
                            }}>
                                {stats.dailyHeatmap.map((day, i) => (
                                    <div
                                        key={i}
                                        title={`${day.date}: ${day.hours}h`}
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '3px',
                                            background: day.intensity === 0 ? '#e2e8f0'
                                                      : day.intensity === 1 ? '#bbf7d0'
                                                      : day.intensity === 2 ? '#4ade80'
                                                      : day.intensity === 3 ? '#16a34a'
                                                      : '#14532d',
                                            cursor: 'default',
                                            transition: 'transform 0.1s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')}
                                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                    />
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.78rem', color: '#94a3b8' }}>
                            <span>Weniger</span>
                            {['#e2e8f0', '#bbf7d0', '#4ade80', '#16a34a', '#14532d'].map((c, i) => (
                                <div key={i} style={{ width: '14px', height: '14px', borderRadius: '3px', background: c }} />
                            ))}
                            <span>Mehr</span>
                        </div>
                    </div>

                    {/* ── Wochentag-Analyse + Tagestypen ──────────────────── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '25px', marginBottom: '30px' }}>

                        <div className="dashboard-panel">
                            <h3 className="panel-title">Durchschnitt pro Wochentag</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                                Ø gebuchte Stunden pro Wochentag (letzte 12 Wochen).
                            </p>
                            <ResponsiveContainer width="100%" height={220} debounce={50}>
                                <BarChart data={stats.dayOfWeekStats} barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} unit="h" />
                                    <Tooltip
                                        formatter={(v: number) => [`${v} Std`, 'Ø Stunden']}
                                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="avgHours" radius={[6, 6, 0, 0]}>
                                        {stats.dayOfWeekStats.map((entry, i) => (
                                            <Cell
                                                key={i}
                                                fill={entry.avgHours >= Math.max(...stats.dayOfWeekStats.map(d => d.avgHours)) * 0.8
                                                    ? '#6366f1' : '#c7d2fe'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="dashboard-panel">
                            <h3 className="panel-title">Tagestypen</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                                Wie sehen deine Arbeitstage aus? (basierend auf gebuchten Stunden)
                            </p>
                            {stats.dayTypes.total > 0 ? (
                                <>
                                    {[
                                        { label: 'Deep Work', key: 'deepWork', color: '#6366f1', desc: '≥ 5 Std', icon: <FaBrain /> },
                                        { label: 'Gemischt',  key: 'mixed',    color: '#3b82f6', desc: '2–5 Std', icon: <FaClock /> },
                                        { label: 'Leicht',    key: 'light',    color: '#94a3b8', desc: '< 2 Std',  icon: <FaMinus /> },
                                    ].map(({ label, key, color, desc, icon }) => {
                                        const count = stats.dayTypes[key as keyof typeof stats.dayTypes] as number;
                                        const pct   = stats.dayTypes.total > 0 ? Math.round(count / stats.dayTypes.total * 100) : 0;
                                        return (
                                            <div key={key} style={{ marginBottom: '14px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
                                                        <span style={{ color }}>{icon}</span>{label}
                                                        <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.78rem' }}>{desc}</span>
                                                    </span>
                                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{count} Tage ({pct}%)</span>
                                                </div>
                                                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                                        <strong style={{ color: '#1e293b' }}>Zusammenfassung:</strong> Von {stats.dayTypes.total} Arbeitstagen waren {Math.round(stats.dayTypes.deepWork / stats.dayTypes.total * 100)}% echte Deep-Work-Tage.
                                    </div>
                                </>
                            ) : (
                                <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Noch keine Sessionen im gewählten Zeitraum.</div>
                            )}
                        </div>
                    </div>

                    {/* ── Tagesverlauf ─────────────────────────────────────── */}
                    <div className="dashboard-panel">
                        <h3 className="panel-title">Tagesverlauf (Wann bist du aktiv?)</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '10px' }}>
                            Stundenweise Aktivitätsintensität über alle Tage im Zeitraum kumuliert. Peak: <strong>{stats.peakHourLabel}</strong>
                        </p>
                        <ResponsiveContainer width="100%" height={180} debounce={50}>
                            <AreaChart data={stats.peakHours}>
                                <defs>
                                    <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} interval={2} dy={5} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#peakGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}

            <style>{`
                .dashboard-card {
                    background: white; padding: 20px; border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    display: flex; flex-direction: column; justify-content: center;
                }
                .card-label { font-size: 0.85rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
                .card-value { font-size: 2.2rem; font-weight: 800; color: #1e293b; line-height: 1; }
                .card-unit  { font-size: 1rem; color: #94a3b8; font-weight: 600; }
                .dashboard-panel {
                    background: white; padding: 25px; border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .panel-title { margin: 0 0 20px 0; font-size: 1rem; color: #334155; font-weight: 700; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};
