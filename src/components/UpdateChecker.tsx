import React, { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { FaDownload, FaTimes, FaSync } from 'react-icons/fa';

type UpdateState =
    | { phase: 'idle' }
    | { phase: 'available'; version: string; body: string | null | undefined; update: any }
    | { phase: 'downloading'; progress: number }
    | { phase: 'ready' }
    | { phase: 'error'; message: string };

// Kann auch von außen aufgerufen werden (z.B. aus den Einstellungen)
export async function triggerUpdateCheck(): Promise<{ available: boolean; version?: string }> {
    try {
        const update = await check();
        if (update?.available) return { available: true, version: update.version };
        return { available: false };
    } catch {
        return { available: false };
    }
}

interface Props {
    // Wenn true, prüft die Komponente einmalig beim Mount (Startup-Check)
    checkOnMount?: boolean;
}

export const UpdateChecker: React.FC<Props> = ({ checkOnMount = true }) => {
    const [state, setState] = useState<UpdateState>({ phase: 'idle' });
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!checkOnMount) return;
        // Beim Start prüfen (mit 3s Verzögerung damit App vollständig geladen ist)
        const timer = setTimeout(async () => {
            await checkForUpdate();
        }, 3000);
        return () => clearTimeout(timer);
    }, [checkOnMount]);

    const checkForUpdate = async () => {
        try {
            const update = await check();
            if (update?.available) {
                setDismissed(false);
                setState({
                    phase: 'available',
                    version: update.version,
                    body: update.body,
                    update,
                });
            } else {
                // Kein Update verfügbar – bleibt idle (keine Anzeige)
                console.debug('UpdateChecker: Kein Update verfügbar.');
            }
        } catch (e) {
            // Kein Netzwerk, Server nicht erreichbar, oder Signatur-Problem
            // Nur in der Dev-Console loggen, kein Toast für den Nutzer
            console.debug('Update-Check fehlgeschlagen:', e);
        }
    };

    const startUpdate = async () => {
        if (state.phase !== 'available') return;
        const { update } = state;

        setState({ phase: 'downloading', progress: 0 });

        try {
            let downloaded = 0;
            let total = 0;

            await update.downloadAndInstall((event: any) => {
                switch (event.event) {
                    case 'Started':
                        total = event.data.contentLength ?? 0;
                        break;
                    case 'Progress':
                        downloaded += event.data.chunkLength ?? 0;
                        if (total > 0) {
                            setState({ phase: 'downloading', progress: Math.round((downloaded / total) * 100) });
                        }
                        break;
                    case 'Finished':
                        setState({ phase: 'ready' });
                        break;
                }
            });
        } catch (e: any) {
            setState({ phase: 'error', message: e?.message ?? String(e) });
        }
    };

    const restart = async () => {
        await relaunch();
    };

    // Nichts anzeigen wenn dismissed oder kein Update
    if (dismissed || state.phase === 'idle') return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '340px',
            background: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            padding: '18px 20px',
            zIndex: 2000,
            animation: 'slideUp 0.3s ease',
        }}>
            {/* ── Update verfügbar ─────────────────────────────────── */}
            {state.phase === 'available' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-color)', marginBottom: '4px' }}>
                                Update verfügbar
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                Version {state.version} ist bereit.
                            </div>
                        </div>
                        <button
                            onClick={() => setDismissed(true)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
                        >
                            <FaTimes size={14} />
                        </button>
                    </div>

                    {state.body && (
                        <div style={{
                            margin: '12px 0',
                            padding: '10px',
                            background: 'var(--panel-bg)',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            maxHeight: '100px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.5,
                        }}>
                            {state.body}
                        </div>
                    )}

                    <button
                        onClick={startUpdate}
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            padding: '9px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                    >
                        <FaDownload size={12} /> Jetzt installieren
                    </button>
                </>
            )}

            {/* ── Download läuft ──────────────────────────────────── */}
            {state.phase === 'downloading' && (
                <>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-color)', marginBottom: '10px' }}>
                        Update wird geladen…
                    </div>
                    <div style={{ height: '6px', background: 'var(--panel-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${state.progress}%`,
                            background: '#3b82f6',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                        }} />
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        {state.progress}%
                    </div>
                </>
            )}

            {/* ── Bereit zum Neustart ──────────────────────────────── */}
            {state.phase === 'ready' && (
                <>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-color)', marginBottom: '6px' }}>
                        Update installiert ✓
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        ClockworkHero wird neu gestartet.
                    </div>
                    <button
                        onClick={restart}
                        style={{
                            width: '100%',
                            padding: '9px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                    >
                        <FaSync size={12} /> Neu starten
                    </button>
                </>
            )}

            {/* ── Fehler ──────────────────────────────────────────── */}
            {state.phase === 'error' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ef4444' }}>Update fehlgeschlagen</div>
                        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <FaTimes size={14} />
                        </button>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        {state.message}
                    </div>
                </>
            )}

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};
