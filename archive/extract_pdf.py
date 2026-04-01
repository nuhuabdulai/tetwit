import PyPDF2

with open('Document1.pdf', 'rb') as file:
    reader = PyPDF2.PdfReader(file)
    num_pages = len(reader.pages)
    print(f"PDF has {num_pages} pages\n")
    
    for page_num in range(num_pages):
        page = reader.pages[page_num]
        text = page.extract_text()
        print(f"--- Page {page_num + 1} ---")
        print(text)
        print()