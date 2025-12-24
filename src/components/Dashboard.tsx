import React, { useEffect, useState } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { FaArrowUp, FaArrowDown, FaMinus, FaChartLine, FaFilter, FaFileExcel, FaCheckSquare, FaSquare } from 'react-icons/fa';
import { getDashboardStats, DashboardStats, DashboardFilter } from '../services/analyticsService';
import { exportDashboardAnalysis } from '../services/exportService';
import { Project } from '../types';
import { AppIcon } from './AppIcon';

interface Props {
    db: Database | null;
    projects: Project[];
}

export const Dashboard: React.FC<Props> = ({ db, projects }) => {
    const [stats, setStats] = useState<DashboardStats | null>(null);

    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [selectedProjIds, setSelectedProjIds] = useState<number[]>([]);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [activeView, setActiveView] = useState<'projects' | 'activity'>('projects');

    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 13);
        setStartDate(start.toISOString().slice(0, 10));
        setEndDate(end.toISOString().slice(0, 10));
    }, []);

    useEffect(() => {
        if (db && startDate && endDate) {
            const filter: DashboardFilter = {
                start: new Date(startDate),
                end: new Date(endDate),
                projectIds: selectedProjIds
            };
            getDashboardStats(db, filter).then(setStats);
        }
    }, [db, startDate, endDate, selectedProjIds]);

    const toggleProject = (id: number) => {
        if (selectedProjIds.includes(id)) {
            setSelectedProjIds(selectedProjIds.filter(pid => pid !== id));
        } else {
            setSelectedProjIds([...selectedProjIds, id]);
        }
    };

    const handleExport = () => {
        if (stats) exportDashboardAnalysis(stats);
    };

    const setRangeDays = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (days - 1));
        setStartDate(start.toISOString().slice(0, 10));
        setEndDate(end.toISOString().slice(0, 10));
    };

    if (!stats) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Lade Daten...</div>;

    return (
        <div style={{ padding: '30px', height: '100%', overflowY: 'auto', background: '#f8fafc' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaChartLine /> Dashboard
                    </h2>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '5px' }}>
                        {stats.periodLabel} • {selectedProjIds.length === 0 ? "Alle Projekte" : `${selectedProjIds.length} Projekte ausgewählt`}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn-secondary"
                        onClick={() => setActiveView(activeView === 'projects' ? 'activity' : 'projects')}
                        style={{ background: activeView === 'activity' ? '#3b82f6' : 'white', color: activeView === 'activity' ? 'white' : '#1e293b' }}
                    >
                        <FaChartLine /> {activeView === 'projects' ? 'Activity Cards' : 'Dashboard'}
                    </button>
                    <button className="btn-secondary" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                        <FaFilter /> Filter & Zeitraum
                    </button>
                    <button className="btn-save" onClick={handleExport} style={{ background: '#10b981' }}>
                        <FaFileExcel /> Analyse Exportieren
                    </button>
                </div>
            </div>

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
                                <input type="date" className="input-text" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <span style={{ color: '#94a3b8' }}>bis</span>
                                <input type="date" className="input-text" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h4 style={{ margin: 0, color: '#475569' }}>Projekte filtern</h4>
                                <button
                                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', padding: 0 }}
                                    onClick={() => setSelectedProjIds([])}
                                >
                                    Alle auswählen
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                                {projects.map(p => {
                                    const isSelected = selectedProjIds.length === 0 || selectedProjIds.includes(p.id);
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => toggleProject(p.id)}
                                            style={{
                                                padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer',
                                                border: `1px solid ${isSelected ? p.color : '#e2e8f0'}`,
                                                background: isSelected ? p.color : 'white',
                                                color: isSelected ? 'white' : '#64748b',
                                                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                                            }}
                                        >
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

            {activeView === 'projects' ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div className="dashboard-card">
                            <div className="card-label">Gesamtzeit</div>
                            <div className="card-value">{stats.totalHours} <span className="card-unit">Std</span></div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '5px' }}>
                                Ø {stats.avgDaily} Std / Arbeitstag
                            </div>
                        </div>

                        {stats.projectDistribution.length > 0 && (
                            <div className="dashboard-card" style={{ borderLeft: `4px solid ${stats.projectDistribution[0].color}` }}>
                                <div className="card-label">Hauptfokus (Projekt)</div>
                                <div className="card-value" style={{ fontSize: '1.4rem' }}>{stats.projectDistribution[0].name}</div>
                                <div style={{ fontSize: '1.2rem', color: stats.projectDistribution[0].color, fontWeight: 'bold', marginTop: '5px' }}>
                                    {stats.projectDistribution[0].percentage}% <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal' }}>der Projektzeit</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="dashboard-panel" style={{ marginBottom: '30px' }}>
                        <h3 className="panel-title">Projekt-Verlauf (Schichtdiagramm)</h3>
                        <div style={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer width="100%" height={400} debounce={50}>
                                <AreaChart data={stats.history}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} minTickGap={30} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                    <Legend />
                                    {projects.map(p => (
                                        <Area
                                            key={p.id}
                                            type="monotone"
                                            dataKey={p.name}
                                            stackId="1"
                                            stroke={p.color}
                                            fill={p.color}
                                            fillOpacity={0.6}
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px', marginBottom: '30px' }}>
                        <div className="dashboard-panel">
                            <h3 className="panel-title">Projekt Verteilung</h3>
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer width="100%" height={350} debounce={50}>
                                    <PieChart>
                                        <Pie
                                            data={stats.projectDistribution}
                                            cx="50%" cy="50%"
                                            innerRadius={70} outerRadius={110}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.projectDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => [`${value} Std`, 'Dauer']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="dashboard-panel">
                            <h3 className="panel-title">Aktivitäts-Peaks (Tageszeit)</h3>
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer width="100%" height={350} debounce={50}>
                                    <AreaChart data={stats.peakHours}>
                                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} interval={2} dy={5} />
                                        <YAxis hide />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                        <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '10px' }}>
                                <strong>Was das zeigt:</strong> Zu welchen Uhrzeiten die meiste Interaktion am Gerät stattfindet (Intensität).
                            </p>
                        </div>
                    </div>

                    <div className="dashboard-panel">
                        <h3 className="panel-title">Trends & Veränderungen</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '15px' }}>
                            <strong>Was das zeigt:</strong> Vergleich der Programmnutzung zwischen dem aktuellen und dem vorherigen Zeitraum.
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
                                        color: trend.changePercent > 0 ? '#10b981' : (trend.changePercent < 0 ? '#ef4444' : '#94a3b8'),
                                        background: trend.changePercent > 0 ? '#ecfdf5' : (trend.changePercent < 0 ? '#fef2f2' : '#f1f5f9'),
                                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem'
                                    }}>
                                        {trend.changePercent > 0 ? <FaArrowUp size={10} /> : (trend.changePercent < 0 ? <FaArrowDown size={10} /> : <FaMinus size={10} />)}
                                        {Math.abs(trend.changePercent)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div className="dashboard-card">
                            <div className="card-label">Anzahl Einträge</div>
                            <div className="card-value">{stats.avgEntriesPerDay}</div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '5px' }}>
                                <strong>Was das zeigt:</strong> Durchschnittliche Anzahl an Computer-Aktivitäten pro Tag. Ein hoher Wert deutet auf häufige Aufgabenwechsel hin.
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <div className="card-label">Konsistenz</div>
                            <div className="card-value">{stats.consistencyScore}<span className="card-unit">%</span></div>
                            <div style={{
                                height: '4px', width: '100%', background: '#e2e8f0', borderRadius: '2px', marginTop: '10px', overflow: 'hidden'
                            }}>
                                <div style={{ height: '100%', width: `${stats.consistencyScore}%`, background: '#3b82f6' }}></div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '10px' }}>
                                <strong>Was das zeigt:</strong> Wie gleichmäßig die Auslastung über die Woche verteilt ist. 100% bedeutet jeden Tag identische Aktivität.
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-panel" style={{ marginBottom: '30px' }}>
                        <h3 className="panel-title">Wichtigste Programme</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '15px' }}>Die am häufigsten genutzten Anwendungen auf einen Blick:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '10px' }}>
                            {stats.programUsage.slice(0, 10).map((prog, idx) => {
                                const totalMinutes = Math.round(prog.value * 60);
                                const d = Math.floor(totalMinutes / (24 * 60));
                                const h = Math.floor((totalMinutes % (24 * 60)) / 60);
                                const m = totalMinutes % 60;
                                const timeStr = `${d}d ${h}h ${m}m`;

                                return (
                                    <div key={idx} style={{
                                        width: '80px', height: '100px', borderRadius: '12px', background: 'white',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
                                        position: 'relative', padding: '10px'
                                    }} title={`${prog.name}: ${timeStr}`}>
                                        <div style={{ width: '40px', height: '40px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {prog.icon ? (
                                                <img src={prog.icon} alt={prog.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <AppIcon appName={prog.name} path={(prog as any).exePath} fallbackColor={prog.color} />
                                            )}
                                        </div>
                                        <div style={{
                                            background: '#3b82f6', color: 'white',
                                            fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold'
                                        }}>
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
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer width="100%" height={350} debounce={50}>
                                <PieChart>
                                    <Pie
                                        data={stats.programUsage}
                                        cx="50%" cy="50%"
                                        innerRadius={70} outerRadius={110}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.programUsage.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => [`${value} Std`, 'Dauer']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '10px' }}>
                            <strong>Was das zeigt:</strong> Welchen Anteil Ihres Arbeitstags Sie in welchen Programmen verbringen.
                        </p>
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
                .card-unit { font-size: 1rem; color: #94a3b8; font-weight: 600; }
                
                .dashboard-panel {
                    background: white; padding: 25px; border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .panel-title { margin: 0 0 20px 0; font-size: 1rem; color: #334155; font-weight: 700; }
                .section-title { font-size: 0.9rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 15px 0; }
                
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};
