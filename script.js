// Gherkin BDD Test Case Editor JS

// Anahtar kelimeler
const GHERKIN_KEYWORDS = ["Scenario", "Given", "When", "Then", "And", "But"];
const GHERKIN_KEYWORDS_LOWER = GHERKIN_KEYWORDS.map(k => k.toLowerCase());

// DOM elemanlarını seç
const editor = document.getElementById('gherkin-editor');
const saveBtn = document.getElementById('save-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file');
const scenarioList = document.getElementById('scenario-list').getElementsByTagName('tbody')[0];
const readonlyScenario = document.getElementById('readonly-scenario');
const searchInput = document.getElementById('search-scenarios');

// --- Yardımcı Fonksiyonlar ---

// Satır başındaki keyword'ü büyük harfe çevir
function autoCapitalizeKeywords(text) {
    return text.split('\n').map(line => {
        for (let key of GHERKIN_KEYWORDS_LOWER) {
            if (line.trim().toLowerCase().startsWith(key)) {
                // İlk harfi büyük yap
                return line.replace(new RegExp('^' + key, 'i'), key.charAt(0).toUpperCase() + key.slice(1));
            }
        }
        return line;
    }).join('\n');
}

// Tırnak içini <span class="gherkin-param"> ile sarar (HTML için)
function highlightParams(line) {
    // Hem tek hem çift tırnaklı parametreleri kapsa
    return line.replace(/('[^']*'|"[^"]*")/g, '<span class="gherkin-param">$1</span>');
}

// Gherkin metnini HTML olarak renklendir
function gherkinToHtml(text) {
    return text.split('\n').map(line => highlightParams(line)).join('\n');
}

// Kaydedilmiş senaryoları localStorage'dan getir
function getSavedScenarios() {
    return JSON.parse(localStorage.getItem('gherkin_scenarios') || '[]');
}

// Senaryoları kaydet
function saveScenarios(scenarios) {
    localStorage.setItem('gherkin_scenarios', JSON.stringify(scenarios));
}

// Senaryo başlığını bul (Scenario: ... satırı)
function extractTitle(text) {
    const match = text.match(/Scenario:\s*(.*)/i);
    return match ? match[1].trim() : 'Untitled';
}

// Senaryoları tabloya yaz
function renderScenarioList(filter = '') {
    scenarioList.innerHTML = '';
    let scenarios = getSavedScenarios();
    if (filter) {
        const f = filter.toLowerCase();
        scenarios = scenarios.filter(s =>
            s.title.toLowerCase().includes(f) || s.content.toLowerCase().includes(f)
        );
    }
    scenarios.forEach((s, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${s.title}</td>
        <td style="text-align:center;">
            <button data-edit="${idx}" class="icon-btn edit-btn" title="Edit">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="vertical-align:middle"><path d="M14.85 2.85a1.2 1.2 0 0 1 1.7 1.7l-1.1 1.1-1.7-1.7 1.1-1.1zm-2 2 1.7 1.7-7.1 7.1c-.1.1-.2.2-.3.2l-2.1.6c-.3.1-.6-.2-.5-.5l.6-2.1c0-.1.1-.2.2-.3l7.1-7.1z" fill="#ffb400"/></svg>
            </button>
            <button data-delete="${idx}" class="icon-btn delete-btn" title="Delete">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="vertical-align:middle"><path d="M6 16a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6H6v10zm9-12h-3.5l-1-1h-3l-1 1H3v2h14V4z" fill="#ff4b5c"/></svg>
            </button>
        </td>
    `;
    // Satıra tıklanınca sağ panelde göster
    tr.addEventListener('click', e => {
        if (!e.target.closest('.edit-btn') && !e.target.closest('.delete-btn')) {
            showReadonlyScenario(s.content);
        }
    });
    // Düzenle butonu
    tr.querySelector('.edit-btn').addEventListener('click', e => {
        e.stopPropagation();
        editor.value = s.content;
        editor.focus();
    });
    // Sil butonu
    tr.querySelector('.delete-btn').addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('Delete this test case?')) {
            let scenarios = getSavedScenarios();
            scenarios.splice(idx, 1);
            saveScenarios(scenarios);
            renderScenarioList(searchInput.value);
            showReadonlyScenario('');
        }
    });
    scenarioList.appendChild(tr);
});
}

// Sağ panelde senaryoyu göster
function showReadonlyScenario(content) {
    readonlyScenario.innerHTML = gherkinToHtml(content);
}

// --- Tema Toggle ---
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeIconDetail = document.getElementById('theme-icon-detail');

function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        // Sun (güneş)
        themeIcon.querySelector('circle').setAttribute('fill', '#fffbe6');
        themeIcon.querySelector('circle').setAttribute('stroke', '#ffb400');
        themeIconDetail.setAttribute('d', '');
        themeIconDetail.setAttribute('fill', '#ffb400');
    } else {
        document.body.classList.remove('light-theme');
        // Crescent moon (hilal)
        themeIcon.querySelector('circle').setAttribute('fill', '#23272b');
        themeIcon.querySelector('circle').setAttribute('stroke', '#ffb400');
        themeIconDetail.setAttribute('d', 'M18 14c0 2.21-1.79 4-4 4a4 4 0 0 1 0-8c.34 0 .67.04 1 .11A6 6 0 1 0 18 14z');
        themeIconDetail.setAttribute('fill', '#ffb400');
    }
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const isLight = document.body.classList.contains('light-theme');
    setTheme(isLight ? 'dark' : 'light');
}

themeToggleBtn.addEventListener('click', toggleTheme);

// Load theme on page load
(function() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') setTheme('light');
    else setTheme('dark');
})();

// --- Event Listenerlar ---

// Editörde yazarken satır başı keyword'leri otomatik büyüt
editor.addEventListener('input', (e) => {
    const before = editor.value;
    const after = autoCapitalizeKeywords(before);
    if (before !== after) {
        editor.value = after;
    }
    showAutocomplete();
});

// New butonu
const newBtn = document.getElementById('new-btn');
newBtn.addEventListener('click', () => {
    editor.value = 'Scenario: ';
    hideAutocomplete();
    editor.focus();
});

// Kaydet butonu
function showOverwriteModal(title, onConfirm) {
    const modal = document.getElementById('overwrite-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const msg = document.getElementById('modal-message');
    msg.textContent = `There's already a script with the same title: "${title}". Would you like to record it?`;
    modal.style.display = 'flex';
    backdrop.style.display = 'block';

    function cleanup() {
        modal.style.display = 'none';
        backdrop.style.display = 'none';
        document.getElementById('modal-overwrite-btn').removeEventListener('click', handleOverwrite);
        document.getElementById('modal-cancel-btn').removeEventListener('click', handleCancel);
    }
    function handleOverwrite() {
        cleanup();
        if (typeof onConfirm === 'function') onConfirm();
    }
    function handleCancel() {
        cleanup();
    }
    document.getElementById('modal-overwrite-btn').addEventListener('click', handleOverwrite);
    document.getElementById('modal-cancel-btn').addEventListener('click', handleCancel);
}

saveBtn.addEventListener('click', function () {
    const content = editor.value.trim();
    // Prevent saving if editor is empty or only 'Scenario:' (with or without spaces)
    if (!content || /^Scenario:\s*$/i.test(content)) {
        alert('Cannot be saved without entering the scenario title and steps!');
        return;
    }
    const title = extractTitle(content);
    let scenarios = getSavedScenarios();
    let idx = scenarios.findIndex(s => extractTitle(s.content) === title);
    if (idx !== -1) {
        // Show modal instead of immediate overwrite
        showOverwriteModal(title, () => {
            scenarios[idx].content = content;
            saveScenarios(scenarios);
            renderScenarioList(searchInput.value);
            editor.value = '';
            hideAutocomplete();
        });
    } else {
        scenarios.push({ title, content });
        saveScenarios(scenarios);
        renderScenarioList(searchInput.value);
        editor.value = '';
        hideAutocomplete();
    }
});

// Export butonu
exportBtn.addEventListener('click', () => {
    const scenarios = getSavedScenarios();
    if (!scenarios.length) return;
    let content = scenarios.map(s => s.content.trim()).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2); 
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
    
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `BDD_Editor_${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Import butonu
importBtn.addEventListener('click', () => {
    importFileInput.value = '';
    importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
    const file = importFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        const text = evt.target.result;
        // Birden fazla Scenario varsa böl
        const parts = text.split(/(?:^|\n)(?=Scenario:)/gm).map(s => s.trim()).filter(Boolean);
        let scenarios = getSavedScenarios();
        for (const part of parts) {
            const title = extractTitle(part);
            const idx = scenarios.findIndex(s => s.title === title);
            if (idx >= 0) {
                scenarios[idx].content = part;
            } else {
                scenarios.push({ title, content: part });
            }
        }
        saveScenarios(scenarios);
        renderScenarioList(searchInput.value);
    };
    reader.readAsText(file);
});

// Listeyi başta ve kaydet sonrası güncelle
renderScenarioList();

// Arama kutusu
searchInput.addEventListener('input', (e) => {
    renderScenarioList(searchInput.value);
});

// İlk başta sağ paneli boşalt
showReadonlyScenario('');

// --- Autocomplete için temel hazırlık ---
let autocompleteBox = null;
let autocompleteItems = [];
let autocompleteSelectedIdx = -1;

function createAutocompleteBox() {
    autocompleteBox = document.createElement('div');
    autocompleteBox.id = 'autocomplete-box';
    autocompleteBox.style.position = 'absolute';
    autocompleteBox.style.zIndex = 1000;
    autocompleteBox.style.display = 'none';
    autocompleteBox.style.background = '#23272b';
    autocompleteBox.style.border = '1px solid #35393e';
    autocompleteBox.style.color = '#ececec';
    autocompleteBox.style.maxHeight = '180px';
    autocompleteBox.style.overflowY = 'auto';
    autocompleteBox.style.minWidth = '260px';
    autocompleteBox.style.fontSize = '1rem';
    autocompleteBox.style.borderRadius = '6px';
    autocompleteBox.style.boxShadow = '0 4px 16px #000a';
    document.body.appendChild(autocompleteBox);
}
createAutocompleteBox();

function getAllSteps() {
    // Tüm kaydedilmiş steplerden unique step içeriği (keyword'süz)
    const scenarios = getSavedScenarios();
    const steps = new Set();
    for (const s of scenarios) {
        s.content.split('\n').forEach(line => {
            const m = line.match(/^(Given|When|Then|And|But)\s+(.*)$/i);
            if (m && m[2].trim()) {
                steps.add(m[2].trim());
            }
        });
    }
    return Array.from(steps);
}

function getCurrentStepPrefix() {
    // Editörde caret'in olduğu satırın içeriği (keyword hariç)
    const pos = editor.selectionStart;
    const text = editor.value.slice(0, pos);
    const lines = text.split('\n');
    const lastLine = lines[lines.length - 1];
    const m = lastLine.match(/^(Given|When|Then|And|But)?\s*(.*)$/i);
    return m ? m[2] : '';
}

function getCaretCoordinates(element, position) {
    // Create a hidden div to mirror the textarea
    const div = document.createElement('div');
    const style = getComputedStyle(element);
    for (const prop of [
        'boxSizing','width','height','overflowX','overflowY','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
        'paddingTop','paddingRight','paddingBottom','paddingLeft','fontStyle','fontVariant','fontWeight','fontStretch','fontSize','fontSizeAdjust','lineHeight','fontFamily','textAlign','textTransform','textIndent','textDecoration','letterSpacing','wordSpacing']) {
        div.style[prop] = style[prop];
    }
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.left = element.offsetLeft + 'px';
    div.style.top = element.offsetTop + 'px';
    div.style.zIndex = -9999;
    div.style.background = 'transparent';
    div.style.pointerEvents = 'none';
    div.textContent = element.value.substring(0, position);
    // Place a marker span at the caret
    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);
    document.body.appendChild(div);
    const rect = span.getBoundingClientRect();
    const parentRect = element.getBoundingClientRect();
    const coords = {
        top: rect.top - parentRect.top + element.scrollTop,
        left: rect.left - parentRect.left + element.scrollLeft
    };
    document.body.removeChild(div);
    return coords;
}

function showAutocomplete() {
    const prefix = getCurrentStepPrefix().toLowerCase();
    if (!prefix) {
        hideAutocomplete();
        return;
    }
    const allSteps = getAllSteps();
    const filtered = allSteps.filter(s => s.toLowerCase().includes(prefix) && s.length > 0);
    if (filtered.length === 0) {
        hideAutocomplete();
        return;
    }
    autocompleteBox.innerHTML = '';
    autocompleteItems = [];
    autocompleteSelectedIdx = -1;
    filtered.slice(0, 10).forEach((step, idx) => {
        const div = document.createElement('div');
        div.textContent = step;
        div.className = 'autocomplete-item';
        div.style.padding = '8px 12px';
        div.style.cursor = 'pointer';
        div.tabIndex = -1;
        div.addEventListener('mousedown', (e) => {
            e.preventDefault();
            insertStepAutocomplete(step);
            hideAutocomplete();
        });
        autocompleteBox.appendChild(div);
        autocompleteItems.push(div);
    });
    // Position autocomplete box always under the textarea input
    const rect = editor.getBoundingClientRect();
    autocompleteBox.style.left = rect.left + window.scrollX + 'px';
    autocompleteBox.style.top = rect.bottom + window.scrollY + 'px';
    autocompleteBox.style.width = rect.width + 'px';
    autocompleteBox.style.display = 'block';
}


function hideAutocomplete() {
    autocompleteBox.style.display = 'none';
    autocompleteItems = [];
    autocompleteSelectedIdx = -1;
}

function insertStepAutocomplete(step) {
    // Caret'in olduğu satırı step ile değiştir
    const pos = editor.selectionStart;
    const text = editor.value;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const lines = before.split('\n');
    const lastLineIdx = lines.length - 1;
    const currentLine = lines[lastLineIdx];
    // Satır başı keyword'ü bul
    const m = currentLine.match(/^(Given|When|Then|And|But)?\s*/i);
    let keyword = m && m[1] ? m[1] : '';
    if (!keyword) keyword = 'Given';
    // Satırı değiştir
    lines[lastLineIdx] = keyword + ' ' + step;
    const newText = lines.join('\n') + after.slice(0);
    editor.value = newText;
    editor.focus();
}

// Editör odağı kaybedince autocomplete gizle
editor.addEventListener('blur', hideAutocomplete);

// Klavye ile autocomplete kontrolü
editor.addEventListener('keydown', (e) => {
    if (autocompleteBox.style.display === 'block' && autocompleteItems.length > 0) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            autocompleteSelectedIdx = (autocompleteSelectedIdx + 1) % autocompleteItems.length;
            updateAutocompleteSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            autocompleteSelectedIdx = (autocompleteSelectedIdx - 1 + autocompleteItems.length) % autocompleteItems.length;
            updateAutocompleteSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (autocompleteSelectedIdx >= 0 && autocompleteSelectedIdx < autocompleteItems.length) {
                autocompleteItems[autocompleteSelectedIdx].dispatchEvent(new MouseEvent('mousedown'));
            } else if (autocompleteItems.length > 0) {
                autocompleteItems[0].dispatchEvent(new MouseEvent('mousedown'));
            }
        } else if (e.key === 'Escape') {
            hideAutocomplete();
        }
    }
});

function updateAutocompleteSelection() {
    autocompleteItems.forEach((item, idx) => {
        if (idx === autocompleteSelectedIdx) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}


// --- CSS ile parametre renklendirme için stil ekle ---
(function addParamStyle() {
    const style = document.createElement('style');
    style.innerHTML = `.gherkin-param { color: #ff4b5c; font-weight: bold; }\n#autocomplete-box .autocomplete-item:hover { background: #35393e; color: #ffb400; }`;
    document.head.appendChild(style);
})();
