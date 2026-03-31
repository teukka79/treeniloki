// --- MUUTTUJAT JA ALUSTUS ---
let barWeights = JSON.parse(localStorage.getItem('bw_v105') || JSON.stringify(BAR_DEFAULTS));
let quickMoves = []; // Alustetaan tyhjäksi, ladataan myöhemmin GitHubista
let customP = JSON.parse(localStorage.getItem('cp_v105') || JSON.stringify(INITIAL_PROGRAMS));
let history = JSON.parse(localStorage.getItem('hist_v105') || "[]");
let restSeconds = parseInt(localStorage.getItem('rest_v105')) || 90;

let curKey = localStorage.getItem('last_v105');
if (!curKey || !customP[curKey]) { curKey = Object.keys(customP)[0]; }
let tempEditKey = curKey;
let timerInterval;

// --- LIIKKEIDEN HAKU GITHUBISTA ---
async function fetchQuickMoves() {
    try {
        // Lisätään loppuun aikaleima '?t=' + Date.now(), jotta selain ei lataa vanhaa versiota välimuistista
        const response = await fetch(JSON_URL + '?t=' + Date.now());
        if (!response.ok) throw new Error('Verkkovirhe');
        
        const data = await response.json();
        // Asetetaan haetut liikkeet muuttujaan
        quickMoves = data.pikavalinnat;
        console.log("Liikkeet ladattu GitHubista:", quickMoves);
    } catch (err) {
        console.error("JSON-lataus epäonnistui, käytetään oletuksia:", err);
        // Jos haku epäonnistuu, käytetään config.js:n oletuksia tai välimuistia
        quickMoves = JSON.parse(localStorage.getItem('qm_v105')) || MOVE_DEFAULTS;
    }
}

// --- AJASTIN ---
function startTimer() {
    stopTimer();
    document.getElementById('restTimer').style.display = 'flex';
    let timeLeft = restSeconds;
    const display = document.getElementById('timerDisplay');
    const updateDisplay = () => {
        let mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
        display.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    updateDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) { clearInterval(timerInterval); display.innerText = "VALMIS!"; }
        else { updateDisplay(); }
    }, 1000);
}

function stopTimer() { clearInterval(timerInterval); document.getElementById('restTimer').style.display = 'none'; }

function changeRestTime() {
    const newTime = prompt("Aseta tauon pituus (sekunteina):", restSeconds);
    if (newTime !== null && !isNaN(newTime) && newTime > 0) {
        restSeconds = parseInt(newTime);
        localStorage.setItem('rest_v105', restSeconds);
    }
}

