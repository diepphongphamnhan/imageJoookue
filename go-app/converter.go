package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/gographics/imagick.v3/imagick"
)

// BatchConvertTask chứa các thông số cần thiết cho tiến trình chuyển đổi hàng loạt
type BatchConvertTask struct {
	InputFiles   []string
	OutputDir    string
	TargetFormat string
	Quality      uint
}

// ConvertProgressCallback là hàm callback cập nhật tiến độ (index, total, currentFileName, err)
type ConvertProgressCallback func(current int, total int, filename string, err error)

// ConvertSingleImage thực hiện chuyển đổi một file ảnh duy nhất bằng MagickWand API.
// Toàn bộ logic sử dụng thư viện CGo gopkg.in/gographics/imagick.v3/imagick,
// hoàn toàn KHÔNG gọi lệnh terminal qua os/exec.
func ConvertSingleImage(inputPath, outputDir, targetFormat string, quality uint) (string, error) {
	// Kiểm tra sự tồn tại của file nguồn
	if _, err := os.Stat(inputPath); os.IsNotExist(err) {
		return "", fmt.Errorf("file nguồn không tồn tại: %s", inputPath)
	}

	// Đảm bảo thư mục đích đã tồn tại
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return "", fmt.Errorf("không thể tạo thư mục lưu: %w", err)
	}

	// 1. Khởi tạo một đối tượng MagickWand mới
	// Wand này đại diện cho con trỏ C trong MagickWand C-API
	mw := imagick.NewMagickWand()
	// BẮT BUỘC: Giải phóng bộ nhớ C khi kết thúc hàm để tránh memory leak trong CGo
	defer mw.Destroy()

	// 2. Đọc ảnh từ đường dẫn file vào MagickWand
	// Tương đương hàm C: MagickReadImage(wand, filename)
	err := mw.ReadImage(inputPath)
	if err != nil {
		return "", fmt.Errorf("lỗi đọc ảnh '%s': %w", filepath.Base(inputPath), err)
	}

	// Chuẩn hóa định dạng mục tiêu (ví dụ: "png", "jpeg", "webp")
	formatLower := strings.ToLower(targetFormat)
	formatUpper := strings.ToUpper(targetFormat)
	if formatLower == "jpg" {
		formatUpper = "JPEG"
	}

	// 3. Thiết lập định dạng đầu ra cho ảnh
	// Tương đương hàm C: MagickSetImageFormat(wand, format)
	err = mw.SetImageFormat(formatUpper)
	if err != nil {
		return "", fmt.Errorf("lỗi thiết lập định dạng %s: %w", targetFormat, err)
	}

	// 4. Thiết lập chất lượng nén (Compression Quality)
	// Áp dụng chủ yếu cho JPEG, WEBP, AVIF (thang điểm 1 -> 100)
	if quality > 0 && quality <= 100 {
		err = mw.SetImageCompressionQuality(quality)
		if err != nil {
			return "", fmt.Errorf("lỗi thiết lập chất lượng nén: %w", err)
		}
	}

	// 5. Xử lý kênh Alpha nếu chuyển từ định dạng có Alpha (PNG, WEBP) sang JPG
	// Vì JPG không hỗ trợ kênh trong suốt, nếu không xử lý nền trong suốt có thể bị đen
	if formatUpper == "JPEG" || formatUpper == "JPG" {
		// Kiểm tra xem ảnh có kênh Alpha không
		if mw.GetImageAlphaChannel() {
			pw := imagick.NewPixelWand()
			pw.SetColor("#FFFFFF") // Đặt nền trắng cho ảnh JPEG
			// Đặt màu nền và làm phẳng ảnh (flatten)
			mw.SetImageBackgroundColor(pw)
			flattened := mw.MergeImageLayers(imagick.IMAGE_LAYER_FLATTEN)
			pw.Destroy()
			if flattened != nil {
				defer flattened.Destroy()
				// Gán lại wand
				mw = flattened
			}
		}
	}

	// 6. Xây dựng tên file đầu ra
	baseName := strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))
	ext := "." + strings.ToLower(targetFormat)
	if strings.ToLower(targetFormat) == "jpeg" {
		ext = ".jpg"
	}
	outputPath := filepath.Join(outputDir, baseName+ext)

	// 7. Ghi ảnh ra file đích bằng MagickWand
	// Tương đương hàm C: MagickWriteImage(wand, filename)
	err = mw.WriteImage(outputPath)
	if err != nil {
		return "", fmt.Errorf("lỗi ghi file '%s': %w", outputPath, err)
	}

	return outputPath, nil
}

// RunBatchConversion xử lý hàng loạt ảnh theo cấu hình, gọi callback cập nhật tiến độ
func RunBatchConversion(task BatchConvertTask, callback ConvertProgressCallback) {
	total := len(task.InputFiles)
	for i, file := range task.InputFiles {
		_, err := ConvertSingleImage(file, task.OutputDir, task.TargetFormat, task.Quality)
		if callback != nil {
			callback(i+1, total, file, err)
		}
	}
}
