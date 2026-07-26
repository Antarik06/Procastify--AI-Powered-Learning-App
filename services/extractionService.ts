import { Attachment } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import { fetchURLContent } from './urlContentService';

// Configure PDF.js worker to use local bundled worker
try {
  // Use locally served worker file
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
} catch {
  // Fallback to CDN only if local worker fails
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

export interface ExtractionResult {
  text: string;
  success: boolean;
  error?: string;
}

export interface NormalizeResult {
  combinedText: string;
  failedExtractions: string[];
  /**
   * Image/audio attachments that cannot be turned into text locally. These are
   * forwarded to the multimodal model as inline data parts by the caller.
   */
  mediaAttachments: Attachment[];
}

/**
 * Extract text from a PDF file using PDF.js
 */
export const extractPDFText = async (pdfBase64: string): Promise<ExtractionResult> => {
  try {
    // Convert base64 to array buffer
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }

    // Clean up the text
    const cleanedText = fullText
      .replace(/[ \t]+/g, ' ')  // Replace multiple spaces/tabs with single space, preserve newlines
      .replace(/\n\s*\n/g, '\n\n')  // Clean up multiple newlines
      .trim();

    if (!cleanedText) {
      return {
        text: '',
        success: false,
        error: 'No readable text found in PDF'
      };
    }

    return {
      text: cleanedText,
      success: true
    };

  } catch (error) {
    console.error('PDF text extraction failed:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during PDF extraction'
    };
  }
};

export const prepareTextForSummarization = async (
  userText: string,
  attachments: Attachment[]
): Promise<NormalizeResult | null> => {
  // If no context at all
  if (!userText && attachments.length === 0) return null;

  const textSegments: string[] = userText ? [userText] : [];
  const failedExtractions: string[] = [];
  const mediaAttachments: Attachment[] = [];

  const label = (attachment: Attachment, fallback: string) =>
    attachment.name || fallback;

  // PDFs and URLs are turned into text here; images and audio are passed
  // through to the multimodal model by the caller.
  const extractions = attachments.map(async (attachment) => {
    switch (attachment.type) {
      case 'pdf': {
        const name = label(attachment, 'PDF file');
        try {
          const result = await extractPDFText(attachment.content);
          if (result.success && result.text) {
            textSegments.push(`\n\n--- Content from ${name} ---\n${result.text}`);
          } else {
            console.warn(`Failed to extract text from PDF: ${result.error}`);
            failedExtractions.push(name);
          }
        } catch (error) {
          console.error('PDF extraction error:', error);
          failedExtractions.push(name);
        }
        break;
      }

      case 'url': {
        const name = label(attachment, 'link');
        try {
          const result = await fetchURLContent(attachment.content);
          if (result.success && result.text) {
            textSegments.push(`\n\n--- Content from ${name} ---\n${result.text}`);
          } else {
            console.warn(`Failed to fetch URL content: ${result.error}`);
            failedExtractions.push(name);
          }
        } catch (error) {
          console.error('URL extraction error:', error);
          failedExtractions.push(name);
        }
        break;
      }

      case 'image':
      case 'audio':
        mediaAttachments.push(attachment);
        break;

      default:
        failedExtractions.push(label(attachment, attachment.type));
    }
  });

  await Promise.all(extractions);

  const combinedText = textSegments.join('').trim();

  // Nothing usable at all
  if (!combinedText && mediaAttachments.length === 0) {
    return null;
  }

  return {
    combinedText,
    failedExtractions,
    mediaAttachments
  };
};
