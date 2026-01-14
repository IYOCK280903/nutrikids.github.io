let selectedGender = 'boy';

function hasPosyanduInfo(){
    try { return !!(localStorage.getItem('nutrikids_posyandu') && localStorage.getItem('nutrikids_kader')); } catch(e){ return false; }
}

function ensureMotherChildOnCalculator(){
    // show overlay on calculator if mother/child not present
    try {
        const m = localStorage.getItem('nutrikids_mother');
        const c = localStorage.getItem('nutrikids_child');
        const overlay = document.getElementById('motherChildOverlay');
        if ((!m || !c) && overlay) {
            // prefill overlay inputs if any
            try { const mi = document.getElementById('motherNameInput'); if (mi) mi.value = m || ''; const ci = document.getElementById('childNameInputOverlay'); if (ci) ci.value = c || ''; } catch(e){}
            overlay.classList.remove('hidden');
            // wire save button
            const saveBtn = document.getElementById('saveMotherChild');
            if (saveBtn && !saveBtn._attached) {
                saveBtn.addEventListener('click', () => {
                    const mother = (document.getElementById('motherNameInput')||{}).value || '';
                    const child = (document.getElementById('childNameInputOverlay')||{}).value || '';
                    if (!mother || !child) { alert('Mohon isi Nama Ibu dan Nama Anak.'); return; }
                    try { localStorage.setItem('nutrikids_mother', mother); localStorage.setItem('nutrikids_child', child); } catch(e){}
                    overlay.classList.add('hidden');
                    // prefill calculator field if present
                    const childField = document.getElementById('childName');
                    if (childField) childField.value = child;
                });
                saveBtn._attached = true;
            }
        } else if (overlay) {
            // ensure overlay inputs are set to stored values
            try { const mi = document.getElementById('motherNameInput'); if (mi) mi.value = m || ''; const ci = document.getElementById('childNameInputOverlay'); if (ci) ci.value = c || ''; } catch(e){}
            overlay.classList.add('hidden');
            const childField = document.getElementById('childName');
            if (childField && c) childField.value = c;
        }
    } catch(e){ console.debug('ensureMotherChildOnCalculator error', e); }
}


function selectGender(gender) {
    selectedGender = gender;
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gender === gender);
    });
}

