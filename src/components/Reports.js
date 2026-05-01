import React, { useState } from 'react';
import '../styles/Reports.css';

// StatCard Component
function StatCard({ label, value, subtitle, icon, bgColor }) {
  return (
    <div className="stat-card-reports">
      <div className="stat-label-reports">{label}</div>
      <div className="stat-value-reports">{value}</div>
      <div className="stat-subtitle-reports">{subtitle}</div>
      <div className={`stat-icon-reports ${bgColor}`}>{icon}</div>
    </div>
  );
}

function formatQuantity(quantity) {
  if (!quantity) return '0';
  const amount = Number.isFinite(quantity.amount) ? quantity.amount : 0;
  return `${amount}${quantity.unit ? ` ${quantity.unit}` : ''}`.trim();
}

function formatDateLabel(value) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getCropHealthStatus(stockAmount) {
  if (stockAmount >= 200) return 'Excellent';
  if (stockAmount >= 100) return 'Very Good';
  if (stockAmount >= 50) return 'Good';
  return 'Needs Attention';
}

function getProductionStatus(achievement) {
  if (achievement >= 100) return 'Exceeded';
  if (achievement >= 90) return 'On Track';
  return 'Below Target';
}

// Crop Health & Growth Summary Table Component
function CropHealthSummaryTable({ crops }) {
  const data = crops.map((crop) => {
    const stockAmount = crop.stock?.amount || 0;
    const healthScore = Math.min(100, 60 + Math.round(stockAmount / 10));
    const growthRate = Math.min(100, Math.round(stockAmount / 5) || 0);

    return {
      crop: crop.name,
      field: crop.field,
      stock: formatQuantity(crop.stock),
      healthScore: `${healthScore}%`,
      growthRate: `${growthRate}%`,
      status: getCropHealthStatus(stockAmount),
      trend: growthRate >= 75 ? '📈' : '➡️'
    };
  });

  return (
    <div className="summary-table-container">
      <div className="summary-header">
        <h3>🌱 Current Crop Health & Growth Summary</h3>
        <p>Live crop inventory from Farm Records</p>
      </div>
      <table className="summary-table">
        <thead>
          <tr>
            <th>Crop</th>
            <th>Field</th>
            <th>Stock</th>
            <th>Health Score</th>
            <th>Growth Rate</th>
            <th>Status</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.crop}</td>
              <td>{item.field}</td>
              <td>{item.stock}</td>
              <td className="score-cell">{item.healthScore}</td>
              <td className="score-cell">{item.growthRate}</td>
              <td>
                <span className={`status-badge-table status-${item.status.toLowerCase().replace(' ', '-')}`}>
                  {item.status}
                </span>
              </td>
              <td className="trend-cell">{item.trend}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Production Summary Component
function ProductionSummary({ crops, records }) {
  const productionRows = crops.map((crop) => {
    const actual = crop.stock?.amount || 0;
    const target = Math.max(100, Math.round(actual * 1.1) || 100);
    const achievement = target > 0 ? Math.round((actual / target) * 100) : 0;
    const recordCount = records.filter((record) => record.crop === crop.name).length;

    return {
      name: crop.name,
      actual,
      target,
      achievement,
      status: getProductionStatus(achievement),
      variance: actual - target,
      field: crop.field,
      recordCount
    };
  });

  const getStatusColor = (status) => {
    if (status === 'Below Target') return 'orange';
    if (status === 'Exceeded') return 'green';
    if (status === 'On Track') return 'blue';
    return 'gray';
  };

  const getVarianceColor = (variance) => {
    return variance >= 0 ? 'green' : 'orange';
  };

  return (
    <div className="production-section">
      {/* Production Table */}
      <div className="production-table-container">
        <div className="production-header">
          <h3>⭕ Production Summary by Crop</h3>
          <p>Current inventory and activity volume from Farm Records</p>
        </div>
        <table className="production-table">
          <thead>
            <tr>
              <th>Crop</th>
              <th>Field</th>
              <th>Actual Yield</th>
              <th>Target</th>
              <th>Achievement</th>
              <th>Activities</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {productionRows.map((crop, index) => (
              <tr key={index}>
                <td className="crop-name">{crop.name}</td>
                <td>{crop.field}</td>
                <td className="yield-cell">{crop.actual.toLocaleString()} kg</td>
                <td>{crop.target.toLocaleString()} kg</td>
                <td className="achievement-cell">{crop.achievement}%</td>
                <td>{crop.recordCount}</td>
                <td>
                  <span className={`status-badge-prod status-${getStatusColor(crop.status).toLowerCase()}`}>
                    {crop.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Harvest Cards Grid */}
      <div className="harvest-cards-grid">
        {productionRows.map((crop, index) => (
          <div key={index} className="harvest-card">
            <div className="harvest-card-header">
              <div className="harvest-card-title">
                <span className="harvest-icon">🌱</span>
                <div>
                  <h4>{crop.name}</h4>
                  <p>{crop.field}</p>
                </div>
              </div>
              <span className={`variance-badge variance-${getVarianceColor(crop.variance)}`}>
                {crop.variance > 0 ? '+' : ''}{crop.variance} kg
              </span>
            </div>
            <div className="harvest-card-details">
              <div className="stat-box">
                <span className="stat-label">Actual Yield</span>
                <span className="stat-val">{crop.actual}</span>
                <span className="stat-unit">kg</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Target</span>
                <span className="stat-val">{crop.target}</span>
                <span className="stat-unit">kg</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Achievement</span>
                <span className="stat-val">{crop.achievement}%</span>
                <span className="stat-unit">rate</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceUsage({ crops, records }) {
  const fields = Array.from(new Set([...crops.map((crop) => crop.field), ...records.map((record) => record.field)].filter(Boolean)));
  const resources = fields.map((field) => {
    const fieldCrops = crops.filter((crop) => crop.field === field);
    const fieldRecords = records.filter((record) => record.field === field);
    const totalStock = fieldCrops.reduce((sum, crop) => sum + (crop.stock?.amount || 0), 0);

    return {
      name: field,
      january: `${fieldCrops.length} crops`,
      february: `${fieldRecords.length} activities`,
      march: `${totalStock} total stock`,
      total: `${fieldCrops.length + fieldRecords.length} entries`,
      avg: fieldCrops.length ? `${Math.round(totalStock / fieldCrops.length)} stock/crop` : '0 stock/crop'
    };
  });

  return (
    <div className="resource-table-container">
      <div className="resource-header">
        <h3>⚡ Field Usage Summary</h3>
        <p>Current fields, crops, and related activity volume</p>
      </div>
      <table className="resource-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Crops</th>
            <th>Activities</th>
            <th>Total Stock</th>
            <th>Total Entries</th>
            <th>Average/ Crop</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource, index) => (
            <tr key={index}>
              <td className="resource-name">{resource.name}</td>
              <td>{resource.january}</td>
              <td>{resource.february}</td>
              <td>{resource.march}</td>
              <td className="total-cell">{resource.total}</td>
              <td className="avg-cell">{resource.avg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Expense Breakdown Component
function ExpenseBreakdown() {
  const expenses = [
    { category: 'Seeds & Seedlings', percentage: '15%', amount: '₱12,500', color: 'teal' },
    { category: 'Fertilizers', percentage: '21%', amount: '₱18,200', color: 'green' },
    { category: 'Pesticides', percentage: '10%', amount: '₱8,500', color: 'orange' },
    { category: 'Labor', percentage: '29%', amount: '₱25,000', color: 'purple' },
    { category: 'Water & Irrigation', percentage: '8%', amount: '₱6,500', color: 'cyan' },
    { category: 'Tools & Equipment', percentage: '17%', amount: '₱15,000', color: 'blue' }
  ];

  const getColorClass = (color) => `expense-item-${color}`;

  return (
    <div className="expense-breakdown-container">
      <div className="expense-header">
        <h3>💵 Expense Breakdown</h3>
        <p>Cost allocation by category</p>
      </div>
      <div className="expense-list">
        {expenses.map((expense, index) => (
          <div key={index} className={`expense-item ${getColorClass(expense.color)}`}>
            <div className="expense-info">
              <h4>{expense.category}</h4>
              <p>{expense.percentage} of total budget</p>
            </div>
            <span className="expense-amount">{expense.amount}</span>
          </div>
        ))}
      </div>
      <div className="total-expenses-box">
        <span>Total Expenses</span>
        <span className="total-amount">₱85,700</span>
      </div>
    </div>
  );
}

// Cost Efficiency Component
function CostEfficiency() {
  return (
    <div className="cost-efficiency-container">
      <div className="cost-efficiency-header">
        <h3>📊 Cost Efficiency Metrics</h3>
      </div>
      <div className="metrics-grid">
        <div className="metric-card metric-green">
          <div className="metric-top">
            <span>Cost per Hectare</span>
            <span className="metric-icon">📈</span>
          </div>
          <div className="metric-value">₱16,863</div>
          <div className="metric-desc">Based on 5.1 hectares total</div>
        </div>

        <div className="metric-card metric-blue">
          <div className="metric-top">
            <span>Cost per Kilogram</span>
            <span className="metric-icon">💰</span>
          </div>
          <div className="metric-value">₱9.10</div>
          <div className="metric-desc">Based on 9,450 kg total yield</div>
        </div>

        <div className="metric-card metric-purple">
          <div className="metric-top">
            <span>Efficiency Rating</span>
            <span className="metric-icon">⭐</span>
          </div>
          <div className="metric-value">87%</div>
          <div className="metric-desc">Above industry average</div>
        </div>
      </div>
    </div>
  );
}

// Top Expense Categories Component
function TopExpenseCategories() {
  const topExpenses = [
    { rank: 1, category: 'Labor', amount: '₱25,000', percentage: '29%' },
    { rank: 2, category: 'Fertilizers', amount: '₱18,200', percentage: '21%' },
    { rank: 3, category: 'Tools & Equipment', amount: '₱15,000', percentage: '17%' }
  ];

  return (
    <div className="top-expenses-container">
      <h3>🎆 Top Expense Categories</h3>
      <p>Your biggest cost drivers this season</p>
      <div className="top-expenses-grid">
        {topExpenses.map((expense, index) => (
          <div key={index} className="top-expense-card">
            <div className="rank-badge">{expense.rank}</div>
            <h4>{expense.category}</h4>
            <div className="expense-details">
              <span className="amount">{expense.amount}</span>
              <span className="percentage">{expense.percentage} of budget</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Activities Summary Component
function ActivitiesSummary({ records }) {
  const groupedActivities = Object.values(
    records.reduce((accumulator, record) => {
      const key = record.crop || 'Unassigned';
      if (!accumulator[key]) {
        accumulator[key] = {
          type: key,
          count: 0,
          latestDate: '',
          percentage: 0
        };
      }

      accumulator[key].count += 1;
      const recordDate = record.scheduleAt || record.date;
      if (!accumulator[key].latestDate || new Date(recordDate) > new Date(accumulator[key].latestDate)) {
        accumulator[key].latestDate = recordDate;
      }

      return accumulator;
    }, {})
  ).map((activity) => ({
    ...activity,
    percentage: records.length ? Math.round((activity.count / records.length) * 100) : 0,
    lastPerformed: formatDateLabel(activity.latestDate)
  }));

  const timelineMap = records.reduce((accumulator, record) => {
    const recordDate = new Date(record.scheduleAt || record.date);
    if (Number.isNaN(recordDate.getTime())) return accumulator;

    const monthKey = recordDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!accumulator[monthKey]) {
      accumulator[monthKey] = {
        month: monthKey,
        count: 0,
        activities: {}
      };
    }

    accumulator[monthKey].count += 1;
    const activityKey = record.crop || 'Unassigned';
    accumulator[monthKey].activities[activityKey] = (accumulator[monthKey].activities[activityKey] || 0) + 1;
    return accumulator;
  }, {});

  const timelineData = Object.values(timelineMap)
    .sort((left, right) => new Date(right.month) - new Date(left.month))
    .slice(0, 3)
    .map((period, index) => ({
      ...period,
      color: ['blue', 'green', 'purple'][index % 3],
      activities: Object.entries(period.activities).map(([name, count]) => ({ name, count }))
    }));

  return (
    <div className="activities-section">
      {/* Activities Table */}
      <div className="activities-table-container">
        <div className="activities-header">
          <h3>📊 Farm Activities Summary</h3>
          <p>Activity breakdown sourced from Farm Records</p>
        </div>
        <table className="activities-table">
          <thead>
            <tr>
              <th>Crop</th>
              <th>Total Count</th>
              <th>Percentage</th>
              <th>Last Performed</th>
            </tr>
          </thead>
          <tbody>
            {groupedActivities.map((activity, index) => (
              <tr key={index}>
                <td className="activity-name">
                  {activity.type}
                </td>
                <td>
                  <span className="count-badge">{activity.count} times</span>
                </td>
                <td>
                  <div className="percentage-bar">
                    <div className="percentage-fill" style={{ width: `${activity.percentage}%` }}></div>
                    <span className="percentage-text">{activity.percentage}%</span>
                  </div>
                </td>
                <td>{activity.lastPerformed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Timeline Section */}
      <div className="timeline-container">
        <h3>📅 Monthly Activity Timeline</h3>
        <div className="timeline">
          {timelineData.map((period, index) => (
            <div key={index} className={`timeline-item timeline-${period.color}`}>
              <div className={`timeline-marker marker-${period.color}`}>📅</div>
              <div className="timeline-content">
                <h4>{period.month}</h4>
                <p className="activity-count">{period.count} activities recorded</p>
                <div className="timeline-activities">
                  {period.activities.map((activity, idx) => (
                    <div key={idx} className="timeline-activity">
                      <span>{activity.name}</span>
                      <span className={`activity-count-badge count-${period.color}`}>
                        {activity.count} times
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Key Insights Component
function KeyInsights() {
  const insights = [
    { icon: '📈', title: 'Steady Growth', description: 'Health score improved by 22% over 6 months', color: 'green' },
    { icon: '✓', title: 'Optimal Conditions', description: 'Current crop health is in excellent range', color: 'blue' },
    { icon: '⭕', title: 'Consistent Improvement', description: 'Growth rate increased every month', color: 'purple' }
  ];

  return (
    <div className="insights-container">
      <h3>⚡ Key Insights</h3>
      <div className="insights-grid">
        {insights.map((insight, index) => (
          <div key={index} className={`insight-card insight-${insight.color}`}>
            <div className="insight-icon">{insight.icon}</div>
            <div className="insight-content">
              <h4>{insight.title}</h4>
              <p>{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Growth Factors Component
function GrowthFactors({ crops, records }) {
  const factors = [
    { name: 'Crop Entries', icon: '🌿', percentage: Math.min(100, crops.length * 25), color: 'green' },
    { name: 'Recorded Activities', icon: '📋', percentage: Math.min(100, records.length * 25), color: 'blue' },
    { name: 'Field Coverage', icon: '🌞', percentage: Math.min(100, new Set(crops.map((crop) => crop.field)).size * 30), color: 'orange' }
  ];

  return (
    <div className="growth-factors-container">
      <h3>🚀 Growth Factors Performance</h3>
      <div className="factors-list">
        {factors.map((factor, index) => (
          <div key={index} className={`factor-card factor-${factor.color}`}>
            <div className={`factor-icon-circle icon-${factor.color}`}>{factor.icon}</div>
            <div className="factor-content">
              <h4>{factor.name}</h4>
              <span className="factor-percentage">{factor.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Reports Component
function Reports({ crops = [], records = [] }) {
  const [activeTab, setActiveTab] = useState('Crop Growth');

  const totalStock = crops.reduce((sum, crop) => sum + (crop.stock?.amount || 0), 0);
  const activeFields = new Set(crops.map((crop) => crop.field)).size;
  const completedRecords = records.filter((record) => record.status === 'Completed').length;
  const averageCropStock = crops.length ? Math.round(totalStock / crops.length) : 0;
  const recordCompletionRate = records.length ? Math.round((completedRecords / records.length) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header-section">
        <div className="header-content">
          <h1>Farm Reports & Analytics</h1>
          <p>Comprehensive performance insights sourced from Farm Records</p>
        </div>
        <button className="print-btn no-print" onClick={handlePrint}>
          🖨️ Print Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          label="Total Crops"
          value={crops.length}
          subtitle="Live crop entries"
          icon="🌱"
          bgColor="green-bg"
        />
        <StatCard
          label="Total Activities"
          value={records.length}
          subtitle={`${completedRecords} completed`}
          icon="📋"
          bgColor="orange-bg"
        />
        <StatCard
          label="Active Fields"
          value={activeFields}
          subtitle="Unique field entries"
          icon="📊"
          bgColor="blue-bg"
        />
        <StatCard
          label="Avg Crop Stock"
          value={averageCropStock}
          subtitle={`${recordCompletionRate}% activity completion`}
          icon="📈"
          bgColor="purple-bg"
        />
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn no-print ${activeTab === 'Crop Growth' ? 'active' : ''}`}
          onClick={() => setActiveTab('Crop Growth')}
        >
          Crop Growth
        </button>
        <button
          className={`tab-btn no-print ${activeTab === 'Production' ? 'active' : ''}`}
          onClick={() => setActiveTab('Production')}
        >
          Production
        </button>
        <button
          className={`tab-btn no-print ${activeTab === 'Activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('Activities')}
        >
          Activities
        </button>
        <button
          className={`tab-btn no-print ${activeTab === 'Resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('Resources')}
        >
          Resources
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'Crop Growth' && (
          <div className="tab-pane">
            <CropHealthSummaryTable crops={crops} />
            <div className="insights-row">
              <KeyInsights />
              <GrowthFactors crops={crops} records={records} />
            </div>
          </div>
        )}

        {activeTab === 'Production' && (
          <div className="tab-pane">
            <ProductionSummary crops={crops} records={records} />
          </div>
        )}

        {activeTab === 'Activities' && (
          <div className="tab-pane">
            <ActivitiesSummary records={records} />
          </div>
        )}

        {activeTab === 'Resources' && (
          <div className="tab-pane">
            <ResourceUsage crops={crops} records={records} />
            <div className="resources-row">
              <ExpenseBreakdown />
              <CostEfficiency />
            </div>
            <TopExpenseCategories />
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
