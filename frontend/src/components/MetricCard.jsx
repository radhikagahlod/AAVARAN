import React from 'react';
import StatusBadge from './StatusBadge';

export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  iconColor = '#10b981',
  iconBg = 'rgba(16, 185, 129, 0.12)',
  status,
  footerText,
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className="stat-icon" style={{ backgroundColor: iconBg, color: iconColor }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="stat-value-group">
        <span className="stat-value">{value}</span>
        {unit && <span className="stat-unit">{unit}</span>}
      </div>

      <div className="stat-footer">
        <span>{footerText || 'Status'}</span>
        {status && <StatusBadge status={status} />}
      </div>
    </div>
  );
}

export default MetricCard;
