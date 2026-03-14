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
