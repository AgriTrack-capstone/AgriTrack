import React, { useEffect, useState } from 'react';
import '../styles/Dashboard.css';
import { supabase } from '../supabaseClient';


function Dashboard({ crops = [], records = [] }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [inputs, setInputs] = useState([]);

  // Helper function to determine if an input is low stock
  const isLowStock = (quantity) => {
    return Number(quantity || 0) <= 3;
  };

  // Fetch inventory data from Supabase
  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        const inputsRes = await supabase.from('inputs').select('*');
        if (inputsRes.data) setInputs(inputsRes.data);
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      }
    };

    fetchInventoryData();
  }, []);

  // Calculate dynamic values from crops and records
  const activeFields = new Set(crops.map((crop) => crop.field)).size;
  const totalCrops = crops.length;
  
  // Calculate low stock items from inputs
  const lowStockItems = inputs.filter((input) => isLowStock(input.quantity)).length;
  
  // Calculate total inputs quantity across all inputs grouped by unit type
  const inputsByUnit = inputs.reduce((acc, input) => {
    const unit = input.unit || 'units';
    const quantity = Number(input.quantity) || 0;
    if (!acc[unit]) {
      acc[unit] = 0;
    }
    acc[unit] += quantity;
    return acc;
  }, {});

  // Format the total inventory display with unit breakdown
  const totalInventoryDisplay = Object.entries(inputsByUnit).length > 0
    ? Object.entries(inputsByUnit).map(([unit, qty]) => `${qty} ${unit}`).join(', ')
    : '0 units';

  const statsData = [
    {
      id: 1,
      label: 'Active Fields',
      value: activeFields.toString(),
      description: activeFields === 1 ? '1 field monitored' : `${activeFields} fields monitored`,
      borderColor: '#1b5e20'
    },
    {
      id: 2,
      label: 'Total Crops',
      value: totalCrops.toString(),
      description: totalCrops === 1 ? '1 crop in system' : `${totalCrops} crops in system`,
      borderColor: '#2e7d32'
    },
    {
      id: 3,
      label: 'Low Stock Items',
      value: lowStockItems.toString(),
      description: lowStockItems === 0 ? 'All inputs sufficient' : `${lowStockItems} item${lowStockItems !== 1 ? 's' : ''} need restock`,
      borderColor: lowStockItems > 0 ? '#d84315' : '#7b8f7c'
    },
    {
      id: 4,
      label: 'Total Inventory',
      value: totalInventoryDisplay.length > 30 ? totalInventoryDisplay.substring(0, 30) + '...' : totalInventoryDisplay,
      description: 'Input stock by unit',
      borderColor: '#a5d6a7'
    }
  ];

  // Generate crop records carousel from records with fallback to sample data
  const generateCropRecords = () => {
    const cropImages = {
      'Rice': 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80',
      'Corn': 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80',
      'Tomato': 'https://images.unsplash.com/photo-1464454709131-ffd692591ee5?auto=format&fit=crop&w=1200&q=80',
      'Cabbage': 'https://images.unsplash.com/photo-1464184169885-abc23fd7d0ad?auto=format&fit=crop&w=1200&q=80',
      'Carrot': 'https://images.unsplash.com/photo-1462332420958-a05d1e7413413?auto=format&fit=crop&w=1200&q=80',
      'Lettuce': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80',
      'Pepper': 'https://images.unsplash.com/photo-1599599810694-d3a7e1a46b4b?auto=format&fit=crop&w=1200&q=80'
    };
    
    if (records.length > 0) {
      // Get unique crop records sorted by date (most recent first)
      const uniqueRecords = [];
      const seenCrops = new Set();
      
      records.forEach(record => {
        const cropName = record.crop || 'Crop';
        if (!seenCrops.has(cropName)) {
          seenCrops.add(cropName);
          uniqueRecords.push({
            name: cropName,
            quantity: record.qty_amount || record.quantity?.amount || record.amount || 0,
            unit: record.unit || 'kg',
            field: record.field || 'Farm',
            date: record.date || record.created_at || new Date().toLocaleDateString(),
            notes: record.notes || 'Crop record added',
            image: cropImages[cropName] || cropImages['Rice'],
            color: '#2e7d32'
          });
        }
      });
      
      return uniqueRecords.slice(0, 5);
    }
    
    // Fallback to sample crop records
    return [
      { name: 'Rice', quantity: 250, unit: 'kg', field: 'Rice Field A', date: 'March 9', notes: 'Newly planted crop', image: cropImages['Rice'], color: '#2e7d32' },
      { name: 'Corn', quantity: 180, unit: 'kg', field: 'Corn Field B', date: 'March 8', notes: 'Growth stage monitoring', image: cropImages['Corn'], color: '#2e7d32' },
      { name: 'Tomato', quantity: 95, unit: 'kg', field: 'Vegetable Plot C', date: 'March 7', notes: 'Fruit maturation phase', image: cropImages['Tomato'], color: '#2e7d32' }
    ];
  };
  
  const cropRecordsData = generateCropRecords();

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % cropRecordsData.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [cropRecordsData.length]);

  const goToPrevSlide = () => {
    setCurrentSlideIndex((prevIndex) =>
      prevIndex === 0 ? cropRecordsData.length - 1 : prevIndex - 1
    );
  };

  const goToNextSlide = () => {
    setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % cropRecordsData.length);
  };

  // Generate crop status data from crops array with health percentages based on stock
  const cropStatusData = crops.map((crop) => {
    const stockAmount = crop.stock?.amount || 0;
    // Health percentage based on stock amount (0-1000kg range)
    const percentage = Math.min(100, Math.round((stockAmount / 500) * 100));
    return {
      name: crop.name,
      percentage: Math.max(20, percentage), // Min 20% for visibility
      color: crop.color || '#a5d6a7'
    };
  });

  return (
    
    <div className="dashboard">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-content">
          <h2>Welcome back, Farmer!</h2>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statsData.map((stat) => (
          <div key={stat.id} className="stat-card" style={{ borderLeftColor: stat.borderColor }}>
            <div className="stat-inner">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-description">{stat.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="main-grid">
        {/* Crop Records Carousel Card */}
        <div className="weather-card farmer-carousel-card">
          <h3>Crop Records Added</h3>
          <div className="farmer-carousel">
            <div className="carousel-image-wrapper">
              <img
                src={cropRecordsData[currentSlideIndex].image}
                alt={cropRecordsData[currentSlideIndex].name}
                className="carousel-image"
              />
              <div className="carousel-overlay">
                <h4>🌾 {cropRecordsData[currentSlideIndex].name}</h4>
                <p>{cropRecordsData[currentSlideIndex].field} • {cropRecordsData[currentSlideIndex].date}</p>
                <span className="carousel-activity-count">{cropRecordsData[currentSlideIndex].quantity} {cropRecordsData[currentSlideIndex].unit}</span>
              </div>
            </div>

            <div className="carousel-controls">
              <button className="carousel-btn" onClick={goToPrevSlide} aria-label="Previous crop">
                ‹
              </button>
              <div className="carousel-dots">
                {cropRecordsData.map((slide, index) => (
                  <button
                    key={slide.name + index}
                    className={`carousel-dot ${currentSlideIndex === index ? 'active' : ''}`}
                    onClick={() => setCurrentSlideIndex(index)}
                    aria-label={`Go to ${slide.name}`}
                  />
                ))}
              </div>
              <button className="carousel-btn" onClick={goToNextSlide} aria-label="Next crop">
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;
