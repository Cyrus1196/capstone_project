import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import './SearchableSelect.css';

/**
 * Long-list friendly dropdown: type to filter, click to choose.
 * `value` / option `value` are compared as strings; `onChange` receives the option's `value` as a string (or "").
 */
export default function SearchableSelect({
  id: idProp,
  value,
  onChange,
  options = [],
  placeholder = 'Type to search…',
  emptyLabel = 'Select…',
  disabled = false,
  className = '',
  required = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}) {
  const reactId = useId();
  const id = idProp || `searchable-select-${reactId}`;
  const listboxId = `${id}-listbox`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const strValue = value === '' || value == null ? '' : String(value);

  const selectedLabel = useMemo(() => {
    if (strValue === '') return '';
    const opt = options.find((o) => String(o.value) === strValue);
    return opt?.label ?? '';
  }, [strValue, options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    });
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const pick = (v) => {
    onChange(v === '' || v == null ? '' : String(v));
    setOpen(false);
    setQuery('');
  };

  const displayText = selectedLabel || emptyLabel;

  return (
    <div className={`searchable-select ${className}`.trim()} ref={rootRef}>
      {required && (
        <select
          className="searchable-select__native-required"
          aria-hidden="true"
          tabIndex={-1}
          value={strValue}
          required
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{emptyLabel}</option>
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        id={id}
        className="searchable-select__trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel || undefined}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className={`searchable-select__trigger-text ${!selectedLabel ? 'is-placeholder' : ''}`}>
          {displayText}
        </span>
        <span className="searchable-select__chevron" aria-hidden />
      </button>
      {open && (
        <div className="searchable-select__dropdown" id={listboxId} role="listbox">
          <input
            ref={inputRef}
            type="search"
            className="searchable-select__filter"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            autoComplete="off"
            aria-label="Filter options"
          />
          <ul className="searchable-select__list" role="presentation">
            {!required && strValue !== '' && (
              <li role="presentation">
                <button type="button" className="searchable-select__option searchable-select__option--clear" onClick={() => pick('')}>
                  Clear selection
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="searchable-select__empty" role="presentation">
                No matches
              </li>
            ) : (
              filtered.map((o) => {
                const active = String(o.value) === strValue;
                return (
                  <li key={String(o.value)} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`searchable-select__option${active ? ' searchable-select__option--active' : ''}`}
                      onClick={() => pick(String(o.value))}
                    >
                      {o.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
