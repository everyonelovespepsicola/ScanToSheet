// Wrap the entire application in an IIFE to prevent global namespace pollution
(() => {
// This array will act as our in-memory database to store all entries
let database = [];
const headers = ['Name', 'Address', 'City', 'State', 'Zip'];
const STORAGE_KEY = 'personalInfoDatabase';

// We'll assign these inside the DOMContentLoaded event
let tableBody;
let infoForm;
let exportBtn;
let clearBtn;
// let debugBtn;
let toggleViewBtn;
let formLayer;
let tableLayer;

// Custom Modal Variables
let passwordModal;
let passwordInput;
let passwordError;
let passwordModalTitle;
let passwordSubmitBtn;
let passwordCancelBtn;
let currentPasswordCallback = null;

// Help Modal Variables
let helpBtn;
let helpModal;
let helpCloseBtn;

// Global error catcher to help debug mobile issues
window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('zxing')) {
        alert("ZXing Script Error: " + event.message);
    } else if (event.message && event.message.includes('SyntaxError')) {
        alert("Syntax Error: Your browser might be too old to run this script. " + event.message);
    }
});

// --- Scanner Variables ---
let scanBtn;
let scannerContainer;
let scannerCancelBtn;
let codeReader;

/**
 * Saves the current state of the database to localStorage.
 */
function saveDatabase() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

/**
 * Loads the database from localStorage.
 */
function loadDatabase() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        database = JSON.parse(savedData);
    }
}

/**
 * Parses the raw string from a PDF417 barcode (AAMVA standard).
 * @param {string} text The raw string from the barcode.
 * @returns {object} An object with parsed address information.
 */
function parseAAMVA(text) {
    if (!text) {
        return {};
    }
    const fields = {};
    // The raw data often starts with non-printable characters, so we look for the AAMVA header.
    const startIndex = text.indexOf('ANSI');
    const cleanedText = startIndex !== -1 ? text.substring(startIndex) : '';
    const lines = cleanedText.split(/\r?\n|\r/);

    // AAMVA field codes for common fields
    const fieldMap = {
        'DCS': 'lastName',
        'DCT': 'firstName',
        'DAC': 'firstName', // Some licenses use DAC for first name
        'DAG': 'address',
        'DAI': 'city',
        'DAJ': 'state',
        'DAK': 'zip'
    };

    lines.forEach(line => {
        const code = line.substring(0, 3);
        const value = line.substring(3).trim();
        if (fieldMap[code]) {
            fields[fieldMap[code]] = value;
        }
    });

    // Handle zip code which might have extra digits (e.g., 12345-6789)
    if (fields.zip) {
        fields.zip = fields.zip.substring(0, 5);
    }

    return fields;
}

/**
 * Starts the camera and begins scanning for PDF417 barcodes.
 */
