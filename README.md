# URL Literally Beautiful - Kanban

A lightweight, shareable Kanban-style board manager that encodes your entire board state directly into the URL. No backend needed—all data lives in the browser and is compressed into your link.

## Summary

This is a single-file HTML application that creates a customizable task/project management board with columns (like "ready," "in-progress," "done") and rows (tasks). Your entire board state—title, columns, and rows—is automatically serialized, compressed using gzip, and encoded into the page URL as a query parameter. This allows you to:

- Create and manage multiple columns
- Add and remove tasks (rows)
- Rename the board
- Share your entire board state with others via a single URL
- See real-time statistics on data size and compression

No databases, no servers, no sign-ups required.

## How It Works

### Data Structure

The application stores data in this format:
```javascript
{
  title: "My Board",
  columns: [
    { name: "ready", rows: [] },
    { name: "in-progress", rows: [] },
    { name: "done", rows: [] }
  ]
}
```

### URL Encoding Process

1. **Serialize**: Data is converted to JSON
2. **Compress**: JSON is compressed using gzip (via the pako library)
3. **Encode**: Compressed data is converted to Base64
4. **URL-Safe**: Base64 is converted to URL-safe format (replacing `+` with `-`, `/` with `_`, removing `=` padding)
5. **Store**: The encoded string is appended to the URL as a query parameter: `?state=<encoded_data>`

When you load the page, this process reverses automatically.

### Data Compression & URL Encoding Technical Details

#### Why Compression?

URLs have practical limits:
- **Browser URL limit**: 2000-8000 characters (varies by browser)
- **Server limits**: Often 2083 characters
- **Safe assumption**: 2000 characters for broad compatibility

Without compression, a moderately sized board (10 columns × 20 tasks) would exceed these limits. Compression typically achieves **60-80% reduction** in size.

#### The Compression Pipeline

1. **Data Minification**
   - Field names shortened: `title` → `t`, `columns` → `c`, `name` → `n`
   - Object structure converted to arrays: `{name: "x", rows: [...]}` → `["x", [...]]`
   - Empty/undefined values omitted from arrays
   - Reduces size by **20-40%** before any compression
   - Example: 10 KB JSON → 6 KB minified

   **Before minification:**
   ```json
   {"title":"My Board","columns":[{"name":"ready","rows":[{"name":"task","description":"","prLink":""}]}]}
   ```

   **After minification:**
   ```json
   {"t":"My Board","c":[["ready",[["task"]]]]}
   ```

2. **JSON Serialization**
   - Minified data is converted to JSON with no whitespace
   - Only essential data included (empty values excluded)
   - Example: 6 KB minified JSON for a board with 5 columns and 50 tasks

3. **GZIP Compression** (via [pako](https://github.com/nodeca/pako))
   - GZIP is a lossless compression algorithm that exploits patterns in the data
   - Reduces minified JSON by 60-80% typically
   - Example: 6 KB minified → 1.5 KB compressed
   - Browser decompresses transparently on load

4. **Base64 Encoding**
   - Converts binary compressed data to text (safe for URLs)
   - Adds ~33% size overhead (binary → text conversion)
   - Only uses characters: `A-Z, a-z, 0-9, +, /`
   - Example: 1.5 KB compressed → 2 KB Base64

5. **URL-Safe Base64**
   - Standard Base64 uses `+`, `/`, and `=` which have special meaning in URLs
   - Convert: `+` → `-`, `/` → `_`, remove `=` padding
   - Results in ASCII-only, URL-safe string
   - Example: `abc+def/ghi=` → `abc-def_ghi`

#### Size Example

**With minification (current):**
```
Original JSON:           15 KB
After Minification:      9 KB  (40% reduction)
After GZIP:             2 KB  (78% reduction from minified)
After Base64:           2.7 KB (33% overhead)
URL-Safe Base64:        2.7 KB (same, just character swaps)
Final URL State:        ~2700 characters (135% of 2000-char limit)
```

**Without minification (previous):**
```
Original JSON:          15 KB
After GZIP:             3 KB
After Base64:           4 KB
Final URL State:        ~4000 characters (200% of limit) ❌
```

Minification enables storing ~40% more data in the same URL space.

#### Live Statistics

The app displays real-time compression stats:
- **Raw**: Size of minified JSON (already optimized with short field names and arrays)
- **Compressed**: Size after GZIP (in bytes)
- **Encoded**: Size of URL-safe Base64 string
- **Limit**: Percentage of 2000-character URL limit

Reach 100% to hit the practical URL limit; beyond this, sharing via URL becomes unreliable. The stats reflect the minified size, showing you the actual space used after optimization.

#### Decoding On Load

1. Extract `?state=` query parameter from URL
2. Reverse URL-safe Base64: `-` → `+`, `_` → `/`, add `=` padding
3. Decode Base64 to binary
4. Decompress with GZIP
5. Parse JSON into board state
6. Validate data structure and load into app

#### Storage Fallback

- **Primary**: URL state (limited to ~2000 chars)
- **Secondary**: Browser cookies (up to 4 KB)
- If board exceeds URL limit, cookie stores full state for recovery
- Cookies persist 365 days

### Key Features

- **Edit Board Title**: Click the title at the top to edit it (contenteditable)
- **Add Columns**: Click "+ Add Column" to create a new column
- **Delete Columns**: Each column has a delete button
- **Add Rows**: Type a task name in the input field and click Add to add a row to a column
- **Delete Rows**: Each row has an × button to remove it
- **Copy URL**: Share your board state with the "Copy URL" button
- **Live Stats**: Track your URL size:
  - **Raw**: Original JSON size
  - **Compressed**: Size after gzip
  - **Encoded**: Size of Base64-encoded string
  - **Limit**: Percentage of typical URL length limit (assumes 2000 char limit)

### Default Columns

The app ships with six default columns:
- ready
- in-progress
- in-review
- re-work
- done
- archived

You can customize these by adding/deleting columns.

## Usage

1. Open `urliterallybeautiful.html` in your browser
2. Click the title to rename your board
3. Add tasks by typing in the input fields at the bottom of each column
4. Create new columns as needed
5. Copy the URL and share it with others—they'll see your exact board state
6. Refresh the page anytime to see persisted changes in the URL

## Technical Details

- **Dependencies**: Uses [pako](https://github.com/nodeca/pako) for gzip compression (loaded from CDN)
- **No Local Storage**: State is kept in the URL only (or via the `data` object in memory)
- **URL Limit**: Assumes a 2000-character limit for query parameters; stats show how much of this you're using
- **HTML Escaping**: Row and column names are escaped to prevent XSS
- **Client-Side Only**: Everything runs in the browser—no network requests except the pako library CDN
