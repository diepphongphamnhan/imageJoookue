#!/bin/bash
# Script biên dịch tự động cho Linux (Ubuntu / Debian / Arch Linux)
set -e

echo "=== [1/4] Kiểm tra cấu hình pkg-config ImageMagick ==="
if ! command -v pkg-config &> /dev/null; then
    echo "Lỗi: Không tìm thấy pkg-config. Hãy cài đặt: sudo apt install pkg-config"
    exit 1
fi

export CGO_ENABLED=1
export PKG_CONFIG_PATH="/usr/lib/pkgconfig:/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH"

echo "=== [2/4] Thiết lập CGO flags ==="
export CGO_CFLAGS="$(pkg-config --cflags MagickWand 2>/dev/null || echo '-I/usr/include/ImageMagick-7')"
export CGO_LDFLAGS="$(pkg-config --libs MagickWand 2>/dev/null || echo '-lMagickWand-7.Q16HDRI -lMagickCore-7.Q16HDRI')"

echo "CGO_CFLAGS:  $CGO_CFLAGS"
echo "CGO_LDFLAGS: $CGO_LDFLAGS"

echo "=== [3/4] Biên dịch ứng dụng Fyne v2 ==="
mkdir -p dist
go build -v -ldflags "-s -w" -o dist/FyneImageTools-linux-x64 .

echo "=== [4/4] Hoàn tất! ==="
echo "File thực thi đã được tạo tại: dist/FyneImageTools-linux-x64"
ls -lh dist/FyneImageTools-linux-x64
