const CANVAS_W = 1080;
const CANVAS_H = 1350;

// Master layout: dominant photo on the left, dark achievement panel bleeding
// off the right edge, exactly mirroring the reference composition.
const LAYOUT = {
    footer: { h: 118 },
    photo: { x: 34, y: 388, w: 654, h: 500 },
    rightPanel: { x: 718, w: 332 },
    panelTop: 368, // Pushed down slightly to give the subtext breathing room
    panelInnerX: 694, // left edge of the dark diagonal panel shape
    panelContentBottom: 1080 // safe lower bound for right-panel decorative content
};

// Fixed Panimalar Assets & Texts 
const TXT_COLLEGE = "PANIMALAR";
const TXT_COLLEGE_SUB = "ENGINEERING COLLEGE";
const TXT_STATUS = "An Autonomous Institution";
const TXT_AFFILIATION = "Affiliated to Anna University, Chennai";
const TXT_TRUST = "( JAISAKTHI EDUCATIONAL TRUST )";
const TXT_FOOTER = "TECHNOLOGY  •  INNOVATION  •  A BRIGHTER TOMORROW";

function shadeColor(hex, percent) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    r = Math.min(255, Math.max(0, Math.round(r + (percent < 0 ? r : 255 - r) * percent)));
    g = Math.min(255, Math.max(0, Math.round(g + (percent < 0 ? g : 255 - g) * percent)));
    b = Math.min(255, Math.max(0, Math.round(b + (percent < 0 ? b : 255 - b) * percent)));
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// Premium Themes
const THEMES = {
    maroon: { primary: '#6a040f', primaryDark: '#2b0308', secondary: '#d4af37', secondaryLight: '#f9d976', bg: '#fdfbf7', dark: '#150304', blue: '#12305c' },
    blue:   { primary: '#0a2342', primaryDark: '#040f1c', secondary: '#d4af37', secondaryLight: '#f9d976', bg: '#f4f6f8', dark: '#040d17', blue: '#0a2342' },
    red:    { primary: '#9d0208', primaryDark: '#420000', secondary: '#ffca28', secondaryLight: '#ffe088', bg: '#fffdfb', dark: '#1a0303', blue: '#12305c' },
    purple: { primary: '#4a148c', primaryDark: '#1e0640', secondary: '#d4af37', secondaryLight: '#f9d976', bg: '#f8f5fa', dark: '#0e0320', blue: '#12305c' },
    green:  { primary: '#1b5e20', primaryDark: '#0a2a0c', secondary: '#cddc39', secondaryLight: '#e6f0a0', bg: '#f4f9f4', dark: '#081c09', blue: '#12305c' }
};

let currentTheme = THEMES.maroon;

const ideasPhrases = [
    ["Ideas", "Build", "a Brighter", "Tomorrow"], ["Dreams", "Create", "a Better", "Future"],
    ["Think", "Create", "Achieve", "More"], ["Ideas", "Inspire", "Future", "Success"],
    ["Imagine", "Create", "Achieve", "Greatness"], ["Think", "Innovate", "Inspire", "Change"]
];

const achievementPhrases = [
    "Keep Achieving, Keep Inspiring!", "Keep Learning, Keep Growing!", "Keep Creating, Keep Achieving!",
    "Keep Innovating, Keep Inspiring!", "Keep Building, Keep Succeeding!"
];

// App State
let selectedIdeas = ideasPhrases[0];
let selectedBottomPhrase = achievementPhrases[0];
let fixedImages = { logo: null, years26: null, loaded: false };
let userPhoto = null; 
let photoState = { x: 0, y: 0, zoom: 1, isDragging: false, startX: 0, startY: 0, minW: 0, minH: 0 };

// Canvas Setup
const renderCanvas = document.getElementById('poster-canvas');
const ctx = renderCanvas.getContext('2d');
const displayCanvas = document.getElementById('display-canvas');
const displayCtx = displayCanvas.getContext('2d');

window.addEventListener('DOMContentLoaded', async () => {
    setupUIEventListeners();
    setupCanvasInteractions();
    
    await loadFixedAssets();
    await initDB();
    loadSettings();
    
    if (!localStorage.getItem('posterSettings')) randomizePhrases();
    
    updateStudentInputs();
    toggleCustomFields();
    
    // Wait for all premium fonts to load before rendering
    await document.fonts.ready;
    renderPoster();
});

function loadFixedAssets() {
    return new Promise((resolve) => {
        let loaded = 0;
        const check = () => { if (++loaded === 2) { fixedImages.loaded = true; resolve(); }};
        
        fixedImages.logo = new Image();
        fixedImages.logo.onload = check;
        fixedImages.logo.onerror = () => { document.getElementById('missingImagesWarning').classList.remove('hidden'); check(); };
        fixedImages.logo.src = 'images/logo.png';
        
        fixedImages.years26 = new Image();
        fixedImages.years26.onload = check;
        fixedImages.years26.onerror = () => { document.getElementById('missingImagesWarning').classList.remove('hidden'); check(); };
        fixedImages.years26.src = 'images/26.png';
    });
}

function randomizePhrases() {
    selectedIdeas = ideasPhrases[Math.floor(Math.random() * ideasPhrases.length)];
    selectedBottomPhrase = achievementPhrases[Math.floor(Math.random() * achievementPhrases.length)];
}

let db;
const DB_NAME = "panimalarPosterDB";

function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 2);
        req.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets");
        };
        req.onsuccess = async (e) => {
            db = e.target.result;
            await loadSavedPhoto();
            resolve();
        };
        req.onerror = () => reject();
    });
}

function savePhotoToDB(blob) {
    if (!db) return;
    const tx = db.transaction(["assets"], "readwrite");
    tx.objectStore("assets").put(blob, "userPhoto");
}

function loadSavedPhoto() {
    return new Promise((resolve) => {
        if (!db) return resolve();
        const tx = db.transaction(["assets"], "readonly");
        const req = tx.objectStore("assets").get("userPhoto");
        req.onsuccess = (e) => {
            const blob = e.target.result;
            if (blob) loadPhotoFromURL(URL.createObjectURL(blob), true);
            resolve();
        };
        req.onerror = () => resolve();
    });
}

function deleteSavedPhoto() {
    if (!db) return;
    const tx = db.transaction(["assets"], "readwrite");
    tx.objectStore("assets").delete("userPhoto");
    userPhoto = null;
    document.getElementById('photoControls').classList.add('hidden');
    document.getElementById('photoUpload').value = '';
    renderPoster();
}

function loadPhotoFromURL(url, isFromDB = false) {
    const img = new Image();
    img.onload = () => {
        userPhoto = img;
        document.getElementById('photoControls').classList.remove('hidden');
        if (!isFromDB) calculateOptimalPhotoState(); 
        renderPoster();
        if(isFromDB) URL.revokeObjectURL(url);
    };
    img.src = url;
}

