import Swal from 'sweetalert2';

/**
 * Confirmation dialog. Returns true if user confirmed.
 */
export async function swalConfirm({
  title = 'Are you sure?',
  text = '',
  html,
  icon = 'warning',
  confirmButtonText = 'Yes',
  cancelButtonText = 'Cancel',
} = {}) {
  const result = await Swal.fire({
    title,
    ...(html ? { html } : { text: text || undefined }),
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}

export function swalSuccess(title, text) {
  return Swal.fire({
    icon: 'success',
    title: title || 'Success',
    text: text || undefined,
    confirmButtonText: 'OK',
  });
}

export function swalError(title, text) {
  return Swal.fire({
    icon: 'error',
    title: title || 'Error',
    text: text || 'Something went wrong.',
    confirmButtonText: 'OK',
  });
}

export function swalInfo(title, text) {
  return Swal.fire({
    icon: 'info',
    title: title || '',
    text: text || undefined,
    confirmButtonText: 'OK',
  });
}

/** Top-end toast; use for non-blocking success messages */
export function swalToast(icon, title) {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
  });
  return Toast.fire({ icon, title });
}
