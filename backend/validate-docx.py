import zipfile, re, xml.etree.ElementTree as ET

with zipfile.ZipFile('temp-out.docx') as z:
    print('ZIP test:', z.testzip())
    data = z.read('word/document.xml').decode()
    m = re.search(r'<w:drawing.*?</w:drawing>', data, re.S)
    if m:
        ext = re.search(r'<wp:extent cx="(.*?)" cy="(.*?)"/>', m.group(0))
        print('Image extent:', ext.group(0) if ext else 'none')
    root = ET.fromstring(data)
    print('XML parsed OK')
    rels = z.read('word/_rels/document.xml.rels').decode()
    print('rels has footer:', 'footer' in rels)
    print('pgSz:', re.findall(r'<w:pgSz[^>]*>', data))
    print('pgMar:', re.findall(r'<w:pgMar[^>]*>', data))
    print('tblW:', re.findall(r'<w:tblW[^>]*>', data)[:3])
    print('tcW count:', len(re.findall(r'<w:tcW[^>]*>', data)))
