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
let toggleViewBtn;
let formLayer;
let tableLayer;
let closeTableBtn;

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
    const startIndex = text.indexOf('ANSI ');
    const cleanedText = startIndex !== -1 ? text.substring(startIndex) : '';
    const lines = cleanedText.split('\n');

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
            alert("The barcode script failed to download from the internet. If you are using Brave Browser or an ad-blocker, please turn off your shields for this site.");
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
        
        codeReader.decodeFromVideoDevice(selectedDeviceId, 'scanner-video', (result, error) => {
            if (result) {
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
    toggleViewBtn = document.getElementById('toggle-view-btn');
    formLayer = document.getElementById('form-layer');
    tableLayer = document.getElementById('table-layer');
    closeTableBtn = document.getElementById('close-table-btn');
    
    // --- Scanner Element Assignments & Setup ---
    scanBtn = document.getElementById('scan-btn');
    scannerContainer = document.getElementById('scanner-container');
    scannerCancelBtn = document.getElementById('scanner-cancel-btn');
    
    try {
        if (typeof ZXing === 'undefined') {
            console.error("ZXing library is not defined. It failed to load from the CDN or failed to parse.");
        } else {
            // Some versions of ZXing package the PDF417 reader differently.
            // We will safely try the specific one, then fall back to the MultiFormat one.
            if (typeof ZXing.BrowserPDF417Reader === 'function') {
                codeReader = new ZXing.BrowserPDF417Reader();
            } else if (typeof ZXing.BrowserMultiFormatReader === 'function') {
                codeReader = new ZXing.BrowserMultiFormatReader();
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
        
        // Clear data after exporting
        database = [];
        saveDatabase(); // This will save an empty array to localStorage, clearing it
        updateTable(); // This will clear the table on screen
    });

    // Listener for the view toggle button
    toggleViewBtn.addEventListener('click', () => {
        const isTableActive = tableLayer.classList.contains('active');

        if (!isTableActive) {
            // Trying to view the table
            const password = prompt("Please enter the 4-digit password to view entries:");
            if (password === null) return;

            if (password === '1234') {
                tableLayer.classList.add('active');
                toggleViewBtn.textContent = 'Close Entries';
            } else {
                alert("Incorrect password.");
            }
        } else {
            // Trying to go back to the form
            tableLayer.classList.remove('active');
            toggleViewBtn.textContent = 'View Entries';
        }
    });

    // Listener for the new SVG close button on the table modal
    closeTableBtn.addEventListener('click', () => {
        tableLayer.classList.remove('active');
        toggleViewBtn.textContent = 'View Entries';
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