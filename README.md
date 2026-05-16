# Majlis Dashboard Analysis 2026

This is a production-ready dashboard for analyzing Majlis performance data from Google Sheets. It is built with a full-stack architecture (Express + React) to ensure data security and robust routing.

## Features

- **Real-time Data**: Fetches data directly from Google Sheets using a secure backend proxy.
- **Dynamic Analysis**: Top 10 Majlis analysis based on custom ratios.
- **Interactive Charts**: Visualizations using Recharts.
- **Responsive Design**: Built with Tailwind CSS for all devices.
- **GitHub Ready**: All sensitive IDs are handled via environment variables.

## Deployment & Setup

### 1. Google Sheets Configuration
- Ensure your Google Sheet is **Published to the web** (File > Share > Publish to web).
- Ensure "Anyone with the link can view" is also active.
- Each month should have its own tab (e.g., `Jan26`, `Feb26`).
- Data should start from row 2 (row 1 is for headers).

### 2. Environment Variables
You must set the following environment variables in your hosting provider (e.g., AI Studio Secrets, GitHub Secrets, Vercel, Cloud Run):

- `GOOGLE_SHEET_ID`: The ID of your Google Spreadsheet (e.g., `1z-7FiFuqhJeA2ClrdOyNW-CoW7m5DYe8freXYO9RSes`).
- `ZAIM_SHEET_ID`: The ID of your Zaim Spreadsheet (if different).

### 3. Exporting to GitHub
To export this project to your own GitHub repository:
1. Click the **Settings** (⚙️ gear icon) in the top-right corner of AI Studio.
2. Select **Export to GitHub**.
3. Follow the prompts to connect your GitHub account and create a new repository.

## Development

To run locally:
1. Clone the repository.
2. Create a `.env` file based on `.env.example`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

The server will run on port 3000, serving the React frontend and proxying API requests to the Google Sheets API.
