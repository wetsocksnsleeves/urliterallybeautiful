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

let draggedItem = null;
let draggedColumn = null;

// Configure marked to support task lists
marked.setOptions({
    breaks: true,
});

// Use marked's built-in task list support if available
if (marked.defaults) {
    marked.defaults.breaks = true;
}

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

function parsePRLink(link) {
    const match = link.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (match) {
        return { owner: match[1], repo: match[2], number: match[3] };
    }
    return null;
}

async function fetchPRStatus(owner, repo, number) {
    try {
        const token = getCookie('githubToken');
        const headers = {};
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, {
            headers: headers
        });
        if (!response.ok) throw new Error('PR not found');
        const pr = await response.json();
        return pr;
    } catch (e) {
        console.error('Failed to fetch PR:', e.message);
        return null;
    }
}

function getPRStatusIcon(pr) {
    if (!pr) return { icon: '❌', text: 'Invalid PR', color: '#dc3545' };
    if (pr.merged) return { icon: '✅', text: 'Merged', color: '#6f42c1' };
    if (pr.state === 'closed') return { icon: '🔴', text: 'Closed', color: '#dc3545' };
    if (pr.draft) return { icon: '📝', text: 'Draft', color: '#6e7681' };
    return { icon: '🟢', text: 'Open', color: '#28a745' };
}

function getPRStatusIconForCard(pr) {
    if (!pr) return null;
    if (pr.merged) return { icon: '✅', text: 'Merged', color: '#6f42c1' };
    if (pr.state === 'closed') return { icon: '🔴', text: 'Closed', color: '#dc3545' };
    if (pr.draft) return { icon: '📝', text: 'Draft', color: '#6e7681' };
    return { icon: '🟢', text: 'Open', color: '#28a745' };
}

async function updatePRStatus(prLink) {
    const statusEl = document.getElementById('prStatus');

    if (!prLink.trim()) {
        statusEl.style.display = 'none';
        return;
    }

    const prInfo = parsePRLink(prLink);
    if (!prInfo) {
        statusEl.innerHTML = '<span style="color: #dc3545;">Invalid PR link format</span>';
        statusEl.style.display = 'flex';
        return;
    }

    statusEl.innerHTML = '<span>Loading...</span>';
    statusEl.style.display = 'flex';

    const pr = await fetchPRStatus(prInfo.owner, prInfo.repo, prInfo.number);
    const status = getPRStatusIcon(pr);

    statusEl.innerHTML = `<span style="font-size: 16px;">${status.icon}</span><span>${status.text}</span>`;
    statusEl.style.display = 'flex';
}

function openRowModal(colIndex, rowIndex) {
    currentRowColumn = colIndex;
    currentRowIndex = rowIndex;
    const row = data.columns[colIndex].rows[rowIndex];
    const titleEl = document.getElementById('rowModalTitle');
    const contentEl = document.getElementById('rowModalContentEditable');
    const displayEl = document.getElementById('rowModalContentDisplay');
    const charCountContainer = document.getElementById('charCountContainer');
    const prLinkEl = document.getElementById('rowModalPRLink');
    const prStatusEl = document.getElementById('prStatus');

    titleEl.textContent = row.name;
    contentEl.value = row.description || '';
    prLinkEl.value = row.prLink || '';

    // Display the markdown or empty state
    if (row.description) {
        const rendered = marked.parse(row.description);
        const sanitized = DOMPurify.sanitize(rendered, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'input'],
            ALLOWED_ATTR: ['href', 'type', 'checked', 'disabled']
        });
        displayEl.innerHTML = sanitized;
        displayEl.classList.remove('empty');
    } else {
        displayEl.textContent = 'Description...';
        displayEl.classList.add('empty');
    }

    displayEl.style.display = 'block';
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

    // Get existing Edit button
    const editBtn = document.getElementById('editDescriptionBtn');
    editBtn.onclick = function() {
        newDisplayEl.style.display = 'none';
        editBtn.style.display = 'none';
        newContentEl.style.display = 'block';
        charCountContainer.style.display = 'block';
        newContentEl.focus();
    };

    newContentEl.addEventListener('blur', function() {
        const markdown = this.value.trim();
        data.columns[colIndex].rows[rowIndex].description = markdown;
        updateURL();

        // Update display
        if (markdown) {
            const rendered = marked.parse(markdown);
            const sanitized = DOMPurify.sanitize(rendered, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'input'],
                ALLOWED_ATTR: ['href', 'type', 'checked', 'disabled']
            });
            newDisplayEl.innerHTML = sanitized;
            newDisplayEl.classList.remove('empty');
        } else {
            newDisplayEl.textContent = 'Description...';
            newDisplayEl.classList.add('empty');
        }
        newDisplayEl.style.display = 'block';
        editBtn.style.display = 'block';
        newContentEl.style.display = 'none';
        charCountContainer.style.display = 'none';
    });

    newContentEl.addEventListener('input', function() {
        let text = this.value;
        if (text.length > 200) {
            this.value = text.substring(0, 200);
        }
        updateCharCount();
    });

    newContentEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            if (!e.shiftKey) {
                e.preventDefault();
                this.blur();
            }
            // If Shift is held, allow the newline (default behavior)
        }
    });

    // PR Link input handler
    const newPRLinkEl = document.getElementById('rowModalPRLink');
    newPRLinkEl.addEventListener('input', function() {
        data.columns[colIndex].rows[rowIndex].prLink = this.value;
        updateURL();
        updatePRStatus(this.value);
    });

    // Load PR status if link exists
    if (row.prLink) {
        updatePRStatus(row.prLink);
    }

    document.getElementById('rowModal').style.display = 'flex';
    document.getElementById('rowModalOverlay').style.display = 'block';
}

