let data = {
    title: "My Board",
    columns: [
        { name: "ready", rows: [] },
        { name: "in-progress", rows: [] },
        { name: "in-review", rows: [] },
        { name: "re-work", rows: [] },
        { name: "done", rows: [] },
        { name: "archived", rows: [] }
    ]
};

function addColumn() {
    const columnName = prompt('Enter column name:');
    if (!columnName) return;

    data.columns.push({
        name: columnName,
        rows: []
    });

    render();
}

function deleteColumn(index) {
    if (confirm(`Delete column "${data.columns[index].name}"?`)) {
        data.columns.splice(index, 1);
        render();
    }
}

function addRow(columnIndex) {
    const input = document.getElementById(`input-${columnIndex}`);
    const rowName = input.value.trim();

    if (!rowName) {
        alert('Please enter a row name');
        return;
    }

    data.columns[columnIndex].rows.push({
        name: rowName
    });

    input.value = '';

    // Hide input and show toggle button again
    const inputDiv = document.getElementById(`add-row-input-${columnIndex}`);
    const toggleBtn = document.getElementById(`toggle-btn-${columnIndex}`);
    if (inputDiv) {
        inputDiv.classList.remove('visible');
    }
    if (toggleBtn) {
        toggleBtn.style.display = '';
    }

    render();
}

// Handle Enter key in row input
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.matches('input[placeholder="Enter row name"]')) {
        const inputId = e.target.id;
        const colIndex = parseInt(inputId.split('-')[1]);
        addRow(colIndex);
    }
}, true);

function deleteRow(columnIndex, rowIndex) {
    data.columns[columnIndex].rows.splice(rowIndex, 1);
    render();
}

let currentRowColumn = null;
let currentRowIndex = null;

function openRowModal(colIndex, rowIndex) {
    currentRowColumn = colIndex;
    currentRowIndex = rowIndex;
    const row = data.columns[colIndex].rows[rowIndex];
    const titleEl = document.getElementById('rowModalTitle');
    const contentEl = document.getElementById('rowModalContentEditable');
    const displayEl = document.getElementById('rowModalContentDisplay');
    const charCountContainer = document.getElementById('charCountContainer');

    titleEl.textContent = row.name;
    contentEl.textContent = row.description || '';

    // Display the link or empty state
    if (row.description) {
        displayEl.innerHTML = `<a href="${escapeHtml(row.description)}" target="_blank">${escapeHtml(row.description)}</a>`;
        displayEl.classList.remove('empty');
    } else {
        displayEl.textContent = 'Click to add a link';
        displayEl.classList.add('empty');
    }

    displayEl.style.display = 'flex';
    contentEl.style.display = 'none';
    charCountContainer.style.display = 'none';

    // Clone and replace elements to remove old event listeners
    const newTitleEl = titleEl.cloneNode(true);
    titleEl.parentNode.replaceChild(newTitleEl, titleEl);

    const newDisplayEl = displayEl.cloneNode(true);
    displayEl.parentNode.replaceChild(newDisplayEl, displayEl);

    const newContentEl = contentEl.cloneNode(true);
    contentEl.parentNode.replaceChild(newContentEl, contentEl);

    // Add event listeners to new elements
    newTitleEl.addEventListener('blur', function() {
        const newName = this.textContent || row.name;
        data.columns[colIndex].rows[rowIndex].name = newName;
        updateURL();
        render();
    });

    newTitleEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
        }
    });

    newDisplayEl.addEventListener('click', function() {
        newDisplayEl.style.display = 'none';
        newContentEl.style.display = 'block';
        charCountContainer.style.display = 'block';
        newContentEl.focus();
    });

    newContentEl.addEventListener('blur', function() {
        const url = this.textContent.trim();
        data.columns[colIndex].rows[rowIndex].description = url;
        updateURL();

        // Update display
        if (url) {
            newDisplayEl.innerHTML = `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a>`;
            newDisplayEl.classList.remove('empty');
        } else {
            newDisplayEl.textContent = 'Click to add a link';
            newDisplayEl.classList.add('empty');
        }
        newDisplayEl.style.display = 'flex';
        newContentEl.style.display = 'none';
        charCountContainer.style.display = 'none';
    });

    newContentEl.addEventListener('input', function() {
        let text = this.textContent;
        if (text.length > 200) {
            this.textContent = text.substring(0, 200);
        }
        updateCharCount();
    });

    newContentEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
        }
    });

    document.getElementById('rowModal').style.display = 'flex';
    document.getElementById('rowModalOverlay').style.display = 'block';
}

function updateCharCount() {
    const contentEl = document.getElementById('rowModalContentEditable');
    document.getElementById('charCount').textContent = contentEl.textContent.length;
}

function closeRowModal() {
    document.getElementById('rowModal').style.display = 'none';
    document.getElementById('rowModalOverlay').style.display = 'none';
    currentRowColumn = null;
    currentRowIndex = null;
}

function deleteCurrentRow() {
    if (currentRowColumn !== null && currentRowIndex !== null) {
        deleteRow(currentRowColumn, currentRowIndex);
        closeRowModal();
    }
}