function scrollToCalculator() {
    const el = document.getElementById('calculator');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleMeasure() {
    const box = document.getElementById('measureInstructions');
    if (!box) return;
    box.classList.toggle('hidden');
}

function openLearnNutrition() {
    const m = document.getElementById('learnModal');
    if (m) {
        m.style.display = 'flex';
        m.classList.remove('hidden');
        console.debug('learnModal opened');
    }
}

function closeLearnNutrition() {
    const m = document.getElementById('learnModal');
    if (m) {
        m.classList.add('hidden');
        // also remove inline display to ensure it's not visible/interactable
        try { m.style.display = 'none'; } catch (e) {}
        console.debug('learnModal closed');
    }
}

function calculateZScore() {
    const name = (document.getElementById('childName')||{}).value || '';
    const age = parseFloat((document.getElementById('childAge')||{}).value || '0');
    const weight = parseFloat((document.getElementById('childWeight')||{}).value || '0');
    const height = parseFloat((document.getElementById('childHeight')||{}).value || '0');

    // basic validation
    let valid = true;
    const weightError = document.getElementById('weightError');
    const heightError = document.getElementById('heightError');
    if (weightError) weightError.textContent = '';
    if (heightError) heightError.textContent = '';

    if (!name) { alert('Mohon isi nama anak.'); return; }
    if (!weight || weight <= 0) { if (weightError) weightError.textContent = 'Masukkan berat valid (>0)'; valid = false; }
    if (!height || height <= 0) { if (heightError) heightError.textContent = 'Masukkan tinggi valid (>0)'; valid = false; }
    if (!valid) return;

    // Simple heuristic — replace with real z-score logic if needed
    let status = 'Gizi Baik';
    let colorClass = 'success';
    if (weight < 5) { status = 'Gizi Buruk'; colorClass = 'danger'; }
    else if (weight > 25) { status = 'Risiko Gizi Lebih'; colorClass = 'warning'; }

    const resultDiv = document.getElementById('result');
    resultDiv.className = `result-box ${colorClass}`;
    resultDiv.innerHTML = `
        <h3>Hasil Analisis: ${escapeHtml(name)}</h3>
        <p>Jenis Kelamin: ${selectedGender === 'boy' ? 'Laki-laki' : 'Perempuan'} • Usia: ${age} bulan</p>
        <p>Berat: <strong>${weight} kg</strong> • Tinggi: <strong>${height} cm</strong></p>
        <h2 class="status">${status}</h2>
        <p class="note">*Harap verifikasi ulang dengan buku KIA atau tenaga kesehatan.</p>
    `;
    resultDiv.classList.remove('hidden');

    const post = document.getElementById('postActions');
    if (post) post.classList.remove('hidden');
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.classList.remove('hidden');

    // attach post-action handlers (idempotent)
    attachPostActions();
    // silently save a recap after calculation (no alert)
    try { saveRecap(true); } catch(e) { console.debug('autosave recap failed', e); }
}

function attachPostActions(){
    const pdfBtn = document.getElementById('exportPdfBtn');
    const imgBtn = document.getElementById('exportImgBtn');
    const waBtn = document.getElementById('shareWaBtn');
    const remBtn = document.getElementById('setReminderBtn');

    if (pdfBtn && !pdfBtn._attached) {
        pdfBtn.addEventListener('click', exportToPdf);
        pdfBtn._attached = true;
    }
    if (imgBtn && !imgBtn._attached) {
        imgBtn.addEventListener('click', exportToImage);
        imgBtn._attached = true;
    }
    if (waBtn && !waBtn._attached) {
        waBtn.addEventListener('click', shareToWhatsapp);
        waBtn._attached = true;
    }
    if (remBtn && !remBtn._attached) {
        remBtn.addEventListener('click', setReminder);
        remBtn._attached = true;
    }
    // save recap button (Simpan Rekapan)
    const saveRecapBtn = document.getElementById('saveRecapBtn');
    if (saveRecapBtn && !saveRecapBtn._attached) {
        saveRecapBtn.addEventListener('click', () => saveRecap(false));
        saveRecapBtn._attached = true;
    }
}

function exportToPdf(){
    const el = document.querySelector('.calculator-card') || document.getElementById('result');
    if (!el) return alert('Tidak ada konten untuk diekspor.');
    html2canvas(el, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        // detect jsPDF (UMD exposes window.jspdf.jsPDF) or global jsPDF
        const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (window.jsPDF || null);
        if (!jsPDFCtor) { alert('jsPDF tidak tersedia.'); return; }
        const pdf = new jsPDFCtor('p','pt','a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('nutrikids-result.pdf');
    }).catch(err => { console.error(err); alert('Gagal membuat PDF.'); });
}

function exportToImage(){
    const el = document.querySelector('.calculator-card') || document.getElementById('result');
    if (!el) return alert('Tidak ada konten untuk diekspor.');
    html2canvas(el, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'nutrikids-result.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => { console.error(err); alert('Gagal membuat gambar.'); });
}

function shareToWhatsapp(){
    const resultDiv = document.getElementById('result');
    if (!resultDiv) return alert('Tidak ada hasil untuk dibagikan.');
    const text = resultDiv.innerText.replace(/\s+/g, ' ').trim();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function setReminder(){
    const days = prompt('Setel reminder berapa hari dari sekarang untuk jadwal Posyandu? (masukkan angka hari)');
    const n = parseInt(days, 10);
    const status = document.getElementById('reminderStatus');
    if (isNaN(n) || n <= 0) { if (status) status.textContent = 'Input tidak valid.'; return; }
    const when = new Date(Date.now() + n * 24 * 60 * 60 * 1000);
    localStorage.setItem('nutrikids_reminder', when.toISOString());
    if (status) status.textContent = `Reminder disimpan untuk ${when.toLocaleDateString()}.`;
}

function resetForm() {
    document.querySelectorAll('input').forEach(input => input.value = '');
    const result = document.getElementById('result');
    if (result) result.classList.add('hidden');
    const post = document.getElementById('postActions');
    if (post) post.classList.add('hidden');
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.classList.add('hidden');
    const weightError = document.getElementById('weightError'); if (weightError) weightError.textContent = '';
    const heightError = document.getElementById('heightError'); if (heightError) heightError.textContent = '';
}

function escapeHtml(unsafe) {
    return unsafe.replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]; });
}

