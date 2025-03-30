# SARJ Book Analysis API - Postman Collection

This directory contains Postman collection and environment files for testing the SARJ Book Analysis API.

## Files

- `SARJ-Book-Analysis-API.json` - The Postman collection with all API endpoints
- `environment.json` - Environment variables for the collection

## How to Import

1. Open Postman
2. Click on "Import" button in the top left
3. Select the files `SARJ-Book-Analysis-API.json` and `environment.json`
4. Both the collection and environment will be imported

## Setting Up the Environment

1. In Postman, click on the environment dropdown in the top right
2. Select "SARJ Book Analysis API Environment"
3. Update the `bookId` variable with a valid book ID for testing

## Available Endpoints

### Books API

- `GET /api/books/:bookId/content` - Get content of a book by ID
- `GET /api/books/:bookId/metadata` - Get metadata of a book by ID

### Analysis API

- `POST /api/analysis/:bookId/full` - Perform full analysis on a book
  - Can provide book content directly in the request body or use bookId to fetch it

## Running the API

Ensure the API server is running on the port specified in the environment (default: 3000):

```
npm start
```

Then you can start using the collection to test the endpoints.