function updateCharCount() {
    const contentEl = document.getElementById('rowModalContentEditable');
    document.getElementById('charCount').textContent = contentEl.value.length;
}

function closeRowModal() {
    document.getElementById('rowModal').style.display = 'none';
    document.getElementById('rowModalOverlay').style.display = 'none';
    currentRowColumn = null;
    currentRowIndex = null;
}

function openSettingsModal() {
    const githubTokenEl = document.getElementById('githubToken');
    const token = getCookie('githubToken');
    githubTokenEl.value = token || '';

    document.getElementById('settingsModal').style.display = 'flex';
    document.getElementById('settingsModalOverlay').style.display = 'block';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
    document.getElementById('settingsModalOverlay').style.display = 'none';
}

function saveGitHubToken() {
    const token = document.getElementById('githubToken').value.trim();
    const statusEl = document.getElementById('tokenStatus');

    if (!token) {
        setCookie('githubToken', '');
        statusEl.textContent = 'Token cleared';
        statusEl.style.color = 'var(--text-secondary)';
        return;
    }

    setCookie('githubToken', token);
    statusEl.textContent = '✓ Token saved (supports private repos)';
    statusEl.style.color = '#28a745';
}

function exportBoardAsJSON() {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `board-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function importBoardFromJSON(event) {
    const file = event.target.files[0];
    const statusEl = document.getElementById('importStatus');

    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);

            if (!imported.columns || !Array.isArray(imported.columns)) {
                throw new Error('Invalid board structure');
            }

            data = imported;
            if (!data.title) data.title = 'My Board';

            updateURL();
            render();

            statusEl.textContent = '✓ Board imported successfully';
            statusEl.style.color = '#28a745';

            // Clear the input so the same file can be imported again
            event.target.value = '';

            // Close settings modal after a brief delay
            setTimeout(() => {
                closeSettingsModal();
            }, 1000);
        } catch (error) {
            statusEl.textContent = `✗ Import failed: ${error.message}`;
            statusEl.style.color = '#dc3545';
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function deleteCurrentRow() {
    if (currentRowColumn !== null && currentRowIndex !== null) {
        deleteRow(currentRowColumn, currentRowIndex);
        closeRowModal();
    }
}

function handleDragStart(e) {
    draggedItem = {
        colIndex: parseInt(e.target.dataset.colIndex),
        rowIndex: parseInt(e.target.dataset.rowIndex)
    };
    e.target.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
    draggedItem = null;
    document.querySelectorAll('.row-block').forEach(block => {
        block.style.opacity = '1';
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    if (draggedItem && e.target.classList.contains('row-block')) {
        e.target.style.opacity = '0.5';
    }
}

function handleDragLeave(e) {
    if (e.target.classList.contains('row-block')) {
        e.target.style.opacity = '1';
    }
}

function handleDrop(e, targetColIndex) {
    e.preventDefault();

    if (!draggedItem) return;

    const sourceColIndex = draggedItem.colIndex;
    const sourceRowIndex = draggedItem.rowIndex;

    if (sourceColIndex === targetColIndex && sourceRowIndex === targetColIndex) {
        return; // Same position, no change
    }

    // Get the row being moved
    const row = data.columns[sourceColIndex].rows[sourceRowIndex];

    // Remove from source column
    data.columns[sourceColIndex].rows.splice(sourceRowIndex, 1);

    // Add to target column
    data.columns[targetColIndex].rows.push(row);

    // Update URL and re-render
    updateURL();
    render();
}

function handleColumnDragStart(e) {
    draggedColumn = {
        index: parseInt(e.target.dataset.colIndex)
    };
    e.target.closest('.column').style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
}

function handleColumnDragEnd(e) {
    e.target.closest('.column').style.opacity = '1';
    draggedColumn = null;
    document.querySelectorAll('.column').forEach(col => {
        col.style.opacity = '1';
    });
}

function handleColumnDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleColumnDragEnter(e) {
    if (draggedColumn) {
        const column = e.target.closest('.column');
        if (column) {
            column.style.opacity = '0.5';
        }
    }
}

function handleColumnDragLeave(e) {
    const column = e.target.closest('.column');
    if (column && !column.contains(e.relatedTarget)) {
        column.style.opacity = '1';
    }
}

function handleColumnDrop(e) {
    e.preventDefault();

    if (!draggedColumn) return;

    const targetHeader = e.target.closest('.column-header');
    if (!targetHeader) return;

    const targetColIndex = parseInt(targetHeader.dataset.colIndex);
    const sourceColIndex = draggedColumn.index;

    if (sourceColIndex === targetColIndex) {
        return; // Same position, no change
    }

    // Reorder columns in the data array
    const [movedColumn] = data.columns.splice(sourceColIndex, 1);
    data.columns.splice(targetColIndex, 0, movedColumn);

    // Update URL and re-render
    updateURL();
    render();
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
        columnDiv.dataset.colIndex = colIndex;

        const header = document.createElement('div');
        header.className = 'column-header';
        header.draggable = true;
        header.dataset.colIndex = colIndex;
        header.innerHTML = `
            <div class="column-header-left">
                <div class="column-name column-title" contenteditable="true" data-col-index="${colIndex}">${escapeHtml(column.name)}</div>
                <span class="column-counter">${column.rows.length}</span>
            </div>
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
            rowBlock.draggable = true;
            rowBlock.dataset.colIndex = colIndex;
            rowBlock.dataset.rowIndex = rowIndex;

            let prIconHTML = '';
            if (row.prLink) {
                prIconHTML = `<span class="row-pr-icon" title="${escapeHtml(row.prLink)}">...</span>`;
            }

            rowBlock.innerHTML = `<div class="row-name">${escapeHtml(row.name)}</div>${prIconHTML}`;
            rowBlock.style.cursor = 'pointer';
            rowBlock.onclick = function(e) {
                if (e.button !== 0) return; // Only left click
                openRowModal(colIndex, rowIndex);
            };

            // Drag event listeners
            rowBlock.addEventListener('dragstart', handleDragStart);
            rowBlock.addEventListener('dragend', handleDragEnd);

            // Load PR status icon if link exists
            if (row.prLink) {
                const prIcon = rowBlock.querySelector('.row-pr-icon');
                const prInfo = parsePRLink(row.prLink);
                if (prInfo) {
                    fetchPRStatus(prInfo.owner, prInfo.repo, prInfo.number).then(pr => {
                        const status = getPRStatusIconForCard(pr);
                        if (status) {
                            prIcon.textContent = status.icon;
                            prIcon.title = `${status.text}: ${row.prLink}`;
                        } else {
                            prIcon.remove();
                        }
                    });
                }
            }

            rowsDiv.appendChild(rowBlock);
        });

        // Make rows container droppable
        rowsDiv.addEventListener('dragover', handleDragOver);
        rowsDiv.addEventListener('drop', (e) => handleDrop(e, colIndex));
        rowsDiv.addEventListener('dragenter', handleDragEnter);
        rowsDiv.addEventListener('dragleave', handleDragLeave);

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

        // Add column drag event listeners to header
        header.addEventListener('dragstart', handleColumnDragStart);
        header.addEventListener('dragend', handleColumnDragEnd);
        columnDiv.addEventListener('dragover', handleColumnDragOver);
        columnDiv.addEventListener('dragenter', handleColumnDragEnter);
        columnDiv.addEventListener('dragleave', handleColumnDragLeave);
        columnDiv.addEventListener('drop', handleColumnDrop);

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

