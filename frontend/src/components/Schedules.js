import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchEvents, createEvent, updateEvent, deleteEvent, fetchDepartments, fetchCourses } from '../api';

function formatKey(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthMatrix(monthStart) {
  // returns array of 6 weeks, each week is 7 Date objects
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0..6
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startDay);
  const weeks = [];
  let cur = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export default function Schedules({ showMessage }) {
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', start: '', end: '', location: '', visibility: 'all', departments: [], programs: [] });
  const [departmentsList, setDepartmentsList] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch(e) { return null; }
  }, []);
  const isAdmin = user && user.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEvents();
      const list = (res && res.data) ? res.data : [];
      // normalize dates
      const norm = list.map(e => ({ ...e, start: e.start ? new Date(e.start) : null, end: e.end ? new Date(e.end) : null }));
      setEvents(norm);
    } catch (err) {
      console.error(err);
      (showMessage || alert)(err.message || 'Failed to load events', 'error');
      setEvents([]);
    } finally { setLoading(false); }
  }, [showMessage]);

  useEffect(() => { load(); }, [load]);

  // fetch departments and programs for admin selectors
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const deps = await fetchDepartments();
        if (mounted) setDepartmentsList((deps && deps.data) ? deps.data : []);
      } catch (e) {
        // ignore
      }
      try {
        const pro = await fetchCourses();
        if (mounted) setProgramsList((pro && pro.data) ? pro.data : []);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const eventsByDay = useMemo(() => {
    const map = Object.create(null);
    for (const e of events) {
      const s = e.start || (e.createdAt ? new Date(e.createdAt) : null);
      const t = e.end || s;
      if (!s) continue;
      let cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const last = new Date(t.getFullYear(), t.getMonth(), t.getDate());
      while (cur <= last) {
        const k = formatKey(cur);
        (map[k] = map[k] || []).push(e);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  const weeks = useMemo(() => monthMatrix(monthStart), [monthStart]);

  const prevMonth = () => setMonthStart(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setMonthStart(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const onSelectDay = (d) => {
    setSelectedDate(formatKey(d));
    // prepare default form times for admin
    if (isAdmin) {
      const dateStr = d.toISOString().slice(0,10);
      setForm(f => ({ ...f, start: dateStr + 'T09:00', end: dateStr + 'T10:00' }));
    }
  };

  const create = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        visibility: form.visibility || 'all',
        start: form.start ? new Date(form.start).toISOString() : undefined,
        end: form.end ? new Date(form.end).toISOString() : undefined,
        departments: Array.isArray(form.departments) ? form.departments : [],
        programs: Array.isArray(form.programs) ? form.programs : [],
      };
      if (editingId) {
        await updateEvent(editingId, payload);
        setEditingId(null);
        (showMessage || alert)('Event updated', 'success');
      } else {
        await createEvent(payload);
        (showMessage || alert)('Event created', 'success');
      }
      setForm({ title: '', description: '', start: '', end: '', location: '', visibility: 'all', departments: [], programs: [] });
      load();
    } catch (err) {
      console.error(err);
      (showMessage || alert)(err.message || 'Create failed', 'error');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteEvent(id);
      (showMessage || alert)('Deleted', 'success');
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="admins-page">
      <header className="admins-hero">
        <div className="admins-hero-text">
          <p className="admins-eyebrow">Schedules</p>
          <h1 className="admins-title">Calendar</h1>
          <p className="admins-lead">View and mark important dates. Admins can add events and choose audience (students/faculty/all).</p>
        </div>
      </header>

      <section className="admins-panel" style={{display:'flex',gap:16,alignItems:'flex-start'}}>
        <div style={{width:680}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div>
              <button type="button" onClick={prevMonth}>&lt;</button>
              <button type="button" onClick={nextMonth} style={{marginLeft:8}}>&gt;</button>
            </div>
            <div style={{fontWeight:700}}>{monthStart.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
            <div />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> (
              <div key={d} style={{textAlign:'center',fontWeight:700}}>{d}</div>
            ))}
            {weeks.map((week,i) => week.map((day) => {
              const k = formatKey(day);
              const ev = eventsByDay[k] || [];
              const isThisMonth = day.getMonth() === monthStart.getMonth();
              return (
                <button key={k} onClick={() => onSelectDay(day)} style={{minHeight:80, padding:8, textAlign:'left', border: '1px solid #eee', background: isThisMonth ? '#fff' : '#fafafa'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontSize:12}}>{day.getDate()}</div>
                    <div style={{fontSize:11,color:'#666'}}>{ev.length ? `${ev.length}` : ''}</div>
                  </div>
                  <div style={{marginTop:6,fontSize:12}}>
                    {ev.slice(0,3).map(e => (
                      <div key={e._id} style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.title}</div>
                    ))}
                  </div>
                </button>
              );
            }))}
          </div>
        </div>

        <aside style={{width:360}}>
          <div style={{padding:12,border:'1px solid #eee',borderRadius:6}}>
            <h3 style={{marginTop:0}}>Events on {selectedDate || '—'}</h3>
            {loading ? <div>Loading…</div> : (
              <div>
                {(selectedDate && (eventsByDay[selectedDate] || []).length) ? (
                  (eventsByDay[selectedDate] || []).map(ev => (
                    <article key={ev._id} style={{padding:8,borderBottom:'1px solid #f0f0f0'}}>
                      <div style={{fontWeight:700}}>{ev.title}</div>
                      <div style={{fontSize:12,color:'#666'}}>{ev.start ? new Date(ev.start).toLocaleString() : ''} {ev.end ? `— ${new Date(ev.end).toLocaleString()}` : ''}</div>
                      <div style={{fontSize:13,marginTop:4}}>{ev.location || ''} • {ev.visibility}</div>
                      {ev.departments && ev.departments.length ? (
                        <div style={{fontSize:12,color:'#444',marginTop:6}}>Departments: {ev.departments.map(d => (d && (d.name || d.code)) || d).join(', ')}</div>
                      ) : null}
                      {ev.programs && ev.programs.length ? (
                        <div style={{fontSize:12,color:'#444',marginTop:4}}>Programs: {ev.programs.join(', ')}</div>
                      ) : null}
                      {isAdmin && (
                        <div style={{marginTop:8}}>
                          <button type="button" onClick={() => {
                            setEditingId(ev._id);
                            setForm({
                              title: ev.title,
                              description: ev.description || '',
                              start: ev.start ? new Date(ev.start).toISOString().slice(0,16) : '',
                              end: ev.end ? new Date(ev.end).toISOString().slice(0,16) : '',
                              location: ev.location || '',
                              visibility: ev.visibility || 'all',
                              departments: ev.departments ? ev.departments.map(d => (d && d._id ? d._id.toString() : d)) : [],
                              programs: ev.programs || [],
                            });
                          }}>Edit</button>
                          <button type="button" style={{marginLeft:8}} onClick={() => handleDelete(ev._id)}>Delete</button>
                        </div>
                      )}
                    </article>
                  ))
                ) : <div style={{padding:8}}>No events</div>}
              </div>
            )}

            {isAdmin && (
              <form onSubmit={create} style={{marginTop:12}}>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <input required placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
                  <input placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
                  <input type="datetime-local" value={form.start} onChange={e=>setForm({...form,start:e.target.value})} />
                  <input type="datetime-local" value={form.end} onChange={e=>setForm({...form,end:e.target.value})} />
                  <input placeholder="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} />
                  <label style={{fontSize:12}}>Target departments (hold Ctrl/Cmd to select multiple)</label>
                  <select multiple value={form.departments || []} onChange={e=>{
                    const vals = Array.from(e.target.selectedOptions).map(o=>o.value);
                    setForm(f=>({...f,departments:vals}));
                  }} style={{minHeight:80}}>
                    <option value="">-- none --</option>
                    {departmentsList.map(d => (
                      <option key={d._id} value={d._id}>{d.name || d.code || d._id}</option>
                    ))}
                  </select>

                  <label style={{fontSize:12}}>Target programs (hold Ctrl/Cmd to select multiple)</label>
                  <select multiple value={form.programs || []} onChange={e=>{
                    const vals = Array.from(e.target.selectedOptions).map(o=>o.value);
                    setForm(f=>({...f,programs:vals}));
                  }} style={{minHeight:80}}>
                    <option value="">-- none --</option>
                    {programsList.map(p => (
                      <option key={p._id} value={p.courseCode}>{p.courseCode}{p.title ? ` — ${p.title}` : ''}</option>
                    ))}
                  </select>

                  <select value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}>
                    <option value="all">All (students & faculty)</option>
                    <option value="students">Students only</option>
                    <option value="faculty">Faculty only</option>
                    <option value="admins">Admins only</option>
                  </select>
                  <div style={{display:'flex',gap:8}}>
                    <button type="submit">Save event</button>
                    <button type="button" onClick={()=>{ setForm({ title: '', description: '', start: '', end: '', location: '', visibility: 'all', departments: [], programs: [] }); }}>Clear</button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
