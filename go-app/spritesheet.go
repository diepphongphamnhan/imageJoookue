package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/gographics/imagick.v3/imagick"
)

// SpriteSheetConfig chứa cấu hình cho việc ghép Sprite Sheet
type SpriteSheetConfig struct {
	InputFiles []string // Danh sách đường dẫn ảnh các frame animation
	Columns    int      // Số cột (Grid Columns)
	Rows       int      // Số dòng (Grid Rows)
	OutputFile string   // File lưu kết quả (ví dụ: output_spritesheet.png)
	UseMontage bool     // true: Sử dụng mw.MontageImage; false: Tự composite pixel-perfect
}

// GenerateSpriteSheet sử dụng API MagickWand để ghép tập hợp các ảnh frame thành 1 Sprite Sheet
// với nền trong suốt (transparent background). Toàn bộ thực hiện thông qua CGo C-bindings,
// hoàn toàn KHÔNG sử dụng os/exec.
func GenerateSpriteSheet(cfg SpriteSheetConfig) (string, error) {
	if len(cfg.InputFiles) == 0 {
		return "", fmt.Errorf("danh sách file ảnh frame trống")
	}

	if cfg.Columns <= 0 {
		cfg.Columns = 1
	}
	if cfg.Rows <= 0 {
		// Tự động tính số dòng nếu không nhập hoặc bằng 0
		cfg.Rows = (len(cfg.InputFiles) + cfg.Columns - 1) / cfg.Columns
	}

	// Đảm bảo thư mục lưu file đầu ra đã tồn tại
	outDir := filepath.Dir(cfg.OutputFile)
	if outDir != "" && outDir != "." {
		if err := os.MkdirAll(outDir, 0755); err != nil {
			return "", fmt.Errorf("không thể tạo thư mục lưu sprite sheet: %w", err)
		}
	}

	// -------------------------------------------------------------
	// CÁCH 1: Sử dụng trực tiếp MagickMontageImage API của ImageMagick
	// Hàm C tương đương: MagickMontageImage(wand, drawing_wand, tile_geom, thumb_geom, mode, frame)
	// -------------------------------------------------------------
	if cfg.UseMontage {
		return generateUsingMontageAPI(cfg)
	}

	// -------------------------------------------------------------
	// CÁCH 2 (Mặc định cho Game Dev): Ghép lưới Transparent Pixel-Perfect
	// Sử dụng MagickNewImage (Canvas trong suốt) + MagickCompositeImage
	// Giữ nguyên độ sắc nét 100%, không bị co giãn thumbnail hay viền bevel
	// -------------------------------------------------------------
	return generateUsingCompositeGrid(cfg)
}

// generateUsingMontageAPI sử dụng trực tiếp hàm mw.MontageImage() của MagickWand
func generateUsingMontageAPI(cfg SpriteSheetConfig) (string, error) {
	// 1. Tạo một MagickWand cha để nạp danh sách các ảnh frame
	containerWand := imagick.NewMagickWand()
	defer containerWand.Destroy()

	// 2. Tạo PixelWand để cấu hình màu nền trong suốt ("none")
	bgWand := imagick.NewPixelWand()
	defer bgWand.Destroy()
	bgWand.SetColor("none") // Nền trong suốt RGBA (0, 0, 0, 0)

	// Đặt màu nền trong suốt cho container
	containerWand.SetBackgroundColor(bgWand)

	// Đọc tuần tự tất cả các frame vào wand container (tạo thành một chuỗi ảnh - image sequence)
	for idx, filePath := range cfg.InputFiles {
		err := containerWand.ReadImage(filePath)
		if err != nil {
			return "", fmt.Errorf("lỗi nạp frame %d ('%s'): %w", idx+1, filepath.Base(filePath), err)
		}
	}

	// 3. Khởi tạo DrawingWand cho tác vụ Montage
	dw := imagick.NewDrawingWand()
	defer dw.Destroy()
	dw.SetBackgroundColor(bgWand)
	dw.SetFillColor(bgWand)

	// 4. Chuẩn bị tham số cho hàm MontageImage:
	// - tileGeometry: số cột x số dòng, ví dụ "4x2" hoặc "4x"
	// - thumbnailGeometry: kích thước mỗi ô và khoảng cách viền, ví dụ "+0+0" (không viền khoảng cách)
	// - montageMode: MONTAGE_MODE_UNFRAME để không vẽ viền 3D/khung tranh xung quanh frame
	// - frameGeometry: chuỗi hình học khung (bỏ trống hoặc "+0+0")
	tileGeom := fmt.Sprintf("%dx%d", cfg.Columns, cfg.Rows)
	thumbGeom := "+0+0"

	// Gọi hàm MontageImage của thư viện CGo ImageMagick
	montagedWand := containerWand.MontageImage(
		dw,
		tileGeom,
		thumbGeom,
		imagick.MONTAGE_MODE_UNFRAME,
		"+0+0",
	)

	if montagedWand == nil {
		return "", fmt.Errorf("thao tác MontageImage thất bại, không tạo được ảnh ghép")
	}
	defer montagedWand.Destroy()

	// 5. Đảm bảo ảnh đầu ra định dạng PNG để giữ kênh trong suốt (Alpha Channel)
	if err := montagedWand.SetImageFormat("PNG"); err != nil {
		return "", fmt.Errorf("lỗi đặt định dạng PNG: %w", err)
	}

	// 6. Ghi ảnh kết quả ra file
	if err := montagedWand.WriteImage(cfg.OutputFile); err != nil {
		return "", fmt.Errorf("lỗi lưu file sprite sheet: %w", err)
	}

	return cfg.OutputFile, nil
}

