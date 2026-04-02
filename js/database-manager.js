// Database Management Functions
let currentTable = 'members';
let dbData = [];

// Load database management section
function loadDatabaseManagement() {
    const mainContent = document.getElementById('main-content') || document.querySelector('.main-content');
    
    const dbSection = `
        <div class="db-management" style="padding: 30px; max-width: 1400px; margin: 0 auto;">
            <div style="margin-bottom: 30px;">
                <h2 style="font-size: 2rem; color: var(--dark-color); margin-bottom: 10px;">
                    <i class="fas fa-database" style="color: var(--primary-color);"></i> Database Management
                </h2>
                <p style="color: var(--muted-color);">View, search, and export your platform data</p>
            </div>

            <!-- Statistics Cards -->
            <div class="db-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="stat-card" style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #0f766e, #14b8a6); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-users" style="color: white; font-size: 1.5rem;"></i>
                        </div>
                        <div>
                            <p style="color: var(--muted-color); font-size: 0.875rem;">Total Members</p>
                            <h3 id="stat-members" style="font-size: 1.75rem; color: var(--dark-color);">-</h3>
                        </div>
                    </div>
                </div>

                <div class="stat-card" style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #d97706, #f59e0b); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-calendar-event" style="color: white; font-size: 1.5rem;"></i>
                        </div>
                        <div>
                            <p style="color: var(--muted-color); font-size: 0.875rem;">Total Events</p>
                            <h3 id="stat-events" style="font-size: 1.75rem; color: var(--dark-color);">-</h3>
                        </div>
                    </div>
                </div>

                <div class="stat-card" style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #15803d, #22c55e); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-handshake" style="color: white; font-size: 1.5rem;"></i>
                        </div>
                        <div>
                            <p style="color: var(--muted-color); font-size: 0.875rem;">Partnerships</p>
                            <h3 id="stat-partnerships" style="font-size: 1.75rem; color: var(--dark-color);">-</h3>
                        </div>
                    </div>
                </div>

                <div class="stat-card" style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #dc2626, #ef4444); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-envelope" style="color: white; font-size: 1.5rem;"></i>
                        </div>
                        <div>
                            <p style="color: var(--muted-color); font-size: 0.875rem;">Messages</p>
                            <h3 id="stat-messages" style="font-size: 1.75rem; color: var(--dark-color);">-</h3>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Table Selection & Actions -->
            <div class="db-controls" style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 24px;">
                <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <button onclick="loadTableData('members')" class="table-btn ${currentTable === 'members' ? 'active' : ''}" style="padding: 12px 24px; background: ${currentTable === 'members' ? 'var(--primary-color)' : '#f1f5f9'}; color: ${currentTable === 'members' ? 'white' : 'var(--dark-color)'}; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            <i class="fas fa-users"></i> Members
                        </button>
                        <button onclick="loadTableData('events')" class="table-btn ${currentTable === 'events' ? 'active' : ''}" style="padding: 12px 24px; background: ${currentTable === 'events' ? 'var(--primary-color)' : '#f1f5f9'}; color: ${currentTable === 'events' ? 'white' : 'var(--dark-color)'}; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            <i class="fas fa-calendar"></i> Events
                        </button>
                        <button onclick="loadTableData('partnerships')" class="table-btn ${currentTable === 'partnerships' ? 'active' : ''}" style="padding: 12px 24px; background: ${currentTable === 'partnerships' ? 'var(--primary-color)' : '#f1f5f9'}; color: ${currentTable === 'partnerships' ? 'white' : 'var(--dark-color)'}; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            <i class="fas fa-handshake"></i> Partnerships
                        </button>
                        <button onclick="loadTableData('contact_messages')" class="table-btn ${currentTable === 'contact_messages' ? 'active' : ''}" style="padding: 12px 24px; background: ${currentTable === 'contact_messages' ? 'var(--primary-color)' : '#f1f5f9'}; color: ${currentTable === 'contact_messages' ? 'white' : 'var(--dark-color)'}; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            <i class="fas fa-envelope"></i> Messages
                        </button>
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button onclick="exportToCSV()" style="padding: 12px 24px; background: #22c55e; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-file-csv"></i> Export CSV
                        </button>
                        <button onclick="exportToJSON()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-file-code"></i> Export JSON
                        </button>
                        <button onclick="refreshData()" style="padding: 12px 24px; background: var(--primary-color); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                    </div>
                </div>
            </div>

            <!-- Search & Filter -->
            <div class="db-search" style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 24px;">
                <div style="display: flex; gap: 16px; align-items: center;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--dark-color);">
                            <i class="fas fa-search"></i> Search
                        </label>
                        <input type="text" id="db-search-input" placeholder="Search in ${currentTable}..." onkeyup="filterTable()" style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1rem;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--dark-color);">Show</label>
                        <select id="db-entries" onchange="filterTable()" style="padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 1rem;">
                            <option value="10">10 entries</option>
                            <option value="25">25 entries</option>
                            <option value="50">50 entries</option>
                            <option value="100">100 entries</option>
                            <option value="all">All entries</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Data Table -->
            <div class="db-table" style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow-x: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="font-size: 1.25rem; color: var(--dark-color);">
                        <i class="fas fa-table" style="color: var(--primary-color);"></i> 
                        <span id="table-title">${formatTableName(currentTable)}</span>
                        <span id="table-count" style="color: var(--muted-color); font-size: 0.875rem; font-weight: normal;">(- records)</span>
                    </h3>
                </div>
                
                <div id="table-container">
                    <table id="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr id="table-header"></tr>
                        </thead>
                        <tbody id="table-body">
                            <tr><td colspan="100" style="text-align: center; padding: 40px; color: var(--muted-color);">Loading data...</td></tr>
                        </tbody>
                    </table>
                </div>

                <div id="pagination-info" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <p id="pagination-text" style="color: var(--muted-color);">Showing 0 to 0 of 0 entries</p>
                    <div id="pagination-buttons"></div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="db-quick-actions" style="margin-top: 30px; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    <h4 style="margin-bottom: 16px; color: var(--dark-color);">
                        <i class="fas fa-bolt" style="color: var(--primary-color);"></i> Quick Actions
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button onclick="createBackup()" style="padding: 12px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; text-align: left; font-weight: 500;">
                            <i class="fas fa-download"></i> Download Database Backup
                        </button>
                        <button onclick="clearOldData()" style="padding: 12px; background: #fef3c7; border: none; border-radius: 8px; cursor: pointer; text-align: left; font-weight: 500;">
                            <i class="fas fa-trash"></i> Clear Old Inactive Members
                        </button>
                        <button onclick="viewSystemInfo()" style="padding: 12px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; text-align: left; font-weight: 500;">
                            <i class="fas fa-server"></i> View System Information
                        </button>
                    </div>
                </div>

                <div style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    <h4 style="margin-bottom: 16px; color: var(--dark-color);">
                        <i class="fas fa-chart-line" style="color: var(--primary-color);"></i> Platform Analytics
                    </h4>
                    <div id="analytics-info" style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                            <span style="color: var(--muted-color);">Active Members:</span>
                            <strong id="active-members">-</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                            <span style="color: var(--muted-color);">Upcoming Events:</span>
                            <strong id="upcoming-events">-</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                            <span style="color: var(--muted-color);">Recent Signups:</span>
                            <strong id="recent-signups">-</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (mainContent) {
        mainContent.innerHTML = dbSection;
    }

    // Load initial data
    loadTableData('members');
    loadStatistics();
}

// Load table data from API
async function loadTableData(table) {
    currentTable = table;
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    
    if (!tableHeader || !tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="100" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i></td></tr>';

    try {
        let endpoint = '';
        switch(table) {
            case 'members': endpoint = '/api/members'; break;
            case 'events': endpoint = '/api/events'; break;
            case 'partnerships': endpoint = '/api/partnerships'; break;
            case 'contact_messages': endpoint = '/api/contact'; break;
            default: endpoint = '/api/members';
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Failed to fetch data');

        const result = await response.json();
        dbData = result.data || [];

        updateTableHeaders(table);
        renderTable(dbData);
        updatePagination();
        
        // Update table title
        document.getElementById('table-title').textContent = formatTableName(table);
        document.getElementById('table-count').textContent = `(${dbData.length} records)`;
        document.getElementById('db-search-input').placeholder = `Search in ${formatTableName(table)}...`;

        // Update button states
        document.querySelectorAll('.table-btn').forEach(btn => {
            btn.style.background = '#f1f5f9';
            btn.style.color = 'var(--dark-color)';
        });
        event.target.style.background = 'var(--primary-color)';
        event.target.style.color = 'white';

    } catch (error) {
        console.error('Error loading table:', error);
        tableBody.innerHTML = `<tr><td colspan="100" style="text-align: center; padding: 40px; color: var(--danger-color);">Error loading data: ${error.message}</td></tr>`;
    }
}

// Update table headers based on data
function updateTableHeaders(table) {
    const tableHeader = document.getElementById('table-header');
    let headers = [];

    switch(table) {
        case 'members':
            headers = ['ID', 'Name', 'Email', 'College', 'Role', 'Status', 'Joined'];
            break;
        case 'events':
            headers = ['ID', 'Title', 'Date', 'Location', 'Status', 'Registrations'];
            break;
        case 'partnerships':
            headers = ['ID', 'Organization', 'Type', 'Contact', 'Status', 'Date'];
            break;
        case 'contact_messages':
            headers = ['ID', 'Name', 'Email', 'Subject', 'Status', 'Date'];
            break;
    }

    tableHeader.innerHTML = headers.map(h => `<th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: var(--dark-color);">${h}</th>`).join('');
}

