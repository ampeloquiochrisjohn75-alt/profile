import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchEvents, createEvent, updateEvent, deleteEvent, fetchDepartments, fetchCourses } from '../api';
import './AdminList.css';
import './Schedules.css';

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
        <div className="admins-hero-aside">
          <div className="admins-stat-pill" role="status">
            <span className="admins-stat-value">{events.length}</span>
            <span className="admins-stat-label">events</span>
          </div>
          <button type="button" className="admins-btn" onClick={() => load()}>Refresh</button>
        </div>
      </header>

      <section className="admins-panel schedules-panel">
        <div className="schedules-left">
          <div className="calendar-header">
            <div className="calendar-nav">
              <button type="button" className="admins-btn" onClick={prevMonth}>&lt;</button>
              <button type="button" className="admins-btn" onClick={nextMonth}>&gt;</button>
            </div>
            <div className="calendar-title">{monthStart.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
            <div className="calendar-actions" />
          </div>

          <div className="calendar-grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> (
              <div key={d} className="calendar-weekday">{d}</div>
            ))}
            {weeks.map((week) => week.map((day) => {
              const k = formatKey(day);
              const ev = eventsByDay[k] || [];
              const isThisMonth = day.getMonth() === monthStart.getMonth();
              const selected = selectedDate === k;
              return (
                <button key={k} className={`calendar-day ${isThisMonth ? '' : 'calendar-day--other'} ${selected ? 'calendar-day--selected' : ''} ${ev.length ? 'calendar-day--has-events' : ''}`} onClick={() => onSelectDay(day)}>
                  <div className="calendar-day-top">
                    <div className="calendar-day-num">{day.getDate()}</div>
                    <div className="calendar-day-count">{ev.length ? `${ev.length}` : ''}</div>
                  </div>
                  <div className="calendar-day-events">
                    {ev.slice(0,3).map(e => (
                      <div key={e._id} className="calendar-day-event">{e.title}</div>
                    ))}
                  </div>
                </button>
              );
            }))}
          </div>
        </div>

        <aside className="schedules-aside">
          <div className="events-panel">
            <h3 className="events-panel-title">Events on {selectedDate || '—'}</h3>
            {loading ? <div className="muted">Loading…</div> : (
              <div>
                {(selectedDate && (eventsByDay[selectedDate] || []).length) ? (
                  (eventsByDay[selectedDate] || []).map(ev => (
                    <article key={ev._id} className="event-card">
                      <div className="event-card-main">
                        <div className="event-card-title">{ev.title}</div>
                        <div className="event-card-meta">{ev.start ? new Date(ev.start).toLocaleString() : ''} {ev.end ? `— ${new Date(ev.end).toLocaleString()}` : ''}</div>
                        <div className="event-card-sub">{ev.location || ''} • {ev.visibility}</div>
                        {ev.departments && ev.departments.length ? (
                          <div className="event-card-list">Departments: {ev.departments.map(d => (d && (d.name || d.code)) || d).join(', ')}</div>
                        ) : null}
                        {ev.programs && ev.programs.length ? (
                          <div className="event-card-list">Programs: {ev.programs.join(', ')}</div>
                        ) : null}
                      </div>
                      <div className="event-card-actions">
                        {isAdmin && (
                          <>
                            <button type="button" className="admins-btn" onClick={() => {
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
                            <button type="button" className="admins-btn" onClick={() => handleDelete(ev._id)}>Delete</button>
                          </>
                        )}
                      </div>
                    </article>
                  ))
                ) : <div className="muted">No events</div>}
              </div>
            )}

            {isAdmin && (
              <form onSubmit={create} className="event-form">
                <div className="form-column">
                  <input required className="event-input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
                  <input className="event-input" placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
                  <input className="event-input" type="datetime-local" value={form.start} onChange={e=>setForm({...form,start:e.target.value})} />
                  <input className="event-input" type="datetime-local" value={form.end} onChange={e=>setForm({...form,end:e.target.value})} />
                  <input className="event-input" placeholder="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} />

                  <label className="small-label">Target departments (hold Ctrl/Cmd to select multiple)</label>
                  <select multiple className="event-input" value={form.departments || []} onChange={e=>{
                    const vals = Array.from(e.target.selectedOptions).map(o=>o.value);
                    setForm(f=>({...f,departments:vals}));
                  }}>
                    <option value="">-- none --</option>
                    {departmentsList.map(d => (
                      <option key={d._id} value={d._id}>{d.name || d.code || d._id}</option>
                    ))}
                  </select>

                  <label className="small-label">Target programs (hold Ctrl/Cmd to select multiple)</label>
                  <select multiple className="event-input" value={form.programs || []} onChange={e=>{
                    const vals = Array.from(e.target.selectedOptions).map(o=>o.value);
                    setForm(f=>({...f,programs:vals}));
                  }}>
                    <option value="">-- none --</option>
                    {programsList.map(p => (
                      <option key={p._id} value={p.courseCode}>{p.courseCode}{p.title ? ` — ${p.title}` : ''}</option>
                    ))}
                  </select>

                  <select className="event-input" value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}>
                    <option value="all">All (students & faculty)</option>
                    <option value="students">Students only</option>
                    <option value="faculty">Faculty only</option>
                    <option value="admins">Admins only</option>
                  </select>

                  <div className="form-actions">
                    <button type="submit" className="admins-btn admins-btn--primary">Save event</button>
                    <button type="button" className="admins-btn" onClick={()=>{ setForm({ title: '', description: '', start: '', end: '', location: '', visibility: 'all', departments: [], programs: [] }); }}>Clear</button>
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
