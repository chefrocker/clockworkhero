import React, { useEffect, useState, useCallback } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

// ─── Typen ───────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id:       number;
    type:     ToastType;
    title:    string;
    message?: string;
    duration: number; // ms, 0 = persistent
}

// ─── Globaler Event-Bus (kein Context nötig) ─────────────────────────────────
type ToastListener = (toast: ToastMessage) => void;
const listeners = new Set<ToastListener>();
let nextId = 1;

export const toast = {
    success: (title: string, message?: string, duration = 3000) =>
        emit({ type: 'success', title, message, duration }),
    error:   (title: string, message?: string, duration = 6000) =>
        emit({ type: 'error',   title, message, duration }),
    warning: (title: string, message?: string, duration = 4500) =>
        emit({ type: 'warning', title, message, duration }),
    info:    (title: string, message?: string, duration = 3500) =>
        emit({ type: 'info',    title, message, duration }),
};

function emit(t: Omit<ToastMessage, 'id'>) {
    const msg: ToastMessage = { ...t, id: nextId++ };
    listeners.forEach(l => l(msg));
}

// ─── Einzelner Toast ─────────────────────────────────────────────────────────
const ICONS: Record<ToastType, React.ReactNode> = {
    success: <FaCheckCircle />,
    error:   <FaExclamationCircle />,
    warning: <FaExclamationTriangle />,
    info:    <FaInfoCircle />,
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a' },
    error:   { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626' },
    warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb' },
};

const DARK_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: '#14532d', border: '#166534', icon: '#4ade80' },
    error:   { bg: '#450a0a', border: '#7f1d1d', icon: '#f87171' },
    warning: { bg: '#451a03', border: '#78350f', icon: '#fbbf24' },
    info:    { bg: '#172554', border: '#1e3a8a', icon: '#60a5fa' },
};

const ToastItem: React.FC<{ t: ToastMessage; onRemove: (id: number) => void }> = ({ t, onRemove }) => {
    const [visible, setVisible] = useState(false);
    const isDark = document.body.classList.contains('dark-mode');
    const c = isDark ? DARK_COLORS[t.type] : COLORS[t.type];

    useEffect(() => {
        // Einblenden
        requestAnimationFrame(() => setVisible(true));
        if (t.duration > 0) {
            const timer = setTimeout(() => handleClose(), t.duration);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(() => onRemove(t.id), 280);
    };

    return (
        <div
            style={{
                display:       'flex',
                alignItems:    'flex-start',
                gap:           '10px',
                padding:       '12px 14px',
                background:    c.bg,
                border:        `1px solid ${c.border}`,
                borderRadius:  '10px',
                boxShadow:     '0 4px 16px rgba(0,0,0,0.12)',
                minWidth:      '280px',
                maxWidth:      '360px',
                transform:     visible ? 'translateX(0)' : 'translateX(110%)',
                opacity:       visible ? 1 : 0,
                transition:    'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
                pointerEvents: 'auto',
            }}
        >
            <span style={{ color: c.icon, fontSize: '1rem', marginTop: '1px', flexShrink: 0 }}>
                {ICONS[t.type]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isDark ? '#f1f5f9' : '#1e293b' }}>
                    {t.title}
                </div>
                {t.message && (
                    <div style={{ fontSize: '0.80rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                        {t.message}
                    </div>
                )}
            </div>
            <button
                onClick={handleClose}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: isDark ? '#94a3b8' : '#94a3b8', padding: '0', flexShrink: 0,
                    fontSize: '0.75rem', marginTop: '1px',
                }}
            >
                <FaTimes />
            </button>
        </div>
    );
};

// ─── Container ───────────────────────────────────────────────────────────────
export const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((t: ToastMessage) => {
        setToasts(prev => [...prev, t]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        listeners.add(addToast);
        return () => { listeners.delete(addToast); };
    }, [addToast]);

    return (
        <div style={{
            position:      'fixed',
            bottom:        '24px',
            right:         '24px',
            display:       'flex',
            flexDirection: 'column',
            gap:           '8px',
            zIndex:        3000,
            pointerEvents: 'none',
        }}>
            {toasts.map(t => (
                <ToastItem key={t.id} t={t} onRemove={removeToast} />
            ))}
        </div>
    );
};
