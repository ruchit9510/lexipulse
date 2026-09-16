# Build a Personal Daily Vocabulary Learning App

## 1. Project Goal

Build a personal vocabulary-learning web application that reads my existing vocabulary Excel spreadsheet from Google Drive and turns the spreadsheet data into an engaging daily learning experience.

I already have an automatic Gemini flow that adds **5 new English vocabulary words every day** to the same Excel file stored in my Google Drive.

The application must use that Excel file as the primary vocabulary data source.

### Existing workflow

Gemini automation:

```
Gemini automatic flow
        ↓
Adds 5 vocabulary words daily
        ↓
Existing Excel file in Google Drive
        ↓
This application reads the latest data
        ↓
Daily vocabulary learning experience
```

### Critical requirement

I must NOT have to:

* Download the Excel file every day
* Upload the Excel file every day
* Manually enter new words
* Copy/paste new words into the application
* Reconfigure the application when new rows are added

The application should connect to the Google Drive Excel file once and automatically use the latest version of that file.

---

# 2. First Inspect the Existing Excel File

An example of the actual Excel structure is available as:

`/mnt/data/Words.xlsx`

Use this file to understand the current spreadsheet structure and data.

Do not assume the columns are different from the actual file.

The spreadsheet currently contains vocabulary information such as:

* Date
* Word
* Simple Meaning
* Example Sentence
* How to Use It

Before implementing the data layer, inspect the uploaded Excel file and understand:

1. Exact sheet names
2. Exact column names
3. Data types
4. Date format
5. Whether there are blank rows
6. Whether duplicate words exist
7. How the daily 5 words are represented
8. Whether there are any additional columns

The application should be designed around the actual structure of the spreadsheet.

---

# 3. Google Drive Integration

The primary production data source must be the Excel file stored in Google Drive.

## Authentication

Implement Google authentication/OAuth so I can connect my Google account.

The application should request only the permissions necessary to access the vocabulary spreadsheet.

After the initial authorization:

* Remember the connected Google account
* Remember the selected vocabulary file
* Do not ask me to reconnect every time
* Do not require manual file upload
* Allow me to disconnect/reconnect the Google account from settings

## File selection

After connecting Google Drive, provide a simple setup screen:

```
Connect Google Drive

↓

Select Vocabulary Excel File

↓

Confirm

↓

Application connected
```

The user should be able to select the existing `Words.xlsx` file from Google Drive.

Do not hardcode the file ID.

Store the selected Drive file ID/configuration securely.

---

# 4. Automatic Data Synchronization

The application must always work with the latest version of the Excel file.

When the Excel file is updated by my Gemini automation, the application should be able to detect/read the latest data.

Implement a sensible synchronization mechanism.

Possible behavior:

* Check for updated file metadata when the app opens
* Refresh data when the user manually presses Refresh
* Avoid unnecessarily downloading/parsing the same file repeatedly
* Cache previously processed data where appropriate
* Detect when the Drive file has changed
* Re-import only when necessary

The user experience should feel automatic.

For example:

Yesterday:

```
Excel:
10 words
```

Today Gemini adds 5 words:

```
Excel:
15 words
```

When I open the app:

```
App automatically detects the updated Excel
↓
Finds today's 5 new words
↓
Shows them in Today's Learning
```

No manual action should be required.

---

# 5. Important Data Architecture

Do NOT modify the original Excel file.

The Excel file should be treated as the source of truth for vocabulary content.

The application may maintain its own local/database data for learning progress.

Separate:

### Vocabulary data

Comes from Google Drive Excel:

* Word
* Meaning
* Example
* How to use
* Date

### Learning data

Stored by the application:

* Word ID
* Learned/not learned
* Correct quiz answers
* Wrong quiz answers
* Review count
* Last reviewed date
* Next review date
* Difficulty
* User-created sentence
* Session history
* Favorite status
* Notes if required

This means the Excel file remains untouched while the application remembers my learning progress.

---

# 6. Automatically Identify Today's Words

The application should identify the vocabulary words associated with the current date.

Normally, Gemini adds exactly 5 words each day.

Today's screen should therefore normally show:

```
Today's 5 Words
```

If today's data contains:

* 5 words → normal experience
* fewer than 5 words → show available words and explain that today's set is incomplete
* more than 5 words → show all words for that date, but clearly indicate the count

Do not assume that exactly 5 records always exist.

Use the actual date stored in the spreadsheet.

Handle date/time carefully so that words don't appear under the wrong day because of timezone conversion.

The application should use my local timezone appropriately.

---

# 7. Main User Experience

