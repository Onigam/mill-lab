# Visual regression

Walks every world × mode of the kit's frame (and every drawing sheet) in headless Chrome and compares two builds
pixel by pixel. It is the quality gate "the frame is the same as Pelton Lab and nothing moved":

```bash
npm i --no-save puppeteer-core pixelmatch pngjs
npm run dev                                           # candidate on http://localhost:5173/
B=http://localhost:5173/ node tools/visual-regression/run.mjs          # screenshots only, to review
A=http://localhost:5400/ B=http://localhost:5173/ node tools/visual-regression/run.mjs   # compare two builds
MOBILE=1 B=… node tools/visual-regression/run.mjs                     # 390×844
```

Run it at 1280×800, 768×1024 (`--viewport` is not needed: set `MOBILE` or edit `viewport`) and 390×844 before a lab
is called finished. The residual difference between two identical builds is the live strip values and particles
(well under 0.2 % of the pixels).