function calculateOptimalPhotoState() {
    if (!userPhoto) return;
    const pw = LAYOUT.photo.w; 
    const ph = LAYOUT.photo.h; 
    
    const fRatio = pw / ph;
    const iRatio = userPhoto.width / userPhoto.height;
    
    if (iRatio > fRatio) {
        photoState.minH = ph;
        photoState.minW = ph * iRatio;
    } else {
        photoState.minW = pw;
        photoState.minH = pw / iRatio;
    }
    
    photoState.zoom = 1;
    photoState.x = (pw - photoState.minW) / 2;
    photoState.y = (ph - photoState.minH) / 2;
    document.getElementById('photoZoom').value = 1;
}

function setupCanvasInteractions() {
    const canvas = displayCanvas;
    
    function getPointer(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let cx = e.clientX, cy = e.clientY;
        if (e.touches && e.touches.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
        return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
    }

    function inPhotoBounds(p) {
        const px = LAYOUT.photo.x; 
        const py = LAYOUT.photo.y; 
        return p.x >= px && p.x <= (px + LAYOUT.photo.w) &&
               p.y >= py && p.y <= (py + LAYOUT.photo.h);
    }

    const startDrag = (e) => {
        if (!userPhoto) return;
        const p = getPointer(e);
        if (inPhotoBounds(p)) {
            photoState.isDragging = true;
            photoState.startX = p.x - photoState.x;
            photoState.startY = p.y - photoState.y;
            if(e.type === 'touchstart') e.preventDefault();
        }
    };

    const doDrag = (e) => {
        if (!photoState.isDragging || !userPhoto) return;
        const p = getPointer(e);
        photoState.x = p.x - photoState.startX;
        photoState.y = p.y - photoState.startY;
        renderPoster();
        e.preventDefault();
    };

    const endDrag = () => { photoState.isDragging = false; };

    canvas.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', endDrag);
    
    canvas.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', doDrag, { passive: false });
    window.addEventListener('touchend', endDrag);
    
    canvas.addEventListener('wheel', (e) => {
        if (!userPhoto) return;
        if (inPhotoBounds(getPointer(e))) {
            e.preventDefault();
            let z = photoState.zoom - (e.deltaY * 0.002);
            photoState.zoom = Math.max(0.1, Math.min(z, 3));
            document.getElementById('photoZoom').value = photoState.zoom;
            renderPoster();
        }
    }, { passive: false });
}

function setupUIEventListeners() {
    document.querySelectorAll('input:not([type="file"]), select').forEach(el => {
        el.addEventListener('input', () => { toggleCustomFields(); renderPoster(); });
    });
    
    document.getElementById('studentCount').addEventListener('change', updateStudentInputs);
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const theme = e.target.dataset.theme;
            if (theme === 'custom') {
                document.getElementById('customThemeContainer').classList.remove('hidden');
                updateCustomTheme();
            } else {
                document.getElementById('customThemeContainer').classList.add('hidden');
                currentTheme = THEMES[theme];
                renderPoster();
            }
        });
    });
    
    document.getElementById('colorPrimary').addEventListener('input', updateCustomTheme);
    document.getElementById('colorSecondary').addEventListener('input', updateCustomTheme);

    const genAction = () => { randomizePhrases(); renderPoster(); saveSettings(); };
    document.getElementById('btnGenerateTop').addEventListener('click', genAction);
    document.getElementById('btnGenerateBottom').addEventListener('click', genAction);
    
    document.getElementById('btnDownload').addEventListener('click', downloadPNG);
    document.getElementById('btnPrint').addEventListener('click', () => { renderPoster(); window.print(); });
    
    document.getElementById('btnResetForm').addEventListener('click', () => {
        if(confirm("Reset all text fields? (Your photo will remain saved)")) {
            localStorage.removeItem('posterSettings');
            location.reload();
        }
    });
    
    document.getElementById('btnClearData').addEventListener('click', () => {
        if(confirm("Permanently delete the saved photo?")) deleteSavedPhoto();
    });

    document.getElementById('photoUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const url = URL.createObjectURL(file);
        loadPhotoFromURL(url);
        const reader = new FileReader();
        reader.onload = (ev) => { fetch(ev.target.result).then(r => r.blob()).then(savePhotoToDB); };
        reader.readAsDataURL(file);
    });
    
    document.getElementById('photoZoom').addEventListener('input', (e) => { photoState.zoom = parseFloat(e.target.value); renderPoster(); });
    document.getElementById('btnResetPhoto').addEventListener('click', () => { calculateOptimalPhotoState(); renderPoster(); });
    document.getElementById('btnRemovePhoto').addEventListener('click', deleteSavedPhoto);
}

function updateCustomTheme() {
    if(document.querySelector('.theme-btn.active').dataset.theme === 'custom') {
        const p = document.getElementById('colorPrimary').value;
        const s = document.getElementById('colorSecondary').value;
        currentTheme = {
            primary: p,
            primaryDark: shadeColor(p, -0.55),
            secondary: s,
            secondaryLight: shadeColor(s, 0.35),
            bg: '#fffdfb',
            dark: shadeColor(p, -0.8),
            blue: '#12305c'
        };
        renderPoster();
    }
}

function toggleCustomFields() {
    document.getElementById('customYear').classList.toggle('hidden', document.getElementById('yearSelect').value !== 'CUSTOM');
    document.getElementById('customDept').classList.toggle('hidden', document.getElementById('deptSelect').value !== 'CUSTOM');
    document.getElementById('customAchievementContainer').classList.toggle('hidden', document.getElementById('achievementType').value !== 'custom');
}

function updateStudentInputs() {
    const count = parseInt(document.getElementById('studentCount').value);
    const container = document.getElementById('studentInputsContainer');
    const current = Array.from(document.querySelectorAll('.student-name')).map(i => i.value);
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'student-name';
        inp.style.marginBottom = '0.5rem';
        inp.placeholder = `STUDENT ${i+1} NAME`;
        inp.value = current[i] || '';
        inp.addEventListener('input', renderPoster);
        container.appendChild(inp);
    }
    renderPoster();
}

function saveSettings() {
    const s = {
        themeStr: document.querySelector('.theme-btn.active').dataset.theme,
        colorPrimary: document.getElementById('colorPrimary').value,
        colorSecondary: document.getElementById('colorSecondary').value,
        students: Array.from(document.querySelectorAll('.student-name')).map(i => i.value),
        studentCount: document.getElementById('studentCount').value,
        year: document.getElementById('yearSelect').value,
        cYear: document.getElementById('customYear').value,
        dept: document.getElementById('deptSelect').value,
        cDept: document.getElementById('customDept').value,
        achType: document.getElementById('achievementType').value,
        cAch: document.getElementById('customAchievementText').value,
        event: document.getElementById('eventName').value,
        mainEvent: document.getElementById('mainEventName').value,
        sympType: document.getElementById('symposiumType').value,
        date: document.getElementById('eventDate').value,
        orgBy: document.getElementById('organisedBy').value,
        orgAt: document.getElementById('organisedAt').value,
        showY: document.getElementById('showYear').checked,
        showD: document.getElementById('showDept').checked,
        photoState, selectedIdeas, selectedBottomPhrase
    };
    localStorage.setItem('posterSettings', JSON.stringify(s));
}

