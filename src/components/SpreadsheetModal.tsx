import { useRef, useEffect } from 'react';
import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import 'jsuites/dist/jsuites.css';
import { Table, Check } from 'lucide-react';

interface SpreadsheetModalProps {
  initialData?: string[][];
  onSave: (htmlContent: string) => void;
  onCancel: () => void;
}

export default function SpreadsheetModal({ initialData, onSave, onCancel }: SpreadsheetModalProps) {
  const jspreadsheetRef = useRef<HTMLDivElement>(null);
  const spreadsheetInstance = useRef<any>(null);

  useEffect(() => {
    if (!jspreadsheetRef.current) return;
    if (jspreadsheetRef.current.innerHTML) jspreadsheetRef.current.innerHTML = '';

    const defaultData = initialData && initialData.length > 0 ? initialData : [
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', '']
    ];

    spreadsheetInstance.current = jspreadsheet(jspreadsheetRef.current, {
      data: defaultData,
      minDimensions: [6, 12],
      defaultColWidth: 100,
      toolbar: [
        { type: 'i', content: 'undo', onclick: () => spreadsheetInstance.current?.undo() },
        { type: 'i', content: 'redo', onclick: () => spreadsheetInstance.current?.redo() },
        { type: 'i', content: 'format_align_left', onclick: () => spreadsheetInstance.current?.setStyle(spreadsheetInstance.current?.getSelected(), 'text-align', 'left') },
        { type: 'i', content: 'format_align_center', onclick: () => spreadsheetInstance.current?.setStyle(spreadsheetInstance.current?.getSelected(), 'text-align', 'center') },
        { type: 'i', content: 'format_align_right', onclick: () => spreadsheetInstance.current?.setStyle(spreadsheetInstance.current?.getSelected(), 'text-align', 'right') },
        { type: 'i', content: 'format_bold', onclick: () => spreadsheetInstance.current?.setStyle(spreadsheetInstance.current?.getSelected(), 'font-weight', 'bold') },
      ],
      contextMenu: function(_obj: any, x: any, y: any) {
        return [
          { title: 'Insert row above', onclick: () => spreadsheetInstance.current?.insertRow(1, parseInt(y), 1) },
          { title: 'Insert row below', onclick: () => spreadsheetInstance.current?.insertRow(1, parseInt(y), 0) },
          { title: 'Delete row', onclick: () => spreadsheetInstance.current?.deleteRow(parseInt(y), 1) },
          { title: 'Insert col left', onclick: () => spreadsheetInstance.current?.insertColumn(1, parseInt(x), 1) },
          { title: 'Insert col right', onclick: () => spreadsheetInstance.current?.insertColumn(1, parseInt(x), 0) },
          { title: 'Delete col', onclick: () => spreadsheetInstance.current?.deleteColumn(parseInt(x), 1) },
        ];
      }
    } as any);

    return () => {
      // safe destroy
      try {
        if (spreadsheetInstance.current && typeof spreadsheetInstance.current.destroy === 'function') {
           spreadsheetInstance.current.destroy();
        }
      } catch (e) {
        // ignore
      }
    };
  }, [initialData]);

  const handleSave = () => {
     if (!spreadsheetInstance.current) return;
     const data = spreadsheetInstance.current.getData();
     const styles = spreadsheetInstance.current.getStyle(); 
     
     let tableHTML = '<table class="w-full text-left border-collapse border border-slate-700/50 my-2 excel-table bg-slate-800/40 relative group" data-excel="true">';
     
     const colCount = data[0]?.length || 0;
     if (colCount > 0) {
       tableHTML += '<thead><tr class="bg-slate-800/80 text-slate-300 shadow-sm">';
       const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
       for (let i=0; i<colCount; i++) {
          const colLetter = i < 26 ? letters[i] : letters[Math.floor(i/26)-1] + letters[i%26];
          tableHTML += `<th class="border border-slate-700/50 px-3 py-2 text-xs font-bold text-center bg-slate-900/50 text-slate-400 w-24 uppercase truncate tracking-widest">${colLetter}</th>`;
       }
       tableHTML += '</tr></thead>';
     }

     tableHTML += '<tbody>';
     
     for (let r=0; r<data.length; r++) {
         let trStr = '<tr class="hover:bg-slate-800/30 transition-colors">';
         for (let c=0; c<colCount; c++) {
             const rawValue = String(data[r][c] || ''); 
             const tdElement = jspreadsheetRef.current?.querySelector(`[data-x="${c}"][data-y="${r}"]`);
             let displayValue = tdElement ? tdElement.innerHTML : rawValue; 
             
             if (!displayValue || displayValue === 'null') displayValue = '';

             const encodedRaw = btoa(encodeURIComponent(rawValue));
             
             // Get style
             const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
             const colLetter = c < 26 ? letters[c] : letters[Math.floor(c/26)-1] + letters[c%26];
             const cellId = `${colLetter}${r+1}`;
             const cellStyle = styles[cellId] ? ` style="${styles[cellId]}"` : '';

             // data-raw attribute stores the exact formula/text so we can load it back
             trStr += `<td class="border border-slate-700/50 px-3 py-2 text-sm text-slate-100 font-medium" data-raw="${encodedRaw}"${cellStyle}>${displayValue}</td>`;
         }
         trStr += '</tr>';
         tableHTML += trStr;
     }
     tableHTML += '</tbody></table><p><br/></p>';
     onSave(tableHTML);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
       <div className="bg-slate-900 border border-slate-700 w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950/80 shadow-sm relative z-10">
             <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-emerald-900/30 rounded-xl border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                 <Table size={20} />
               </div>
               <div>
                  <h3 className="text-emerald-400 font-black text-lg tracking-tight uppercase">Excel Spreadsheet Engine</h3>
                  <p className="text-xs text-slate-400 font-medium">Full calculation, styling, and drag-to-copy capabilities</p>
               </div>
             </div>
             <div className="flex space-x-3">
               <button onClick={onCancel} className="px-5 py-2.5 bg-slate-800 text-slate-300 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-colors border border-slate-700/50">Abort</button>
               <button onClick={handleSave} className="flex items-center px-6 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all border border-emerald-500/30 active:scale-95">
                 <Check size={14} className="mr-2" /> Commit to Document
               </button>
             </div>
          </div>
          <div className="flex-1 overflow-auto bg-white/5 relative">
             <style>{`
                .jexcel_content { box-shadow: none !important; width: 100% !important; height: 100% !important; max-height: none !important; }
                .jexcel tbody tr td { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; font-size: 13px !important; color: #334155 !important; }
                .jexcel thead tr td { background-color: #f1f5f9 !important; font-weight: 800 !important; font-size: 12px !important; text-transform: uppercase; color: #475569 !important; }
                .jexcel_toolbar { background-color: #f8fafc !important; border-bottom: 2px solid #e2e8f0 !important; }
             `}</style>
             <div className="bg-white min-h-full rounded-b-xl overflow-hidden p-6">
                <div ref={jspreadsheetRef} />
             </div>
          </div>
       </div>
    </div>
  )
}
