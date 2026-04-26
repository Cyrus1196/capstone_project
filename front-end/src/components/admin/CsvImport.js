import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { swalToast, swalError, swalConfirm } from '../../utils/swal';
import './CsvImport.css';

/** For SIS grade deliberation preview: show identifiers and term first. */
const SIS_GRADE_DELIB_PREVIEW_COLUMN_PRIORITY = [
  'student_id_number',
  'subject_code',
  'academic_year_id',
  'semester_id',
  'section_id',
  'grade',
  'evaluation_status',
  'modality_id',
  '_sis_session',
  '_sis_row',
];

/** For sis_mixed preview: put row-type and grade fields first so they are visible without horizontal scroll. */
const SIS_MIXED_PREVIEW_COLUMN_PRIORITY = [
  'record_type',
  'student_id_number',
  'subject_code',
  'grade',
  'evaluation_status',
  'academic_year_id',
  'semester_id',
  'section_id',
  'requisite_subject_code',
  'requisite_type',
  'enrolled_date',
  'evaluation_date',
  'modality_id',
  'inc_compliance_deadline',
  'first_name',
  'last_name',
  'email',
  'program_id',
  'year_level_id',
  'contact_number',
  'address',
  'academic_status',
  'status',
  'password',
];

function orderPreviewHeaders(importTypeKey, headers) {
  if (!Array.isArray(headers) || headers.length === 0) return [];
  if (importTypeKey === 'sis_grade_deliberation') {
    const priority = SIS_GRADE_DELIB_PREVIEW_COLUMN_PRIORITY;
    const seen = new Set();
    const ordered = [];
    for (const h of priority) {
      if (headers.includes(h) && !seen.has(h)) {
        ordered.push(h);
        seen.add(h);
      }
    }
    for (const h of headers) {
      if (!seen.has(h)) {
        ordered.push(h);
        seen.add(h);
      }
    }
    return ordered;
  }
  if (importTypeKey !== 'sis_mixed') return headers;
  const seen = new Set();
  const ordered = [];
  for (const h of SIS_MIXED_PREVIEW_COLUMN_PRIORITY) {
    if (headers.includes(h) && !seen.has(h)) {
      ordered.push(h);
      seen.add(h);
    }
  }
  for (const h of headers) {
    if (!seen.has(h)) {
      ordered.push(h);
      seen.add(h);
    }
  }
  return ordered;
}

/**
 * @param {{ restrictToImportKeys?: string[] | null, excludeImportKeys?: string[] | null, pageTitle?: string, pageSubtitle?: string }} props
 */