The application should NOT look like an Excel viewer.

The entire purpose is to make vocabulary learning interesting enough that I actually want to open the application every day.

The design should feel like a modern personal learning product.

Think:

* Clean
* Modern
* Minimal
* Interactive
* Slightly gamified
* Focused
* Pleasant
* Not childish
* Not overly colorful
* No unnecessary animations

Avoid making it look like an enterprise dashboard.

---

# 8. Home / Daily Dashboard

The home page should immediately answer:

### "What should I learn today?"

Example structure:

```
Good evening 👋

Tuesday, September 15

─────────────────────────

🔥 8 Day Streak

Today's Vocabulary

5 New Words

[ Start Learning ]

─────────────────────────

Your Progress

87 Words Learned
68% Mastery

─────────────────────────

Review Due

3 words need review
```

The primary CTA should be:

```
Start Today's Learning
```

Do not overwhelm the user with statistics.

The daily learning session should be the primary focus.

---

# 9. Daily Learning Session

Create a focused learning experience.

Show one word at a time.

Example:

```
01 / 05

┌─────────────────────────────┐

         STRAIGHTFORWARD

   Easy to understand
   or simple.

   Example:

   "The process was
   straightforward."

└─────────────────────────────┘

How to use it:

"The instructions were
straightforward."

[ I KNOW THIS ]

[ NEED PRACTICE ]

[ NEXT → ]
```

The user should be able to move between words.

---

# 10. Word Card

Each word should display:

### Word

Large, visually prominent.

### Simple meaning

Use the spreadsheet's Simple Meaning.

### Example sentence

Use the spreadsheet's Example Sentence.

### How to use it

Use the spreadsheet's How to Use It.

Do not rewrite or unnecessarily alter the spreadsheet content.

The app is a learning interface, not a content-generation system.

---

# 11. Optional Word Reveal Interaction

Consider making the initial experience interactive.

For example:

```
STRAIGHTFORWARD

Do you know this word?

[ Show Meaning ]
```

After clicking:

```
Meaning:
Easy to understand or simple.
```

This gives the user an opportunity to recall the meaning before seeing it.

Make this behavior configurable if appropriate.

---

# 12. User Sentence Practice

After learning a word, optionally ask:

```
✍️ Your turn

Write a sentence using:

STRAIGHTFORWARD

[________________________]

[ Check / Save Sentence ]
```

The purpose is to encourage active usage.

Do NOT require this for every word if it makes the daily session too long.

It should be quick and optional.

Save the user's sentence in the application's learning database.

---

# 13. Daily Quiz

After completing today's words, start a short quiz.

The quiz should test the words learned today.

Example:

```
QUICK CHALLENGE

1 / 5

My manager gave me very
______ instructions.

○ reluctant
○ straightforward
○ hectic
○ convenient

[ Submit ]
```

After answering:

```
✓ Correct!
```

or

```
✗ Not quite.
```

Then show the correct answer and a short explanation.

---

# 14. Quiz Types

Use multiple quiz formats rather than always using multiple choice.

Possible question types:

### Meaning → Word

"Easy to understand or simple."

Which word is this?

### Word → Meaning

What does "reluctant" mean?

### Fill in the blank

He was ______ to speak.

### Example selection

Which sentence uses the word correctly?

### Situation-based question

You want to describe a very busy day at work.

Which word fits best?

Use simple everyday English.

Avoid difficult grammar terminology.

---

# 15. Quiz Scoring

At the end:

```
🎉 Daily Challenge Complete

4 / 5

80%

Today's words:
✓ 4 strong
⚠ 1 needs practice

[ Review Difficult Words ]

[ Finish ]
```

Store the result in learning history.

---

# 16. Spaced Review System

This is one of the most important features.

The application should not only show new words.

It should also help me remember older words.

Maintain a review system based on my performance.

A simple adaptive schedule can be used.

For example:

```
First exposure
    ↓
Review after 1 day
    ↓
Review after 3 days
    ↓
Review after 7 days
    ↓
Review after 14 days
    ↓
Review after 30 days
```

If I repeatedly get a word wrong:

```
Increase review frequency
```

If I repeatedly answer correctly:

```
Increase the interval
```

Do not make the algorithm unnecessarily complicated.

The goal is practical vocabulary retention.

---

# 17. Review Page

Create a dedicated:

```
🔄 Review
```

page.

Example:

```
Words Due for Review

7 words

┌─────────────────────────┐
│ RELUCTANT               │
│ 3 reviews • Needs work  │
└─────────────────────────┘

┌─────────────────────────┐
│ SPONTANEOUS             │
│ 5 reviews • Strong      │
└─────────────────────────┘

[ Start Review ]
```