// Render table rows
function renderTable(data) {
    const tableBody = document.getElementById('table-body');
    
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100" style="text-align: center; padding: 40px; color: var(--muted-color);">No data found</td></tr>';
        return;
    }

    tableBody.innerHTML = data.map(row => {
        const cells = Object.values(row).slice(0, 6);
        return `<tr style="border-bottom: 1px solid #e2e8f0; hover: {background: #f8fafc};">${cells.map((cell, i) => {
            let display = cell || '-';
            if (i === 1 && currentTable === 'members') display = `${row.first_name || ''} ${row.last_name || ''}`.trim();
            if (i === 4 && row.status) {
                const color = row.status === 'active' ? '#15803d' : row.status === 'pending' ? '#d97706' : '#dc2626';
                display = `<span style="padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: ${color}15; color: ${color};">${row.status}</span>`;
            }
            return `<td style="padding: 12px;">${display}</td>`;
        }).join('')}</tr>`;
    }).join('');
}

// Filter table data
function filterTable() {
    const searchInput = document.getElementById('db-search-input');
    const entriesSelect = document.getElementById('db-entries');
    const searchTerm = searchInput.value.toLowerCase();
    const maxEntries = entriesSelect.value === 'all' ? dbData.length : parseInt(entriesSelect.value);

    let filtered = dbData.filter(row => {
        return Object.values(row).some(val => 
            String(val).toLowerCase().includes(searchTerm)
        );
    });

    renderTable(filtered.slice(0, maxEntries));
    updatePagination(filtered.length);
}

