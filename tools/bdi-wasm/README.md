# BDI converter: WebAssembly build

The in-browser converter on `/biometric-data-interchange` is the
[Iriscan Biometric Converter](https://github.com/biometric-technologies/biometric-converter)
library compiled to WebAssembly. Output: `assets/bdi/bc.js` and `assets/bdi/bc.wasm`.

- `lib/converter.c` of the converter is compiled unchanged, with
  `-DCONVERTER_NO_IMAGE_DECODERS`. The browser decodes PNG, JPEG, BMP and the
  other image formats itself and passes 8-bit grey-scale pixels to `raw2fmr`,
  so the page writes the same records as the library: ANSI INCITS 378-2004 and
  ISO/IEC 19794-2:2005 (record, normal card and compact card formats).
- `bc.c` exports `bc_raw2fmr`, `bc_fmr2fmr`, the NBIS WSQ codec
  (`bc_wsq_decode`, `bc_wsq_encode`) and memory helpers to JavaScript.
- `compat/sys/queue.h`: BSD queue macros, which Emscripten does not ship.

## Build

Emscripten 3.1.x. BiomDI is built with the converter's leak fix applied.

    git clone https://github.com/biometric-technologies/nist-biometric-image-software-nbis nbis
    git clone https://github.com/biometric-technologies/biometric-converter
    git clone https://github.com/usnistgov/biomdi
    (cd biomdi && git checkout acf76a030b0193faafb55fb469b27741b6aa8874 &&
     git apply ../biometric-converter/third_party/biomdi-free-unread-records.patch)
    tools/bdi-wasm/build_wasm.sh nbis biomdi biometric-converter

## Test

Build the native `convert` of the same converter commit (see its
`docs/REFERENCE.md`), then:

    node tools/bdi-wasm/test_node.js biometric-converter/example/sample_image.wsq <path to convert>

It converts the sample image to all four formats and every record to every
format, in WebAssembly and with the native tool, and checks that the bytes are
identical (20 conversions).
