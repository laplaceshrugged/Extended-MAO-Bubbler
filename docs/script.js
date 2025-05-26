document.addEventListener('DOMContentLoaded', () => {
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.content section');

    // Function to update active link
    const updateActiveLink = () => {
        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100; // Adjust offset as needed
            if (window.scrollY >= sectionTop) {
                currentSectionId = section.getAttribute('id');
            }
        });

        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    };

    // Initial call and on scroll
    updateActiveLink();
    window.addEventListener('scroll', updateActiveLink);

    // Smooth scroll for sidebar links (if CSS scroll-behavior is not enough or for older browsers)
    sidebarLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            // If you want to prevent default anchor click and handle scrolling purely with JS:
            // e.preventDefault();
            // const targetElement = document.querySelector(targetId);
            // if (targetElement) {
            //     window.scrollTo({
            //         top: targetElement.offsetTop - 50, // Adjust offset if you have a fixed header
            //         behavior: 'smooth'
            //     });
            // }

            // For basic active class setting on click (simpler than scroll-based)
            sidebarLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const tableContainer = document.getElementById('tableContainer');
    const selectAllButton = document.getElementById('selectAllBtn');
    const deselectAllButton = document.getElementById('deselectAllBtn');

    const pdfFileInput = document.getElementById('pdfFile');
    const optionButtons = document.querySelectorAll('.button-group button');
    const submitBtn = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('message');
    const uploadForm = document.getElementById('uploadForm');

    const backendUrl = '/api/upload'; // Example: 'http://localhost:3000/upload'


    let currentTable = null; // To store reference to the generated table
    let headerCheckbox = null;
    let rowCheckboxes = [];

    csvFileInput.addEventListener('change', handleFileSelect);

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const csvContent = e.target.result;
                const parsedData = parseCSV(csvContent);
                if (parsedData.headers && parsedData.rows.length > 0) {
                    generateTable(parsedData.headers, parsedData.rows);
                    setupSelectionListeners(); // Setup listeners for the new table
                } else {
                    tableContainer.innerHTML = '<p>Could not parse CSV or CSV is empty.</p>';
                    currentTable = null;
                }
            };
            reader.onerror = () => {
                tableContainer.innerHTML = '<p>Error reading file.</p>';
                currentTable = null;
            };
            reader.readAsText(file);
        }
    }

    function parseCSV(csvString) {
        const lines = csvString.trim().split(/\r\n|\n/); // Handle Windows and Unix line endings
        if (lines.length === 0) return { headers: [], rows: [] };

        // Simple CSV parsing: split by comma.
        // For more complex CSVs (e.g., commas within quotes), a dedicated library is better.
        const headers = lines[0].split(',').map(header => header.trim());
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue; // Skip empty lines
            const values = lines[i].split(',').map(value => value.trim());
            // Ensure row has same number of columns as headers, pad if necessary
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = values[index] !== undefined ? values[index] : '';
            });
            rows.push(values); // Store as array of values for simpler table generation
        }
        return { headers, rows };
    }

    function generateTable(headers, dataRows) {
        tableContainer.innerHTML = ''; // Clear previous table or message

        const table = document.createElement('table');
        table.id = 'myDynamicTable'; // Give the table an ID
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create header row
        const headerRow = document.createElement('tr');
        const thCheckbox = document.createElement('th');
        headerCheckbox = document.createElement('input'); // Re-assign global headerCheckbox
        headerCheckbox.type = 'checkbox';
        headerCheckbox.id = 'headerCheckbox'; // Keep ID for styling/selection
        thCheckbox.appendChild(headerCheckbox);
        headerRow.appendChild(thCheckbox);

        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Create data rows
        rowCheckboxes = []; // Reset global rowCheckboxes array
        dataRows.forEach((rowDataArray) => {
            const tr = document.createElement('tr');
            const tdCheckbox = document.createElement('td');
            const rowCb = document.createElement('input');
            rowCb.type = 'checkbox';
            rowCb.classList.add('row-checkbox');
            tdCheckbox.appendChild(rowCb);
            tr.appendChild(tdCheckbox);
            rowCheckboxes.push(rowCb); // Add to our array

            rowDataArray.forEach(cellData => {
                const td = document.createElement('td');
                td.textContent = cellData;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        currentTable = table; // Store reference
    }

    function setupSelectionListeners() {
        if (!currentTable || !headerCheckbox || rowCheckboxes.length === 0) {
            console.warn("Table or checkboxes not found for setting up listeners.");
            return;
        }

        // Event listener for header checkbox
        headerCheckbox.addEventListener('change', () => {
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = headerCheckbox.checked;
                updateRowStyle(checkbox);
            });
            if (!headerCheckbox.checked) {
                headerCheckbox.indeterminate = false;
            }
        });

        // Event listeners for individual row checkboxes
        rowCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateRowStyle(checkbox);
                updateHeaderCheckboxState();
            });
            // Initial style update (e.g. if default checked state needs styling)
            updateRowStyle(checkbox);
        });

        // Initial state for header checkbox after table generation
        updateHeaderCheckboxState();
    }

    // --- Selection Logic Functions (reusable) ---
    function updateRowStyle(checkbox) {
        const row = checkbox.closest('tr');
        if (row) {
            if (checkbox.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        }
    }

    function updateHeaderCheckboxState() {
        if (!headerCheckbox || rowCheckboxes.length === 0) return;

        const totalRows = rowCheckboxes.length;
        const checkedRows = rowCheckboxes.filter(cb => cb.checked).length;

        if (checkedRows === totalRows) {
            headerCheckbox.checked = true;
            headerCheckbox.indeterminate = false;
        } else if (checkedRows > 0 && checkedRows < totalRows) {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = true;
        } else { // checkedRows === 0
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = false;
        }
    }

    // Event listener for "Select All" button
    if (selectAllButton) {
        selectAllButton.addEventListener('click', () => {
            if (!headerCheckbox || rowCheckboxes.length === 0) return;
            headerCheckbox.checked = true; // Trigger header checkbox change
            headerCheckbox.dispatchEvent(new Event('change')); // Programmatically trigger event
        });
    }

    // Event listener for "Deselect All" button
    if (deselectAllButton) {
        deselectAllButton.addEventListener('click', () => {
            if (!headerCheckbox || rowCheckboxes.length === 0) return;
            headerCheckbox.checked = false; // Trigger header checkbox change
            headerCheckbox.dispatchEvent(new Event('change')); // Programmatically trigger event
        });
    }
});