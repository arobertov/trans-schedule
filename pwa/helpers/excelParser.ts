import * as XLSX from 'xlsx';

export const parseTrainScheduleExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' }); // Use 'array' for ArrayBuffer
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet);
                
                // Map columns based on Bulgarian headers
                const mappedData = json.map((row: any) => ({
                    train_number: String(row['Влак'] || row['train_number'] || ''),
                    station_track: String(row['Коловоз на станция'] || row['station_track'] || ''),
                    arrival_time: formatExcelTime(row['Час на пристигане'] || row['arrival_time']),
                    departure_time: formatExcelTime(row['Час на отпътуване'] || row['departure_time']),
                })).filter(r => r.train_number && r.station_track); // Basic validation
                
                resolve(mappedData);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

const formatExcelTime = (val: any): string | null => {
    if (val === undefined || val === null) return null;
    
    // If it's already a string like "14:30"
    if (typeof val === 'string') {
        const trimmed = val.trim();
        // Basic regex check if it looks like time
        if (/^\d{1,2}:\d{2}/.test(trimmed)) {
            return trimmed;
        }
        return null;
    }
    
    // If it's an Excel serial number (fraction of day)
    // 0.5 = 12:00:00
    if (typeof val === 'number') {
        const totalSeconds = Math.round(val * 86400);
        let hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        
        // Handle wrapping if > 24? 
        // User graph needs 04:00 to 01:00 (next day).
        // If Excel has 1.0416 (25:00), we should keep it if possible or wrap?
        // API expects standard time usually. 
        // Let's output HH:mm.
        
        // If hours >= 24, should we keep it for the schedule processing?
        // PHP DateTime might fail with "25:00".
        // Use modulo 24 for API storage if using Time type.
        // But for "Next Day" logic in Diagrams, we might need to know order.
        // Current API uses TimeImmutable. "25:00" is invalid.
        // We will mod 24.
        
        hours = hours % 24;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    return null;
}
