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
    return line.replace(/("[^"]*")/g, '<span class="gherkin-param">$1</span>');
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
    return match ? match[1].trim() : 'Başlıksız';
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
            <td>${s.content.replace(/\n/g, '<br>')}</td>
            <td><button data-edit="${idx}" class="edit-btn">Düzenle</button></td>
        `;
        // Satıra tıklanınca sağ panelde göster
        tr.addEventListener('click', e => {
            if (!e.target.classList.contains('edit-btn')) {
                showReadonlyScenario(s.content);
            }
        });
        // Düzenle butonu
        tr.querySelector('.edit-btn').addEventListener('click', e => {
            e.stopPropagation();
            editor.value = s.content;
            editor.focus();
        });
        scenarioList.appendChild(tr);
    });
}

// Sağ panelde senaryoyu göster
function showReadonlyScenario(content) {
    readonlyScenario.innerHTML = gherkinToHtml(content);
}

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

// Kaydet butonu
saveBtn.addEventListener('click', () => {
    const content = editor.value.trim();
    if (!content) return;
    let scenarios = getSavedScenarios();
    const title = extractTitle(content);
    // Aynı başlık varsa güncelle
    const idx = scenarios.findIndex(s => s.title === title);
    if (idx >= 0) {
        scenarios[idx].content = content;
    } else {
        scenarios.push({ title, content });
    }
    saveScenarios(scenarios);
    renderScenarioList(searchInput.value);
    editor.value = '';
    hideAutocomplete();
});

// Export butonu
exportBtn.addEventListener('click', () => {
    const scenarios = getSavedScenarios();
    if (!scenarios.length) return;
    let content = scenarios.map(s => s.content.trim()).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'test_senaryolari.feature';
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
    // Pozisyonla (editörün altına hizala)
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
            if (autocompleteSelectedIdx >= 0 && autocompleteSelectedIdx < autocompleteItems.length) {
                e.preventDefault();
                autocompleteItems[autocompleteSelectedIdx].dispatchEvent(new MouseEvent('mousedown'));
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
