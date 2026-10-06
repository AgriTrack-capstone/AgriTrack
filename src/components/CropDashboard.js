import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Dashboard.css';

const getFieldLabel = (fieldKey) => {
  const fieldMap = {
    'Field 1': 'Field 1 - Lower Farm / Lowland',
    'Field 2': 'Field 2 - Higher Farm / Upland'
  };

  return fieldMap[fieldKey] || fieldKey;
};

const getCropHarvestDays = (cropName) => {
  const value = (cropName || '').trim().toLowerCase();

  if (!value) return 120;
  if (value.includes('palay') || value.includes('rice')) return 120;
  if (value.includes('mais') || value.includes('corn') || value.includes('maize')) return 75;
  if (value.includes('kamote') || value.includes('sweet potato') || value.includes('sweetpotato')) return 120;
  if (value.includes('talong') || value.includes('eggplant')) return 14;
  if (value.includes('kamatis') || value.includes('tomato')) return 2;

  return 120;
};

const getExpectedHarvestDate = (dateString, cropName = '') => {
  if (!dateString) return '';
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + getCropHarvestDays(cropName));
  return date.toISOString().split('T')[0];
};

const getBestFieldForCrop = (cropName) => {
  const value = (cropName || '').trim().toLowerCase();

  if (!value) return '';

  const lowlandCrops = ['rice', 'corn', 'pechay', 'cucumber', 'tomato'];
  const uplandCrops = ['sweet potato', 'sweetpotato', 'peanut', 'beans', 'eggplant'];

  if (lowlandCrops.some((crop) => value.includes(crop))) return getFieldLabel('Field 1');
  if (uplandCrops.some((crop) => value.includes(crop))) return getFieldLabel('Field 2');

  return '';
};

function CropDashboard({ crops = [], setCrops = () => {} }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', variety: '', datePlanted: '', field: '', expectedHarvestDate: '', status: 'Planted' });
  // static farmer icon will be shown on the right side

  const onOpen = () => setShowAdd(true);
  const onClose = () => setShowAdd(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === 'name') {
        const recommendedField = getBestFieldForCrop(value);
        const nextHarvestDate = prev.datePlanted ? getExpectedHarvestDate(prev.datePlanted, value) : prev.expectedHarvestDate;
        return {
          ...prev,
          name: value,
          field: recommendedField || prev.field,
          expectedHarvestDate: nextHarvestDate
        };
      }

      if (name === 'field' && getBestFieldForCrop(prev.name)) {
        return { ...prev, field: getBestFieldForCrop(prev.name) };
      }

      return { ...prev, [name]: value };
    });
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Please enter a crop name.');

    try {
      const { data, error } = await supabase
        .from('crops')
        .insert([{
          name: form.name,
          variety: form.variety,
          date_planted: form.datePlanted,
          status: 'Planted'
        }])
        .select()
        .single();

      if (error) throw error;

      const created = {
        id: data.id,
        name: data.name,
        field: data.field || null,
        variety: data.variety || '',
        date_planted: data.date_planted || null,
        status: data.status || 'Planted',
        stock: { amount: Number(data.stock_amt) || 0, unit: data.stock_unit || '' },
        color: data.color || '#e8f5e9'
      };

      setCrops((prev) => [created, ...prev]);
      setForm({ name: '', variety: '', datePlanted: '', status: 'Planted' });
      setShowAdd(false);
      alert('Crop saved successfully!');
    } catch (err) {
      console.error('Error saving crop:', err);
      alert('Error saving crop: ' + (err?.message || String(err)));
    }
  };

  return (
    <div className="dashboard">
      <div className="welcome-banner">
        <div className="welcome-content">
          <h2>AgriTrack</h2>
          <p>Smart farm assistant for smallholder growers — track plantings, inventory, and harvests.</p>
        </div>
      </div>

      <section className="hero-row">
        <div className="hero-left">
          <div className="hero-card">
            <h3>How it works</h3>
            <p>Record crops, monitor growth stages, and track inventory in one place. Quick insights help you plan and harvest efficiently.</p>

            <h4>For</h4>
            <p>Farm owners, supervisors, and farm workers who need an easy tool to log and monitor crops.</p>

            <div style={{ marginTop: 18 }}>
              <button className="start-planting-btn" onClick={onOpen}>Start Planting</button>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="carousel-card farmer-icon-card">
            <div className="farmer-icon">
              {/* Replace this image by placing agritrack-logo.png in the project's public/ folder */}
              <img src="/agritrack-logo.png" alt="AgriTrack" className="agritrack-logo" />
            </div>
            <div className="carousel-caption" style={{ padding: 12, color: '#1b5e20', fontWeight: 700 }}>AgriTrack</div>
          </div>
        </div>
      </section>

      {showAdd && (
        <div className="crop-form-overlay" onClick={onClose}>
          <div className="crop-form-shell" onClick={(e) => e.stopPropagation()}>
            <div className="crop-form-shell-header">
              <div>
                <h3>Add Crop Record</h3>
                <p>Fill in the crop details to create a new record.</p>
              </div>
              <button className="crop-form-close-btn" onClick={onClose} aria-label="Close">×</button>
            </div>

            <form style={{ padding: 12 }} onSubmit={onSave}>
              <div className="form-row">
                <div className="form-group">
                  <label>Crop Name *</label>
                  <input name="name" value={form.name} onChange={onChange} placeholder="Enter crop name (e.g., Rice)" required />
                </div>
                <div className="form-group">
                  <label>Variety</label>
                  <input name="variety" value={form.variety} onChange={onChange} placeholder="Enter variety (e.g., NSIC Rc 222)" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date Planted</label>
                  <input name="datePlanted" value={form.datePlanted} onChange={onChange} placeholder="mm/dd/yyyy" />
                </div>
                <div className="form-group">
                  <label>Field Where Planted</label>
                  <select
                    name="field"
                    value={form.field}
                    onChange={onChange}
                    disabled={Boolean(getBestFieldForCrop(form.name))}
                  >
                    <option value="">Select field</option>
                    <option value="Field 1 - Lower Farm / Lowland">Field 1 - Lower Farm / Lowland</option>
                    <option value="Field 2 - Higher Farm / Upland">Field 2 - Higher Farm / Upland</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <input
                  name="status"
                  value={form.status}
                  onChange={onChange}
                  placeholder="Type or select Planted or Harvested"
                  list="crop-status-options"
                />
                <datalist id="crop-status-options">
                  <option value="Planted" />
                  <option value="Harvested" />
                </datalist>
              </div>

              <div className="form-actions">
                <button className="btn btn-primary" type="submit">Save Crop</button>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CropDashboard;