Prioritize difficult words.

---

# 18. Difficulty System

Every word should have a learning status.

For example:

🟢 Mastered
🟡 Learning
🔴 Needs Practice

Do not determine mastery only from whether the user clicked "I know this."

Use quiz performance and review history where possible.

Example:

```
Word: Reluctant

Status: 🟡 Learning

Correct: 3
Incorrect: 2
Reviews: 4
```

---

# 19. Streak System

Add a simple daily streak.

Example:

```
🔥 8 Day Streak
```

A day counts as completed when the user completes the daily learning session or daily quiz.

Do not make the streak dependent on opening the app only.

If the user misses a day:

* Do not destroy all historical progress
* Clearly show the streak reset
* Continue tracking total learning days

Avoid manipulative gamification.

---

# 20. Progress Dashboard

Create a clean progress page.

Show useful metrics such as:

```
Vocabulary Progress

150 Total Words

87 Learned

42 Practicing

21 Needs Review

─────────────────────

Current Streak
🔥 8 days

─────────────────────

This Week

Words learned: 35
Quiz accuracy: 82%

─────────────────────

Strongest Words
...

Words to Practice
...
```

Use charts only where they provide useful information.

Do not turn the page into a complicated analytics dashboard.

---

# 21. Calendar / History

Create a simple learning history.

Example:

```
September 2026

Mon Tue Wed Thu Fri Sat Sun
 ✓   ✓   ✓   ✓   ✓   ✓   -
```

Show:

* Days completed
* Number of words learned
* Quiz score

Clicking a completed day should allow me to revisit that day's words.

---

# 22. Vocabulary Library

Create a searchable vocabulary library.

It should allow:

* Search by word
* Search by meaning
* Filter by date
* Filter by status
* Filter by difficulty
* Filter by mastered/learning/review
* Favorite words

Example:

```
🔎 Search vocabulary...

All | Mastered | Learning | Review

straightforward    🟢
reluctant           🟡
hectic              🔴
```

Clicking a word opens its complete details.

---

# 23. Favorites

Allow me to mark words as favorites.

Example:

```
⭐ Favorites
```

This should be application-level data and must NOT modify the Excel file.

---

# 24. Daily Experience Length

The application should be designed for approximately:

### 5–10 minutes per day.

Do not create a system that requires 30–60 minutes every day.

The ideal flow:

```
Open app
   ↓
See today's 5 words
   ↓
Learn
   ↓
Quick recall
   ↓
5-question quiz
   ↓
Done
```

If review words are due:

```
Today's 5 new words
       +
Small review session
```

---

# 25. Notifications / Reminder Architecture

Design the application so that a future reminder can be added.

For example:

```
"Your 5 new words are waiting 📚"
```

But do not implement unnecessary notification infrastructure unless it is simple and reliable.

The core application should work without notifications.

---

# 26. Handling Excel Changes

The Gemini automation may append new rows to the existing Excel file.

The application must handle:

* New rows
* Existing rows
* Duplicate rows
* Blank rows
* Missing values
* Date changes
* Spreadsheet updates
* File replacement/version changes

Do not duplicate vocabulary entries every time synchronization happens.

Use a stable identifier where possible.

If the Excel does not contain a unique ID, generate a deterministic identifier based on appropriate fields such as:

```
normalized word + date
```

or another reliable combination.

Do not use only row number as an identifier because rows can move.

---

# 27. Duplicate Handling

If the same word appears multiple times:

Do not blindly merge records.

Treat entries as separate if their dates/content represent separate learning records.

However, detect obvious accidental duplicate rows during synchronization and prevent duplicate application records.

---

# 28. Missing / Invalid Data

If a row has:

```
Word = empty
```

ignore it.

If a word exists but meaning is missing:

show the word but clearly indicate:

```
Meaning unavailable
```

Do not crash.

If the Excel file cannot be read:

show a friendly error:

```
We couldn't sync your vocabulary right now.

Last successful sync:
Today, 8:32 PM

[ Try Again ]
```

Do not display technical stack traces to the user.

---

# 29. Offline / Last Synced Data

If possible, cache the most recent successfully synchronized vocabulary data.

If Google Drive is temporarily unavailable:

show:

```
You're offline

Showing your last synchronized vocabulary.
```

This allows the application to remain usable.

Clearly display:

```
Last synced: Today, 8:32 PM
```

---

# 30. Settings Page

Create a simple Settings page.

Include:

### Google Drive