// Build a recap object from current form/localStorage state
function buildRecapFromForm(){
    try {
        const posyandu = localStorage.getItem('nutrikids_posyandu') || '';
        const kader = localStorage.getItem('nutrikids_kader') || '';
        const rt = localStorage.getItem('nutrikids_rt') || '';
        const rw = localStorage.getItem('nutrikids_rw') || '';
        const mother = localStorage.getItem('nutrikids_mother') || (document.getElementById('motherNameInput')||{}).value || '';
        const child = localStorage.getItem('nutrikids_child') || (document.getElementById('childName')||{}).value || '';
        const resultDiv = document.getElementById('result');
        if (!resultDiv) return null;
        const text = resultDiv.innerText.replace(/\s+/g,' ').trim();
        const timestamp = new Date().toISOString();
        return { id: 'rekap_' + Date.now(), timestamp, posyandu, kader, rt, rw, mother, child, resultText: text };
    } catch(e){ console.debug('buildRecapFromForm error', e); return null; }
}

// Save recap into localStorage array 'nutrikids_rekap'. If auto=true, avoid alert.
function saveRecap(auto){
    const rekap = buildRecapFromForm();
    if (!rekap) { if (!auto) alert('Tidak ada hasil untuk disimpan.'); return false; }
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem('nutrikids_rekap')||'[]'); } catch(e){ arr = []; }
    arr.unshift(rekap);
    try { localStorage.setItem('nutrikids_rekap', JSON.stringify(arr)); } catch(e){ console.error('saveRecap store failed', e); }
    if (!auto) alert('Rekapan berhasil disimpan.');
    return true;
}

// wire small UI interactions after load
document.addEventListener('DOMContentLoaded', () => {
    // If user hasn't seen the welcome page yet, send them there first
    try {
        const visited = localStorage.getItem('nutrikids_visited_welcome');
        const path = (window.location.pathname || '').split('/').pop() || '';
        // If not visited and not already on welcome/posyandu, redirect to welcome
        if (!visited && !path.includes('welcome.html') && !path.includes('posyandu.html')) {
            window.location.href = 'welcome.html';
            return;
        }
    } catch(e){}

    // If landing on Home (index) and posyandu info missing, go to posyandu form
    try {
        const hrefFull = window.location.href || '';
        if (!hrefFull.includes('welcome.html') && !hrefFull.includes('posyandu.html')) {
            if (hrefFull.includes('index.html') || hrefFull.match(/\/[^\/]*$/)) {
                if (!hasPosyanduInfo()) { window.location.href = 'posyandu.html'; return; }
            }
        }
    } catch(e){}

    // Intercept clicks to Home to require posyandu data first
    document.addEventListener('click', (ev) => {
        try {
            const a = ev.target.closest && ev.target.closest('a');
            if (!a) return;
            const href = (a.getAttribute('href')||'').trim();
            // treat several href forms as Home
            const isHomeLink = href === 'index.html' || href === './' || href === '/' || href === '' || href.endsWith('/') || href.includes('index.html');
            if (isHomeLink) {
                if (!hasPosyanduInfo()) {
                    ev.preventDefault();
                    // navigate to posyandu form
                    window.location.href = 'posyandu.html';
                }
            }
        } catch(e){}
    });

    const toggle = document.getElementById('toggleMeasure');
    if (toggle) toggle.addEventListener('click', toggleMeasure);
    const learn = document.getElementById('learnBtn');
    if (learn) learn.addEventListener('click', openLearnNutrition);
    // close modal with Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLearnNutrition();
    });
    // robust modal close handlers: backdrop click and close button
    const modal = document.getElementById('learnModal');
    if (modal) {
        // click on backdrop (outside modal-content) should close
        modal.addEventListener('click', (ev) => {
            // if click target is the modal container or backdrop element, close
            if (ev.target === modal || ev.target.classList.contains('modal-backdrop')) {
                closeLearnNutrition();
            }
        });
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeLearnNutrition);
    }

    // If on calculator page, ensure mother/child data present
    try {
        if (window.location.href && window.location.href.includes('calculator.html')) {
            ensureMotherChildOnCalculator();
        }
    } catch(e){}

    document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('.grid-item');
    
    items.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, 150 * index); // Efek staggered (bergantian)
    });
});

    // Memastikan semua link 'Home' atau klik Logo kembali ke Welcome (index.html)
document.addEventListener('DOMContentLoaded', () => {
    const homeLinks = document.querySelectorAll('a[href="index.html"]');
    homeLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Optional: Hapus session tertentu jika ingin reset animasi
            console.log("Kembali ke Halaman Welcome...");
        });
    });
});
});