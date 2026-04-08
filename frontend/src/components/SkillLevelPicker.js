import React from 'react';
import SkillIcon from './SkillIcon';

export default function SkillLevelPicker({ value = 3, onChange }){
  const v = Number(value) || 3;
  const pct = ((v - 1) / 4) * 100;

  const handleClick = (level) => {
    if (onChange) onChange(level);
  };

  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{position:'relative', width:200, height:34, borderRadius:18, background:'linear-gradient(90deg,#e74c3c,#f39c12,#f1c40f,#2ecc71,#27ae60)'}}>
        <div style={{position:'absolute', left:`calc(${pct}% - 8px)`, top:-6, width:16, height:16, borderRadius:8, background:'#222', border:'3px solid #fff', boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}} />
        <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 10px', pointerEvents:'none'}}>
          <SkillIcon level={1} size={14} />
          <SkillIcon level={2} size={14} />
          <SkillIcon level={3} size={14} />
          <SkillIcon level={4} size={14} />
          <SkillIcon level={5} size={14} />
        </div>
      </div>
      <div style={{display:'flex',gap:6}}>
        {[1,2,3,4,5].map(l => (
          <button key={l} type="button" onClick={() => handleClick(l)} style={{border:'none', background:'transparent', cursor:'pointer', padding:4}} aria-label={`Set level ${l}`}>
            <SkillIcon level={l} size={20} />
          </button>
        ))}
      </div>
    </div>
  );
}
