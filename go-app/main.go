package main

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

			// Ngăn loop sự kiện OnChanged
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
		// Mặc định chọn tất cả file ảnh tìm thấy để tiện cho người dùng
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
			// Nếu thả thư mục, quét toàn bộ ảnh trong thư mục
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

	// Danh sách file đã chọn
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

	// Hàm thêm nhiều file cùng lúc (tránh trùng lặp)
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

	// 1. Nút "Chọn Nhiều File Ảnh..." (Mở hộp thoại chọn nhiều file với Checkbox & Chọn tất cả)
	btnSelectMultiFiles := widget.NewButtonWithIcon("Chọn Nhiều File...", theme.FileImageIcon(), func() {
		initialDir := ""
		if len(selectedFiles) > 0 {
			initialDir = filepath.Dir(selectedFiles[len(selectedFiles)-1])
		}
		showMultiFileSelector(win, initialDir, func(paths []string) {
			addFiles(paths)
		})
	})

	// 2. Nút "Nạp Cả Thư Mục..." (Chọn thư mục chứa hàng loạt file ảnh)
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
			dialog.ShowInformation("Nạp Thành Công", fmt.Sprintf("Đã nạp thành công %d file ảnh từ thư mục:\n%s", len(imgs), lu.Path()), win)
		}, win)
		dd.Show()
	})

	btnClearFiles := widget.NewButtonWithIcon("Xóa Hết", theme.DeleteIcon(), func() {
		selectedFiles = nil
		filesCountLabel.SetText("Chưa chọn file ảnh nào")
		fileListWidget.Refresh()
	})

	// Dropdown chọn định dạng đầu ra
	formatOptions := []string{"PNG", "JPG", "WEBP", "BMP", "TIFF", "GIF", "AVIF"}
	formatSelect := widget.NewSelect(formatOptions, nil)
	formatSelect.SetSelected("PNG")

	// Thanh trượt chất lượng nén (Quality)
	qualityLabel := widget.NewLabel("Chất lượng nén: 90%")
	qualitySlider := widget.NewSlider(1, 100)
	qualitySlider.SetValue(90)
	qualitySlider.OnChanged = func(val float64) {
		qualityLabel.SetText(fmt.Sprintf("Chất lượng nén: %d%%", int(val)))
	}

	// Chọn thư mục lưu
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

	// Thanh tiến trình
	progressBar := widget.NewProgressBar()
	progressBar.SetValue(0)
	statusLabel := widget.NewLabel("Sẵn sàng. (Hỗ trợ kéo thả nhiều file vào đây)")

	// Nút Bắt đầu chuyển đổi
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
				fmt.Sprintf("Đã chuyển đổi thành công %d/%d file ảnh sang định dạng %s.\nThư mục lưu: %s",
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

	// 1. Nút "Chọn Nhiều File Frame..."
	btnSelectFrames := widget.NewButtonWithIcon("Chọn Nhiều Frame...", theme.FileImageIcon(), func() {
		initialDir := ""
		if len(frameFiles) > 0 {
			initialDir = filepath.Dir(frameFiles[len(frameFiles)-1])
		}
		showMultiFileSelector(win, initialDir, func(paths []string) {
			addFrames(paths)
		})
	})

	// 2. Nút "Nạp Cả Thư Mục Frame..."
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
			dialog.ShowInformation("Nạp Frame Thành Công", fmt.Sprintf("Đã nạp %d frame theo thứ tự từ thư mục:\n%s", len(imgs), lu.Path()), win)
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
				fmt.Sprintf("Đã tạo thành công Sprite Sheet dạng lưới %d x %d nền trong suốt!\nFile lưu: %s",
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
