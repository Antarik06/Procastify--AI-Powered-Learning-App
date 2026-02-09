import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import { v4 as uuidv4 } from 'uuid';
import { Block, BlockType } from '../types';

// Configure PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
} catch {
  // Fallback
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

/**
 * Migration Service
 * Handles extraction of content from various external sources (DOCX, PPTX, PDF, etc.)
 * and converts them into Procastify's Block format.
 */

// Helper to create a block
const createBlock = (type: BlockType, content: string, extra: Partial<Block> = {}): Block => ({
  id: uuidv4(),
  type,
  content,
  ...extra
});

export const MigrationService = {
  
  /**
   * Process a file and return a list of Blocks
   */
  async processFile(file: File): Promise<Block[]> {
    const type = file.name.split('.').pop()?.toLowerCase();

    switch (type) {
      case 'docx':
        return this.extractFromDocx(file);
      case 'pptx':
        return this.extractFromPptx(file);
      case 'pdf':
        return this.extractFromPdf(file);
      case 'txt':
      case 'md':
        return this.extractFromText(await file.text());
      default:
        throw new Error('Unsupported file type');
    }
  },

  /**
   * Process raw text/html content (e.g. from clipboard or link fetch)
   */
  processContent(content: string, format: 'text' | 'markdown' | 'html'): Block[] {
    if (format === 'html') {
      return this.parseHtmlToBlocks(content); // Basic parser
    }
    // Assume markdown/text for now
    return content.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('# ')) return createBlock('h1', trimmed.substring(2));
      if (trimmed.startsWith('## ')) return createBlock('h2', trimmed.substring(3));
      if (trimmed.startsWith('### ')) return createBlock('h3', trimmed.substring(4));
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return createBlock('bullet', trimmed.substring(2));
      return createBlock('text', trimmed);
    }).filter(b => b !== null) as Block[];
  },

  // --- DOCX Extraction ---
  async extractFromDocx(file: File): Promise<Block[]> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;
      return this.parseHtmlToBlocks(html);
    } catch (e) {
      console.error('DOCX Import Failed', e);
      throw new Error('Failed to parse Word document');
    }
  },

  // --- PPTX Extraction ---
  async extractFromPptx(file: File): Promise<Block[]> {
    try {
      const zip = await JSZip.loadAsync(file);
      const blocks: Block[] = [];
      
      // Parse slides in order
      const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
      // Sort naturally (slide1, slide2, slide10...)
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
        const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
        return numA - numB;
      });

      for (const slidePath of slideFiles) {
        const slideXml = await zip.file(slidePath)?.async('string');
        if (slideXml) {
          blocks.push(createBlock('h2', `Slide ${slideFiles.indexOf(slidePath) + 1}`));
          // Regex to extract text from <a:t> tags
          const textMatches = slideXml.matchAll(/<a:t>(.*?)<\/a:t>/g);
          let slideText = [];
          for (const match of textMatches) {
            slideText.push(match[1]);
          }
          if (slideText.length > 0) {
              // Group text by chunks or lines? PPT usually splits text weirdly.
              // Simple rejoin for MVP
              slideText.forEach(t => blocks.push(createBlock('bullet', t)));
          }
        }
      }
      return blocks;
    } catch (e) {
      console.error('PPTX Import Failed', e);
      throw new Error('Failed to parse PowerPoint presentation');
    }
  },

  // --- PDF Extraction ---
  async extractFromPdf(file: File): Promise<Block[]> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const blocks: Block[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Simple line grouping by Y coordinate?
        // MVP: Just combine items and split by newlines
        // Better MVP: Try to identify headers based on font height (not available easily without parsing styles)
        
        let lastY = -1;
        let lineBuffer = '';
        
        const items: any[] = textContent.items as any[];
        
        for (const item of items) {
            // item.transform[5] is the Y position (usually)
            const y = item.transform[5];
            const text = item.str;
            
            if (lastY !== -1 && Math.abs(y - lastY) > 10) {
               // New Line
               if(lineBuffer.trim()) blocks.push(createBlock('text', lineBuffer.trim()));
               lineBuffer = text;
            } else {
               lineBuffer += (lastY === -1 ? '' : ' ') + text;
            }
            lastY = y;
        }
        if(lineBuffer.trim()) blocks.push(createBlock('text', lineBuffer.trim()));
        
        // Add divider between pages?
        blocks.push(createBlock('h3', `Page ${i+1}`));
      }
      return blocks;
    } catch (e) {
      console.error('PDF Import Failed', e);
      throw new Error('Failed to parse PDF');
    }
  },
  
  // --- Simple HTML Parser for DOCX/Paste ---
  parseHtmlToBlocks(html: string): Block[] {
    const blocks: Block[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Iterate body nodes
    doc.body.childNodes.forEach(node => {
        const text = node.textContent?.trim() || '';
        if (!text && node.nodeName !== 'IMG') return;

        switch (node.nodeName) {
            case 'H1':
                blocks.push(createBlock('h1', text));
                break;
            case 'H2':
                blocks.push(createBlock('h2', text));
                break;
            case 'H3':
                blocks.push(createBlock('h3', text));
                break;
            case 'UL':
            case 'OL':
                (node as HTMLElement).querySelectorAll('li').forEach(li => {
                    blocks.push(createBlock('bullet', li.textContent?.trim() || ''));
                });
                break;
            case 'PRE':
            case 'CODE':
                blocks.push(createBlock('code', text));
                break;
            case 'P':
            default:
                if (text) blocks.push(createBlock('text', text));
                break;
        }
    });

    return blocks;
  }
};
