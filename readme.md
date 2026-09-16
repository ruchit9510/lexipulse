# LexiPulse — Personal Daily Vocabulary Learning App

A modern, focused daily English vocabulary learning web application that automatically synchronizes with your Google Drive Excel spreadsheet (`Words.xlsx`) populated by your Gemini automation.

---

## ✨ Features

- **Automatic Google Drive Synchronization**:
  - Automatically detects and reads the latest version of `Words.xlsx` from your Google Drive.
  - Zero manual daily downloading or uploading.
  - Change detection based on `modifiedTime` to avoid unnecessary downloads.
  - Persistent local caching for instant loading and offline capability.
- **5–10 Minute Daily Learning Flow**:
  - **Today's 5 Words**: Prominently highlights the 5 words for the current date (`Bottleneck`, `Tentative`, `Hassle`, `Streamline`, `Pragmatic`).
  - **One-Word-at-a-Time Active Recall**: Step through words with interactive reveal for Simple Meaning, Example Sentence, and How to Use It.
  - **Audio Pronunciation**: Listen to standard pronunciation with the speaker button.
  - **Custom Sentence Practice**: Write and save your own sentence for any word.
  - **Confidence Marking**: Mark *"I Know This"* or *"Need Practice"* to feed the spaced repetition algorithm.
- **Interactive Daily Quiz**:
  - 5-question daily challenge covering today's words.
  - 5 dynamic question formats: Meaning → Word, Word → Meaning, Fill in the Blank, Workplace Situation/Context, and Sentence Selection.
  - Instant answer feedback and final score breakdown.
- **Spaced Repetition Review (SM-2 SRS)**:
  - Science-backed review schedule (`1d → 3d → 7d → 14d → 30d`).
  - Automatically prioritizes difficult words.
  - Interactive flashcard review mode.
- **Streak & Progress Tracking**:
  - Daily learning streak tracker (`🔥`).
  - September 2026 interactive calendar matrix displaying completed days, words learned, and quiz scores.
  - Mastery breakdown: Mastered 🟢, Learning 🟡, Needs Practice 🔴.
- **Vocabulary Vault & Search**:
  - Search by word name or definition.
  - Filter by category: All, Mastered, Learning, Needs Practice, and Favorites ⭐.
  - Full word detail modal with personal notes and learning statistics.
- **Modern Aesthetics & Responsive Design**:
  - Obsidian dark mode and modern light mode with instant toggle.
  - Mobile-optimized layout with bottom navigation bar and desktop header.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
cd client && npm install && cd ..
```

### 2. Start Application
```bash
npm run dev
```
Or start the server directly:
```bash
node server/index.js
```
The app will be accessible in your browser at:
**[http://localhost:3000](http://localhost:3000)**

---

## ⚙️ Google Drive Setup

1. Open **Settings** (gear icon in the top right).
2. Your **Google OAuth Client ID** and **Client Secret** are already configured in `.env`.
3. Ensure your Google Cloud Console OAuth 2.0 Client has the following **Authorized Redirect URI**:
   ```
   http://localhost:3000/api/google/callback
   ```
4. Click **[ Connect Google Drive ]** to authorize read-only access.
5. Select your `Words.xlsx` spreadsheet from the picker.
6. LexiPulse will automatically sync every time new rows are added by your Gemini automation!
