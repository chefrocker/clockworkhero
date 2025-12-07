import Database from '@tauri-apps/plugin-sql';
import * as XLSX from 'xlsx';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { DashboardStats } from './analyticsService';

// Helper: Pfad zur DB finden
async function getDbPath(): Promise<string> {
    const appData = await appDataDir();
    return await join(appData, 'tracker.db');
}

// Helper: Uint8Array erstellen und speichern
async function saveWorkbook(wb: XLSX.WorkBook, defaultName: string) {
    try {
        const path = await save({
            defaultPath: defaultName,
            filters: [{ name: 'Excel Arbeitsmappe', extensions: ['xlsx'] }]
        });

        if (!path) return;

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        await writeFile(path, new Uint8Array(wbout));
        alert('Export erfolgreich gespeichert!');

    } catch (e) {
        console.error('[Export] Fehler:', e);
        alert('Fehler beim Speichern: ' + e);
    }
}

// --- EXPORT 1: SESSIONS ---
export async function exportSessionsToExcel(db: Database): Promise<void> {
  console.log('[Export] Starte Session Export...');
  const sessions = await db.select<any[]>(`
    SELECT w.id, p.name as project, w.description, w.start_time, w.end_time 
    FROM work_sessions w 
    LEFT JOIN projects p ON w.project_id = p.id
    ORDER BY w.start_time DESC
  `);

  const data = sessions.map(s => {
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
    return {
        "ID": s.id,
        "Projekt": s.project || "Ohne Projekt",
        "Beschreibung": s.description || "",
        "Datum": start.toLocaleDateString(),
        "Start": start.toLocaleTimeString(),
        "Ende": end.toLocaleTimeString(),
        "Minuten": durationMin,
        "Stunden": parseFloat((durationMin / 60).toFixed(2))
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{wch: 5}, {wch: 20}, {wch: 40}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}];
  XLSX.utils.book_append_sheet(wb, ws, "Alle Zeiten");
  await saveWorkbook(wb, `ClockworkHero_Sessions_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// --- EXPORT 2: DASHBOARD ---
export async function exportDashboardAnalysis(stats: DashboardStats): Promise<void> {
    const wb = XLSX.utils.book_new();

    const summaryData = [
        ["Analyse Zeitraum", stats.periodLabel],
        ["Gesamtstunden", stats.totalHours],
        ["Ø Stunden / Tag", stats.avgDaily],
        [],
        ["PROJEKT VERTEILUNG"],
        ["Projekt", "Stunden", "Anteil %"]
    ];
    stats.projectDistribution.forEach(p => {
        summaryData.push([p.name, p.value, p.percentage + '%']);
    });
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Übersicht");

    const trendData = stats.trends.map(t => ({
        "Projekt": t.name,
        "Aktuell (Std)": t.currentHours,
        "Vorher (Std)": t.prevHours,
        "Veränderung": t.changePercent + '%'
    }));
    const wsTrends = XLSX.utils.json_to_sheet(trendData);
    XLSX.utils.book_append_sheet(wb, wsTrends, "Trends");

    const historyData = stats.history.map(h => ({ "Datum": h.name, "Stunden": h.hours }));
    const wsHistory = XLSX.utils.json_to_sheet(historyData);
    XLSX.utils.book_append_sheet(wb, wsHistory, "Verlauf");

    await saveWorkbook(wb, `ClockworkHero_Analyse_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// --- EXPORT 3: RAW LOGS ---
export async function exportAllLogsToExcel(db: Database): Promise<void> {
    console.log('[Export] Starte Log Export...');
    try {
        // Wir holen die Daten in Chunks oder mit Limit, um Speicherüberlauf zu vermeiden
        const logs = await db.select<any[]>(`SELECT * FROM logs ORDER BY created_at DESC LIMIT 100000`);
        
        if (!logs || logs.length === 0) {
            alert("Keine Logs gefunden.");
            return;
        }

        console.log(`[Export] ${logs.length} Logs gefunden. Erstelle Excel...`);

        const data = logs.map(l => ({
            "ID": l.id,
            "Zeitstempel": l.created_at,
            "Fenstertitel": l.title,
            "Pfad": l.exe_path
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{wch: 8}, {wch: 20}, {wch: 50}, {wch: 50}];
        XLSX.utils.book_append_sheet(wb, ws, "Activity Logs");

        await saveWorkbook(wb, `ClockworkHero_Full_Logs_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) {
        console.error("Log Export Fehler:", e);
        alert("Fehler beim Log Export: " + e);
    }
}

// --- BACKUP ---
export async function backupDatabase(): Promise<void> {
    try {
        const dbPath = await getDbPath();
        const targetPath = await save({
            defaultPath: `tracker_backup_${new Date().toISOString().slice(0,10)}.db`,
            filters: [{ name: 'SQLite Datenbank', extensions: ['db'] }]
        });

        if (!targetPath) return;

        const dbData = await readFile(dbPath);
        await writeFile(targetPath, dbData);
        
        alert('Backup erfolgreich erstellt!');
    } catch (e) {
        console.error('Backup Fehler:', e);
        alert('Backup fehlgeschlagen: ' + e);
    }
}

// --- RESTORE ---
export async function restoreDatabase(): Promise<void> {
    try {
        const sourcePath = await open({
            multiple: false,
            filters: [{ name: 'SQLite Datenbank', extensions: ['db'] }]
        });

        if (!sourcePath) return;

        if (window.confirm("ACHTUNG: Die aktuelle Datenbank wird überschrieben! Die App wird danach neu gestartet. Fortfahren?")) {
            const dbPath = await getDbPath();
            const backupData = await readFile(sourcePath as string);
            await writeFile(dbPath, backupData);
            
            alert('Datenbank wiederhergestellt. App wird neu geladen.');
            window.location.reload();
        }
    } catch (e) {
        console.error('Restore Fehler:', e);
        alert('Wiederherstellung fehlgeschlagen: ' + e);
    }
}