function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/;SameSite=Lax";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
}

// Minify data structure for URL compression
function minifyData(obj) {
    return {
        t: obj.title,
        c: obj.columns.map(col => [
            col.name,
            col.rows.map(row => [
                row.name,
                row.description || undefined,
                row.prLink || undefined
            ].filter(v => v !== undefined))
        ])
    };
}

// Expand minified data back to full structure
function expandData(obj) {
    return {
        title: obj.t,
        columns: obj.c.map(([colName, rows]) => ({
            name: colName,
            rows: (rows || []).map(row => ({
                name: row[0],
                description: row[1] || undefined,
                prLink: row[2] || undefined
            }))
        }))
    };
}

function updateURL() {
    const minified = minifyData(data);
    const jsonStr = JSON.stringify(minified);
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

    // Save to cookie
    setCookie('boardState', urlSafeEncoded);

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

function toggleButtonState() {
    const toggleOffIcon = document.getElementById('toggleOffIcon');
    const toggleOnIcon = document.getElementById('toggleOnIcon');
    const body = document.body;

    if (toggleOffIcon.style.display === 'none') {
        toggleOffIcon.style.display = 'block';
        toggleOnIcon.style.display = 'none';
        body.classList.remove('dark-mode');
        setCookie('theme', 'light');
    } else {
        toggleOffIcon.style.display = 'none';
        toggleOnIcon.style.display = 'block';
        body.classList.add('dark-mode');
        setCookie('theme', 'dark');
    }
}

document.getElementById('toggleBtn').addEventListener('click', toggleButtonState);
document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);

