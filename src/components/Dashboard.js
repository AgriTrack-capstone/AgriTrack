import React, { useEffect, useState } from 'react';
import '../styles/Dashboard.css';


function Dashboard({ crops = [], records = [] }) {
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Calculate dynamic values from crops and records
  const activeFields = new Set(crops.map((crop) => crop.field)).size;
  const totalCrops = crops.length;
  const pendingAlerts = records.filter((record) => record.status !== 'Completed').length;
  const totalProduction = crops.reduce((sum, crop) => sum + (crop.stock?.amount || 0), 0);
  const productionUnit = crops.length > 0 ? crops[0].stock?.unit || 'units' : 'units';

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
      label: 'Pending Tasks',
      value: pendingAlerts.toString(),
      description: pendingAlerts === 0 ? 'All tasks completed' : `${pendingAlerts} task${pendingAlerts !== 1 ? 's' : ''} pending`,
      borderColor: '#7b8f7c'
    },
    {
      id: 4,
      label: 'Total Inventory',
      value: `${totalProduction} ${productionUnit}`,
      description: 'Current stock levels',
      borderColor: '#a5d6a7'
    }
  ];

  const recentActivitiesData = [
    {
      type: 'Irrigation',
      count: 12,
      date: 'March 9',
      icon: '💧',
      color: '#1b5e20',
      field: 'Rice Field A',
      image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80'
    },
    {
      type: 'Fertilizing',
      count: 5,
      date: 'March 8',
      icon: '🌱',
      color: '#2e7d32',
      field: 'Vegetable Plot C',
      image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80'
    },
    {
      type: 'Pest Control',
      count: 3,
      date: 'March 7',
      icon: '🐛',
      color: '#7b8f7c',
      field: 'Corn Field B',
      image: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=1200&q=80'
    },
    {
      type: 'Harvesting',
      count: 2,
      date: 'March 6',
      icon: '🌾',
      color: '#a5d6a7',
      field: 'North Plot',
      image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
    }
  ];

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

  // Generate crop status data from crops array with health percentages
  const cropStatusData = crops.map((crop, index) => ({
    name: crop.name,
    percentage: 85 + Math.min(15, index * 3), // Dynamic health percentage based on crop
    color: crop.color || '#a5d6a7'
  }));

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
