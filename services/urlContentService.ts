import * as cheerio from 'cheerio';
import { YoutubeTranscript } from 'youtube-transcript';

export interface URLExtractionResult {
  success: boolean;
  text: string;
  error?: string;
  title?: string;
}

// CORS proxy for client-side fetching
// Using the JSON endpoint which has proper CORS headers
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

/**
 * Validates if a string is a valid URL
 */
function isValidURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detects if URL is a YouTube video
 */
function isYouTubeURL(url: string): boolean {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

/**
 * Extracts video ID from YouTube URL
 */
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetches YouTube transcript
 */
async function extractYouTubeTranscript(url: string): Promise<URLExtractionResult> {
  console.log('[URL Service] Attempting to extract YouTube transcript from:', url);
  try {
    const videoId = getYouTubeVideoId(url);
    console.log('[URL Service] Extracted video ID:', videoId);

    if (!videoId) {
      console.warn('[URL Service] Could not extract video ID from URL');
      return {
        success: false,
        text: '',
        error: 'Could not extract YouTube video ID'
      };
    }

    console.log('[URL Service] Fetching transcript for video ID:', videoId);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    console.log('[URL Service] Transcript fetched, length:', transcript?.length);

    if (!transcript || transcript.length === 0) {
      console.warn('[URL Service] No transcript returned');
      return {
        success: false,
        text: '',
        error: 'No transcript available for this video'
      };
    }

    // Combine all transcript segments
    const text = transcript.map(item => item.text).join(' ');
    console.log('[URL Service] Successfully extracted transcript, character count:', text.length);

    return {
      success: true,
      text: text.trim(),
      title: `YouTube Video (${videoId})`
    };
  } catch (error: any) {
    console.error('[URL Service] YouTube transcript extraction failed:', error);
    return {
      success: false,
      text: '',
      error: error.message || 'Failed to fetch YouTube transcript. The video may not have captions available.'
    };
  }
}

/**
 * Extracts main content from HTML using cheerio
 */
function extractMainContent(html: string, url: string): URLExtractionResult {
  try {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, noscript, [role="navigation"], [role="banner"], [role="complementary"]').remove();
    $('.nav, .navigation, .menu, .sidebar, .advertisement, .ads, .social-share, .comments').remove();

    // Try to find main content area
    let mainContent = '';
    let title = $('title').text() || $('h1').first().text() || 'Webpage Content';

    // Priority order for content extraction
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      'body'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        // Extract text from paragraphs and headings
        const paragraphs: string[] = [];

        element.find('h1, h2, h3, h4, h5, h6, p, li').each((_, elem) => {
          const text = $(elem).text().trim();
          if (text.length > 0) {
            paragraphs.push(text);
          }
        });

        if (paragraphs.length > 0) {
          mainContent = paragraphs.join('\n\n');
          break;
        }
      }
    }

    // Fallback: get all paragraph text if no main content found
    if (!mainContent) {
      const paragraphs: string[] = [];
      $('p, h1, h2, h3').each((_, elem) => {
        const text = $(elem).text().trim();
        if (text.length > 20) { // Filter out very short paragraphs
          paragraphs.push(text);
        }
      });
      mainContent = paragraphs.join('\n\n');
    }

    if (!mainContent || mainContent.length < 50) {
      return {
        success: false,
        text: '',
        error: 'Could not extract meaningful content from this page'
      };
    }

    // Limit content length to avoid token overflow (30k characters ~ 7.5k tokens)
    const maxLength = 30000;
    if (mainContent.length > maxLength) {
      mainContent = mainContent.substring(0, maxLength) + '\n\n[Content truncated due to length...]';
    }

    return {
      success: true,
      text: mainContent,
      title: title.substring(0, 200) // Limit title length
    };
  } catch (error: any) {
    console.error('HTML parsing error:', error);
    return {
      success: false,
      text: '',
      error: 'Failed to parse HTML content'
    };
  }
}

/**
 * Fetches and extracts content from a URL
 */
export async function fetchURLContent(url: string): Promise<URLExtractionResult> {
  // Validate URL
  if (!isValidURL(url)) {
    return {
      success: false,
      text: '',
      error: 'Invalid URL format. Please enter a valid http:// or https:// URL.'
    };
  }

  // Handle YouTube URLs specially
  if (isYouTubeURL(url)) {
    return extractYouTubeTranscript(url);
  }

  // Fetch regular webpage content
  try {
    const proxiedUrl = CORS_PROXY + encodeURIComponent(url);

    const response = await fetch(proxiedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      return {
        success: false,
        text: '',
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`
      };
    }

    // Parse JSON response from CORS proxy
    const data = await response.json();
    const html = data.contents;

    if (!html || html.length < 100) {
      return {
        success: false,
        text: '',
        error: 'Received empty or invalid response from URL'
      };
    }

    return extractMainContent(html, url);
  } catch (error: any) {
    console.error('URL fetch error:', error);

    // Provide user-friendly error messages
    if (error.message.includes('CORS') || error.message.includes('fetch')) {
      return {
        success: false,
        text: '',
        error: 'Unable to access this URL due to network restrictions. Some websites block automated access.'
      };
    }

    return {
      success: false,
      text: '',
      error: error.message || 'Failed to fetch URL content'
    };
  }
}
