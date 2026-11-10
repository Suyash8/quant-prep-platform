/* qf-fence.c — LD_PRELOAD shim that hides the wedged FUSE upload dir.
 * Any stat/open/access/opendir on /home/z/my-project/upload (or relative
 * "upload"/"upload/...") returns ENOENT so build toolchain walkers
 * (tsc, next dev, tailwind/postcss) never block on the hung mount. */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <string.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <dirent.h>
#include <unistd.h>
#include <stdlib.h>
#include <stdarg.h>
#include <sys/types.h>

#define FENCE_ABS "/home/z/my-project/upload"

static int fenced_abs(const char *p) {
    return p && strncmp(p, FENCE_ABS, sizeof(FENCE_ABS) - 1) == 0 &&
           (p[sizeof(FENCE_ABS) - 1] == '\0' || p[sizeof(FENCE_ABS) - 1] == '/');
}
static int fenced_rel(const char *p) {
    if (!p) return 0;
    if (strncmp(p, "upload", 6) != 0) return 0;
    return p[6] == '\0' || p[6] == '/';
}
static int fenced(const char *p) { return fenced_abs(p) || fenced_rel(p); }

typedef int (*statx_f)(int, const char *, int, unsigned int, struct statx *);
typedef int (*stat_f)(const char *, void *);
typedef int (*fstatat_f)(int, const char *, void *, int);
typedef int (*open_f)(const char *, int, ...);
typedef int (*openat_f)(int, const char *, int, ...);
typedef int (*access_f)(const char *, int);
typedef int (*faccessat_f)(int, const char *, int, int);
typedef DIR *(*opendir_f)(const char *);

int statx(int dirfd, const char *pathname, int flags, unsigned int mask, struct statx *stx) {
    if (fenced(pathname)) { errno = ENOENT; return -1; }
    static statx_f real;
    if (!real) real = (statx_f)dlsym(RTLD_NEXT, "statx");
    return real(dirfd, pathname, flags, mask, stx);
}
int stat(const char *p, struct stat *s) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static stat_f real;
    if (!real) real = (stat_f)dlsym(RTLD_NEXT, "stat");
    return real(p, s);
}
int stat64(const char *p, struct stat64 *s) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static stat_f real;
    if (!real) real = (stat_f)dlsym(RTLD_NEXT, "stat64");
    return real(p, s);
}
int lstat(const char *p, struct stat *s) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static stat_f real;
    if (!real) real = (stat_f)dlsym(RTLD_NEXT, "lstat");
    return real(p, s);
}
int lstat64(const char *p, struct stat64 *s) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static stat_f real;
    if (!real) real = (stat_f)dlsym(RTLD_NEXT, "lstat64");
    return real(p, s);
}
int fstatat(int dirfd, const char *p, struct stat *s, int flags) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static fstatat_f real;
    if (!real) real = (fstatat_f)dlsym(RTLD_NEXT, "fstatat");
    return real(dirfd, p, s, flags);
}
int fstatat64(int dirfd, const char *p, struct stat64 *s, int flags) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static fstatat_f real;
    if (!real) real = (fstatat_f)dlsym(RTLD_NEXT, "fstatat64");
    return real(dirfd, p, s, flags);
}
int open(const char *p, int flags, ...) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static open_f real;
    if (!real) real = (open_f)dlsym(RTLD_NEXT, "open");
    mode_t m = 0;
    if (flags & (O_CREAT | O_TMPFILE)) {
        va_list ap; va_start(ap, flags); m = va_arg(ap, mode_t); va_end(ap);
    }
    return real(p, flags, m);
}
int open64(const char *p, int flags, ...) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static open_f real;
    if (!real) real = (open_f)dlsym(RTLD_NEXT, "open64");
    mode_t m = 0;
    if (flags & (O_CREAT | O_TMPFILE)) {
        va_list ap; va_start(ap, flags); m = va_arg(ap, mode_t); va_end(ap);
    }
    return real(p, flags, m);
}
int openat(int dirfd, const char *p, int flags, ...) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static openat_f real;
    if (!real) real = (openat_f)dlsym(RTLD_NEXT, "openat");
    mode_t m = 0;
    if (flags & (O_CREAT | O_TMPFILE)) {
        va_list ap; va_start(ap, flags); m = va_arg(ap, mode_t); va_end(ap);
    }
    return real(dirfd, p, flags, m);
}
int openat64(int dirfd, const char *p, int flags, ...) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static openat_f real;
    if (!real) real = (openat_f)dlsym(RTLD_NEXT, "openat64");
    mode_t m = 0;
    if (flags & (O_CREAT | O_TMPFILE)) {
        va_list ap; va_start(ap, flags); m = va_arg(ap, mode_t); va_end(ap);
    }
    return real(dirfd, p, flags, m);
}
int access(const char *p, int mode) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static access_f real;
    if (!real) real = (access_f)dlsym(RTLD_NEXT, "access");
    return real(p, mode);
}
int faccessat(int dirfd, const char *p, int mode, int flags) {
    if (fenced(p)) { errno = ENOENT; return -1; }
    static faccessat_f real;
    if (!real) real = (faccessat_f)dlsym(RTLD_NEXT, "faccessat");
    return real(dirfd, p, mode, flags);
}
DIR *opendir(const char *p) {
    if (fenced(p)) { errno = ENOENT; return NULL; }
    static opendir_f real;
    if (!real) real = (opendir_f)dlsym(RTLD_NEXT, "opendir");
    return real(p);
}
