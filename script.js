// Global Variables
let selectedGender = 'boy';

/**
 * DATA REFERENSI Z-SCORE (BB/TB) 
 * Standar Antropometri Anak Kemenkes RI
 * Format: { 'Tinggi_Badan': { median, sdMinus1, sdPlus1 } }
 */
const refTable = {
    'boy': {
        '80': { median: 10.4, sdMinus1: 9.6, sdPlus1: 11.4 },
        '85': { median: 11.5, sdMinus1: 10.6, sdPlus1: 12.5 },
        '90': { median: 12.6, sdMinus1: 11.6, sdPlus1: 13.7 },
        '95': { median: 13.7, sdMinus1: 12.6, sdPlus1: 14.9 },
        '100': { median: 14.9, sdMinus1: 13.7, sdPlus1: 16.2 }
    },
    'girl': {
        '80': { median: 10.0, sdMinus1: 9.2, sdPlus1: 11.0 },
        '85': { median: 11.1, sdMinus1: 10.2, sdPlus1: 12.2 },
        '90': { median: 12.2, sdMinus1: 11.2, sdPlus1: 13.4 },
        '95': { median: 13.3, sdMinus1: 12.2, sdPlus1: 14.6 },
        '100': { median: 14.6, sdMinus1: 13.4, sdPlus1: 16.0 }
    }
};

// Scroll to Calculator
function scrollToCalculator() {
    const calculator = document.getElementById('calculator');
    calculator.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Open/close the Learn Nutrition modal
function openLearnNutrition() {
    const modal = document.getElementById('learnModal');
    if (modal) modal.classList.remove('hidden');
}

function closeLearnNutrition() {
    const modal = document.getElementById('learnModal');
    if (modal) modal.classList.add('hidden');
}

// Select Gender
function selectGender(gender) {
    selectedGender = gender;
    const buttons = document.querySelectorAll('.gender-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gender === gender);
    });
}

// Validate weight & height inputs with friendly messages
function validateMeasurements() {
    const weightInput = document.getElementById('childWeight');
    const heightInput = document.getElementById('childHeight');
    const weightError = document.getElementById('weightError');
    const heightError = document.getElementById('heightError');

    // reset
    weightError.textContent = '';
    heightError.textContent = '';
    weightInput.classList.remove('input-error');
    heightInput.classList.remove('input-error');

    const weight = parseFloat(weightInput.value);
    const height = parseFloat(heightInput.value);
    let valid = true;

    if (isNaN(weight) || weight <= 0) {
        weightError.textContent = 'Masukkan berat yang valid (kg).';
        weightInput.classList.add('input-error');
        valid = false;
    } else if (weight < 2 || weight > 60) {
        weightError.textContent = 'Periksa berat: biasanya antara 2–60 kg untuk anak.';
        weightInput.classList.add('input-error');
        valid = false;
    }

    if (isNaN(height) || height <= 0) {
        heightError.textContent = 'Masukkan tinggi yang valid (cm).';
        heightInput.classList.add('input-error');
        valid = false;
    } else if (height < 30 || height > 210) {
        heightError.textContent = 'Periksa tinggi: biasanya antara 30–210 cm.';
        heightInput.classList.add('input-error');
        valid = false;
    }

    // quick sanity BMI check
    if (valid) {
        const bmi = weight / ((height / 100) ** 2);
        if (bmi < 6 || bmi > 60) {
            weightError.textContent = 'Nilai BMI terlihat tidak wajar, mohon periksa input lagi.';
            weightInput.classList.add('input-error');
            valid = false;
        }
    }

    return valid;
}

