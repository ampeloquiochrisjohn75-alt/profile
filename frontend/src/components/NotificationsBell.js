import React, { useEffect, useRef, useState } from 'react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../api';
import './Notifications.css';
import { useNavigate } from 'react-router-dom';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  async function load() {
    try {
      const res = await fetchNotifications();
      const list = (res && res.data) ? res.data : [];
      setNotes(list);
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const unread = notes.filter(n => !n.read).length;

  function timeAgo(iso){
    if(!iso) return '';
    const d = new Date(iso);
    const s = Math.floor((Date.now() - d.getTime())/1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s/60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m/60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h/24);
    return `${days}d`;
  }

  const onClickNote = async (n) => {
    try {
      await markNotificationRead(n._id);
      setNotes(notes.map(x => x._id === n._id ? { ...x, read: true } : x));
      setOpen(false);
      if (n.link) navigate(n.link);
    } catch (e) {
      console.error(e);
    }
  };

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotes(notes.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="notifications" ref={ref}>
      <button type="button" className="notif-bell" onClick={() => setOpen(o => !o)} title="Notifications" aria-haspopup="true" aria-expanded={open}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18.6 14.6V11a6 6 0 1 0-12 0v3.6c0 .538-.214 1.055-.595 1.395L4 17h5" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread ? <span className="notif-badge">{unread}</span> : null}
      </button>

      <div className={`notif-panel${open ? ' is-open' : ''}`} role="dialog" aria-hidden={!open}>
        <div className="notif-panel-header">
          <div className="notif-panel-title">Notifications</div>
          <div className="notif-panel-actions">
            <button type="button" className="notif-markall" onClick={onMarkAll}>Mark all read</button>
          </div>
        </div>
        <div className="notif-list">
          {notes.length === 0 ? (
            <div className="muted notif-empty">No notifications</div>
          ) : (
            notes.map(n => (
              <button key={n._id} type="button" className={`notif-item${n.read ? '' : ' unread'}`} onClick={() => onClickNote(n)}>
                <div className="notif-item-left" aria-hidden>
                  <span className={`notif-icon ${n.read ? 'read' : 'unread'}`} />
                </div>
                <div className="notif-item-body">
                  <div className="notif-item-msg">{n.message}</div>
                  <div className="notif-item-meta"><span className="notif-item-time">{timeAgo(n.createdAt)}</span>{n.link ? <span className="notif-item-link"> · Open</span> : null}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
