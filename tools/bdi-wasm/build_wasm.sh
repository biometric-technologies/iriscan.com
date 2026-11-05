#!/bin/sh
# Build assets/bdi/bc.js and bc.wasm (and bc_node.js for tests) with Emscripten.
#
#   tools/bdi-wasm/build_wasm.sh <nbis> <biomdi> <biometric-converter> [out dir]
#
# <nbis>: clone of biometric-technologies/nist-biometric-image-software-nbis
# <biomdi>: clone of usnistgov/biomdi with
#     <biometric-converter>/third_party/biomdi-free-unread-records.patch applied
# <biometric-converter>: clone of biometric-technologies/biometric-converter
set -eu
N=$(cd "$1" && pwd); B=$(cd "$2" && pwd); C=$(cd "$3" && pwd)
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=${4:-$HERE/../../assets/bdi}
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# an2k.h is generated from a template that names the NBIS data directory,
# which the converter does not use.
sed 's,SED_INSTALL_DATA_DIR_STRING,/nbis,' "$N/an2k/include/an2k.h.src" > "$WORK/an2k.h"

INC="-I$WORK -I$HERE/compat -I$C/include -I$N/commonnbis/include -I$N/imgtools/include \
-I$N/mindtct/include -I$N/an2k/include -I$B/common/src/include -I$B/fingerminutia/src/include"
CFLAGS="-O2 -w -D__NBISLE__ -DCONVERTER_NO_IMAGE_DECODERS"

# The image decoders (imgdecod.c, imgtype.c and the AN2K image decoding in
# dec_png.c, dec_jpeg2k.c, decode.c) are left out: the browser decodes.
SRCS="$(ls "$N"/imgtools/src/lib/wsq/*.c "$N"/mindtct/src/lib/mindtct/*.c \
  "$N"/commonnbis/src/lib/util/*.c "$N"/commonnbis/src/lib/ioutil/*.c \
  "$N"/commonnbis/src/lib/fet/*.c "$N"/imgtools/src/lib/jpegl/*.c \
  "$N"/imgtools/src/lib/image/*.c "$N"/an2k/src/lib/an2k/*.c \
  "$B"/fingerminutia/src/libfmr/*.c | grep -v -e '/imgdecod\.c$' -e '/imgtype\.c$' -e '/an2k/dec_png\.c$' -e '/an2k/dec_jpeg2k\.c$' -e '/an2k/decode\.c$') \
  $B/common/src/libbiomdi/biomdi.c $C/lib/converter.c"

i=0
for f in $SRCS; do
    i=$((i + 1))
    emcc -c $CFLAGS $INC "$f" -o "$WORK/$i.o"
done

LINK="$CFLAGS $INC $HERE/bc.c $WORK/*.o -sALLOW_MEMORY_GROWTH=1 -sMODULARIZE=1 \
-sEXPORT_NAME=BiometricConverter -sFILESYSTEM=0 \
-sEXPORTED_FUNCTIONS=['_bc_wsq_decode','_bc_wsq_encode','_bc_raw2fmr','_bc_fmr2fmr','_bc_last_error','_bc_malloc','_bc_free'] \
-sEXPORTED_RUNTIME_METHODS=['ccall','getValue','UTF8ToString','HEAPU8']"
emcc $LINK -sENVIRONMENT=node -sSINGLE_FILE=1 -o "$HERE/bc_node.js"
emcc $LINK -sENVIRONMENT=web,worker -o "$OUT/bc.js"
echo "built $OUT/bc.js, $OUT/bc.wasm and $HERE/bc_node.js"
