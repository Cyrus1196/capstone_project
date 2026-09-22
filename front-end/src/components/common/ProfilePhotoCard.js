import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { swalConfirm, swalError, swalToast } from '../../utils/swal';
import './ProfilePhotoCard.css';

const OUTPUT_SIZE = 512;

function resolveAvatarUrl(user) {
  if (!user) return null;
  return user.avatar_url || user.avatarUrl || null;
}

/**
 * Right-side profile photo + Facebook-style update modal (circular crop + zoom).
 */
export default function ProfilePhotoCard() {
  const { user, refreshUser } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(() => resolveAvatarUrl(user));
  const [modalOpen, setModalOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const imgRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    setAvatarUrl(resolveAvatarUrl(user));
  }, [user]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setError('');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (sourceUrl && sourceUrl.startsWith('blob:')) {
      URL.revokeObjectURL(sourceUrl);
    }
    setSourceUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [sourceUrl]);

  const openPicker = () => {
    setError('');
    fileInputRef.current?.click();
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      setError('Please choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be 4 MB or smaller.');
      return;
    }
    if (sourceUrl && sourceUrl.startsWith('blob:')) {
      URL.revokeObjectURL(sourceUrl);
    }
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setModalOpen(true);
    setError('');
  };

  const onPointerDown = (e) => {
    if (!sourceUrl) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  useEffect(() => {
    if (!dragging) return undefined;
    const onMove = (e) => {
      setOffset({
        x: dragStart.current.ox + (e.clientX - dragStart.current.x),
        y: dragStart.current.oy + (e.clientY - dragStart.current.y),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  const exportCroppedBlob = () =>
    new Promise((resolve, reject) => {
      const img = imgRef.current;
      if (!img || !img.complete) {
        reject(new Error('Image not ready'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }

      const preview = 280;
      const baseScale = Math.max(preview / img.naturalWidth, preview / img.naturalHeight);
      const scale = baseScale * zoom;
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const centerX = preview / 2 + offset.x;
      const centerY = preview / 2 + offset.y;
      const ratio = OUTPUT_SIZE / preview;

      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        img,
        (centerX - drawW / 2) * ratio,
        (centerY - drawH / 2) * ratio,
        drawW * ratio,
        drawH * ratio
      );
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error('Could not export image'));
          else resolve(blob);
        },
        'image/jpeg',
        0.92
      );
    });

  const handleSave = async () => {
    if (!sourceUrl) {
      setError('Choose a photo first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const blob = await exportCroppedBlob();
      const form = new FormData();
      form.append('avatar', blob, 'avatar.jpg');
      const { data } = await api.post('/profile/avatar', form);
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      await refreshUser?.();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save photo.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!avatarUrl) return;
    const ok = await swalConfirm({
      title: 'Remove profile picture?',
      text: 'This will clear your current photo. You can add a new one anytime.',
      icon: 'warning',
      confirmButtonText: 'Remove photo',
      cancelButtonText: 'Cancel',
    });
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await api.delete('/profile/avatar');
      setAvatarUrl(null);
      await refreshUser?.();
      closeModal();
      swalToast('success', 'Profile picture removed.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove photo.';
      setError(msg);
      await swalError('Could not remove photo', msg);
    } finally {
      setSaving(false);
    }
  };

  const initials = (() => {
    const email = String(user?.email || '');
    return (email[0] || '?').toUpperCase();
  })();

  const previewScale = zoom;

  return (
    <aside className="profile-photo-card" aria-label="Profile photo">
      <div className="profile-photo-card__preview">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile" className="profile-photo-card__img" />
        ) : (
          <span className="profile-photo-card__placeholder">{initials}</span>
        )}
      </div>
      <p className="profile-photo-card__optional">Optional</p>
      <button type="button" className="profile-photo-card__update" onClick={openPicker} disabled={saving}>
        {avatarUrl ? 'Change photo' : 'Add profile picture'}
      </button>
      {avatarUrl ? (
        <button
          type="button"
          className="profile-photo-card__remove"
          onClick={handleRemove}
          disabled={saving}
        >
          {saving ? 'Removing…' : 'Remove photo'}
        </button>
      ) : null}
      <p className="profile-photo-card__hint-text">
        {avatarUrl
          ? 'Wrong photo? Change it or remove it anytime.'
          : 'Only if you want — you can skip this.'}
      </p>
      {error && !modalOpen ? <p className="profile-photo-card__error">{error}</p> : null}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="profile-photo-card__file"
        onChange={onFileChange}
      />

      {modalOpen && (
        <div
          className="profile-photo-modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) closeModal();
          }}
        >
          <div
            className="profile-photo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-photo-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-photo-modal__head">
              <h3 id="profile-photo-modal-title">Update profile picture</h3>
              <button
                type="button"
                className="profile-photo-modal__close"
                onClick={() => !saving && closeModal()}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="profile-photo-modal__stage">
              <div
                className={`profile-photo-modal__viewport${dragging ? ' is-dragging' : ''}`}
                onPointerDown={onPointerDown}
              >
                {sourceUrl ? (
                  <img
                    ref={imgRef}
                    src={sourceUrl}
                    alt=""
                    className="profile-photo-modal__source"
                    style={{
                      transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${previewScale})`,
                    }}
                    draggable={false}
                  />
                ) : null}
                <div className="profile-photo-modal__mask" aria-hidden />
              </div>
            </div>

            <div className="profile-photo-modal__zoom">
              <span aria-hidden>−</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom"
              />
              <span aria-hidden>+</span>
            </div>

            <div className="profile-photo-modal__tools">
              <button type="button" className="profile-photo-modal__tool" onClick={openPicker} disabled={saving}>
                Choose photo
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  className="profile-photo-modal__tool profile-photo-modal__tool--danger"
                  onClick={handleRemove}
                  disabled={saving}
                >
                  Remove
                </button>
              ) : null}
            </div>

            <p className="profile-photo-modal__hint">Your profile picture is visible in the portal.</p>

            {error ? <p className="profile-photo-modal__error">{error}</p> : null}

            <div className="profile-photo-modal__actions">
              <button type="button" className="profile-photo-modal__cancel" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                className="profile-photo-modal__save"
                onClick={handleSave}
                disabled={saving || !sourceUrl}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
