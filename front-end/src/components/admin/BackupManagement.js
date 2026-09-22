import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { swalConfirm, swalError, swalToast } from '../../utils/swal';
import './BackupManagement.css';

function formatBytes(n) {
  const size = Number(n) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'success') return 'backup-status backup-status--ok';
  if (s === 'running') return 'backup-status backup-status--run';
  if (s === 'failed') return 'backup-status backup-status--fail';
  return 'backup-status';
}

const BackupManagement = () => {
  const [info, setInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    enabled: true,
    schedule_type: 'daily',
    backup_time: '00:01',
    storage_path: '',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [infoRes, histRes] = await Promise.all([
        api.get('/system/backup/info'),
        api.get('/system/backup/history'),
      ]);
      const nextInfo = infoRes.data || null;
      setInfo(nextInfo);
      setHistory(Array.isArray(histRes.data?.data) ? histRes.data.data : []);
      if (nextInfo?.schedule) {
        setForm({
          enabled: Boolean(nextInfo.schedule.enabled),
          schedule_type: nextInfo.schedule.schedule_type || 'daily',
          backup_time: nextInfo.schedule.backup_time || '00:01',
          storage_path: nextInfo.schedule.storage_path || nextInfo.storage_path || '',
        });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Could not load backup data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const stats = info?.stats || {};

  const scheduleLabel = useMemo(() => {
    if (!form.enabled) return 'Disabled';
    return `Daily at ${form.backup_time || '00:01'}`;
  }, [form.enabled, form.backup_time]);

  const saveSchedule = async (e) => {
    e?.preventDefault?.();
    setSavingSchedule(true);
    setError('');
    try {
      await api.put('/system/backup/schedule', {
        enabled: Boolean(form.enabled),
        schedule_type: 'daily',
        backup_time: form.backup_time,
            storage_path: form.storage_path
              ? String(form.storage_path).replace(/\\/g, '/')
              : null,
      });
      swalToast('success', 'Backup schedule saved');
      await loadAll();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not save schedule';
      setError(msg);
      await swalError('Save failed', msg);
    } finally {
      setSavingSchedule(false);
    }
  };

  const createBackup = async () => {
    setCreating(true);
    setError('');
    try {
      await api.post('/system/backup/create', {}, { timeout: 0 });
      swalToast('success', 'Backup created on server');
      await loadAll();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Backup failed';
      setError(msg);
      await swalError('Backup failed', msg);
    } finally {
      setCreating(false);
    }
  };

  const downloadRow = async (row) => {
    setBusyId(row.id);
    try {
      const res = await api.get(`/system/backup/download/${row.id}`, {
        responseType: 'blob',
        timeout: 0,
      });
      const contentType = String(res.headers['content-type'] || '');
      if (contentType.includes('application/json')) {
        const text = await res.data.text();
        const parsed = JSON.parse(text);
        throw new Error(parsed?.message || 'Download failed');
      }
      const blob = new Blob([res.data], { type: 'application/sql;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = row.file_name || `backup_${row.id}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      swalToast('success', 'Download started');
    } catch (err) {
      let msg = err.message || 'Download failed';
      if (err.response?.data instanceof Blob) {
        try {
          const parsed = JSON.parse(await err.response.data.text());
          msg = parsed.message || msg;
        } catch {
          // keep
        }
      }
      await swalError('Download failed', msg);
    } finally {
      setBusyId(null);
    }
  };

  const restoreRow = async (row) => {
    const ok = await swalConfirm({
      title: 'Restore this backup?',
      text: `This will overwrite the live database with ${row.file_name}. Continue only if you understand the risk.`,
      confirmButtonText: 'Restore',
    });
    if (!ok) return;
    setBusyId(row.id);
    try {
      await api.post(`/system/backup/restore/${row.id}`, {}, { timeout: 0 });
      swalToast('success', 'Database restored');
      await loadAll();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Restore failed';
      await swalError('Restore failed', msg);
      await loadAll();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="backup-mgmt">
      {error ? <div className="backup-mgmt__error">{error}</div> : null}

      <div className="backup-mgmt__stats">
        <div className="backup-stat">
          <span className="backup-stat__label">Schedule</span>
          <strong className="backup-stat__value">{scheduleLabel}</strong>
          <small className="backup-stat__sub">
            Next run: {formatWhen(info?.schedule?.next_run_at)}
          </small>
        </div>
        <div className="backup-stat">
          <span className="backup-stat__label">Backups</span>
          <strong className="backup-stat__value">{stats.backups_success ?? 0}</strong>
          <small className="backup-stat__sub">{stats.backups_failed ?? 0} failed</small>
        </div>
        <div className="backup-stat">
          <span className="backup-stat__label">Restores</span>
          <strong className="backup-stat__value">{stats.restores_success ?? 0}</strong>
          <small className="backup-stat__sub">{stats.restores_failed ?? 0} failed</small>
        </div>
        <div className="backup-stat">
          <span className="backup-stat__label">Last success</span>
          <strong className="backup-stat__value backup-stat__value--sm">
            {formatWhen(stats.last_success_at)}
          </strong>
          <small className="backup-stat__sub">
            Server: {formatWhen(info?.server_time)}
          </small>
        </div>
      </div>

      <div className="backup-mgmt__grid">
        <section className="backup-panel">
          <header className="backup-panel__head">
            <h2>Backup schedule</h2>
            <p>Store SQL snapshots on the server and run them on a daily schedule.</p>
          </header>
          <form className="backup-schedule" onSubmit={saveSchedule}>
            <label className="backup-check">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                disabled={savingSchedule || loading}
              />
              Enable scheduled backups
            </label>

            <label className="backup-field">
              <span>Schedule type</span>
              <select
                value={form.schedule_type}
                onChange={(e) => setForm((f) => ({ ...f, schedule_type: e.target.value }))}
                disabled
              >
                <option value="daily">Daily</option>
              </select>
            </label>

            <label className="backup-field">
              <span>Backup time</span>
              <input
                type="time"
                value={form.backup_time}
                onChange={(e) => setForm((f) => ({ ...f, backup_time: e.target.value }))}
                disabled={savingSchedule || loading}
                required
              />
            </label>

            <label className="backup-field">
              <span>Backup storage path</span>
              <input
                type="text"
                value={form.storage_path}
                onChange={(e) => setForm((f) => ({ ...f, storage_path: e.target.value }))}
                placeholder={info?.storage_path || 'storage/app/backups'}
                disabled={savingSchedule || loading}
              />
              <small>Leave blank for the default server folder. Absolute paths are allowed.</small>
            </label>

            <div className="backup-profile">
              <div>
                <span>Summary</span>
                <strong>{info?.schedule?.summary || scheduleLabel}</strong>
              </div>
              <div>
                <span>Next scheduled run</span>
                <strong>{formatWhen(info?.schedule?.next_run_at)}</strong>
              </div>
              <div>
                <span>Server timezone</span>
                <strong>{info?.timezone || '—'}</strong>
              </div>
              <div>
                <span>Server storage</span>
                <strong className="backup-profile__path">{info?.storage_path || '—'}</strong>
              </div>
            </div>

            <div className="backup-schedule__actions">
              <button
                type="button"
                className="backup-btn backup-btn--ghost"
                onClick={loadAll}
                disabled={loading || savingSchedule || creating}
              >
                Reload
              </button>
              <button
                type="submit"
                className="backup-btn backup-btn--primary"
                disabled={savingSchedule || loading}
              >
                {savingSchedule ? 'Saving…' : 'Save schedule'}
              </button>
            </div>
          </form>
        </section>

        <section className="backup-panel">
          <header className="backup-panel__head">
            <h2>Backup safety</h2>
            <p>How backups are protected on this system.</p>
          </header>
          <ul className="backup-safety">
            <li>
              <strong>Conflict protection</strong>
              <span>A server lock prevents overlapping backup and restore jobs.</span>
            </li>
            <li>
              <strong>Server storage</strong>
              <span>
                Snapshots stay on the server and appear in history until you download or restore
                them.
              </span>
            </li>
            <li>
              <strong>Restore tracking</strong>
              <span>Every restore attempt is logged for auditability.</span>
            </li>
            <li>
              <strong>Database</strong>
              <span>
                {info?.database || '—'} · {info?.table_count ?? '—'} tables
              </span>
            </li>
          </ul>
          <button
            type="button"
            className="backup-btn backup-btn--primary backup-btn--block"
            onClick={createBackup}
            disabled={creating || loading}
          >
            <i className="fa-solid fa-database" aria-hidden />
            {creating ? 'Creating backup…' : 'Create backup now'}
          </button>
        </section>
      </div>

      <section className="backup-panel backup-panel--wide">
        <header className="backup-panel__head backup-panel__head--row">
          <div>
            <h2>Backup history</h2>
            <p>
              Review backup and restore activity, download stored backups, and restore from a
              previous successful snapshot.
            </p>
          </div>
        </header>

        <div className="backup-table-wrap">
          <table className="backup-table">
            <thead>
              <tr>
                <th>Date / time</th>
                <th>Action</th>
                <th>Trigger</th>
                <th>Status</th>
                <th>File name</th>
                <th>Size</th>
                <th>Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="backup-table__empty">
                    Loading history…
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="backup-table__empty">
                    No backups yet. Create one or wait for the scheduled run.
                  </td>
                </tr>
              ) : (
                history.map((row) => {
                  const canUse =
                    row.action === 'backup' &&
                    row.status === 'success' &&
                    row.file_exists !== false;
                  const busy = busyId === row.id;
                  return (
                    <tr key={row.id}>
                      <td>{formatWhen(row.started_at || row.created_at)}</td>
                      <td className="backup-cap">{row.action || '—'}</td>
                      <td className="backup-cap">{row.trigger || '—'}</td>
                      <td>
                        <span className={statusClass(row.status)}>{row.status || '—'}</span>
                      </td>
                      <td>
                        <div className="backup-file">
                          <span>{row.file_name || '—'}</span>
                          {row.action === 'backup' ? (
                            <small>
                              {row.file_exists === false ? 'Missing on server' : 'Stored on server'}
                            </small>
                          ) : null}
                        </div>
                      </td>
                      <td>{formatBytes(row.file_size)}</td>
                      <td className="backup-details">{row.details || 'No details recorded'}</td>
                      <td>
                        <div className="backup-row-actions">
                          <button
                            type="button"
                            className="backup-link"
                            disabled={!canUse || busy || creating}
                            onClick={() => downloadRow(row)}
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            className="backup-link"
                            disabled={!canUse || busy || creating}
                            onClick={() => restoreRow(row)}
                          >
                            Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default BackupManagement;
