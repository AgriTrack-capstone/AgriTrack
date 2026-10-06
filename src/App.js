import React, { useState } from 'react';
import './styles/App.css';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import FarmRecords from './components/FarmRecords';
import Inventory from './components/Inventory';
import Reports from './components/Reports';
import Login from './components/Login'; 

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [crops, setCrops] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('agriTrack-crops') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      console.warn('Unable to load locally saved crops', error);
      return [];
    }
  });
  const [records, setRecords] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [labor, setLabor] = useState([]);
  const [cropPlantings, setCropPlantings] = useState([]);
  const [cropMonitorings, setCropMonitorings] = useState([]);
  const [wasteRecords, setWasteRecords] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(() => {
    return localStorage.getItem('agriTrack-role') || 'Labor';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('agriTrack-auth') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('agriTrack-user') || 'Angela Mae G.';
  });

  const handleLogin = async (username, password) => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedUsername || !normalizedPassword) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('full_name, username, password, status, role')
        .eq('username', normalizedUsername)
        .single();

      if (error || !data) {
        return false;
      }

      if (data.password !== normalizedPassword || data.status !== 'Active') {
        return false;
      }

      const normalizedRole = data.role === 'Farm Worker' ? 'Labor' : (data.role || 'Labor');

      localStorage.setItem('agriTrack-auth', 'true');
      localStorage.setItem('agriTrack-user', data.full_name);
      localStorage.setItem('agriTrack-role', normalizedRole);
      setCurrentUser(data.full_name);
      setCurrentUserRole(normalizedRole);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.error('Login error', err);
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('agriTrack-auth');
    localStorage.removeItem('agriTrack-role');
    localStorage.removeItem('agriTrack-user');
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  // Load initial data from Supabase
  React.useEffect(() => {
    let mounted = true;

    const safeSelect = async (table, select = '*', order = 'id') => {
      try {
        let query = supabase.from(table).select(select);

        if (order) {
          query = query.order(order, { ascending: false });
        }

        const { data, error } = await query;
        if (error) {
          return [];
        }

        return data || [];
      } catch (error) {
        return [];
      }
    };

    async function load() {
      try {
        let storedCrops = [];
        try {
          const stored = JSON.parse(localStorage.getItem('agriTrack-crops') || '[]');
          storedCrops = Array.isArray(stored) ? stored : [];
        } catch (storageError) {
          console.warn('Unable to read locally saved crops', storageError);
        }

        const [cropsData, recordsData, inputsData, harvestsData, farmsData, fieldsData, farmersData, laborData, cropPlantingsData, cropMonitoringsData, wasteRecordsData, activityLogData] = await Promise.all([
          safeSelect('crops'),
          safeSelect('records'),
          safeSelect('inputs'),
          safeSelect('harvests'),
          safeSelect('farms'),
          safeSelect('fields'),
          safeSelect('farmers'),
          safeSelect('labor'),
          safeSelect('crop_plantings'),
          safeSelect('crop_monitorings'),
          safeSelect('waste_records'),
          safeSelect('crop_activity_log', '*', null)
        ]);

        if (mounted && cropsData) {
          const localCropsById = new Map(storedCrops.map((crop) => [String(crop.id), crop]));
          const supabaseCrops = cropsData.map((c) => {
            const localCrop = localCropsById.get(String(c.id)) || {};
            const quantity = Number(c.stock_amt ?? localCrop.stock_amt ?? localCrop.quantity) || 0;
            const unit = c.stock_unit || localCrop.stock_unit || localCrop.unit || '';

            return {
              ...localCrop,
              id: c.id,
              name: c.name || localCrop.name || '',
              field: c.field || localCrop.field || '',
              variety: c.variety || localCrop.variety || '',
              date_planted: c.date_planted || localCrop.date_planted || localCrop.datePlanted || null,
              created_at: c.created_at || localCrop.created_at || null,
              expected_harvest_date: c.expected_harvest_date || localCrop.expected_harvest_date || localCrop.expectedHarvestDate || null,
              harvested_at: c.harvested_at || localCrop.harvested_at || localCrop.dateHarvested || null,
              dateHarvested: c.harvested_at || localCrop.dateHarvested || '',
              planted_by: c.planted_by || localCrop.planted_by || localCrop.plantedBy || '',
              inputs_provided: c.inputs_provided || localCrop.inputs_provided || localCrop.inputsProvided || '',
              area: c.area || localCrop.area || '',
              status: c.status || localCrop.status || 'Growing',
              quantity,
              unit,
              stock: { amount: quantity, unit },
              color: c.color || localCrop.color || '#e8f5e9'
            };
          });
          const supabaseCropIds = new Set(supabaseCrops.map((crop) => String(crop.id)));
          const locallySavedCrops = storedCrops.filter((crop) => !supabaseCropIds.has(String(crop.id)));
          setCrops([...supabaseCrops, ...locallySavedCrops]);
        }

        if (mounted && recordsData) {
          setRecords(recordsData.map((r) => ({
            id: r.id,
            title: r.title,
            field: r.field,
            crop: r.crop,
            quantity: { amount: Number(r.qty_amount) || 0, unit: r.qty_unit || '' },
            scheduleAt: r.schedule_at || '',
            notes: r.notes || '',
            status: r.status || 'Scheduled',
            date: r.schedule_at ? new Date(r.schedule_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
          })));
        }

        if (mounted) {
          setInputs(inputsData);
          setHarvests(harvestsData);
          setFarms(farmsData);
          setFields(fieldsData);
          setFarmers(farmersData);
          setLabor(laborData);
          setCropPlantings(cropPlantingsData);
          setCropMonitorings(cropMonitoringsData);
          setWasteRecords(wasteRecordsData);
          setActivityLog(activityLogData || []);
        }
      } catch (err) {
        // keep console error for debugging
        console.error('Error loading supabase data', err);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  // Realtime subscriptions to keep UI in sync with external DB changes
  React.useEffect(() => {
    const handleCropChange = (payload) => {
      const row = payload.new;
      const oldRow = payload.old;

      if (payload.eventType === 'INSERT' && row) {
        const createdCrop = {
          id: row.id,
          name: row.name,
          field: row.field || '',
          variety: row.variety || '',
          date_planted: row.date_planted || null,
          created_at: row.created_at || null,
          expected_harvest_date: row.expected_harvest_date || null,
          harvested_at: row.harvested_at || null,
          dateHarvested: row.harvested_at || '',
          planted_by: row.planted_by || '',
          inputs_provided: row.inputs_provided || '',
          status: row.status || 'Planted',
          quantity: Number(row.stock_amt) || 0,
          unit: row.stock_unit || '',
          stock: { amount: Number(row.stock_amt) || 0, unit: row.stock_unit || '' },
          color: row.color || '#e8f5e9'
        };
        setCrops((prev) => (
          prev.some((crop) => String(crop.id) === String(row.id))
            ? prev
            : [createdCrop, ...prev]
        ));
      }

      if (payload.eventType === 'UPDATE' && row) {
        setCrops((prev) => prev.map((crop) => (
          crop.id === row.id
            ? {
                ...crop,
                name: row.name,
                field: row.field ?? '',
                variety: row.variety || crop.variety || '',
                date_planted: row.date_planted ?? null,
                created_at: row.created_at || crop.created_at || null,
                expected_harvest_date: row.expected_harvest_date ?? null,
                harvested_at: row.harvested_at ?? null,
                dateHarvested: row.harvested_at || '',
                planted_by: row.planted_by ?? '',
                inputs_provided: row.inputs_provided || crop.inputs_provided || crop.inputsProvided || '',
                status: row.status || crop.status || 'Planted',
                quantity: Number(row.stock_amt) || 0,
                unit: row.stock_unit || '',
                stock: { amount: Number(row.stock_amt) || 0, unit: row.stock_unit || '' },
                color: row.color || crop.color
              }
            : crop
        )));
      }

      if (payload.eventType === 'DELETE') {
        setCrops((prev) => prev.filter((crop) => crop.id !== (oldRow?.id || row?.id)));
      }
    };

    const handleRecordChange = (payload) => {
      const row = payload.new;
      const oldRow = payload.old;

      if (payload.eventType === 'INSERT' && row) {
        setRecords((prev) => [{
          id: row.id,
          title: row.title,
          field: row.field,
          crop: row.crop,
          quantity: { amount: Number(row.qty_amount) || 0, unit: row.qty_unit || '' },
          scheduleAt: row.schedule_at || '',
          notes: row.notes || '',
          status: row.status || 'Scheduled',
          date: row.schedule_at ? new Date(row.schedule_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
        }, ...prev]);
      }

      if (payload.eventType === 'UPDATE' && row) {
        setRecords((prev) => prev.map((record) => (
          record.id === row.id
            ? {
                ...record,
                title: row.title,
                field: row.field,
                crop: row.crop,
                quantity: { amount: Number(row.qty_amount) || 0, unit: row.qty_unit || '' },
                scheduleAt: row.schedule_at || '',
                notes: row.notes || '',
                status: row.status || 'Scheduled',
                date: row.schedule_at ? new Date(row.schedule_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : record.date
              }
            : record
        )));
      }

      if (payload.eventType === 'DELETE') {
        setRecords((prev) => prev.filter((record) => record.id !== (oldRow?.id || row?.id)));
      }
    };

    const cropsChannel = supabase
      .channel('crops-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crops' }, handleCropChange)
      .subscribe();

    const recordsChannel = supabase
      .channel('records-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, handleRecordChange)
      .subscribe();

    return () => {
      supabase.removeChannel(cropsChannel);
      supabase.removeChannel(recordsChannel);
    };
  }, []);

  return (
    <div className="app">
      {isAuthenticated ? (
        <>
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            userName={currentUser}
            userRole={currentUserRole}
          />
          <main className="main-content">
            {activeTab === 'dashboard' && (
              <Dashboard
                crops={crops}
                setCrops={setCrops}
                records={records}
                inputs={inputs}
                harvests={harvests}
                farms={farms}
                fields={fields}
                farmers={farmers}
                labor={labor}
                cropPlantings={cropPlantings}
                cropMonitorings={cropMonitorings}
                wasteRecords={wasteRecords}
                activityLog={activityLog}
                currentUser={currentUser}
                currentUserRole={currentUserRole}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'farm-records' && (
              <FarmRecords crops={crops} setCrops={setCrops} records={records} setRecords={setRecords} />
            )}

            {activeTab === 'inventory' && <Inventory crops={crops} />}

            {activeTab === 'reports' && <Reports records={records} crops={crops} setCrops={setCrops} />}

          </main>
        </>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