// Calculate Z-Score
function calculateZScore() {
    const name = document.getElementById('childName').value.trim();
    const age = parseInt(document.getElementById('childAge').value);
    const weight = parseFloat(document.getElementById('childWeight').value);
    const height = parseFloat(document.getElementById('childHeight').value);

    // 1. Validasi Input
    if (!name || !age || !weight || !height) {
        alert('Bunda, mohon lengkapi semua data ya! 😊');
        return;
    }

    // additional validation for measurements
    if (!validateMeasurements()) {
        return;
    }

    // 2. Cari Data Referensi Berdasarkan Tinggi (Dibulatkan)
    const roundedHeight = Math.round(height / 5) * 5; // Mencari kelipatan 5 terdekat di tabel
    const ref = refTable[selectedGender][roundedHeight.toString()];

    let zScore;
    let status, message, className, icon;

    // 3. Logika Rumus Z-Score (Sesuai Gambar)
    if (ref) {
        if (weight < ref.median) {
            // Rumus jika BB < Median
            zScore = (weight - ref.median) / (ref.median - ref.sdMinus1);
        } else {
            // Rumus jika BB > Median
            zScore = (weight - ref.median) / (ref.sdPlus1 - ref.median);
        }

        // Tentukan Status Berdasarkan Z-Score
        if (zScore < -3) {
            status = 'Gizi Buruk';
            className = 'danger'; icon = '⚠️';
            message = 'Segera konsultasikan ke fasilitas kesehatan terdekat.';
        } else if (zScore < -2) {
            status = 'Gizi Kurang';
            className = 'warning'; icon = '⚠️';
            message = 'Si kecil perlu tambahan asupan nutrisi berkualitas.';
        } else if (zScore <= 1) {
            status = 'Gizi Baik (Normal)';
            className = 'success'; icon = '✅';
            message = 'Mantap, tumbuh kembang si kecil sesuai jalur!';
        } else if (zScore <= 2) {
            status = 'Risiko Gizi Lebih';
            className = 'warning'; icon = '⚠️';
            message = 'Pantau asupan lemak dan gula pada makanan si kecil.';
        } else {
            status = 'Gizi Berlebih (Obesitas)';
            className = 'danger'; icon = '⚠️';
            message = 'Konsultasikan pola diet sehat dengan dokter anak.';
        }
    } else {
        // Fallback jika tinggi badan diluar range tabel contoh
        zScore = weight / ((height / 100) ** 2); // Kembali ke BMI biasa
        status = 'Analisis Dasar (IMT)';
        className = 'success'; icon = '💡';
        message = 'Tinggi badan si kecil diluar jangkauan tabel referensi cepat.';
    }

    displayResult(name, zScore, status, message, className, icon);
}

function displayResult(name, value, status, message, className, icon) {
    const resultBox = document.getElementById('result');
    const resetBtn = document.getElementById('resetBtn');

    resultBox.innerHTML = `
        <div class="result-header">
            <div class="result-icon">${icon}</div>
            <div class="result-content">
                <h4>Hasil Analisis ${name}</h4>
                <div class="result-data">
                    <div class="result-label">Nilai Z-Score / IMT</div>
                    <div class="result-value">${value.toFixed(2)}</div>
                    <div class="result-status">Status: <strong>${status}</strong></div>
                </div>
                <div class="result-message">${message}</div>
            </div>
        </div>
    `;
    
    resultBox.className = `result-box ${className}`;
    resultBox.classList.remove('hidden');
    resetBtn.classList.remove('hidden');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Save last result for export/share
    const last = { name, value: value.toFixed(2), status, message };
    localStorage.setItem('lastAnalysis', JSON.stringify(last));

    // show post actions
    const post = document.getElementById('postActions');
    if (post) post.classList.remove('hidden');
}

// Export result area to PNG image
async function exportToImage() {
    const resultBox = document.getElementById('result');
    if (!resultBox || resultBox.classList.contains('hidden')) return alert('Tidak ada hasil untuk diekspor.');
    const canvas = await html2canvas(resultBox, { backgroundColor: null, scale: 2 });
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `NutriKids_Hasil_${new Date().toISOString().slice(0,10)}.png`;
    a.click();
}

// Export result to PDF via jsPDF
function exportToPDF() {
    const last = JSON.parse(localStorage.getItem('lastAnalysis') || '{}');
    if (!last || !last.name) return alert('Tidak ada hasil untuk diekspor.');
    // simple PDF summary
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFontSize(16);
    doc.text('NutriKids - Hasil Analisis', 20, 20);
    doc.setFontSize(12);
    doc.text(`Nama: ${last.name}`, 20, 36);
    doc.text(`Nilai Z-Score / IMT: ${last.value}`, 20, 46);
    doc.text(`Status: ${last.status}`, 20, 56);
    doc.text('Catatan:', 20, 70);
    doc.setFontSize(11);
    doc.text(last.message, 20, 78, { maxWidth: 170 });
    doc.save(`NutriKids_Hasil_${last.name.replace(/\s+/g,'_')}.pdf`);
}