```
Connected ✓

Vocabulary File:
Words.xlsx

Last Synced:
Today, 8:32 PM

[ Change File ]

[ Disconnect Google Drive ]
```

### Learning

```
Daily new words:
Automatically detected

Daily review:
On

Quiz after learning:
On
```

### Appearance

```
Light
Dark
System
```

Keep settings simple.

---

# 31. Responsive Design

The application must work well on:

* Desktop
* Laptop
* Mobile browser
* Tablet

Mobile is especially important because vocabulary learning is naturally suited to short sessions on a phone.

On mobile:

* Word should remain large
* Buttons should be easy to tap
* Avoid horizontal scrolling
* Cards should fit the screen
* Quiz options should be comfortable to tap

---

# 32. Visual Design

Use a modern learning-app aesthetic.

The design should communicate:

```
"I want to open this every day."
```

Not:

```
"This is an Excel management system."
```

Recommended characteristics:

* Spacious layout
* Large typography for vocabulary words
* Clear hierarchy
* Soft cards
* Subtle shadows/borders
* Smooth transitions
* Small tasteful animations
* Strong primary CTA
* Progress indicators
* Minimal clutter

Do not overuse:

* Gradients
* Neon colors
* Excessive icons
* Confetti
* Gamification
* Large dashboards
* Unnecessary animations

The application should feel mature and premium.

---

# 33. Navigation

Use a simple navigation structure:

```
🏠 Today
🔄 Review
📚 Vocabulary
📈 Progress
⚙ Settings
```

On mobile, use a bottom navigation bar if appropriate.

"Today" should always be the primary screen.

---

# 34. First-Time Setup

When the application is opened for the first time:

### Step 1

```
Welcome to your Daily Vocabulary

Learn 5 useful English words every day.

[ Connect Google Drive ]
```

### Step 2

Authenticate with Google.

### Step 3

Select the Excel file.

### Step 4

Read and validate the spreadsheet.

### Step 5

Show:

```
✓ Successfully connected

150 vocabulary entries found.

[ Start Learning ]
```

After setup, do not ask for the file again unless the user changes it.

---

# 35. Important: Do Not Create a Manual Upload Workflow

Do NOT make the main application flow:

```
Download Excel
   ↓
Upload Excel
   ↓
Read Excel
```

That defeats the purpose.

The intended workflow is:

```
Google Drive
   ↓
Connected Excel file
   ↓
Automatic synchronization
   ↓
Learning application
```

Manual upload may exist only as an optional fallback/debug feature, but it should not be the normal workflow.

---

# 36. Data Synchronization UX

Provide a subtle sync indicator.

For example:

```
✓ Synced just now
```

or:

```
↻ Syncing...
```

or:

```
⚠ Last synced 2 hours ago
```

Do not interrupt the learning experience with unnecessary synchronization dialogs.

---

# 37. Security

Treat Google authentication credentials/tokens securely.

Do not expose sensitive credentials in frontend code.

Do not hardcode OAuth secrets.

Use appropriate secure storage for authentication tokens/configuration.

The application should request the minimum Google permissions necessary.

Do not modify or delete the user's Google Drive files.

The app should have read-only access to the vocabulary Excel file wherever technically possible.

---

# 38. Architecture Expectations

Before coding:

1. Inspect the provided `Words.xlsx`
2. Understand its structure
3. Define the data model
4. Define the Google Drive synchronization flow
5. Define the learning-progress data model
6. Define the main application screens
7. Then implement

Do not start by building random UI components without understanding the spreadsheet and data flow.

---

# 39. Error Handling

Handle gracefully:

* Google authentication failure
* User denies permission
* Excel file deleted
* Excel file moved
* File renamed
* File unavailable
* Invalid Excel format
* Invalid rows
* Duplicate data
* Network failure
* Google API rate limits
* Empty spreadsheet
* No words for today

Every error should have a human-readable message and an appropriate recovery action.

---

# 40. Performance

The application should load quickly.

Avoid downloading/parsing the entire Excel file on every page navigation.

Use:

* Local caching
* Database persistence
* File version/update metadata
* Incremental synchronization where practical

The application should feel instant after the initial synchronization.

---

# 41. Future Extensibility

Structure the application so the vocabulary source can eventually support:

* Google Sheets
* CSV
* Another Excel file
* Manual vocabulary
* AI-generated practice

However, **do not build all of these now**.

The first version should focus on:

```
Google Drive Excel
      +
Daily vocabulary learning
      +
Review
      +
Quiz
      +
Progress
```

Keep the architecture extensible without overengineering the first version.

---

# 42. Important Product Principle

The application is NOT an Excel reader.

