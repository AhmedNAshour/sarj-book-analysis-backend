const axios = require("axios");
const cheerio = require("cheerio");

async function fetchBookContent(bookId) {
  try {
    // Try the standard format first
    const contentUrl = `https://www.gutenberg.org/files/${bookId}/${bookId}-0.txt`;
    const response = await axios.get(contentUrl);
    return response.data;
  } catch (error) {
    // If standard format fails, try alternative formats
    try {
      const contentUrl = `https://www.gutenberg.org/files/${bookId}/${bookId}.txt`;
      const response = await axios.get(contentUrl);
      return response.data;
    } catch (secondError) {
      // Try the cache version as a last resort
      try {
        const contentUrl = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`;
        const response = await axios.get(contentUrl);
        return response.data;
      } catch (thirdError) {
        throw new Error(`Failed to fetch book content for ID ${bookId}`);
      }
    }
  }
}

async function fetchBookMetadata(bookId) {
  const metadataUrl = `https://www.gutenberg.org/ebooks/${bookId}`;
  const response = await axios.get(metadataUrl);

  // Load the HTML content into cheerio
  const $ = cheerio.load(response.data);

  // Extract title
  const titleAndAuthor = $("h1[itemprop='name']").text().trim();
  //extract title without "by"
  const title = titleAndAuthor.split("by")[0].trim();
  // Extract author
  const author = titleAndAuthor.split("by")[1].trim();

  return { title, author };
}

module.exports = {
  fetchBookContent,
  fetchBookMetadata,
};
