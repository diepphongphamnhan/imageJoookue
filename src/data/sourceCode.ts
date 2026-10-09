export interface CodeFile {
  id: string;
  name: string;
  language: string;
  description: string;
  content: string;
}

export const GO_MOD_CONTENT = `module fyne-imagemagick-tools

go 1.22

require (
	fyne.io/fyne/v2 v2.5.4
	gopkg.in/gographics/imagick.v3 v3.7.2
)
`;

export const CONVERTER_GO_CONTENT = `package main

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
`;

export const SPRITESHEET_GO_CONTENT = `package main

import (
	"fmt"
	"os"
	"path/filepath"

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
	// Màu nền trong suốt ("none") được thiết lập trên containerWand qua SetBackgroundColor.
	// DrawingWand chỉ cần thiết lập FillColor.
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
`;

export const MAIN_GO_CONTENT = `package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/storage"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"

	"gopkg.in/gographics/imagick.v3/imagick"
)

var supportedImageExts = []string{".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".gif", ".avif", ".tga"}

func isSupportedImage(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	for _, supported := range supportedImageExts {
		if ext == supported {
			return true
		}
	}
	return false
}

// scanFolderForImages quét và trả về tất cả các file ảnh trong một thư mục
func scanFolderForImages(dir string) []string {
	var images []string
	entries, err := os.ReadDir(dir)
	if err != nil {
		return images
	}

	for _, entry := range entries {
		if !entry.IsDir() && isSupportedImage(entry.Name()) {
			images = append(images, filepath.Join(dir, entry.Name()))
		}
	}
	// Sắp xếp tự nhiên theo tên file
	sort.Strings(images)
	return images
}

// showMultiFileSelector hiển thị hộp thoại Fyne cho phép chọn đồng thời nhiều file ảnh
func showMultiFileSelector(win fyne.Window, initialDir string, onSelected func(selectedPaths []string)) {
	if initialDir == "" {
		home, err := os.UserHomeDir()
		if err == nil {
			initialDir = home
		} else {
			initialDir = "."
		}
	}

	currentFolder := initialDir
	dirLabel := widget.NewLabelWithStyle("Thư mục: "+currentFolder, fyne.TextAlignLeading, fyne.TextStyle{Bold: true})

	// Danh sách các file có trong thư mục hiện tại
	var dirFiles []string
	selectedMap := make(map[string]bool)

	summaryLabel := widget.NewLabel("Đã chọn: 0 file")

	fileList := widget.NewList(
		func() int { return len(dirFiles) },
		func() fyne.CanvasObject {
			chk := widget.NewCheck("", nil)
			lbl := widget.NewLabel("")
			return container.NewHBox(chk, lbl)
		},
		func(id widget.ListItemID, obj fyne.CanvasObject) {
			box := obj.(*fyne.Container)
			chk := box.Objects[0].(*widget.Check)
			lbl := box.Objects[1].(*widget.Label)

			if id >= len(dirFiles) {
				return
			}
			fpath := dirFiles[id]
			fname := filepath.Base(fpath)
			lbl.SetText(fname)

			chk.OnChanged = nil
			chk.SetChecked(selectedMap[fpath])
			chk.OnChanged = func(checked bool) {
				selectedMap[fpath] = checked
				count := 0
				for _, v := range selectedMap {
					if v {
						count++
					}
				}
				summaryLabel.SetText(fmt.Sprintf("Đã chọn: %d / %d file", count, len(dirFiles)))
			}
		},
	)

	refreshList := func(newDir string) {
		currentFolder = newDir
		dirLabel.SetText("Thư mục: " + currentFolder)
		dirFiles = scanFolderForImages(currentFolder)
		selectedMap = make(map[string]bool)
		for _, f := range dirFiles {
			selectedMap[f] = true
		}
		summaryLabel.SetText(fmt.Sprintf("Đã chọn: %d / %d file", len(dirFiles), len(dirFiles)))
		fileList.Refresh()
	}

	// Đổi thư mục
	btnBrowseFolder := widget.NewButtonWithIcon("Đổi Thư Mục...", theme.FolderOpenIcon(), func() {
		fd := dialog.NewFolderOpen(func(lu fyne.ListableURI, err error) {
			if err != nil || lu == nil {
				return
			}
			refreshList(lu.Path())
		}, win)
		fd.Show()
	})

	btnSelectAll := widget.NewButton("Chọn Tất Cả", func() {
		for _, f := range dirFiles {
			selectedMap[f] = true
		}
		summaryLabel.SetText(fmt.Sprintf("Đã chọn: %d / %d file", len(dirFiles), len(dirFiles)))
		fileList.Refresh()
	})

	btnDeselectAll := widget.NewButton("Bỏ Chọn Hết", func() {
		for _, f := range dirFiles {
			selectedMap[f] = false
		}
		summaryLabel.SetText(fmt.Sprintf("Đã chọn: 0 / %d file", len(dirFiles)))
		fileList.Refresh()
	})

	topBar := container.NewVBox(
		container.NewHBox(dirLabel, btnBrowseFolder),
		container.NewHBox(btnSelectAll, btnDeselectAll, summaryLabel),
		widget.NewSeparator(),
	)

	content := container.NewBorder(topBar, nil, nil, nil, container.NewPadded(fileList))

	var customDlg dialog.Dialog
	btnConfirm := widget.NewButtonWithIcon("Xác Nhận Thêm File", theme.ConfirmIcon(), func() {
		var result []string
		for _, f := range dirFiles {
			if selectedMap[f] {
				result = append(result, f)
			}
		}
		if onSelected != nil && len(result) > 0 {
			onSelected(result)
		}
		customDlg.Hide()
	})
	btnConfirm.Importance = widget.HighImportance

	btnCancel := widget.NewButtonWithIcon("Hủy", theme.CancelIcon(), func() {
		customDlg.Hide()
	})

	dlgContainer := container.NewBorder(
		nil,
		container.NewHBox(btnCancel, btnConfirm),
		nil, nil,
		content,
	)

	customDlg = dialog.NewCustomWithoutButtons("Chọn Nhiều File Ảnh Cùng Lúc", dlgContainer, win)
	customDlg.Resize(fyne.NewSize(620, 480))

	refreshList(initialDir)
	customDlg.Show()
}

func main() {
	// BẮT BUỘC: Khởi tạo ImageMagick C-Environment trước khi dùng bất kỳ hàm CGo nào
	imagick.Initialize()
	// BẮT BUỘC: Giải phóng tài nguyên môi trường ImageMagick khi ứng dụng tắt
	defer imagick.Terminate()

	// Khởi tạo ứng dụng Fyne v2
	myApp := app.NewWithID("com.developer.fyne.imagick.suite")
	mainWindow := myApp.NewWindow("Trình Xử Lý Ảnh Hàng Loạt & Tạo Sprite Sheet - Fyne v2")
	mainWindow.Resize(fyne.NewSize(880, 660))
	mainWindow.CenterOnScreen()

	// Xây dựng 2 màn hình tính năng chính bằng Fyne Container Tabs
	batchTab, addBatchFiles := buildBatchConverterTab(mainWindow)
	spriteTab, addSpriteFiles := buildSpriteSheetTab(mainWindow)

	tabs := container.NewAppTabs(
		container.NewTabItemWithIcon("Chuyển Đổi Hàng Loạt", theme.StorageIcon(), batchTab),
		container.NewTabItemWithIcon("Tạo Sprite Sheet", theme.GridIcon(), spriteTab),
	)
	tabs.SetTabLocation(container.TabLocationTop)

	// HỖ TRỢ KÉO THẢ NHIỀU FILE (DRAG & DROP MULTI-FILE NATIVE):
	// Người dùng có thể kéo thả hàng chục file ảnh trực tiếp từ File Explorer vào cửa sổ ứng dụng!
	mainWindow.SetOnDropped(func(pos fyne.Position, uris []fyne.URI) {
		var droppedPaths []string
		for _, u := range uris {
			p := u.Path()
			fi, err := os.Stat(p)
			if err == nil && fi.IsDir() {
				folderImgs := scanFolderForImages(p)
				droppedPaths = append(droppedPaths, folderImgs...)
			} else if isSupportedImage(p) {
				droppedPaths = append(droppedPaths, p)
			}
		}

		if len(droppedPaths) > 0 {
			if tabs.SelectedIndex() == 0 {
				addBatchFiles(droppedPaths)
			} else {
				addSpriteFiles(droppedPaths)
			}
			dialog.ShowInformation("Đã Thêm File", fmt.Sprintf("Đã tự động nạp %d file ảnh qua kéo thả!", len(droppedPaths)), mainWindow)
		}
	})

	mainWindow.SetContent(tabs)
	mainWindow.ShowAndRun()
}

// -----------------------------------------------------------------------------
// TÍNH NĂNG 1: GIAO DIỆN CHUYỂN ĐỔI ẢNH HÀNG LOẠT (BATCH CONVERTER)
// -----------------------------------------------------------------------------
func buildBatchConverterTab(win fyne.Window) (fyne.CanvasObject, func([]string)) {
	var selectedFiles []string
	var outputDirectory string

	titleLabel := widget.NewLabelWithStyle(
		"Bộ Chuyển Đổi Định Dạng Ảnh Hàng Loạt (Batch Converter)",
		fyne.TextAlignLeading,
		fyne.TextStyle{Bold: true},
	)
	descLabel := widget.NewLabel(
		"Chọn nhiều file ảnh hoặc nạp cả thư mục cùng một lúc để chuyển đổi định dạng hàng loạt.",
	)

	filesCountLabel := widget.NewLabel("Chưa chọn file ảnh nào (Có thể kéo thả nhiều file vào đây)")
	fileListWidget := widget.NewList(
		func() int { return len(selectedFiles) },
		func() fyne.CanvasObject {
			return widget.NewLabel("Đường dẫn file ảnh")
		},
		func(id widget.ListItemID, obj fyne.CanvasObject) {
			obj.(*widget.Label).SetText(fmt.Sprintf("%d. %s", id+1, filepath.Base(selectedFiles[id])))
		},
	)

	addFiles := func(newPaths []string) {
		addedCount := 0
		for _, newPath := range newPaths {
			exists := false
			for _, f := range selectedFiles {
				if f == newPath {
					exists = true
					break
				}
			}
			if !exists {
				selectedFiles = append(selectedFiles, newPath)
				addedCount++
			}
		}
		filesCountLabel.SetText(fmt.Sprintf("Đã chọn: %d file ảnh", len(selectedFiles)))
		fileListWidget.Refresh()
	}

	btnSelectMultiFiles := widget.NewButtonWithIcon("Chọn Nhiều File...", theme.FileImageIcon(), func() {
		initialDir := ""
		if len(selectedFiles) > 0 {
			initialDir = filepath.Dir(selectedFiles[len(selectedFiles)-1])
		}
		showMultiFileSelector(win, initialDir, func(paths []string) {
			addFiles(paths)
		})
	})

	btnAddFolder := widget.NewButtonWithIcon("Nạp Cả Thư Mục...", theme.FolderOpenIcon(), func() {
		dd := dialog.NewFolderOpen(func(lu fyne.ListableURI, err error) {
			if err != nil || lu == nil {
				return
			}
			imgs := scanFolderForImages(lu.Path())
			if len(imgs) == 0 {
				dialog.ShowInformation("Thông Báo", "Không tìm thấy file ảnh hợp lệ nào trong thư mục đã chọn!", win)
				return
			}
			addFiles(imgs)
			dialog.ShowInformation("Nạp Thành Công", fmt.Sprintf("Đã nạp thành công %d file ảnh từ thư mục:\\n%s", len(imgs), lu.Path()), win)
		}, win)
		dd.Show()
	})

	btnClearFiles := widget.NewButtonWithIcon("Xóa Hết", theme.DeleteIcon(), func() {
		selectedFiles = nil
		filesCountLabel.SetText("Chưa chọn file ảnh nào")
		fileListWidget.Refresh()
	})

	formatOptions := []string{"PNG", "JPG", "WEBP", "BMP", "TIFF", "GIF", "AVIF"}
	formatSelect := widget.NewSelect(formatOptions, nil)
	formatSelect.SetSelected("PNG")

	qualityLabel := widget.NewLabel("Chất lượng nén: 90%")
	qualitySlider := widget.NewSlider(1, 100)
	qualitySlider.SetValue(90)
	qualitySlider.OnChanged = func(val float64) {
		qualityLabel.SetText(fmt.Sprintf("Chất lượng nén: %d%%", int(val)))
	}

	outDirLabel := widget.NewLabel("Thư mục lưu: (Chưa chọn - sẽ lưu cùng thư mục ảnh gốc)")
	btnSelectOutDir := widget.NewButtonWithIcon("Chọn Thư Mục Lưu...", theme.FolderOpenIcon(), func() {
		dd := dialog.NewFolderOpen(func(lu fyne.ListableURI, err error) {
			if err != nil || lu == nil {
				return
			}
			outputDirectory = lu.Path()
			outDirLabel.SetText(fmt.Sprintf("Thư mục lưu: %s", outputDirectory))
		}, win)
		dd.Show()
	})

	progressBar := widget.NewProgressBar()
	progressBar.SetValue(0)
	statusLabel := widget.NewLabel("Sẵn sàng. (Hỗ trợ kéo thả nhiều file vào đây)")

	var btnConvert *widget.Button
	btnConvert = widget.NewButtonWithIcon("Bắt Đầu Chuyển Đổi Hàng Loạt", theme.MediaPlayIcon(), func() {
		if len(selectedFiles) == 0 {
			dialog.ShowInformation("Thông Báo", "Vui lòng chọn ít nhất một file ảnh để chuyển đổi!", win)
			return
		}

		if outputDirectory == "" {
			outputDirectory = filepath.Dir(selectedFiles[0])
			outDirLabel.SetText(fmt.Sprintf("Thư mục lưu: %s", outputDirectory))
		}

		btnConvert.Disable()
		progressBar.SetValue(0)
		statusLabel.SetText("Đang bắt đầu chuyển đổi...")

		targetFormat := formatSelect.Selected
		quality := uint(qualitySlider.Value)

		go func() {
			total := len(selectedFiles)
			successCount := 0
			failCount := 0

			for i, file := range selectedFiles {
				currentIdx := i + 1
				_, err := ConvertSingleImage(file, outputDirectory, targetFormat, quality)

				progressVal := float64(currentIdx) / float64(total)
				if err != nil {
					failCount++
				} else {
					successCount++
				}

				progressBar.SetValue(progressVal)
				statusLabel.SetText(fmt.Sprintf("Đang xử lý (%d/%d): %s", currentIdx, total, filepath.Base(file)))
			}

			btnConvert.Enable()
			statusMsg := fmt.Sprintf("Hoàn tất! Thành công: %d, Thất bại: %d", successCount, failCount)
			statusLabel.SetText(statusMsg)

			dialog.ShowInformation("Chuyển Đổi Hoàn Tất",
				fmt.Sprintf("Đã chuyển đổi thành công %d/%d file ảnh sang định dạng %s.\\nThư mục lưu: %s",
					successCount, total, targetFormat, outputDirectory), win)
		}()
	})
	btnConvert.Importance = widget.HighImportance

	leftPanel := container.NewVBox(
		titleLabel,
		descLabel,
		widget.NewSeparator(),
		container.NewHBox(btnSelectMultiFiles, btnAddFolder, btnClearFiles),
		filesCountLabel,
		widget.NewSeparator(),
		widget.NewLabelWithStyle("Tùy Chọn Định Dạng:", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
		formatSelect,
		qualityLabel,
		qualitySlider,
		widget.NewSeparator(),
		widget.NewLabelWithStyle("Vị Trí Lưu:", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
		btnSelectOutDir,
		outDirLabel,
		widget.NewSeparator(),
		btnConvert,
		progressBar,
		statusLabel,
	)

	split := container.NewHSplit(
		container.NewPadded(leftPanel),
		container.NewPadded(container.NewBorder(
			widget.NewLabelWithStyle("Danh Sách File Đã Nạp:", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
			nil, nil, nil,
			fileListWidget,
		)),
	)
	split.SetOffset(0.55)

	return split, addFiles
}

// -----------------------------------------------------------------------------
// TÍNH NĂNG 2: GIAO DIỆN TẠO SPRITE SHEET (SPRITESHEET GENERATOR)
// -----------------------------------------------------------------------------
func buildSpriteSheetTab(win fyne.Window) (fyne.CanvasObject, func([]string)) {
	var frameFiles []string
	var saveFilePath string

	titleLabel := widget.NewLabelWithStyle(
		"Trình Ghép Sprite Sheet Hoạt Họa (MagickWand Montage)",
		fyne.TextAlignLeading,
		fyne.TextStyle{Bold: true},
	)
	descLabel := widget.NewLabel(
		"Chọn chuỗi frame animation cùng lúc để ghép thành 1 Sprite Sheet dạng lưới với nền trong suốt.",
	)

	framesCountLabel := widget.NewLabel("Chưa nạp frame hoạt họa nào (Có thể kéo thả nhiều file vào đây)")
	frameListWidget := widget.NewList(
		func() int { return len(frameFiles) },
		func() fyne.CanvasObject {
			return widget.NewLabel("Tên frame")
		},
		func(id widget.ListItemID, obj fyne.CanvasObject) {
			obj.(*widget.Label).SetText(fmt.Sprintf("#%d: %s", id+1, filepath.Base(frameFiles[id])))
		},
	)

	addFrames := func(newPaths []string) {
		for _, p := range newPaths {
			frameFiles = append(frameFiles, p)
		}
		framesCountLabel.SetText(fmt.Sprintf("Đã nạp: %d frame", len(frameFiles)))
		frameListWidget.Refresh()
	}

	btnSelectFrames := widget.NewButtonWithIcon("Chọn Nhiều Frame...", theme.FileImageIcon(), func() {
		initialDir := ""
		if len(frameFiles) > 0 {
			initialDir = filepath.Dir(frameFiles[len(frameFiles)-1])
		}
		showMultiFileSelector(win, initialDir, func(paths []string) {
			addFrames(paths)
		})
	})

	btnAddFolder := widget.NewButtonWithIcon("Nạp Cả Thư Mục...", theme.FolderOpenIcon(), func() {
		dd := dialog.NewFolderOpen(func(lu fyne.ListableURI, err error) {
			if err != nil || lu == nil {
				return
			}
			imgs := scanFolderForImages(lu.Path())
			if len(imgs) == 0 {
				dialog.ShowInformation("Thông Báo", "Không tìm thấy file ảnh frame nào trong thư mục!", win)
				return
			}
			addFrames(imgs)
			dialog.ShowInformation("Nạp Frame Thành Công", fmt.Sprintf("Đã nạp %d frame theo thứ tự từ thư mục:\\n%s", len(imgs), lu.Path()), win)
		}, win)
		dd.Show()
	})

	btnClearFrames := widget.NewButtonWithIcon("Xóa Hết", theme.DeleteIcon(), func() {
		frameFiles = nil
		framesCountLabel.SetText("Chưa nạp frame hoạt họa nào")
		frameListWidget.Refresh()
	})

	colEntry := widget.NewEntry()
	colEntry.SetText("4")
	rowEntry := widget.NewEntry()
	rowEntry.SetText("2")

	algoCheck := widget.NewCheck("Sử dụng MagickMontageImage API (Mặc định: Ghép Lưới Pixel-Perfect)", nil)
	algoCheck.SetChecked(false)

	savePathLabel := widget.NewLabel("File lưu: (Chưa chọn vị trí lưu)")
	btnSaveFile := widget.NewButtonWithIcon("Chọn Vị Trí Lưu File (.png)...", theme.DocumentSaveIcon(), func() {
		sd := dialog.NewFileSave(func(writer fyne.URIWriteCloser, err error) {
			if err != nil || writer == nil {
				return
			}
			p := writer.URI().Path()
			if !strings.HasSuffix(strings.ToLower(p), ".png") {
				p += ".png"
			}
			saveFilePath = p
			savePathLabel.SetText(fmt.Sprintf("File lưu: %s", saveFilePath))
		}, win)
		sd.SetFileName("spritesheet.png")
		sd.SetFilter(storage.NewExtensionFileFilter([]string{".png"}))
		sd.Show()
	})

	statusLabel := widget.NewLabel("Sẵn sàng ghép Sprite Sheet.")
	progressBar := widget.NewProgressBarInfinite()
	progressBar.Hide()

	var btnGenerate *widget.Button
	btnGenerate = widget.NewButtonWithIcon("Tạo Sprite Sheet", theme.ContentAddIcon(), func() {
		if len(frameFiles) == 0 {
			dialog.ShowInformation("Thông Báo", "Vui lòng chọn ít nhất một file ảnh frame!", win)
			return
		}

		cols, errCol := strconv.Atoi(colEntry.Text)
		rows, errRow := strconv.Atoi(rowEntry.Text)
		if errCol != nil || cols <= 0 {
			dialog.ShowError(fmt.Errorf("số cột (Columns) phải là số nguyên dương"), win)
			return
		}
		if errRow != nil || rows <= 0 {
			rows = (len(frameFiles) + cols - 1) / cols
			rowEntry.SetText(strconv.Itoa(rows))
		}

		if saveFilePath == "" {
			saveFilePath = filepath.Join(filepath.Dir(frameFiles[0]), "spritesheet.png")
			savePathLabel.SetText(fmt.Sprintf("File lưu: %s", saveFilePath))
		}

		btnGenerate.Disable()
		progressBar.Show()
		statusLabel.SetText("Đang xử lý ghép ảnh với MagickWand C-API...")

		cfg := SpriteSheetConfig{
			InputFiles: frameFiles,
			Columns:    cols,
			Rows:       rows,
			OutputFile: saveFilePath,
			UseMontage: algoCheck.Checked,
		}

		go func() {
			out, err := GenerateSpriteSheet(cfg)
			progressBar.Hide()
			btnGenerate.Enable()

			if err != nil {
				statusLabel.SetText(fmt.Sprintf("Lỗi: %v", err))
				dialog.ShowError(fmt.Errorf("Lỗi tạo Sprite Sheet: %w", err), win)
				return
			}

			statusLabel.SetText(fmt.Sprintf("Thành công! Đã tạo: %s", filepath.Base(out)))
			dialog.ShowInformation("Hoàn Tất Tạo Sprite Sheet",
				fmt.Sprintf("Đã tạo thành công Sprite Sheet dạng lưới %d x %d nền trong suốt!\\nFile lưu: %s",
					cols, rows, out), win)
		}()
	})
	btnGenerate.Importance = widget.HighImportance

	gridForm := container.NewGridWithColumns(2,
		widget.NewLabel("Số Cột (Columns):"), colEntry,
		widget.NewLabel("Số Dòng (Rows):"), rowEntry,
	)

	leftPanel := container.NewVBox(
		titleLabel,
		descLabel,
		widget.NewSeparator(),
		container.NewHBox(btnSelectFrames, btnAddFolder, btnClearFrames),
		framesCountLabel,
		widget.NewSeparator(),
		widget.NewLabelWithStyle("Cấu Hình Lưới (Grid Matrix):", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
		gridForm,
		algoCheck,
		widget.NewSeparator(),
		widget.NewLabelWithStyle("Nơi Xuất File:", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
		btnSaveFile,
		savePathLabel,
		widget.NewSeparator(),
		btnGenerate,
		progressBar,
		statusLabel,
	)

	split := container.NewHSplit(
		container.NewPadded(leftPanel),
		container.NewPadded(container.NewBorder(
			widget.NewLabelWithStyle("Thứ Tự Các Frame Hoạt Họa:", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
			nil, nil, nil,
			frameListWidget,
		)),
	)
	split.SetOffset(0.55)

	return split, addFrames
}
`;

