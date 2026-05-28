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

  // Generate recent activities from records with fallback to sample data
  const generateRecentActivities = () => {
    const activityIcons = { 'Irrigation': '💧', 'Fertilizing': '🌱', 'Pest Control': '🐛', 'Harvesting': '🌾', 'Planting': '🌿' };
    const activityImages = {
      'Irrigation': 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80',
      'Fertilizing': 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80',
      'Pest Control': 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=1200&q=80',
      'Harvesting': 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
      'Planting': 'https://images.unsplash.com/photo-1625246333333-e28e67ddf97d?auto=format&fit=crop&w=1200&q=80'
    };
    const activityColors = { 'Irrigation': '#1b5e20', 'Fertilizing': '#2e7d32', 'Pest Control': '#7b8f7c', 'Harvesting': '#a5d6a7', 'Planting': '#558b2f' };
    
    if (records.length > 0) {
      // Group records by crop and get recent ones
      const grouped = {};
      records.slice(0, 10).forEach(record => {
        const key = record.crop || 'Activity';
        if (!grouped[key]) {
          grouped[key] = { ...record, count: 0 };
        }
        grouped[key].count += 1;
      });
      
      return Object.values(grouped).slice(0, 4).map((activity, idx) => ({
        type: activity.crop || 'Farm Activity',
        count: activity.count,
        date: activity.date || 'Today',
        icon: activityIcons[activity.crop] || '📋',
        color: activityColors[activity.crop] || '#7b8f7c',
        field: activity.field || 'Farm',
        image: activityImages[activity.crop] || activityImages['Harvesting']
      }));
    }
    
    // Fallback to default activities
    return [
      { type: 'Irrigation', count: 12, date: 'March 9', icon: '💧', color: '#1b5e20', field: 'Rice Field A', image: activityImages['Irrigation'] },
      { type: 'Fertilizing', count: 5, date: 'March 8', icon: '🌱', color: '#2e7d32', field: 'Vegetable Plot C', image: activityImages['Fertilizing'] },
      { type: 'Pest Control', count: 3, date: 'March 7', icon: '🐛', color: '#7b8f7c', field: 'Corn Field B', image: activityImages['Pest Control'] },
      { type: 'Harvesting', count: 2, date: 'March 6', icon: '🌾', color: '#a5d6a7', field: 'North Plot', image: activityImages['Harvesting'] }
    ];
  };
  
  const recentActivitiesData = generateRecentActivities();

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % recentActivitiesData.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [recentActivitiesData.length]);

  const goToPrevSlide = () => {
    setCurrentSlideIndex((prevIndex) =>
      prevIndex === 0 ? recentActivitiesData.length - 1 : prevIndex - 1
    );
  };

  const goToNextSlide = () => {
    setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % recentActivitiesData.length);
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
        {/* Farmer Carousel Card */}
        <div className="weather-card farmer-carousel-card">
          <h3>Recent Activity Highlights</h3>
          <div className="farmer-carousel">
            <div className="carousel-image-wrapper">
              <img
                src={recentActivitiesData[currentSlideIndex].image}
                alt={recentActivitiesData[currentSlideIndex].type}
                className="carousel-image"
              />
              <div className="carousel-overlay">
                <h4>{recentActivitiesData[currentSlideIndex].icon} {recentActivitiesData[currentSlideIndex].type}</h4>
                <p>{recentActivitiesData[currentSlideIndex].field} • {recentActivitiesData[currentSlideIndex].date}</p>
                <span className="carousel-activity-count">{recentActivitiesData[currentSlideIndex].count} times recorded</span>
              </div>
            </div>

            <div className="carousel-controls">
              <button className="carousel-btn" onClick={goToPrevSlide} aria-label="Previous activity">
                ‹
              </button>
              <div className="carousel-dots">
                {recentActivitiesData.map((slide, index) => (
                  <button
                    key={slide.type}
                    className={`carousel-dot ${currentSlideIndex === index ? 'active' : ''}`}
                    onClick={() => setCurrentSlideIndex(index)}
                    aria-label={`Go to ${slide.type}`}
                  />
                ))}
              </div>
              <button className="carousel-btn" onClick={goToNextSlide} aria-label="Next activity">
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Crop Status Overview */}
        <div className="crop-status-card">
          <h3>Crop Status Overview</h3>
          <div className="crop-status-list">
            {cropStatusData.map((crop, index) => (
              <div key={index} className="crop-status-item">
                <div className="crop-info">
                  <span className="crop-name">{crop.name}</span>
                  <span className="crop-percentage">{crop.percentage}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${crop.percentage}%`, backgroundColor: crop.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;
