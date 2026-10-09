package main

import (
	"fmt"
	"path/filepath"
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

func main() {
	// BẮT BUỘC: Khởi tạo ImageMagick C-Environment trước khi dùng bất kỳ hàm CGo nào
	imagick.Initialize()
	// BẮT BUỘC: Giải phóng tài nguyên môi trường ImageMagick khi ứng dụng tắt
	defer imagick.Terminate()

	// Khởi tạo ứng dụng Fyne v2
	myApp := app.NewWithID("com.developer.fyne.imagick.suite")
	mainWindow := myApp.NewWindow("Trình Xử Lý Ảnh Hàng Loạt & Tạo Sprite Sheet - Fyne v2")
	mainWindow.Resize(fyne.NewSize(860, 640))
	mainWindow.CenterOnScreen()

	// Xây dựng 2 màn hình tính năng chính bằng Fyne Container Tabs
	batchTab := buildBatchConverterTab(mainWindow)
	spriteTab := buildSpriteSheetTab(mainWindow)

	tabs := container.NewAppTabs(
		container.NewTabItemWithIcon("Chuyển Đổi Hàng Loạt", theme.StorageIcon(), batchTab),
		container.NewTabItemWithIcon("Tạo Sprite Sheet", theme.GridIcon(), spriteTab),
	)
	tabs.SetTabLocation(container.TabLocationTop)

	mainWindow.SetContent(tabs)
	mainWindow.ShowAndRun()
}

// -----------------------------------------------------------------------------
// TÍNH NĂNG 1: GIAO DIỆN CHUYỂN ĐỔI ẢNH HÀNG LOẠT (BATCH CONVERTER)
// -----------------------------------------------------------------------------
func buildBatchConverterTab(win fyne.Window) fyne.CanvasObject {
	var selectedFiles []string
	var outputDirectory string

	// Tiêu đề & mô tả
	titleLabel := widget.NewLabelWithStyle(
		"Bộ Chuyển Đổi Định Dạng Ảnh Hàng Loạt (Batch Converter)",
		fyne.TextAlignLeading,
		fyne.TextStyle{Bold: true},
	)
	descLabel := widget.NewLabel(
		"Chuyển đổi đồng thời nhiều ảnh sang định dạng mong muốn với hiệu năng cao bằng C-Bindings ImageMagick.",
	)

	// Danh sách file đã chọn
	filesCountLabel := widget.NewLabel("Chưa chọn file ảnh nào")
	fileListWidget := widget.NewList(
		func() int { return len(selectedFiles) },
		func() fyne.CanvasObject {
			return widget.NewLabel("Đường dẫn file ảnh")
		},
		func(id widget.ListItemID, obj fyne.CanvasObject) {
			obj.(*widget.Label).SetText(filepath.Base(selectedFiles[id]))
		},
	)

	// Nút chọn nhiều file ảnh
	btnSelectFiles := widget.NewButtonWithIcon("Chọn File Ảnh...", theme.FileImageIcon(), func() {
		fd := dialog.NewFileOpen(func(reader fyne.URIReadCloser, err error) {
			if err != nil || reader == nil {
				return
			}
			path := reader.URI().Path()
			// Thêm vào danh sách nếu chưa có
			exists := false
			for _, f := range selectedFiles {
				if f == path {
					exists = true
					break
				}
			}
			if !exists {
				selectedFiles = append(selectedFiles, path)
				filesCountLabel.SetText(fmt.Sprintf("Đã chọn: %d file ảnh", len(selectedFiles)))
				fileListWidget.Refresh()
			}
		}, win)
		fd.SetFilter(storage.NewExtensionFileFilter([]string{".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".gif", ".avif", ".tga"}))
		fd.Show()
	})

	btnClearFiles := widget.NewButtonWithIcon("Xóa Danh Sách", theme.DeleteIcon(), func() {
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
	statusLabel := widget.NewLabel("Sẵn sàng.")

	// Nút Bắt đầu chuyển đổi
	var btnConvert *widget.Button
	btnConvert = widget.NewButtonWithIcon("Bắt Đầu Chuyển Đổi", theme.MediaPlayIcon(), func() {
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

		// Chạy trong Goroutine để không làm đóng băng (freeze) giao diện Fyne
		go func() {
			total := len(selectedFiles)
			successCount := 0
			failCount := 0

			for i, file := range selectedFiles {
				currentIdx := i + 1
				_, err := ConvertSingleImage(file, outputDirectory, targetFormat, quality)

				// Cập nhật giao diện Fyne an toàn
				progressVal := float64(currentIdx) / float64(total)
				if err != nil {
					failCount++
				} else {
					successCount++
				}

				// Cập nhật thanh tiến trình và thông báo
				progressBar.SetValue(progressVal)
				statusLabel.SetText(fmt.Sprintf("Đang xử lý (%d/%d): %s", currentIdx, total, filepath.Base(file)))
			}

			// Hoàn tất
			btnConvert.Enable()
			statusMsg := fmt.Sprintf("Hoàn tất! Thành công: %d, Thất bại: %d", successCount, failCount)
			statusLabel.SetText(statusMsg)

			dialog.ShowInformation("Chuyển Đổi Hoàn Tất",
				fmt.Sprintf("Đã chuyển đổi thành công %d/%d file ảnh sang định dạng %s.\nThư mục lưu: %s",
					successCount, total, targetFormat, outputDirectory), win)
		}()
	})
	btnConvert.Importance = widget.HighImportance

	// Bố cục giao diện
	leftPanel := container.NewVBox(
		titleLabel,
		descLabel,
		widget.NewSeparator(),
		container.NewHBox(btnSelectFiles, btnClearFiles),
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

	return split
}

// -----------------------------------------------------------------------------
// TÍNH NĂNG 2: GIAO DIỆN TẠO SPRITE SHEET (SPRITESHEET GENERATOR)
// -----------------------------------------------------------------------------
func buildSpriteSheetTab(win fyne.Window) fyne.CanvasObject {
	var frameFiles []string
	var saveFilePath string

	titleLabel := widget.NewLabelWithStyle(
		"Trình Ghép Sprite Sheet Hoạt Họa (MagickWand Montage)",
		fyne.TextAlignLeading,
		fyne.TextStyle{Bold: true},
	)
	descLabel := widget.NewLabel(
		"Ghép các frame chuyển động thành một tập tin Sprite Sheet dạng lưới với nền trong suốt (Transparent).",
	)

	// Danh sách frame
	framesCountLabel := widget.NewLabel("Chưa nạp frame hoạt họa nào")
	frameListWidget := widget.NewList(
		func() int { return len(frameFiles) },
		func() fyne.CanvasObject {
			return widget.NewLabel("Tên frame")
		},
		func(id widget.ListItemID, obj fyne.CanvasObject) {
			obj.(*widget.Label).SetText(fmt.Sprintf("#%d: %s", id+1, filepath.Base(frameFiles[id])))
		},
	)

	// Nút chọn frame
	btnSelectFrames := widget.NewButtonWithIcon("Chọn File Frame...", theme.FileImageIcon(), func() {
		fd := dialog.NewFileOpen(func(reader fyne.URIReadCloser, err error) {
			if err != nil || reader == nil {
				return
			}
			path := reader.URI().Path()
			frameFiles = append(frameFiles, path)
			framesCountLabel.SetText(fmt.Sprintf("Đã nạp: %d frame", len(frameFiles)))
			frameListWidget.Refresh()
		}, win)
		fd.SetFilter(storage.NewExtensionFileFilter([]string{".png", ".webp", ".jpg", ".jpeg"}))
		fd.Show()
	})

	btnClearFrames := widget.NewButtonWithIcon("Xóa Hết Frame", theme.DeleteIcon(), func() {
		frameFiles = nil
		framesCountLabel.SetText("Chưa nạp frame hoạt họa nào")
		frameListWidget.Refresh()
	})

	// Input Số Cột (Columns) và Số Dòng (Rows)
	colEntry := widget.NewEntry()
	colEntry.SetText("4")
	rowEntry := widget.NewEntry()
	rowEntry.SetText("2")

	// Tùy chọn thuật toán ImageMagick
	algoCheck := widget.NewCheck("Sử dụng MagickMontageImage API (Mặc định: Ghép Lưới Pixel-Perfect)", nil)
	algoCheck.SetChecked(false)

	// Đường dẫn lưu file Sprite Sheet
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

	// Nút Tạo Sprite Sheet
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
			// Tự động tính rows
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
		container.NewHBox(btnSelectFrames, btnClearFrames),
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

	return split
}
