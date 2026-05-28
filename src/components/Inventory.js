import React, { useMemo, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/FarmRecords.css';

function Inventory({ crops = [] }) {
  const [activeTab, setActiveTab] = useState('crops');
  const [inputs, setInputs] = useState([]);
  const [loadingInputs, setLoadingInputs] = useState(true);
  const [equipment, setEquipment] = useState([]);
  const [fuels, setFuels] = useState([]);
  const [harvests, setHarvests] = useState([]);

  // Fetch inputs and subscribe to realtime changes so Inventory updates when FarmRecords changes data
  useEffect(() => {
    let mounted = true;

    async function loadInputs() {
      setLoadingInputs(true);
      try {
        const { data, error } = await supabase.from('inputs').select('*').order('id', { ascending: false });
        if (!mounted) return;
        if (error) {
          console.error('Error loading inputs:', error);
        } else {
          setInputs((data || []).map((it) => ({
            id: it.id,
            name: it.name,
            type: it.type,
            quantity: it.quantity,
            unit: it.unit,
            dateAdded: it.date_added,
            status: it.status
          })));
        }
      } catch (err) {
        console.error('Exception loading inputs', err);
      } finally {
        setLoadingInputs(false);
      }
    }

    loadInputs();

    // fetch equipment, fuels, harvests so Inventory tabs have data
    (async function loadOther() {
      try {
        const { data: equipmentData, error: equipmentError } = await supabase.from('equipment').select();
        if (!equipmentError && equipmentData) {
          setEquipment(equipmentData.map(item => ({ id: item.id, name: item.name, type: item.type, status: item.status, lastMaintenance: item.last_maintenance, cost: item.cost })));
        }

        const { data: fuelsData, error: fuelsError } = await supabase.from('fuels').select();
        if (!fuelsError && fuelsData) {
          setFuels(fuelsData.map(item => ({ id: item.id, type: item.type, quantity: item.quantity, unit: item.unit, date: item.date, cost: item.cost })));
        }

        const { data: harvestsData, error: harvestsError } = await supabase.from('harvests').select();
        if (!harvestsError && harvestsData) {
          setHarvests(harvestsData.map(item => ({ id: item.id, cropName: item.crop_name, quantity: item.quantity, unit: item.unit, dateHarvested: item.date_harvested, status: item.status })));
        }
      } catch (err) {
        console.error('Error loading inventory related tables', err);
      }
    })();

    const channel = supabase
      .channel('inputs-inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inputs' }, (payload) => {
        const row = payload.new;
        const oldRow = payload.old;
        if (payload.eventType === 'INSERT' && row) {
          setInputs((prev) => [{
            id: row.id,
            name: row.name,
            type: row.type,
            quantity: row.quantity,
            unit: row.unit,
            dateAdded: row.date_added,
            status: row.status
          }, ...prev]);
        }
        if (payload.eventType === 'UPDATE' && row) {
          setInputs((prev) => prev.map((it) => (it.id === row.id ? { id: row.id, name: row.name, type: row.type, quantity: row.quantity, unit: row.unit, dateAdded: row.date_added, status: row.status } : it)));
        }
        if (payload.eventType === 'DELETE') {
          setInputs((prev) => prev.filter((it) => it.id !== (oldRow?.id || row?.id)));
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper function to determine if an input is low stock
  const isLowStock = (quantity) => {
    return Number(quantity || 0) <= 3;
  };

  // Helper function to get the status label for an input
  const getInputStatus = (quantity) => {
    return isLowStock(quantity) ? 'Low Stock' : 'In Stock';
  };

  const stats = useMemo(() => {
    const totalItems = crops.length;
    const totalStockKg = crops.reduce((sum, crop) => sum + (Number(crop.stock?.amount) || 0), 0);
    const lowStockCount = crops.filter((crop) => (Number(crop.stock?.amount) || 0) < 500).length;
    const totalInputs = inputs.length;
    // Count inputs with quantity <= 3 as low stock
    const lowStockInputs = inputs.filter((input) => isLowStock(input.quantity)).length;
    // Calculate total input stock quantity grouped by unit type
    const inputsByUnit = inputs.reduce((acc, input) => {
      const unit = input.unit || 'units';
      const quantity = Number(input.quantity) || 0;
      if (!acc[unit]) {
        acc[unit] = 0;
      }
      acc[unit] += quantity;
      return acc;
    }, {});
    // Format total inventory by unit
    const totalInventoryByUnit = Object.entries(inputsByUnit).length > 0
      ? Object.entries(inputsByUnit).map(([unit, qty]) => `${qty} ${unit}`).join(', ')
      : '0 units';

    return { totalItems, totalStockKg, lowStockCount, totalInputs, lowStockInputs, totalInventoryByUnit };
  }, [crops, inputs]);

  return (
        <section className="farm-records inventory-page">
          <div className="farm-records-container inventory-page-container">
            <header className="farm-records-header">
              <h1>Inventory Overview</h1>
              <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>Track crop stock levels and quickly identify low inventory.</p>
            </header>

            {/* Tabs */}
            <div className="farm-records-tabs">
              <button className={`tab-button ${activeTab === 'crops' ? 'active' : ''}`} onClick={() => setActiveTab('crops')}>🌾 Crops</button>
              <button className={`tab-button ${activeTab === 'inputs' ? 'active' : ''}`} onClick={() => setActiveTab('inputs')}>📦 Inputs</button>
              <button className={`tab-button ${activeTab === 'equipment' ? 'active' : ''}`} onClick={() => setActiveTab('equipment')}>🚜 Equipment</button>
              <button className={`tab-button ${activeTab === 'fuel' ? 'active' : ''}`} onClick={() => setActiveTab('fuel')}>⚙️ Fuel</button>
              <button className={`tab-button ${activeTab === 'harvest' ? 'active' : ''}`} onClick={() => setActiveTab('harvest')}>🌾 Harvest</button>
            </div>

            <div className="tab-content">
              <div className="inventory-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <article className="crop-form-card">
                  <span>Total Crop Items</span>
                  <strong style={{ display: 'block', marginTop: 8, fontSize: 20 }}>{stats.totalItems}</strong>
                </article>
                <article className="crop-form-card">
                  <span>Total Input Stock</span>
                  <strong style={{ display: 'block', marginTop: 8, fontSize: 20 }}>{stats.totalInventoryByUnit.length > 30 ? stats.totalInventoryByUnit.substring(0, 30) + '...' : stats.totalInventoryByUnit}</strong>
                </article>
                <article className="crop-form-card">
                  <span>Low Stock Items</span>
                  <strong style={{ display: 'block', marginTop: 8, fontSize: 20, color: stats.lowStockInputs > 0 ? '#d84315' : '#2d7a3e' }}>{stats.lowStockInputs}</strong>
                </article>
                <article className="crop-form-card">
                  <span>Input Records</span>
                  <strong style={{ display: 'block', marginTop: 8, fontSize: 20 }}>{stats.totalInputs}</strong>
                </article>
              </div>

              {/* Tab content: render per activeTab */}
              {activeTab === 'crops' && (
                <>
                  <article className="crop-form-card">
                    <h2 style={{ marginTop: 0 }}>Crop Inventory</h2>
                    <div className="table-wrapper">
                      <table className="records-table">
                        <thead>
                          <tr>
                            <th>Crop</th>
                            <th>Area</th>
                            <th>Variety</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {crops.length === 0 ? (
                            <tr>
                              <td colSpan="4">No inventory records yet.</td>
                            </tr>
                          ) : (
                            crops.map((crop) => {
                              const areaValue = crop.area || crop.field || '-';
                              const varietyValue = crop.variety || '-';

                              return (
                                <tr key={`crop-${crop.id}`}>
                                  <td className="crop-name">{crop.name}</td>
                                  <td>{areaValue}</td>
                                  <td>{varietyValue}</td>
                                  <td>{crop.status || 'Growing'}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </>
              )}

              {activeTab === 'inputs' && (
                <article className="crop-form-card">
                  <h2 style={{ marginTop: 0 }}>Input Inventory</h2>
                  <div className="table-wrapper">
                    <table className="records-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Quantity</th>
                          <th>Unit</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingInputs ? (
                          <tr><td colSpan="5">Loading inputs...</td></tr>
                        ) : inputs.length === 0 ? (
                          <tr><td colSpan="5">No input records.</td></tr>
                        ) : (
                          inputs.map((it) => {
                            const calculatedStatus = getInputStatus(it.quantity);
                            const statusColor = isLowStock(it.quantity) ? { background: '#fff3e0', color: '#d84315' } : { background: '#e8f5e9', color: '#2d7a3e' };
                            return (
                              <tr key={`input-${it.id}`}>
                                <td>{it.name}</td>
                                <td>{it.type || '-'}</td>
                                <td>{it.quantity || 0}</td>
                                <td>{it.unit || '-'}</td>
                                <td><span className="status-badge" style={statusColor}>{calculatedStatus}</span></td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              )}

              {activeTab === 'equipment' && (
                <article className="crop-form-card">
                  <h2 style={{ marginTop: 0 }}>Equipment Inventory</h2>
                  <div className="table-wrapper">
                    <table className="records-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Last Maintenance</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipment.length === 0 ? (
                          <tr><td colSpan="5">No equipment records.</td></tr>
                        ) : (
                          equipment.map((it) => (
                            <tr key={`eq-${it.id}`}>
                              <td className="crop-name">{it.name}</td>
                              <td>{it.type || '-'}</td>
                              <td><span className="status-badge">{it.status}</span></td>
                              <td>{it.lastMaintenance || '-'}</td>
                              <td>₱{it.cost != null ? it.cost : '0'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              )}

              {activeTab === 'fuel' && (
                <article className="crop-form-card">
                  <h2 style={{ marginTop: 0 }}>Fuel Inventory</h2>
                  <div className="table-wrapper">
                    <table className="records-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Quantity</th>
                          <th>Unit</th>
                          <th>Date</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fuels.length === 0 ? (
                          <tr><td colSpan="5">No fuel records.</td></tr>
                        ) : (
                          fuels.map((it) => (
                            <tr key={`fuel-${it.id}`}>
                              <td className="crop-name">{it.type}</td>
                              <td>{it.quantity || 0}</td>
                              <td>{it.unit || '-'}</td>
                              <td>{it.date || '-'}</td>
                              <td>₱{it.cost != null ? it.cost : '0'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              )}

              {activeTab === 'harvest' && (
                <article className="crop-form-card">
                  <h2 style={{ marginTop: 0 }}>Harvest Inventory</h2>
                  <div className="table-wrapper">
                    <table className="records-table">
                      <thead>
                        <tr>
                          <th>Crop</th>
                          <th>Quantity</th>
                          <th>Unit</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {harvests.length === 0 ? (
                          <tr><td colSpan="5">No harvest records.</td></tr>
                        ) : (
                          harvests.map((it) => (
                            <tr key={`h-${it.id}`}>
                              <td className="crop-name">{it.cropName}</td>
                              <td>{it.quantity || 0}</td>
                              <td>{it.unit || '-'}</td>
                              <td>{it.dateHarvested || '-'}</td>
                              <td><span className="status-badge">{it.status}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              )}

            </div>
          </div>
        </section>
      );
}

export default Inventory;
