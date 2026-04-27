import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchEvents, createEvent, updateEvent, deleteEvent, fetchDepartments, fetchCourses } from '../api';
import ConfirmDialog from './ConfirmDialog';
import './AdminList.css';
import './Schedules.css';

function formatKey(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(value) {
  if (!value) return 'No date selected';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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

function easterSunday(year) {
  // Gregorian computus
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function shiftDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function lastMondayOfAugust(year) {
  const d = new Date(year, 7, 31); // Aug 31
  while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
  return d;
}

function holidayEvent(id, title, date, holidayType = 'Regular Holiday') {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  return {
    _id: id,
    title,
    description: holidayType,
    start,
    end,
    location: 'Philippines',
    visibility: 'all',
    isHoliday: true,
    holidayType,
  };
}

function philippineHolidayEvents(year) {
  const easter = easterSunday(year);
  const holidays = [
    holidayEvent(`ph-${year}-new-year`, "New Year's Day", new Date(year, 0, 1)),
    holidayEvent(`ph-${year}-edsa`, 'EDSA People Power Revolution Anniversary', new Date(year, 1, 25), 'Special Non-Working Holiday'),
    holidayEvent(`ph-${year}-araw-ng-kagitingan`, 'Araw ng Kagitingan', new Date(year, 3, 9)),
    holidayEvent(`ph-${year}-labor-day`, 'Labor Day', new Date(year, 4, 1)),
    holidayEvent(`ph-${year}-independence`, 'Independence Day', new Date(year, 5, 12)),
    holidayEvent(`ph-${year}-ninoy`, 'Ninoy Aquino Day', new Date(year, 7, 21), 'Special Non-Working Holiday'),
    holidayEvent(`ph-${year}-national-heroes`, "National Heroes' Day", lastMondayOfAugust(year)),
    holidayEvent(`ph-${year}-all-saints`, "All Saints' Day", new Date(year, 10, 1), 'Special Non-Working Holiday'),
    holidayEvent(`ph-${year}-all-souls`, "All Souls' Day", new Date(year, 10, 2), 'Special Non-Working Holiday'),
    holidayEvent(`ph-${year}-bonifacio`, 'Bonifacio Day', new Date(year, 10, 30)),
    holidayEvent(`ph-${year}-christmas-eve`, 'Christmas Eve', new Date(year, 11, 24), 'Special Non-Working Holiday'),
    holidayEvent(`ph-${year}-christmas`, 'Christmas Day', new Date(year, 11, 25)),
    holidayEvent(`ph-${year}-rizal`, 'Rizal Day', new Date(year, 11, 30)),
    holidayEvent(`ph-${year}-new-years-eve`, "New Year's Eve", new Date(year, 11, 31), 'Special Non-Working Holiday'),
    holidayEvent(`ph-${year}-maundy-thursday`, 'Maundy Thursday', shiftDays(easter, -3)),
    holidayEvent(`ph-${year}-good-friday`, 'Good Friday', shiftDays(easter, -2)),
    holidayEvent(`ph-${year}-black-saturday`, 'Black Saturday', shiftDays(easter, -1), 'Special Non-Working Holiday'),
  ];
  return holidays;
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
  const [showEventModal, setShowEventModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

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

  const holidayEvents = useMemo(() => {
    const y = monthStart.getFullYear();
    return [...philippineHolidayEvents(y - 1), ...philippineHolidayEvents(y), ...philippineHolidayEvents(y + 1)];
  }, [monthStart]);
  const eventsByDay = useMemo(() => {
    const merged = [...events, ...holidayEvents];
    const map = Object.create(null);
    for (const e of merged) {
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
  }, [events, holidayEvents]);

  const weeks = useMemo(() => monthMatrix(monthStart), [monthStart]);

  const prevMonth = () => setMonthStart(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setMonthStart(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToCurrentMonth = () => {
    const now = new Date();
    setMonthStart(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDay(now);
  };

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
      setShowEventModal(false);
      load();
    } catch (err) {
      console.error(err);
      (showMessage || alert)(err.message || 'Create failed', 'error');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEvent(id);
      (showMessage || alert)('Deleted', 'success');
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Delete failed', 'error');
    }
  };

  const openCreateModal = () => {
    if (selectedDate) {
      setForm(f => ({
        ...f,
        start: f.start || `${selectedDate}T09:00`,
        end: f.end || `${selectedDate}T10:00`,
      }));
    }
    setEditingId(null);
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setEditingId(null);
    setForm({ title: '', description: '', start: '', end: '', location: '', visibility: 'all', departments: [], programs: [] });
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
          <div className="events-panel events-panel--top">
            <h3 className="events-panel-title">Events on {formatDisplayDate(selectedDate)}</h3>
            {loading ? <div className="muted">Loading…</div> : (
              <div>
                {(selectedDate && (eventsByDay[selectedDate] || []).length) ? (
                  (eventsByDay[selectedDate] || [])
                    .slice()
                    .sort((a, b) => Number(Boolean(b.isHoliday)) - Number(Boolean(a.isHoliday)))
                    .map(ev => (
                    <article key={ev._id} className="event-card">
                      <div className="event-card-main">
                        <div className="event-card-title">
                          {ev.title}
                          {ev.isHoliday ? <span className="event-card-badge">Holiday</span> : null}
                        </div>
                        <div className="event-card-meta">{ev.start ? new Date(ev.start).toLocaleString() : ''} {ev.end ? `— ${new Date(ev.end).toLocaleString()}` : ''}</div>
                        <div className="event-card-sub">
                          {ev.location || ''} • {ev.visibility}
                          {ev.holidayType ? ` • ${ev.holidayType}` : ''}
                        </div>
                        {ev.departments && ev.departments.length ? (
                          <div className="event-card-list">Departments: {ev.departments.map(d => (d && (d.name || d.code)) || d).join(', ')}</div>
                        ) : null}
                        {ev.programs && ev.programs.length ? (
                          <div className="event-card-list">Programs: {ev.programs.join(', ')}</div>
                        ) : null}
                      </div>
                      <div className="event-card-actions">
                        {isAdmin && !ev.isHoliday && (
                          <div className="app-action-buttons">
                            <button type="button" className="app-action-btn" title="Edit" aria-label="Edit event" onClick={() => {
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
                              setShowEventModal(true);
                            }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </button>
                            <button type="button" className="app-action-btn app-action-btn--danger" title="Delete" aria-label="Delete event" onClick={() => setConfirmDelete({ id: ev._id, label: ev.title || 'this event' })}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  ))
                ) : <div className="muted">No events on this date</div>}
              </div>
            )}

            {isAdmin && (
              <div className="schedule-event-actions">
                <button type="button" className="admins-btn admins-btn--primary" onClick={openCreateModal}>
                  Add Event
                </button>
              </div>
            )}

          </div>

          <div className="calendar-header">
            <div className="calendar-nav">
              <button type="button" className="admins-btn" onClick={prevMonth}>&lt;</button>
              <button type="button" className="admins-btn" onClick={nextMonth}>&gt;</button>
              <button type="button" className="admins-btn" onClick={goToCurrentMonth}>Today</button>
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
              const hasHoliday = ev.some(item => item.isHoliday);
              const isThisMonth = day.getMonth() === monthStart.getMonth();
              const selected = selectedDate === k;
              return (
                <button key={k} className={`calendar-day ${isThisMonth ? '' : 'calendar-day--other'} ${selected ? 'calendar-day--selected' : ''} ${ev.length ? 'calendar-day--has-events' : ''} ${hasHoliday ? 'calendar-day--holiday' : ''}`} onClick={() => onSelectDay(day)}>
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
      </section>

      {isAdmin && showEventModal && (
        <div className="schedule-modal-backdrop" role="presentation" onClick={closeEventModal}>
          <div className="schedule-modal" role="dialog" aria-modal="true" aria-label={editingId ? 'Edit event' : 'Add event'} onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-head">
              <h2 className="schedule-modal-title">{editingId ? 'Edit Event' : 'Add Event'}</h2>
              <button type="button" className="schedule-modal-close" aria-label="Close event form" onClick={closeEventModal}>
                ×
              </button>
            </div>
            <form onSubmit={create} className="event-form">
              <div className="form-column">
                <div className="input-field">
                  <label className="small-label">Event title</label>
                  <input required className="event-input" placeholder="Enter title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
                </div>
                <div className="input-field">
                  <label className="small-label">Description</label>
                  <input className="event-input" placeholder="Short description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
                </div>
                <div className="input-field">
                  <label className="small-label">Start date and time</label>
                  <input className="event-input" type="datetime-local" value={form.start} onChange={e=>setForm({...form,start:e.target.value})} />
                </div>
                <div className="input-field">
                  <label className="small-label">End date and time</label>
                  <input className="event-input" type="datetime-local" value={form.end} onChange={e=>setForm({...form,end:e.target.value})} />
                </div>
                <div className="input-field input-field--full">
                  <label className="small-label">Location</label>
                  <input className="event-input" placeholder="Room, venue, or online link" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} />
                </div>

                <div className="multi-select-field">
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
                </div>

                <div className="multi-select-field">
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
                </div>

                <div className="input-field input-field--full">
                  <label className="small-label">Who can see this event?</label>
                  <select className="event-input" value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}>
                    <option value="all">All (students & faculty)</option>
                    <option value="students">Students only</option>
                    <option value="faculty">Faculty only</option>
                    <option value="admins">Admins only</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button type="submit" className="admins-btn admins-btn--primary">{editingId ? 'Update event' : 'Save event'}</button>
                  <button type="button" className="admins-btn" onClick={closeEventModal}>Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete event?"
        message={`Delete ${confirmDelete ? confirmDelete.label : 'this event'}? This action cannot be undone.`}
        confirmText="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          const id = confirmDelete && confirmDelete.id;
          setConfirmDelete(null);
          if (id) await handleDelete(id);
        }}
      />
    </div>
  );
}
