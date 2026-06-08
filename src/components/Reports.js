import React, { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import '../styles/Reports.css';

const RANGE_OPTIONS = [
  { key: 'week', label: 'Week', icon: '📅', points: 7, unit: 'day' },
  { key: 'month', label: 'Month', icon: '🗓️', points: 4, unit: 'month' },
  { key: 'midyear', label: 'Midyear', icon: '⏳', points: 6, unit: 'month' },
  { key: 'year', label: 'Year', icon: '☀️', points: 12, unit: 'month' }
];

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getRecordDate(record) {
  return toDate(record.scheduleAt || record.date || record.created_at || record.inserted_at);
}

function getRecordQuantity(record) {
  return Number(record.quantity?.amount ?? record.qty_amount ?? record.amount ?? 0) || 0;
}

function classifyRecord(record) {
  const text = `${record.title || ''} ${record.notes || ''} ${record.status || ''}`.toLowerCase();

  if (/\b(used|usage|harvest|consumed|withdraw|deduct|issue|remove|spent)\b/.test(text)) {
    return 'used';
  }

  if (/\b(add|added|addded|restock|received|incoming|inventory|plant|seed|purchase|stock)\b/.test(text)) {
    return 'added';
  }

  if ((record.status || '').toLowerCase() === 'completed') {
    return 'used';
  }

  return 'added';
}

function formatMonthRangeLabel(start, end) {
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function buildPeriods(rangeKey) {
  const range = RANGE_OPTIONS.find((option) => option.key === rangeKey) || RANGE_OPTIONS[0];
  const now = new Date();
  const periods = [];

  if (range.unit === 'day') {
    for (let index = range.points - 1; index >= 0; index -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      periods.push({
        key: start.toISOString().slice(0, 10),
        start,
        end,
        label: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    return periods;
  }

  for (let index = range.points - 1; index >= 0; index -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    periods.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      start,
      end,
      label: formatMonthRangeLabel(start, end)
    });
  }

  return periods;
}

function buildRows(records, rangeKey) {
  const periods = buildPeriods(rangeKey);

  return periods.map((period) => {
    const added = records.reduce((total, record) => {
      const recordDate = getRecordDate(record);
      if (!recordDate || recordDate < period.start || recordDate > period.end) return total;
      return classifyRecord(record) === 'added' ? total + getRecordQuantity(record) : total;
    }, 0);

    const used = records.reduce((total, record) => {
      const recordDate = getRecordDate(record);
      if (!recordDate || recordDate < period.start || recordDate > period.end) return total;
      return classifyRecord(record) === 'used' ? total + getRecordQuantity(record) : total;
    }, 0);

    const totalEntries = records.filter((record) => {
      const recordDate = getRecordDate(record);
      return recordDate && recordDate >= period.start && recordDate <= period.end;
    }).length;

    return {
      key: period.key,
      label: period.label,
      added,
      used,
      totalEntries,
      net: added - used
    };
  });
}



const REPORT_HEADER_SVG = `
<svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
  <circle cx="130" cy="130" r="110" fill="none" stroke="#315b33" stroke-width="3" />
  <path d="M48 112c13-29 38-51 67-62" fill="none" stroke="#315b33" stroke-width="4" stroke-linecap="round" />
  <path d="M212 112c-13-29-38-51-67-62" fill="none" stroke="#315b33" stroke-width="4" stroke-linecap="round" />
  <path d="M52 156c12 28 35 49 63 60" fill="none" stroke="#315b33" stroke-width="4" stroke-linecap="round" />
  <path d="M208 156c-12 28-35 49-63 60" fill="none" stroke="#315b33" stroke-width="4" stroke-linecap="round" />
  <path d="M130 58c33 0 59 26 59 59 0 46-32 79-59 111-27-32-59-65-59-111 0-33 26-59 59-59Z" fill="#245d2d" opacity="0.95" />
  <path d="M130 78c22 0 40 18 40 40 0 30-21 52-40 74-19-22-40-44-40-74 0-22 18-40 40-40Z" fill="#8ec63f" opacity="0.95" />
  <path d="M130 86c16 0 29 13 29 29 0 21-15 36-29 52-14-16-29-31-29-52 0-16 13-29 29-29Z" fill="#c8e26d" opacity="0.95" />
  <path d="M68 94c4 0 9 2 12 6 3 4 4 10 2 15-6 2-12 1-16-3-4-4-5-10-2-14 1-2 2-3 4-4Z" fill="#94c14c" />
  <path d="M192 94c-4 0-9 2-12 6-3 4-4 10-2 15 6 2 12 1 16-3 4-4 5-10 2-14-1-2-2-3-4-4Z" fill="#94c14c" />
  <path d="M62 172c6-5 13-7 19-5 5 2 9 8 10 14-4 5-10 7-16 6-6-1-11-5-13-10-1-2-1-4 0-5Z" fill="#94c14c" />
  <path d="M198 172c-6-5-13-7-19-5-5 2-9 8-10 14 4 5 10 7 16 6 6-1 11-5 13-10 1-2 1-4 0-5Z" fill="#94c14c" />
  <circle cx="130" cy="59" r="10" fill="#2d2d2d" />
  <path d="M130 58c31 0 56 25 56 56" fill="none" stroke="#d9ef53" stroke-width="6" stroke-linecap="round" />
  <circle cx="186" cy="114" r="6" fill="#d9ef53" />
</svg>`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function svgToPngDataUrl(svgMarkup) {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImage(blobUrl);
    const size = 360;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);

    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function getRangeLabel(rangeKey) {
  return RANGE_OPTIONS.find((option) => option.key === rangeKey)?.label || 'Month';
}

async function downloadPdfReport(records, rangeKey) {
  const rows = buildRows(records, rangeKey);
  const rangeLabel = getRangeLabel(rangeKey);
  const generatedLabel = new Date().toLocaleString();
  const headerLogo = await svgToPngDataUrl(REPORT_HEADER_SVG);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const marginX = 14;
  const topBandHeight = 72;
  const startY = 82;
  const rowHeight = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = pageWidth - (marginX * 2);
  const columnWidths = [tableWidth * 0.5, tableWidth * 0.25, tableWidth * 0.25];
  const headers = ['Period', 'Added', 'Used'];
  const lineColor = [60, 110, 60];
  const headerGreen = [35, 88, 48];
  const textGreen = [52, 96, 56];

  const drawHeader = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, topBandHeight, 'F');

    doc.setTextColor(116, 121, 128);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10.5);
    doc.text('Agritrack - San Agustin Malaplap Farmers Association', marginX, 12);
    doc.text(`Generated on: ${generatedLabel}`, pageWidth - marginX, 12, { align: 'right' });
    doc.text(`Report range: ${rangeLabel}`, pageWidth - marginX, 20, { align: 'right' });

    doc.addImage(headerLogo, 'PNG', marginX, 18, 30, 30);

    doc.setTextColor(35, 88, 48);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('PROVINCE OF ZAMBALES | CASTILLEJOS', 50, 28);
    doc.text('BARANGAY MALAPLAP, SAN AGUSTIN', 50, 36);
    doc.setFontSize(24);
    doc.text('AGRITRACK', 50, 48);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('FARM INVENTORY MONITORING', 50, 56);

    doc.setDrawColor(35, 88, 48);
    doc.setLineWidth(0.8);
    doc.line(marginX, topBandHeight - 2, pageWidth - marginX, topBandHeight - 2);

    doc.setTextColor(32, 49, 32);
    doc.setFillColor(245, 247, 245);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
  };

  let currentY = startY;

  const drawHeaderRow = () => {
    let currentX = marginX;
    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.4);

    doc.setFillColor(255, 255, 255);
    doc.rect(currentX, currentY, columnWidths[0], rowHeight, 'FD');
    doc.setTextColor(...textGreen);
    doc.text(headers[0], currentX + 2, currentY + 6.5);
    currentX += columnWidths[0];

    doc.setFillColor(...headerGreen);
    doc.rect(currentX, currentY, columnWidths[1] + columnWidths[2], rowHeight, 'FD');
    doc.setTextColor(255, 255, 255);
    doc.text(headers[1], currentX + 2, currentY + 6.5);
    doc.text(headers[2], currentX + columnWidths[1] + 2, currentY + 6.5);

    currentX += columnWidths[1] + columnWidths[2];
    currentY += rowHeight;
  };

  const drawPageHeader = () => {
    drawHeader();
    currentY = startY;
    drawHeaderRow();
  };

  drawHeader();
  drawHeaderRow();

  rows.forEach((row) => {
    if (currentY + rowHeight > pageHeight - 16) {
      doc.addPage();
      drawPageHeader();
    }

    let currentX = marginX;
    const values = [row.label, formatNumber(row.added), formatNumber(row.used)];

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textGreen);
    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.3);

    values.forEach((value, index) => {
      doc.rect(currentX, currentY, columnWidths[index], rowHeight);
      doc.text(value, currentX + 2, currentY + 6.5, { maxWidth: columnWidths[index] - 4 });
      currentX += columnWidths[index];
    });

    currentY += rowHeight;
  });

  doc.save(`agritrack-report-${rangeKey}.pdf`);
}

function Reports({ records = [] }) {
  const [rangeKey, setRangeKey] = useState('month');
  const [showPrintCard, setShowPrintCard] = useState(false);
  const [printRangeKey, setPrintRangeKey] = useState(rangeKey);

  const rows = useMemo(() => buildRows(records, rangeKey), [records, rangeKey]);

  const periodLabel = getRangeLabel(rangeKey);

  return (
    <div className="reports-time-container">
      <div className="reports-time-header">
        <div>
          <h1>Reports</h1>
          <p>Track inventory changes over time with detailed analytics.</p>
        </div>
      </div>

      <div className="reports-toolbar">
        <div className="reports-toolbar-left">
          <div className="reports-range-tabs" aria-label="Select report range">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                className={`reports-range-tab ${rangeKey === option.key ? 'active' : ''}`}
                onClick={() => setRangeKey(option.key)}
                type="button"
                title={`Show ${option.label.toLowerCase()} report`}
              >
                <span className="reports-range-icon">{option.icon}</span>
                <span className="reports-range-label">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="reports-toolbar-right">
          <button 
            className="reports-print-btn no-print" 
            type="button" 
            onClick={() => { setPrintRangeKey(rangeKey); setShowPrintCard(true); }}
            title="Export report to PDF"
          >
            Export PDF
          </button>
        </div>
      </div>

      <section className="reports-card">
        <div className="reports-card-header">
          <h2>Inventory Summary by {periodLabel.toLowerCase()}</h2>
          <p>Review total quantities added, used, and net change for each period.</p>
        </div>
        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Added</th>
                <th>Used</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.key}>
                    <td className="period-cell">{row.label}</td>
                    <td className="added-cell">{formatNumber(row.added)}</td>
                    <td className="used-cell">{formatNumber(row.used)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="empty-state">No inventory records found for this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showPrintCard && (
        <div className="reports-print-overlay no-print" onClick={() => setShowPrintCard(false)}>
          <div className="reports-print-card" onClick={(e) => e.stopPropagation()}>
            <div className="reports-card-header">
              <h2>Export Report to PDF</h2>
              <p>Choose the reporting period and download a formatted PDF report.</p>
            </div>
            <div className="reports-range-tabs print-range-tabs">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  className={`reports-range-tab print-range-tab ${printRangeKey === option.key ? 'active' : ''}`}
                  onClick={() => setPrintRangeKey(option.key)}
                  type="button"
                >
                  <span className="reports-range-icon">{option.icon}</span>
                  <span className="reports-range-label">{option.label}</span>
                </button>
              ))}
            </div>
            <div className="reports-print-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowPrintCard(false)}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={async () => {
                  setShowPrintCard(false);
                  await downloadPdfReport(records, printRangeKey);
                }}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

}

export default Reports;