function startScanner() {
    if (!window.isSecureContext) {
        alert("Camera access requires a secure connection (HTTPS). If testing locally, use localhost or a secure tunnel.");
        return;
    }
    if (!codeReader) {
        if (typeof ZXing === 'undefined') {
            alert("The barcode script failed to load. This usually means your mobile browser is too old and rejected the script (SyntaxError), or it was blocked.");
        } else {
            alert("The barcode scanner failed to initialize properly. This browser might not support the required camera APIs.");
        }
        return;
    }
    scannerContainer.classList.add('active');
    
    // Get available cameras and prefer the back-facing one
    codeReader.getVideoInputDevices().then((videoInputDevices) => {
        let selectedDeviceId = undefined;
        if (videoInputDevices.length > 0) {
            selectedDeviceId = videoInputDevices[0].deviceId; // default to first
            // Look for rear camera
            const backCamera = videoInputDevices.find(device => 
                device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('environment')
            );
            if (backCamera) {
                selectedDeviceId = backCamera.deviceId;
            }
        }
        
        // Force high resolution. PDF417 barcodes are too dense for standard 480p web feeds.
        const constraints = {
            video: {
                deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        codeReader.decodeFromConstraints(constraints, 'scanner-video', (result, error) => {
            if (result) {
                console.log("Raw Scanned Data:", result.getText());
                codeReader.reset(); // Stop scanning immediately after a success
                scannerContainer.classList.remove('active');
                const parsedData = parseAAMVA(result.getText());

                // If we successfully parsed an address, populate the form
                if (parsedData.address && parsedData.city) {
                    document.getElementById('name').value = `${parsedData.firstName || ''} ${parsedData.lastName || ''}`.trim();
                    document.getElementById('address').value = parsedData.address || '';
                    document.getElementById('city').value = parsedData.city || '';
                    document.getElementById('state').value = parsedData.state || '';
                    document.getElementById('zip').value = parsedData.zip || '';
                } else {
                    alert("Barcode found, but could not extract valid address information.");
                }
            }
        }).catch(err => {
            console.error("Camera permission error:", err);
            codeReader.reset();
            scannerContainer.classList.remove('active');
            alert("Camera access is required for scanning. Please grant permission and ensure you are on a secure (https) connection.");
        });
    }).catch(err => {
        console.error("Error enumerating devices:", err);
    });
}
/**
 * Renders all entries from the database into the HTML table.
 */
function updateTable() {
    // Clear existing rows to prevent duplicates
    tableBody.innerHTML = '';

    // Add a new row for each entry in the database
    database.forEach(entry => {
        const row = document.createElement('tr');
        // Use template literals to build the row's HTML
        row.innerHTML = `
            <td>${entry.name}</td>
            <td>${entry.address}</td>
            <td>${entry.city}</td>
            <td>${entry.state}</td>
            <td>${entry.zip}</td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * Generates an .xlsx file from all entries in the database and triggers a download.
 */
function exportToExcel() {
    // Convert our array of objects to an array of arrays, starting with the header row
    const dataForSheet = [
        headers,
        ...database.map(entry => [
            entry.name,
            entry.address,
            entry.city,
            entry.state,
            entry.zip
        ])
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataForSheet);
    XLSX.utils.book_append_sheet(wb, ws, 'PersonalInfo');
    XLSX.writeFile(wb, 'database.xlsx');
}

document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements
    infoForm = document.getElementById('info-form');
    tableBody = document.getElementById('data-table-body');
    exportBtn = document.getElementById('export-btn');
    // debugBtn = document.getElementById('debug-btn');
    clearBtn = document.getElementById('clear-btn');
    toggleViewBtn = document.getElementById('toggle-view-btn');
    formLayer = document.getElementById('form-layer');
    tableLayer = document.getElementById('table-layer');
    
    // --- Scanner Element Assignments & Setup ---
    scanBtn = document.getElementById('scan-btn');
    scannerContainer = document.getElementById('scanner-container');
    scannerCancelBtn = document.getElementById('scanner-cancel-btn');
    
    // --- Password Modal Assignments & Setup ---
    passwordModal = document.getElementById('password-modal');
    passwordInput = document.getElementById('password-input');
    passwordError = document.getElementById('password-error');
    passwordModalTitle = document.getElementById('password-modal-title');
    passwordSubmitBtn = document.getElementById('password-submit-btn');
    passwordCancelBtn = document.getElementById('password-cancel-btn');
    
    helpBtn = document.getElementById('help-btn');
    helpModal = document.getElementById('help-modal');
    helpCloseBtn = document.getElementById('help-close-btn');

    function openPasswordModal(title, callback) {
        passwordModalTitle.textContent = title;
        passwordInput.value = '';
        passwordError.style.display = 'none';
        passwordModal.classList.add('active');
        passwordInput.focus();
        currentPasswordCallback = callback;
    }

    function closePasswordModal() {
        passwordModal.classList.remove('active');
        currentPasswordCallback = null;
    }

    passwordSubmitBtn.addEventListener('click', () => {
        if (passwordInput.value === '1234') {
            if (currentPasswordCallback) {
                currentPasswordCallback('unlock');
            }
        } else {
            if (passwordInput.value === '') {
                // If nothing is typed, hide the error but don't morph the placeholder
                passwordError.style.display = 'none';
            } else {
                if (currentPasswordCallback) {
                    currentPasswordCallback('fail');
                }
            }
        }
    });

    passwordCancelBtn.addEventListener('click', () => {
        closePasswordModal();
    });

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            passwordSubmitBtn.click();
        }
    });

    // --- Help Modal Logic ---
    helpBtn.addEventListener('click', () => {
        helpModal.classList.add('active');
    });

    helpCloseBtn.addEventListener('click', () => {
        helpModal.classList.remove('active');
        localStorage.setItem('hasSeenHelp', 'true');
    });

    // Show help modal automatically on the very first visit
    if (!localStorage.getItem('hasSeenHelp')) {
        helpModal.classList.add('active');
    }

    try {
        if (typeof ZXing === 'undefined') {
            console.error("ZXing library is not defined. It failed to load from the CDN or failed to parse.");
        } else {
            // Some versions of ZXing package the PDF417 reader differently.
            // We will safely try the specific one, then fall back to the MultiFormat one.
            if (typeof ZXing.BrowserPDF417Reader === 'function') {
                // Pass 100ms to decrease the delay between scans (makes it much faster than default 500ms)
                codeReader = new ZXing.BrowserPDF417Reader(100);
            } else if (typeof ZXing.BrowserMultiFormatReader === 'function') {
                codeReader = new ZXing.BrowserMultiFormatReader(null, 100);
            } else {
                console.error("ZXing loaded, but no valid barcode reader was found.");
            }
        }
    } catch (err) {
        console.error("Failed to initialize barcode scanner. Camera API might be blocked by the browser.", err);
    }

    // Load existing data from localStorage and render the table
    loadDatabase();
    updateTable();

    // --- EVENT LISTENERS ---

    // Listener for adding a new entry
    infoForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const newEntry = {
            name: document.getElementById('name').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            zip: document.getElementById('zip').value,
        };

        database.push(newEntry);
        saveDatabase(); // Save to localStorage
        updateTable(); // Update the on-screen table
        infoForm.reset();
    });

    // Listener for the export button
    exportBtn.addEventListener('click', () => {
        if (database.length === 0) {
            alert("There is no data to save.");
            return;
        }

        exportToExcel();
    });

    // Listener for the clear button
    clearBtn.addEventListener('click', () => {
        if (database.length === 0) {
            alert("There is no data to clear.");
            return;
        }
        if (confirm("WARNING: This will permanently delete all stored entries. Are you sure you want to proceed?")) {
            openPasswordModal("Enter PIN to clear data:", (password) => {
                if (password === 'unlock') {
                    database = [];
                    saveDatabase();
                    updateTable();
                    closePasswordModal();
                    alert("All entries have been cleared.");
                } else {
                    passwordError.textContent = "Incorrect password.";
                    passwordError.style.display = 'block';
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            });
        }
    });

    // Listener for the debug button to auto-fill and submit repeatedly
    /*
    let isDebugging = false;
    debugBtn.addEventListener('click', async () => {
        isDebugging = !isDebugging;
        if (isDebugging) {
            debugBtn.textContent = 'Stop Debug';
            debugBtn.style.backgroundColor = '#38a169'; // Green while running
            let counter = 1;
            
            // Helper functions to create delays and simulate typing
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const typeText = async (id, text) => {
                const el = document.getElementById(id);
                el.value = '';
                for (const char of text) {
                    if (!isDebugging) return; // Exit instantly if stopped
                    el.value += char;
                    await sleep(50); // 50ms delay per keystroke
                }
            };
            
            // Run the typing sequence in an async loop
            while (isDebugging) {
                await typeText('name', `Test User ${counter}`);
                if (!isDebugging) break;
                await typeText('address', `${1000 + counter} Debug Lane`);
                if (!isDebugging) break;
                await typeText('city', 'Test City');
                if (!isDebugging) break;
                await typeText('state', 'TS');
                if (!isDebugging) break;
                await typeText('zip', `12345`);
                if (!isDebugging) break;
                
                // Pause a moment so we can see the completed form
                await sleep(500);
                if (!isDebugging) break;

                document.querySelector('.submit-btn').click();
                counter++;
                
                // Pause before starting the next entry
                await sleep(500); 
            }
        } else {
            debugBtn.textContent = 'Debug';
            debugBtn.style.backgroundColor = ''; // Reset to CSS default
        }
    });
    */

    // Listener for the view toggle button
    toggleViewBtn.addEventListener('click', () => {
        const isTableActive = tableLayer.classList.contains('active');

        if (!isTableActive) {
            // Trying to view the table
            openPasswordModal("Enter PIN to view entries:", (password) => {
                if (password === 'unlock') {
                    closePasswordModal();
                    tableLayer.classList.add('active');
                    toggleViewBtn.textContent = 'Close Entries';
                    toggleViewBtn.classList.add('close-mode');
                } else {
                    passwordError.textContent = "Incorrect password.";
                    passwordError.style.display = 'block';
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            });
        } else {
            // Trying to go back to the form
            tableLayer.classList.remove('active');
            toggleViewBtn.textContent = 'View Entries';
            toggleViewBtn.classList.remove('close-mode');
        }
    });

    // --- Scanner Event Listeners ---
    scanBtn.addEventListener('click', () => {
        startScanner();
    });

    scannerCancelBtn.addEventListener('click', () => {
        if (codeReader) {
            codeReader.reset(); // Stops the scanning process
        }
        scannerContainer.classList.remove('active');
    });
});
})();