function loadSettings() {
    try {
        const d = JSON.parse(localStorage.getItem('posterSettings'));
        if(!d) return;
        
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === d.themeStr));
        document.getElementById('colorPrimary').value = d.colorPrimary || '#780000';
        document.getElementById('colorSecondary').value = d.colorSecondary || '#d4af37';
        if(d.themeStr === 'custom') updateCustomTheme(); else currentTheme = THEMES[d.themeStr] || THEMES.maroon;

        document.getElementById('studentCount').value = d.studentCount || 1;
        updateStudentInputs();
        const inputs = document.querySelectorAll('.student-name');
        (d.students || []).forEach((val, i) => { if(inputs[i]) inputs[i].value = val; });
        
        document.getElementById('yearSelect').value = d.year || 'I YEAR';
        document.getElementById('customYear').value = d.cYear || '';
        document.getElementById('deptSelect').value = d.dept || 'COMPUTER SCIENCE AND ENGINEERING';
        document.getElementById('customDept').value = d.cDept || '';
        document.getElementById('achievementType').value = d.achType || '1st';
        document.getElementById('customAchievementText').value = d.cAch || '';
        
        document.getElementById('eventName').value = d.event || '';
        document.getElementById('mainEventName').value = d.mainEvent || '';
        document.getElementById('symposiumType').value = d.sympType || '';
        document.getElementById('eventDate').value = d.date || '';
        document.getElementById('organisedBy').value = d.orgBy || '';
        document.getElementById('organisedAt').value = d.orgAt || '';
        document.getElementById('showYear').checked = d.showY !== false;
        document.getElementById('showDept').checked = d.showD !== false;
        
        if(d.photoState) photoState = d.photoState;
        if(d.selectedIdeas) selectedIdeas = d.selectedIdeas;
        if(d.selectedBottomPhrase) selectedBottomPhrase = d.selectedBottomPhrase;
        document.getElementById('photoZoom').value = photoState.zoom || 1;
        
    } catch(e) { console.error("Settings error:", e); }
}

// Master Render functions
function renderPoster() {
    drawAllElements(ctx);
    
    // Update viewport preview
    displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    displayCtx.drawImage(renderCanvas, 0, 0);
    saveSettings(); 
}

function drawAllElements(targetCtx) {
    targetCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    targetCtx.textBaseline = 'top';

    // 1. Layered premium background: cream base + diagonal maroon achievement panel
    drawPremiumBackground(targetCtx);

    // 2. Header (logos, college name, affiliation) 
    drawHeader(targetCtx);

    // 3. Congratulations script + "Proud of your achievement"
    // Adjusted starting Y coordinate for better vertical centering
    drawCongratulations(targetCtx, 215);

    // 4. "Ideas Build a Brighter Tomorrow" — top right, beside Congratulations
    drawTopMotivational(targetCtx);

    // 5. Decorative folded corner + trophy silhouette on the dark panel
    drawPanelDecorations(targetCtx);

    // 6. Split Layout: Photo (Left) & Medal/Achievement/Event (Right)
    const splitLayoutBottom = drawSplitLayout(targetCtx);

    // 7. Dynamic Info Bar below the split layout
    let dynY = drawOrganizationInfoBar(targetCtx, splitLayoutBottom + 22);

    // 8. Footer (tilted script + gradient band + footer caption)
    drawFooter(targetCtx, dynY + 24);
}

