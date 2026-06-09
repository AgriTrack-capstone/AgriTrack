import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/FarmRecords.css';

function FarmRecords({ crops = [], setCrops = () => {}, records = [], setRecords = () => {} }) {
  const [activeTab, setActiveTab] = useState('crops');
  const [showCropForm, setShowCropForm] = useState(false);
  const [showInputForm, setShowInputForm] = useState(false);
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cropForm, setCropForm] = useState({ name: '', variety: '', datePlanted: '', area: '', status: 'Growing' });
  const [inputForm, setInputForm] = useState({ name: '', type: '', quantity: '', unit: '', dateAdded: '', status: 'In Stock' });
  const [equipmentForm, setEquipmentForm] = useState({ name: '', type: '', status: 'Active', lastMaintenance: '', cost: '' });
  const [fuelForm, setFuelForm] = useState({ type: 'Diesel', quantity: '', unit: 'liters', date: '', cost: '', fuelType: 'Diesel' });
  const [harvestForm, setHarvestForm] = useState({ cropName: '', quantity: '', unit: 'kg', dateHarvested: '', status: 'Harvested' });
  const [inputs, setInputs] = useState([]);
  const [toast, setToast] = useState('');
  const [equipment, setEquipment] = useState([]);
  const [fuels, setFuels] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [editCropId, setEditCropId] = useState(null);
  const [editInputId, setEditInputId] = useState(null);
  const [editEquipmentId, setEditEquipmentId] = useState(null);
  const [editFuelId, setEditFuelId] = useState(null);
  const [editHarvestId, setEditHarvestId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Helper function to determine if an input is low stock
  const isLowStock = (quantity) => {
    return Number(quantity || 0) <= 3;
  };

  // Helper function to get the status label for an input
  const getInputStatus = (quantity) => {
    return isLowStock(quantity) ? 'Low Stock' : 'In Stock';
  };

  // auto-clear toasts after a short delay
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // Fetch all data from Supabase on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch inputs - transform snake_case to camelCase
        const { data: inputsData, error: inputsError } = await supabase.from('inputs').select();
        if (inputsError) throw inputsError;
        if (inputsData) {
          const transformed = inputsData.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            quantity: item.quantity,
            unit: item.unit,
            dateAdded: item.date_added,
            status: item.status
          }));
          setInputs(transformed);
        }

        // Fetch equipment - transform snake_case to camelCase
        const { data: equipmentData, error: equipmentError } = await supabase.from('equipment').select();
        if (equipmentError) throw equipmentError;
        if (equipmentData) {
          const transformed = equipmentData.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            status: item.status,
            lastMaintenance: item.last_maintenance,
            cost: item.cost
          }));
          setEquipment(transformed);
        }

        // Fetch fuels
        const { data: fuelsData, error: fuelsError } = await supabase.from('fuels').select();
        if (fuelsError) throw fuelsError;
        if (fuelsData) {
          const transformed = fuelsData.map(item => ({
            id: item.id,
            type: item.type,
            quantity: item.quantity,
            unit: item.unit,
            date: item.date,
            cost: item.cost
          }));
          setFuels(transformed);
        }

        // Fetch harvests - transform snake_case to camelCase
        const { data: harvestsData, error: harvestsError } = await supabase.from('harvests').select();
        if (harvestsError) throw harvestsError;
        if (harvestsData) {
          const transformed = harvestsData.map(item => ({
            id: item.id,
            cropName: item.crop_name,
            quantity: item.quantity,
            unit: item.unit,
            dateHarvested: item.date_harvested,
            status: item.status
          }));
          setHarvests(transformed);
        }

        // subscribe to inputs realtime changes so UI updates when inserts/updates happen elsewhere
        // (we also set up a dedicated subscription below outside this fetch function)
        // NOTE: Crops are managed by parent App.js which has real-time subscriptions
        // FarmRecords receives crops via props. Do NOT fetch crops here to avoid data conflicts
      } catch (error) {
        console.error('Error fetching farm records data:', error);
        setToast('Error loading farm records: ' + (error?.message || String(error)));
      }
    };

    fetchAllData();
  }, []);

  // Realtime subscription for inputs so newly-added records appear immediately
  useEffect(() => {
    const handleInputChange = (payload) => {
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
        setInputs((prev) => prev.map((it) => (
          it.id === row.id ? { id: row.id, name: row.name, type: row.type, quantity: row.quantity, unit: row.unit, dateAdded: row.date_added, status: row.status } : it
        )));
      }

      if (payload.eventType === 'DELETE') {
        setInputs((prev) => prev.filter((it) => it.id !== (oldRow?.id || row?.id)));
      }
    };

    const channel = supabase
      .channel('inputs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inputs' }, handleInputChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredCrops = crops.filter((crop) => {
    const query = searchTerm.trim().toLowerCase();
    return !query || crop.name.toLowerCase().includes(query) || (crop.variety || '').toLowerCase().includes(query);
  });

  const handleCropInputChange = (event) => {
    const { name, value } = event.target;
    setCropForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCrop = (event) => {
    event.preventDefault();
    if (!cropForm.name.trim()) return;

    (async () => {
      try {
        if (editCropId) {
          const { data, error } = await supabase
            .from('crops')
            .update({
              name: cropForm.name,
              variety: cropForm.variety,
              date_planted: cropForm.datePlanted,
              area: parseFloat(cropForm.area) || 0,
              status: cropForm.status
            })
            .eq('id', editCropId)
            .select()
            .single();

          if (!error && data) {
            setCrops((prev) => prev.map((crop) => (
              crop.id === editCropId
                ? {
                    ...crop,
                    name: data.name,
                    variety: data.variety,
                    datePlanted: data.date_planted,
                    area: data.area,
                    status: data.status
                  }
                : crop
            )));
            alert('Crop updated successfully!');
          } else if (error) {
            alert('Error updating crop: ' + error.message);
          }
        } else {
          const { data, error } = await supabase
            .from('crops')
            .insert([{
              name: cropForm.name,
              variety: cropForm.variety,
              date_planted: cropForm.datePlanted,
              area: parseFloat(cropForm.area) || 0,
              status: cropForm.status
            }])
            .select()
            .single();

          if (!error && data) {
            const created = {
              id: data.id,
              name: data.name,
              variety: data.variety,
              datePlanted: data.date_planted,
              area: data.area,
              status: data.status
            };
            setCrops((prev) => [created, ...prev]);
            alert('Crop saved successfully!');
          } else if (error) {
            alert('Error saving crop: ' + error.message);
          }
        }
      } catch (error) {
        console.error('Supabase save crop error', error);
      }
    })();

    setCropForm({ name: '', variety: '', datePlanted: '', area: '', status: 'Growing' });
    setEditCropId(null);
    setShowCropForm(false);
  };

  const handleEditCrop = (crop) => {
    setCropForm({
      name: crop.name || '',
      variety: crop.variety || '',
      datePlanted: crop.date_planted || crop.datePlanted || '',
      area: crop.area || '',
      status: crop.status || 'Growing'
    });
    setEditCropId(crop.id);
    setShowCropForm(true);
  };

  const handleDeleteCrop = (cropId) => {
    if (window.confirm('Are you sure you want to delete this crop?')) {
      (async () => {
        try {
          const crop = crops.find((c) => c.id === cropId);
          
          // Create deletion transaction record
          if (crop) {
            await createTransactionRecord(
              `Deleted crop: ${crop.name}`,
              crop.area || 'General',
              crop.name,
              0,
              'unit',
              `Crop record deleted: ${crop.name}`,
              'Deleted'
            );
          }
          
          const { error } = await supabase
            .from('crops')
            .delete()
            .eq('id', cropId);

          if (error) {
            throw error;
          } else {
            setCrops((prev) => prev.filter((crop) => crop.id !== cropId));
            alert('Crop deleted successfully!');
          }
        } catch (error) {
          console.error('Error deleting crop:', error);
          alert('Error deleting crop: ' + error.message);
        }
      })();
    }
  };

  const toggleMenu = (cropId) => {
    setMenuOpenId(menuOpenId === cropId ? null : cropId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Growing':
        return '#4caf50';
      case 'Planned':
        return '#2196f3';
      case 'Harvested':
        return '#ff9800';
      case 'Active':
        return '#4caf50';
      case 'In Stock':
        return '#4caf50';
      case 'Low Stock':
        return '#ff9800';
      case 'Out of Stock':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  // ============ TRANSACTION RECORD HELPERS ============
  // Create a transaction record for inventory tracking
  const createTransactionRecord = async (title, field, crop, quantity, unit, notes, status = 'Completed') => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('records')
        .insert([{
          title,
          field: field || 'General',
          crop: crop || 'Various',
          qty_amount: quantity,
          qty_unit: unit || 'unit',
          schedule_at: now,
          notes,
          status
        }]);

      if (error) {
        console.error('Error creating transaction record:', error);
      }
    } catch (error) {
      console.error('Error creating transaction record:', error);
    }
  };

  // ============ INPUT HANDLERS ============
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setInputForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveInput = (event) => {
    event.preventDefault();
    if (!inputForm.name.trim()) return;

    (async () => {
      try {
        if (editInputId) {
          const { data, error } = await supabase
            .from('inputs')
            .update({
              name: inputForm.name,
              type: inputForm.type,
              quantity: parseFloat(inputForm.quantity) || 0,
              unit: inputForm.unit,
              date_added: inputForm.dateAdded,
              status: inputForm.status
            })
            .eq('id', editInputId)
            .select()
            .single();

          if (!error && data) {
            setInputs((prev) => prev.map((item) => (
              item.id === editInputId
                ? { ...item, name: data.name, type: data.type, quantity: data.quantity, unit: data.unit, dateAdded: data.date_added, status: data.status }
                : item
            )));
            
            // Create transaction record for updated input
            await createTransactionRecord(
              `Updated input: ${inputForm.name}`,
              'General',
              inputForm.type,
              parseFloat(inputForm.quantity) || 0,
              inputForm.unit,
              `Input record updated: ${inputForm.name}`,
              'Completed'
            );
            
            alert('Input record updated successfully!');
          } else if (error) {
            alert('Error updating input: ' + error.message);
          }
        } else {
          const result = await supabase
            .from('inputs')
            .insert([{
              name: inputForm.name,
              type: inputForm.type,
              quantity: parseFloat(inputForm.quantity) || 0,
              unit: inputForm.unit,
              date_added: inputForm.dateAdded,
              status: inputForm.status
            }])
            .select();

          const { data, error } = result;

          if (error) {
            setToast('Error saving input.');
          } else if (data) {
            // Supabase may return an array; take first item if so.
            const created = Array.isArray(data) ? data[0] : data;
            if (created) {
              setInputs((prev) => [{ id: created.id, name: created.name, type: created.type, quantity: created.quantity, unit: created.unit, dateAdded: created.date_added, status: created.status }, ...prev]);
              
              // Create transaction record for reports
              await createTransactionRecord(
                `Added ${inputForm.name}`,
                'General',
                inputForm.type,
                parseFloat(inputForm.quantity) || 0,
                inputForm.unit,
                `Input received: ${inputForm.name}`,
                'Completed'
              );
              
              setToast('Input record saved successfully!');
            }
          }
        }
      } catch (error) {
        console.error('Error saving input:', error);
      }
    })();

    setInputForm({ name: '', type: '', quantity: '', unit: '', dateAdded: '', status: 'In Stock' });
    setEditInputId(null);
    setShowInputForm(false);
  };

  const handleEditInput = (item) => {
    setInputForm({
      name: item.name || '',
      type: item.type || '',
      quantity: item.quantity || '',
      unit: item.unit || '',
      dateAdded: item.dateAdded || '',
      status: item.status || 'In Stock'
    });
    setEditInputId(item.id);
    setShowInputForm(true);
  };

  const handleDeleteInput = (inputId) => {
    if (window.confirm('Delete this input record?')) {
      (async () => {
        try {
          const input = inputs.find((i) => i.id === inputId);
          
          // Create deletion transaction record
          if (input) {
            await createTransactionRecord(
              `Deleted input: ${input.name}`,
              'General',
              input.type,
              input.quantity || 0,
              input.unit,
              `Input record deleted: ${input.name}`,
              'Deleted'
            );
          }
          
          const { error } = await supabase.from('inputs').delete().eq('id', inputId);
          if (error) throw error;
          setInputs((prev) => prev.filter((item) => item.id !== inputId));
          alert('Input record deleted successfully!');
        } catch (error) {
          console.error('Error deleting input:', error);
          alert('Error deleting input: ' + error.message);
        }
      })();
    }
  };

  // ============ EQUIPMENT HANDLERS ============
  const handleEquipmentChange = (event) => {
    const { name, value } = event.target;
    setEquipmentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEquipment = (event) => {
    event.preventDefault();
    if (!equipmentForm.name.trim()) return;

    (async () => {
      try {
        if (editEquipmentId) {
          const { data, error } = await supabase
            .from('equipment')
            .update({
              name: equipmentForm.name,
              type: equipmentForm.type,
              status: equipmentForm.status,
              last_maintenance: equipmentForm.lastMaintenance,
              cost: parseFloat(equipmentForm.cost) || 0
            })
            .eq('id', editEquipmentId)
            .select()
            .single();

          if (!error && data) {
            setEquipment((prev) => prev.map((item) => (
              item.id === editEquipmentId
                ? { ...item, name: data.name, type: data.type, status: data.status, lastMaintenance: data.last_maintenance, cost: data.cost }
                : item
            )));
            
            // Create transaction record for equipment maintenance
            await createTransactionRecord(
              `Equipment maintained: ${equipmentForm.name}`,
              'General',
              equipmentForm.type,
              1,
              'unit',
              `Equipment update: ${equipmentForm.name} - Status: ${equipmentForm.status}`,
              'Completed'
            );
            
            alert('Equipment record updated successfully!');
          } else if (error) {
            alert('Error updating equipment: ' + error.message);
          }
        } else {
          const { data, error } = await supabase
            .from('equipment')
            .insert([{
              name: equipmentForm.name,
              type: equipmentForm.type,
              status: equipmentForm.status,
              last_maintenance: equipmentForm.lastMaintenance,
              cost: parseFloat(equipmentForm.cost) || 0
            }])
            .select()
            .single();

          if (!error && data) {
            setEquipment((prev) => [...prev, { id: data.id, name: data.name, type: data.type, status: data.status, lastMaintenance: data.last_maintenance, cost: data.cost }]);
            
            // Create transaction record for reports
            await createTransactionRecord(
              `Equipment recorded: ${equipmentForm.name}`,
              'General',
              equipmentForm.type,
              1,
              'unit',
              `Equipment maintenance: ${equipmentForm.name} - ${equipmentForm.status}`,
              'Completed'
            );
            
            alert('Equipment record saved successfully!');
          } else if (error) {
            alert('Error saving equipment: ' + error.message);
          }
        }
      } catch (error) {
        console.error('Error saving equipment:', error);
      }
    })();

    setEquipmentForm({ name: '', type: '', status: 'Active', lastMaintenance: '', cost: '' });
    setEditEquipmentId(null);
    setShowEquipmentForm(false);
  };

  const handleEditEquipment = (item) => {
    setEquipmentForm({
      name: item.name,
      type: item.type || '',
      status: item.status || 'Active',
      lastMaintenance: item.lastMaintenance || '',
      cost: item.cost || ''
    });
    setEditEquipmentId(item.id);
    setShowEquipmentForm(true);
  };

  const handleDeleteEquipment = (equipmentId) => {
    if (window.confirm('Delete this equipment record?')) {
      (async () => {
        try {
          const equipment_item = equipment.find((e) => e.id === equipmentId);
          
          // Create deletion transaction record
          if (equipment_item) {
            await createTransactionRecord(
              `Deleted equipment: ${equipment_item.name}`,
              'General',
              equipment_item.type,
              1,
              'unit',
              `Equipment record deleted: ${equipment_item.name} - Cost: ₱${equipment_item.cost || '0'}`,
              'Deleted'
            );
          }
          
          const { error } = await supabase.from('equipment').delete().eq('id', equipmentId);
          if (error) throw error;
          setEquipment((prev) => prev.filter((item) => item.id !== equipmentId));
          alert('Equipment record deleted successfully!');
        } catch (error) {
          console.error('Error deleting equipment:', error);
          alert('Error deleting equipment: ' + error.message);
        }
      })();
    }
  };

  // ============ FUEL HANDLERS ============
  const handleFuelChange = (event) => {
    const { name, value } = event.target;
    setFuelForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveFuel = (event) => {
    event.preventDefault();
    if (!fuelForm.quantity) return;

    (async () => {
      try {
        if (editFuelId) {
          const { data, error } = await supabase
            .from('fuels')
            .update({
              type: fuelForm.fuelType,
              quantity: parseFloat(fuelForm.quantity) || 0,
              unit: fuelForm.unit,
              date: fuelForm.date,
              cost: parseFloat(fuelForm.cost) || 0
            })
            .eq('id', editFuelId)
            .select()
            .single();

          if (!error && data) {
            setFuels((prev) => prev.map((item) => (
              item.id === editFuelId
                ? { ...item, type: data.type, quantity: data.quantity, unit: data.unit, date: data.date, cost: data.cost }
                : item
            )));
            
            // Create transaction record for fuel update
            await createTransactionRecord(
              `Fuel record updated: ${fuelForm.fuelType}`,
              'General',
              'Fuel',
              parseFloat(fuelForm.quantity) || 0,
              fuelForm.unit,
              `Updated fuel usage: ${fuelForm.fuelType}`,
              'Completed'
            );
            
            alert('Fuel record updated successfully!');
          } else if (error) {
            alert('Error updating fuel: ' + error.message);
          }
        } else {
          const { data, error } = await supabase
            .from('fuels')
            .insert([{
              type: fuelForm.fuelType,
              quantity: parseFloat(fuelForm.quantity) || 0,
              unit: fuelForm.unit,
              date: fuelForm.date,
              cost: parseFloat(fuelForm.cost) || 0
            }])
            .select()
            .single();

          if (!error && data) {
            setFuels((prev) => [...prev, { id: data.id, type: data.type, quantity: data.quantity, unit: data.unit, date: data.date, cost: data.cost }]);
            
            // Create transaction record for reports
            await createTransactionRecord(
              `Fuel consumed: ${fuelForm.fuelType}`,
              'General',
              'Fuel',
              parseFloat(fuelForm.quantity) || 0,
              fuelForm.unit,
              `Fuel usage: ${fuelForm.fuelType} - ${fuelForm.cost ? `Cost: ₱${fuelForm.cost}` : ''}`,
              'Completed'
            );
            
            alert('Fuel record saved successfully!');
          } else if (error) {
            alert('Error saving fuel: ' + error.message);
          }
        }
      } catch (error) {
        console.error('Error saving fuel:', error);
      }
    })();

    setFuelForm({ type: 'Diesel', quantity: '', unit: 'liters', date: '', cost: '', fuelType: 'Diesel' });
    setEditFuelId(null);
    setShowFuelForm(false);
  };

  const handleEditFuel = (item) => {
    setFuelForm({
      type: item.type || 'Diesel',
      quantity: item.quantity || '',
      unit: item.unit || 'liters',
      date: item.date || '',
      cost: item.cost || '',
      fuelType: item.type || 'Diesel'
    });
    setEditFuelId(item.id);
    setShowFuelForm(true);
  };

  const handleDeleteFuel = (fuelId) => {
    if (window.confirm('Delete this fuel record?')) {
      (async () => {
        try {
          const fuel = fuels.find((f) => f.id === fuelId);
          
          // Create deletion transaction record
          if (fuel) {
            await createTransactionRecord(
              `Deleted fuel: ${fuel.type}`,
              'General',
              'Fuel',
              fuel.quantity || 0,
              fuel.unit,
              `Fuel record deleted: ${fuel.type} - Cost: ₱${fuel.cost || '0'}`,
              'Deleted'
            );
          }
          
          const { error } = await supabase.from('fuels').delete().eq('id', fuelId);
          if (error) throw error;
          setFuels((prev) => prev.filter((item) => item.id !== fuelId));
          alert('Fuel record deleted successfully!');
        } catch (error) {
          console.error('Error deleting fuel:', error);
          alert('Error deleting fuel: ' + error.message);
        }
      })();
    }
  };

  // ============ HARVEST HANDLERS ============
  const handleHarvestChange = (event) => {
    const { name, value } = event.target;
    setHarvestForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveHarvest = (event) => {
    event.preventDefault();
    if (!harvestForm.cropName.trim()) return;

    (async () => {
      try {
        if (editHarvestId) {
          const { data, error } = await supabase
            .from('harvests')
            .update({
              crop_name: harvestForm.cropName,
              quantity: parseFloat(harvestForm.quantity) || 0,
              unit: harvestForm.unit,
              date_harvested: harvestForm.dateHarvested,
              status: harvestForm.status
            })
            .eq('id', editHarvestId)
            .select()
            .single();

          if (!error && data) {
            setHarvests((prev) => prev.map((item) => (
              item.id === editHarvestId
                ? { ...item, cropName: data.crop_name, quantity: data.quantity, unit: data.unit, dateHarvested: data.date_harvested, status: data.status }
                : item
            )));
            
            // Create transaction record for harvest update
            await createTransactionRecord(
              `Updated harvest: ${harvestForm.cropName}`,
              'General',
              harvestForm.cropName,
              parseFloat(harvestForm.quantity) || 0,
              harvestForm.unit,
              `Updated harvest record: ${harvestForm.cropName}`,
              harvestForm.status
            );
            
            alert('Harvest record updated successfully!');
          } else if (error) {
            alert('Error updating harvest: ' + error.message);
          }
        } else {
          const { data, error } = await supabase
            .from('harvests')
            .insert([{
              crop_name: harvestForm.cropName,
              quantity: parseFloat(harvestForm.quantity) || 0,
              unit: harvestForm.unit,
              date_harvested: harvestForm.dateHarvested,
              status: harvestForm.status
            }])
            .select()
            .single();

          if (!error && data) {
            setHarvests((prev) => [...prev, { id: data.id, cropName: data.crop_name, quantity: data.quantity, unit: data.unit, dateHarvested: data.date_harvested, status: data.status }]);
            
            // Create transaction record for reports (harvest is a "used" transaction)
            await createTransactionRecord(
              `Harvested ${harvestForm.cropName}`,
              'General',
              harvestForm.cropName,
              parseFloat(harvestForm.quantity) || 0,
              harvestForm.unit,
              `Harvest completed: ${harvestForm.cropName} - Status: ${harvestForm.status}`,
              harvestForm.status
            );
            
            alert('Harvest record saved successfully!');
          } else if (error) {
            alert('Error saving harvest: ' + error.message);
          }
        }
      } catch (error) {
        console.error('Error saving harvest:', error);
      }
    })();

    setHarvestForm({ cropName: '', quantity: '', unit: 'kg', dateHarvested: '', status: 'Harvested' });
    setEditHarvestId(null);
    setShowHarvestForm(false);
  };

  const handleEditHarvest = (item) => {
    setHarvestForm({
      cropName: item.cropName || '',
      quantity: item.quantity || '',
      unit: item.unit || 'kg',
      dateHarvested: item.dateHarvested || '',
      status: item.status || 'Harvested'
    });
    setEditHarvestId(item.id);
    setShowHarvestForm(true);
  };

  const handleDeleteHarvest = (harvestId) => {
    if (window.confirm('Delete this harvest record?')) {
      (async () => {
        try {
          const harvest = harvests.find((h) => h.id === harvestId);
          
          // Create deletion transaction record
          if (harvest) {
            await createTransactionRecord(
              `Deleted harvest: ${harvest.cropName}`,
              'General',
              harvest.cropName,
              harvest.quantity || 0,
              harvest.unit,
              `Harvest record deleted: ${harvest.cropName} - Status: ${harvest.status}`,
              'Deleted'
            );
          }
          
          const { error } = await supabase.from('harvests').delete().eq('id', harvestId);
          if (error) throw error;
          setHarvests((prev) => prev.filter((item) => item.id !== harvestId));
          alert('Harvest record deleted successfully!');
        } catch (error) {
          console.error('Error deleting harvest:', error);
          alert('Error deleting harvest: ' + error.message);
        }
      })();
    }
  };

  return (
    <div className="farm-records">
      <div className="farm-records-container">
        {/* Header */}
        <div className="farm-records-header">
          <h1>Farm Records</h1>
        </div>

        {toast && <div className="toast">{toast}</div>}

        {/* Tabs */}
        <div className="farm-records-tabs">
          <button
            className={`tab-button ${activeTab === 'crops' ? 'active' : ''}`}
            onClick={() => setActiveTab('crops')}
          >
            🌾 Crops
          </button>
          <button
            className={`tab-button ${activeTab === 'inputs' ? 'active' : ''}`}
            onClick={() => setActiveTab('inputs')}
          >
            📦 Inputs
          </button>
          <button
            className={`tab-button ${activeTab === 'equipment' ? 'active' : ''}`}
            onClick={() => setActiveTab('equipment')}
          >
            🚜 Equipment
          </button>
          <button
            className={`tab-button ${activeTab === 'fuel' ? 'active' : ''}`}
            onClick={() => setActiveTab('fuel')}
          >
            ⚙️ Fuel
          </button>
          <button
            className={`tab-button ${activeTab === 'harvest' ? 'active' : ''}`}
            onClick={() => setActiveTab('harvest')}
          >
            🌾 Harvest
          </button>
        </div>

        {/* Crops Tab */}
        {activeTab === 'crops' && (
          <div className="tab-content">
            {/* Search and Add Button */}
            <div className="tab-toolbar">
              <input
                type="text"
                placeholder="Search crops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button 
                className="add-record-btn"
                onClick={() => {
                  setCropForm({ name: '', variety: '', datePlanted: '', area: '', status: 'Growing' });
                  setEditCropId(null);
                  setShowCropForm(true);
                }}
              >
                + Add Record
              </button>
            </div>

            {/* Form */}
            {showCropForm && (
              <div className="crop-form-overlay" onClick={() => {
                setShowCropForm(false);
                setCropForm({ name: '', variety: '', datePlanted: '', area: '', status: 'Growing' });
                setEditCropId(null);
              }}>
                <div className="crop-form-card crop-form-shell" onClick={(event) => event.stopPropagation()}>
                  <div className="crop-form-shell-header">
                    <div>
                      <h3>{editCropId ? 'Edit Crop Record' : 'Add Crop Record'}</h3>
                      <p>{editCropId ? 'Update the crop details below.' : 'Fill in the crop details to create a new record.'}</p>
                    </div>
                    <button
                      type="button"
                      className="crop-form-close-btn"
                      onClick={() => {
                        setShowCropForm(false);
                        setCropForm({ name: '', variety: '', datePlanted: '', area: '', status: 'Growing' });
                        setEditCropId(null);
                      }}
                      aria-label="Close crop form"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleSaveCrop}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Crop Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={cropForm.name}
                          onChange={handleCropInputChange}
                          placeholder="Enter crop name (e.g., Rice)"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Variety</label>
                        <input
                          type="text"
                          name="variety"
                          value={cropForm.variety}
                          onChange={handleCropInputChange}
                          placeholder="Enter variety (e.g., NSIC Rc 222)"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Date Planted</label>
                        <input
                          type="date"
                          name="datePlanted"
                          value={cropForm.datePlanted}
                          onChange={handleCropInputChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Area (ha)</label>
                        <input
                          type="number"
                          name="area"
                          value={cropForm.area}
                          onChange={handleCropInputChange}
                          placeholder="Enter area"
                          step="0.01"
                        />
                      </div>
                      <div className="form-group">
                        <label>Status</label>
                        <select name="status" value={cropForm.status} onChange={handleCropInputChange}>
                          <option value="Growing">Growing</option>
                          <option value="Planned">Planned</option>
                          <option value="Harvested">Harvested</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        {editCropId ? 'Update Crop' : 'Save Crop'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowCropForm(false);
                          setCropForm({ name: '', variety: '', datePlanted: '', area: '', status: 'Growing' });
                          setEditCropId(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Table */}
            {filteredCrops.length > 0 ? (
              <div className="table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Crop Name</th>
                      <th>Variety</th>
                      <th>Date Planted</th>
                      <th>Area (ha)</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCrops.map((crop) => (
                      <tr key={crop.id}>
                        <td className="crop-name">{crop.name}</td>
                        <td>{crop.variety || '-'}</td>
                        <td>
                          {(crop.date_planted || crop.datePlanted)
                            ? new Date(crop.date_planted || crop.datePlanted).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            : '-'
                          }
                        </td>
                        <td>{crop.area || '-'}</td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ 
                              backgroundColor: getStatusColor(crop.status),
                              color: 'white'
                            }}
                          >
                            {crop.status || 'Growing'}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <div className="action-menu">
                            <button
                              className="menu-btn"
                              onClick={() => toggleMenu(crop.id)}
                              title="More actions"
                            >
                              ⋮
                            </button>
                            {menuOpenId === crop.id && (
                              <div className="dropdown-menu">
                                <button onClick={() => { toggleMenu(null); handleEditCrop(crop); }}>
                                  Edit
                                </button>
                                <button 
                                  onClick={() => { toggleMenu(null); handleDeleteCrop(crop.id); }}
                                  className="danger"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>No crops found. {searchTerm && 'Try a different search or '} Add your first crop record!</p>
              </div>
            )}
          </div>
        )}

        {/* Other Tabs - Coming Soon */}

        {/* Inputs Tab */}
        {activeTab === 'inputs' && (
          <div className="tab-content">
            <div className="tab-toolbar">
              <input
                type="text"
                placeholder="Search inputs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button 
                className="add-record-btn"
                onClick={() => {
                  setInputForm({ name: '', type: '', quantity: '', unit: '', dateAdded: '', status: 'In Stock' });
                  setEditInputId(null);
                  setShowInputForm(true);
                }}
              >
                + Add Record
              </button>
            </div>

            {showInputForm && (
              <div className="crop-form-overlay" onClick={() => { setShowInputForm(false); setInputForm({ name: '', type: '', quantity: '', unit: '', dateAdded: '', status: 'In Stock' }); setEditInputId(null); }}>
                <div className="crop-form-card crop-form-shell" onClick={(event) => event.stopPropagation()}>
                  <div className="crop-form-shell-header">
                    <div>
                      <h3>{editInputId ? 'Edit Input Record' : 'Add Input Record'}</h3>
                      <p>{editInputId ? 'Update the input details below.' : 'Fill in the input details to create a new record.'}</p>
                    </div>
                    <button
                      type="button"
                      className="crop-form-close-btn"
                      onClick={() => { setShowInputForm(false); setInputForm({ name: '', type: '', quantity: '', unit: '', dateAdded: '', status: 'In Stock' }); setEditInputId(null); }}
                      aria-label="Close input form"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleSaveInput}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Input Name *</label>
                        <input type="text" name="name" value={inputForm.name} onChange={handleInputChange} placeholder="e.g., Fertilizer, Pesticide" required />
                      </div>
                      <div className="form-group">
                        <label>Type</label>
                        <input type="text" name="type" value={inputForm.type} onChange={handleInputChange} placeholder="e.g., NPK, Herbicide" />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Quantity</label>
                        <input type="number" name="quantity" value={inputForm.quantity} onChange={handleInputChange} placeholder="Enter quantity" />
                      </div>
                      <div className="form-group">
                        <label>Unit</label>
                        <select name="unit" value={inputForm.unit} onChange={handleInputChange}>
                          <option value="">Select Unit</option>
                          <option value="kg">KG</option>
                          <option value="liters">LITERS</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Date Added</label>
                        <input type="date" name="dateAdded" value={inputForm.dateAdded} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Status</label>
                        <select name="status" value={inputForm.status} onChange={handleInputChange}>
                          <option value="In Stock">In Stock</option>
                          <option value="Low Stock">Low Stock</option>
                          <option value="Out of Stock">Out of Stock</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">{editInputId ? 'Update Input' : 'Save Input'}</button>
                      <button type="button" className="btn btn-secondary" onClick={() => { setShowInputForm(false); setInputForm({ name: '', type: '', quantity: '', unit: '', dateAdded: '', status: 'In Stock' }); setEditInputId(null); }}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {inputs.length > 0 ? (
              <div className="table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Input Name</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Date Added</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inputs.filter(item => !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => {
                      const calculatedStatus = getInputStatus(item.quantity);
                      const statusColor = isLowStock(item.quantity) ? '#ff9800' : '#4caf50';
                      return (
                        <tr key={item.id}>
                          <td className="crop-name">{item.name}</td>
                          <td>{item.type || '-'}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td>{item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : '-'}</td>
                          <td><span className="status-badge" style={{ backgroundColor: statusColor, color: 'white' }}>{calculatedStatus}</span></td>
                          <td className="actions-cell">
                            <div className="action-menu">
                              <button className="menu-btn" onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}>⋮</button>
                              {menuOpenId === item.id && (
                                <div className="dropdown-menu">
                                  <button onClick={() => { setMenuOpenId(null); handleEditInput(item); }}>Edit</button>
                                  <button onClick={() => { setMenuOpenId(null); handleDeleteInput(item.id); }} className="danger">Delete</button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><p>No inputs found. Add your first input record!</p></div>
            )}
          </div>
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="tab-content">
            <div className="tab-toolbar">
              <input type="text" placeholder="Search equipment..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
              <button className="add-record-btn" onClick={() => { setEquipmentForm({ name: '', type: '', status: 'Active', lastMaintenance: '', cost: '' }); setEditEquipmentId(null); setShowEquipmentForm(true); }}>+ Add Record</button>
            </div>

            {showEquipmentForm && (
              <div className="crop-form-overlay" onClick={() => { setShowEquipmentForm(false); setEquipmentForm({ name: '', type: '', status: 'Active', lastMaintenance: '', cost: '' }); setEditEquipmentId(null); }}>
                <div className="crop-form-card crop-form-shell" onClick={(e) => e.stopPropagation()}>
                  <div className="crop-form-shell-header">
                    <div>
                      <h3>{editEquipmentId ? 'Edit Equipment Record' : 'Add Equipment Record'}</h3>
                      <p>{editEquipmentId ? 'Update the equipment details below.' : 'Fill in the equipment details to create a new record.'}</p>
                    </div>
                    <button type="button" className="crop-form-close-btn" onClick={() => { setShowEquipmentForm(false); setEquipmentForm({ name: '', type: '', status: 'Active', lastMaintenance: '', cost: '' }); setEditEquipmentId(null); }} aria-label="Close equipment form">×</button>
                  </div>

                  <form onSubmit={handleSaveEquipment}>
                    <div className="form-row">
                      <div className="form-group"><label>Equipment Name *</label><input type="text" name="name" value={equipmentForm.name} onChange={handleEquipmentChange} placeholder="e.g., Tractor, Plow" required /></div>
                      <div className="form-group"><label>Type</label><input type="text" name="type" value={equipmentForm.type} onChange={handleEquipmentChange} placeholder="e.g., Vehicle, Tool" /></div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Status</label>
                        <select name="status" value={equipmentForm.status} onChange={handleEquipmentChange}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Under Maintenance">Under Maintenance</option>
                        </select>
                      </div>
                      <div className="form-group"><label>Last Maintenance</label><input type="date" name="lastMaintenance" value={equipmentForm.lastMaintenance} onChange={handleEquipmentChange} /></div>
                      <div className="form-group"><label>Cost</label><input type="number" name="cost" value={equipmentForm.cost} onChange={handleEquipmentChange} placeholder="Enter cost" /></div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">{editEquipmentId ? 'Update Equipment' : 'Save Equipment'}</button>
                      <button type="button" className="btn btn-secondary" onClick={() => { setShowEquipmentForm(false); setEquipmentForm({ name: '', type: '', status: 'Active', lastMaintenance: '', cost: '' }); setEditEquipmentId(null); }}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {equipment.length > 0 ? (
              <div className="table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr><th>Equipment Name</th><th>Type</th><th>Status</th><th>Last Maintenance</th><th>Cost</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {equipment.filter(item => !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                      <tr key={item.id}>
                        <td className="crop-name">{item.name}</td>
                        <td>{item.type || '-'}</td>
                        <td><span className="status-badge" style={{ backgroundColor: getStatusColor(item.status), color: 'white' }}>{item.status}</span></td>
                        <td>{item.lastMaintenance ? new Date(item.lastMaintenance).toLocaleDateString() : '-'}</td>
                        <td>₱{item.cost || '0'}</td>
                        <td className="actions-cell">
                          <div className="action-menu">
                            <button className="menu-btn" onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}>⋮</button>
                            {menuOpenId === item.id && (
                              <div className="dropdown-menu">
                                <button onClick={() => { setMenuOpenId(null); handleEditEquipment(item); }}>Edit</button>
                                <button onClick={() => { setMenuOpenId(null); handleDeleteEquipment(item.id); }} className="danger">Delete</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><p>No equipment found. Add your first equipment record!</p></div>
            )}
          </div>
        )}

        {/* Fuel Tab */}
        {activeTab === 'fuel' && (
          <div className="tab-content">
            <div className="tab-toolbar">
              <input type="text" placeholder="Search fuel records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
              <button className="add-record-btn" onClick={() => { setFuelForm({ type: 'Diesel', quantity: '', unit: 'liters', date: '', cost: '', fuelType: 'Diesel' }); setEditFuelId(null); setShowFuelForm(true); }}>+ Add Record</button>
            </div>

            {showFuelForm && (
              <div className="crop-form-overlay" onClick={() => { setShowFuelForm(false); setFuelForm({ type: 'Diesel', quantity: '', unit: 'liters', date: '', cost: '', fuelType: 'Diesel' }); setEditFuelId(null); }}>
                <div className="crop-form-card crop-form-shell" onClick={(e) => e.stopPropagation()}>
                  <div className="crop-form-shell-header">
                    <div>
                      <h3>{editFuelId ? 'Edit Fuel Record' : 'Add Fuel Record'}</h3>
                      <p>{editFuelId ? 'Update the fuel details below.' : 'Fill in the fuel details to create a new record.'}</p>
                    </div>
                    <button type="button" className="crop-form-close-btn" onClick={() => { setShowFuelForm(false); setFuelForm({ type: 'Diesel', quantity: '', unit: 'liters', date: '', cost: '', fuelType: 'Diesel' }); setEditFuelId(null); }} aria-label="Close fuel form">×</button>
                  </div>

                  <form onSubmit={handleSaveFuel}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Fuel Type *</label>
                        <select name="fuelType" value={fuelForm.fuelType} onChange={handleFuelChange} required>
                          <option value="Diesel">Diesel</option>
                          <option value="Petrol">Petrol</option>
                          <option value="LPG">LPG</option>
                        </select>
                      </div>
                      <div className="form-group"><label>Quantity *</label><input type="number" name="quantity" value={fuelForm.quantity} onChange={handleFuelChange} placeholder="Enter quantity" required /></div>
                      <div className="form-group"><label>Unit</label><input type="text" name="unit" value={fuelForm.unit} onChange={handleFuelChange} placeholder="liters" /></div>
                    </div>

                    <div className="form-row">
                      <div className="form-group"><label>Date</label><input type="date" name="date" value={fuelForm.date} onChange={handleFuelChange} /></div>
                      <div className="form-group"><label>Cost</label><input type="number" name="cost" value={fuelForm.cost} onChange={handleFuelChange} placeholder="Enter cost" /></div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">{editFuelId ? 'Update Fuel' : 'Save Fuel'}</button>
                      <button type="button" className="btn btn-secondary" onClick={() => { setShowFuelForm(false); setFuelForm({ type: 'Diesel', quantity: '', unit: 'liters', date: '', cost: '', fuelType: 'Diesel' }); setEditFuelId(null); }}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {fuels.length > 0 ? (
              <div className="table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr><th>Fuel Type</th><th>Quantity</th><th>Unit</th><th>Date</th><th>Cost</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {fuels.filter(item => !searchTerm || item.type.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                      <tr key={item.id}>
                        <td className="crop-name">{item.type}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
                        <td>₱{item.cost || '0'}</td>
                        <td className="actions-cell">
                          <div className="action-menu">
                            <button className="menu-btn" onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}>⋮</button>
                            {menuOpenId === item.id && (
                              <div className="dropdown-menu">
                                <button onClick={() => { setMenuOpenId(null); handleEditFuel(item); }}>Edit</button>
                                <button onClick={() => { setMenuOpenId(null); handleDeleteFuel(item.id); }} className="danger">Delete</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><p>No fuel records found. Add your first fuel record!</p></div>
            )}
          </div>
        )}

        {/* Harvest Tab */}
        {activeTab === 'harvest' && (
          <div className="tab-content">
            <div className="tab-toolbar">
              <input type="text" placeholder="Search harvest records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
              <button className="add-record-btn" onClick={() => { setHarvestForm({ cropName: '', quantity: '', unit: 'kg', dateHarvested: '', status: 'Harvested' }); setEditHarvestId(null); setShowHarvestForm(true); }}>+ Add Record</button>
            </div>

            {showHarvestForm && (
              <div className="crop-form-overlay" onClick={() => { setShowHarvestForm(false); setHarvestForm({ cropName: '', quantity: '', unit: 'kg', dateHarvested: '', status: 'Harvested' }); setEditHarvestId(null); }}>
                <div className="crop-form-card crop-form-shell" onClick={(e) => e.stopPropagation()}>
                  <div className="crop-form-shell-header">
                    <div>
                      <h3>{editHarvestId ? 'Edit Harvest Record' : 'Add Harvest Record'}</h3>
                      <p>{editHarvestId ? 'Update the harvest details below.' : 'Fill in the harvest details to create a new record.'}</p>
                    </div>
                    <button type="button" className="crop-form-close-btn" onClick={() => { setShowHarvestForm(false); setHarvestForm({ cropName: '', quantity: '', unit: 'kg', dateHarvested: '', status: 'Harvested' }); setEditHarvestId(null); }} aria-label="Close harvest form">×</button>
                  </div>

                  <form onSubmit={handleSaveHarvest}>
                    <div className="form-row">
                      <div className="form-group"><label>Crop Name *</label><select name="cropName" value={harvestForm.cropName} onChange={handleHarvestChange} required><option value="">Select a crop</option>{crops.map((crop) => (<option key={crop.id} value={crop.name}>{crop.name}</option>))}</select></div>
                      <div className="form-group"><label>Quantity *</label><input type="number" name="quantity" value={harvestForm.quantity} onChange={handleHarvestChange} placeholder="Enter quantity" required /></div>
                    </div>

                    <div className="form-row">
                      <div className="form-group"><label>Unit</label><input type="text" name="unit" value={harvestForm.unit} onChange={handleHarvestChange} placeholder="kg" /></div>
                      <div className="form-group"><label>Date Harvested</label><input type="date" name="dateHarvested" value={harvestForm.dateHarvested} onChange={handleHarvestChange} /></div>
                      <div className="form-group">
                        <label>Status</label>
                        <select name="status" value={harvestForm.status} onChange={handleHarvestChange}>
                          <option value="Harvested">Harvested</option>
                          <option value="Processed">Processed</option>
                          <option value="Stored">Stored</option>
                          <option value="Sold">Sold</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">{editHarvestId ? 'Update Harvest' : 'Save Harvest'}</button>
                      <button type="button" className="btn btn-secondary" onClick={() => { setShowHarvestForm(false); setHarvestForm({ cropName: '', quantity: '', unit: 'kg', dateHarvested: '', status: 'Harvested' }); setEditHarvestId(null); }}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {harvests.length > 0 ? (
              <div className="table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr><th>Crop Name</th><th>Quantity</th><th>Unit</th><th>Date Harvested</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {harvests.filter(item => !searchTerm || item.cropName.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                      <tr key={item.id}>
                        <td className="crop-name">{item.cropName}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{item.dateHarvested ? new Date(item.dateHarvested).toLocaleDateString() : '-'}</td>
                        <td><span className="status-badge" style={{ backgroundColor: getStatusColor(item.status), color: 'white' }}>{item.status}</span></td>
                        <td className="actions-cell">
                          <div className="action-menu">
                            <button className="menu-btn" onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}>⋮</button>
                            {menuOpenId === item.id && (
                              <div className="dropdown-menu">
                                <button onClick={() => { setMenuOpenId(null); handleEditHarvest(item); }}>Edit</button>
                                <button onClick={() => { setMenuOpenId(null); handleDeleteHarvest(item.id); }} className="danger">Delete</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><p>No harvest records found. Add your first harvest record!</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FarmRecords;