// Close add-row input when clicking outside
document.addEventListener('click', function(e) {
    const addRowInputs = document.querySelectorAll('.add-row-input.visible');
    addRowInputs.forEach(input => {
        if (!input.contains(e.target) && !input.previousElementSibling.contains(e.target)) {
            input.classList.remove('visible');
            input.parentElement.querySelector('.add-row-btn-toggle').style.display = '';
        }
    });
});

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

function getContenteditableText(element) {
    // Convert contenteditable HTML to plain text with proper newlines
    const html = element.innerHTML;
    const temp = document.createElement('div');
    temp.innerHTML = html;

    let text = '';
    for (let node of temp.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'BR') {
                text += '\n';
            } else {
                text += node.textContent;
                if (node.tagName === 'DIV' || node.tagName === 'P') {
                    text += '\n';
                }
            }
        }
    }
    return text.trim();
}

// Load state from URL or cookie
function loadStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    let state = params.get('state');

    // If no state in URL, check cookie
    if (!state) {
        state = getCookie('boardState');
    }

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
            const minified = JSON.parse(jsonStr);

            // Check if it's minified format (has 't' and 'c') or old format (has 'title' and 'columns')
            if (minified.t !== undefined && minified.c !== undefined) {
                // New minified format
                data = expandData(minified);
            } else if (minified.title !== undefined && minified.columns !== undefined) {
                // Old format - direct load
                data = minified;
            } else {
                throw new Error('Invalid data structure');
            }

            if (!data.title) data.title = 'My Board';
            console.log('Successfully loaded state from URL or cookie');
        } catch (e) {
            console.error('Failed to decode state:', e.message);
            alert('Failed to decode state. The data may be corrupted.');
        }
    }
}

// Load theme preference from cookie
function loadTheme() {
    const theme = getCookie('theme');
    const toggleOffIcon = document.getElementById('toggleOffIcon');
    const toggleOnIcon = document.getElementById('toggleOnIcon');

    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        toggleOffIcon.style.display = 'none';
        toggleOnIcon.style.display = 'block';
    } else {
        document.body.classList.remove('dark-mode');
        toggleOffIcon.style.display = 'block';
        toggleOnIcon.style.display = 'none';
    }
}

// Load from URL and render
loadTheme();
loadStateFromURL();
render();