// generateUsingCompositeGrid ghép các frame vào canvas trong suốt theo kích thước frame chuẩn
// Đảm bảo không bị méo ảnh, tính toán tọa độ x, y chính xác tuyệt đối
func generateUsingCompositeGrid(cfg SpriteSheetConfig) (string, error) {
	// Nạp thông tin kích thước của các frame để xác định cellWidth và cellHeight lớn nhất
	type frameInfo struct {
		path   string
		width  uint
		height uint
	}

	var frames []frameInfo
	var maxCellW uint = 0
	var maxCellH uint = 0

	// Duyệt qua từng ảnh để lấy kích thước
	tempWand := imagick.NewMagickWand()
	defer tempWand.Destroy()

	for _, file := range cfg.InputFiles {
		err := tempWand.ReadImage(file)
		if err != nil {
			return "", fmt.Errorf("lỗi đọc kích thước file '%s': %w", filepath.Base(file), err)
		}
		w := tempWand.GetImageWidth()
		h := tempWand.GetImageHeight()
		if w > maxCellW {
			maxCellW = w
		}
		if h > maxCellH {
			maxCellH = h
		}
		frames = append(frames, frameInfo{path: file, width: w, height: h})
		// Xóa ảnh hiện tại khỏi wand để nạp ảnh kế tiếp
		tempWand.RemoveImage()
	}

	if maxCellW == 0 || maxCellH == 0 {
		return "", fmt.Errorf("kích thước ảnh frame không hợp lệ")
	}

	// Tính toán kích thước toàn bộ Sprite Sheet
	totalWidth := uint(cfg.Columns) * maxCellW
	totalHeight := uint(cfg.Rows) * maxCellH

	// 1. Tạo Canvas MagickWand trống cho Sprite Sheet
	canvasWand := imagick.NewMagickWand()
	defer canvasWand.Destroy()

	// 2. Tạo PixelWand màu trong suốt
	bgPixel := imagick.NewPixelWand()
	defer bgPixel.Destroy()
	bgPixel.SetColor("none") // Alpha = 0

	// 3. Khởi tạo ảnh mới với kích thước totalWidth x totalHeight và nền trong suốt
	// Tương đương C: MagickNewImage(canvas, totalWidth, totalHeight, bgPixel)
	err := canvasWand.NewImage(totalWidth, totalHeight, bgPixel)
	if err != nil {
		return "", fmt.Errorf("lỗi khởi tạo canvas Sprite Sheet: %w", err)
	}

	// Đảm bảo Canvas hỗ trợ kênh Alpha
	canvasWand.SetImageAlphaChannel(imagick.ALPHA_CHANNEL_SET)

	// 4. Ghép từng frame vào đúng ô lưới (grid cell) bằng hàm MagickCompositeImage
	frameWand := imagick.NewMagickWand()
	defer frameWand.Destroy()

	for index, frame := range frames {
		if index >= cfg.Columns*cfg.Rows {
			break // Đã đầy ô lưới theo cấu hình
		}

		col := index % cfg.Columns
		row := index / cfg.Columns

		// Tọa độ góc trên bên trái của ô
		posX := int(uint(col) * maxCellW)
		posY := int(uint(row) * maxCellH)

		// Canh giữa frame nếu frame nhỏ hơn cell size
		offsetX := posX + int((maxCellW-frame.width)/2)
		offsetY := posY + int((maxCellH-frame.height)/2)

		// Đọc frame
		err := frameWand.ReadImage(frame.path)
		if err != nil {
			return "", fmt.Errorf("lỗi đọc frame '%s': %w", filepath.Base(frame.path), err)
		}

		// Ghép frame vào Canvas với Composite Operator "Over" (giữ kênh Alpha)
		// Tương đương C: MagickCompositeImage(canvas, frame, OverCompositeOp, MagickTrue, x, y)
		err = canvasWand.CompositeImage(frameWand, imagick.COMPOSITE_OP_OVER, true, offsetX, offsetY)
		if err != nil {
			return "", fmt.Errorf("lỗi ghép frame %d vào canvas: %w", index+1, err)
		}

		frameWand.RemoveImage()
	}

	// 5. Đặt định dạng xuất ra là PNG để bảo toàn nền trong suốt
	err = canvasWand.SetImageFormat("PNG")
	if err != nil {
		return "", fmt.Errorf("lỗi thiết lập định dạng PNG cho Sprite Sheet: %w", err)
	}

	// 6. Ghi ảnh ra đĩa
	err = canvasWand.WriteImage(cfg.OutputFile)
	if err != nil {
		return "", fmt.Errorf("lỗi lưu file Sprite Sheet: %w", err)
	}

	return cfg.OutputFile, nil
}
