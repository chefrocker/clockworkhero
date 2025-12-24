import Database from '@tauri-apps/plugin-sql';

export interface DashboardStats {
    totalHours: number;
    avgDaily: number;
    avgEntriesPerDay: number;
    projectDistribution: { name: string, value: number, color: string, percentage: number }[];
    programUsage: { name: string, value: number, color: string, percentage: number, icon?: string }[];
    trends: { name: string, changePercent: number, currentHours: number, prevHours: number, color: string }[];
    history: { name: string, [key: string]: any }[]; // Key ist Projektname oder 'hours'
    peakHours: { hour: string, value: number }[];
    periodLabel: string;
    consistencyScore: number; // 0-100
}

export interface DashboardFilter {
    start: Date;
    end: Date;
    projectIds: number[]; // Leeres Array = Alle Projekte
}

export async function getDashboardStats(db: Database, filter: DashboardFilter): Promise<DashboardStats> {

    // 1. Zeiträume berechnen
    const startCurrent = new Date(filter.start);
    startCurrent.setHours(0, 0, 0, 0);

    const endCurrent = new Date(filter.end);
    endCurrent.setHours(23, 59, 59, 999);

    const durationMs = endCurrent.getTime() - startCurrent.getTime();
    const daysDiff = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) || 1;

    const endPrev = new Date(startCurrent.getTime() - 1);
    const startPrev = new Date(endPrev.getTime() - durationMs);

    // 2. Daten laden
    const sessions = await db.select<any[]>(`
        SELECT ws.start_time, ws.end_time, p.id as pid, p.name as project_name, p.color
        FROM work_sessions ws
        LEFT JOIN projects p ON ws.project_id = p.id
        WHERE ws.end_time >= $1
    `, [startPrev.toISOString()]);

    // Logs für Programmauswertung (nur aktueller Zeitraum)
    const logs = await db.select<any[]>(`
        SELECT title, exe_path, created_at FROM logs 
        WHERE created_at >= $1 AND created_at <= $2
    `, [startCurrent.toISOString().replace('T', ' ').slice(0, 19), endCurrent.toISOString().replace('T', ' ').slice(0, 19)]);

    const currentMap = new Map<string, { hours: number, color: string }>();
    const prevMap = new Map<string, number>();
    const historyMap = new Map<string, Map<string, number>>(); // Day -> Project -> Hours
    const peakMap = new Array(24).fill(0);
    let totalCurrentHours = 0;
    let entriesCount = 0;

    const isProjectRelevant = (pid: number) => {
        if (filter.projectIds.length === 0) return true;
        return filter.projectIds.includes(pid);
    };

    sessions.forEach(s => {
        if (!isProjectRelevant(s.pid)) return;

        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const name = s.project_name || "Ohne Projekt";
        const color = s.color || "#94a3b8";

        if (start >= startCurrent && start <= endCurrent) {
            totalCurrentHours += hours;
            entriesCount++;

            if (!currentMap.has(name)) currentMap.set(name, { hours: 0, color });
            currentMap.get(name)!.hours += hours;

            const dayKey = start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
            if (!historyMap.has(dayKey)) historyMap.set(dayKey, new Map());
            const dayMap = historyMap.get(dayKey)!;
            dayMap.set(name, (dayMap.get(name) || 0) + hours);

            const startHour = start.getHours();
            const endHour = end.getHours();
            for (let h = startHour; h <= endHour; h++) peakMap[h] += (hours / (endHour - startHour + 1));
        }
        else if (start >= startPrev && start <= endPrev) {
            prevMap.set(name, (prevMap.get(name) || 0) + hours);
        }
    });

    // Programmauswertung mit Icons
    const appConfigs = await db.select<{ name: string, color: string, icon: string }[]>("SELECT name, color, icon FROM app_colors");
    const configMap = new Map(appConfigs.map(c => [c.name, c]));

    const programMap = new Map<string, { count: number, exePath: string }>();
    logs.forEach(l => {
        // Gleiche Extraktionslogik wie in db.ts
        const parts = l.exe_path?.split(/[/\\]/) || [];
        const filename = parts[parts.length - 1]?.toLowerCase() || "";

        let progName = "";
        const mapping: Record<string, string> = {
            'notepad++.exe': 'Notepad++', 'chrome.exe': 'Google Chrome', 'firefox.exe': 'Firefox',
            'msedge.exe': 'Edge', 'code.exe': 'VS Code', 'winword.exe': 'Word',
            'excel.exe': 'Excel', 'powerpnt.exe': 'PowerPoint', 'outlook.exe': 'Outlook',
            'onenote.exe': 'OneNote', 'teams.exe': 'Teams', 'spotify.exe': 'Spotify',
            'discord.exe': 'Discord', 'whatsapp.exe': 'WhatsApp', 'slack.exe': 'Slack',
            'explorer.exe': 'Explorer', 'cmd.exe': 'Terminal', 'powershell.exe': 'Terminal',
            'pwsh.exe': 'Terminal', 'wt.exe': 'Terminal', 'powershell_ise.exe': 'Terminal'
        };

        if (mapping[filename]) {
            progName = mapping[filename];
        } else {
            progName = filename.replace('.exe', '');
            progName = progName.charAt(0).toUpperCase() + progName.slice(1);
        }

        if (!progName) progName = "Unbekannt";
        const current = programMap.get(progName) || { count: 0, exePath: l.exe_path };
        current.count++;
        programMap.set(progName, current);
    });

    const programUsage = Array.from(programMap.entries())
        .map(([name, data]) => {
            const config = configMap.get(name);
            // Aufrunden auf 5 Minuten:
            const roundedMinutes = Math.ceil(data.count / 5) * 5;
            const hours = parseFloat((roundedMinutes / 60).toFixed(2));

            return {
                name,
                value: hours,
                color: config?.color || `hsl(${Math.abs(name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 60%, 70%)`,
                icon: config?.icon,
                exePath: data.exePath,
                percentage: logs.length > 0 ? Math.round((data.count / logs.length) * 100) : 0
            };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    // 3. Aufbereiten
    const projectDistribution = Array.from(currentMap.entries()).map(([name, data]) => ({
        name,
        value: parseFloat(data.hours.toFixed(2)),
        color: data.color,
        percentage: totalCurrentHours > 0 ? Math.round((data.hours / totalCurrentHours) * 100) : 0
    })).sort((a, b) => b.value - a.value);

    const trends = Array.from(currentMap.entries()).map(([name, data]) => {
        const prevHours = prevMap.get(name) || 0;
        let changePercent = 0;
        if (prevHours === 0 && data.hours > 0) changePercent = 100;
        else if (data.hours === 0) changePercent = -100;
        else changePercent = Math.round(((data.hours - prevHours) / prevHours) * 100);
        return { name, changePercent, currentHours: parseFloat(data.hours.toFixed(1)), prevHours: parseFloat(prevHours.toFixed(1)), color: data.color };
    }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

    const history = [];
    let workDaysCount = 0;
    for (let i = 0; i < daysDiff; i++) {
        const d = new Date(startCurrent);
        d.setDate(d.getDate() + i);
        const dayKey = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        const dayData: any = { name: dayKey, total: 0 };
        const dayMap = historyMap.get(dayKey);
        if (dayMap) {
            workDaysCount++;
            dayMap.forEach((hrs, proj) => {
                dayData[proj] = parseFloat(hrs.toFixed(1));
                dayData.total += hrs;
            });
        }
        history.push(dayData);
    }

    const peakHours = peakMap.map((val, idx) => ({
        hour: `${idx.toString().padStart(2, '0')}:00`,
        value: parseFloat(val.toFixed(1))
    }));

    const consistencyScore = Math.min(100, Math.round((workDaysCount / (daysDiff * 0.7)) * 100));

    return {
        totalHours: parseFloat(totalCurrentHours.toFixed(2)),
        avgDaily: parseFloat((totalCurrentHours / (workDaysCount || 1)).toFixed(1)),
        avgEntriesPerDay: parseFloat((entriesCount / (workDaysCount || 1)).toFixed(1)),
        projectDistribution,
        programUsage,
        trends,
        history,
        peakHours,
        periodLabel: `${startCurrent.toLocaleDateString()} - ${endCurrent.toLocaleDateString()}`,
        consistencyScore
    };
}
