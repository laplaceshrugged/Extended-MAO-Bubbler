document.addEventListener('DOMContentLoaded', () => {
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.content section');

    // Function to update active link based on scroll position
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

    // Initial call and on scroll for sidebar active link
    updateActiveLink();
    window.addEventListener('scroll', updateActiveLink);

    // Smooth scroll for sidebar links and active class on click
    sidebarLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            // Basic active class setting on click
            sidebarLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // --- CSV File Upload and Table Generation (Existing Logic) ---
    const csvFileInput = document.getElementById('csvFile'); // Assuming you might add this ID or rename if it's pdfFile for CSVs
    const tableContainer = document.getElementById('tableContainer');
    const selectAllButton = document.getElementById('selectAllBtn');
    const deselectAllButton = document.getElementById('deselectAllBtn');
    
    let currentTable = null;
    let headerCheckbox = null;
    let rowCheckboxes = [];

    if (csvFileInput) { // Check if the CSV file input exists
        csvFileInput.addEventListener('change', handleCsvFileSelect);
    }

    function handleCsvFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const csvContent = e.target.result;
                const parsedData = parseCSV(csvContent);
                if (parsedData.headers && parsedData.rows.length > 0) {
                    generateTable(parsedData.headers, parsedData.rows);
                    setupSelectionListeners();
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
        const lines = csvString.trim().split(/\r\n|\n/);
        if (lines.length === 0) return { headers: [], rows: [] };
        const headers = lines[0].split(',').map(header => header.trim());
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            const values = lines[i].split(',').map(value => value.trim());
            rows.push(values);
        }
        return { headers, rows };
    }

    function generateTable(headers, dataRows) {
        tableContainer.innerHTML = '';
        const table = document.createElement('table');
        table.id = 'myDynamicTable';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headerRow = document.createElement('tr');
        const thCheckbox = document.createElement('th');
        headerCheckbox = document.createElement('input');
        headerCheckbox.type = 'checkbox';
        headerCheckbox.id = 'headerCheckbox';
        thCheckbox.appendChild(headerCheckbox);
        headerRow.appendChild(thCheckbox);

        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        rowCheckboxes = [];
        dataRows.forEach((rowDataArray) => {
            const tr = document.createElement('tr');
            const tdCheckbox = document.createElement('td');
            const rowCb = document.createElement('input');
            rowCb.type = 'checkbox';
            rowCb.classList.add('row-checkbox');
            tdCheckbox.appendChild(rowCb);
            tr.appendChild(tdCheckbox);
            rowCheckboxes.push(rowCb);

            rowDataArray.forEach(cellData => {
                const td = document.createElement('td');
                // Make cells editable
                td.contentEditable = "true"; 
                td.textContent = cellData;
                // Optional: Add event listener to save changes, e.g., on 'blur'
                td.addEventListener('blur', (e) => {
                    console.log('Cell edited:', e.target.textContent, 'Row:', tr.rowIndex, 'Cell:', e.target.cellIndex);
                    // Here you might want to update your underlying data model or send changes to a backend
                });
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        currentTable = table;
    }

    function setupSelectionListeners() {
        if (!currentTable || !headerCheckbox || rowCheckboxes.length === 0) return;

        headerCheckbox.addEventListener('change', () => {
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = headerCheckbox.checked;
                updateRowStyle(checkbox);
            });
            headerCheckbox.indeterminate = false;
        });

        rowCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateRowStyle(checkbox);
                updateHeaderCheckboxState();
            });
            updateRowStyle(checkbox);
        });
        updateHeaderCheckboxState();
    }

    function updateRowStyle(checkbox) {
        const row = checkbox.closest('tr');
        if (row) {
            if (checkbox.checked) row.classList.add('selected');
            else row.classList.remove('selected');
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
        } else {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = false;
        }
    }

    if (selectAllButton) {
        selectAllButton.addEventListener('click', () => {
            if (!headerCheckbox) return;
            headerCheckbox.checked = true;
            headerCheckbox.dispatchEvent(new Event('change'));
        });
    }

    if (deselectAllButton) {
        deselectAllButton.addEventListener('click', () => {
            if (!headerCheckbox) return;
            headerCheckbox.checked = false;
            headerCheckbox.dispatchEvent(new Event('change'));
        });
    }

    // --- PDF Upload and Option Selection for Backend ---
    const pdfFileInput = document.getElementById('pdfFile'); // This is your PDF input
    const optionButtons = document.querySelectorAll('.button-group button');
    const createSheetBtn = document.getElementById('submitBtn'); // Renamed from submitBtn for clarity
    const messageDiv = document.getElementById('message'); // For displaying messages to the user

    let selectedOption = null; // To store the currently selected option (e.g., 'invitational')

    // Add event listeners to option buttons
    optionButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove 'active-option' class from all buttons
            optionButtons.forEach(btn => btn.classList.remove('active-option'));
            // Add 'active-option' class to the clicked button
            button.classList.add('active-option');
            // Store the selected option
            selectedOption = button.getAttribute('data-option');
            console.log('Option selected:', selectedOption); // For debugging
        });
    });

    // Event listener for the "Create Sheet" button
    if (createSheetBtn) {
        createSheetBtn.addEventListener('click', async () => {
            const pdfFile = pdfFileInput.files[0];

            // Validate that a PDF file is selected
            if (!pdfFile) {
                messageDiv.textContent = 'Please select a PDF file.';
                messageDiv.style.color = 'red';
                return;
            }

            // Validate that an option is chosen
            if (!selectedOption) {
                messageDiv.textContent = 'Please choose an option (Invitational, Regional, or State).';
                messageDiv.style.color = 'red';
                return;
            }

            // Create FormData to send the file and option
            const formData = new FormData();
            formData.append('pdfFile', pdfFile); // 'pdfFile' is the name the backend will expect
            formData.append('option', selectedOption); // 'option' is the name for the selected option

            messageDiv.textContent = 'Processing...';
            messageDiv.style.color = 'blue';

            const backendCreateSheetUrl = 'http://127.0.0.1:5000/api/create-sheet'; // Backend URL

            try {
                const response = await fetch(backendCreateSheetUrl, {
                    method: 'POST',
                    body: formData, // FormData is sent as multipart/form-data
                    // Headers are not typically needed for FormData with fetch, browser sets it
                });

                if (response.ok) {
                    const result = await response.json(); // Assuming backend sends JSON
                    messageDiv.textContent = `Success: ${result.message} (File: ${result.filename}, Option: ${result.option})`;
                    messageDiv.style.color = 'green';
                    
                    // --- NEW: If backend returns CSV data, display it ---
                    if (result.csv_data) {
                        const parsedData = parseCSV(result.csv_data);
                        if (parsedData.headers && parsedData.rows.length > 0) {
                            generateTable(parsedData.headers, parsedData.rows);
                            setupSelectionListeners(); // Setup listeners for the new table
                            messageDiv.textContent += ` CSV table generated.`;
                        } else {
                            tableContainer.innerHTML = '<p>Received CSV data, but could not parse or it was empty.</p>';
                        }
                    } else if (result.message && result.message.includes("received successfully")) {
                        // If no CSV data but success, don't clear table if one was already loaded by user
                        // tableContainer.innerHTML = '<p>PDF and option sent. Waiting for CSV generation step.</p>';
                    }


                } else {
                    const errorResult = await response.json();
                    messageDiv.textContent = `Error: ${errorResult.error || response.statusText}`;
                    messageDiv.style.color = 'red';
                }
            } catch (error) {
                console.error('Error sending data to backend:', error);
                messageDiv.textContent = 'Error sending data. Check console and if backend server is running.';
                messageDiv.style.color = 'red';
            }
        });
    }
});
