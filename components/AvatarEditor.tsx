import React, { useState, useRef, useEffect } from 'react';
import { Employee } from '../types';

interface AvatarEditorProps {
  onSave: (data: { avatarUrl: string; scale: number; position: { x: number; y: number } }) => void;
  onCancel: () => void;
  initialData?: Partial<Employee>;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({ onSave, onCancel, initialData }) => {
  const [imgSrc, setImgSrc] = useState<string>(initialData?.avatarUrl || '');
  const [scale, setScale] = useState<number>(initialData?.scale || 1.0);
  const [position, setPosition] = useState({ x: initialData?.position?.x || 0, y: initialData?.position?.y || 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const containerSize = 256; 

  const autoCenterAndScale = (nativeWidth: number, nativeHeight: number) => {
    if (!nativeWidth || !nativeHeight) return;
    
    // cover scale: заполнить круг полностью
    const coverScale = Math.max(containerSize / nativeWidth, containerSize / nativeHeight);
    
    // center coordinates
    const x = (containerSize - (nativeWidth * coverScale)) / 2;
    const y = (containerSize - (nativeHeight * coverScale)) / 2;
    
    setScale(coverScale);
    setPosition({ x, y });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const tempImg = new Image();
        tempImg.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1000; // Оптимальный размер для аватара
          let w = tempImg.width;
          let h = tempImg.height;
          
          if (w > h) { if (w > maxDim) { h *= maxDim / w; w = maxDim; } }
          else { if (h > maxDim) { w *= maxDim / h; h = maxDim; } }
          
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(tempImg, 0, 0, w, h);
            const optimized = canvas.toDataURL('image/jpeg', 0.85);
            setImgSrc(optimized);
            setImgDimensions({ width: w, height: h });
            autoCenterAndScale(w, h);
          }
        };
        tempImg.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imgSrc) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      setPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  return (
    <div className="flex flex-col gap-4 p-8 bg-white rounded-2xl shadow-2xl w-[440px] border border-slate-200 select-none animate-in fade-in zoom-in duration-300">
      <h3 className="font-bold text-2xl text-slate-900 text-center uppercase tracking-tighter">Настройка аватара</h3>
      
      <div 
        ref={containerRef}
        className="relative w-64 h-64 mx-auto rounded-full overflow-hidden bg-slate-100 border-4 border-slate-900 shadow-inner cursor-move touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt="Preview"
            draggable={false}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              maxWidth: 'none',
              width: imgDimensions.width > 0 ? imgDimensions.width : 'auto',
              display: 'block',
              transformOrigin: '0 0'
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
             <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
             <span className="text-[10px] font-bold uppercase tracking-widest mt-2">Выберите фото</span>
          </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      
      <button onClick={() => fileInputRef.current?.click()} className="mt-2 bg-slate-950 hover:bg-black text-white py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg active:scale-95">
        {imgSrc ? 'Сменить фотографию' : 'Загрузить фотографию'}
      </button>

      {imgSrc && (
        <div className="flex flex-col gap-4 px-2 mt-4">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Размер</span>
            <span>{Math.round(scale * 100)}%</span>
          </div>
          <input type="range" min="0.05" max="3" step="0.001" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full accent-slate-900 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
          <button onClick={() => autoCenterAndScale(imgDimensions.width, imgDimensions.height)} className="text-[9px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest text-center">Сбросить центровку</button>
        </div>
      )}

      <div className="flex justify-between gap-4 mt-4 pt-6 border-t border-slate-100">
        <button onClick={onCancel} className="flex-1 px-4 py-4 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">Отмена</button>
        <button onClick={() => onSave({ avatarUrl: imgSrc, scale, position })} disabled={!imgSrc} className="flex-1 px-4 py-4 text-[10px] font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 uppercase tracking-widest shadow-lg">Сохранить</button>
      </div>
    </div>
  );
};

export default AvatarEditor;