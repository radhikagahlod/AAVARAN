import React from 'react';

export function StatusBadge({ status, type = 'status' }) {
  if (!status) return null;

  let badgeClass = 'badge-normal';
  const s = status.toLowerCase();

  if (s.includes('warning') || s.includes('high') || s.includes('collection recommended') || s.includes('danger')) {
    badgeClass = 'badge-danger';
  } else if (s.includes('attention') || s.includes('medium') || s.includes('elevated') || s.includes('in progress')) {
    badgeClass = 'badge-warning';
  } else if (s.includes('normal') || s.includes('resolved') || s.includes('low') || s.includes('healthy')) {
    badgeClass = 'badge-normal';
  } else if (s.includes('reported') || s.includes('info')) {
    badgeClass = 'badge-info';
  }

  // Handle resource badges
  if (type === 'resource') {
    if (s === 'water') badgeClass = 'badge-resource-water';
    else if (s === 'electricity') badgeClass = 'badge-resource-elec';
    else if (s === 'garbage') badgeClass = 'badge-resource-waste';
    else badgeClass = 'badge-info';
  }

  return <span className={`badge ${badgeClass}`}>{status}</span>;
}

export default StatusBadge;
