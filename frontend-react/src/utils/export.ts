import html2canvas from 'html2canvas';

export const exportToCSV = (filename: string, data: any[]) => {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(fieldName => {
        const value = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
        const escaped = ('' + value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ].join('\r\n');

  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      useCORS: true,
      backgroundColor: '#0d1117',
      scale: 2,
      logging: false,
      onclone: (clonedDoc) => {
        const panel = clonedDoc.getElementById(elementId);
        if (panel) {
          panel.style.height = 'auto';
          panel.style.overflow = 'visible';
          // Hide elements that shouldn't be in the export
          const buttons = panel.querySelectorAll('button, .no-export, .control-section');
          buttons.forEach(b => (b as HTMLElement).style.display = 'none');
        }
      }
    });

    const link = document.createElement('a');
    link.download = `${filename}_${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Export to image failed:', error);
    alert('匯出圖檔失敗');
  }
};
