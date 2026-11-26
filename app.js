fetch(window.ACCAD_CONFIG.apiUrl).then((response) => response.json()).then((result) => {
  document.querySelector('#api-status').textContent = result.ok ? `API ACCAD connectée · version ${result.version}` : 'API ACCAD indisponible';
}).catch(() => { document.querySelector('#api-status').textContent = 'API ACCAD indisponible'; });