function render() {
    const container = document.getElementById('columnsContainer');

    // Clear only the columns, keep the add button
    const columns = container.querySelectorAll('.column');
    columns.forEach(col => col.remove());

    // Update title
    const pageTitle = document.getElementById('pageTitle');
    pageTitle.textContent = data.title || 'My Board';
    document.getElementById('pageHeadTitle').textContent = data.title || 'urliterallybeautiful';

    data.columns.forEach((column, colIndex) => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';

        const header = document.createElement('div');
        header.className = 'column-header';
        header.innerHTML = `
            <div class="column-name column-title" contenteditable="true" data-col-index="${colIndex}">${escapeHtml(column.name)}</div>
            <button class="delete-btn" onclick="deleteColumn(${colIndex})">Delete</button>
        `;

        // Add event listeners for column name editing
        const columnNameEl = header.querySelector('.column-title');
        columnNameEl.addEventListener('blur', function() {
            const newName = this.textContent || column.name;
            data.columns[colIndex].name = newName;
            updateURL();
            render();
        });
        columnNameEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
            }
        });

        const rowsDiv = document.createElement('div');
        rowsDiv.className = 'rows';

        column.rows.forEach((row, rowIndex) => {
            const rowBlock = document.createElement('div');
            rowBlock.className = 'row-block';
            rowBlock.innerHTML = `<div class="row-name">${escapeHtml(row.name)}</div>`;
            rowBlock.style.cursor = 'pointer';
            rowBlock.onclick = function() {
                openRowModal(colIndex, rowIndex);
            };
            rowsDiv.appendChild(rowBlock);
        });

        const inputDiv = document.createElement('div');
        inputDiv.className = 'add-row-input';
        inputDiv.id = `add-row-input-${colIndex}`;
        inputDiv.innerHTML = `
            <input type="text" id="input-${colIndex}" placeholder="Enter row name" />
            <button onclick="addRow(${colIndex})">Add</button>
        `;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'add-row-btn-toggle';
        toggleBtn.id = `toggle-btn-${colIndex}`;
        toggleBtn.textContent = '+ Add Item';
        toggleBtn.onclick = function() {
            inputDiv.classList.add('visible');
            toggleBtn.style.display = 'none';
            document.getElementById(`input-${colIndex}`).focus();
        };

        columnDiv.appendChild(header);
        columnDiv.appendChild(rowsDiv);
        columnDiv.appendChild(toggleBtn);
        columnDiv.appendChild(inputDiv);

        // Insert before the add-column button
        const addBtn = container.querySelector('.add-column-btn');
        container.insertBefore(columnDiv, addBtn);
    });

    // Auto-generate URL after render
    updateURL();
}

// Handle title changes
document.getElementById('pageTitle').addEventListener('blur', function() {
    data.title = this.textContent || 'My Board';
    document.getElementById('pageHeadTitle').textContent = data.title || 'urliterallybeautiful';
    updateURL();
});

document.getElementById('pageTitle').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        this.blur();
    }
});

function updateURL() {
    const jsonStr = JSON.stringify(data, null, 0);
    const compressed = pako.gzip(jsonStr);
    const encoded = btoa(String.fromCharCode(...compressed));

    // URL-safe base64 encoding for query parameters
    const urlSafeEncoded = encoded
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    // Update URL bar with proper encoding
    const newUrl = `${window.location.pathname}?state=${encodeURIComponent(urlSafeEncoded)}`;
    window.history.replaceState({}, '', newUrl);

    // Update stats
    const encodedLength = urlSafeEncoded.length;
    const percentage = Math.round((encodedLength / 2000) * 100 * 10) / 10;

    document.getElementById('statRaw').textContent = jsonStr.length;
    document.getElementById('statCompressed').textContent = compressed.length;
    document.getElementById('statEncoded').textContent = encodedLength;
    document.getElementById('statPercent').textContent = percentage + '%';
}

function copyURL() {
    navigator.clipboard.writeText(window.location.href);
    alert('Full URL copied to clipboard!');
}

function clearAll() {
    if (confirm('Are you sure? This will clear all data.')) {
        data = { columns: [] };
        render();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load state from URL if present
function loadStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    let state = params.get('state');

    if (state) {
        try {
            // Convert URL-safe base64 back to standard base64
            state = state.replace(/-/g, '+').replace(/_/g, '/');

            // Add padding if needed
            const padding = 4 - (state.length % 4);
            if (padding !== 4) {
                state += '='.repeat(padding);
            }

            const compressed = Uint8Array.from(atob(state), c => c.charCodeAt(0));
            const jsonStr = pako.ungzip(compressed, { to: 'string' });
            const decoded = JSON.parse(jsonStr);

            if (decoded.columns && Array.isArray(decoded.columns)) {
                data = decoded;
                if (!data.title) data.title = 'My Board';
                console.log('Successfully loaded state from URL');
            } else {
                throw new Error('Invalid data structure');
            }
        } catch (e) {
            console.error('Failed to decode state from URL:', e.message);
            alert('Failed to decode URL. The state may be corrupted.');
        }
    }
}

// Load from URL and render
loadStateFromURL();
render();