The Excel file is simply the backend/source of vocabulary content.

The actual product is:

> A personal daily English vocabulary learning experience.

Every design and implementation decision should support this goal.

---

# 43. Daily User Journey

The final experience should feel approximately like this:

```
Open app
   ↓
👋 Good evening
   ↓
🔥 8 day streak
   ↓
"You have 5 new words today."
   ↓
[ Start Learning ]
   ↓
Word 1
   ↓
Word 2
   ↓
Word 3
   ↓
Word 4
   ↓
Word 5
   ↓
Quick Quiz
   ↓
4/5 🎉
   ↓
"1 word needs practice."
   ↓
Review difficult word
   ↓
Done ✓
```

This entire experience should take approximately 5–10 minutes.

---

# 44. Final Acceptance Criteria

The application is considered successful only if all of the following work:

### Google Drive

* [ ] User can authenticate with Google
* [ ] User can select the vocabulary Excel file
* [ ] Application remembers the selected file
* [ ] Application can read the latest version
* [ ] No daily upload is required

### Excel

* [ ] Actual uploaded `Words.xlsx` structure is correctly understood
* [ ] Date is correctly interpreted
* [ ] Today's vocabulary can be identified
* [ ] New rows are detected
* [ ] Existing rows are not duplicated

### Daily Learning

* [ ] Today's words are shown
* [ ] One-word-at-a-time learning works
* [ ] Meaning is shown
* [ ] Example is shown
* [ ] How-to-use information is shown
* [ ] User can mark confidence
* [ ] User can optionally create a sentence

### Quiz

* [ ] Daily quiz is generated from today's vocabulary
* [ ] Multiple question types are supported
* [ ] Score is calculated
* [ ] Incorrect words are identified

### Review

* [ ] Older words can become due for review
* [ ] Difficult words appear more frequently
* [ ] Review progress is saved

### Progress

* [ ] Streak works
* [ ] Learning statistics work
* [ ] Vocabulary history works
* [ ] Progress is persistent

### UX

* [ ] Desktop works
* [ ] Mobile works
* [ ] Loading states are handled
* [ ] Errors are user-friendly
* [ ] UI does not feel like Excel
* [ ] Daily learning can be completed in approximately 5–10 minutes

---

# 45. Development Approach

Build this in stages.

## Phase 1 — Understand Data

Inspect `Words.xlsx`.

Document the actual structure and map the spreadsheet columns to the application's vocabulary model.

Do not modify the Excel file.

## Phase 2 — Google Drive Connection

Implement Google authentication and Drive file selection.

Verify that the application can retrieve the selected Excel file.

## Phase 3 — Synchronization

Implement reliable synchronization and caching.

Test by modifying the Excel file and confirming that the application detects the changes.

## Phase 4 — Daily Learning

Build:

* Today page
* Word cards
* Navigation
* Daily session

## Phase 5 — Quiz

Implement the daily quiz and scoring.

## Phase 6 — Learning Progress

Implement:

* Learning status
* Review scheduling
* Streak
* Progress tracking

## Phase 7 — Vocabulary Library

Implement search, filtering and favorites.

## Phase 8 — Polish

Improve:

* Responsive design
* Animations
* Loading states
* Error states
* Empty states
* Overall visual quality

---

# 46. Do Not Overengineer

This is a personal application for one user.

Do not add unnecessary enterprise functionality such as:

* Team management
* Roles and permissions
* Admin dashboard
* Multi-tenant architecture
* Social features
* Leaderboards
* Complex notification systems
* Unnecessary microservices
* Complicated analytics

Keep it simple, reliable and enjoyable.

---

# 47. Final Instruction to Antigravity

First inspect the provided `Words.xlsx` and understand the real data.

Then build the application around the actual spreadsheet.

Do not invent spreadsheet columns.

Do not create a daily manual upload workflow.

The most important requirement is:

> **Gemini automatically adds 5 words to my Excel file in Google Drive, and this application automatically reads those new words and turns them into an engaging daily vocabulary-learning experience without me downloading or uploading anything.**

Prioritize:

1. Reliability of Google Drive synchronization
2. Correct Excel parsing
3. Automatic daily word detection
4. Excellent daily learning UX
5. Quiz and review system
6. Persistent progress
7. Mobile usability
8. Clean and motivating design

Build a working application, not just mockup screens.

After implementation, test the complete flow from:

```
Google Drive Excel
      ↓
Synchronization
      ↓
Today's 5 words
      ↓
Learning session
      ↓
Quiz
      ↓
Review
      ↓
Progress
```

Fix any issues discovered during testing before considering the application complete.
