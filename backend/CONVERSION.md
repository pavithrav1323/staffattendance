# Clinical Report DOCX conversion

The Clinical Report DOCX endpoint generates the existing PDF first, then converts that PDF with `pdf2docx`. The converter does not require Microsoft Word, COM automation, or LibreOffice.

Install the backend dependencies in every environment:

```text
npm install
python -m pip install -r requirements.txt
```

For Render, use a build command that installs both dependency sets before starting the backend, for example:

```text
npm install && python -m pip install -r requirements.txt && npm run build
```

The runtime must provide `python3` on Linux or `python`/`py` on Windows. Conversion files are created in a unique temporary directory and removed after each request, including failures.