// Share short summary via WhatsApp (opens wa.me with prefilled text)
function shareWhatsApp() {
    const last = JSON.parse(localStorage.getItem('lastAnalysis') || '{}');
    if (!last || !last.name) return alert('Tidak ada hasil untuk dibagikan.');
    const text = `Hasil cek gizi ${last.name}: Z-Score/IMT ${last.value} - ${last.status}. Catatan: ${last.message}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// Reminder: set a posyandu reminder date (YYYY-MM-DD) and schedule notification / .ics download
function setReminder() {
    const input = prompt('Masukkan tanggal Posyandu (YYYY-MM-DD) untuk pengingat:');
    if (!input) return;
    const d = new Date(input);
    if (isNaN(d.getTime())) return alert('Format tanggal tidak valid. Gunakan YYYY-MM-DD.');
    const reminder = { date: d.toISOString(), created: new Date().toISOString(), notified: false };
    localStorage.setItem('posyanduReminder', JSON.stringify(reminder));
    // create ICS file for calendar
    createICS(d, 'Posyandu - Bawa hasil ukur mandiri', 'Bawa hasil pengukuran berat & tinggi anak untuk verifikasi di Posyandu.');
    updateReminderStatus();
    // try to request notification permission and schedule (will check periodically)
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
    alert('Pengingat tersimpan. Anda juga dapat menambahkan ke kalender (.ics) yang terunduh.');
}

function createICS(dateObj, title, description) {
    const start = new Date(dateObj);
    start.setHours(8,0,0);
    const end = new Date(start.getTime() + 60*60*1000);
    function toUTCString(d) { return d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z'; }
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//NutriKids//Reminder//EN\nBEGIN:VEVENT\nUID:${Date.now()}@nutrikids\nDTSTAMP:${toUTCString(new Date())}\nDTSTART:${toUTCString(start)}\nDTEND:${toUTCString(end)}\nSUMMARY:${title}\nDESCRIPTION:${description}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `posyandu-reminder-${start.toISOString().slice(0,10)}.ics`;
    a.click();
}

// Periodically check reminders (fires notifications if due)
function checkReminders() {
    const raw = localStorage.getItem('posyanduReminder');
    if (!raw) return updateReminderStatus();
    const rem = JSON.parse(raw);
    const due = new Date(rem.date);
    const now = new Date();
    // show status
    updateReminderStatus();
    // if within same day and not notified => notify
    if (!rem.notified && now >= new Date(due.getFullYear(), due.getMonth(), due.getDate(), 8,0,0)) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Posyandu Reminder', { body: 'Hari ini Posyandu — bawa hasil ukur mandiri untuk divalidasi.' });
        } else {
            // fallback: alert
            alert('Pengingat Posyandu: hari ini — bawa hasil ukur mandiri untuk divalidasi.');
        }
        rem.notified = true;
        localStorage.setItem('posyanduReminder', JSON.stringify(rem));
        updateReminderStatus();
    }
}

function updateReminderStatus() {
    const statusEl = document.getElementById('reminderStatus');
    const raw = localStorage.getItem('posyanduReminder');
    if (!statusEl) return;
    if (!raw) {
        statusEl.textContent = '';
        return;
    }
    const rem = JSON.parse(raw);
    const d = new Date(rem.date);
    statusEl.textContent = `Pengingat: ${d.toLocaleDateString()}` + (rem.notified ? ' (terpenuhi)' : '');
}

// Wire up post action buttons
document.addEventListener('DOMContentLoaded', () => {
    const pdfBtn = document.getElementById('exportPdfBtn');
    const imgBtn = document.getElementById('exportImgBtn');
    const waBtn = document.getElementById('shareWaBtn');
    const remBtn = document.getElementById('setReminderBtn');
    const learnBtn = document.getElementById('learnBtn');
    if (imgBtn) imgBtn.addEventListener('click', exportToImage);
    if (pdfBtn) pdfBtn.addEventListener('click', exportToPDF);
    if (waBtn) waBtn.addEventListener('click', shareWhatsApp);
    if (remBtn) remBtn.addEventListener('click', setReminder);
    if (learnBtn) learnBtn.addEventListener('click', openLearnNutrition);
    checkReminders();
    // check reminders every minute
    setInterval(checkReminders, 60*1000);
});

function resetForm() {
    document.getElementById('childName').value = '';
    document.getElementById('childAge').value = '';
    document.getElementById('childWeight').value = '';
    document.getElementById('childHeight').value = '';
    selectGender('boy');
    document.getElementById('result').classList.add('hidden');
    document.getElementById('resetBtn').classList.add('hidden');

    // clear validation messages and styles
    const weightError = document.getElementById('weightError');
    const heightError = document.getElementById('heightError');
    if (weightError) weightError.textContent = '';
    if (heightError) heightError.textContent = '';
    const weightInput = document.getElementById('childWeight');
    const heightInput = document.getElementById('childHeight');
    if (weightInput) weightInput.classList.remove('input-error');
    if (heightInput) heightInput.classList.remove('input-error');
}

// Wire up measurement toggle after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggleMeasure');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const box = document.getElementById('measureInstructions');
            if (box) box.classList.toggle('hidden');
        });
    }
});