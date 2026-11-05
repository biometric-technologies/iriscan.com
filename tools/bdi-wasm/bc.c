/*
 * bc.c: browser build of the Iriscan Biometric Converter.
 *
 * The minutiae and record code is lib/converter.c of
 * biometric-technologies/biometric-converter, compiled unchanged with
 * CONVERTER_NO_IMAGE_DECODERS: the browser decodes PNG, JPEG and other
 * images itself and passes grey-scale pixels to raw2fmr(), so the page gives
 * the same records as the library. This file adds the WSQ codec, which the
 * page uses to show and save WSQ images, and thin exports for JavaScript.
 *
 * All outputs are malloc'ed; free them with bc_free().
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define API EMSCRIPTEN_KEEPALIVE
#else
#define API
#endif

#include <wsq.h>
#include <converter.h>

/* Message of the last WSQ failure; the converter keeps its own. */
static char wsq_err[128];

API const char *bc_last_error(void) {
    return wsq_err[0] ? wsq_err : converter_last_error();
}
API void *bc_malloc(int n) { return malloc(n); }
API void bc_free(void *p) { free(p); }

static int wsq_fail(int code, const char *msg) {
    snprintf(wsq_err, sizeof wsq_err, "%s (code %d)", msg, code);
    return code ? code : -1;
}

/* ---- WSQ <-> raw grey-scale ---------------------------------------- */

API int bc_wsq_decode(unsigned char *in, int len, unsigned char **out,
                      int *w, int *h, int *ppi) {
    int d, lossy, ret;
    wsq_err[0] = 0;
    ret = wsq_decode_mem(out, w, h, &d, ppi, &lossy, in, len);
    if (ret) return wsq_fail(ret, "WSQ decode failed");
    if (d != 8) { free(*out); return wsq_fail(-2, "WSQ depth is not 8 bit"); }
    return 0;
}

API int bc_wsq_encode(unsigned char *raw, int w, int h, int ppi, float bitrate,
                      unsigned char **out, int *olen) {
    int ret;
    wsq_err[0] = 0;
    ret = wsq_encode_mem(out, olen, bitrate, raw, w, h, 8, ppi > 0 ? ppi : -1,
                         (char *)NULL);
    if (ret) return wsq_fail(ret, "WSQ encode failed");
    return 0;
}

/* ---- converter ----------------------------------------------------- */

API int bc_raw2fmr(unsigned char *raw, int w, int h, int ppi, char *otype,
                   unsigned char **out, int *olen) {
    wsq_err[0] = 0;
    return raw2fmr(raw, w, h, ppi, otype, out, olen);
}

API int bc_fmr2fmr(unsigned char *in, int len, char *itype, char *otype,
                   unsigned char **out, int *olen) {
    wsq_err[0] = 0;
    return fmr2fmr(in, len, out, olen, itype, otype);
}
