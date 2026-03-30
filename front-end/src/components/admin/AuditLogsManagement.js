import React, { useState, useCallback } from 'react';
import api from '../../api/axios';
import { swalError } from '../../utils/swal';
import './LookupDataManagement.css';

const getRowsFromResponse = (resp) => {
  const d = resp?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

const AuditLogsManagement = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const resp = await api.get('/audit-logs', { params: { per_page: 200 } });
      setRows(getRowsFromResponse(resp));
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to load audit logs';
      setError(msg);
      await swalError('Audit logs', msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return <div className="loading">Loading audit logs…</div>;
  }

  return (
    <div className="lookup-data-management">
      <div className="management-header">
        <h2>Audit Logs</h2>
        <button type="button" className="refresh-button" onClick={fetchLogs}>
          Refresh
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}

      <div className="table-section">
        <div className="section-header">
          <h3>Audit Log</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record ID</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-data">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                rows.map((item, index) => (
                  <tr key={item.audit_logs_id || item.id || index}>
                    <td>{item.user?.email || item.user?.Email || '—'}</td>
                    <td>{item.actions || '—'}</td>
                    <td>{item.table_name || '—'}</td>
                    <td>{item.record_id ?? '—'}</td>
                    <td>{item.action_timestamp || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsManagement;
