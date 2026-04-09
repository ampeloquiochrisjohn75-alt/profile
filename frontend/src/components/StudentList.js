import React from 'react';
import SkillIcon from './SkillIcon';
import './StudentList.css';

function initials(firstName, lastName, studentId) {
  const a = (firstName && String(firstName).trim()[0]) || '';
  const b = (lastName && String(lastName).trim()[0]) || '';
  if (a || b) return (a + b).toUpperCase();
  if (studentId) return String(studentId).slice(0, 2).toUpperCase();
  return '?';
}

export default function StudentList({
  students,
  loading,
  filters,
  setFilters,
  applyFilters,
  onClearFilters,
  onExport,
  pageInfo,
  changePage,
  onViewProfile,
  onEditProfile,
  onDelete,
  onAddStudent,
}) {
  const hasFilters = Boolean(filters.q || filters.skill || filters.activity);
  const empty = students.length === 0;
  const noMatches = empty && pageInfo.total === 0;

  return (
    <div className="student-list-page">
      {loading && (
        <div style={{ padding: '1rem', textAlign: 'center' }}>Loading students…</div>
      )}
      <header className="student-list-header">
        <div className="student-list-header-text">
          <h1 className="student-list-title">Students</h1>
          <p className="student-list-subtitle">Search, filter, and open profiles from the row actions.</p>
        </div>
        {onAddStudent && (
          <button type="button" className="student-list-btn student-list-btn--primary" onClick={onAddStudent}>
            <span className="student-list-btn-plus" aria-hidden="true">+</span>
            Add student
          </button>
        )}
      </header>

      <section className="student-list-filters" aria-label="Search and filters">
        <div className="student-list-filters-grid">
          <div className="student-list-field student-list-field--grow">
            <label htmlFor="student-filter-q">Search</label>
            <input
              id="student-filter-q"
              className="student-list-input"
              placeholder="Name, ID, or email"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className="student-list-field">
            <label htmlFor="student-filter-skill">Skill</label>
            <input
              id="student-filter-skill"
              className="student-list-input"
              placeholder="e.g. programming"
              value={filters.skill}
              onChange={(e) => setFilters((f) => ({ ...f, skill: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className="student-list-field">
            <label htmlFor="student-filter-activity">Activity</label>
            <input
              id="student-filter-activity"
              className="student-list-input"
              placeholder="e.g. basketball"
              value={filters.activity}
              onChange={(e) => setFilters((f) => ({ ...f, activity: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
        </div>
        <div className="student-list-filters-actions">
          <button type="button" className="student-list-btn student-list-btn--primary" onClick={applyFilters}>
            Apply filters
          </button>
          <button type="button" className="student-list-btn student-list-btn--ghost" onClick={onClearFilters}>
            Clear
          </button>
          <button type="button" className="student-list-btn student-list-btn--outline" onClick={onExport}>
            Export CSV
          </button>
        </div>
      </section>

      <div className="student-list-toolbar">
        <span className="student-list-count">
          <strong>{pageInfo.total}</strong>
          <span className="student-list-count-label">{pageInfo.total === 1 ? ' student' : ' students'}</span>
          {hasFilters && <span className="student-list-count-hint"> (filtered)</span>}
        </span>
      </div>

      {empty && (
        <div className="student-list-empty" role="status">
          {noMatches && hasFilters && (
            <>
              <p className="student-list-empty-title">No matching students</p>
              <p className="student-list-empty-text">Try different keywords or clear filters to see everyone.</p>
            </>
          )}
          {noMatches && !hasFilters && (
            <>
              <p className="student-list-empty-title">No students yet</p>
              <p className="student-list-empty-text">Add a student to build your directory.</p>
              {onAddStudent && (
                <button type="button" className="student-list-btn student-list-btn--primary student-list-empty-cta" onClick={onAddStudent}>
                  Add first student
                </button>
              )}
            </>
          )}
        </div>
      )}

      {!empty && (
        <ul className="student-list-cards" aria-label="Student records">
          {students.map((s) => (
            <li key={s._id} className="student-card">
              <div className="student-card-top">
                <span className="student-card-avatar" aria-hidden="true">
                  {initials(s.firstName, s.lastName, s.studentId)}
                </span>
                <div className="student-card-identity">
                  <h2 className="student-card-name">
                    {s.firstName} {s.lastName}
                  </h2>
                  <div className="student-card-chips">
                    <span className="student-chip">ID {s.studentId}</span>
                    {s.course ? <span className="student-chip">{s.course}</span> : <span className="student-chip student-chip--muted">No program</span>}
                    {s.department && s.department.name ? (
                      <span className="student-chip student-chip--accent">{s.department.name}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="student-card-skills">
                {(s.skills || []).length === 0 ? (
                  <span className="student-skills-placeholder">No skills listed</span>
                ) : (
                  (s.skills || []).map((sk, i) =>
                    typeof sk === 'string' ? (
                      <span key={i} className="student-skill-tag">
                        {sk}
                      </span>
                    ) : (
                      <span key={i} className="student-skill-level">
                        <SkillIcon level={sk.level} size={14} />
                        <span>
                          {sk.name} <span className="student-skill-lvl">({sk.level})</span>
                        </span>
                      </span>
                    )
                  )
                )}
              </div>

              <div className="student-card-actions">
                <button type="button" className="student-list-btn student-list-btn--sm student-list-btn--ghost" onClick={() => onViewProfile(s._id)}>
                  View profile
                </button>
                <button type="button" className="student-list-btn student-list-btn--sm student-list-btn--outline" onClick={() => onEditProfile(s._id)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="student-list-btn student-list-btn--sm student-list-btn--danger"
                  onClick={() => {
                    if (window.confirm(`Delete ${s.firstName} ${s.lastName} (${s.studentId})? This cannot be undone.`)) {
                      onDelete(s._id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <nav className="student-list-pagination" aria-label="Pagination">
        <button
          type="button"
          className="student-list-btn student-list-btn--ghost"
          disabled={pageInfo.page <= 1}
          onClick={() => changePage(pageInfo.page - 1)}
        >
          Previous
        </button>
        <span className="student-list-page-label">
          Page <strong>{pageInfo.page}</strong> of <strong>{pageInfo.pages}</strong>
        </span>
        <button
          type="button"
          className="student-list-btn student-list-btn--ghost"
          disabled={pageInfo.page >= pageInfo.pages}
          onClick={() => changePage(pageInfo.page + 1)}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
