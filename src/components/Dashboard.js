import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Dashboard.css';

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

const getFieldLabel = (fieldKey) => {
  const fieldMap = {
    'Field 1': 'Field 1 - Lower Farm / Lowland',
    'Field 2': 'Field 2 - Higher Farm / Upland'
  };

  return fieldMap[fieldKey] || fieldKey;
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

function Dashboard({ setCrops = () => {} }) {
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [form, setForm] = useState({
    cropName: '',
    variety: '',
    field: '',
    datePlanted: '',
    expectedHarvestDate: '',
    plantedBy: '',
    inputsProvided: '',
    status: 'Planted'
  });

  useEffect(() => {
    if (!form.datePlanted) {
      setForm((prev) => ({ ...prev, expectedHarvestDate: '' }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      expectedHarvestDate: getExpectedHarvestDate(prev.datePlanted, prev.cropName)
    }));
  }, [form.datePlanted]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === 'cropName') {
        const recommendedField = getBestFieldForCrop(value);
        const nextHarvestDate = prev.datePlanted ? getExpectedHarvestDate(prev.datePlanted, value) : prev.expectedHarvestDate;
        return {
          ...prev,
          cropName: value,
          field: recommendedField || prev.field,
          expectedHarvestDate: nextHarvestDate
        };
      }

      if (name === 'field' && getBestFieldForCrop(prev.cropName)) {
        return { ...prev, field: getBestFieldForCrop(prev.cropName) };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.cropName.trim()) {
      return;
    }

    const localSave = () => {
      const saved = {
        id: Date.now(),
        name: form.cropName,
        field: form.field || '',
        variety: form.variety || '',
        date_planted: form.datePlanted || null,
        expected_harvest_date: form.expectedHarvestDate || getExpectedHarvestDate(form.datePlanted, form.cropName),
        planted_by: form.plantedBy || '',
        inputs_provided: form.inputsProvided || '',
        status: form.status || 'Planted',
        color: '#e8f5e9'
      };

      try {
        const existing = JSON.parse(localStorage.getItem('agriTrack-crops') || '[]');
        localStorage.setItem('agriTrack-crops', JSON.stringify([saved, ...existing]));
      } catch (storageErr) {
        console.warn('Local storage unavailable', storageErr);
      }

      if (typeof setCrops === 'function') {
        setCrops((prev) => [saved, ...prev]);
      }

      setForm({
        cropName: '',
        variety: '',
        field: '',
        datePlanted: '',
        expectedHarvestDate: '',
        plantedBy: '',
        inputsProvided: '',
        status: 'Planted'
      });
      setShowAddCrop(false);
      alert('Crop saved locally. Please check the Supabase connection if the record does not appear in the database.');
    };

    try {
      const { data, error } = await supabase
        .from('crops')
        .insert([{
          name: form.cropName,
          variety: form.variety,
          field: form.field,
          date_planted: form.datePlanted,
          expected_harvest_date: form.expectedHarvestDate || getExpectedHarvestDate(form.datePlanted, form.cropName),
          planted_by: form.plantedBy,
          inputs_provided: form.inputsProvided,
          status: form.status || 'Planted'
        }])
        .select()
        .single();

      if (error) throw error;

      const created = {
        id: data.id,
        name: data.name,
        field: data.field || '',
        variety: data.variety || '',
        date_planted: data.date_planted || null,
        expected_harvest_date: data.expected_harvest_date || null,
        planted_by: data.planted_by || '',
        inputs_provided: data.inputs_provided || '',
        status: data.status || 'Planted',
        color: data.color || '#e8f5e9'
      };

      setForm({
        cropName: '',
        variety: '',
        field: '',
        datePlanted: '',
        expectedHarvestDate: '',
        plantedBy: '',
        inputsProvided: '',
        status: 'Planted'
      });

      setShowAddCrop(false);
      if (typeof setCrops === 'function') {
        setCrops((prev) => [created, ...prev]);
      }
    } catch (err) {
      console.error('Error saving crop from dashboard:', err);
      localSave();
    }
  };

  return (
    <div className="dashboard layout-v2">
      <header className="hero-banner rounded hero-block">
        <div className="hero-inner">
          <div className="hero-left-copy">
            <div className="welcome-pill">Welcome back!</div>
            <h1 className="hero-title">Grow Smarter, <span className="accent">Harvest Better</span></h1>
            <p className="hero-sub">AgriTrack helps you manage your farm with ease — from planting to harvest.</p>
            <div className="hero-ctas">
              <button className="btn btn-primary start-planting" onClick={() => setShowAddCrop(true)}>
                🌱 Start Planting <span className="arrow">➜</span>
              </button>
            </div>
          </div>

          <div className="hero-visual" aria-label="AgriTrack logo area">
            <img src="/agritrack-logo.png" alt="AgriTrack" className="hero-logo" />
          </div>
        </div>
      </header>

      <main className="dashboard-main">
      </main>

      {showAddCrop && (
        <div className="crop-form-overlay" onClick={() => setShowAddCrop(false)}>
          <div className="crop-form-shell dashboard-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crop-form-shell-header">
              <div>
                <h3>Add Crop Record</h3>
                <p>Fill in the crop details to create a new record.</p>
              </div>
              <button className="crop-form-close-btn" onClick={() => setShowAddCrop(false)} aria-label="Close">×</button>
            </div>

            <form onSubmit={handleSubmit} className="dashboard-modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Crop Name *</label>
                  <input name="cropName" value={form.cropName} onChange={handleChange} placeholder="Enter crop name (e.g., Rice)" required />
                </div>
                <div className="form-group">
                  <label>Crop Variety</label>
                  <input name="variety" value={form.variety} onChange={handleChange} placeholder="Enter variety (e.g., NSIC Rc 222)" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Field Where Planted</label>
                  <select
                    name="field"
                    value={form.field}
                    onChange={handleChange}
                    disabled={Boolean(getBestFieldForCrop(form.cropName))}
                  >
                    <option value="">Select field</option>
                    <option value="Field 1 - Lower Farm / Lowland">Field 1 - Lower Farm / Lowland</option>
                    <option value="Field 2 - Higher Farm / Upland">Field 2 - Higher Farm / Upland</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Person Who Planted</label>
                  <input name="plantedBy" value={form.plantedBy} onChange={handleChange} placeholder="Enter planter name" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Planting Date</label>
                  <input type="date" name="datePlanted" value={form.datePlanted} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Expected Harvest Date</label>
                  <input type="date" name="expectedHarvestDate" value={form.expectedHarvestDate} readOnly />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Inputs Provided</label>
                  <input name="inputsProvided" value={form.inputsProvided} onChange={handleChange} placeholder="e.g., Urea, Compost, Organic fertilizer" />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={form.status} onChange={handleChange}>
                    <option value="Planted">Planted</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn btn-primary" type="submit">Save Crop</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCrop(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