function downloadPNG() {
    renderPoster();

    const quality = document.getElementById('exportQuality').value;
    const scale = quality === '8k' ? 4 : 2;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = CANVAS_W * scale;
    exportCanvas.height = CANVAS_H * scale;
    const exportCtx = exportCanvas.getContext('2d');

    exportCtx.scale(scale, scale);
    drawAllElements(exportCtx);

    exportCanvas.toBlob(blob => {
        if (!blob) return alert("Generation failed.");
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const eName = document.getElementById('eventName').value.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `panimalar_achievement_${eName || 'poster'}_${quality}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
}

/* ---------------------------------------------------------
   BACKGROUND & HEADER DRAWING
--------------------------------------------------------- */
function drawPremiumBackground(ctx) {
    // Ivory/Cream Base
    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const panelX = LAYOUT.panelInnerX;
    const panelTop = LAYOUT.panelTop;

    // Deep maroon diagonal panel
    let bgGrad = ctx.createLinearGradient(panelX, panelTop, CANVAS_W, CANVAS_H);
    bgGrad.addColorStop(0, currentTheme.primary);
    bgGrad.addColorStop(0.55, currentTheme.primaryDark);
    bgGrad.addColorStop(1, currentTheme.dark);

    ctx.beginPath();
    ctx.moveTo(CANVAS_W, panelTop);
    ctx.lineTo(panelX, panelTop);
    ctx.lineTo(panelX, 1120);
    ctx.bezierCurveTo(panelX, 1185, 300, 1205, 0, 1235);
    ctx.lineTo(0, CANVAS_H);
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.closePath();
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Gold sweeping boundary line
    ctx.strokeStyle = currentTheme.secondary;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(CANVAS_W, panelTop);
    ctx.lineTo(panelX, panelTop);
    ctx.lineTo(panelX, 1120);
    ctx.bezierCurveTo(panelX, 1185, 300, 1205, 0, 1235);
    ctx.stroke();

    // Secondary inner highlight for depth
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(CANVAS_W, panelTop + 7);
    ctx.lineTo(panelX + 6, panelTop + 7);
    ctx.lineTo(panelX + 6, 1122);
    ctx.bezierCurveTo(panelX + 6, 1184, 304, 1204, 6, 1233);
    ctx.stroke();

    // Subtle circuit-style tech lines on the cream left side
    ctx.strokeStyle = currentTheme.primary + '12';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 420 + i * 140);
        ctx.lineTo(panelX - 40, 340 + i * 110);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(panelX - 40, 340 + i * 110, 3, 0, Math.PI * 2);
        ctx.fillStyle = currentTheme.primary + '20';
        ctx.fill();
    }

    // Fine gold flecks scattered on the dark panel
    ctx.fillStyle = 'rgba(255, 215, 130, 0.5)';
    const sparkle = [[730, 400], [1040, 460], [735, 620], [1045, 780], [745, 940]];
    sparkle.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawPanelDecorations(ctx) {
    const panelTop = LAYOUT.panelTop;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(CANVAS_W, panelTop);
    ctx.lineTo(CANVAS_W - 58, panelTop);
    ctx.lineTo(CANVAS_W, panelTop + 58);
    ctx.closePath();
    let foldGrad = ctx.createLinearGradient(CANVAS_W - 58, panelTop, CANVAS_W, panelTop + 58);
    foldGrad.addColorStop(0, currentTheme.secondaryLight);
    foldGrad.addColorStop(1, currentTheme.secondary);
    ctx.fillStyle = foldGrad;
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.translate(CANVAS_W - 62, panelTop + 46);
    ctx.scale(0.75, 0.75);
    ctx.strokeStyle = 'rgba(255, 224, 140, 0.45)';
    ctx.fillStyle = 'rgba(255, 224, 140, 0.14)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(-20, 26, 0, 30);
    ctx.quadraticCurveTo(20, 26, 16, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-20, 6, 7, Math.PI * 0.3, Math.PI * 1.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(20, 6, 7, Math.PI * 1.4, Math.PI * 2.7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, 30); ctx.lineTo(-4, 40); ctx.lineTo(4, 40); ctx.lineTo(4, 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-14, 40, 28, 7, 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
}

/* -------------------------------------------------------------
   UPDATED HEADER FUNCTION TO EXACTLY MATCH REFERENCE IMAGE
------------------------------------------------------------- */
function drawHeader(ctx) {
    ctx.save();

    // Clean white header area with enough vertical space
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.fillRect(0, 0, CANVAS_W, 215);

    const logoY = 24;

    // Left and right fixed assets
    if (fixedImages.loaded) {
        if (fixedImages.logo && fixedImages.logo.width > 0) {
            ctx.drawImage(
                fixedImages.logo,
                38,
                logoY,
                130,
                130
            );
        }

        if (fixedImages.years26 && fixedImages.years26.width > 0) {
            ctx.drawImage(
                fixedImages.years26,
                CANVAS_W - 168,
                logoY,
                130,
                130
            );
        }
    }

    const cx = CANVAS_W / 2;

    // ==========================================
    // PANIMALAR MAIN HEADER
    // ==========================================

    const boxX = cx - 270;
    const boxY = 24;
    const boxW = 540;
    const boxH = 95;

    ctx.fillStyle = currentTheme.primary;

    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    ctx.beginPath();
    ctx.roundRect(
        boxX,
        boxY,
        boxW,
        boxH,
        12
    );
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // PANIMALAR
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    ctx.font = "900 52px 'Montserrat'";
    ctx.letterSpacing = "4px";

    ctx.fillText(
        TXT_COLLEGE,
        cx,
        boxY + 38
    );

    // ENGINEERING COLLEGE
    ctx.font = "800 16px 'Montserrat'";
    ctx.letterSpacing = "2.5px";

    ctx.fillText(
        TXT_COLLEGE_SUB,
        cx,
        boxY + 74
    );

    ctx.letterSpacing = "0px";

    // ==========================================
    // AUTONOMOUS INSTITUTION
    // ==========================================

    const statusY = 129;

    ctx.fillStyle = currentTheme.secondary;

    ctx.beginPath();
    ctx.roundRect(
        cx - 165,
        statusY,
        330,
        28,
        14
    );
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = "800 14px 'Montserrat'";
    ctx.fillStyle = '#000000';
    ctx.letterSpacing = "0.5px";

    ctx.fillText(
        TXT_STATUS,
        cx,
        statusY + 14
    );

    ctx.letterSpacing = "0px";

    // ==========================================
    // AFFILIATION
    // ==========================================

    ctx.font = "800 15px 'Montserrat'";
    ctx.fillStyle = currentTheme.blue;
    ctx.letterSpacing = "0.5px";

    ctx.fillText(
        TXT_AFFILIATION,
        cx,
        171
    );

    ctx.letterSpacing = "0px";

    // ==========================================
    // TRUST
    // ==========================================

    ctx.font = "800 13px 'Montserrat'";
    ctx.fillStyle = currentTheme.primary;
    ctx.letterSpacing = "1px";

    ctx.fillText(
        TXT_TRUST,
        cx,
        194
    );

    ctx.letterSpacing = "0px";

    ctx.restore();
}

function drawCongratulations(ctx, startY) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    // Huge flowing script
    ctx.font = "normal 116px 'Great Vibes', cursive";
    let scriptGrad = ctx.createLinearGradient(CANVAS_W / 2 - 320, startY, CANVAS_W / 2 + 320, startY + 90);
    scriptGrad.addColorStop(0, currentTheme.primaryDark);
    scriptGrad.addColorStop(0.5, currentTheme.primary);
    scriptGrad.addColorStop(1, '#1a0206');
    ctx.fillStyle = scriptGrad;
    ctx.fillText("Congratulations!", CANVAS_W / 2, startY);
    ctx.restore();

    let cy = startY + 104;

    // Gold sweeping underline brush stroke
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2 - 300, cy);
    ctx.bezierCurveTo(CANVAS_W / 2 - 100, cy + 22, CANVAS_W / 2 + 100, cy + 22, CANVAS_W / 2 + 300, cy - 8);
    ctx.strokeStyle = currentTheme.secondary;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    cy += 30;

    // Updated Subtext rendering using native letterSpacing for clean visibility
    ctx.save();
    ctx.font = "800 16px 'Montserrat'";
    ctx.fillStyle = currentTheme.primary;
    ctx.letterSpacing = "8px"; // Replaces the string split/join trick
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText("PROUD OF YOUR ACHIEVEMENT", CANVAS_W / 2, cy);
    ctx.restore();
}

function drawTopMotivational(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const sx = CANVAS_W - 96;
    let sy = 188;

    ctx.font = "italic 600 19px 'Playfair Display'";
    ctx.fillStyle = currentTheme.primary;

    selectedIdeas.forEach((word) => {
        ctx.fillText(word, sx, sy);
        sy += 23;
    });

    ctx.beginPath();
    ctx.moveTo(sx - 28, sy + 4);
    ctx.lineTo(sx + 28, sy + 4);
    ctx.strokeStyle = currentTheme.secondary;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

/* ---------------------------------------------------------
   SPLIT LAYOUT (LEFT: PHOTO/STUDENTS, RIGHT: BADGE/EVENT)
--------------------------------------------------------- */
function drawSplitLayout(ctx) {
    const w = LAYOUT.photo.w;
    const h = LAYOUT.photo.h;
    const x = LAYOUT.photo.x;
    const y = LAYOUT.photo.y;

    // 1. Draw Photo on Left
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x - 7, y - 7, w + 14, h + 14, 28);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 22);
    ctx.clip();

    if (userPhoto) {
        const iw = photoState.minW * photoState.zoom;
        const ih = photoState.minH * photoState.zoom;
        const dx = x + photoState.x;
        const dy = y + photoState.y;
        ctx.drawImage(userPhoto, dx, dy, iw, ih);
    } else {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x, y, w, h);
        ctx.font = "600 24px 'Montserrat'";
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("UPLOAD STUDENT PHOTO", x + w / 2, y + h / 2);
    }
    ctx.restore();

    // 2. Draw Student Information directly under photo
    let studentY = y + h + 26;
    studentY = drawStudentInfoBlock(ctx, studentY, x, w);

    // 3. Draw Medal / Achievement / Event on the right dark panel
    drawRightPanel(ctx, LAYOUT.rightPanel.x, LAYOUT.panelTop + 40, LAYOUT.rightPanel.w);

    return studentY;
}

function drawStudentInfoBlock(ctx, cy, blockX, blockW) {
    const cx = blockX + (blockW / 2);

    // Student Names
    const inputs = document.querySelectorAll('.student-name');
    const names = Array.from(inputs).map(i => (i.value || 'STUDENT NAME').toUpperCase());
    const count = names.length;

    if (count > 0) {
        let cols = count <= 3 ? count : (count <= 4 ? 2 : (count <= 6 ? 3 : 4));
        let rows = Math.ceil(count / cols);
        let baseFontSize = count <= 3 ? 26 : (count <= 4 ? 22 : (count <= 6 ? 19 : 16));

        ctx.font = `900 ${baseFontSize}px 'Playfair Display'`;
        ctx.fillStyle = currentTheme.primary;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.letterSpacing = "0.5px";

        let rowHeight = baseFontSize * 1.55;
        let colWidth = blockW / cols;

        for (let r = 0; r < rows; r++) {
            let startIdx = r * cols;
            let endIdx = Math.min(startIdx + cols, count);
            let rowItems = endIdx - startIdx;
            let startX = cx - ((rowItems * colWidth) / 2) + (colWidth / 2);

            for (let c = 0; c < rowItems; c++) {
                let name = names[startIdx + c]; 
                fitTextWidth(ctx, name, startX + (c * colWidth), cy, colWidth - 46, baseFontSize, "900", "Playfair Display");
            }
            cy += rowHeight;
        }
        ctx.letterSpacing = "0px";
    }

    cy += 8;

    // Year
    const showY = document.getElementById('showYear').checked;
    const vY = document.getElementById('yearSelect').value === 'CUSTOM' ? document.getElementById('customYear').value : document.getElementById('yearSelect').value;

    if (showY && vY) {
        ctx.font = "900 21px 'Montserrat'";
        ctx.fillStyle = currentTheme.blue;
        ctx.letterSpacing = "1px";

        const textW = ctx.measureText(vY.toUpperCase()).width;
        ctx.fillText(vY.toUpperCase(), cx, cy);
        ctx.letterSpacing = "0px";

        ctx.strokeStyle = currentTheme.secondary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - textW / 2 - 48, cy + 11);
        ctx.lineTo(cx - textW / 2 - 12, cy + 11);
        ctx.moveTo(cx + textW / 2 + 12, cy + 11);
        ctx.lineTo(cx + textW / 2 + 48, cy + 11);
        ctx.stroke();

        cy += 30;
    }

    // Department
    const showD = document.getElementById('showDept').checked;
    const vD = document.getElementById('deptSelect').value === 'CUSTOM' ? document.getElementById('customDept').value : document.getElementById('deptSelect').value;

    if (showD && vD) {
        ctx.font = "800 17px 'Montserrat'";
        ctx.fillStyle = currentTheme.blue;
        cy = drawAdaptiveWrappedText(ctx, `DEPARTMENT OF ${vD}`.toUpperCase(), cx, cy, blockW - 40, 17, "800", "Montserrat", true);
    }

    return cy + 4;
}

function drawRightPanel(ctx, x, startY, w) {
    const cx = x + (w / 2);
    let cy = startY;

    const type = document.getElementById('achievementType').value;
    const isRanked = ['1st', '2nd', '3rd'].includes(type);

    // 1. Draw Realistic Medal
    if (type !== 'none') {
        const medalR = 74;
        cy += medalR;
        if (isRanked) {
            drawRealisticMedal(ctx, type, cx, cy, medalR);
        } else {
            drawCustomEmblem(ctx, cx, cy, medalR);
        }
        cy += medalR * 1.62 + 20;
    }

    // 2. Achievement Ribbon Banner
    let label = isRanked ?
                (type === '1st' ? 'FIRST PRIZE' : type === '2nd' ? 'SECOND PRIZE' : 'THIRD PRIZE') :
                (type === 'special' ? 'SPECIAL ACHIEVEMENT' :
                (type === 'won' ? 'WON' :
                (type === 'selected' ? 'SELECTED' : document.getElementById('customAchievementText').value || 'ACHIEVEMENT')));
    label = label.toUpperCase();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let bfont = 22;
    ctx.font = `900 ${bfont}px 'Montserrat'`;
    let textW = ctx.measureText(label).width;
    while (textW > w + 40 && bfont > 12) {
        bfont -= 1;
        ctx.font = `900 ${bfont}px 'Montserrat'`;
        textW = ctx.measureText(label).width;
    }
    const badgeW = Math.min(w + 30, textW + 56);
    const badgeH = 44;

    // Ribbon tails
    ctx.fillStyle = currentTheme.primaryDark;
    ctx.beginPath();
    ctx.moveTo(cx - badgeW / 2 + 10, cy);
    ctx.lineTo(cx - badgeW / 2 - 18, cy + 22);
    ctx.lineTo(cx - badgeW / 2 + 10, cy - 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + badgeW / 2 - 10, cy);
    ctx.lineTo(cx + badgeW / 2 + 18, cy + 22);
    ctx.lineTo(cx + badgeW / 2 - 10, cy - 10);
    ctx.fill();

    // Ribbon Body
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    let grad = ctx.createLinearGradient(cx - badgeW / 2, cy, cx + badgeW / 2, cy);
    grad.addColorStop(0, currentTheme.primaryDark);
    grad.addColorStop(0.5, currentTheme.primary);
    grad.addColorStop(1, currentTheme.primaryDark);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH, 6);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = currentTheme.secondary;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, cx, cy + 2);

    cy += badgeH / 2 + 22;

    // 3. Event Details
    const eName = document.getElementById('eventName').value;
    const mName = document.getElementById('mainEventName').value;
    const sType = document.getElementById('symposiumType').value;

    ctx.textBaseline = 'top';
    if (eName) {
        ctx.fillStyle = currentTheme.secondary;
        ctx.font = `700 15px 'Montserrat'`;
        ctx.letterSpacing = "2px";
        ctx.fillText("IN", cx, cy);
        ctx.letterSpacing = "0px";
        cy += 22;

        ctx.fillStyle = currentTheme.secondaryLight;
        cy = drawAdaptiveWrappedText(ctx, eName.toUpperCase(), cx, cy, w, 25, "900", "Montserrat", true);
        cy += 12;
    }

    if (mName) {
        ctx.fillStyle = currentTheme.secondary;
        ctx.font = `700 15px 'Montserrat'`;
        ctx.letterSpacing = "2px";
        ctx.fillText("AT", cx, cy);
        ctx.letterSpacing = "0px";
        cy += 22;

        let mfont = 28;
        ctx.font = `900 ${mfont}px 'Montserrat'`;
        let mText = mName.toUpperCase();
        let mtw = ctx.measureText(mText).width;
        while (mtw > w + 20 && mfont > 14) {
            mfont -= 1;
            ctx.font = `900 ${mfont}px 'Montserrat'`;
            mtw = ctx.measureText(mText).width;
        }
        const mw = Math.min(w + 30, mtw + 42);
        const mh = 44;

        ctx.fillStyle = currentTheme.primaryDark;
        ctx.beginPath();
        ctx.roundRect(cx - mw / 2, cy, mw, mh, 6);
        ctx.fill();
        ctx.strokeStyle = currentTheme.secondary;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = currentTheme.secondaryLight;
        ctx.textBaseline = 'middle';
        ctx.fillText(mText, cx, cy + mh / 2 + 1);
        ctx.textBaseline = 'top';
        cy += mh + 14;
    }

    if (sType) {
        ctx.fillStyle = '#f4f0e8';
        cy = drawAdaptiveWrappedText(ctx, sType, cx, cy, w, 16, "italic 600", "Playfair Display", true);
    }

    // Fill space with subtle engineering motifs
    drawEngineeringMotifs(ctx, x, w, cy + 18, LAYOUT.panelContentBottom);

    return cy;
}

/* ---------------------------------------------------------
   ENGINEERING DEPARTMENT MOTIFS
--------------------------------------------------------- */
function drawDeptIcon(ctx, key, cx, cy, s, color, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.3, s * 0.055);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (key) {
        case 'cse': { 
            const b = s * 0.3;
            ctx.strokeRect(-b, -b, b * 2, b * 2);
            const pins = [-b * 0.55, 0, b * 0.55];
            pins.forEach(p => {
                ctx.beginPath(); ctx.moveTo(p, -b); ctx.lineTo(p, -b - s * 0.14); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(p, b); ctx.lineTo(p, b + s * 0.14); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-b, p); ctx.lineTo(-b - s * 0.14, p); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(b, p); ctx.lineTo(b + s * 0.14, p); ctx.stroke();
            });
            ctx.strokeRect(-b * 0.42, -b * 0.42, b * 0.84, b * 0.84);
            break;
        }
        case 'it': { 
            const w = s * 0.6, h = s * 0.17;
            for (let i = 0; i < 3; i++) {
                const yy = -h * 1.55 + i * (h + 5);
                ctx.strokeRect(-w / 2, yy, w, h);
                ctx.beginPath(); ctx.arc(w / 2 - 6, yy + h / 2, 1.6, 0, Math.PI * 2); ctx.fill();
            }
            break;
        }
        case 'ece': { 
            ctx.beginPath(); ctx.arc(0, s * 0.22, s * 0.09, 0, Math.PI * 2); ctx.fill();
            for (let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.arc(0, s * 0.22, s * 0.16 * i, Math.PI * 1.15, Math.PI * 1.85);
                ctx.stroke();
            }
            break;
        }
        case 'eee': { 
            ctx.beginPath(); ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(s * 0.06, -s * 0.26);
            ctx.lineTo(-s * 0.13, s * 0.02);
            ctx.lineTo(s * 0.0, s * 0.02);
            ctx.lineTo(-s * 0.06, s * 0.26);
            ctx.lineTo(s * 0.15, -s * 0.05);
            ctx.lineTo(s * 0.02, -s * 0.05);
            ctx.closePath();
            ctx.fill();
            break;
        }
        case 'mech': { 
            const teeth = 8, outerR = s * 0.34, innerR = s * 0.24;
            ctx.beginPath();
            for (let i = 0; i < teeth * 2; i++) {
                const ang = (i / (teeth * 2)) * Math.PI * 2;
                const rad = i % 2 === 0 ? outerR : innerR;
                const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, s * 0.11, 0, Math.PI * 2); ctx.stroke();
            break;
        }
        case 'civil': { 
            const baseY = s * 0.32;
            ctx.beginPath(); ctx.moveTo(-s * 0.34, baseY); ctx.lineTo(s * 0.34, baseY); ctx.stroke();
            const bars = [
                { x: -s * 0.22, h: s * 0.34, w: s * 0.15 },
                { x: 0, h: s * 0.52, w: s * 0.17 },
                { x: s * 0.22, h: s * 0.24, w: s * 0.15 }
            ];
            bars.forEach(b => ctx.strokeRect(b.x - b.w / 2, baseY - b.h, b.w, b.h));
            break;
        }
        case 'aids': { 
            const outer = [[-s * 0.28, -s * 0.22], [s * 0.28, -s * 0.22], [-s * 0.3, s * 0.24], [s * 0.3, s * 0.24], [0, -s * 0.34]];
            outer.forEach(p => {
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p[0], p[1]); ctx.stroke();
            });
            ctx.beginPath(); ctx.moveTo(outer[0][0], outer[0][1]); ctx.lineTo(outer[2][0], outer[2][1]); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(outer[1][0], outer[1][1]); ctx.lineTo(outer[3][0], outer[3][1]); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2); ctx.fill();
            outer.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], s * 0.045, 0, Math.PI * 2); ctx.fill(); });
            break;
        }
    }
    ctx.restore();
}

function placeIconRow(ctx, keys, cx, y, panelW, size, color, alpha) {
    const n = keys.length;
    const spacing = Math.min(size * 1.95, (panelW - 24) / Math.max(n - 1, 1));
    const totalW = spacing * (n - 1);
    const startX = cx - totalW / 2;
    keys.forEach((k, i) => drawDeptIcon(ctx, k, startX + i * spacing, y, size, color, alpha));
}

function drawEngineeringMotifs(ctx, panelX, panelW, top, bottom) {
    const avail = bottom - top;
    if (avail < 72) return; 

    const keys = ['cse', 'mech', 'ece', 'eee', 'it', 'civil', 'aids'];
    const cx = panelX + panelW / 2;
    const color = currentTheme.secondary;
    const alpha = 0.17;

    if (avail >= 128) {
        const rowGap = Math.min(58, avail * 0.42);
        const iconSize = Math.min(40, panelW / 5.4);
        const midY = top + avail / 2;
        placeIconRow(ctx, keys.slice(0, 4), cx, midY - rowGap / 2, panelW, iconSize, color, alpha);
        placeIconRow(ctx, keys.slice(4), cx, midY + rowGap / 2, panelW, iconSize, color, alpha);
    } else {
        const iconSize = Math.min(34, panelW / 6.2);
        placeIconRow(ctx, keys.slice(0, 5), cx, top + avail / 2, panelW, iconSize, color, alpha * 0.9);
    }
}

/* ---------------------------------------------------------
   REALISTIC MEDAL
--------------------------------------------------------- */
function scallopPath(ctx, cx, cy, r, teeth, amp) {
    const pts = 240;
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
        const ang = (i / pts) * Math.PI * 2;
        const rad = r + amp * Math.cos(ang * teeth);
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

function drawLaurelBranch(ctx, cx, cy, r, side) {
    const leafCount = 8;
    const startAngle = side < 0 ? Math.PI * 0.72 : Math.PI * 0.28;
    const endAngle = side < 0 ? Math.PI * 1.18 : -Math.PI * 0.18;
    const gold = currentTheme.secondary;
    const goldLight = currentTheme.secondaryLight;
    const goldDark = shadeColor(currentTheme.secondary, -0.4);

    ctx.save();
    for (let i = 0; i < leafCount; i++) {
        const t = i / (leafCount - 1);
        const angle = startAngle + (endAngle - startAngle) * t;
        const rad = r * (1.06 + 0.22 * Math.sin(t * Math.PI));
        const lx = cx + Math.cos(angle) * rad;
        const ly = cy + Math.sin(angle) * rad;
        const leafLen = r * (0.34 - t * 0.11);
        const leafW = r * (0.15 - t * 0.045);

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(angle + Math.PI / 2 + side * 0.35);
        const g = ctx.createLinearGradient(-leafW, 0, leafW, 0);
        g.addColorStop(0, goldDark);
        g.addColorStop(0.5, goldLight);
        g.addColorStop(1, gold);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -leafLen / 2);
        ctx.quadraticCurveTo(leafW, 0, 0, leafLen / 2);
        ctx.quadraticCurveTo(-leafW, 0, 0, -leafLen / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.moveTo(0, -leafLen / 2 + 1);
        ctx.lineTo(0, leafLen / 2 - 1);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

function drawMedalRibbon(ctx, cx, cy, r) {
    ctx.save();
    const topY = cy - r * 0.1;
    const stripW = r * 0.32;
    const gap = r * 0.16;
    const bottomY = cy + r * 1.62;

    [-1, 1].forEach(side => {
        const topX = cx + side * gap;
        const bottomX = cx + side * (gap + r * 0.3);

        ctx.beginPath();
        ctx.moveTo(topX - stripW / 2, topY);
        ctx.lineTo(topX + stripW / 2, topY);
        ctx.lineTo(bottomX + stripW / 2, bottomY);
        ctx.lineTo(bottomX, bottomY - r * 0.22);
        ctx.lineTo(bottomX - stripW / 2, bottomY);
        ctx.closePath();

        const g = ctx.createLinearGradient(topX - stripW / 2, topY, topX + stripW / 2, topY);
        g.addColorStop(0, currentTheme.primaryDark);
        g.addColorStop(0.5, currentTheme.primary);
        g.addColorStop(1, currentTheme.primaryDark);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = currentTheme.secondary;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(topX - stripW * 0.09, topY + 2, stripW * 0.18, (bottomY - topY) - 14);
    });
    ctx.restore();
}

function drawMedalDisc(ctx, type, cx, cy, r) {
    let light, mid, dark, edge, numColor;
    if (type === '1st') { light = '#fff8d6'; mid = '#e8b923'; dark = '#a9790a'; edge = '#5c3d00'; numColor = '#5c3d00'; }
    else if (type === '2nd') { light = '#ffffff'; mid = '#cfd3d8'; dark = '#8b8f96'; edge = '#4a4d52'; numColor = '#3a3d42'; }
    else { light = '#f3c08a'; mid = '#b5651d'; dark = '#7a3d0e'; edge = '#3d1f07'; numColor = '#3d1f07'; }

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;

    scallopPath(ctx, cx, cy, r, 26, 3.5);
    let rimGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rimGrad.addColorStop(0, light);
    rimGrad.addColorStop(0.45, mid);
    rimGrad.addColorStop(1, dark);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = edge;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
    let ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    ringGrad.addColorStop(0, dark);
    ringGrad.addColorStop(1, mid);
    ctx.fillStyle = ringGrad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = edge;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    let faceGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r * 0.72);
    faceGrad.addColorStop(0, light);
    faceGrad.addColorStop(0.6, mid);
    faceGrad.addColorStop(1, dark);
    ctx.fillStyle = faceGrad;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    const spokes = 40;
    for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.18, cy + Math.sin(a) * r * 0.18);
        ctx.lineTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72);
        ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const num = type.replace(/st|nd|rd/, '');
    const sup = type.replace(/\d/g, '');
    ctx.font = `900 ${Math.round(r * 0.62)}px 'Montserrat'`;
    ctx.fillStyle = numColor;
    ctx.fillText(num, cx - r * 0.1, cy + r * 0.02);
    ctx.font = `800 ${Math.round(r * 0.22)}px 'Montserrat'`;
    ctx.fillText(sup, cx + r * 0.36, cy - r * 0.22);

    ctx.restore();
}

function drawRealisticMedal(ctx, type, cx, cy, r) {
    drawLaurelBranch(ctx, cx, cy, r, -1);
    drawLaurelBranch(ctx, cx, cy, r, 1);
    drawMedalRibbon(ctx, cx, cy, r);
    drawMedalDisc(ctx, type, cx, cy, r);
}

function drawCustomEmblem(ctx, cx, cy, r) {
    drawLaurelBranch(ctx, cx, cy, r, -1);
    drawLaurelBranch(ctx, cx, cy, r, 1);
    drawMedalRibbon(ctx, cx, cy, r);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;

    scallopPath(ctx, cx, cy, r, 26, 3.5);
    let grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grad.addColorStop(0, currentTheme.secondaryLight);
    grad.addColorStop(0.5, currentTheme.secondary);
    grad.addColorStop(1, shadeColor(currentTheme.secondary, -0.3));
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = shadeColor(currentTheme.secondary, -0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    drawStar(ctx, cx, cy, r * 0.42, currentTheme.primary);
    ctx.restore();
}

function drawStar(ctx, cx, cy, radius, color) {
    const spikes = 5;
    const innerRadius = radius / 2;
    let rot = Math.PI / 2 * 3;
    let sx = cx, sy = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    for (let i = 0; i < spikes; i++) {
        sx = cx + Math.cos(rot) * radius;
        sy = cy + Math.sin(rot) * radius;
        ctx.lineTo(sx, sy);
        rot += step;

        sx = cx + Math.cos(rot) * innerRadius;
        sy = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(sx, sy);
        rot += step;
    }
    ctx.lineTo(cx, cy - radius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

/* ---------------------------------------------------------
   INFO BAR & FOOTER
--------------------------------------------------------- */
function drawOrganizationInfoBar(ctx, startY) {
    const date = document.getElementById('eventDate').value;
    const orgAt = document.getElementById('organisedAt').value;
    const orgBy = document.getElementById('organisedBy').value;
    
    if (!date && !orgAt && !orgBy) return startY;

    ctx.save();
    let cy = startY + 20;
    
    const boxW = CANVAS_W - 80;
    const boxX = 40;
    const colW = boxW / 3;
    
    ctx.textAlign = 'left'; 
    
    let maxContentH = 0;
    const padY = 20;
    const textW = colW - 60; 
    
    const measureCol = (text) => {
        if(!text) return 0;
        let testCy = drawAdaptiveWrappedText(ctx, text, 0, 0, textW, 14, "700", "Montserrat", false, true);
        return 30 + testCy; 
    };

    const hDate = measureCol(date.toUpperCase());
    const hAt = measureCol(orgAt.toUpperCase());
    const hBy = measureCol(orgBy.toUpperCase());
    
    maxContentH = Math.max(hDate, hAt, hBy, 50); 
    const boxH = maxContentH + (padY * 2);
    
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(boxX, cy, boxW, boxH, 16);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = currentTheme.secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const drawCol = (index, label, text, iconType) => {
        if(!text) return;
        const colX = boxX + (colW * index);
        let colCy = cy + padY;
        
        ctx.fillStyle = currentTheme.primary;
        ctx.beginPath();
        ctx.roundRect(colX + 15, colCy, 30, 30, 6);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if(iconType === 'date') {
            ctx.strokeRect(colX + 22, colCy + 8, 16, 14);
            ctx.fillRect(colX + 22, colCy + 8, 16, 4);
        } else if(iconType === 'at') {
            ctx.arc(colX + 30, colCy + 12, 4, 0, Math.PI*2);
            ctx.moveTo(colX + 22, colCy + 12);
            ctx.bezierCurveTo(colX + 22, colCy + 22, colX + 30, colCy + 25, colX + 30, colCy + 25);
            ctx.bezierCurveTo(colX + 30, colCy + 25, colX + 38, colCy + 22, colX + 38, colCy + 12);
            ctx.stroke();
        } else if(iconType === 'by') {
            ctx.arc(colX + 30, colCy + 10, 4, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(colX + 30, colCy + 22, 7, Math.PI, Math.PI*2); ctx.stroke();
        }
        
        const textStartX = colX + 55;
        
        ctx.fillStyle = currentTheme.primary;
        ctx.font = `800 12px 'Montserrat'`;
        ctx.fillText(label, textStartX, colCy);
        colCy += 16;
        
        ctx.fillStyle = currentTheme.blue;
        drawAdaptiveWrappedText(ctx, text, textStartX, colCy, textW, 14, "700", "Montserrat", false);
        
        if (index < 2) {
            ctx.beginPath();
            ctx.moveTo(colX + colW, cy + padY);
            ctx.lineTo(colX + colW, cy + boxH - padY);
            ctx.strokeStyle = currentTheme.secondary;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    };

    drawCol(0, "DATE:", date.toUpperCase(), 'date');
    drawCol(1, "ORGANISED AT:", orgAt.toUpperCase(), 'at');
    drawCol(2, "ORGANISED BY:", orgBy.toUpperCase(), 'by');

    ctx.restore();
    return cy + boxH; 
}

function drawFooter(ctx, footerY) {
    ctx.save();

    const bandTop = Math.min(footerY, CANVAS_H - LAYOUT.footer.h);
    const bandH = CANVAS_H - bandTop;

    let footGrad = ctx.createLinearGradient(0, bandTop, CANVAS_W, CANVAS_H);
    footGrad.addColorStop(0, currentTheme.primaryDark);
    footGrad.addColorStop(0.5, currentTheme.dark);
    footGrad.addColorStop(1, currentTheme.primaryDark);
    ctx.fillStyle = footGrad;
    ctx.fillRect(0, bandTop, CANVAS_W, bandH);

    ctx.strokeStyle = currentTheme.secondary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, bandTop);
    ctx.lineTo(CANVAS_W, bandTop);
    ctx.stroke();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    let scriptFont = 42;
    ctx.font = `normal ${scriptFont}px 'Great Vibes', cursive`;
    let phraseW = ctx.measureText(selectedBottomPhrase).width;
    while (phraseW > CANVAS_W - 90 && scriptFont > 22) {
        scriptFont -= 2;
        ctx.font = `normal ${scriptFont}px 'Great Vibes', cursive`;
        phraseW = ctx.measureText(selectedBottomPhrase).width;
    }
    ctx.translate(CANVAS_W / 2, bandTop + bandH * 0.6);
    ctx.rotate(-5 * Math.PI / 180);
    ctx.fillStyle = currentTheme.secondaryLight;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillText(selectedBottomPhrase, 0, 0);
    ctx.restore();

    ctx.strokeStyle = 'rgba(212,175,55,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, bandTop + bandH * 0.72);
    ctx.lineTo(CANVAS_W - 50, bandTop + bandH * 0.72);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let capFont = 13;
    ctx.letterSpacing = "2.5px";
    ctx.font = `600 ${capFont}px 'Montserrat'`;
    let capW = ctx.measureText(TXT_FOOTER).width;
    while (capW > CANVAS_W - 80 && capFont > 9) {
        capFont -= 1;
        ctx.font = `600 ${capFont}px 'Montserrat'`;
        capW = ctx.measureText(TXT_FOOTER).width;
    }
    ctx.fillStyle = '#f1e6c8';
    ctx.fillText(TXT_FOOTER, CANVAS_W / 2, bandTop + bandH * 0.87);
    ctx.letterSpacing = "0px";

    ctx.restore();
}

function drawAdaptiveWrappedText(ctx, text, x, y, maxWidth, maxFontSize, fontStyle, fontFace, isCentered = true, measureOnly = false) {
    let size = maxFontSize;
    ctx.font = `${fontStyle} ${size}px '${fontFace}'`;
    ctx.textBaseline = 'top';
    
    while(ctx.measureText("W").width * 10 > maxWidth && size > 10) {
        size -= 1;
        ctx.font = `${fontStyle} ${size}px '${fontFace}'`;
    }

    const words = text.split(' ');
    let line = '';
    let currentY = y;
    const lineHeight = size * 1.35;
    
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
            if(!measureOnly) ctx.fillText(line.trim(), x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    if(!measureOnly) ctx.fillText(line.trim(), x, currentY);
    
    return measureOnly ? (currentY + lineHeight - y) : (currentY + lineHeight);
}

function fitTextWidth(ctx, text, x, y, maxWidth, startSize, fontStyle, fontFace) {
    let size = startSize;
    ctx.font = `${fontStyle} ${size}px '${fontFace}'`;
    while (ctx.measureText(text).width > maxWidth && size > 10) {
        size -= 1;
        ctx.font = `${fontStyle} ${size}px '${fontFace}'`;
    }
    ctx.fillText(text, x, y);
}
