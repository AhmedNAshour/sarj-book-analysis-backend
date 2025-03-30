# SARJ Book Analysis API - Postman Collection

This directory contains Postman collection and environment files for testing the SARJ Book Analysis API. These files allow you to quickly test all endpoints and features of the book analysis backend.

## Files

- `SARJ-Book-Analysis-API.json` - The Postman collection with all API endpoints
- `environment.json` - Environment variables for the collection (including API keys)

## How to Import

1. Open Postman
2. Click on "Import" button in the top left
3. Select the files `SARJ-Book-Analysis-API.json` and `environment.json`
4. Both the collection and environment will be imported

## Setting Up the Environment

1. In Postman, click on the environment dropdown in the top right
2. Select "SARJ Book Analysis API Environment"
3. The environment is pre-configured with:
   - `baseUrl`: The base URL for your API (default: http://localhost:3000)
   - `bookId`: Sample book ID for testing (default: pg1342 for Pride and Prejudice)
   - `GROQ_API_KEY`: API key for Groq's language models
   - `SAMBANOVA_API_KEY`: API key for SambaNova's language models
   - `SAMBANOVA_API_BASE_URL`: Base URL for SambaNova API

## Available Endpoints

### Books API

- `GET /api/books/:bookId/content` - Get the full text content of a book by ID
  - Example: `/api/books/pg1342/content` for Pride and Prejudice
- `GET /api/books/:bookId/metadata` - Get metadata (title, author) of a book by ID
  - Example: `/api/books/pg1342/metadata` for Pride and Prejudice

### Analysis API

- `POST /api/analysis/:bookId/full` - Perform full analysis on a book by ID

  - Uses the book ID to fetch content and metadata
  - You can configure analysis options in the request body:
    ```json
    {
      "options": {
        "modelProvider": "groq", // or "sambanova"
        "includeSummary": true,
        "includeThemes": true,
        "includeCharacters": true,
        "includeStyleAnalysis": true
      }
    }
    ```

- `POST /api/analysis/custom/full` - Analyze custom text content
  - Provide your own text content in the request body
  - Example:
    ```json
    {
      "content": "Your text content here...",
      "options": {
        "modelProvider": "groq",
        "includeSummary": true,
        "includeThemes": true,
        "includeStyleAnalysis": true
      }
    }
    ```

## Running the API

Ensure the API server is running on the port specified in the environment (default: 3000):

```
npm start
```

Then you can start using the collection to test the endpoints.

## Suggested Testing Flow

1. First, test the book fetching endpoints using a valid book ID:

   - GET `/api/books/:bookId/metadata` to confirm the book exists
   - GET `/api/books/:bookId/content` to fetch the book content

2. Then, test the analysis endpoint:

   - POST `/api/analysis/:bookId/full` with different option combinations

3. Finally, test the custom analysis endpoint:
   - POST `/api/analysis/custom/full` with a sample text
