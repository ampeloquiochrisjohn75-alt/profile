import React from 'react';

// Simple SVG face icons for 1..5 proficiency
export default function SkillIcon({ level = 3, size = 18 }){
  const s = Number(level) || 3;
  const color = s === 1 ? '#e74c3c' : s === 2 ? '#f39c12' : s === 3 ? '#f1c40f' : s === 4 ? '#2ecc71' : '#27ae60';
  // eyes/mouth path variations
  const mouth = s <= 1 ? 'M6 12 Q9 9 12 12' : s === 2 ? 'M6 12 Q9 11 12 12' : s === 3 ? 'M6 12 Q9 12 12 12' : s === 4 ? 'M6 11 Q9 13 12 11' : 'M6 11 Q9 14 12 11';

  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <defs>
        <filter id="s" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.3" floodColor="#000" floodOpacity="0.15" />
        </filter>
      </defs>
      <g filter="url(#s)">
        <circle cx="9" cy="9" r="8" fill={color} />
      </g>
      <g transform="translate(0,0)" fill="#222" stroke="none">
        <circle cx="6.2" cy="7" r="0.9" fill="#fff" />
        <circle cx="11.8" cy="7" r="0.9" fill="#fff" />
        <circle cx="6.2" cy="7" r="0.5" fill="#222" />
        <circle cx="11.8" cy="7" r="0.5" fill="#222" />
        <path d={mouth} stroke="#222" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