export const BUILD_INSTRUCTIONS_CONTENT = `================================================================================
HƯỚNG DẪN ĐÓNG GÓI (BUILD) ĐỘC LẬP - FYNE V2 & IMAGEMAGICK CGO (STANDALONE ARCHITECTURE)
================================================================================
Tác giả: Senior Golang & CGo Systems Engineer
Dự án: Fyne v2 Batch Image Converter & Sprite Sheet Generator
Thư viện CGo: gopkg.in/gographics/imagick.v3/imagick
Mục tiêu: Đóng gói thành file thực thi (.exe trên Windows, binary trên Linux) để
người dùng cuối (End-user) KHÔNG CẦN CÀI ĐẶT ImageMagick vẫn chạy bình thường 100%.

================================================================================
MỤC LỤC
================================================================================
1. Nguyên lý Standalone & Rào cản CGo với ImageMagick
2. Hướng dẫn Build trên LINUX (Ubuntu, Debian, Arch Linux)
   2.1. Cấu hình Biến Môi Trường (PKG_CONFIG_PATH, CGO_CFLAGS, CGO_LDFLAGS)
   2.2. Build Tĩnh (Static Linking) với libMagickWand.a và libMagickCore.a
3. Hướng dẫn Build trên WINDOWS (MSYS2 / MinGW-w64)
   3.1. Thiết lập Toolchain MSYS2 & ImageMagick MinGW
   3.2. Lệnh Biên Dịch Không Hiện Màn Hình Đen (Console Window)
   3.3. Danh Sách Đầy Đủ Các File DLL Bắt Buộc Copy Cạnh .exe
   3.4. Script PowerShell / Bash Tự Động Gom Tất Cả DLL Cần Thiết
4. Các lỗi thường gặp (Troubleshooting) và Cách khắc phục
5. Tối ưu kích thước Binary (Strip Symbols & UPX)

================================================================================
1. NGUYÊN LÝ STANDALONE & RÀO CẢN CGO VỚI IMAGEMAGICK
================================================================================
Thư viện \`imagick.v3\` gọi trực tiếp vào C-API (MagickWand & MagickCore) của ImageMagick.
Mặc định, khi biên dịch động (Dynamic Linking):
- Trên Linux: Ứng dụng liên kết với \`libMagickWand-7.Q16HDRI.so\`.
- Trên Windows: Ứng dụng cần các file DLL tương ứng nằm trong PATH hoặc cùng thư mục file .exe.

Để biến ứng dụng thành "Standalone" (chạy trên bất kỳ máy tính nào của người dùng):
- Chiến lược A (Khuyên dùng cho Windows): Dynamic Linking kèm Portable DLLs:
  Đặt tất cả các file DLL phụ thuộc (ImageMagick + MinGW runtime + Image Codecs)
  vào cùng thư mục chứa file \`.exe\`. Windows luôn ưu tiên tìm DLL ở thư mục chứa exe trước tiên.
- Chiến lược B (Khuyên dùng cho Linux): Static Linking:
  Biên dịch tĩnh hoàn toàn các file \`.a\` vào thẳng bên trong ELF binary của Go.

================================================================================
2. HƯỚNG DẪN BUILD TRÊN LINUX (UBUNTU / DEBIAN / ARCH LINUX)
================================================================================

2.1. Cài Đặt Thư Viện Phát Triển (Development Headers):
-----------------------------------------------------------------------------
* Trên Ubuntu 22.04 / 24.04 / Debian 12:
  sudo apt-get update
  sudo apt-get install -y gcc pkg-config libgl1-mesa-dev xorg-dev \\
      libmagickwand-dev libmagickcore-dev

* Trên Arch Linux / Manjaro:
  sudo pacman -Syu --needed base-devel imagemagick pkgconf libgl xorg-server-devel

2.2. Cấu Hình Biến Môi Trường CGO:
-----------------------------------------------------------------------------
Kiểm tra cấu hình MagickWand của hệ thống:
  pkg-config --cflags MagickWand
  pkg-config --libs MagickWand

Nếu ImageMagick được cài đặt tại đường dẫn chuẩn (/usr hoặc /usr/local),
bạn chỉ cần export:
  export CGO_ENABLED=1
  export PKG_CONFIG_PATH="/usr/lib/pkgconfig:/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH"
  export CGO_CFLAGS="$(pkg-config --cflags MagickWand)"
  export CGO_LDFLAGS="$(pkg-config --libs MagickWand)"

Nếu bạn tự biên dịch ImageMagick 7 vào một thư mục riêng (ví dụ: /opt/imagemagick):
  export PKG_CONFIG_PATH="/opt/imagemagick/lib/pkgconfig:$PKG_CONFIG_PATH"
  export CGO_CFLAGS="-I/opt/imagemagick/include/ImageMagick-7"
  export CGO_LDFLAGS="-L/opt/imagemagick/lib -lMagickWand-7.Q16HDRI -lMagickCore-7.Q16HDRI"

2.3. Hướng Dẫn Build Tĩnh Hoàn Toàn (Static Linking) Trên Linux:
-----------------------------------------------------------------------------
Để file binary chạy được trên bất kỳ máy Linux nào mà không cần cài ImageMagick:

Bước 1: Tự compile ImageMagick thành các file thư viện tĩnh (.a)
  git clone https://github.com/ImageMagick/ImageMagick.git
  cd ImageMagick
  ./configure --prefix=/opt/im7-static \\
              --enable-static \\
              --disable-shared \\
              --with-quantum-depth=16 \\
              --enable-hdri=yes \\
              --without-x \\
              --with-png=yes \\
              --with-jpeg=yes \\
              --with-webp=yes \\
              --with-zlib=yes
  make -j$(nproc)
  sudo make install

Bước 2: Cấu hình Go để liên kết với các file .a:
  export CGO_ENABLED=1
  export PKG_CONFIG_PATH="/opt/im7-static/lib/pkgconfig"
  
  # Cờ linking tĩnh tích hợp đầy đủ các codec ảnh phụ thuộc:
  export CGO_LDFLAGS="-L/opt/im7-static/lib \\
    /opt/im7-static/lib/libMagickWand-7.Q16HDRI.a \\
    /opt/im7-static/lib/libMagickCore-7.Q16HDRI.a \\
    -lpng -ljpeg -lwebp -lwebpmux -lz -lm -lgomp -lpthread -ldl"

Bước 3: Biên dịch file Go:
  go build -tags osusergo,netgo \\
    -ldflags="-extldflags '-static -lGL -lX11' -s -w" \\
    -o FyneImageTools-linux-x64 .

Lưu ý với Fyne: Do Fyne sử dụng OpenGL (libGL.so, X11), nên chỉ cần liên kết tĩnh
ImageMagick còn các thư viện driver đồ họa hệ thống (Mesa / Nvidia) nên để dynamic
để tương thích phần cứng card màn hình của user.

================================================================================
3. HƯỚNG DẪN BUILD TRÊN WINDOWS (MSYS2 / MINGW-W64)
================================================================================
Đây là phương pháp chuẩn mực và tối ưu nhất để tạo file .exe độc lập chạy trên
mọi máy tính Windows 10/11 mà KHÔNG bắt người dùng cài đặt ImageMagick.

3.1. Thiết Lập Môi Trường MSYS2:
-----------------------------------------------------------------------------
1. Tải và cài đặt MSYS2 từ https://www.msys2.org/
2. Mở terminal "MSYS2 MINGW64" (Cực kỳ quan trọng: Phải mở đúng shell MINGW64,
   không dùng shell MSYS mặc định).
3. Cập nhật hệ thống và cài đặt GCC, Go, ImageMagick, Pkg-config:
   pacman -Syu
   pacman -S --needed \\
     mingw-w64-x86_64-toolchain \\
     mingw-w64-x86_64-imagemagick \\
     mingw-w64-x86_64-pkg-config \\
     mingw-w64-x86_64-go

3.2. Cấu Hình Biến Môi Trường Trong MSYS2 MINGW64:
-----------------------------------------------------------------------------
Trong terminal MSYS2 MinGW64, chạy:
  export CGO_ENABLED=1
  export CC=x86_64-w64-mingw32-gcc
  export PKG_CONFIG_PATH="/mingw64/lib/pkgconfig"
  export CGO_CFLAGS="$(pkg-config --cflags MagickWand)"
  export CGO_LDFLAGS="$(pkg-config --libs MagickWand)"

3.3. Lệnh Biên Dịch File .exe:
-----------------------------------------------------------------------------
Lệnh build với cờ "-H=windowsgui" để ẩn cửa sổ console command line màu đen,
kèm cờ "-s -w" để xóa debug symbols giúp giảm dung lượng file thực thi:

  go build -v -ldflags "-H=windowsgui -s -w" -o dist/FyneImageTools.exe .

3.4. DANH SÁCH CÁC FILE DLL BẮT BUỘC PHẢI COPY ĐẶT CẠNH FILE .EXE:
-----------------------------------------------------------------------------
Sau khi tạo ra file \`dist/FyneImageTools.exe\`, để người dùng máy khác bấm vào chạy ngay,
bạn BẮT BUỘC phải copy các file .dll từ thư mục \`C:\\msys64\\mingw64\\bin\\\` vào
thư mục \`dist\\\` (nơi chứa file \`FyneImageTools.exe\`):

[Nhóm 1: ImageMagick Core DLLs]
- libMagickWand-7.Q16HDRI-*.dll     (Chứa toàn bộ API MagickWand)
- libMagickCore-7.Q16HDRI-*.dll     (Engine xử lý lõi của ImageMagick)

[Nhóm 2: MinGW & C/C++ Runtime DLLs]
- libwinpthread-1.dll               (Quản lý đa luồng POSIX threads)
- libgcc_s_seh-1.dll                (GCC Runtime SEH exception handling)
- libstdc++-6.dll                   (C++ Standard Library)
- libgomp-1.dll                     (OpenMP - Xử lý đa luồng song song CPU của ImageMagick)

[Nhóm 3: Codec Giải Mã Định Dạng Ảnh]
- libpng16-16.dll                   (Đọc và ghi định dạng PNG)
- libjpeg-8.dll (hoặc libturbojpeg.dll) (Đọc và ghi định dạng JPEG/JPG)
- libwebp-7.dll                     (Đọc và ghi định dạng WEBP)
- libwebpmux-3.dll                  (Hỗ trợ đóng gói WEBP Animation/Metadata)
- libwebpdecoder-3.dll              (Bộ giải mã WebP hiệu năng cao)
- libsharpyuv-0.dll                 (Chuyển đổi không gian màu RGB-YUV cho WebP)
- libtiff-6.dll (hoặc libtiff-5.dll)(Đọc và ghi định dạng TIFF)
- zlib1.dll                         (Nén dữ liệu Deflate)
- liblzma-5.dll                     (Nén XZ / LZMA cho các định dạng ảnh lớn)
- libbz2-1.dll                      (Nén Bzip2)
- libbrotlicommon.dll               (Brotli compression)
- libbrotlidec.dll                  (Brotli decompression)

[Nhóm 4: Font & Vector Rendering (Tùy chọn cho Drawing)]
- libfreetype-6.dll
- libharfbuzz-0.dll
- libxml2-2.dll

3.5. SCRIPT TỰ ĐỘNG COPY TOÀN BỘ DLL BẰNG LỆNH LDD (BASH / POWERSHELL):
-----------------------------------------------------------------------------
Thay vì phải tìm và copy từng file bằng tay, hãy dùng script tự động cực kỳ
nhanh sau đây:

* Script Bash (Chạy trực tiếp trong terminal MSYS2 MinGW64):
-----------------------------------------------------------------------------
#!/bin/bash
mkdir -p dist
go build -ldflags "-H=windowsgui -s -w" -o dist/FyneImageTools.exe .

echo "Dang tu dong quet va copy cac file DLL phu thuoc..."
ldd dist/FyneImageTools.exe | grep -i '/mingw64/bin/' | awk '{print $3}' | while read -r dll; do
    echo "Copying: $(basename "$dll")"
    cp -u "$dll" dist/
done

# Copy them cac DLL plugin ImageMagick neu can:
cp -u /mingw64/bin/libMagick*.dll dist/
cp -u /mingw64/bin/libgomp*.dll dist/
cp -u /mingw64/bin/libwebp*.dll dist/
cp -u /mingw64/bin/libpng*.dll dist/
cp -u /mingw64/bin/libjpeg*.dll dist/
cp -u /mingw64/bin/zlib1.dll dist/
cp -u /mingw64/bin/libwinpthread-1.dll dist/
cp -u /mingw64/bin/libgcc_s_seh-1.dll dist/
cp -u /mingw64/bin/libstdc++-6.dll dist/

echo "HOAN TAT! Thu muc 'dist/' da san sang dong goi Zip hoac Inno Setup cho nguoi dung cuoi."

================================================================================
4. CÁC LỖI THƯỜNG GẶP (TROUBLESHOOTING)
================================================================================

Lỗi 1: "fatal error: wand/MagickWand.h: No such file or directory"
-> Nguyên nhân: CGo không tìm thấy thư mục header C của ImageMagick.
-> Cách sửa: Kiểm tra lại PKG_CONFIG_PATH hoặc gán trực tiếp:
   export CGO_CFLAGS="-I/usr/include/ImageMagick-7" (trên Linux)
   hoặc: export CGO_CFLAGS="-IC:/msys64/mingw64/include/ImageMagick-7" (trên Windows)

Lỗi 2: Ứng dụng bật lên rồi tắt ngay, hoặc báo lỗi mã 0xc000007b trên Windows.
-> Nguyên nhân: Lẫn lộn giữa DLL 32-bit và 64-bit (Architecture Mismatch).
-> Cách sửa: Đảm bảo toàn bộ toolchain là MinGW-w64 x86_64 (64-bit) và tất cả
   các file DLL trong thư mục dist đều lấy từ C:\\msys64\\mingw64\\bin.

Lỗi 3: "The code execution cannot proceed because libMagickWand-7.Q16HDRI-*.dll was not found."
-> Nguyên nhân: Thiếu file DLL ở cạnh file .exe trên máy khách.
-> Cách sửa: Chạy script copy DLL ở mục 3.5 để đưa đầy đủ DLL vào cùng thư mục với exe.

Lỗi 4: Lỗi hiển thị font chữ tiếng Việt trên Fyne:
-> Cách sửa: Fyne v2 hỗ trợ UTF-8 chuẩn. Nếu môi trường hệ thống thiếu font,
   bạn có thể nhúng font TTF (như Roboto hoặc Be Vietnam Pro) bằng biến môi trường
   FYNE_FONT="/duong_dan/font.ttf" hoặc dùng theme tùy chỉnh trong Go:
   app.Settings().SetTheme(&MyVietnameseTheme{})

================================================================================
5. TỐI ƯU HÓA KÍCH THƯỚC FILE (BINARY OPTIMIZATION)
================================================================================
1. Cờ Linker:
   Biên dịch với cờ \`-ldflags "-s -w"\` giúp giảm 30% - 40% dung lượng file binary
   (loại bỏ bảng ký hiệu debug DWARF và symbol table).

2. Nén file bằng UPX (Tùy chọn):
   upx --best --lzma dist/FyneImageTools.exe
   upx --best --lzma dist/*.dll

================================================================================
KẾT LUẬN
================================================================================
Thư mục \`dist/\` độc lập hoàn toàn chứa:
- FyneImageTools.exe
- Bộ DLL ImageMagick và Runtime MinGW
Người dùng chỉ cần giải nén file ZIP là ứng dụng chạy ngay lập tức!
================================================================================
`;

