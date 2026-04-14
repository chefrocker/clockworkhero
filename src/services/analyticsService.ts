import Database from '@tauri-apps/plugin-sql';

export interface DayOfWeekStat {
    day: string;      // "Mo", "Di", ...
    avgHours: number;
    activeDays: number;
}

export interface HeatmapDay {
    date: string;
    hours: number;
    intensity: 0 | 1 | 2 | 3 | 4;
}

export interface DayTypes {
    deepWork: number;   // >5h booked
    light: number;      // <2h booked
    mixed: number;      // 2–5h booked
    total: number;
}

export interface DashboardStats {
    totalHours: number;
    avgDaily: number;
    avgEntriesPerDay: number;
    projectDistribution: { name: string, value: number, color: string, percentage: number }[];
    programUsage: { name: string, value: number, color: string, percentage: number, icon?: string }[];
    trends: { name: string, changePercent: number, currentHours: number, prevHours: number, color: string }[];
    history: { name: string, [key: string]: any }[];
    peakHours: { hour: string, value: number }[];
    periodLabel: string;
    consistencyScore: number;
    // ── Neue Felder ───────────────────────────────────────────────────
    dayOfWeekStats: DayOfWeekStat[];
    focusScore: number;          // 0–100
    streak: number;              // Aktuelle Streak (aufeinanderfolgende Arbeitstage)
    longestStreak: number;
    workPattern: 'early' | 'late' | 'balanced' | 'night';
    peakHourLabel: string;       // z.B. "10–12 Uhr"
    dailyHeatmap: HeatmapDay[];  // 84 Tage (12 Wochen)
    dayTypes: DayTypes;
    totalWorkDays: number;
}

export interface DashboardFilter {
    start: Date;
    end: Date;
    projectIds: number[];
}

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function toSqlDate(d: Date): string {
    return d.toISOString().replace('T', ' ').slice(0, 19);
}

function intensityFor(hours: number): 0 | 1 | 2 | 3 | 4 {
    if (hours === 0) return 0;
    if (hours < 2)   return 1;
    if (hours < 4)   return 2;
    if (hours < 6)   return 3;
    return 4;
}

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// ─── Hauptfunktion ──────────────────────────────────────────────────────────

