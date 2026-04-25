import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchStudents, exportStudentsCSV, deleteStudent } from '../api';
import StudentList from '../components/StudentList';
import { useNavigate } from 'react-router-dom';

export default function UsersPage({ onAddStudent, showMessage }){
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ skill: '', activity: '', q: '', courseCode: '' });
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, total: 0, limit: 10 });

  const load = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const params = {
        page: opts.page !== undefined ? opts.page : pageInfo.page,
        limit: opts.limit !== undefined ? opts.limit : pageInfo.limit,
        skill: opts.skill !== undefined ? opts.skill : filters.skill,
        activity: opts.activity !== undefined ? opts.activity : filters.activity,
        q: opts.q !== undefined ? opts.q : filters.q,
        courseCode: opts.courseCode !== undefined ? opts.courseCode : filters.courseCode,
      };
      const res = await fetchStudents(params);
      setStudents(res.data || []);
      setPageInfo({ page: res.page || 1, pages: res.pages || 1, total: res.total || 0, limit: params.limit });
    } catch (err) {
      console.error('Failed to load students', err);
      setStudents([]);
      setPageInfo((p) => ({ ...p, page: 1, pages: 1, total: 0 }));
    }
    finally {
      setLoading(false);
    }
  }, [filters, pageInfo.page, pageInfo.limit]);

  // keep a ref to the latest load so events can call it
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    // initial load when this page mounts
    (async () => {
      await loadRef.current({ page: 1 });
    })();

    const onReload = () => loadRef.current({ page: 1 });
    window.addEventListener('students:reload', onReload);
    return () => window.removeEventListener('students:reload', onReload);
  }, []);

  const applyFilters = async () => await load({ skill: filters.skill, activity: filters.activity, q: filters.q, courseCode: filters.courseCode, page: 1 });
  const clearFiltersAndReload = async () => { setFilters({ skill: '', activity: '', q: '', courseCode: '' }); await load({ skill: '', activity: '', q: '', courseCode: '', page: 1 }); };
  const changePage = async (nextPage) => await load({ skill: filters.skill, activity: filters.activity, q: filters.q, courseCode: filters.courseCode, page: nextPage });
  const handleExport = async () => {
    const csv = await exportStudentsCSV(filters);
    if (!csv) { console.warn('Export failed'); return; }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const navigate = useNavigate();

  return (
    <StudentList
      students={students}
      loading={loading}
      filters={filters}
      setFilters={setFilters}
      applyFilters={applyFilters}
      onClearFilters={clearFiltersAndReload}
      onExport={handleExport}
      pageInfo={pageInfo}
      changePage={changePage}
      onViewProfile={(id) => navigate(`/users/${id}`)}
      onEditProfile={(id) => navigate(`/users/${id}`, { state: { edit: true } })}
      onDelete={async (id) => {
        if (!window.confirm('Delete this student? This cannot be undone.')) return;
        try {
          await deleteStudent(id);
          window.dispatchEvent(new Event('students:reload'));
        } catch (err) {
          console.error('Failed to delete student', err);
          (showMessage || ((m) => window.alert(m)))('Failed to delete student', 'error');
        }
      }}
      onAddStudent={onAddStudent}
    />
  );
}