export const BUILD_WINDOWS_PS1_CONTENT = `# PowerShell script để biên dịch và tự động gom DLL trên Windows (MSYS2 MINGW64)
# Chạy script này từ terminal PowerShell hoặc trong MSYS2

param(
    [string]$MsysRoot = "C:\\msys64",
    [string]$OutputDir = "dist"
)

Write-Host "=== [1/4] Thiết lập môi trường MinGW64 ===" -ForegroundColor Cyan
$MingwBin = "$MsysRoot\\mingw64\\bin"
if (Test-Path $MingwBin) {
    $env:PATH = "$MingwBin;$env:PATH"
    Write-Host "Đã thêm $MingwBin vào PATH" -ForegroundColor Green
} else {
    Write-Warning "Không tìm thấy thư mục $MingwBin. Đảm bảo bạn đã cài đặt MSYS2 tại C:\\msys64"
}

$env:CGO_ENABLED = "1"
$env:PKG_CONFIG_PATH = "$MsysRoot\\mingw64\\lib\\pkgconfig"

Write-Host "=== [2/4] Biên dịch FyneImageTools.exe ===" -ForegroundColor Cyan
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

go build -v -ldflags "-H=windowsgui -s -w" -o "$OutputDir\\FyneImageTools.exe" .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Biên dịch Go thất bại! Vui lòng kiểm tra lại cấu hình CGo và ImageMagick."
    exit 1
}
Write-Host "Biên dịch thành công -> $OutputDir\\FyneImageTools.exe" -ForegroundColor Green

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
`;

