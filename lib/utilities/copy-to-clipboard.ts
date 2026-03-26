export const copyToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const el = document.createElement("textarea");
  el.value = text;
  document.body.appendChild(el);
  el.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(el);

  if (!copied) {
    throw new Error("Clipboard copy failed");
  }
};
