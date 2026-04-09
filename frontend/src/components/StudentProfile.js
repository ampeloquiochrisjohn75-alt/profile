import React, { useState } from 'react';
import { useAccess } from '../context/AccessContext';
import StudentForm from './StudentForm';
import SkillLevelPicker from './SkillLevelPicker';
import SkillIcon from './SkillIcon';
import './StudentProfile.css';

export default function StudentProfile({ student, currentUser, onBack, onUpdate, onDelete, initialEditing = false, onEditingChange }){
  const [editing, setEditing] = useState(false);
  const access = useAccess();
  React.useEffect(() => {
    if (initialEditing) setEditing(true);
  }, [initialEditing]);

  // keep parent informed when editing state changes

  // Inform parent about editing state so it can avoid navigating away
  React.useEffect(() => {
    if (typeof onEditingChange === 'function') onEditingChange(!!editing);
  }, [editing, onEditingChange]);

  if (!student) return null;

  const handleUpdate = async (data) => {
    if (onUpdate) await onUpdate(student._id, data);
    // Close the editor after a successful save for both admin and owner flows
    setEditing(false);
    if (typeof onEditingChange === 'function') onEditingChange(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this student?')) return;
    if (onDelete) await onDelete(student._id);
  };

  const canEdit =
    currentUser &&
    (access.isAdmin || String(currentUser.studentId || '') === String(student.studentId || ''));

  const initials =
    [student.firstName, student.lastName]
      .map((n) => (n && String(n).trim()[0]) || '')
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase() || String(student.studentId || '?')[0];

  const deptLabel =
    student.department && student.department.name
      ? student.department.name
      : student.department || '—';

  return (
    <div className="student-profile-page">
      <header className="student-profile-hero">
        <div className="student-profile-hero-text">
          <p className="student-profile-eyebrow">Student record</p>
          <h1 className="student-profile-title">
            {student.firstName} {student.lastName}
          </h1>
          <p className="student-profile-lead">
            ID <strong>{student.studentId}</strong>
            {student.course ? <> · {student.course}</> : null}
          </p>
        </div>
        <div className="student-profile-hero-aside">
          <div className="student-profile-hero-badge" aria-hidden="true">
            {initials}
          </div>
          <div className="student-profile-hero-actions">
            <button type="button" className="student-profile-btn student-profile-btn--ghost" onClick={() => { if (typeof onEditingChange === 'function') onEditingChange(false); if (typeof onBack === 'function') onBack(); }}>
              Back
            </button>
            {!editing && canEdit && (
              <>
                <button type="button" className="student-profile-btn student-profile-btn--primary" onClick={() => { if (typeof onEditingChange === 'function') onEditingChange(true); setEditing(true); }}>
                  Edit
                </button>
                {access.isAdmin && (
                  <button type="button" className="student-profile-btn student-profile-btn--danger" onClick={handleDelete}>
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {!editing && (
        <>
          <section className="student-profile-panel">
            <div className="student-profile-panel-head">
              <h2 className="student-profile-panel-title">Overview</h2>
              <p className="student-profile-panel-sub">Program, contact, skills, and activities</p>
            </div>
            <div className="student-profile-rows">
              <div className="student-profile-row">
                <span className="student-profile-label">Program</span>
                <span className="student-profile-value">{student.course || '—'}</span>
              </div>
              <div className="student-profile-row">
                <span className="student-profile-label">Department</span>
                <span className="student-profile-value">{deptLabel}</span>
              </div>
              <div className="student-profile-row">
                <span className="student-profile-label">Email</span>
                <span className="student-profile-value">{student.email || '—'}</span>
              </div>
              <div className="student-profile-row student-profile-row--block">
                <span className="student-profile-label">Skills</span>
                <div className="student-profile-value">
                  <div className="student-profile-skills">
                    {(student.skills || []).length === 0 && <span className="student-profile-empty">None listed</span>}
                    {(student.skills || []).map((s, idx) =>
                      typeof s === 'string' ? (
                        <span key={idx} className="student-profile-skill-tag">
                          {s}
                        </span>
                      ) : (
                        <span key={idx} className="student-profile-skill-level">
                          <SkillIcon level={s.level} size={16} />
                          <span>
                            {s.name} ({s.level})
                          </span>
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
              <div className="student-profile-row">
                <span className="student-profile-label">Activities</span>
                <span className="student-profile-value">
                  {(student.nonAcademicActivities || []).length
                    ? (student.nonAcademicActivities || []).join(', ')
                    : '—'}
                </span>
              </div>
              <div className="student-profile-row">
                <span className="student-profile-label">Affiliations</span>
                <span className="student-profile-value">
                  {(student.affiliations || []).length ? (student.affiliations || []).join(', ') : '—'}
                </span>
              </div>
            </div>
          </section>

          <section className="student-profile-panel">
            <div className="student-profile-panel-head">
              <h2 className="student-profile-panel-title">Academic history</h2>
              <p className="student-profile-panel-sub">Degrees and institutions on file</p>
            </div>
            {(student.academicHistory || []).length === 0 && (
              <p className="student-profile-empty-block">No academic records.</p>
            )}
            <ul className="student-profile-list">
              {(student.academicHistory || []).map((a, idx) => (
                <li key={idx} className="student-profile-subcard">
                  <div className="student-profile-subcard-title">
                    <strong>{a.degree}</strong> — {a.institution} ({a.year})
                  </div>
                  <div className="student-profile-subcard-meta">GPA: {a.gpa}</div>
                  {a.notes && <div className="student-profile-subcard-notes">Notes: {a.notes}</div>}
                </li>
              ))}
            </ul>
          </section>

          <section className="student-profile-panel">
            <div className="student-profile-panel-head">
              <h2 className="student-profile-panel-title">Violations</h2>
              <p className="student-profile-panel-sub">Recorded incidents</p>
            </div>
            {(student.violations || []).length === 0 && (
              <p className="student-profile-empty-block">No violations.</p>
            )}
            <ul className="student-profile-list">
              {(student.violations || []).map((v, idx) => (
                <li key={idx} className="student-profile-subcard student-profile-subcard--warn">
                  <div className="student-profile-subcard-title">
                    <strong>{v.type}</strong>
                    {v.date ? <> — {new Date(v.date).toLocaleDateString()}</> : null}
                  </div>
                  <div className="student-profile-subcard-notes">{v.description}</div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {editing && (
        <section className="student-profile-panel student-profile-panel--edit">
          <div className="student-profile-panel-head">
            <h2 className="student-profile-panel-title">Edit student</h2>
            <p className="student-profile-panel-sub">Update profile details and save</p>
          </div>
          <div className="student-profile-edit-body">
            {access.isAdmin ? (
              <StudentForm initial={student} onSubmit={handleUpdate} onCancel={() => { setEditing(false); if (typeof onEditingChange === 'function') onEditingChange(false); }} allowSkills={false} />
            ) : (
              <StudentSkillsForm
                initial={student}
                onSubmit={async (payload) => {
                  await handleUpdate(payload);
                  setEditing(false);
                  if (typeof onEditingChange === 'function') onEditingChange(false);
                }}
                onCancel={() => { setEditing(false); if (typeof onEditingChange === 'function') onEditingChange(false); }}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function StudentSkillsForm({ initial, onSubmit, onCancel }){
  const parseInitialSkills = () => {
    const arr = Array.isArray(initial.skills) ? initial.skills : (initial.skills ? [initial.skills] : []);
    return arr.map(s => {
      if (!s) return null;
      if (typeof s === 'string'){
        const parts = s.split(':').map(p => p.trim());
        return { name: parts[0] || '', level: parts[1] ? Number(parts[1]) || 2 : 2 };
      }
      return { name: s.name || s.skill || '', level: typeof s.level === 'number' ? s.level : (s.level ? Number(s.level) : 3) };
    }).filter(Boolean);
  };

  const [skills, setSkills] = useState(parseInitialSkills());
  const [activities, setActivities] = useState(Array.isArray(initial.nonAcademicActivities) ? initial.nonAcademicActivities.join(', ') : (initial.nonAcademicActivities || ''));

  const updateSkill = (idx, key, value) => setSkills(s => s.map((it,i) => i===idx ? { ...it, [key]: key === 'level' ? Number(value) : value } : it));
  const addSkill = () => setSkills(s => [...s, { name: '', level: 2 }]);
  const removeSkill = (idx) => setSkills(s => s.filter((_,i)=>i!==idx));

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      skills: skills.map(s => ({ name: String(s.name||'').toLowerCase(), level: Number(s.level||3) })),
      nonAcademicActivities: activities.split(',').map(a => a.trim()).filter(Boolean)
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="student-skills-form">
      <div className="student-profile-field">
        <label className="student-profile-field-label" htmlFor="skills-block">Skills</label>
        <div id="skills-block" className="student-profile-skills-editor">
          {skills.map((sk, idx) => (
            <div key={idx} className="student-profile-skill-row">
              <input
                className="student-profile-input"
                placeholder="Skill name"
                value={sk.name}
                onChange={e=>updateSkill(idx,'name',e.target.value)}
              />
              <SkillLevelPicker value={sk.level} onChange={(v) => updateSkill(idx,'level',v)} />
              <button type="button" className="student-profile-btn student-profile-btn--outline student-profile-btn--sm" onClick={()=>removeSkill(idx)}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="student-profile-btn student-profile-btn--ghost student-profile-btn--sm" onClick={addSkill}>
            Add skill
          </button>
        </div>
      </div>
      <div className="student-profile-field">
        <label className="student-profile-field-label" htmlFor="activities-input">Hobbies / activities (comma separated)</label>
        <input
          id="activities-input"
          className="student-profile-input"
          value={activities}
          onChange={e => setActivities(e.target.value)}
        />
      </div>
      <div className="student-profile-form-actions">
        <button type="submit" className="student-profile-btn student-profile-btn--primary">Save</button>
        <button type="button" className="student-profile-btn student-profile-btn--outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
