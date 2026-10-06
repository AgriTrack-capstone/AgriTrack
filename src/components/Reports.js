import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { supabase } from '../supabaseClient';
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
  if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getRecordDate(record) {
  return toDate(record.scheduleAt || record.date || record.created_at || record.inserted_at);
}

function getCropDate(crop) {
  const recordedDate = toDate(crop.date_planted || crop.datePlanted || crop.planted_date || crop.created_at || crop.createdAt);
  if (recordedDate) return recordedDate;

  const localIdDate = Number(crop.id);
  return Number.isFinite(localIdDate) && localIdDate > 1e12 ? new Date(localIdDate) : null;
}

function isMissingCropColumnError(error) {
  return error?.code === 'PGRST204'
    || error?.code === '42703'
    || /column .* does not exist|could not find .*column|schema cache/i.test(error?.message || '');
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

function buildRows(records, crops, rangeKey) {
  const periods = buildPeriods(rangeKey);

  return periods.map((period) => {
    const added = crops.filter((crop) => {
      const cropDate = getCropDate(crop);
      return cropDate && cropDate >= period.start && cropDate <= period.end;
    }).length;

    const totalEntries = records.filter((record) => {
      const recordDate = getRecordDate(record);
      return recordDate && recordDate >= period.start && recordDate <= period.end;
    }).length;

    return {
      key: period.key,
      label: period.label,
      added,
      totalEntries
    };
  });
}

function CropPlantingChart({ values = [] }) {
  const width = 320;
  const height = 130;
  const allValues = [...values, 1];
  const max = Math.max(...allValues);
  const min = Math.min(...allValues, 0);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((value, index) => {
      const x = index * step;
      const ratio = max === min ? 0.5 : (value - min) / (max - min);
      const y = height - 18 - (ratio * (height - 36));
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="report-line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <line x1="0" y1={height - 16} x2={width} y2={height - 16} className="chart-baseline" />
      <polyline points={points} fill="none" className="chart-line chart-line-added" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

async function downloadPdfReport(records, crops, rangeKey) {
  const rows = buildRows(records, crops, rangeKey);
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
  const columnWidths = [tableWidth * 0.45, tableWidth * 0.3, tableWidth * 0.25];
  const headers = ['Period', 'Added (Crops Planted)', 'Records'];
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
    doc.text('FARM CROP PLANTING REPORT', 50, 56);

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
    doc.rect(currentX, currentY, columnWidths.slice(1).reduce((sum, width) => sum + width, 0), rowHeight, 'FD');
    doc.setTextColor(255, 255, 255);
    const greenHeaderLabelsX = [];
    let labelX = currentX;
    columnWidths.slice(1).forEach((width) => {
      greenHeaderLabelsX.push(labelX + 2);
      labelX += width;
    });

    headers.slice(1).forEach((header, index) => {
      doc.text(header, greenHeaderLabelsX[index], currentY + 6.5);
    });

    currentX += columnWidths.slice(1).reduce((sum, width) => sum + width, 0);
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
    const values = [row.label, formatNumber(row.added), String(row.totalEntries)];

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

function formatReportDate(value) {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : '-';
}

function getSelectedPeriodLabel(period) {
  if (period.start && period.end && period.key.includes('-') && period.key.length === 10) {
    return formatReportDate(period.start);
  }

  if (period.start && period.end) {
    const start = period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const end = period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  }

  return period.label;
}

async function downloadCropDetailsPdf(crops, period) {
  const generatedLabel = new Date().toLocaleString('en-US');
  const rangeLabel = getSelectedPeriodLabel(period);
  const headerLogo = await svgToPngDataUrl(REPORT_HEADER_SVG);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const marginX = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;
  const pairWidth = (contentWidth - 2) / 2;
  const labelWidth = 34;
  const valueWidth = pairWidth - labelWidth;
  const bottomMargin = 16;
  const lineColor = [60, 110, 60];
  const headingGreen = [35, 88, 48];
  const bodyGreen = [52, 96, 56];
  const mutedGreen = [100, 115, 100];
  let currentY = 0;
  let currentCrop = null;
  let currentCropIndex = 0;

  const drawPageHeader = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 49, 'F');
    doc.setTextColor(...mutedGreen);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Agritrack - San Agustin Malaplap Farmers Association', marginX, 10);
    doc.text(`Generated on: ${generatedLabel}`, pageWidth - marginX, 10, { align: 'right' });

    doc.addImage(headerLogo, 'PNG', marginX, 15, 22, 22);
    doc.setTextColor(...headingGreen);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PROVINCE OF ZAMBALES | CASTILLEJOS', 42, 21);
    doc.setFontSize(11);
    doc.text('BARANGAY MALAPLAP, SAN AGUSTIN', 42, 27);
    doc.setFontSize(18);
    doc.text('AGRITRACK CROP DETAILS', 42, 36);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('REPORT RANGE', pageWidth - marginX, 23, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(rangeLabel, pageWidth - marginX, 29, { align: 'right', maxWidth: 76 });
    doc.setDrawColor(...headingGreen);
    doc.setLineWidth(0.7);
    doc.line(marginX, 45, pageWidth - marginX, 45);
    currentY = 54;
  };

  const drawCropHeading = (crop, continued = false) => {
    const heading = continued ? `${crop.name} (continued)` : crop.name;
    doc.setFillColor(...headingGreen);
    doc.roundedRect(marginX, currentY, contentWidth, 7, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(heading, marginX + 2.5, currentY + 4.8, { maxWidth: contentWidth - 5 });
    currentY += 8;
  };

  const makeDetailRows = (fields) => {
    const rows = [];

    for (let index = 0; index < fields.length; index += 2) {
      const pairs = fields.slice(index, index + 2).map(([label, rawValue]) => {
        const value = String(rawValue ?? '-');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const labelLines = doc.splitTextToSize(label, labelWidth - 4);
        const valueLines = doc.splitTextToSize(value, valueWidth - 4);
        return { label, labelLines, valueLines };
      });
      const lineCount = Math.max(...pairs.flatMap(({ labelLines, valueLines }) => [labelLines.length, valueLines.length]));
      rows.push({ pairs, height: Math.max(6.8, lineCount * 3.2 + 2.4) });
    }

    return rows;
  };

  const drawDetailRows = (rows) => {
    rows.forEach(({ pairs, height }) => {
      if (currentY + height > pageHeight - bottomMargin) {
        doc.addPage();
        drawPageHeader();
        if (currentCrop) drawCropHeading({ ...currentCrop, name: `${currentCropIndex}. ${currentCrop.name}` }, true);
      }

      pairs.forEach(({ label, labelLines, valueLines }, pairIndex) => {
        const pairX = marginX + pairIndex * (pairWidth + 2);
        const textBlockHeight = Math.max(labelLines.length, valueLines.length) * 3.2;
        const textY = currentY + (height - textBlockHeight) / 2 + 2.4;

        doc.setDrawColor(...lineColor);
        doc.setLineWidth(0.2);
        doc.setFillColor(237, 244, 237);
        doc.rect(pairX, currentY, labelWidth, height, 'FD');
        doc.setFillColor(255, 255, 255);
        doc.rect(pairX + labelWidth, currentY, valueWidth, height, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(...bodyGreen);
        doc.text(labelLines, pairX + 2, textY, { lineHeightFactor: 1.05 });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(valueLines, pairX + labelWidth + 2, textY, { lineHeightFactor: 1.05 });
      });
      currentY += height;
    });
  };

  drawPageHeader();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...bodyGreen);
  doc.text(`Crop records: ${crops.length}`, marginX, currentY);
  currentY += 7;

  if (!crops.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...mutedGreen);
    doc.text('No crop records found for this report range.', marginX, currentY + 4);
  } else {
    crops.forEach((crop, index) => {
      currentCrop = { ...crop, name: `${index + 1}. ${crop.name}` };
      currentCropIndex = index + 1;

      const dateHarvested = String(crop.status).toLowerCase() === 'harvested'
        ? formatReportDate(crop.harvestedAt)
        : '-';
      const fields = [
        ['Crop', crop.name],
        ['Field', crop.field],
        ['Variety', crop.variety],
        ['Planter', crop.planter],
        ['Date planted', formatReportDate(crop.datePlanted)],
        ['Expected harvest date', formatReportDate(crop.expectedHarvestDate)],
        ['Date harvested', dateHarvested],
        ['Inputs provided', crop.inputsProvided],
        ['Area', crop.area],
        ['Quantity', formatNumber(crop.quantity)],
        ['Unit', crop.unit],
        ['Status', crop.status]
      ];
      const detailRows = makeDetailRows(fields);
      const cardHeight = 8 + detailRows.reduce((height, row) => height + row.height, 0) + 3;

      if (currentY + cardHeight > pageHeight - bottomMargin && currentY > 54) {
        doc.addPage();
        drawPageHeader();
      }

      drawCropHeading(currentCrop);
      drawDetailRows(detailRows);
      currentY += 3;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mutedGreen);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
  }

  const fileDate = String(period.key || new Date().toISOString().slice(0, 10)).replace(/[^\w-]/g, '-');
  doc.save(`agritrack-crop-details-${fileDate}.pdf`);
}

function Reports({ records = [], crops = [], setCrops = () => {} }) {
  const [rangeKey, setRangeKey] = useState('month');
  const [viewMode, setViewMode] = useState('table');
  const [showPrintCard, setShowPrintCard] = useState(false);
  const [printRangeKey, setPrintRangeKey] = useState(rangeKey);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [isDownloadingDetails, setIsDownloadingDetails] = useState(false);
  const [printMessage, setPrintMessage] = useState('');
  const [editingCropId, setEditingCropId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editMessage, setEditMessage] = useState('');
  const [isSavingCrop, setIsSavingCrop] = useState(false);

  useEffect(() => {
    if (!selectedPeriod) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSavingCrop) {
        setSelectedPeriod(null);
        setEditingCropId(null);
        setEditForm(null);
        setEditMessage('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPeriod, isSavingCrop]);

  const rows = useMemo(() => buildRows(records, crops, rangeKey), [records, crops, rangeKey]);

  const detailRows = useMemo(() => {
    if (!selectedPeriod) return [];

    return (crops || [])
      .filter((crop) => {
        const cropDate = getCropDate(crop);
        return cropDate && cropDate >= selectedPeriod.start && cropDate <= selectedPeriod.end;
      })
      .map((crop) => ({
        id: crop.id,
        name: crop.name || 'Unknown crop',
        planter: crop.planted_by || crop.plantedBy || 'Unassigned',
        datePlanted: crop.date_planted || crop.datePlanted || crop.planted_date || crop.created_at || '',
        field: crop.field || '',
        variety: crop.variety || '',
        expectedHarvestDate: crop.expected_harvest_date || crop.expectedHarvestDate || '',
        harvestedAt: crop.harvested_at || crop.date_harvested || crop.dateHarvested || '',
        inputsProvided: crop.inputs_provided || crop.inputsProvided || '',
        area: crop.area ?? crop.area_size ?? '',
        quantity: Number(crop.quantity ?? crop.stock_amt ?? crop.stock?.amount ?? 0) || 0,
        unit: crop.unit || crop.stock_unit || crop.stock?.unit || 'kg',
        status: crop.status || 'Planted'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [crops, selectedPeriod]);

  const totalPlantedQuantity = detailRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const mostHarvestedCrop = useMemo(() => {
    const harvested = detailRows.filter((row) => String(row.status).toLowerCase() === 'harvested');
    if (!harvested.length) return null;

    return harvested.reduce((most, current) => (
      Number(current.quantity) > Number(most.quantity) ? current : most
    ));
  }, [detailRows]);

  const periodLabel = getRangeLabel(rangeKey);
  const addedValues = rows.map((row) => row.added);

  const handlePeriodClick = (row) => {
    setSelectedPeriod({ ...row, start: buildPeriods(rangeKey).find((period) => period.key === row.key)?.start, end: buildPeriods(rangeKey).find((period) => period.key === row.key)?.end });
    setPrintMessage('');
  };

  const handlePrintDetails = async () => {
    if (!selectedPeriod) return;
    setIsDownloadingDetails(true);
    setPrintMessage('');

    try {
      await downloadCropDetailsPdf(detailRows, selectedPeriod);
    } catch (error) {
      console.error('Unable to create crop details PDF:', error);
      setPrintMessage(`Unable to create PDF: ${error.message || 'Please try again.'}`);
    } finally {
      setIsDownloadingDetails(false);
    }
  };

  const startCropEdit = (crop) => {
    setEditingCropId(crop.id);
    setEditForm({
      name: crop.name || '',
      planted_by: crop.planted_by || crop.plantedBy || '',
      field: crop.field || '',
      date_planted: crop.date_planted || crop.datePlanted || '',
      expected_harvest_date: crop.expected_harvest_date || crop.expectedHarvestDate || '',
      harvested_at: crop.harvested_at || crop.date_harvested || crop.dateHarvested || '',
      quantity: crop.quantity ?? crop.stock_amt ?? crop.stock?.amount ?? '',
      unit: crop.unit || crop.stock_unit || crop.stock?.unit || 'kg',
      status: crop.status || 'Planted'
    });
    setEditMessage('');
  };

  const cancelCropEdit = () => {
    setEditingCropId(null);
    setEditForm(null);
    setEditMessage('');
  };

  const handleCropEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveCropEdit = async (event) => {
    event.preventDefault();
    if (!editForm || !String(editForm.name).trim()) {
      setEditMessage('Crop name is required.');
      return;
    }

    setIsSavingCrop(true);
    setEditMessage('');

    try {
      const cropUpdate = {
        name: editForm.name.trim(),
        planted_by: editForm.planted_by.trim(),
        field: editForm.field.trim(),
        date_planted: editForm.date_planted || null,
        expected_harvest_date: editForm.expected_harvest_date || null,
        stock_amt: Number(editForm.quantity) || 0,
        stock_unit: editForm.unit,
        status: editForm.status
      };
      let schemaNeedsMigration = false;
      let { data, error } = await supabase
        .from('crops')
        .update({
          ...cropUpdate,
          harvested_at: String(editForm.status).toLowerCase() === 'harvested' ? editForm.harvested_at || null : null,
        })
        .eq('id', editingCropId)
        .select()
        .single();

      if (isMissingCropColumnError(error)) {
        schemaNeedsMigration = true;
        ({ data, error } = await supabase
          .from('crops')
          .update({
            name: cropUpdate.name,
            field: cropUpdate.field,
            stock_amt: cropUpdate.stock_amt,
            stock_unit: cropUpdate.stock_unit
          })
          .eq('id', editingCropId)
          .select()
          .single());
      }

      if (error) throw error;

      const updatedCrop = {
        ...(crops.find((crop) => String(crop.id) === String(editingCropId)) || {}),
        id: data.id,
        name: data.name || cropUpdate.name,
        planted_by: cropUpdate.planted_by,
        plantedBy: cropUpdate.planted_by,
        field: data.field || cropUpdate.field,
        date_planted: cropUpdate.date_planted,
        datePlanted: cropUpdate.date_planted || '',
        expected_harvest_date: editForm.expected_harvest_date || null,
        expectedHarvestDate: editForm.expected_harvest_date || '',
        harvested_at: String(editForm.status).toLowerCase() === 'harvested' ? editForm.harvested_at || null : null,
        dateHarvested: String(editForm.status).toLowerCase() === 'harvested' ? editForm.harvested_at || '' : '',
        created_at: data.created_at || new Date().toISOString(),
        quantity: Number(data.stock_amt ?? cropUpdate.stock_amt) || 0,
        unit: data.stock_unit || cropUpdate.stock_unit,
        stock_amt: Number(data.stock_amt ?? cropUpdate.stock_amt) || 0,
        stock_unit: data.stock_unit || cropUpdate.stock_unit,
        stock: { amount: Number(data.stock_amt ?? cropUpdate.stock_amt) || 0, unit: data.stock_unit || cropUpdate.stock_unit },
        status: cropUpdate.status
      };

      setCrops((prev) => prev.map((crop) => (
        String(crop.id) === String(editingCropId) ? updatedCrop : crop
      )));
      try {
        const savedCrops = JSON.parse(localStorage.getItem('agriTrack-crops') || '[]');
        const cachedCrops = savedCrops.filter((crop) => String(crop.id) !== String(editingCropId));
        localStorage.setItem('agriTrack-crops', JSON.stringify([updatedCrop, ...cachedCrops]));
      } catch (storageError) {
        console.warn('Unable to cache updated crop details locally', storageError);
      }
      cancelCropEdit();
      if (schemaNeedsMigration) {
        setEditMessage('Crop saved. Some details are stored locally until you run sql/farm_records_schema.sql in Supabase SQL Editor.');
      }
    } catch (error) {
      console.error('Unable to update crop from report details:', error);
      setEditMessage(`Unable to save crop changes: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSavingCrop(false);
    }
  };

  return (
    <div className="reports-time-container">
      <div className="reports-time-header">
        <div>
          <h1>Reports</h1>
          <p>Review crops planted during each period and open a date to view crop details.</p>
        </div>
      </div>

      <div className="reports-toolbar">
        <div className="reports-range-tabs" aria-label="Select report range">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              className={`reports-range-tab ${rangeKey === option.key ? 'active' : ''}`}
              onClick={() => setRangeKey(option.key)}
              type="button"
            >
              <span className="reports-range-icon">{option.icon}</span>
              <span className="reports-range-label">{option.label}</span>
            </button>
          ))}
        </div>

        <div>
          <button className="reports-print-btn no-print" type="button" onClick={() => { setPrintRangeKey(rangeKey); setShowPrintCard(true); }}>
            Export to PDF File
          </button>
        </div>
      </div>

      {viewMode === 'graph' ? (
        <section className="reports-card">
          <div className="reports-card-header">
            <h2>Crops planted by {periodLabel.toLowerCase()}</h2>
            <p>Track the number of crop records planted during each period.</p>
          </div>
          <div className="graph-shell">
            <div className="graph-legend">
              <span><i className="legend-swatch added" /> Crops planted</span>
            </div>
            <CropPlantingChart values={addedValues} />
            <div className="graph-axis">
              {rows.map((row) => (
                <button key={row.key} type="button" className="reports-period-axis" onClick={() => handlePeriodClick(row)}>
                  {row.label}
                </button>
              ))}
            </div>
          </div>
          <div className="graph-metrics">
            {rows.map((row) => (
              <button key={row.key} type="button" className="graph-metric-pill reports-period-pill" onClick={() => handlePeriodClick(row)}>
                <strong>{formatNumber(row.added)}</strong>
                <span>{row.label}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="reports-card">
          <div className="reports-card-header">
            <h2>Crops planted by {periodLabel.toLowerCase()}</h2>
            <p>Review how many crops were planted during each period.</p>
          </div>
          <div className="reports-table-wrap">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Added (Crops Planted)</th>
                  <th>Records</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="reports-period-row" onClick={() => handlePeriodClick(row)}>
                    <td><button type="button" className="reports-period-link">{row.label}</button></td>
                    <td>{formatNumber(row.added)}</td>
                    <td>{row.totalEntries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedPeriod && (
        <div
          className="reports-detail-overlay"
          onClick={() => {
            if (isSavingCrop) return;
            setSelectedPeriod(null);
            cancelCropEdit();
          }}
        >
          <section
            className="reports-card reports-detail-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reports-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reports-card-header reports-detail-header">
              <div>
                <h2 id="reports-detail-title">{selectedPeriod.label}</h2>
                <p>Crop planting, field, expected harvest, and harvest date details for this period.</p>
              </div>
              <div className="reports-detail-actions">
                <button type="button" className="reports-print-btn no-print" onClick={handlePrintDetails} disabled={isDownloadingDetails}>
                  {isDownloadingDetails ? 'Preparing PDF...' : 'Print Details'}
                </button>
                <button
                  type="button"
                  className="reports-detail-close no-print"
                  onClick={() => {
                    setSelectedPeriod(null);
                    cancelCropEdit();
                  }}
                  disabled={isSavingCrop}
                  aria-label="Close crop details"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="reports-detail-summary">
              <div className="reports-summary-box">
                <span>Total crops</span>
                <strong>{detailRows.length}</strong>
              </div>
              <div className="reports-summary-box">
                <span>Total quantity</span>
                <strong>{formatNumber(totalPlantedQuantity)}</strong>
              </div>
              <div className="reports-summary-box">
                <span>Most harvested crop</span>
                <strong>{mostHarvestedCrop ? `${mostHarvestedCrop.name} (${formatNumber(mostHarvestedCrop.quantity)} ${mostHarvestedCrop.unit})` : 'None'}</strong>
              </div>
            </div>

            {editMessage && <p className="reports-edit-message" role="alert">{editMessage}</p>}
            {printMessage && <p className="reports-edit-message" role="alert">{printMessage}</p>}

            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Crop</th>
                    <th>Field</th>
                    <th>Planter</th>
                    <th>Date Planted</th>
                    <th>Expected Harvest</th>
                    <th>Date Harvested</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.length ? detailRows.map((crop) => (
                    <tr key={crop.id}>
                      {String(editingCropId) === String(crop.id) ? (
                        <>
                          <td><input className="reports-edit-input" aria-label="Crop name" name="name" value={editForm.name} onChange={handleCropEditChange} required /></td>
                          <td><input className="reports-edit-input" aria-label="Field" name="field" value={editForm.field} onChange={handleCropEditChange} /></td>
                          <td><input className="reports-edit-input" aria-label="Planter" name="planted_by" value={editForm.planted_by} onChange={handleCropEditChange} /></td>
                          <td><input className="reports-edit-input" aria-label="Date planted" type="date" name="date_planted" value={editForm.date_planted} onChange={handleCropEditChange} /></td>
                          <td><input className="reports-edit-input" aria-label="Expected harvest date" type="date" name="expected_harvest_date" value={editForm.expected_harvest_date} onChange={handleCropEditChange} /></td>
                          <td>
                            {String(editForm.status).toLowerCase() === 'harvested' ? (
                              <input className="reports-edit-input" aria-label="Date harvested" type="date" name="harvested_at" value={editForm.harvested_at} onChange={handleCropEditChange} />
                            ) : '-'}
                          </td>
                          <td><input className="reports-edit-input" aria-label="Quantity" type="number" min="0" name="quantity" value={editForm.quantity} onChange={handleCropEditChange} /></td>
                          <td>
                            <select className="reports-edit-input" aria-label="Unit" name="unit" value={editForm.unit} onChange={handleCropEditChange}>
                              <option value="kg">kg</option>
                              <option value="sacks">sacks</option>
                              <option value="tons">tons</option>
                              <option value="pcs">pcs</option>
                            </select>
                          </td>
                          <td>
                            <select className="reports-edit-input" aria-label="Status" name="status" value={editForm.status} onChange={handleCropEditChange}>
                              <option value="Planted">Planted</option>
                              <option value="Growing">Growing</option>
                              <option value="Planned">Planned</option>
                              <option value="Harvested">Harvested</option>
                            </select>
                          </td>
                          <td>
                            <form className="reports-edit-actions no-print" onSubmit={saveCropEdit}>
                              <button className="reports-save-btn" type="submit" disabled={isSavingCrop}>
                                {isSavingCrop ? 'Saving...' : 'Save'}
                              </button>
                              <button className="reports-cancel-btn" type="button" onClick={cancelCropEdit} disabled={isSavingCrop}>Cancel</button>
                            </form>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{crop.name}</td>
                          <td>{crop.field || '-'}</td>
                          <td>{crop.planter}</td>
                          <td>{crop.datePlanted ? new Date(`${crop.datePlanted}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                          <td>{crop.expectedHarvestDate ? new Date(`${crop.expectedHarvestDate}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                          <td>{String(crop.status).toLowerCase() === 'harvested' && crop.harvestedAt ? new Date(`${crop.harvestedAt}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                          <td>{formatNumber(crop.quantity)}</td>
                          <td>{crop.unit}</td>
                          <td>
                            <span className="reports-status-pill" style={{ background: String(crop.status).toLowerCase() === 'harvested' ? '#ff9800' : '#2d7a3e' }}>
                              {crop.status}
                            </span>
                          </td>
                          <td>
                            <button type="button" className="reports-edit-btn no-print" onClick={() => startCropEdit(crop)}>Edit</button>
                          </td>
                        </>
                      )}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="10">No crop records found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {showPrintCard && (
        <div className="reports-print-overlay no-print" onClick={() => setShowPrintCard(false)}>
          <div className="reports-print-card" onClick={(e) => e.stopPropagation()}>
            <div className="reports-card-header">
              <h2>Export Report to PDF</h2>
              <p>Select the period to download first, then print it from the PDF viewer.</p>
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
              <button type="button" className="btn btn-primary" onClick={async () => {
                setViewMode('table');
                setRangeKey(printRangeKey);
                setShowPrintCard(false);
                await downloadPdfReport(records, crops, printRangeKey);
              }}>
                Download PDF File
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

}

export default Reports;