export const BUILD_LINUX_SH_CONTENT = `#!/bin/bash
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
`;

export const PROJECT_FILES: CodeFile[] = [
  {
    id: "main-go",
    name: "main.go",
    language: "go",
    description: "Khởi tạo Fyne v2 App, quản lý cửa sổ, 2 tabs chuyển đổi và giao diện 100% tiếng Việt",
    content: MAIN_GO_CONTENT,
  },
  {
    id: "converter-go",
    name: "converter.go",
    language: "go",
    description: "Bộ chuyển đổi định dạng ảnh hàng loạt qua CGo MagickWand API (Định dạng, Alpha, Chất lượng)",
    content: CONVERTER_GO_CONTENT,
  },
  {
    id: "spritesheet-go",
    name: "spritesheet.go",
    language: "go",
    description: "Thuật toán ghép Sprite Sheet bằng MagickMontageImage API & Canvas Transparent Composite",
    content: SPRITESHEET_GO_CONTENT,
  },
  {
    id: "build-instructions",
    name: "build_instructions.txt",
    language: "markdown",
    description: "Tài liệu đóng gói Standalone: CGO flags, Build tĩnh Linux, MSYS2 MinGW Windows & Bảng DLL",
    content: BUILD_INSTRUCTIONS_CONTENT,
  },
  {
    id: "go-mod",
    name: "go.mod",
    language: "go",
    description: "Khai báo module Golang và dependencies: Fyne v2.5.4 & gopkg.in/gographics/imagick.v3",
    content: GO_MOD_CONTENT,
  },
  {
    id: "build-windows",
    name: "build_windows.ps1",
    language: "powershell",
    description: "Script PowerShell tự động biên dịch .exe và gom toàn bộ DLL ImageMagick cần thiết",
    content: BUILD_WINDOWS_PS1_CONTENT,
  },
  {
    id: "build-linux",
    name: "build_linux.sh",
    language: "bash",
    description: "Script Bash tự động cấu hình pkg-config và biên dịch binary Linux",
    content: BUILD_LINUX_SH_CONTENT,
  },
];
