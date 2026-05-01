import React, { useState } from 'react';
import './styles/App.css'; 
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import FarmRecords from './components/FarmRecords';
import Reports from './components/Reports';
import Alerts from './components/Alerts';
import Login from './components/Login'; 

const FarmSystem = () => {
  const [user, setUser] = useState(null);

  return (
    <div className="main-container">
      <Navbar />
      
      <header>
        <h1>Farm Management Interface</h1>
      </header>
      
      <main>
        {/* Your primary dashboard or logic */}
        <Dashboard />
      </main>
    </div>
  );
};
// 

// 
const initialCrops = [
  {
    id: 1,
    name: 'Tomato',
    field: 'Rice Field A',
    stock: { amount: 500, unit: 'seedlings' },
    color: '#a5d6a7'
  },
  {
    id: 2,
    name: 'Corn',
    field: 'Corn Field B',
    stock: { amount: 120, unit: 'kg' },
    color: '#eeeeee'
  },
  {
    id: 3,
    name: 'Vegetables',
    field: 'Vegetable Plot C',
    stock: { amount: 50, unit: 'kg' },
    color: '#d8ead9'
  }
];

const initialRecords = [
  {
    id: 1,
    title: 'Tomato Seedling Transplant',
    field: 'Rice Field A',
    crop: 'Tomato',
    quantity: { amount: 500, unit: 'seedlings' },
    scheduleAt: '2026-04-21T08:00',
    date: 'Mar 4',
    notes: 'Transplanted healthy seedlings',
    icon: '✅',
    color: '#a5d6a7',
    status: 'Completed'
  },
  {
    id: 2,
    title: 'Drip Irrigation',
    field: 'Rice Field A',
    crop: 'Tomato',
    quantity: { amount: 2000, unit: 'liters' },
    scheduleAt: '2026-04-24T06:30',
    date: 'Mar 3',
    notes: 'Morning irrigation session',
    icon: '💧',
    color: '#dbead9',
    status: 'Scheduled'
  },
  {
    id: 3,
    title: 'Fertilizer Application',
    field: 'Corn Field B',
    crop: 'Corn',
    quantity: { amount: 50, unit: 'kg' },
    scheduleAt: '2026-04-27T09:00',
    date: 'Mar 2',
    notes: 'Promoting healthy growth',
    icon: '🌿',
    color: '#eeeeee',
    status: 'Scheduled'
  }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [crops, setCrops] = useState(initialCrops);
  const [records, setRecords] = useState(initialRecords);
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
        .select('full_name, username, password, status')
        .eq('username', normalizedUsername)
        .single();

      if (error || !data) {
        return false;
      }

      if (data.password !== normalizedPassword || data.status !== 'Active') {
        return false;
      }

      localStorage.setItem('agriTrack-auth', 'true');
      localStorage.setItem('agriTrack-user', data.full_name);
      setCurrentUser(data.full_name);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.error('Login error', err);
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('agriTrack-auth');
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  // Load initial data from Supabase
  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data: cropsData, error: cropErr } = await supabase
          .from('crops')
          .select('*')
          .order('id', { ascending: false });

        if (!cropErr && mounted && cropsData) {
          setCrops(cropsData.map((c) => ({
            id: c.id,
            name: c.name,
            field: c.field,
            stock: { amount: Number(c.stock_amt) || 0, unit: c.stock_unit || '' },
            color: c.color || '#e8f5e9'
          })));
        }

        const { data: recordsData, error: recordErr } = await supabase
          .from('records')
          .select('*')
          .order('id', { ascending: false });

        if (!recordErr && mounted && recordsData) {
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
        setCrops((prev) => [{
          id: row.id,
          name: row.name,
          field: row.field,
          stock: { amount: Number(row.stock_amt) || 0, unit: row.stock_unit || '' },
          color: row.color || '#e8f5e9'
        }, ...prev]);
      }

      if (payload.eventType === 'UPDATE' && row) {
        setCrops((prev) => prev.map((crop) => (
          crop.id === row.id
            ? {
                ...crop,
                name: row.name,
                field: row.field,
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
          />
          <main className="main-content">
            {activeTab === 'dashboard' && <Dashboard crops={crops} records={records} />}
            {activeTab === 'farmRecords' && (
              <FarmRecords
                crops={crops}
                setCrops={setCrops}
                records={records}
                setRecords={setRecords}
              />
            )}
            {activeTab === 'reports' && <Reports crops={crops} records={records} />}
            {activeTab === 'alerts' && <Alerts records={records} crops={crops} />}
          </main>
        </>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
