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
    updated[dayIndex] = { 
        ...updated[dayIndex], 
        blocks: [...updated[dayIndex].blocks] 
    };
    
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
    updated[dayIndex] = { 
        ...updated[dayIndex], 
        blocks: updated[dayIndex].blocks.filter(b => b.id !== blockId) 
    };
    updated[dayIndex] = calculateDayHours(updated[dayIndex]);
    onChange(updated);
  };

  const updateBlock = (dayIndex: number, blockId: string, field: 'start' | 'end', value: string) => {
    const updated = [...weekSchedule];
    updated[dayIndex] = { 
        ...updated[dayIndex], 
        blocks: [...updated[dayIndex].blocks] 
    };
    
    const blockIndex = updated[dayIndex].blocks.findIndex(b => b.id === blockId);
    if (blockIndex !== -1) {
      updated[dayIndex].blocks[blockIndex] = { 
          ...updated[dayIndex].blocks[blockIndex], 
          [field]: value 
      };
      updated[dayIndex] = calculateDayHours(updated[dayIndex]);
      onChange(updated);
    }
  };

  const toggleWorkday = (dayIndex: number) => {
    const updated = [...weekSchedule];
    updated[dayIndex] = { ...updated[dayIndex], isWorkday: !updated[dayIndex].isWorkday };
    
    if (!updated[dayIndex].isWorkday) {
      updated[dayIndex].totalHours = 0;
    } else if (updated[dayIndex].blocks.length === 0) {
      updated[dayIndex].blocks = [{
        id: `block-${Date.now()}`,
        start: "08:00",
        end: "17:00"
      }];
      updated[dayIndex] = calculateDayHours(updated[dayIndex]);
    } else {
        updated[dayIndex] = calculateDayHours(updated[dayIndex]);
    }
    onChange(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 className="settings-h3" style={{ margin: 0 }}>Wochenplan</h3>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Gesamt: <strong>{weekSchedule.reduce((sum, d) => sum + (d.isWorkday ? d.totalHours : 0), 0).toFixed(1)}h</strong> / Woche
        </div>
      </div>

      {weekSchedule.map((day, dayIdx) => (
        <DayCard
          key={day.dayName}
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

function calculateDayHours(day: DaySchedule): DaySchedule {
  if (!day.blocks || day.blocks.length === 0) {
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
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '15px',
      background: day.isWorkday ? 'var(--panel-bg)' : 'var(--bg-color)',
      opacity: day.isWorkday ? 1 : 0.7,
      transition: 'all 0.2s'
    }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: day.isWorkday ? '15px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={day.isWorkday}
              onChange={() => onToggleWorkday(dayIndex)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: day.isWorkday ? 'var(--text-color)' : 'var(--text-secondary)' }}>{day.dayName}</span>
          </label>
          
          {day.isWorkday && (
            <span style={{
              background: '#dbeafe',
              color: '#1e40af',
              padding: '2px 10px',
              borderRadius: '10px',
              fontSize: '0.8rem',
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
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
          >
            <FaPlus size={10} /> Block
          </button>
        )}
      </div>

      {day.isWorkday && day.blocks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {day.blocks.map(block => (
            <div key={block.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--bg-color)',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <FaClock color="var(--text-secondary)" size={14} />
              <input
                type="time"
                className="input-time"
                value={block.start}
                onChange={(e) => onUpdateBlock(dayIndex, block.id, 'start', e.target.value)}
                style={{ width: '100px', height: '32px', padding: '4px 8px' }}
              />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>—</span>
              <input
                type="time"
                className="input-time"
                value={block.end}
                onChange={(e) => onUpdateBlock(dayIndex, block.id, 'end', e.target.value)}
                style={{ width: '100px', height: '32px', padding: '4px 8px' }}
              />
              
              <button
                onClick={() => onRemoveBlock(dayIndex, block.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '5px',
                  marginLeft: 'auto',
                  display: 'flex', alignItems: 'center'
                }}
                title="Block entfernen"
              >
                <FaTrash size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