export async function getDashboardStats(db: Database, filter: DashboardFilter): Promise<DashboardStats> {

    const startCurrent = new Date(filter.start);
    startCurrent.setHours(0, 0, 0, 0);
    const endCurrent = new Date(filter.end);
    endCurrent.setHours(23, 59, 59, 999);

    const durationMs = endCurrent.getTime() - startCurrent.getTime();
    const daysDiff = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) || 1;

    const endPrev = new Date(startCurrent.getTime() - 1);
    const startPrev = new Date(endPrev.getTime() - durationMs);

    // ── Heatmap / dayOfWeek Zeitraum: immer 84 Tage zurück ──────────────────
    const heatmapEnd = new Date();
    heatmapEnd.setHours(23, 59, 59, 999);
    const heatmapStart = new Date();
    heatmapStart.setDate(heatmapStart.getDate() - 83);
    heatmapStart.setHours(0, 0, 0, 0);

    // ── 1. Sessions (aktueller + vorheriger Zeitraum) ────────────────────────
    const sessions = await db.select<any[]>(`
        SELECT ws.start_time, ws.end_time, p.id as pid, p.name as project_name, p.color
        FROM work_sessions ws
        LEFT JOIN projects p ON ws.project_id = p.id
        WHERE ws.end_time >= $1
    `, [startPrev.toISOString()]);

    // ── 2. Logs (nur aktueller Zeitraum) ─────────────────────────────────────
    const logs = await db.select<any[]>(`
        SELECT title, exe_path, created_at FROM logs
        WHERE created_at >= $1 AND created_at <= $2
    `, [toSqlDate(startCurrent), toSqlDate(endCurrent)]);

    // ── 3. Heatmap-Daten (84 Tage) ────────────────────────────────────────────
    const heatmapRows = await db.select<{ date: string, hours: number }[]>(`
        SELECT DATE(start_time) as date,
               SUM((julianday(end_time) - julianday(start_time)) * 24) as hours
        FROM work_sessions
        WHERE start_time >= $1
        GROUP BY DATE(start_time)
        ORDER BY date
    `, [heatmapStart.toISOString().slice(0, 10)]);

    // ── 4. Alle Arbeitstage (für Streak) ─────────────────────────────────────
    const allWorkDays = await db.select<{ work_date: string }[]>(`
        SELECT DISTINCT DATE(start_time) as work_date
        FROM work_sessions
        ORDER BY work_date DESC
    `, []);

    // ── 5. dayOfWeek-Stats (84 Tage) ─────────────────────────────────────────
    const dowRows = await db.select<{ weekday_num: string, total_hours: number, active_days: number }[]>(`
        SELECT strftime('%w', DATE(start_time)) as weekday_num,
               SUM((julianday(end_time) - julianday(start_time)) * 24) as total_hours,
               COUNT(DISTINCT DATE(start_time)) as active_days
        FROM work_sessions
        WHERE start_time >= $1
        GROUP BY strftime('%w', DATE(start_time))
    `, [heatmapStart.toISOString().slice(0, 10)]);

    // ── Auswertung: Sessions ──────────────────────────────────────────────────
    const currentMap = new Map<string, { hours: number, color: string }>();
    const prevMap    = new Map<string, number>();
    const historyMap = new Map<string, Map<string, number>>();
    const peakMap    = new Array(24).fill(0);
    let totalCurrentHours = 0;
    let entriesCount      = 0;

    const isProjectRelevant = (pid: number) =>
        filter.projectIds.length === 0 || filter.projectIds.includes(pid);

    sessions.forEach(s => {
        if (!isProjectRelevant(s.pid)) return;
        const start = new Date(s.start_time);
        const end   = new Date(s.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const name  = s.project_name || "Ohne Projekt";
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
            const endHour   = end.getHours();
            for (let h = startHour; h <= endHour; h++) peakMap[h] += hours / (endHour - startHour + 1);
        } else if (start >= startPrev && start <= endPrev) {
            prevMap.set(name, (prevMap.get(name) || 0) + hours);
        }
    });

    // ── Programmauswertung ────────────────────────────────────────────────────
    const appConfigs = await db.select<{ name: string, color: string, icon: string }[]>(
        "SELECT name, color, icon FROM app_colors"
    );
    const configMap = new Map(appConfigs.map(c => [c.name, c]));

    const programMap = new Map<string, { count: number, exePath: string }>();
    logs.forEach(l => {
        const parts    = l.exe_path?.split(/[/\\]/) || [];
        const filename = parts[parts.length - 1]?.toLowerCase() || "";
        const mapping: Record<string, string> = {
            'notepad++.exe': 'Notepad++', 'chrome.exe': 'Google Chrome', 'firefox.exe': 'Firefox',
            'msedge.exe': 'Edge', 'code.exe': 'VS Code', 'winword.exe': 'Word',
            'excel.exe': 'Excel', 'powerpnt.exe': 'PowerPoint', 'outlook.exe': 'Outlook',
            'onenote.exe': 'OneNote', 'teams.exe': 'Teams', 'spotify.exe': 'Spotify',
            'discord.exe': 'Discord', 'whatsapp.exe': 'WhatsApp', 'slack.exe': 'Slack',
            'explorer.exe': 'Explorer', 'cmd.exe': 'Terminal', 'powershell.exe': 'Terminal',
            'pwsh.exe': 'Terminal', 'wt.exe': 'Terminal', 'powershell_ise.exe': 'Terminal'
        };
        let progName = mapping[filename] || (filename.replace('.exe', '').replace(/^\w/, (c: string) => c.toUpperCase()));
        if (!progName) progName = "Unbekannt";
        const current = programMap.get(progName) || { count: 0, exePath: l.exe_path };
        current.count++;
        programMap.set(progName, current);
    });

    const programUsage = Array.from(programMap.entries())
        .map(([name, data]) => {
            const config         = configMap.get(name);
            const roundedMinutes = Math.ceil(data.count / 5) * 5;
            return {
                name,
                value:      parseFloat((roundedMinutes / 60).toFixed(2)),
                color:      config?.color || `hsl(${Math.abs(name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 60%, 70%)`,
                icon:       config?.icon,
                exePath:    data.exePath,
                percentage: logs.length > 0 ? Math.round((data.count / logs.length) * 100) : 0
            };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    // ── Aufbereitung: Projekt-Distribution, History, Trends ──────────────────
    const projectDistribution = Array.from(currentMap.entries()).map(([name, data]) => ({
        name,
        value:      parseFloat(data.hours.toFixed(2)),
        color:      data.color,
        percentage: totalCurrentHours > 0 ? Math.round((data.hours / totalCurrentHours) * 100) : 0
    })).sort((a, b) => b.value - a.value);

    const trends = Array.from(currentMap.entries()).map(([name, data]) => {
        const prevHours    = prevMap.get(name) || 0;
        let changePercent  = 0;
        if (prevHours === 0 && data.hours > 0) changePercent = 100;
        else if (data.hours === 0)             changePercent = -100;
        else changePercent = Math.round(((data.hours - prevHours) / prevHours) * 100);
        return { name, changePercent, currentHours: parseFloat(data.hours.toFixed(1)), prevHours: parseFloat(prevHours.toFixed(1)), color: data.color };
    }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

    const history    = [];
    let workDaysCount = 0;
    for (let i = 0; i < daysDiff; i++) {
        const d      = new Date(startCurrent);
        d.setDate(d.getDate() + i);
        const dayKey = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        const dayData: any = { name: dayKey, total: 0 };
        const dayMap = historyMap.get(dayKey);
        if (dayMap) {
            workDaysCount++;
            dayMap.forEach((hrs, proj) => {
                dayData[proj]   = parseFloat(hrs.toFixed(1));
                dayData.total  += hrs;
            });
        }
        history.push(dayData);
    }

    const peakHours = peakMap.map((val, idx) => ({
        hour:  `${idx.toString().padStart(2, '0')}:00`,
        value: parseFloat(val.toFixed(1))
    }));

    const consistencyScore = Math.min(100, Math.round((workDaysCount / (daysDiff * 0.7)) * 100));

    // ── Fokus-Score ───────────────────────────────────────────────────────────
    const hourlyAppSets = new Array(24).fill(null).map(() => new Set<string>());
    logs.forEach(l => {
        const parts = l.exe_path?.split(/[/\\]/) || [];
        const exe   = parts[parts.length - 1]?.toLowerCase() || '';
        if (exe) hourlyAppSets[new Date(l.created_at).getHours()].add(exe);
    });
    const activeHours      = hourlyAppSets.filter(s => s.size > 0);
    const avgAppsPerHour   = activeHours.length > 0
        ? activeHours.reduce((sum, s) => sum + s.size, 0) / activeHours.length
        : 1;
    const focusScore = Math.max(0, Math.min(100, Math.round(100 - (avgAppsPerHour - 1) * 20)));

    // ── Streak-Berechnung ─────────────────────────────────────────────────────
    let streak        = 0;
    let longestStreak = 0;
    let currentRun    = 0;

    if (allWorkDays.length > 0) {
        const today     = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const sorted    = allWorkDays
            .map(r => r.work_date)
            .sort()
            .reverse();

        // Prüfe ob heute oder gestern gearbeitet wurde (Streak aktiv)
        const lastDay   = new Date(sorted[0] + 'T00:00:00');
        const diffDays  = Math.round((today.getTime() - lastDay.getTime()) / 86400000);
        if (diffDays <= 1) {
            streak    = 1;
            for (let i = 1; i < sorted.length; i++) {
                const prev = new Date(sorted[i] + 'T00:00:00');
                const curr = new Date(sorted[i - 1] + 'T00:00:00');
                const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
                if (diff === 1) { streak++; } else break;
            }
        }

        // Längster Streak
        currentRun = 1;
        for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i] + 'T00:00:00');
            const curr = new Date(sorted[i - 1] + 'T00:00:00');
            const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
            if (diff === 1) {
                currentRun++;
                if (currentRun > longestStreak) longestStreak = currentRun;
            } else {
                currentRun = 1;
            }
        }
        if (longestStreak === 0) longestStreak = streak;
    }

    // ── Arbeits-Muster ────────────────────────────────────────────────────────
    const morningHours  = peakMap.slice(5, 12).reduce((a, b) => a + b, 0);
    const afternoonHours = peakMap.slice(12, 18).reduce((a, b) => a + b, 0);
    const eveningHours  = peakMap.slice(18, 24).reduce((a, b) => a + b, 0);
    const nightHours    = peakMap.slice(0, 5).reduce((a, b) => a + b, 0);

    let workPattern: DashboardStats['workPattern'] = 'balanced';
    const total = morningHours + afternoonHours + eveningHours + nightHours || 1;
    if (nightHours / total > 0.3)                              workPattern = 'night';
    else if (morningHours / total > 0.5)                       workPattern = 'early';
    else if ((eveningHours + nightHours) / total > 0.4)        workPattern = 'late';

    // Peak-Label (2-Stunden-Fenster mit den meisten Aktivitäten)
    let peakMax    = 0;
    let peakIdx    = 9;
    for (let h = 0; h < 23; h++) {
        const val = peakMap[h] + peakMap[h + 1];
        if (val > peakMax) { peakMax = val; peakIdx = h; }
    }
    const peakHourLabel = `${peakIdx.toString().padStart(2, '0')}–${(peakIdx + 2).toString().padStart(2, '0')} Uhr`;

    // ── Heatmap (84 Tage) ─────────────────────────────────────────────────────
    const heatmapByDate = new Map(heatmapRows.map(r => [r.date, r.hours]));
    const dailyHeatmap: HeatmapDay[] = [];
    for (let i = 83; i >= 0; i--) {
        const d    = new Date(heatmapEnd);
        d.setDate(d.getDate() - i);
        const key  = d.toISOString().slice(0, 10);
        const hrs  = heatmapByDate.get(key) || 0;
        dailyHeatmap.push({ date: key, hours: parseFloat(hrs.toFixed(1)), intensity: intensityFor(hrs) });
    }

    // ── Tagestypen (aus aktueller Session-History) ────────────────────────────
    const dayTypes: DayTypes = { deepWork: 0, light: 0, mixed: 0, total: 0 };
    historyMap.forEach(dayMap => {
        const dayTotal = Array.from(dayMap.values()).reduce((a, b) => a + b, 0);
        dayTypes.total++;
        if (dayTotal >= 5)      dayTypes.deepWork++;
        else if (dayTotal < 2)  dayTypes.light++;
        else                    dayTypes.mixed++;
    });

    // ── Wochentag-Stats ───────────────────────────────────────────────────────
    const dowMap = new Map(dowRows.map(r => [r.weekday_num, r]));
    // Reihenfolge: Mo, Di, Mi, Do, Fr, Sa, So (1–6, 0)
    const dowOrder = [1, 2, 3, 4, 5, 6, 0];
    const dayOfWeekStats: DayOfWeekStat[] = dowOrder.map(n => {
        const row  = dowMap.get(String(n));
        const avgH = row && row.active_days > 0
            ? parseFloat((row.total_hours / row.active_days).toFixed(1))
            : 0;
        return { day: DAY_LABELS[n], avgHours: avgH, activeDays: row?.active_days || 0 };
    });

    return {
        totalHours:         parseFloat(totalCurrentHours.toFixed(2)),
        avgDaily:           parseFloat((totalCurrentHours / (workDaysCount || 1)).toFixed(1)),
        avgEntriesPerDay:   parseFloat((entriesCount / (workDaysCount || 1)).toFixed(1)),
        projectDistribution,
        programUsage,
        trends,
        history,
        peakHours,
        periodLabel:        `${startCurrent.toLocaleDateString()} – ${endCurrent.toLocaleDateString()}`,
        consistencyScore,
        dayOfWeekStats,
        focusScore,
        streak,
        longestStreak,
        workPattern,
        peakHourLabel,
        dailyHeatmap,
        dayTypes,
        totalWorkDays:      allWorkDays.length,
    };
}
