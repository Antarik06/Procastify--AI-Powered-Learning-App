import { YoutubeTranscript } from 'youtube-transcript';

export interface URLExtractionResult {
  success: boolean;
  text: string;
  error?: string;
  title?: string;
}

const JINA_READER_API = 'https://r.jina.ai/';

function isValidURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function isYouTubeURL(url: string): boolean {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

async function extractYouTubeTranscript(url: string): Promise<URLExtractionResult> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    const text = transcript.map(item => item.text).join(' ');
    
    // Initial cleanup
    const cleanText = text
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');

    return {
      success: true,
      text: cleanText,
      title: 'YouTube Transcript'
    };
  } catch (error: any) {
    console.error('YouTube transcript error:', error);
    return {
      success: false,
      text: '',
      error: 'Could not fetch YouTube transcript. The video might not have captions enabled.'
    };
  }
}

async function extractWithJina(url: string): Promise<URLExtractionResult> {
    try {
        console.log('[URL Service] Fetching via Jina Reader:', url);
        const response = await fetch(`${JINA_READER_API}${url}`);
        
        if (!response.ok) {
           const errText = await response.text();
           throw new Error(`Reader API failed: ${errText.substring(0, 100)}`);
        }

        const markdown = await response.text();
        
        if (!markdown || markdown.length < 50 || markdown.includes('Access denied') || markdown.includes('Sign in')) {
             return {
                 success: false,
                 text: '',
                 error: 'Content not accessible. The page requires sign-in or is private. Please ensure the link is "Public / Anyone with link".'
             };
        }

        // Clean up markdown title if present (often first line starts with #)
        // This is optional as our Block parser works fine with Markdown
        
        return {
            success: true,
            text: markdown, 
            title: 'Imported Web Content'
        };

    } catch (e: any) {
        console.error('Jina Reader Error:', e);
        return {
            success: false,
            text: '',
            error: 'Failed to read link content. ' + e.message
        };
    }
}

export async function fetchURLContent(url: string): Promise<URLExtractionResult> {
  if (!isValidURL(url)) {
    return {
      success: false,
      text: '',
      error: 'Invalid URL format. Please enter a valid http:// or https:// URL.'
    };
  }

  if (isYouTubeURL(url)) {
    return extractYouTubeTranscript(url);
  }

  return extractWithJina(url);
}
