import './style.css'

document.querySelector('#app').innerHTML = `
  <div>
    <h1>Game Template</h1>
    <p>Frontend: Vite + Vanilla JS (Bun)</p>
    <p>Backend: Go</p>
    <div class="card">
      <button id="pingBtn" type="button">Ping Backend</button>
      <p id="pingResult"></p>
    </div>
  </div>
`

document.getElementById('pingBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/ping');
    const data = await res.json();
    document.getElementById('pingResult').innerText = \`Response: \${data.message}\`;
  } catch (err) {
    document.getElementById('pingResult').innerText = \`Error: \${err.message}\`;
  }
});
