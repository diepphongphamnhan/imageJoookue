package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/gographics/imagick.v3/imagick"
)

// AudioSyncPayload cấu trúc kịch bản âm thanh chuẩn để nhúng vào metadata ảnh Webtoon/Comic
type AudioSyncPayload struct {
	AudioSync AudioSyncDetail `json:"audio_sync"`
}

type AudioSyncDetail struct {
	Src     string  `json:"src"`     // Tên file âm thanh (vd: sfx_sword_slash.mp3)
	Trigger string  `json:"trigger"` // Sự kiện: on_scroll_view, on_center_screen, on_click
	Volume  float64 `json:"volume"`  // Âm lượng từ 0.0 đến 1.0
	Delay   int     `json:"delay"`   // Độ trễ tính bằng mili-giây (ms)
	Loop    bool    `json:"loop"`    // Lặp vô hạn (thích hợp cho BGM)
}

// -----------------------------------------------------------------------------
// TÍNH NĂNG 1: GẮN SIÊU DỮ LIỆU TÙY CHỈNH (CUSTOM METADATA / EXIF INJECTION)
// -----------------------------------------------------------------------------

// InjectCustomMetadata nhúng các cặp Key-Value trực tiếp vào cấu trúc file ảnh
// (PNG tEXt/iTXt, JPEG/WEBP EXIF Property) mà KHÔNG làm suy giảm chất lượng pixel ảnh.
func InjectCustomMetadata(inputPath, outputPath string, metadata map[string]string, keepOldExif bool) error {
	if _, err := os.Stat(inputPath); os.IsNotExist(err) {
		return fmt.Errorf("file nguồn không tồn tại: %s", inputPath)
	}

	outDir := filepath.Dir(outputPath)
	if outDir != "" && outDir != "." {
		if err := os.MkdirAll(outDir, 0755); err != nil {
			return fmt.Errorf("không thể tạo thư mục lưu: %w", err)
		}
	}

	// 1. Khởi tạo đối tượng MagickWand
	mw := imagick.NewMagickWand()
	defer mw.Destroy()

	// 2. Nạp ảnh vào bộ nhớ MagickWand
	if err := mw.ReadImage(inputPath); err != nil {
		return fmt.Errorf("lỗi đọc ảnh '%s': %w", filepath.Base(inputPath), err)
	}

	// 3. Xử lý tùy chọn ghi đè / xóa sạch EXIF cũ nếu người dùng chọn "Ghi đè hoàn toàn"
	if !keepOldExif {
		// MagickStripImage loại bỏ tất cả các profile (EXIF, IPTC, XMP, ICC, comment) cũ
		if err := mw.StripImage(); err != nil {
			return fmt.Errorf("lỗi làm sạch metadata cũ: %w", err)
		}
	}

	// 4. Duyệt qua từng cặp Key-Value và gọi API MagickSetImageProperty
	// Tương đương hàm C: MagickSetImageProperty(wand, property, value)
	for key, val := range metadata {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey == "" {
			continue
		}

		// Nhúng property chung vào cấu trúc Image Header
		if err := mw.SetImageProperty(trimmedKey, val); err != nil {
			return fmt.Errorf("lỗi gán thuộc tính '%s': %w", trimmedKey, err)
		}

		// Ánh xạ các trường chuẩn vào EXIF nếu là file JPEG/TIFF/WEBP
		lowerKey := strings.ToLower(trimmedKey)
		switch lowerKey {
		case "author", "artist":
			_ = mw.SetImageProperty("exif:Artist", val)
		case "copyright":
			_ = mw.SetImageProperty("exif:Copyright", val)
		case "description", "caption":
			_ = mw.SetImageProperty("exif:ImageDescription", val)
			_ = mw.SetImageProperty("comment", val)
		case "keywords":
			_ = mw.SetImageProperty("iptc:Keywords", val)
		}
	}

	// 5. Ghi ảnh ra đĩa
	if err := mw.WriteImage(outputPath); err != nil {
		return fmt.Errorf("lỗi ghi file với metadata mới '%s': %w", outputPath, err)
	}

	return nil
}

// -----------------------------------------------------------------------------
// TÍNH NĂNG 2: LIÊN KẾT KỊCH BẢN ÂM THANH (AUDIO SYNC MAPPER FOR WEBTOON/COMIC)
// -----------------------------------------------------------------------------

// InjectAudioSyncConfig đóng gói cấu hình âm thanh thành chuỗi JSON và nhúng vào metadata
// của bức ảnh truyện tranh để tạo thành file tự chứa kịch bản (self-contained comic frame).
func InjectAudioSyncConfig(inputPath, outputPath string, config AudioSyncDetail) error {
	payload := AudioSyncPayload{
		AudioSync: config,
	}

	// 1. Mã hóa kịch bản thành chuỗi chuẩn JSON (Indent để dễ đọc hoặc compact)
	jsonBytes, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return fmt.Errorf("lỗi tạo chuỗi JSON kịch bản âm thanh: %w", err)
	}
	jsonStr := string(jsonBytes)

	// Đảm bảo thư mục lưu tồn tại
	outDir := filepath.Dir(outputPath)
	if outDir != "" && outDir != "." {
		if err := os.MkdirAll(outDir, 0755); err != nil {
			return fmt.Errorf("không thể tạo thư mục lưu: %w", err)
		}
	}

	// 2. Khởi tạo MagickWand
	mw := imagick.NewMagickWand()
	defer mw.Destroy()

	if err := mw.ReadImage(inputPath); err != nil {
		return fmt.Errorf("lỗi đọc ảnh '%s': %w", filepath.Base(inputPath), err)
	}

	// 3. Nhúng chuỗi JSON vào metadata của ảnh:
	// - Khóa độc quyền định danh chuẩn: "comic_audio_config"
	// Với PNG: ImageMagick tự động đưa vào tEXt/iTXt chunk
	// Với JPEG/WEBP: đưa vào Image Properties và EXIF UserComment
	if err := mw.SetImageProperty("comic_audio_config", jsonStr); err != nil {
		return fmt.Errorf("lỗi nhúng trường comic_audio_config: %w", err)
	}

	// Đồng thời ánh xạ vào trường UserComment và Description để mọi trình xem ảnh chuẩn đều thấy
	_ = mw.SetImageProperty("exif:UserComment", jsonStr)
	_ = mw.SetImageProperty("comment", jsonStr)

	// 4. Ghi ảnh ra file đích
	if err := mw.WriteImage(outputPath); err != nil {
		return fmt.Errorf("lỗi lưu ảnh nhúng kịch bản âm thanh: %w", err)
	}

	return nil
}

// ReadEmbeddedMetadata đọc và trả về toàn bộ danh sách property của một file ảnh
// Giúp kiểm tra lại sau khi nhúng
func ReadEmbeddedMetadata(inputPath string) (map[string]string, error) {
	mw := imagick.NewMagickWand()
	defer mw.Destroy()

	if err := mw.ReadImage(inputPath); err != nil {
		return nil, fmt.Errorf("lỗi đọc ảnh: %w", err)
	}

	props := mw.GetImageProperties("*")
	result := make(map[string]string)
	for _, propName := range props {
		val := mw.GetImageProperty(propName)
		result[propName] = val
	}
	return result, nil
}
