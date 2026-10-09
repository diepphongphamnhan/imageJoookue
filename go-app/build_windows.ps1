# PowerShell script để biên dịch và tự động gom DLL trên Windows (MSYS2 MINGW64)
# Chạy script này từ terminal PowerShell hoặc trong MSYS2

param(
    [string]$MsysRoot = "C:\msys64",
    [string]$OutputDir = "dist"
)

Write-Host "=== [1/4] Thiết lập môi trường MinGW64 ===" -ForegroundColor Cyan
$MingwBin = "$MsysRoot\mingw64\bin"
if (Test-Path $MingwBin) {
    $env:PATH = "$MingwBin;$env:PATH"
    Write-Host "Đã thêm $MingwBin vào PATH" -ForegroundColor Green
} else {
    Write-Warning "Không tìm thấy thư mục $MingwBin. Đảm bảo bạn đã cài đặt MSYS2 tại C:\msys64"
}

$env:CGO_ENABLED = "1"
$env:PKG_CONFIG_PATH = "$MsysRoot\mingw64\lib\pkgconfig"

Write-Host "=== [2/4] Biên dịch FyneImageTools.exe ===" -ForegroundColor Cyan
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

go build -v -ldflags "-H=windowsgui -s -w" -o "$OutputDir\FyneImageTools.exe" .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Biên dịch Go thất bại! Vui lòng kiểm tra lại cấu hình CGo và ImageMagick."
    exit 1
}
Write-Host "Biên dịch thành công -> $OutputDir\FyneImageTools.exe" -ForegroundColor Green

Write-Host "=== [3/4] Tự động sao chép các file DLL phụ thuộc ===" -ForegroundColor Cyan
$requiredDLLs = @(
    "libMagickWand-*.dll",
    "libMagickCore-*.dll",
    "libwinpthread-1.dll",
    "libgcc_s_*.dll",
    "libstdc++-6.dll",
    "libgomp-1.dll",
    "libpng*.dll",
    "libjpeg*.dll",
    "libwebp*.dll",
    "libsharpyuv*.dll",
    "libtiff*.dll",
    "zlib1.dll",
    "liblzma-*.dll",
    "libbz2-*.dll",
    "libbrotli*.dll",
    "libfreetype-*.dll",
    "libxml2-*.dll"
)

foreach ($pattern in $requiredDLLs) {
    $found = Get-ChildItem -Path $MingwBin -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($file in $found) {
        $dest = Join-Path $OutputDir $file.Name
        Copy-Item -Path $file.FullName -Destination $dest -Force
        Write-Host "  [+] Copied: $($file.Name)" -ForegroundColor DarkGray
    }
}

Write-Host "=== [4/4] Hoàn tất đóng gói Standalone! ===" -ForegroundColor Green
Write-Host "Thư mục '$OutputDir' chứa file .exe và tất cả file DLL cần thiết." -ForegroundColor Yellow
Write-Host "Bạn có thể nén thư mục '$OutputDir' thành file ZIP và gửi cho bất kỳ ai chạy ngay." -ForegroundColor Green
