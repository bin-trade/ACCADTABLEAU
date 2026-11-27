(() => {
  const excluded = new Set(['number', 'date', 'time', 'datetime-local', 'month', 'week', 'tel', 'hidden', 'file', 'checkbox', 'radio', 'range', 'color']);
  const uppercase = (element) => {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return;
    if (element instanceof HTMLInputElement && excluded.has(element.type)) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value.toLocaleUpperCase('fr-FR');
    if (element.value === value) return;
    element.value = value;
    if (start !== null && end !== null) element.setSelectionRange(start, end);
  };
  document.addEventListener('input', (event) => uppercase(event.target), true);
  document.addEventListener('change', (event) => uppercase(event.target), true);
})();
