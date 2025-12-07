import Database from '@tauri-apps/plugin-sql';

export interface DashboardStats {
    totalHours: number;
    avgDaily: number;
    projectDistribution: { name: string, value: number, color: string, percentage: number }[];
    trends: { name: string, changePercent: number, currentHours: number, prevHours: number, color: string }[];
    history: { name: string, hours: number }[];
    periodLabel: string; // z.B. "01.05. - 10.05."
}

export interface DashboardFilter {
    start: Date;
    end: Date;
    projectIds: number[]; // Leeres Array = Alle Projekte
}

export async function getDashboardStats(db: Database, filter: DashboardFilter): Promise<DashboardStats> {
    
    // 1. Zeiträume berechnen
    const startCurrent = new Date(filter.start);
    startCurrent.setHours(0,0,0,0);
    
    const endCurrent = new Date(filter.end);
    endCurrent.setHours(23,59,59,999);

    const durationMs = endCurrent.getTime() - startCurrent.getTime();
    const daysDiff = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

    // Vergleichszeitraum (genau davor)
    const endPrev = new Date(startCurrent.getTime() - 1);
    const startPrev = new Date(endPrev.getTime() - durationMs);

    // 2. Daten laden (Wir laden etwas mehr und filtern im Memory für Flexibilität)
    // Wir laden ab startPrev
    const sessions = await db.select<any[]>(`
        SELECT ws.start_time, ws.end_time, p.id as pid, p.name as project_name, p.color
        FROM work_sessions ws
        LEFT JOIN projects p ON ws.project_id = p.id
        WHERE ws.end_time >= $1
    `, [startPrev.toISOString()]);

    const currentMap = new Map<string, {hours: number, color: string}>();
    const prevMap = new Map<string, number>();
    const historyMap = new Map<string, number>();
    let totalCurrentHours = 0;

    // Helper: Ist Projekt relevant?
    const isProjectRelevant = (pid: number) => {
        if (filter.projectIds.length === 0) return true; // Alle
        return filter.projectIds.includes(pid);
    };

    sessions.forEach(s => {
        // Projekt Filter prüfen
        if (!isProjectRelevant(s.pid)) return;

        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const name = s.project_name || "Ohne Projekt";
        const color = s.color || "#94a3b8";

        // A) Aktueller Zeitraum
        if (start >= startCurrent && start <= endCurrent) {
            totalCurrentHours += hours;
            
            // Distribution
            if (!currentMap.has(name)) currentMap.set(name, {hours: 0, color});
            currentMap.get(name)!.hours += hours;

            // History (Tage)
            const dayKey = start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
            historyMap.set(dayKey, (historyMap.get(dayKey) || 0) + hours);
        } 
        // B) Vergleichszeitraum
        else if (start >= startPrev && start <= endPrev) {
            prevMap.set(name, (prevMap.get(name) || 0) + hours);
        }
    });

    // 3. Aufbereiten

    // Distribution
    const projectDistribution = Array.from(currentMap.entries()).map(([name, data]) => ({
        name,
        value: parseFloat(data.hours.toFixed(2)),
        color: data.color,
        percentage: totalCurrentHours > 0 ? Math.round((data.hours / totalCurrentHours) * 100) : 0
    })).sort((a, b) => b.value - a.value);

    // Trends
    const trends = Array.from(currentMap.entries()).map(([name, data]) => {
        const prevHours = prevMap.get(name) || 0;
        let changePercent = 0;
        
        if (prevHours === 0 && data.hours > 0) changePercent = 100;
        else if (data.hours === 0) changePercent = -100;
        else changePercent = Math.round(((data.hours - prevHours) / prevHours) * 100);

        return {
            name,
            changePercent,
            currentHours: parseFloat(data.hours.toFixed(1)),
            prevHours: parseFloat(prevHours.toFixed(1)),
            color: data.color
        };
    }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

    // History auffüllen (Lücken füllen)
    const history = [];
    // Wir iterieren über jeden Tag im Zeitraum
    for (let i = 0; i < daysDiff; i++) {
        const d = new Date(startCurrent);
        d.setDate(d.getDate() + i);
        const key = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        history.push({
            name: key,
            hours: parseFloat((historyMap.get(key) || 0).toFixed(1))
        });
    }

    const periodLabel = `${startCurrent.toLocaleDateString()} - ${endCurrent.toLocaleDateString()}`;

    return {
        totalHours: parseFloat(totalCurrentHours.toFixed(2)),
        avgDaily: parseFloat((totalCurrentHours / daysDiff).toFixed(1)),
        projectDistribution,
        trends,
        history,
        periodLabel
    };
}
