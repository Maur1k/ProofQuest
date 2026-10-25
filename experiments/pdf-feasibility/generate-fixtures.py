"""Synthetic MIT-owned ProofQuest parser fixtures; no private or external source content."""
from pathlib import Path
import hashlib, json
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'public' / 'fixtures'
OUT.mkdir(parents=True, exist_ok=True)

def text_pdf(name, pages, lines):
    c = canvas.Canvas(str(OUT/name), pagesize=(612,792), invariant=1, pageCompression=1)
    c.setTitle('ProofQuest synthetic parser fixture')
    for page in range(1,pages+1):
        c.setFont('Helvetica-Bold',16)
        c.drawString(48,744,f'ProofQuest fixture - page {page}')
        c.setFont('Helvetica',10)
        c.drawString(48,719,f'PAGE_SENTINEL_{page:03d}')
        for row in range(lines):
            c.drawString(48,695-row*13,f'Page {page} line {row+1}: A variable stores a value. A loop repeats an action.')
        c.drawString(48,40,f'Page {page} of {pages}. Synthetic fixture, MIT licensed.')
        c.showPage()
    c.save()

text_pdf('text-three-pages.pdf',3,12)
text_pdf('text-thirty-pages.pdf',30,45)
image = Image.new('RGB',(1000,1200),'white')
draw=ImageDraw.Draw(image)
draw.text((70,120),'IMAGE ONLY - a scanned-page simulation',fill='black',font_size=32)
draw.text((70,220),'No PDF text layer. OCR is required.',fill='black',font_size=30)
c=canvas.Canvas(str(OUT/'image-only.pdf'),pagesize=(612,792),invariant=1)
c.drawImage(ImageReader(image),48,80,width=516,height=620)
c.save()
reader=PdfReader(OUT/'text-three-pages.pdf')
writer=PdfWriter()
for page in reader.pages:
    writer.add_page(page)
writer.encrypt('proofquest-fixture', algorithm='AES-128')
with (OUT/'password-protected.pdf').open('wb') as f:
    writer.write(f)
(OUT/'malformed.pdf').write_bytes(b'%PDF-1.7\nThis is intentionally not a valid PDF object structure.\n%%EOF\n')
manifest=[]
for p in sorted(OUT.glob('*.pdf')):
    manifest.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(OUT/'manifest.json').write_text(json.dumps({'license':'MIT, copyright 2026 Maur1k','source':'Synthetic fixtures created for ProofQuest; no third-party source documents','files':manifest},indent=2)+'\n',encoding='utf8')
print(json.dumps(manifest,indent=2))
