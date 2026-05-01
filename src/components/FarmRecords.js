import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/FarmRecords.css';

function FarmRecords({ crops = [], setCrops = () => {}, records = [], setRecords = () => {} }) {

  const [selectedCrop, setSelectedCrop] = useState('All Crops');
  const [showCropForm, setShowCropForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [cropForm, setCropForm] = useState({ name: '', field: '', stock: '' });
  const [cropFormMode, setCropFormMode] = useState('inventory');
  const [recordForm, setRecordForm] = useState({ title: '', field: '', crop: '', quantity: '', scheduleAt: '', notes: '' });
  const [editCropId, setEditCropId] = useState(null);
  const [editRecordId, setEditRecordId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const parseQuantity = (value) => {
    const match = String(value).trim().match(/^([0-9,.]+)\s*(.*)$/);
    const amount = match ? parseFloat(match[1].replace(/,/g, '')) : 0;
    const unit = match ? match[2].trim() : '';
    return { amount: Number.isNaN(amount) ? 0 : amount, unit };
  };

  const formatQuantity = (quantity) => {
    if (!quantity) return '';
    const { amount, unit } = quantity;
    return `${amount}${unit ? ` ${unit}` : ''}`.trim();
  };

  const changeQuantities = (base, delta) => {
    if (!base && !delta) return { amount: 0, unit: '' };
    if (!base) return delta;
    if (!delta || delta.amount === 0) return base;

    const baseUnit = base.unit?.toLowerCase() || '';
    const deltaUnit = delta.unit?.toLowerCase() || baseUnit;
    if (!baseUnit || !deltaUnit || baseUnit === deltaUnit) {
      return {
        amount: Math.max(0, base.amount + delta.amount),
        unit: base.unit || delta.unit
      };
    }
    return base;
  };

  const addQuantities = (base, additional) => changeQuantities(base, additional);
  const subtractQuantities = (base, reduction) => changeQuantities(base, { ...reduction, amount: reduction.amount * -1 });

  const formatShortDate = (dateValue) => {
    if (!dateValue) return '';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getComputedStatus = (record, now) => {
    if (record.status === 'Completed') return 'Completed';
    if (!record.scheduleAt) return 'Scheduled';

    const scheduled = new Date(record.scheduleAt);
    if (Number.isNaN(scheduled.getTime())) return 'Scheduled';

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    if (scheduled < now) return 'Overdue';
    if (scheduled >= todayStart && scheduled < tomorrowStart) return 'Due Today';
    return 'Scheduled';
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const cropNames = Array.from(new Set(crops.map((crop) => crop.name)));
    const fieldNames = Array.from(new Set(crops.map((crop) => crop.field).filter(Boolean)));
  const recordsWithStatus = records.map((record) => ({
    ...record,
    computedStatus: getComputedStatus(record, currentTime)
  }));

  const visibleRecords = selectedCrop === 'All Crops'
    ? recordsWithStatus
    : recordsWithStatus.filter((record) => record.crop === selectedCrop);

  const totalCrops = crops.length;
  const activeFields = new Set(crops.map((crop) => crop.field)).size;
  const alertCount = recordsWithStatus.filter((record) => record.computedStatus !== 'Completed').length;
  const quickStats = [
    { label: 'Total Crops', value: totalCrops, icon: '🌿', trend: '0', accent: '#2e7d32', soft: '#e7f4e8' },
    { label: 'Active Fields', value: activeFields, icon: '🛰️', trend: '↗', accent: '#4b8f52', soft: '#eef7ee' },
    { label: 'Alerts', value: alertCount, icon: '⚠️', trend: '0', accent: '#c98a00', soft: '#fff4d6' }
  ];

  const handleCropInputChange = (e) => {
    const { name, value } = e.target;
    setCropForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRecordInputChange = (e) => {
    const { name, value } = e.target;
    setRecordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCrop = (e) => {
    e.preventDefault();
    if (!cropForm.name.trim()) return;

    const parsedStock = cropFormMode === 'crop'
      ? { amount: 0, unit: '' }
      : parseQuantity(cropForm.stock);
    // Persist to Supabase then update local state
    (async () => {
      try {
        if (editCropId) {
          const { data, error } = await supabase
            .from('crops')
            .update({
              name: cropForm.name,
              field: cropForm.field,
              stock_amt: parsedStock.amount,
              stock_unit: parsedStock.unit,
              color: cropForm.color || '#e8f5e9'
            })
            .eq('id', editCropId)
            .select()
            .single();

          if (!error && data) {
            setCrops((prev) => prev.map((crop) => (
              crop.id === editCropId ? { ...crop, name: data.name, field: data.field, stock: { amount: Number(data.stock_amt) || 0, unit: data.stock_unit || '' } } : crop
            )));
          }
        } else {
          const { data, error } = await supabase
            .from('crops')
            .insert([{
              name: cropForm.name,
              field: cropForm.field,
              stock_amt: parsedStock.amount,
              stock_unit: parsedStock.unit,
              color: cropForm.color || '#e8f5e9'
            }])
            .select()
            .single();

          if (!error && data) {
            const created = {
              id: data.id,
              name: data.name,
              field: data.field,
              stock: { amount: Number(data.stock_amt) || 0, unit: data.stock_unit || '' },
              color: data.color || '#e8f5e9'
            };
            setCrops((prev) => [created, ...prev]);
          }
        }
      } catch (err) {
        console.error('Supabase save crop error', err);
      }
    })();

    setCropForm({ name: '', field: '', stock: '' });
    setCropFormMode('inventory');
    setEditCropId(null);
    setShowCropForm(false);
  };

  const handleSaveRecord = (e) => {
    e.preventDefault();
    if (!recordForm.title.trim()) return;
    if (!recordForm.crop) return;
    if (!recordForm.scheduleAt) return;

    const parsedQuantity = parseQuantity(recordForm.quantity);
    const scheduledDateLabel = formatShortDate(recordForm.scheduleAt);
    const newRecord = {
      ...recordForm,
      quantity: parsedQuantity,
      date: scheduledDateLabel,
      icon: '📋',
      color: '#e8f5e9',
      status: 'Scheduled'
    };

    // Persist record to Supabase, then update local state
    (async () => {
      try {
        if (editRecordId) {
          const previousRecord = records.find((record) => record.id === editRecordId);
          const { data, error } = await supabase
            .from('records')
            .update({
              title: newRecord.title,
              field: newRecord.field,
              crop: newRecord.crop,
              qty_amount: parsedQuantity.amount,
              qty_unit: parsedQuantity.unit,
              schedule_at: newRecord.scheduleAt,
              notes: newRecord.notes,
              status: newRecord.status
            })
            .eq('id', editRecordId)
            .select()
            .single();

          if (!error && data) {
            setRecords((prev) => prev.map((record) => (
              record.id === editRecordId ? { ...record, ...newRecord, id: editRecordId } : record
            )));

            if (previousRecord) {
              setCrops((prev) => prev.map((crop) => {
                if (crop.name === previousRecord.crop && crop.name === recordForm.crop) {
                  const difference = {
                    amount: parsedQuantity.amount - (previousRecord.quantity?.amount || 0),
                    unit: parsedQuantity.unit || previousRecord.quantity?.unit || ''
                  };
                  return { ...crop, stock: changeQuantities(crop.stock, difference) };
                }

                if (crop.name === previousRecord.crop && crop.name !== recordForm.crop) {
                  return { ...crop, stock: subtractQuantities(crop.stock, previousRecord.quantity) };
                }

                if (crop.name === recordForm.crop && crop.name !== previousRecord.crop) {
                  return { ...crop, stock: addQuantities(crop.stock, parsedQuantity) };
                }

                return crop;
              }));
            }
          }
        } else {
          const { data, error } = await supabase
            .from('records')
            .insert([{
              title: newRecord.title,
              field: newRecord.field,
              crop: newRecord.crop,
              qty_amount: parsedQuantity.amount,
              qty_unit: parsedQuantity.unit,
              schedule_at: newRecord.scheduleAt,
              notes: newRecord.notes,
              status: newRecord.status
            }])
            .select()
            .single();

          if (!error && data) {
            const created = {
              id: data.id,
              ...newRecord
            };
            setRecords((prev) => [created, ...prev]);

            setCrops((prev) => prev.map((crop) => (
              crop.name === recordForm.crop
                ? { ...crop, stock: addQuantities(crop.stock, parsedQuantity) }
                : crop
            )));
          }
        }
      } catch (err) {
        console.error('Supabase save record error', err);
      }
    })();

    if (recordForm.crop) {
      setSelectedCrop(recordForm.crop);
    }

    setRecordForm({ title: '', field: '', crop: '', quantity: '', scheduleAt: '', notes: '' });
    setEditRecordId(null);
    setShowRecordForm(false);
  };

  const handleEditCrop = (crop) => {
    setCropFormMode('inventory');
    setCropForm({ name: crop.name, field: crop.field, stock: formatQuantity(crop.stock) });
    setEditCropId(crop.id);
    setShowCropForm(true);
  };

  const handleDeleteCrop = (cropId) => {
    const cropToDelete = crops.find((crop) => crop.id === cropId);
    if (!cropToDelete) return;

    (async () => {
      try {
        const { error } = await supabase.from('crops').delete().eq('id', cropId);
        if (!error) {
          setCrops((prev) => prev.filter((crop) => crop.id !== cropId));
          setRecords((prev) => prev.filter((record) => record.crop !== cropToDelete.name));
          if (selectedCrop === cropToDelete.name) setSelectedCrop('All Crops');
        }
      } catch (err) {
        console.error('Supabase delete crop error', err);
      }
    })();
  };

  const handleEditRecord = (record) => {
    setRecordForm({
      title: record.title,
      field: record.field,
      crop: record.crop,
      quantity: formatQuantity(record.quantity),
      scheduleAt: record.scheduleAt || '',
      notes: record.notes
    });
    setEditRecordId(record.id);
    setShowRecordForm(true);
  };

  const handleDeleteRecord = (recordId) => {
    const recordToDelete = records.find((record) => record.id === recordId);
    if (!recordToDelete) return;

    (async () => {
      try {
        const { error } = await supabase.from('records').delete().eq('id', recordId);
        if (!error) {
          if (recordToDelete) {
            setCrops((prev) => prev.map((crop) => (
              crop.name === recordToDelete.crop
                ? { ...crop, stock: subtractQuantities(crop.stock, recordToDelete.quantity) }
                : crop
            )));
          }
          setRecords((prev) => prev.filter((record) => record.id !== recordId));
        }
      } catch (err) {
        console.error('Supabase delete record error', err);
      }
    })();
  };

  const handleMarkCompleted = (recordId) => {
    setRecords((prev) => prev.map((record) => (
      record.id === recordId
        ? { ...record, status: 'Completed' }
        : record
    )));
  };

  const handleCropFilter = (name) => {
    setSelectedCrop(name);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="farm-records">
      <div className="records-header">
        <div>
          <h2>Crop Inventory</h2>
          <p>Manage crop items and related activity records separately.</p>
        </div>
        <div className="header-actions no-print">
          <button className="print-btn" onClick={handlePrint}>
            🖨️ Print Summary
          </button>
        </div>
      </div>

      <div className="quick-row">
        <div className="quick-stats">
          {quickStats.map((stat) => (
            <div key={stat.label} className="quick-stat-card" style={{ '--stat-accent': stat.accent, '--stat-soft': stat.soft }}>
              <div className="quick-stat-icon">{stat.icon}</div>
              <div className="quick-stat-copy">
                <div className="quick-stat-label">{stat.label}</div>
                <div className="quick-stat-value">{stat.value}</div>
              </div>
              <div className="quick-stat-trend">{stat.trend}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="records-layout">
        <section className="section-card inventory-panel">
          <div className="section-title-row inventory-toolbar">
            <div>
              <h3>Inventory</h3>
            </div>
            <div className="header-actions no-print">
              <button className="secondary-btn" onClick={() => {
                setShowCropForm(!showCropForm);
                setShowRecordForm(false);
                setEditCropId(null);
                setCropFormMode('inventory');
                setCropForm({ name: '', field: '', stock: '' });
              }}>
                + Add Record
              </button>
              <button className="secondary-btn" onClick={() => {
                setShowCropForm(true);
                setShowRecordForm(false);
                setEditCropId(null);
                setCropFormMode('crop');
                setCropForm({ name: '', field: '', stock: '' });
              }}>
                + Add Crop
              </button>
            </div>
          </div>

          {showCropForm && (
            <div className="add-record-form">
              <form onSubmit={handleSaveCrop}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Crop Name</label>
                    {cropFormMode === 'crop' ? (
                      <input
                        type="text"
                        name="name"
                        value={cropForm.name}
                        onChange={handleCropInputChange}
                        placeholder="Enter new crop name"
                        required
                      />
                    ) : (
                      <select
                        name="name"
                        value={cropForm.name}
                        onChange={handleCropInputChange}
                        required
                      >
                        <option value="">Select Crop</option>
                        {cropNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Field</label>
                    {cropFormMode === 'crop' ? (
                      <input
                        type="text"
                        name="field"
                        value={cropForm.field}
                        onChange={handleCropInputChange}
                        placeholder="Enter new field"
                        required
                      />
                    ) : (
                      <select
                        name="field"
                        value={cropForm.field}
                        onChange={handleCropInputChange}
                        required
                      >
                        <option value="">Select Field</option>
                        {fieldNames.map((fieldName) => (
                          <option key={fieldName} value={fieldName}>{fieldName}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                {cropFormMode !== 'crop' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Stock</label>
                      <input
                        type="text"
                        name="stock"
                        value={cropForm.stock}
                        onChange={handleCropInputChange}
                        placeholder="500 seedlings"
                      />
                    </div>
                  </div>
                )}
                <div className="form-actions">
                  <button type="submit" className="submit-btn">{editCropId ? 'Update Crop' : 'Save Crop'}</button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowCropForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="crop-list inventory-strip">
            {crops.map((crop) => (
              <div key={crop.id} className="crop-card" style={{ '--crop-accent': crop.color }}>
                <div className="crop-card-icon" style={{ backgroundColor: crop.color }}>{crop.name.charAt(0)}</div>
                <div className="crop-card-details">
                  <div className="crop-name">{crop.name}</div>
                  <div className="crop-meta">Field: {crop.field}</div>
                  <div className="crop-meta">Stock: {formatQuantity(crop.stock)}</div>
                  <div className="crop-progress"><span style={{ width: `${Math.min(100, crop.stock.amount ? crop.stock.amount / 5 : 20)}%` }} /></div>
                </div>
                <div className="crop-actions crop-actions-vertical">
                  <button className="icon-btn edit-btn no-print" onClick={() => handleEditCrop(crop)}>⋮</button>
                  <button className="icon-btn delete-btn no-print" onClick={() => handleDeleteCrop(crop.id)}>›</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section-card records-panel">
          <div className="section-title-row">
            <div>
              <h3>Activity Records</h3>
            </div>
            <button className="secondary-btn no-print" onClick={() => {
              setShowRecordForm(!showRecordForm);
              setShowCropForm(false);
              setEditRecordId(null);
              setRecordForm({ title: '', field: '', crop: '', quantity: '', scheduleAt: '', notes: '' });
            }}>
              + Add Activity
            </button>
          </div>

          <div className="filter-row">
            <button
              className={`filter-btn no-print ${selectedCrop === 'All Crops' ? 'active' : ''}`}
              onClick={() => handleCropFilter('All Crops')}
            >
              All Crops
            </button>
            {cropNames.map((name) => (
              <button
                key={name}
                className={`filter-btn no-print ${selectedCrop === name ? 'active' : ''}`}
                onClick={() => handleCropFilter(name)}
              >
                {name}
              </button>
            ))}
          </div>

          {showRecordForm && (
            <div className="add-record-form">
              <form onSubmit={handleSaveRecord}>
                <div className="form-group">
                  <label>Record Title</label>
                  <input
                    type="text"
                    name="title"
                    value={recordForm.title}
                    onChange={handleRecordInputChange}
                    placeholder="Enter record title"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Field Name</label>
                    <select
                      name="field"
                      value={recordForm.field}
                      onChange={handleRecordInputChange}
                      required
                    >
                      <option value="">Select Field</option>
                      {fieldNames.map((fieldName) => (
                        <option key={fieldName} value={fieldName}>{fieldName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Crop</label>
                    <select
                      name="crop"
                      value={recordForm.crop}
                      onChange={handleRecordInputChange}
                      required
                    >
                      <option value="">Select Crop</option>
                      {cropNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="text"
                      name="quantity"
                      value={recordForm.quantity}
                      onChange={handleRecordInputChange}
                      placeholder="Quantity"
                    />
                  </div>
                  <div className="form-group">
                    <label>Schedule</label>
                    <input
                      type="datetime-local"
                      name="scheduleAt"
                      value={recordForm.scheduleAt}
                      onChange={handleRecordInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={recordForm.notes}
                      onChange={handleRecordInputChange}
                      placeholder="Notes"
                      rows="2"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn">{editRecordId ? 'Update Record' : 'Save Record'}</button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowRecordForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="records-table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activity</th>
                  <th>Crop</th>
                  <th>Field</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record) => (
                  <tr key={record.id} style={{ '--row-accent': record.color }}>
                    <td>{record.date}</td>
                    <td>{record.title}</td>
                    <td>{record.crop}</td>
                    <td>{record.field}</td>
                    <td>{formatQuantity(record.quantity)}</td>
                    <td>
                      <span className={`status-badge ${record.computedStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                        {record.computedStatus}
                      </span>
                    </td>
                    <td>
                      <div className="record-actions">
                        {record.computedStatus === 'Overdue' && (
                          <button
                            className="status-action-btn no-print"
                            onClick={() => handleMarkCompleted(record.id)}
                            aria-label="Mark activity as completed"
                            title="Mark as completed"
                          >
                            ✓
                          </button>
                        )}
                        <button className="icon-btn edit-btn no-print" onClick={() => handleEditRecord(record)}>✏️</button>
                        <button className="icon-btn delete-btn no-print" onClick={() => handleDeleteRecord(record.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default FarmRecords;
