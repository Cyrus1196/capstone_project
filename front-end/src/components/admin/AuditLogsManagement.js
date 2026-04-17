import React, { useState, useCallback, useMemo } from 'react';
import api from '../../api/axios';
import { swalError } from '../../utils/swal';
import './LookupDataManagement.css';
import './AuditLogsManagement.css';

const formatJson = (value) => {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

const summarizeEntry = (item) => {
  const action = (item.actions || '').toUpperCase();
  const newVal = item.new_value;
  const oldVal = item.old_value;
  if (action === 'UPDATE' && newVal && typeof newVal === 'object' && !Array.isArray(newVal)) {
    const n = Object.keys(newVal).length;
    return n ? `${n} field(s) changed` : '—';
  }
  if (action === 'CREATE') return 'Record created';
  if (action === 'DELETE') return 'Record removed';
  if (oldVal || newVal) return 'See trail';
  return '—';
};

const hasTrail = (item) =>
  (item.old_value != null && item.old_value !== '') ||
  (item.new_value != null && item.new_value !== '');

const formatTs = (ts) => {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  } catch {
    return ts;
  }
};

const AuditLogsManagement = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterTable, setFilterTable] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const perPage = 25;

  const fetchLogs = useCallback(
    async (targetPage = 1) => {
      setError('');
      setLoading(true);
      try {
        const params = {
          per_page: perPage,
          page: targetPage,
        };
        if (filterTable.trim()) params.table_name = filterTable.trim();
        if (filterAction) params.actions = filterAction;

        const resp = await api.get('/audit-logs', { params });
        const body = resp?.data;

        if (body && Array.isArray(body.data)) {
          setRows(body.data);
          setPagination({
            currentPage: body.current_page,
            lastPage: body.last_page,
            total: body.total,
            from: body.from,
            to: body.to,
          });
          setPage(body.current_page);
        } else if (Array.isArray(body)) {
          setRows(body);
          setPagination(null);
        } else {
          setRows([]);
          setPagination(null);
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to load audit logs';
        setError(msg);
        await swalError('Audit logs', msg);
        setRows([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    },
    [filterTable, filterAction, perPage]
  );

  React.useEffect(() => {
    fetchLogs(1);
    // Initial load only; use Apply filters / pagination / Refresh afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    setExpandedId(null);
    fetchLogs(1);
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const metaLine = useMemo(() => {
    if (!pagination) return null;
    const { from, to, total, currentPage, lastPage } = pagination;
    if (total === 0) return 'No entries';
    return `Showing ${from ?? 0}–${to ?? 0} of ${total} · Page ${currentPage} of ${lastPage}`;
  }, [pagination]);

  if (loading && rows.length === 0) {
    return <div className="loading">Loading audit trail…</div>;
  }

  return (
    <div className="lookup-data-management">
      <div className="management-header">
        <h2>Audit trail</h2>
        <button type="button" className="refresh-button" onClick={() => fetchLogs(page)}>
          Refresh
        </button>
      </div>
      <p className="lookup-active-panel-label">
        Immutable log of creates, updates, and deletes on key tables (who, what, when, and before/after snapshots).
      </p>
      {error && <div className="error-message">{error}</div>}

      <div className="audit-logs-filters">
        <label>
          Table
          <input
            type="text"
            placeholder="e.g. tbl_users"
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </label>
        <label>
          Action
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            <option value="">All</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </label>
        <button type="button" className="refresh-button" onClick={applyFilters}>
          Apply filters
        </button>
      </div>

      <div className="table-section">
        <div className="section-header">
          <h3>Activity log</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record ID</th>
                <th>Summary</th>
                <th>Timestamp</th>
                <th>Trail</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">
                    No audit entries yet. Changes to users, profiles, evaluations, enrollments, and related records
                    will appear here.
                  </td>
                </tr>
              ) : (
                rows.flatMap((item) => {
                  const id = item.audit_logs_id ?? item.id;
                  const open = expandedId === id;
                  const mainRow = (
                    <tr key={id}>
                      <td>{item.user?.email || item.user?.Email || '—'}</td>
                      <td>{item.actions || '—'}</td>
                      <td>
                        <code>{item.table_name || '—'}</code>
                      </td>
                      <td>{item.record_id ?? '—'}</td>
                      <td>{summarizeEntry(item)}</td>
                      <td>{formatTs(item.action_timestamp)}</td>
                      <td>
                        {hasTrail(item) ? (
                          <button type="button" className="audit-trail-toggle" onClick={() => toggleExpand(id)}>
                            {open ? 'Hide' : 'View'} before / after
                          </button>
                        ) : (
                          <span className="audit-trail-empty">No snapshot</span>
                        )}
                      </td>
                    </tr>
                  );
                  if (!open || !hasTrail(item)) {
                    return [mainRow];
                  }
                  return [
                    mainRow,
                    <tr key={`${id}-detail`} className="audit-trail-row">
                      <td colSpan={7}>
                        <div className="audit-trail-panel">
                          <h4>Previous values</h4>
                          {item.old_value != null && item.old_value !== '' ? (
                            <pre>{formatJson(item.old_value)}</pre>
                          ) : (
                            <p className="audit-trail-empty">None (create or no prior state captured)</p>
                          )}
                          <h4>New values</h4>
                          {item.new_value != null && item.new_value !== '' ? (
                            <pre>{formatJson(item.new_value)}</pre>
                          ) : (
                            <p className="audit-trail-empty">None (delete or cleared)</p>
                          )}
                        </div>
                      </td>
                    </tr>,
                  ];
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.lastPage > 1 && (
          <div className="audit-logs-pagination">
            <span>{metaLine}</span>
            <div>
              <button
                type="button"
                disabled={pagination.currentPage <= 1 || loading}
                onClick={() => fetchLogs(pagination.currentPage - 1)}
              >
                Previous
              </button>
              {' '}
              <button
                type="button"
                disabled={pagination.currentPage >= pagination.lastPage || loading}
                onClick={() => fetchLogs(pagination.currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsManagement;