// Update pagination
function updatePagination(total = null) {
    const count = total || dbData.length;
    document.getElementById('pagination-text').textContent = 
        `Showing ${Math.min(count, 10)} of ${count} entries`;
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE}/api/dashboard`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('stat-members').textContent = data.totalMembers || 0;
            document.getElementById('stat-events').textContent = data.totalEvents || 0;
            document.getElementById('active-members').textContent = data.activeMembers || 0;
            document.getElementById('upcoming-events').textContent = data.upcomingEvents || 0;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Export to CSV
function exportToCSV() {
    if (dbData.length === 0) {
        alert('No data to export!');
        return;
    }

    const headers = Object.keys(dbData[0]);
    const csvContent = [
        headers.join(','),
        ...dbData.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    downloadFile(csvContent, `${currentTable}_export_${Date.now()}.csv`, 'text/csv');
}

// Export to JSON
function exportToJSON() {
    if (dbData.length === 0) {
        alert('No data to export!');
        return;
    }

    const jsonContent = JSON.stringify(dbData, null, 2);
    downloadFile(jsonContent, `${currentTable}_export_${Date.now()}.json`, 'application/json');
}

// Download file helper
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Refresh data
function refreshData() {
    loadTableData(currentTable);
    loadStatistics();
}

// Format table name
function formatTableName(table) {
    return table.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Create backup
function createBackup() {
    exportToJSON();
    alert('Backup created! Please save the JSON file safely.');
}

// Clear old data
async function clearOldData() {
    if (!confirm('This will remove members who haven\'t logged in for 1 year. Continue?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/clear-inactive`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            alert('Old inactive members cleared!');
            refreshData();
        }
    } catch (error) {
        alert('Error clearing data: ' + error.message);
    }
}

// View system info
function viewSystemInfo() {
    alert('System Information:\n\nPlatform: TeTWIT v1.0\nDatabase: SQLite\nNode.js: ' + process.version + '\nServer Time: ' + new Date().toLocaleString());
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(loadDatabaseManagement, 500);
    });
} else {
    setTimeout(loadDatabaseManagement, 500);
}
