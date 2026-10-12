import React from 'react';
import { Info } from 'lucide-react';

export function DemoBanner({
  message = 'Initial campus telemetry readings and baseline seed records are synthetic simulations for demonstration. User-reported issues are stored live.',
}) {
  return (
    <div className="demo-banner">
      <div className="demo-banner-content">
        <Info size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <div>
          <strong>Transparent Simulation Notice: </strong>
          <span>{message}</span>
        </div>
      </div>
      <span className="banner-badge">Demo / Synthetic Mode</span>
    </div>
  );
}

export default DemoBanner;
