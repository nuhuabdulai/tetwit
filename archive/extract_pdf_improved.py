#!/usr/bin/env python3
"""
Improved PDF Text Extraction Script
Enhanced version with better error handling, formatting, and output options.
"""

import PyPDF2
import argparse
import sys
import os
from datetime import datetime


class PDFExtractor:
    """A class for extracting text from PDF files with improved functionality."""
    
    def __init__(self, pdf_path):
        """Initialize the PDF extractor with the given PDF file path."""
        self.pdf_path = pdf_path
        self.reader = None
        self.num_pages = 0
        self.file_obj = None
        
    def validate_pdf(self):
        """Validate that the PDF file exists and is readable."""
        if not os.path.exists(self.pdf_path):
            raise FileNotFoundError(f"PDF file not found: {self.pdf_path}")
        
        if not os.path.isfile(self.pdf_path):
            raise ValueError(f"Path is not a file: {self.pdf_path}")
            
        # Check file extension
        if not self.pdf_path.lower().endswith('.pdf'):
            print(f"Warning: File '{self.pdf_path}' doesn't have a .pdf extension", file=sys.stderr)
    
    def load_pdf(self):
        """Load and parse the PDF file."""
        try:
            # Open the file and keep it open by storing the file object
            self.file_obj = open(self.pdf_path, 'rb')
            self.reader = PyPDF2.PdfReader(self.file_obj)
            self.num_pages = len(self.reader.pages)
            return True
        except PyPDF2.errors.PdfReadError as e:
            raise ValueError(f"Failed to read PDF file: {e}")
        except Exception as e:
            raise RuntimeError(f"Unexpected error loading PDF: {e}")
    
    def close(self):
        """Close the PDF file if it's open."""
        if hasattr(self, 'file_obj') and self.file_obj:
            self.file_obj.close()
            self.file_obj = None
    
    def extract_text(self, page_num=None, clean_spaces=True):
        """
        Extract text from the PDF.
        
        Args:
            page_num: Specific page number (1-indexed) or None for all pages
            clean_spaces: If True, clean up excessive whitespace
            
        Returns:
            Dictionary with page numbers as keys and text as values
        """
        if not self.reader:
            raise RuntimeError("PDF not loaded. Call load_pdf() first.")
        
        extracted = {}
        
        if page_num is not None:
            # Extract specific page
            if page_num < 1 or page_num > self.num_pages:
                raise ValueError(f"Page number {page_num} is out of range (1-{self.num_pages})")
            
            pages_to_extract = [page_num - 1]  # Convert to 0-indexed
        else:
            # Extract all pages
            pages_to_extract = range(self.num_pages)
        
        for page_idx in pages_to_extract:
            try:
                page = self.reader.pages[page_idx]
                text = page.extract_text()
                
                if clean_spaces:
                    # Clean up excessive whitespace while preserving paragraph breaks
                    lines = text.split('\n')
                    cleaned_lines = []
                    for line in lines:
                        line = line.strip()
                        if line:  # Skip empty lines
                            # Replace multiple spaces with single space
                            line = ' '.join(line.split())
                            cleaned_lines.append(line)
                    
                    # Join with proper paragraph breaks
                    text = '\n\n'.join(cleaned_lines)
                
                extracted[page_idx + 1] = text
            except Exception as e:
                print(f"Warning: Failed to extract text from page {page_idx + 1}: {e}", file=sys.stderr)
                extracted[page_idx + 1] = f"[ERROR EXTRACTING TEXT: {e}]"
        
        return extracted
    
    def get_metadata(self):
        """Extract PDF metadata if available."""
        if not self.reader:
            raise RuntimeError("PDF not loaded. Call load_pdf() first.")
        
        metadata = {}
        if hasattr(self.reader, 'metadata') and self.reader.metadata:
            for key, value in self.reader.metadata.items():
                # Clean up metadata keys (remove leading '/')
                clean_key = key.lstrip('/')
                metadata[clean_key] = str(value)
        
        return metadata
    
    def search_keywords(self, keywords, case_sensitive=False):
        """
        Search for keywords in the PDF text.
        
        Args:
            keywords: List of keywords to search for
            case_sensitive: Whether search should be case-sensitive
            
        Returns:
            Dictionary with keyword matches by page
        """
        if not isinstance(keywords, list):
            keywords = [keywords]
        
        all_text = self.extract_text(clean_spaces=True)
        results = {keyword: {} for keyword in keywords}
        
        for page_num, text in all_text.items():
            search_text = text if case_sensitive else text.lower()
            
            for keyword in keywords:
                search_keyword = keyword if case_sensitive else keyword.lower()
                
                if search_keyword in search_text:
                    # Find context around the keyword
                    lines = text.split('\n')
                    matching_lines = []
                    
                    for line in lines:
                        line_to_search = line if case_sensitive else line.lower()
                        if search_keyword in line_to_search:
                            matching_lines.append(line)
                    
                    if page_num not in results[keyword]:
                        results[keyword][page_num] = []
                    
                    results[keyword][page_num].extend(matching_lines)
        
        # Remove empty results
        return {k: v for k, v in results.items() if v}


