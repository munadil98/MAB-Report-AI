import express from "express";
import path from "path";
import fs from "fs";
import "dotenv/config";

const app = express();
app.use(express.json());

// Helper to fetch data from Google Sheets (Public)
async function fetchGoogleSheetsData(range: string, overrideSheetId?: string) {
  const sheetId = overrideSheetId || process.env.GOOGLE_SHEET_ID;

  if (!sheetId) {
    throw new Error("Missing GOOGLE_SHEET_ID in environment variables.");
  }

  // Handle range like "Sheet1!A1:B10" or just "Sheet1"
  let sheetName = "";
  let rangeSelection = "";
  
  if (range.includes("!")) {
    [sheetName, rangeSelection] = range.split("!");
  } else {
    sheetName = range;
  }

  // Clean sheetName (remove quotes if present)
  sheetName = sheetName.replace(/^'|'$/g, "");

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : ""}${rangeSelection ? `&range=${encodeURIComponent(rangeSelection)}` : ""}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Sheets Error] HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      throw new Error(`Google Sheets returned HTTP ${response.status}. Ensure the sheet is Public and Published to the web.`);
    }
    
    const text = await response.text();
    
    // The gviz/tq endpoint returns a JSONP-like string: /* google.visualization.Query.setResponse({...}); */
    // We need to extract the JSON part between the first ( and the last )
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!jsonMatch) {
      if (text.includes("Service Unavailable")) {
        throw new Error("Google Sheets API is temporarily unavailable.");
      }
      if (text.includes("html") || text.includes("<!DOCTYPE html>")) {
        throw new Error("Received HTML instead of JSON. Ensure the sheet ID is correct and the sheet is 'Published to the web' (File > Share > Publish to web).");
      }
      throw new Error("Failed to parse Google Sheets response. Ensure the sheet is published to the web.");
    }
    
    const data = JSON.parse(jsonMatch[1]);
    
    if (data.status === "error") {
      throw new Error(data.errors?.[0]?.detailed_message || data.errors?.[0]?.message || "Google Sheets returned an error");
    }
    
    // Transform gviz format to array of arrays
    // rows: [{ c: [{ v: "val" }, { v: 123 }] }]
    return data.table.rows.map((row: any) => 
      row.c.map((cell: any) => cell ? cell.v : null)
    );
  } catch (err: any) {
    console.error("[Sheets Error]", err.message);
    throw err;
  }
}

// --- API ROUTES ---

app.get("/api/sheets", async (req, res) => {
  const zaimId = process.env.ZAIM_SHEET_ID;
  const mainId = process.env.GOOGLE_SHEET_ID;
  const sheetId = req.query.type === 'zaim' ? zaimId : mainId;

  if (!sheetId) {
    return res.status(500).json({ error: "Missing Sheet ID" });
  }

  // Without API key, we can't easily list all sheets via Google API.
  // We return the provided ID and a message.
  res.json({
    id: sheetId,
    type: req.query.type || 'main',
    message: "Listing all sheets requires an API Key. Public fetching only works with known sheet names.",
    sheets: []
  });
});

app.get("/api/health", (req, res) => {
  const sheetId = process.env.GOOGLE_SHEET_ID || "";
  const zaimId = process.env.ZAIM_SHEET_ID || "";
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    mainSheetId: sheetId ? `${sheetId.substring(0, 5)}...` : "not set",
    zaimSheetId: zaimId ? `${zaimId.substring(0, 5)}...` : "not set",
    hasCoBuddyKey: !!process.env.COBUDDY_AI_API_KEY
  });
});

