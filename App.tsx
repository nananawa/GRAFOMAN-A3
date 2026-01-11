import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  parseISO, 
  addWeeks, 
  isBefore, 
  startOfDay,
  differenceInDays,
  isValid
} from 'date-fns';
import { ru } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ShiftType, Employee, ScheduleData } from './types';
import { SHIFTS, WEEK_DAYS, HEADER_COLORS, WEEKEND_CELL_BG } from './constants';
import EmployeeCell from './components/EmployeeCell';
import AvatarEditor from './components/AvatarEditor';

const App: React.FC = () => {
  const initialStartDate = format(new Date(), 'yyyy-MM-dd');
  const initialEndDate = format(addDays(new Date(), 13), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState<string>(() => localStorage.getItem('shift_designer_start_date') || initialStartDate);
  const [endDate, setEndDate] = useState<string>(() => localStorage.getItem('shift_designer_end_date') || initialEndDate);
  
  const [currentPage, setCurrentPage] = useState<number>(0);
  
  // График всегда пустой при загрузке (по требованию "без аватарок")
  const [schedule, setSchedule] = useState<ScheduleData>({});
  
  // База (библиотека) сотрудников теперь загружается из localStorage
  const [savedEmployees, setSavedEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('shift_designer_employee_bank');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [editingCell, setEditingCell] = useState<{ date: string; shift: ShiftType } | null>(null);
  const [showAvatarEditor, setShowAvatarEditor] = useState<boolean>(false);
  const [pdfStatus, setPdfStatus] = useState<{ active: boolean; progress: number; text: string }>({ active: false, progress: 0, text: '' });

  const captureRef = useRef<HTMLDivElement>(null);
  const lastWheelTime = useRef<number>(0);

  // Сохраняем даты и библиотеку сотрудников
  useEffect(() => {
    try {
      localStorage.setItem('shift_designer_start_date', startDate);
      localStorage.setItem('shift_designer_end_date', endDate);
      localStorage.setItem('shift_designer_employee_bank', JSON.stringify(savedEmployees));
    } catch (e) {
      console.warn('LocalStorage quota exceeded or unavailable:', e);
    }
  }, [startDate, endDate, savedEmployees]);

  const startObj = useMemo(() => {
    const d = parseISO(startDate);
    return isValid(d) ? d : new Date();
  }, [startDate]);

  const endObj = useMemo(() => {
    const d = parseISO(endDate);
    return isValid(d) ? d : addDays(startObj, 13);
  }, [endDate, startObj]);

  const totalSheets = useMemo(() => {
    const diff = differenceInDays(endObj, startObj) + 1;
    return Math.max(1, Math.ceil(diff / 14));
  }, [startObj, endObj]);

  const getCellEmployees = (date: string, shift: ShiftType): Employee[] => schedule[`${date}_${shift}`] || [];

  const removeEmployeeFromBank = (id: string) => {
    setSavedEmployees(prev => prev.filter(emp => emp.id !== id));
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 400) return;
    if (Math.abs(e.deltaY) < 10) return;

    if (e.deltaY > 0) {
      if (currentPage < totalSheets - 1) {
        setCurrentPage(p => p + 1);
        lastWheelTime.current = now;
      }
    } else {
      if (currentPage > 0) {
        setCurrentPage(p => p - 1);
        lastWheelTime.current = now;
      }
    }
  }, [currentPage, totalSheets]);

  const handleExportPDF = async () => {
    setPdfStatus({ active: true, progress: 0, text: 'Подготовка экспорта...' });
    await document.fonts.ready;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3',
      compress: true
    });

    const originalPage = currentPage;
    const pagesToExport = Array.from({ length: totalSheets }).map((_, i) => i);

    for (let i = 0; i < pagesToExport.length; i++) {
      const pageIdx = pagesToExport[i];
      setPdfStatus({ 
        active: true, 
        progress: Math.round((i / pagesToExport.length) * 100), 
        text: `Обработка страницы ${i + 1} из ${pagesToExport.length}...` 
      });

      setCurrentPage(pageIdx); 
      await new Promise(r => setTimeout(r, 600)); 

      if (captureRef.current) {
        const canvas = await html2canvas(captureRef.current, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) doc.addPage('a3', 'landscape');
        doc.addImage(imgData, 'JPEG', 0, 0, 420, 297, undefined, 'FAST');
      }
    }

    setCurrentPage(originalPage);
    setPdfStatus({ active: true, progress: 100, text: 'Скачивание...' });
    doc.save(`График_A3_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    
    setTimeout(() => setPdfStatus({ active: false, progress: 0, text: '' }), 1000);
  };

  const renderSheet = (sheetIndex: number, isCapture: boolean = false) => {
    const firstMonday = startOfWeek(startObj, { weekStartsOn: 1 });
    const sheetStartMonday = addWeeks(firstMonday, sheetIndex * 2);
    const weeks = [0, 1]; 

    return (
      <div 
        className={`bg-white w-[1587px] h-[1123px] flex flex-col relative ${isCapture ? 'p-10' : 'p-10 shadow-2xl border border-slate-300'}`}
        style={{ boxSizing: 'border-box' }}
      >
        <div className="flex-1 flex flex-col gap-4">
          {weeks.map((weekIdx) => {
            const weekStart = addWeeks(sheetStartMonday, weekIdx);
            return (
              <div key={weekIdx} className="flex-1 flex flex-col border-t border-l border-slate-300 shadow-sm overflow-hidden">
                <div className="flex h-[80px] shrink-0">
                  <div className="w-28 shrink-0 bg-slate-50 border-b border-r border-slate-300" /> 
                  {Array.from({ length: 7 }).map((_, i) => {
                    const day = addDays(weekStart, i);
                    const isWknd = i >= 5;
                    const bgColor = isWknd ? HEADER_COLORS.weekend : HEADER_COLORS.weekday;
                    const isOutsideRange = isBefore(startOfDay(day), startOfDay(startObj)) || isBefore(startOfDay(endObj), startOfDay(day));
                    
                    return (
                      <div 
                        key={i} 
                        style={{ backgroundColor: isOutsideRange ? '#f1f5f9' : bgColor }}
                        className={`border-r border-b border-slate-300 text-white flex flex-col items-center justify-center h-full overflow-hidden ${isWknd ? 'flex-[0.45]' : 'flex-1'}`}
                      >
                        <div className="flex flex-col items-center justify-center leading-tight">
                          <span className={`text-[9px] uppercase font-bold tracking-[0.2em] mb-0.5 ${isOutsideRange ? 'text-slate-400' : 'opacity-70'}`}>
                            {WEEK_DAYS[i]}
                          </span>
                          {!isOutsideRange && (
                            <span className="text-2xl font-[800]">
                              {format(day, 'dd.MM')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex-1 flex flex-col">
                  {SHIFTS.map((shift) => (
                    <div key={shift.type} className="flex flex-1 min-h-0">
                      <div className="w-28 shrink-0 flex flex-col items-center justify-center border-b border-r border-slate-300 text-center bg-slate-50 relative px-1">
                        {shift.icon ? <span className="text-3xl">{shift.icon}</span> : (
                          <>
                            <span className={`${shift.label === 'выходной' ? 'text-[9px]' : 'text-xl'} font-bold text-slate-800 uppercase`}>{shift.label}</span>
                            {shift.timeRange && <pre className="text-[9px] text-slate-600 font-bold leading-tight mt-1 uppercase font-sans">{shift.timeRange}</pre>}
                          </>
                        )}
                      </div>

                      {Array.from({ length: 7 }).map((_, i) => {
                        const day = addDays(weekStart, i);
                        const isWknd = i >= 5;
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const isOutsideRange = isBefore(startOfDay(day), startOfDay(startObj)) || isBefore(startOfDay(endObj), startOfDay(day));
                        
                        if (isOutsideRange) return <div key={i} className={`${isWknd ? 'flex-[0.45]' : 'flex-1'} bg-slate-100 border-r border-b border-slate-300`} />;

                        const emps = getCellEmployees(dateKey, shift.type);
                        const cellColor = isWknd ? WEEKEND_CELL_BG : shift.color;
                        
                        let label = undefined;
                        if (emps.length === 0) {
                          if (shift.type === ShiftType.HOLIDAY || isWknd) {
                            label = 'выходной';
                          }
                        }

                        return (
                          <div key={i} className={`${isWknd ? 'flex-[0.45]' : 'flex-1'} min-h-0`}>
                            <EmployeeCell
                              shiftType={shift.type}
                              employees={emps}
                              color={cellColor}
                              isWeekend={isWknd}
                              onClick={() => setEditingCell({ date: dateKey, shift: shift.type })}
                              label={label}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-4 left-10 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
           График работы с {format(startObj, 'dd.MM.yyyy')} по {format(endObj, 'dd.MM.yyyy')} / Лист {sheetIndex + 1}
        </div>
      </div>
    );
  };

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const workspaceScale = Math.min((windowSize.width - 100) / 1587, (windowSize.height - 180) / 1123);

  return (
    <div className="h-screen bg-slate-200 font-sans overflow-hidden flex flex-col no-print">
      {/* Header */}
      <div className="bg-slate-900 text-white flex-none px-8 py-3 flex items-center justify-between shadow-2xl z-50">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold uppercase tracking-tighter leading-tight">ГРАФОМАН <span className="text-red-500">A3</span></h1>
            <p className="text-[8px] font-bold uppercase text-slate-500 tracking-[0.4em] mt-0.5">Professional Schedule Designer</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <div className="flex flex-col">
              <span className="text-[7px] uppercase font-bold text-slate-500 mb-0.5">Начало</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[11px] font-bold focus:outline-none focus:text-red-400 transition-colors" />
            </div>
            <span className="text-slate-700 font-bold">/</span>
            <div className="flex flex-col">
              <span className="text-[7px] uppercase font-bold text-slate-500 mb-0.5">Конец</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[11px] font-bold focus:outline-none focus:text-red-400 transition-colors" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="disabled:opacity-10 hover:text-red-400 transition-all active:scale-90"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
            <div className="flex flex-col items-center"><span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Лист</span><span className="text-sm font-bold">{currentPage + 1} <span className="opacity-20 mx-1">/</span> {totalSheets}</span></div>
            <button onClick={() => setCurrentPage(p => Math.min(totalSheets - 1, p + 1))} disabled={currentPage === totalSheets - 1} className="disabled:opacity-10 hover:text-red-400 transition-all active:scale-90"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
          </div>
          <button onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-xl font-bold uppercase text-[11px] tracking-[0.1em] transition-all shadow-xl shadow-red-950/20 active:scale-95 flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Экспорт PDF (A3)
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div 
        className="flex-1 bg-slate-200 flex items-center justify-center overflow-hidden cursor-default"
        onWheel={handleWheel}
      >
        <div className="origin-center transition-transform duration-500 ease-out" style={{ transform: `scale(${workspaceScale})` }}>
          {renderSheet(currentPage)}
        </div>
      </div>

      {/* Hidden Capture Area */}
      <div className="capture-container" ref={captureRef}>
        {renderSheet(currentPage, true)}
      </div>

      {/* Progress HUD */}
      {pdfStatus.active && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-lg" />
          <div className="relative bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center space-y-8">
             <div className="w-24 h-24 border-[6px] border-slate-100 border-t-red-600 rounded-full animate-spin mx-auto shadow-xl" />
             <div className="space-y-4">
                <h3 className="font-bold text-2xl uppercase tracking-tighter text-slate-900">{pdfStatus.text}</h3>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-red-600 h-full transition-all duration-300 shadow-lg shadow-red-500/50" style={{ width: `${pdfStatus.progress}%` }} />
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Cell Editor Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setEditingCell(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold uppercase tracking-tighter text-slate-900">{format(parseISO(editingCell.date), 'd MMMM, EEEE', { locale: ru })}</h2>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Редактирование смены</span>
              </div>
              <button onClick={() => setEditingCell(null)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8 scroll-smooth">
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Персонал в ячейке</h3>
                <div className="flex flex-wrap gap-5">
                  {getCellEmployees(editingCell.date, editingCell.shift).map((emp, idx) => (
                    <div key={emp.id} className="relative group animate-in slide-in-from-bottom-2 duration-300">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 bg-white relative shadow-md group-hover:shadow-xl transition-shadow">
                        <img 
                          src={emp.avatarUrl} 
                          className="absolute max-w-none left-0 top-0 block pointer-events-none" 
                          style={{ 
                            width: 'auto',
                            transform: `translate(${(emp.position?.x || 0) * (64/256)}px, ${(emp.position?.y || 0) * (64/256)}px) scale(${(emp.scale || 1) * (64/256)})`, 
                            transformOrigin: '0 0' 
                          }} 
                        />
                      </div>
                      <button onClick={() => {
                        const updated = [...getCellEmployees(editingCell.date, editingCell.shift)];
                        updated.splice(idx, 1);
                        setSchedule(prev => ({ ...prev, [`${editingCell.date}_${editingCell.shift}`]: updated }));
                      }} className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setShowAvatarEditor(true)} className="w-16 h-16 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-all">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
              </div>

              {savedEmployees.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Из архива</h3>
                  <div className="flex flex-wrap gap-4">
                    {savedEmployees.map((emp) => (
                      <div key={emp.id} className="relative group animate-in zoom-in-50 duration-200">
                        <button 
                          onClick={() => {
                            const current = getCellEmployees(editingCell.date, editingCell.shift);
                            setSchedule(prev => ({ ...prev, [`${editingCell.date}_${editingCell.shift}`]: [...current, { ...emp, id: Math.random().toString(36).substr(2, 9) }] }));
                          }} 
                          className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-white relative hover:scale-110 hover:shadow-lg transition-all active:scale-95"
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
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeEmployeeFromBank(emp.id);
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-600"
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-50 border-t flex justify-end">
               <button onClick={() => setEditingCell(null)} className="px-10 py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">Применить</button>
            </div>
          </div>
        </div>
      )}

      {showAvatarEditor && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" onClick={() => setShowAvatarEditor(false)} />
          <div className="relative">
            <AvatarEditor 
              onSave={(data) => {
                if (!editingCell) return;
                const current = getCellEmployees(editingCell.date, editingCell.shift);
                const newEmp = { id: Math.random().toString(36).substr(2, 9), name: 'Сотрудник', ...data };
                // Добавляем в текущую ячейку
                setSchedule(prev => ({ ...prev, [`${editingCell.date}_${editingCell.shift}`]: [...current, newEmp] }));
                // Сохраняем в банк (библиотеку) навсегда
                setSavedEmployees(prev => {
                  // Предотвращаем дубликаты по URL аватара
                  const filtered = prev.filter(e => e.avatarUrl !== newEmp.avatarUrl);
                  return [newEmp, ...filtered].slice(0, 30); // Храним до 30 последних аватаров
                });
                setShowAvatarEditor(false);
              }} 
              onCancel={() => setShowAvatarEditor(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;