def format_output(text_dict, metadata=None, include_page_numbers=True, output_file=None):
    """Format extracted text for display or file output."""
    output_lines = []
    
    # Add header
    output_lines.append("=" * 80)
    output_lines.append("PDF TEXT EXTRACTION REPORT")
    output_lines.append("=" * 80)
    output_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    output_lines.append("")
    
    # Add metadata if available
    if metadata:
        output_lines.append("PDF METADATA:")
        output_lines.append("-" * 40)
        for key, value in metadata.items():
            output_lines.append(f"  {key}: {value}")
        output_lines.append("")
    
    output_lines.append(f"Total pages extracted: {len(text_dict)}")
    output_lines.append("")
    
    # Add extracted text
    for page_num, text in sorted(text_dict.items()):
        if include_page_numbers:
            output_lines.append(f"{'=' * 40} Page {page_num} {'=' * 40}")
        
        if text:
            output_lines.append(text)
        else:
            output_lines.append("[No text found on this page]")
        
        output_lines.append("")  # Add spacing between pages
    
    output_lines.append("=" * 80)
    output_lines.append("End of report")
    output_lines.append("=" * 80)
    
    formatted_text = '\n'.join(output_lines)
    
    # Write to file if specified
    if output_file:
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(formatted_text)
            print(f"Output successfully written to: {output_file}")
        except Exception as e:
            print(f"Error writing to file {output_file}: {e}", file=sys.stderr)
    
    return formatted_text


def main():
    """Main function with command-line interface."""
    parser = argparse.ArgumentParser(
        description='Extract text from PDF files with improved formatting and error handling',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s Document1.pdf                    # Extract all pages to console
  %(prog)s Document1.pdf -o output.txt      # Save to file
  %(prog)s Document1.pdf -p 3               # Extract only page 3
  %(prog)s Document1.pdf -s "technology"    # Search for keyword "technology"
  %(prog)s Document1.pdf --no-clean         # Keep original spacing
        """
    )
    
    parser.add_argument('pdf_file', help='Path to the PDF file')
    parser.add_argument('-o', '--output', help='Output file path (optional)')
    parser.add_argument('-p', '--page', type=int, help='Extract specific page number')
    parser.add_argument('-s', '--search', nargs='+', help='Search for keywords in the PDF')
    parser.add_argument('--no-clean', action='store_true', help='Do not clean up whitespace')
    parser.add_argument('--no-page-numbers', action='store_true', help='Do not include page numbers in output')
    parser.add_argument('--case-sensitive', action='store_true', help='Case-sensitive keyword search')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    try:
        # Initialize extractor
        extractor = PDFExtractor(args.pdf_file)
        
        if args.verbose:
            print(f"Processing PDF: {args.pdf_file}")
        
        # Validate and load PDF
        extractor.validate_pdf()
        extractor.load_pdf()
        
        if args.verbose:
            print(f"PDF loaded successfully. Pages: {extractor.num_pages}")
        
        # Get metadata
        metadata = extractor.get_metadata()
        if args.verbose and metadata:
            print(f"PDF metadata: {metadata}")
        
        # Handle search functionality
        if args.search:
            if args.verbose:
                print(f"Searching for keywords: {args.search}")
            
            results = extractor.search_keywords(args.search, args.case_sensitive)
            
            if results:
                print(f"\n{'=' * 60}")
                print("SEARCH RESULTS")
                print('=' * 60)
                
                for keyword, matches in results.items():
                    print(f"\nKeyword: '{keyword}'")
                    print('-' * 40)
                    
                    if matches:
                        for page_num, lines in matches.items():
                            print(f"  Page {page_num}:")
                            for line in lines:
                                print(f"    - {line}")
                    else:
                        print("  No matches found")
                
                print('=' * 60)
            else:
                print(f"No matches found for keywords: {args.search}")
            
            return 0
        
        # Extract text
        text_dict = extractor.extract_text(
            page_num=args.page,
            clean_spaces=not args.no_clean
        )
        
        # Format and output
        formatted_output = format_output(
            text_dict=text_dict,
            metadata=metadata if args.verbose else None,
            include_page_numbers=not args.no_page_numbers,
            output_file=args.output
        )
        
        # Print to console if no output file specified
        if not args.output:
            print(formatted_output)
        
        if args.verbose:
            print(f"\nExtraction completed successfully!")
            if args.page:
                print(f"Extracted page {args.page} of {extractor.num_pages}")
            else:
                print(f"Extracted all {extractor.num_pages} pages")
        
        return 0
        
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1
    finally:
        # Ensure the file is closed
        if 'extractor' in locals():
            extractor.close()


if __name__ == "__main__":
    sys.exit(main())