app.post("/api/chat", async (req, res) => {
  const { message, context, month } = req.body;
  const apiKey = process.env.COBUDDY_AI_API_KEY || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "COBUDDY_AI_API_KEY or OPENROUTER_API_KEY not set in secrets." });
  }

  try {
    // Calling OpenRouter API
    const url = "https://openrouter.ai/api/v1/chat/completions";
    
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-Title": "Majlis Performance Dashboard"
      },
      body: JSON.stringify({
        model: "baidu/cobuddy:free", // As requested by user
        messages: [
          {
            role: "system",
            content: `You are Report AI (formerly CoBuddy AI), a highly advanced analyst for the Majlis Performance Dashboard.
            You have "global" access to the dashboard's data across different months.

            CORE RESPONSIBILITIES:
            1. Knowledge Base: You understand Majlis performance metrics like Amela Meetings, General Meetings, Tajnid (membership), Tabligh (outreach), and Prayers.
            2. Language: You MUST communicate ONLY in Bengali (বাংলা). Your Bengali should be professional, respectful, and natural.
            3. Context Utilization: 
               - "globalSummary": Provides a high-level overview of performance across all months currently loaded in the dashboard.
               - "selectedMonthDetails": Provides deeper metrics for the currently active/selected month (Top 30 records).
            4. Comparative Analysis: If the user asks about trends, look at the "globalSummary" for different months.
            5. Encouragement: Always be encouraging to the Majalis. If a Majlis is struggling, suggest improvements kindly.
            6. Accuracy: If you don't have data for a specific Majlis or metric in the context, clearly state that you don't have that information.

            MONTH IN FOCUS: ${month}
            AVAILABLE MONTHS IN CONTEXT: $\{JSON.stringify(context.availableMonths)\}
            TONE: Helpful, Analytical, Islamic (Assalamu Alaikum), Strategic.`
          },
          {
            role: "user",
            content: `Reporting Data Context: ${JSON.stringify(context)}\n\nUser Message: ${message}`
          }
        ],
        reasoning: { enabled: true }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || `OpenRouter returned error ${response.status}`);
    }

    const assistantMessage = data.choices?.[0]?.message;
    const reply = assistantMessage?.content || "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।";
    const reasoning = assistantMessage?.reasoning_details || null;

    res.json({ reply, reasoning });
  } catch (err: any) {
    console.error("[Chat Error]", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/data", async (req, res) => {
  const month = req.query.month as string || 'Jan26';
  console.log(`[API] Requesting data for: ${month}`);
  
  try {
    const range = `${month}!A2:AK1000`;
    const values = await fetchGoogleSheetsData(range);
    res.json(values);
  } catch (error: any) {
    const errorMsg = error.message || "";
    if (
      errorMsg.includes("Unable to parse range") || 
      errorMsg.includes("is not found") || 
      errorMsg.includes("Requested entity was not found") ||
      errorMsg.includes("404")
    ) {
      console.warn(`[API] Sheet or data for ${month} not found. Returning empty data. Error: ${errorMsg}`);
      return res.json([]);
    }
    res.status(500).json({ 
      error: "Failed to fetch data", 
      details: errorMsg
    });
  }
});

app.get("/api/zaim", async (req, res) => {
  const zaimSheetId = process.env.ZAIM_SHEET_ID || process.env.GOOGLE_SHEET_ID;
  console.log(`[API] Requesting zaim data from: ${zaimSheetId}`);
  
  try {
    const range = `'Zaim'!A2:I1000`;
    const values = await fetchGoogleSheetsData(range, zaimSheetId);
    res.json(values);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to fetch zaim data", 
      details: `${error.message} (ID: ${zaimSheetId ? zaimSheetId.substring(0, 5) + '...' : 'none'})` 
    });
  }
});

app.get("/api/majlis-names", async (req, res) => {
  console.log(`[API] Requesting majlis names data`);
  
  try {
    const range = `'Majlis-Names'!A2:J1000`;
    const values = await fetchGoogleSheetsData(range);
    res.json(values);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to fetch majlis names data", 
      details: error.message 
    });
  }
});

// --- SERVER LOGIC ---

async function startServer() {
  const isVercel = !!process.env.VERCEL;
  const isProd = process.env.NODE_ENV === "production" || isVercel;

  if (!isProd) {
    // Only load Vite in local development
    console.log("Starting in DEVELOPMENT mode...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Production mode: Serve static files
    console.log("Starting in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Frontend build not found. Please run 'npm run build'.");
      }
    });
  }

  // Only start the listener if NOT on Vercel
  if (!isVercel) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  }
}

// Global error handler to prevent "A server error occurred" HTML
app.use((err: any, req: any, res: any, next: any) => {
  console.error("[Global Error]", err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message 
  });
});

startServer().catch(err => {
  console.error("Failed to start server:", err);
});

export default app;
