import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { swalToast, swalError, swalConfirm } from '../../utils/swal';
import './CsvImport.css';

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a valid CSV file');
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
    link.download = `${selectedType}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedTypeConfig = importTypes.find(t => t.key === selectedType);

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
                    <div className="column-tags">
                      {group.columns.map((col) => (
                        <span key={col} className="column-tag optional">{col}</span>
                      ))}
                    </div>
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

        <div className="form-group">
          <label htmlFor="csv_file">CSV File</label>
          <div className="file-input-wrapper">
            <input
              type="file"
              id="csv_file"
              accept=".csv"
              onChange={handleFileChange}
              className="file-input"
            />
            <label htmlFor="csv_file" className="file-input-label">
              {file ? file.name : 'Choose CSV file...'}
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
          <h3>Preview ({preview.total_rows} rows)</h3>
          
          {preview.has_errors && (
            <div className="csv-preview-warning">
              Some rows have validation errors. Please fix them before importing.
            </div>
          )}

          <div className="preview-table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Row</th>
                  {preview.headers.map(header => (
                    <th key={header}>{header}</th>
                  ))}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row) => (
                  <tr key={row.row_number} className={row.valid ? 'valid' : 'invalid'}>
                    <td>{row.row_number}</td>
                    {preview.headers.map(header => (
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
