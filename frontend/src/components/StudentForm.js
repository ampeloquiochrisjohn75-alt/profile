import React, { useState, useEffect, useRef } from 'react';
import { fetchDepartments, fetchCourses } from '../api';
import './StudentForm.css';

export default function StudentForm({ onSubmit, onCancel, initial = null, allowSkills = true, isRegistration = false, showMessage }){
  const [form, setForm] = useState({ studentId: '', firstName: '', lastName: '', email: '', course: '', skills: '', nonAcademicActivities: '', affiliations: '', department: '', password: '', confirmPassword: '' });
  const [academic, setAcademic] = useState([]);
  const [violations, setViolations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  const prevInitialId = useRef(null);
  useEffect(() => {
    if (initial == null) return;
    // Only initialize the form when the actual student ID changes to avoid
    // resetting user input if the parent passes a new object instance with
    // the same student data (causes blinking/focus loss while typing).
    const iid = initial._id || initial.studentId || '';
    if (prevInitialId.current === iid) return;
    prevInitialId.current = iid;
    setForm({
      studentId: initial.studentId || '',
      firstName: initial.firstName || '',
      lastName: initial.lastName || '',
      email: initial.email || '',
      course: initial.course || '',
      skills: Array.isArray(initial.skills) ? initial.skills.map(sk => (typeof sk === 'string' ? sk : `${sk.name}:${sk.level}`)).join(', ') : (initial.skills || ''),
      nonAcademicActivities: Array.isArray(initial.nonAcademicActivities) ? initial.nonAcademicActivities.join(', ') : (initial.nonAcademicActivities || ''),
      affiliations: Array.isArray(initial.affiliations) ? initial.affiliations.join(', ') : (initial.affiliations || ''),
      department: initial.department ? (typeof initial.department === 'string' ? initial.department : (initial.department._id || '')) : '',
      password: '',
      confirmPassword: '',
    });
    setAcademic(Array.isArray(initial.academicHistory) ? initial.academicHistory.map(a => ({ ...a })) : []);
    setViolations(Array.isArray(initial.violations) ? initial.violations.map(v => ({ ...v })) : []);
  }, [initial]);

  // find CCS department object when available
  const ccsDept = departments.find(d => (
    d && (
      (d.code && String(d.code).toUpperCase() === 'CCS') ||
      (d.name && String(d.name).toUpperCase() === 'CCS')
    )
  ));

  const capitalizeName = (s) => {
    if (!s && s !== '') return s;
    return String(s || '').split(' ').map(p => p ? (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()) : '').join(' ');
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchDepartments();
        if (!mounted) return;
        const deps = res.data || [];
        // If creating a new student, default department to CCS when possible
        if (!initial) {
          const cc = deps.find(d => (d.code && String(d.code).toUpperCase() === 'CCS') || (d.name && String(d.name).toUpperCase() === 'CCS'));
          if (cc) {
            setDepartments(deps);
            setForm(f => ({ ...f, department: cc._id }));
          } else {
            // Insert a synthetic CCS option so the select shows CCS even when not present server-side
            const synthetic = { _id: 'CCS', name: 'CCS', code: 'CCS' };
            setDepartments([synthetic, ...deps]);
            setForm(f => ({ ...f, department: 'CCS' }));
          }
        } else {
          setDepartments(deps);
        }
      } catch (e) {
        console.warn('fetchDepartments failed', e.message);
      }
    })();
    (async () => {
      try {
        const res = await fetchCourses();
        if (!mounted) return;
        setCourses((res && res.data) || []);
      } catch (err) {
        console.warn('fetchCourses failed', err.message);
      }
    })();
    return () => { mounted = false; };
  }, [initial]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleNameBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'firstName' || name === 'lastName') {
      const v = capitalizeName(value);
      setForm(f => ({ ...f, [name]: v }));
    }
  };

  const addAcademic = () => setAcademic(a => [...a, { institution: '', degree: '', year: '', gpa: '', notes: '' }]);
  const updateAcademic = (idx, key, value) => setAcademic(a => a.map((it,i)=> i===idx ? { ...it, [key]: value } : it));
  const removeAcademic = (idx) => setAcademic(a => a.filter((_,i)=>i!==idx));

  const addViolation = () => setViolations(v => [...v, { type: '', date: '', description: '' }]);
  const updateViolation = (idx, key, value) => setViolations(v => v.map((it,i)=> i===idx ? { ...it, [key]: value } : it));
  const removeViolation = (idx) => setViolations(v => v.filter((_,i)=>i!==idx));

  const submit = (e) => {
    e.preventDefault();
    
    // Password validation for registration
    if (isRegistration || (!initial && !allowSkills)) { // When adding new student (not editing)
        if (!form.firstName || !form.firstName.trim()) {
          (showMessage || ((m) => alert(m)))('First name is required for registration', 'error');
          return;
        }
        if (!form.lastName || !form.lastName.trim()) {
          (showMessage || ((m) => alert(m)))('Last name is required for registration', 'error');
          return;
        }
        if (!form.email) {
          (showMessage || ((m) => alert(m)))('Email is required for registration', 'error');
          return;
        }
        if (!form.password) {
          (showMessage || ((m) => alert(m)))('Password is required', 'error');
          return;
        }
        if (form.password.length < 6) {
          (showMessage || ((m) => alert(m)))('Password must be at least 6 characters', 'error');
          return;
        }
        if (form.password !== form.confirmPassword) {
          (showMessage || ((m) => alert(m)))('Passwords do not match', 'error');
          return;
        }
    }
    
    // Normalize names before submit (apply to both create and edit)
    const firstNameVal = capitalizeName(form.firstName);
    const lastNameVal = capitalizeName(form.lastName);
    // ensure visible form matches normalized values
    if (form.firstName !== firstNameVal || form.lastName !== lastNameVal) {
      setForm(f => ({ ...f, firstName: firstNameVal, lastName: lastNameVal }));
    }

    const payload = {
      ...(initial && form.studentId ? { studentId: form.studentId } : {}),
      firstName: firstNameVal,
      lastName: lastNameVal,
      email: form.email,
      course: form.course,
      // Include password for registration
      ...(isRegistration || (!initial && !allowSkills) ? { password: form.password } : {}),
      // only include skills if allowed (admins cannot edit skills)
      ...(allowSkills ? { skills: form.skills.split(',').map(s=>s.trim()).filter(Boolean) } : {}),
      nonAcademicActivities: form.nonAcademicActivities.split(',').map(s=>s.trim()).filter(Boolean),
      affiliations: form.affiliations.split(',').map(s=>s.trim()).filter(Boolean),
      academicHistory: academic.map(a => ({
        institution: a.institution || '', degree: a.degree || '', year: a.year ? Number(a.year) : undefined, gpa: a.gpa ? Number(a.gpa) : undefined, notes: a.notes || ''
      })),
      violations: violations.map(v => ({ type: v.type || '', date: v.date ? new Date(v.date) : undefined, description: v.description || '' }))
      , department: form.department || undefined
    };
    onSubmit(payload);
  };

  const isNew = !initial;

  return (
    <div className={`student-form ${isNew ? 'student-form--add' : 'student-form--edit'}`}>
      <div className="student-form-page">
        <header className="student-form-hero">
          {isNew && <p className="student-form-eyebrow">Student directory</p>}
          <h1 className="student-form-title">{initial ? 'Edit student' : 'Add new student'}</h1>
          {isNew && (
            <p className="student-form-lead">
              Register a login, assign a program and department, and capture optional history and conduct notes in one place.
            </p>
          )}
        </header>

        <form className="student-form-card" onSubmit={submit}>
          <section className="student-form-section">
            <div className="student-form-section-head">
              <h2 className="student-form-section-title">Identity & login</h2>
              <p className="student-form-section-hint">Required fields are marked with *</p>
            </div>
            <div className="student-form-grid student-form-grid--2">
              {initial ? (
                <div className="form-group form-group--span2">
                  <label htmlFor="sf-studentId">Student ID</label>
                  <input id="sf-studentId" type="text" name="studentId" value={form.studentId} onChange={handle} readOnly />
                </div>
              ) : null}
              <div className="form-group">
                <label htmlFor="sf-firstName">First name {(isRegistration || (!initial && !allowSkills)) ? '*' : ''}</label>
                <input id="sf-firstName" type="text" name="firstName" value={form.firstName} onChange={handle} onBlur={handleNameBlur} required={isRegistration || (!initial && !allowSkills)} autoComplete="given-name" />
              </div>
              <div className="form-group">
                <label htmlFor="sf-lastName">Last name {(isRegistration || (!initial && !allowSkills)) ? '*' : ''}</label>
                <input id="sf-lastName" type="text" name="lastName" value={form.lastName} onChange={handle} onBlur={handleNameBlur} required={isRegistration || (!initial && !allowSkills)} autoComplete="family-name" />
              </div>
              <div className="form-group form-group--span2">
                <label htmlFor="sf-email">Email {(isRegistration || (!initial && !allowSkills)) ? '*' : ''}</label>
                <input id="sf-email" type="email" name="email" value={form.email} onChange={handle} required={isRegistration || (!initial && !allowSkills)} autoComplete="email" />
              </div>
            </div>

            {(isRegistration || (!initial && !allowSkills)) && (
              <div className="student-form-grid student-form-grid--2 student-form-password-block">
                <div className="form-group">
                  <label htmlFor="sf-password">Password *</label>
                  <input id="sf-password" type="password" name="password" value={form.password} onChange={handle} required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" />
                </div>
                <div className="form-group">
                  <label htmlFor="sf-confirmPassword">Confirm password *</label>
                  <input id="sf-confirmPassword" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handle} required autoComplete="new-password" />
                </div>
              </div>
            )}
          </section>

          <section className="student-form-section">
            <div className="student-form-section-head">
              <h2 className="student-form-section-title">Program & department</h2>
              <p className="student-form-section-hint">Tie the record to your academic structure</p>
            </div>
            <div className="student-form-grid student-form-grid--2">
              <div className="form-group">
                <label htmlFor="sf-course">Program</label>
                <select id="sf-course" name="course" value={form.course} onChange={handle}>
                  <option value="">Select program</option>
                  {courses.map(c => (
                    <option key={c._id} value={c.courseCode || c.title || c._id}>
                      {c.courseCode ? `${c.courseCode} ${c.title || ''}`.trim() : (c.title || c.courseCode || 'Untitled program')}
                    </option>
                  ))}
                </select>
                <div className="student-form-inline-link-row">
                  <a className="student-form-inline-link" href="/programs">Manage programs</a>
                </div>
              </div>
              <div className="form-group">
                <label>Department</label>
                {/* Site is CCS-only: show CCS as read-only and keep department id in state */}
                <input type="text" value={ccsDept ? ccsDept.name : 'CCS'} readOnly disabled />
                <input type="hidden" name="department" value={form.department || ''} />
              </div>
            </div>
          </section>

          <section className="student-form-section">
            <div className="student-form-section-head">
              <h2 className="student-form-section-title">Profile & activities</h2>
              <p className="student-form-section-hint">Use commas to separate multiple entries</p>
            </div>
            {allowSkills && (
              <div className="form-group">
                <label htmlFor="sf-skills">Skills</label>
                <input id="sf-skills" type="text" name="skills" value={form.skills} onChange={handle} placeholder="e.g. JavaScript:3, Public speaking:2" />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="sf-activities">Non-academic activities</label>
              <input id="sf-activities" type="text" name="nonAcademicActivities" value={form.nonAcademicActivities} onChange={handle} placeholder="Clubs, sports, volunteering…" />
            </div>
            <div className="form-group">
              <label htmlFor="sf-affiliations">Affiliations</label>
              <input id="sf-affiliations" type="text" name="affiliations" value={form.affiliations} onChange={handle} placeholder="Organizations, honors societies…" />
            </div>
          </section>

          <section className="student-form-section student-form-section--nested">
            <div className="student-form-section-head">
              <h2 className="student-form-section-title">Academic history</h2>
              <p className="student-form-section-hint">Prior schools or qualifications (optional)</p>
            </div>
            {academic.map((a, idx) => (
              <div key={idx} className="student-form-repeatable">
                <span className="student-form-repeatable-label">Record {idx + 1}</span>
                <div className="student-form-grid student-form-grid--2">
                  <div className="form-group">
                    <label>Institution</label>
                    <input value={a.institution} onChange={e=>updateAcademic(idx,'institution',e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Degree</label>
                    <input value={a.degree} onChange={e=>updateAcademic(idx,'degree',e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Year</label>
                    <input value={a.year} onChange={e=>updateAcademic(idx,'year',e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>GPA</label>
                    <input value={a.gpa} onChange={e=>updateAcademic(idx,'gpa',e.target.value)} />
                  </div>
                  <div className="form-group form-group--span2">
                    <label>Notes</label>
                    <textarea value={a.notes} onChange={e=>updateAcademic(idx,'notes',e.target.value)} rows={2} />
                  </div>
                </div>
                <button type="button" className="student-form-btn student-form-btn--ghost student-form-btn--sm" onClick={()=>removeAcademic(idx)}>Remove record</button>
              </div>
            ))}
            <button type="button" className="student-form-btn student-form-btn--outline" onClick={addAcademic}>+ Add academic record</button>
          </section>

          <section className="student-form-section student-form-section--nested">
            <div className="student-form-section-head">
              <h2 className="student-form-section-title">Violations</h2>
              <p className="student-form-section-hint">Disciplinary or policy notes (optional)</p>
            </div>
            {violations.map((v, idx) => (
              <div key={idx} className="student-form-repeatable student-form-repeatable--alert">
                <span className="student-form-repeatable-label">Entry {idx + 1}</span>
                <div className="student-form-grid student-form-grid--2">
                  <div className="form-group">
                    <label>Type</label>
                    <input value={v.type} onChange={e=>updateViolation(idx,'type',e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={v.date ? (typeof v.date === 'string' ? v.date.split('T')[0] : new Date(v.date).toISOString().split('T')[0]) : ''} onChange={e=>updateViolation(idx,'date',e.target.value)} />
                  </div>
                  <div className="form-group form-group--span2">
                    <label>Description</label>
                    <textarea value={v.description} onChange={e=>updateViolation(idx,'description',e.target.value)} rows={2} />
                  </div>
                </div>
                <button type="button" className="student-form-btn student-form-btn--ghost student-form-btn--sm" onClick={()=>removeViolation(idx)}>Remove entry</button>
              </div>
            ))}
            <button type="button" className="student-form-btn student-form-btn--outline" onClick={addViolation}>+ Add violation</button>
          </section>

          <div className="student-form-actions">
            <button type="button" className="student-form-btn student-form-btn--ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="student-form-btn student-form-btn--primary">{initial ? 'Save changes' : 'Create student'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
