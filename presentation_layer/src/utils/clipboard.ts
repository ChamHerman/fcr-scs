export type CopyNotify = (n: { type: 'success'; title: string; message?: string }) => void;

/** Write a value to the clipboard and surface a toast; falls back to showing the value. */
export const copyToClipboard = async (value: string, notify: CopyNotify, title = 'Copied to clipboard') => {
  try {
    await navigator.clipboard.writeText(value);
    notify({ type: 'success', title });
  } catch {
    notify({ type: 'success', title, message: value });
  }
};