const CsvImport = ({
  restrictToImportKeys = null,
  excludeImportKeys = null,
  pageTitle,
  pageSubtitle,
}) => {
  const [importTypes, setImportTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sisTermAyId, setSisTermAyId] = useState('');
  const [sisTermSemId, setSisTermSemId] = useState('');

  const applyTypeFilters = (types) => {
    let t = Array.isArray(types) ? [...types] : [];
    if (restrictToImportKeys?.length) {
      const allow = new Set(restrictToImportKeys);
      t = t.filter((x) => allow.has(x.key));
    }
    if (excludeImportKeys?.length) {
      const deny = new Set(excludeImportKeys);
      t = t.filter((x) => !deny.has(x.key));
    }
    return t;
  };

  useEffect(() => {
    fetchImportTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when CSV scope props change
  }, [restrictToImportKeys, excludeImportKeys]);

  const fetchImportTypes = async () => {
    try {
      const response = await api.get('/csv-import/types');
      const filtered = applyTypeFilters(response.data);
      setImportTypes(filtered);
      if (filtered.length > 0) {
        setSelectedType(filtered[0].key);
      } else {
        setSelectedType('');
      }
    } catch (err) {
      setError('Failed to load import types');
    }
  };

  const isSisGradeDeliberation = selectedType === 'sis_grade_deliberation';

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const name = selectedFile.name.toLowerCase();
      const okCsv =
        selectedFile.type === 'text/csv' ||
        selectedFile.type === 'text/tab-separated-values' ||
        selectedFile.type === 'text/plain' ||
        name.endsWith('.csv') ||
        name.endsWith('.tsv') ||
        name.endsWith('.txt');
      if (!okCsv) {
        setError('Please select a CSV or tab-delimited (.tsv / .txt) file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setPreview(null);
      setError('');
      setSuccess('');
    }
  };

  const handlePreview = async () => {
    if (!file || !selectedType) {
      setError('Please select a file and import type');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('csv_file', file);
      formData.append('import_type', selectedType);
      if (isSisGradeDeliberation && sisTermAyId.trim() && sisTermSemId.trim()) {
        formData.append('academic_year_id', sisTermAyId.trim());
        formData.append('semester_id', sisTermSemId.trim());
      }

      const response = await api.post('/csv-import/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPreview(response.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to preview CSV';
      setError(msg);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedType) {
      setError('Please select a file and import type');
      return;
    }

    const confirmed = await swalConfirm(
      'Confirm Import',
      `Are you sure you want to import ${preview?.total_rows || 'these'} records?`,
      'Import',
      'Cancel'
    );

    if (!confirmed) return;

    try {
      setImporting(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('csv_file', file);
      formData.append('import_type', selectedType);
      if (isSisGradeDeliberation && sisTermAyId.trim() && sisTermSemId.trim()) {
        formData.append('academic_year_id', sisTermAyId.trim());
        formData.append('semester_id', sisTermSemId.trim());
      }

      const response = await api.post('/csv-import/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const results = response.data.results;
      setSuccess(
        `Import completed: ${results.imported} imported, ${results.failed} failed (Total: ${results.total})`
      );
      swalToast('success', `Imported ${results.imported} records`);
      
      if (results.failed > 0) {
        setError(`${results.failed} rows failed to import. Check the error details.`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Import failed';
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    if (!selectedType) return;

    const link = document.createElement('a');
    link.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/csv-import/template/${selectedType}`;
    link.download =
      selectedType === 'sis_grade_deliberation'
        ? 'sis_grade_deliberation_template.tsv'
        : `${selectedType}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedTypeConfig = importTypes.find(t => t.key === selectedType);

  const previewHeadersOrdered = useMemo(
    () => orderPreviewHeaders(selectedType, preview?.headers),
    [selectedType, preview?.headers]
  );

  const hideTypeSelect = importTypes.length <= 1;

  return (
    <div className="csv-import">
      <div className="csv-import-header">
        <h2>{pageTitle || 'CSV Import'}</h2>
        <p className="csv-import-subtitle">
          {pageSubtitle || 'Bulk import data from CSV files.'}
        </p>
      </div>

      {error && <div className="csv-import-error">{error}</div>}
      {success && <div className="csv-import-success">{success}</div>}

      <div className="csv-import-form">
        {importTypes.length === 0 ? (
          <div className="csv-import-error">No import types are available for your account.</div>
        ) : null}
        <div className="form-group">
          <label htmlFor="import_type">Import Type</label>
          {hideTypeSelect ? (
            <div className="csv-import-type-static" id="import_type">
              {importTypes[0]?.label || selectedType}
            </div>
          ) : (
            <select
              id="import_type"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPreview(null);
                setFile(null);
                setSisTermAyId('');
                setSisTermSemId('');
              }}
              className="form-select"
            >
              {importTypes.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedTypeConfig && (
          <div className="csv-requirements">
            <h4>Required Columns:</h4>
            <div className="column-tags">
              {selectedTypeConfig.required_columns.map(col => (
                <span key={col} className="column-tag required">{col}</span>
              ))}
            </div>
            {selectedTypeConfig.column_groups?.length > 0 ? (
              <div className="csv-column-groups">
                {selectedTypeConfig.column_groups.map((group) => (
                  <div key={group.title} className="csv-column-group">
                    <h4 className="csv-column-group-title">{group.title}</h4>
                    {group.description ? (
                      <p className="csv-column-group-desc">{group.description}</p>
                    ) : null}
                    {group.columns?.length > 0 ? (
                      <div className="column-tags">
                        {group.columns.map((col) => (
                          <span key={col} className="column-tag optional">{col}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : selectedTypeConfig.optional_columns.length > 0 ? (
              <>
                <h4>Optional Columns:</h4>
                <div className="column-tags">
                  {selectedTypeConfig.optional_columns.map(col => (
                    <span key={col} className="column-tag optional">{col}</span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}

        {isSisGradeDeliberation ? (
          <div className="form-group csv-import-term-override">
            <p className="csv-column-group-desc">
              If preview shows a term error, set both IDs from <strong>Admin → Academic Years / Semesters</strong> (or your
              lookup API). Leave blank when <code>SESSION</code> (e.g. <code>SY 25-26 SEM II</code>) matches your academic year
              names.
            </p>
            <label htmlFor="sis_academic_year_id">Optional: Academic year ID</label>
            <input
              id="sis_academic_year_id"
              type="number"
              min="1"
              className="form-control"
              value={sisTermAyId}
              onChange={(e) => setSisTermAyId(e.target.value)}
              placeholder="e.g. 1"
            />
            <label htmlFor="sis_semester_id">Optional: Semester ID</label>
            <input
              id="sis_semester_id"
              type="number"
              min="1"
              className="form-control"
              value={sisTermSemId}
              onChange={(e) => setSisTermSemId(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>
        ) : null}

        <div className="form-group">
          <label htmlFor="csv_file">{isSisGradeDeliberation ? 'Data file (CSV or TSV)' : 'CSV File'}</label>
          <div className="file-input-wrapper">
            <input
              type="file"
              id="csv_file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              onChange={handleFileChange}
              className="file-input"
            />
            <label htmlFor="csv_file" className="file-input-label">
              {file ? file.name : isSisGradeDeliberation ? 'Choose file…' : 'Choose CSV file...'}
            </label>
          </div>
        </div>

        <div className="csv-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={downloadTemplate}
            disabled={!selectedType}
          >
            Download Template
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handlePreview}
            disabled={!file || loading}
          >
            {loading ? 'Previewing...' : 'Preview'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="csv-preview">
          <h3>
            Preview (
            {preview.preview_truncated
              ? `first ${preview.preview_rows_shown ?? preview.preview.length} of ${preview.total_rows} rows`
              : `${preview.total_rows} rows`}
            )
          </h3>

          {preview.preview_truncated ? (
            <div className="csv-preview-warning csv-preview-warning--info">
              Only the first {preview.preview_rows_shown ?? preview.preview.length} rows are validated in preview.
              <strong> Import still processes all {preview.total_rows} rows.</strong>
            </div>
          ) : null}

          {selectedType === 'sis_mixed' ? (
            <p className="csv-preview-sis-mixed-hint">
              <strong>How this file works:</strong> Only the <code>student</code> row carries name, email, program, and year
              level. Each <code>grade</code> row repeats <code>student_id_number</code> and fills subject and grade columns;
              other personal columns stay empty on purpose. Scroll the table horizontally if you do not see{' '}
              <code>subject_code</code>, <code>grade</code>, and <code>evaluation_status</code>.
            </p>
          ) : null}
          {selectedType === 'sis_grade_deliberation' ? (
            <p className="csv-preview-sis-mixed-hint">
              <strong>SIS export:</strong> Rows are one grade per subject. Extra columns between <code>SECTION</code> and{' '}
              <code>MODALITY</code> (team-teaching) are handled when the file has no header row. With a header row, use the
              23-column layout from your SIS. Excel: Save As → <em>Text (Tab-delimited)</em> or CSV UTF-8.
            </p>
          ) : null}
          
          {preview.has_errors && (
            <div className="csv-preview-warning">
              Some rows have validation errors. Please fix them before importing.
            </div>
          )}

          <p className="csv-preview-scroll-hint" aria-hidden="true">
            {previewHeadersOrdered.length > 6 ? 'Scroll horizontally to view all columns →' : null}
          </p>

          <div className="preview-table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Row</th>
                  {previewHeadersOrdered.map(header => (
                    <th key={header}>{header}</th>
                  ))}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row) => (
                  <tr key={row.row_number} className={row.valid ? 'valid' : 'invalid'}>
                    <td>{row.row_number}</td>
                    {previewHeadersOrdered.map(header => (
                      <td key={header}>{row.data[header] || '-'}</td>
                    ))}
                    <td>
                      {row.valid ? (
                        <span className="status-badge valid">Valid</span>
                      ) : (
                        <span className="status-badge invalid" title={row.errors.join(', ')}>
                          Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!preview.has_errors && (
            <div className="csv-import-action">
              <button
                type="button"
                className="btn-import"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? 'Importing...' : `Import ${preview.total_rows} Records`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CsvImport;
