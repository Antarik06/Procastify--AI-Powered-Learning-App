import { Attachment } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

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

interface NormalizeResult {
  combinedText: string;
  failedExtractions: string[];
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

  let combinedText = userText || '';
  const failedExtractions: string[] = [];

  // First, handle PDF attachments locally using our PDF.js extraction
  const pdfAttachments = attachments.filter(a => a.type === 'pdf');
  const nonPdfAttachments = attachments.filter(a => a.type !== 'pdf');

  // Extract text from PDF files locally
  for (const pdfAttachment of pdfAttachments) {
    try {
      const result = await extractPDFText(pdfAttachment.content);
      if (result.success && result.text) {
        combinedText += `\n\n--- Content from ${pdfAttachment.name || 'PDF file'} ---\n${result.text}`;
      } else {
        console.warn(`Failed to extract text from PDF: ${result.error}`);
        failedExtractions.push(pdfAttachment.name || 'PDF file');
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
      failedExtractions.push(pdfAttachment.name || 'PDF file');
    }
  }

  // Handle non-PDF attachments through backend (if needed)
  if (nonPdfAttachments.length > 0) {
    try {
      const response = await fetch(`${BACKEND_URL}/normalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_text: '', // We'll merge manually
          attachments: nonPdfAttachments.map(a => ({
            type: a.type,
            content: a.content,
            name: a.name,
            mimeType: a.mimeType
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.normalized_text) {
          combinedText += `\n\n--- Content from other attachments ---\n${data.normalized_text}`;
        } else {
          // If backend failed, add failed attachments to our list
          if (data.failed_attachments) {
            failedExtractions.push(...data.failed_attachments);
          } else {
            failedExtractions.push(...nonPdfAttachments.map(a => a.name || a.type));
          }
        }
      } else {
        console.warn('Backend not available for non-PDF attachments');
        failedExtractions.push(...nonPdfAttachments.map(a => a.name || a.type));
      }
    } catch (error) {
      console.warn('Backend not available for non-PDF attachments:', error);
      failedExtractions.push(...nonPdfAttachments.map(a => a.name || a.type));
    }
  }

  // Final fallback if no text was extracted
  if (!combinedText.trim()) {
    return null;
  }

  return {
    combinedText: combinedText.trim(),
    failedExtractions
  };
};

// Legacy function - kept for backward compatibility but redirects to new implementation
export const extractYouTubeTranscript = async (url: string): Promise<ExtractionResult> => {
  const result = await fetchURLContent(url);
  return {
    text: result.text,
    success: result.success,
    error: result.error
  };
};

// Legacy function - kept for backward compatibility but redirects to new implementation
export const extractWebsiteContent = async (url: string): Promise<ExtractionResult> => {
  const result = await fetchURLContent(url);
  return {
    text: result.text,
    success: result.success,
    error: result.error
  };
};
