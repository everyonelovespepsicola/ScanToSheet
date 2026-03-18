# ScanToSheet

ScanToSheet is a responsive web application that allows users to seamlessly scan PDF417 barcodes (commonly found on US driver's licenses) using their device's camera, parse the AAMVA standard information, and automatically populate a data entry form. The collected entries are stored locally and can be easily exported as an Excel spreadsheet.

## Features
- **Barcode Scanning:** Uses the device's camera to scan PDF417 barcodes via the ZXing library.
- **Auto-Parsing:** Extracts Name, Address, City, State, and Zip from AAMVA standard encoded strings.
- **Local Storage:** Safely persists entries in your browser's local cache between sessions.
- **Export to Excel:** Downloads all collected entries as a formatted `.xlsx` file using SheetJS.
- **Responsive Design:** Works beautifully on mobile, tablet, and desktop screens with adaptive overlay layers.
- **Secure View:** Protects the viewing of collected entries behind a simple PIN code.

## Usage
1. Open `index.html` in a modern web browser.
2. Click **Launch Camera** and grant permissions to scan an ID, or enter data manually.
3. Click **OK** to save the entry to the local database.
4. Click **View Entries** to review all collected data and export it to `.xlsx`.

## License
This project is licensed under the GNU General Public License v2.0 - see the LICENSE file for details.