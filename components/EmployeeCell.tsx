import React from 'react';
import { ShiftType, Employee } from '../types';
import { WEEKEND_CELL_OVERLAY } from '../constants';

interface EmployeeCellProps {
  shiftType: ShiftType;
  employees: Employee[];
  color: string;
  isWeekend: boolean;
  onClick: () => void;
  label?: string;
}

const EmployeeCell: React.FC<EmployeeCellProps> = ({ 
  employees, 
  color, 
  isWeekend, 
  onClick,
  label 
}) => {
  return (
    <div 
      onClick={onClick}
      style={{ backgroundColor: color }}
      className={`relative w-full h-full border-r border-b border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:brightness-95 transition-all group overflow-hidden`}
    >
      {isWeekend && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ backgroundColor: WEEKEND_CELL_OVERLAY }}
        />
      )}
      
      {label && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black/15 uppercase tracking-[0.2em] pointer-events-none text-center px-1">
          {label}
        </span>
      )}

      <div 
        className="relative z-10 flex flex-wrap gap-1 justify-center content-center items-center p-1.5 w-full h-full max-h-full overflow-hidden"
        style={{ maxWidth: isWeekend ? '110px' : '265px' }}
      >
        {employees.map((emp) => (
          <div 
            key={emp.id} 
            className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm bg-white relative shrink-0"
          >
            <img 
              src={emp.avatarUrl} 
              className="absolute max-w-none left-0 top-0 block pointer-events-none" 
              style={{ 
                width: 'auto',
                transform: `translate(${(emp.position?.x || 0) * (48/256)}px, ${(emp.position?.y || 0) * (48/256)}px) scale(${(emp.scale || 1) * (48/256)})`,
                transformOrigin: '0 0'
              }}
            />
          </div>
        ))}
      </div>
      
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/10 flex items-center justify-center transition-opacity pointer-events-none">
        <div className="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center border border-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCell;