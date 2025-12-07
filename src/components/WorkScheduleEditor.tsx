import React from 'react';
import { FaPlus, FaTrash, FaClock } from 'react-icons/fa';
import { DaySchedule, WorkTimeBlock } from '../types';

interface Props {
  weekSchedule: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
}

export const WorkScheduleEditor: React.FC<Props> = ({ weekSchedule, onChange }) => {
  
  const addBlock = (dayIndex: number) => {
    const updated = [...weekSchedule];
    // Kopie erstellen um Mutation zu vermeiden
    updated[dayIndex] = { ...updated[dayIndex], blocks: [...updated[dayIndex].blocks] };
    
    const newBlock: WorkTimeBlock = {
      id: `block-${Date.now()}`,
      start: "13:00",
      end: "17:00"
    };
    updated[dayIndex].blocks.push(newBlock);
    updated[dayIndex] = calculateDayHours(updated[dayIndex]);
    onChange(updated);
  };

  const removeBlock = (dayIndex: number, blockId: string) => {
    const updated = [...weekSchedule];
    updated[dayIndex] = { ...updated[dayIndex], blocks: updated[dayIndex].blocks.filter(b => b.id !== blockId) };
    updated[dayIndex] = calculateDayHours(updated[dayIndex]);
    onChange(updated);
  };

  const updateBlock = (dayIndex: number, blockId: string, field: 'start' | 'end', value: string) => {
    const updated = [...weekSchedule];
    updated[dayIndex] = { ...updated[dayIndex], blocks: [...updated[dayIndex].blocks] };
    
    const blockIndex = updated[dayIndex].blocks.findIndex(b => b.id === blockId);
    if (blockIndex !== -1) {
      updated[dayIndex].blocks[blockIndex] = { ...updated[dayIndex].blocks[blockIndex], [field]: value };
      updated[dayIndex] = calculateDayHours(updated[dayIndex]);
      onChange(updated);
    }
  };

  const toggleWorkday = (dayIndex: number) => {
    const updated = [...weekSchedule];
    updated[dayIndex] = { ...updated[dayIndex], isWorkday: !updated[dayIndex].isWorkday };
    
    if (!updated[dayIndex].isWorkday) {
      updated[dayIndex].blocks = [];
      updated[dayIndex].totalHours = 0;
    } else if (updated[dayIndex].blocks.length === 0) {
      updated[dayIndex].blocks = [{
        id: `block-${Date.now()}`,
        start: "08:00",
        end: "17:00"
      }];
      updated[dayIndex] = calculateDayHours(updated[dayIndex]);
    }
    onChange(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 className="settings-h3" style={{ margin: 0 }}>Wochenplan</h3>
        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Gesamt: <strong>{weekSchedule.reduce((sum, d) => sum + (d.totalHours || 0), 0).toFixed(1)}h</strong> / Woche
        </div>
      </div>

      {weekSchedule.map((day, dayIdx) => (
        <DayCard
          key={day.dayName} // dayShort ist sicherer, aber dayName geht auch
          day={day}
          dayIndex={dayIdx}
          onToggleWorkday={toggleWorkday}
          onAddBlock={addBlock}
          onRemoveBlock={removeBlock}
          onUpdateBlock={updateBlock}
        />
      ))}
    </div>
  );
};

// --- HELPER: Stunden berechnen ---
function calculateDayHours(day: DaySchedule): DaySchedule {
  if (!day.isWorkday || day.blocks.length === 0) {
    return { ...day, totalHours: 0 };
  }
  
  let totalMinutes = 0;
  day.blocks.forEach(block => {
    const [startH, startM] = block.start.split(':').map(Number);
    const [endH, endM] = block.end.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    totalMinutes += Math.max(0, endMins - startMins);
  });
  
  return { ...day, totalHours: parseFloat((totalMinutes / 60).toFixed(2)) };
}

// --- SUB-COMPONENT: Tag-Karte ---
interface DayCardProps {
  day: DaySchedule;
  dayIndex: number;
  onToggleWorkday: (idx: number) => void;
  onAddBlock: (idx: number) => void;
  onRemoveBlock: (idx: number, blockId: string) => void;
  onUpdateBlock: (idx: number, blockId: string, field: 'start' | 'end', value: string) => void;
}

const DayCard: React.FC<DayCardProps> = ({ day, dayIndex, onToggleWorkday, onAddBlock, onRemoveBlock, onUpdateBlock }) => {
  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '20px',
      background: day.isWorkday ? 'white' : '#f8fafc',
      opacity: day.isWorkday ? 1 : 0.8,
      transition: 'all 0.2s'
    }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: day.isWorkday ? '15px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={day.isWorkday}
              onChange={() => onToggleWorkday(dayIndex)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: day.isWorkday ? '#1e293b' : '#94a3b8' }}>{day.dayName}</span>
          </label>
          
          {day.isWorkday && (
            <span style={{
              background: '#dbeafe',
              color: '#1e40af',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              {(day.totalHours || 0).toFixed(1)}h
            </span>
          )}
        </div>

        {day.isWorkday && (
          <button
            className="btn-secondary"
            onClick={() => onAddBlock(dayIndex)}
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          >
            <FaPlus /> Block
          </button>
        )}
      </div>

      {/* Zeitblöcke */}
      {day.isWorkday && day.blocks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {day.blocks.map(block => (
            <div key={block.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f1f5f9',
              padding: '12px',
              borderRadius: '8px'
            }}>
              <FaClock color="#64748b" />
              <input
                type="time"
                className="input-time"
                value={block.start}
                onChange={(e) => onUpdateBlock(dayIndex, block.id, 'start', e.target.value)}
                style={{ width: '110px' }}
              />
              <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>—</span>
              <input
                type="time"
                className="input-time"
                value={block.end}
                onChange={(e) => onUpdateBlock(dayIndex, block.id, 'end', e.target.value)}
                style={{ width: '110px' }}
              />
              
              {day.blocks.length > 1 && (
                <button
                  onClick={() => onRemoveBlock(dayIndex, block.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '8px',
                    marginLeft: 'auto'
                  }}
                  title="Block entfernen"
                >
                  <FaTrash />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
