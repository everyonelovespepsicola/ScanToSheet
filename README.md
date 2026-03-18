# ScanToSheet

[![Try Me](https://img.shields.io/badge/Try%20Me-brightgreen?style=for-the-badge)](https://everyonelovespepsicola.github.io/ScanToSheet/)

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

## Mobile Device Compatibility & Troubleshooting
This application fully supports Android and iOS (Apple) phones and tablets. If you experience issues launching the camera, please keep these rules in mind:

- **HTTPS is Required:** Mobile browsers completely block camera access if the site is not loaded over a secure `https://` connection (like GitHub Pages).
- **In-App Browsers:** If you open the link directly from inside social media apps (like Facebook, Instagram, or LinkedIn), the camera will often be blocked. You must tap the app's menu and select **"Open in System Browser"** (Chrome or Safari).

### Apple (iPhone / iPad) Specifics
- **Use Safari:** Native Safari is the most reliable browser for camera access on iOS.
- **Downloads Location:** When you click "Save All to File", the exported `.xlsx` file will not pop up at the bottom of the screen like it does on a PC. Instead, Safari will ask to download the file, and it will be saved to your iCloud Drive or "On My iPhone" inside the native Apple **Files** app.

### Android Specifics
- **Use Chrome:** Google Chrome is the recommended browser for Android.
- **Ad-Blockers:** Strict ad-blockers or privacy-focused browsers (like Brave) might block necessary scripts depending on your settings.

## License
This project is licensed under the GNU General Public License v2.0 - see the LICENSE file for details.