// --- APUFUNKTIOT ---
function formatD(d) { if(!d) return ""; const s = d.split('-'); return `${s[2]}.${s[1]}.${s[0]}`; }
function updateDateDisplay(val) { document.getElementById('dateDisplay').innerText = formatD(val); }
function findLastWeight(exName) { for (let entry of history) { let found = entry.moves.find(m => m.name === exName); if (found) return found.weight; } return "-"; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function openHelp() { document.getElementById('helpModal').style.display = 'block'; }

// --- PÄÄNÄKYMÄN RENDERÖINTI ---
function renderMain() {
    const cont = document.getElementById('mainContent'); if(!cont) return; 
    cont.innerHTML = "";
    let p = customP[curKey]; if(!p) p = customP[Object.keys(customP)[0]];
    const card = document.createElement('div'); card.className = 'day-card';
    const today = new Date().toISOString().split('T')[0];
    
    card.innerHTML = `
        <div class="card-header-area">
            <span class="selector-label">TREENIOHJELMA</span>
            <div class="controls-row">
                <div class="select-wrapper">
                    <select class="select-workout" id="workoutSelector" onchange="changeW()">
                        ${Object.keys(customP).map(k => `<option value="${k}" ${k===curKey?'selected':''}>${customP[k].name}</option>`).join('')}
                    </select>
                </div>
                <div class="badge cal-badge">
                    <input type="date" class="hidden-date" id="workoutDate" value="${today}" onchange="updateDateDisplay(this.value)">
                    <span id="dateDisplay">${formatD(today)}</span>
                    <span class="material-symbols-rounded" style="font-size:18px; color:inherit;">calendar_month</span>
                </div>
            </div>
        </div>
        <div id="rows"></div>`;
    cont.appendChild(card);
    
    p.exs.forEach(ex => {
        const lastW = findLastWeight(ex.n);
        const row = document.createElement('div'); row.className = 'ex-row';
        row.innerHTML = `
        <div class="ex-row-top">
    <div class="editable-ex-name" onclick="showQuickMenuAtMain(event, '${ex.id}')">
        <b style="font-size:17px; color:var(--text);">${ex.n}</b>
        <span class="material-symbols-rounded edit-icon">edit</span>
    </div>
</div>
        <div class="ex-row-middle">
            <div class="input-group"><span class="input-label">Paino</span><div class="input-wrapper"><input type="number" step="0.5" class="c-w-input" id="w_${ex.id}" oninput="uTot('${ex.id}','${ex.b}')" placeholder="0"><span class="unit">kg</span></div></div>
            <div class="input-group"><span class="input-label">Sarjat</span><select class="c-s-select" id="s_${ex.id}" onchange="updateDots('${ex.id}')">${SER_OPTS.map(v=>`<option value="${v}" ${ex.s==v?'selected':''}>${v}</option>`).join('')}</select></div>
            <div class="input-group"><span class="input-label">Toistot</span><select class="c-s-select" id="r_${ex.id}">${REP_OPTS.map(v=>`<option value="${v}" ${ex.r==v?'selected':''}>${v}</option>`).join('')}</select></div>
            <div class="input-group"><span class="input-label">Tehty</span><input type="checkbox" class="styled-checkbox" id="c_${ex.id}"></div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
            <span class="badge badge-weight" id="t_${ex.id}">${getInitialLabel(ex.b)}</span>
            <span class="badge" style="background:var(--badge-bg); color:var(--badge-text);">Viimeksi: ${lastW}kg</span>
        </div>
        <div class="set-tracker" id="sets_${ex.id}">${generateDots(ex.s, ex.id)}</div>`;
        card.querySelector('#rows').appendChild(row);
    });
}

function generateDots(n, id) { 
    let h=''; 
    for(let i=1;i<=n;i++) { h+=`<div class="set-dot" id="dot_${id}_${i}" onclick="toggleSet(this, '${id}')">${i}</div>`; }
    return h; 
}

function toggleSet(dot, id) {
    dot.classList.toggle('active');
    if(dot.classList.contains('active')) { startTimer(); }
    const dots = document.querySelectorAll(`#sets_${id} .set-dot`);
    const actives = document.querySelectorAll(`#sets_${id} .set-dot.active`);
    document.getElementById('c_'+id).checked = (actives.length === dots.length && dots.length > 0);
}

function updateDots(id) {
    const n = document.getElementById('s_'+id).value;
    document.getElementById('sets_'+id).innerHTML = generateDots(n, id);
}

function getInitialLabel(bName) { const barW = barWeights[bName] || 0; return (!bName || bName === "Ei tankoa") ? "0.0kg" : `Yht: ${barW.toFixed(1)}kg (sis. tanko)`; }
function uTot(id, bN) { const val = parseFloat(document.getElementById('w_'+id).value) || 0; const bar = (bN && bN !== "Ei tankoa") ? (barWeights[bN] || 0) : 0; document.getElementById('t_'+id).innerText = (bar === 0) ? `${val.toFixed(1)}kg` : `Yht: ${(val + bar).toFixed(1)}kg (sis. tanko)`; }
function changeW() { curKey = document.getElementById('workoutSelector').value; localStorage.setItem('last_v105', curKey); renderMain(); }
function toggleTheme() { const d = document.documentElement; const isDark = d.getAttribute('data-theme') === 'dark'; d.setAttribute('data-theme', isDark ? 'light' : 'dark'); document.getElementById('themeIcon').innerText = isDark ? 'light_mode' : 'dark_mode'; }

// --- ASETUKSET ---
function openEdit() { document.getElementById('editModal').style.display = 'block'; document.getElementById('editProgSelector').innerHTML = Object.keys(customP).map(k => `<option value="${k}" ${k===curKey?'selected':''}>${customP[k].name}</option>`).join('') || ''; loadEditProg(); loadBarSettings(); loadQuickMoveSettings(); }

function loadEditProg() {
    tempEditKey = document.getElementById('editProgSelector').value;
    const p = customP[tempEditKey]; if(!p) return;
    let html = '';
    p.exs.forEach((e, i) => {
        html += `
        <div class="edit-ex-block">
            <div class="edit-row-top">
                <div class="quick-select-btn" onclick="showQuickMenu(event, ${i})"><span class="material-symbols-rounded">bolt</span></div>
                <input type="text" class="edit-input" id="en_${i}" value="${e.n}" placeholder="Liikkeen nimi">
                <button class="del-btn-text" onclick="removeTempEx(${i})">×</button>
            </div>
            <div class="edit-row-bottom">
                <select class="edit-input" id="eb_${i}">
                    ${Object.keys(barWeights).map(bn => `<option value="${bn}" ${e.b===bn?'selected':''}>${bn}</option>`).join('')}
                    <option value="Ei tankoa" ${(!e.b || e.b==='Ei tankoa')?'selected':''}>Ei tankoa</option>
                </select>
                <select class="edit-input" id="es_${i}">${SER_OPTS.map(v=>`<option value="${v}" ${e.s==v?'selected':''}>${v} sarjaa</option>`).join('')}</select>
                <select class="edit-input" id="er_${i}">${REP_OPTS.map(v=>`<option value="${v}" ${e.r==v?'selected':''}>${v} toistoa</option>`).join('')}</select>
            </div>
        </div>`;
    });
    document.getElementById('progEditContent').innerHTML = html;
}

function loadBarSettings() { document.getElementById('barSettings').innerHTML = Object.keys(barWeights).map(name => `<div><span style="font-size:12px; font-weight:700;">${name}</span><input type="number" step="0.1" class="edit-input" id="bw_${name}" value="${barWeights[name]}"></div>`).join(''); }
function saveBars() { Object.keys(barWeights).forEach(name => { barWeights[name] = parseFloat(document.getElementById(`bw_${name}`).value) || 0; }); localStorage.setItem('bw_v105', JSON.stringify(barWeights)); alert("Tallennettu!"); renderMain(); }
function loadQuickMoveSettings() { document.getElementById('quickMoveSettings').innerHTML = quickMoves.map((m, i) => `<div style="display:flex; gap:8px;"><input type="text" class="edit-input" id="qm_${i}" value="${m}"><button class="del-btn-text" onclick="removeQuickMove(${i})">×</button></div>`).join(''); }
function addQuickMove() { quickMoves.push(""); loadQuickMoveSettings(); }
function removeQuickMove(i) { quickMoves.splice(i,1); loadQuickMoveSettings(); }
function saveQuickMoves() { quickMoves = []; const inputs = document.querySelectorAll('[id^="qm_"]'); inputs.forEach(input => { if(input.value.trim()) quickMoves.push(input.value.trim()); }); localStorage.setItem('qm_v105', JSON.stringify(quickMoves)); alert("Tallennettu!"); }

function syncT() { const p = customP[tempEditKey]; if(!p) return; p.exs.forEach((e, i) => { e.n = document.getElementById('en_'+i).value; e.s = document.getElementById('es_'+i).value; e.r = document.getElementById('er_'+i).value; e.b = document.getElementById('eb_'+i).value; }); }
function addTempEx() { syncT(); customP[tempEditKey].exs.push({id:'e'+Date.now(), n:'', s:'3', r:'8-10', b:'Ei tankoa'}); loadEditProg(); }
function removeTempEx(i) { syncT(); customP[tempEditKey].exs.splice(i,1); loadEditProg(); }
function saveCurrentEdit() { syncT(); localStorage.setItem('cp_v105', JSON.stringify(customP)); alert("Tallennettu!"); renderMain(); }
function createNewProg() { const name = document.getElementById('newProgName').value.trim(); if(!name) return; const id = 'v' + Date.now(); customP[id] = { name: name, exs: [] }; localStorage.setItem('cp_v105', JSON.stringify(customP)); document.getElementById('newProgName').value = ""; curKey = id; openEdit(); renderMain(); }
function deleteCurrentProg() { if(Object.keys(customP).length > 1 && confirm("Poista ohjelma?")) { delete customP[tempEditKey]; curKey = Object.keys(customP)[0]; localStorage.setItem('cp_v105', JSON.stringify(customP)); openEdit(); renderMain(); } }

// --- HISTORIA ---
function openHistory() {
    document.getElementById('historyModal').style.display = 'block';
    document.getElementById('historyContent').innerHTML = `<h2 style="text-align:center; font-weight:900;">Historia</h2>` + history.map((e, idx) => `<div class="hist-item"><div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:center;"><b>${e.date}</b><button class="del-btn-text" onclick="deleteHist(${idx})">×</button></div>${e.moves.map(m => `<div style="display:flex; justify-content:space-between; font-size:14px; border-top:1px solid var(--border); padding:12px 0;"><span><b>${m.name}</b><br><span class="badge badge-iron">${m.vol || ''}</span></span><span class="badge" style="align-self: flex-start; margin-top:2px;">${m.weight}kg</span></div>`).join('')}</div>`).join('') || '<p style="text-align:center;">Ei historiaa.</p>';
}
function deleteHist(idx) { if(confirm("Poista historiamerkintä?")) { history.splice(idx,1); localStorage.setItem('hist_v105', JSON.stringify(history)); openHistory(); } }

// --- TUONTI JA VIENTI ---
function exportData() { const blob = new Blob([JSON.stringify({programs:customP, bars:barWeights, history:history, quickMoves:quickMoves})], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'treeniloki_backup.json'; a.click(); }
function importData(e) { const reader = new FileReader(); reader.onload = (ev) => { const d = JSON.parse(ev.target.result); customP=d.programs; barWeights=d.bars; history=d.history; quickMoves=d.quickMoves||MOVE_DEFAULTS; localStorage.setItem('cp_v105', JSON.stringify(customP)); localStorage.setItem('bw_v105', JSON.stringify(barWeights)); localStorage.setItem('hist_v105', JSON.stringify(history)); localStorage.setItem('qm_v105', JSON.stringify(quickMoves)); location.reload(); }; reader.readAsText(e.target.files[0]); }

// --- TALLENNUS ---
function saveData() { 
    const dVal = document.getElementById('workoutDate').value; 
    let entry = { date: formatD(dVal), moves: [] }; 
    customP[curKey].exs.forEach(ex => { 
        if(document.getElementById('c_'+ex.id).checked) {
            const txt = document.getElementById('t_'+ex.id).innerText;
            const w = txt.includes('Yht:') ? txt.split(' ')[1].replace('kg','') : txt.replace('kg','');
            entry.moves.push({ name: ex.n, weight: w, vol: `${document.getElementById('s_'+ex.id).value}x${document.getElementById('r_'+ex.id).value}` }); 
        }
    });
    if(!entry.moves.length) return alert("Valitse liikkeet!");
    history.unshift(entry); localStorage.setItem('hist_v105', JSON.stringify(history.slice(0,50))); alert("Tallennettu!"); renderMain();
}

// --- PIKAVALIKKO ---
function showQuickMenu(e, index) { 
    const menu = document.getElementById('quickMenu'); 
    const rect = e.currentTarget.getBoundingClientRect(); 
    menu.style.display = 'block'; 
    menu.style.top = (rect.bottom + window.scrollY) + 'px'; 
    menu.style.left = rect.left + 'px'; 
    menu.innerHTML = quickMoves.map(m => `<div onclick="selectQuickMove('${m}', ${index})">${m}</div>`).join(''); 
    const cl = () => { menu.style.display='none'; document.removeEventListener('click', cl); }; 
    setTimeout(() => document.addEventListener('click', cl), 10); 
}

function selectQuickMove(name, index) { 
    document.getElementById(`en_${index}`).value = name; 
    document.getElementById('quickMenu').style.display = 'none'; 
}

// Avaa purppura valikko etusivulla
function showQuickMenuAtMain(e, exId) {
    const menu = document.getElementById('quickMenu');
    const rect = e.currentTarget.getBoundingClientRect();
    
    menu.className = 'quick-menu purple-theme'; // Käytetään uutta purppuraa teemaa
    menu.style.display = 'block';
    menu.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    menu.style.left = rect.left + 'px';
    
    // Luodaan valikko GitHubista ladatuista liikkeistä
    menu.innerHTML = quickMoves.map(m => `
        <div onclick="applyQuickChange('${exId}', '${m}')">${m}</div>
    `).join('');
    
    const closeMenu = () => { 
        menu.style.display = 'none'; 
        document.removeEventListener('click', closeMenu); 
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

// Päivittää liikkeen nimen etusivulla lennosta
function applyQuickChange(exId, newName) {
    // Etsitään oikea liike nykyisestä ohjelmasta ja päivitetään se väliaikaisesti
    const ex = customP[curKey].exs.find(e => e.id === exId);
    if (ex) {
        ex.n = newName;
        renderMain(); // Päivitetään näkymä
    }
    document.getElementById('quickMenu').style.display = 'none';
}

// Käynnistys
window.onload = async () => {
    await fetchQuickMoves(); // Odota että liikkeet latautuvat
    renderMain();           // Piirrä sivu vasta sitten
};
