import React, { useState } from 'react';
import '../styles/Alerts.css';

function Alerts({ crops = [] }) {
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const stockThreshold = 500; // kg

  // Filter crops where stock >= 500 kg
  const thresholdAlerts = crops.filter((crop) => {
    const stockAmount = Number(crop.stock?.amount) || 0;
    return stockAmount >= stockThreshold && !dismissedAlerts.includes(crop.id);
  });

  const dismissAlert = (cropId) => {
    setDismissedAlerts((prev) => [...prev, cropId]);
  };



  const formatQuantity = (quantity) => {
    if (!quantity) return '';
    const { amount, unit } = quantity;
    return `${amount}${unit ? ` ${unit}` : ''}`.trim();
  };

  const cropIconMap = {
    Tomato: '🍅',
    Carrots: '🥕',
    Nyam: '🌾',
    Corn: '🌽',
    Rice: '🌾',
    Vegetables: '🥬'
  };

  return (
    <div className="alerts-container">
      <section className="alerts-section section-card">
        <div className="alerts-header">
          <h2>Stock Level Alerts</h2>
          <span className="alert-badge">{thresholdAlerts.length}</span>
        </div>

        {thresholdAlerts.length === 0 ? (
          <div className="empty-state">
            <p>✓ No stock alerts. All crops are below {stockThreshold} kg threshold.</p>
          </div>
        ) : (
          <div className="alerts-list">
            {thresholdAlerts.map((crop) => {
              const icon = cropIconMap[crop.name] || crop.name?.charAt(0)?.toUpperCase() || '📦';

              return (
                <div key={crop.id} className="alert-card warning">
                  <div className="alert-card-header">
                    <div className="alert-icon-wrapper" style={{ backgroundColor: crop.color || '#fff3cd' }}>
                      <span>{icon}</span>
                    </div>
                    <div className="alert-info">
                      <h3>{crop.name}</h3>
                      <p className="alert-field">{crop.field || 'No field assigned'}</p>
                    </div>
                    <button className="close-btn" onClick={() => dismissAlert(crop.id)} aria-label="Dismiss alert">
                      ✕
                    </button>
                  </div>

                  <div className="alert-body">
                    <div className="stock-info">
                      <span className="label">Current Stock:</span>
                      <strong className="value">{formatQuantity(crop.stock)}</strong>
                    </div>
                    <div className="threshold-info">
                      <span className="label">Threshold:</span>
                      <strong className="value">{stockThreshold} kg</strong>
                    </div>
                    <div className="alert-message">
                      ⚠️ This crop has reached or exceeded the {stockThreshold} kg stock threshold. Consider harvesting or distribution.
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {dismissedAlerts.length > 0 && (
          <div className="dismissed-alerts">
            <p className="dismissed-label">
              {dismissedAlerts.length} alert{dismissedAlerts.length > 1 ? 's' : ''} dismissed
              <button className="text-link" onClick={() => setDismissedAlerts([])}>
                Show all
              </button>
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Alerts;
