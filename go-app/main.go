package main

import (
	"encoding/json"
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
	mainWindow := myApp.NewWindow("Bộ Công Cụ Xử Lý Ảnh Chuyên Nghiệp - Fyne v2 & ImageMagick")
	mainWindow.Resize(fyne.NewSize(960, 720))
	mainWindow.CenterOnScreen()

	// Xây dựng 4 màn hình tính năng chính bằng Fyne Container Tabs
	batchTab, addBatchFiles := buildBatchConverterTab(mainWindow)
	spriteTab, addSpriteFiles := buildSpriteSheetTab(mainWindow)
	metadataTab, addMetaFiles := buildMetadataInjectorTab(mainWindow)
	audioSyncTab, addAudioFiles := buildAudioSyncMapperTab(mainWindow)

	tabs := container.NewAppTabs(
		container.NewTabItemWithIcon("Chuyển Đổi Hàng Loạt", theme.StorageIcon(), batchTab),
		container.NewTabItemWithIcon("Tạo Sprite Sheet", theme.GridIcon(), spriteTab),
		container.NewTabItemWithIcon("Gắn Siêu Dữ Liệu (EXIF)", theme.InfoIcon(), metadataTab),
		container.NewTabItemWithIcon("Liên Kết Âm Thanh (Webtoon)", theme.MediaPlayIcon(), audioSyncTab),
	)
	tabs.SetTabLocation(container.TabLocationTop)

	// HỖ TRỢ KÉO THẢ NHIỀU FILE (DRAG & DROP MULTI-FILE NATIVE):
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
			switch tabs.SelectedIndex() {
			case 0:
				addBatchFiles(droppedPaths)
			case 1:
				addSpriteFiles(droppedPaths)
			case 2:
				addMetaFiles(droppedPaths)
			case 3:
				addAudioFiles(droppedPaths)
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
				dialog.ShowInformation("Thông Báo", "Không tìm thấy file ảnh hợp lệ nào trong thư mục!", win)
				return
			}
			addFiles(imgs)
			dialog.ShowInformation("Nạp Thành Công", fmt.Sprintf("Đã nạp thành công %d file ảnh!", len(imgs)), win)
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
	statusLabel := widget.NewLabel("Sẵn sàng.")

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
			dialog.ShowInformation("Nạp Frame Thành Công", fmt.Sprintf("Đã nạp %d frame theo thứ tự!", len(imgs)), win)
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

// -----------------------------------------------------------------------------
// TÍNH NĂNG 3: GẮN SIÊU DỮ LIỆU TÙY CHỈNH (CUSTOM METADATA / EXIF INJECTION)
// -----------------------------------------------------------------------------
type MetadataRow struct {
	KeyEntry   *widget.Entry
	ValueEntry *widget.Entry
	Container  *fyne.Container
}

func buildMetadataInjectorTab(win fyne.Window) (fyne.CanvasObject, func([]string)) {
	var selectedFiles []string
	var outputDirectory string

	titleLabel := widget.NewLabelWithStyle(
		"Gắn Siêu Dữ Liệu Tùy Chỉnh (Custom Metadata / EXIF Injection)",
		fyne.TextAlignLeading,
		fyne.TextStyle{Bold: true},
	)
	descLabel := widget.NewLabel(
		"Nhúng thông tin bản quyền, tác giả, ghi chú vào bên trong cấu trúc ảnh (PNG, JPEG, WEBP) không suy giảm chất lượng điểm ảnh.",
	)

	filesCountLabel := widget.NewLabel("Chưa chọn file ảnh nào")
	fileListWidget := widget.NewList(
		func() int { return len(selectedFiles) },
		func() fyne.CanvasObject {
			return widget.NewLabel("File ảnh")
		},
		func(id widget.ListItemID, obj fyne.CanvasObject) {
			obj.(*widget.Label).SetText(fmt.Sprintf("%d. %s", id+1, filepath.Base(selectedFiles[id])))
		},
	)

	addFiles := func(newPaths []string) {
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
			}
		}
		filesCountLabel.SetText(fmt.Sprintf("Đã chọn: %d file ảnh", len(selectedFiles)))
		fileListWidget.Refresh()
	}

	btnSelectFiles := widget.NewButtonWithIcon("Chọn Nhiều File...", theme.FileImageIcon(), func() {
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
				dialog.ShowInformation("Thông Báo", "Không tìm thấy file ảnh nào trong thư mục!", win)
				return
			}
			addFiles(imgs)
		}, win)
		dd.Show()
	})

	btnClearFiles := widget.NewButtonWithIcon("Xóa Hết", theme.DeleteIcon(), func() {
		selectedFiles = nil
		filesCountLabel.SetText("Chưa chọn file ảnh nào")
		fileListWidget.Refresh()
	})

	// Bảng Key-Value động
	rowsContainer := container.NewVBox()
	var rows []*MetadataRow

	var refreshRows func()
	refreshRows = func() {
		rowsContainer.Objects = nil
		for _, r := range rows {
			rowsContainer.Add(r.Container)
		}
		rowsContainer.Refresh()
	}

	addKVRow := func(defaultKey, defaultVal string) {
		kEntry := widget.NewEntry()
		kEntry.SetPlaceHolder("Key (vd: Author, Copyright...)")
		kEntry.SetText(defaultKey)

		vEntry := widget.NewEntry()
		vEntry.SetPlaceHolder("Value (vd: PhanKim, © 2026...)")
		vEntry.SetText(defaultVal)

		rowObj := &MetadataRow{
			KeyEntry:   kEntry,
			ValueEntry: vEntry,
		}

		btnDeleteRow := widget.NewButtonWithIcon("", theme.DeleteIcon(), func() {
			for idx, item := range rows {
				if item == rowObj {
					rows = append(rows[:idx], rows[idx+1:]...)
					break
				}
			}
			refreshRows()
		})

		rowObj.Container = container.NewBorder(nil, nil, nil, btnDeleteRow,
			container.NewGridWithColumns(2, kEntry, vEntry),
		)

		rows = append(rows, rowObj)
		refreshRows()
	}

	// Tạo sẵn một số cặp trường phổ biến
	addKVRow("Author", "PhanKim")
	addKVRow("Copyright", "© 2026 Studio")
	addKVRow("Description", "Artwork Frame 01")

	btnAddRow := widget.NewButtonWithIcon("Thêm Dòng Key-Value", theme.ContentAddIcon(), func() {
		addKVRow("", "")
	})

	// Tùy chọn giữ lại EXIF hay ghi đè
	keepOldExifRadio := widget.NewRadioGroup([]string{"Giữ lại EXIF cũ (Chỉ bổ sung trường mới)", "Ghi đè hoàn toàn (Xóa sạch EXIF cũ trước khi chèn)"}, nil)
	keepOldExifRadio.SetSelected("Giữ lại EXIF cũ (Chỉ bổ sung trường mới)")

	outDirLabel := widget.NewLabel("Thư mục lưu: (Mặc định: Thư mục 'metadata_out' cạnh ảnh gốc)")
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
	statusLabel := widget.NewLabel("Sẵn sàng gắn siêu dữ liệu.")

	var btnInject *widget.Button
	btnInject = widget.NewButtonWithIcon("Gắn Metadata Hàng Loạt", theme.DocumentSaveIcon(), func() {
		if len(selectedFiles) == 0 {
			dialog.ShowInformation("Thông Báo", "Vui lòng chọn ít nhất một file ảnh!", win)
			return
		}

		metaMap := make(map[string]string)
		for _, r := range rows {
			k := strings.TrimSpace(r.KeyEntry.Text)
			v := strings.TrimSpace(r.ValueEntry.Text)
			if k != "" {
				metaMap[k] = v
			}
		}

		if len(metaMap) == 0 {
			dialog.ShowInformation("Thông Báo", "Vui lòng nhập ít nhất một cặp Key-Value siêu dữ liệu!", win)
			return
		}

		if outputDirectory == "" {
			outputDirectory = filepath.Join(filepath.Dir(selectedFiles[0]), "metadata_out")
			outDirLabel.SetText(fmt.Sprintf("Thư mục lưu: %s", outputDirectory))
		}

		btnInject.Disable()
		progressBar.SetValue(0)
		statusLabel.SetText("Đang nhúng MagickSetImageProperty vào header...")

		keepOld := keepOldExifRadio.Selected == "Giữ lại EXIF cũ (Chỉ bổ sung trường mới)"

		go func() {
			total := len(selectedFiles)
			success := 0
			fail := 0

			for idx, file := range selectedFiles {
				currentIdx := idx + 1
				destPath := filepath.Join(outputDirectory, filepath.Base(file))
				err := InjectCustomMetadata(file, destPath, metaMap, keepOld)

				progressVal := float64(currentIdx) / float64(total)
				if err != nil {
					fail++
				} else {
					success++
				}

				progressBar.SetValue(progressVal)
				statusLabel.SetText(fmt.Sprintf("Đang xử lý (%d/%d): %s", currentIdx, total, filepath.Base(file)))
			}

			btnInject.Enable()
			statusLabel.SetText(fmt.Sprintf("Hoàn tất! Thành công: %d, Thất bại: %d", success, fail))

			dialog.ShowInformation("Hoàn Tất Gắn Siêu Dữ Liệu",
				fmt.Sprintf("Đã nhúng thành công %d trường siêu dữ liệu vào %d file ảnh!\nThư mục lưu: %s",
					len(metaMap), success, outputDirectory), win)
		}()
	})
	btnInject.Importance = widget.HighImportance

	leftPanel := container.NewVBox(
		titleLabel,
		descLabel,
		widget.NewSeparator(),
		container.NewHBox(btnSelectFiles, btnAddFolder, btnClearFiles),
		filesCountLabel,
		widget.NewSeparator(),
		widget.NewLabelWithStyle("Bảng Thuộc Tính Siêu Dữ Liệu (Key - Value):", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
		container.NewGridWithColumns(2,
			widget.NewLabelWithStyle("Tên Trường (Key)", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
			widget.NewLabelWithStyle("Giá Trị (Value)", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
		),
		rowsContainer,
		btnAddRow,
		widget.NewSeparator(),
		widget.NewLabelWithStyle("Chế Độ Xử Lý EXIF:", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
		keepOldExifRadio,
		widget.NewSeparator(),
		widget.NewLabelWithStyle("Vị Trí Lưu:", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
		btnSelectOutDir,
		outDirLabel,
		widget.NewSeparator(),
		btnInject,
		progressBar,
		statusLabel,
	)

	split := container.NewHSplit(
		container.NewPadded(leftPanel),
		container.NewPadded(container.NewBorder(
			widget.NewLabelWithStyle("Danh Sách File Sẽ Gắn Metadata:", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
			nil, nil, nil,
			fileListWidget,
		)),
	)
	split.SetOffset(0.60)

	return split, addFiles
}

// -----------------------------------------------------------------------------
// TÍNH NĂNG 4: LIÊN KẾT ÂM THANH (AUDIO SYNC MAPPER FOR WEBTOON/COMIC)
// -----------------------------------------------------------------------------
func buildAudioSyncMapperTab(win fyne.Window) (fyne.CanvasObject, func([]string)) {
	var selectedFiles []string
	var outputDirectory string

	titleLabel := widget.NewLabelWithStyle(
		"Trình Liên Kết Âm Thanh (Audio Sync Mapper - Webtoon/Comic)",
		fyne.TextAlignLeading,
		fyne.TextStyle{Bold: true},
	)
	descLabel := widget.NewLabel(
		"Nhúng kịch bản phát âm thanh trực tiếp vào từng bức ảnh truyện tranh để Extension/App tự phát nhạc khi đọc đến.",
	)

	filesCountLabel := widget.NewLabel("Chưa chọn file ảnh truyện tranh nào")
	fileListWidget := widget.NewList(
		func() int { return len(selectedFiles) },
		func() fyne.CanvasObject {
			return widget.NewLabel("Trang truyện")
		},
		func(id widget.ListItemID, obj fyne.CanvasObject) {
			obj.(*widget.Label).SetText(fmt.Sprintf("Trang %d: %s", id+1, filepath.Base(selectedFiles[id])))
		},
	)

	addFiles := func(newPaths []string) {
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
			}
		}
		filesCountLabel.SetText(fmt.Sprintf("Đã chọn: %d trang truyện", len(selectedFiles)))
		fileListWidget.Refresh()
	}

	btnSelectFiles := widget.NewButtonWithIcon("Chọn File Trang...", theme.FileImageIcon(), func() {
		initialDir := ""
		if len(selectedFiles) > 0 {
			initialDir = filepath.Dir(selectedFiles[len(selectedFiles)-1])
		}
		showMultiFileSelector(win, initialDir, func(paths []string) {
			addFiles(paths)
		})
	})

	btnAddFolder := widget.NewButtonWithIcon("Nạp Cả Thư Mục Chapter...", theme.FolderOpenIcon(), func() {
		dd := dialog.NewFolderOpen(func(lu fyne.ListableURI, err error) {
			if err != nil || lu == nil {
				return
			}
			imgs := scanFolderForImages(lu.Path())
			if len(imgs) == 0 {
				dialog.ShowInformation("Thông Báo", "Không tìm thấy file ảnh trang nào trong thư mục!", win)
				return
			}
			addFiles(imgs)
		}, win)
		dd.Show()
	})

	btnClearFiles := widget.NewButtonWithIcon("Xóa Hết", theme.DeleteIcon(), func() {
		selectedFiles = nil
		filesCountLabel.SetText("Chưa chọn file ảnh nào")
		fileListWidget.Refresh()
	})

	// Form cấu hình kịch bản âm thanh
	audioSrcEntry := widget.NewEntry()
	audioSrcEntry.SetPlaceHolder("Tên file audio (vd: sfx_sword_slash.mp3, bgm_ch1.ogg)")
	audioSrcEntry.SetText("sfx_sword_slash.mp3")

	btnPickAudioFile := widget.NewButtonWithIcon("Chọn File Audio...", theme.FileIcon(), func() {
		fd := dialog.NewFileOpen(func(reader fyne.URIReadCloser, err error) {
			if err != nil || reader == nil {
				return
			}
			audioSrcEntry.SetText(filepath.Base(reader.URI().Path()))
		}, win)
		fd.SetFilter(storage.NewExtensionFileFilter([]string{".mp3", ".ogg", ".wav", ".aac", ".m4a", ".flac"}))
		fd.Show()
	})

	triggerSelect := widget.NewSelect([]string{
		"on_scroll_view (Phát ngay khi cuộn vào tầm mắt)",
		"on_center_screen (Phát khi ảnh nằm chính giữa màn hình)",
		"on_click (Phát khi độc giả nhấn/chạm vào ảnh)",
	}, nil)
	triggerSelect.SetSelected("on_scroll_view (Phát ngay khi cuộn vào tầm mắt)")

	delayEntry := widget.NewEntry()
	delayEntry.SetPlaceHolder("300")
	delayEntry.SetText("300")

	volumeLabel := widget.NewLabel("Âm lượng: 80%")
	volumeSlider := widget.NewSlider(0, 100)
	volumeSlider.SetValue(80)

	loopCheck := widget.NewCheck("Lặp vô hạn (Loop - Thích hợp cho nhạc nền BGM)", nil)
	loopCheck.SetChecked(false)

	// Khung xem trước JSON Realtime
	jsonPreviewBox := widget.NewMultiLineEntry()
	jsonPreviewBox.TextStyle = fyne.TextStyle{Monospace: true}
	jsonPreviewBox.Wrapping = fyne.TextWrapBreak

	updateJSONPreview := func() {
		rawTrigger := "on_scroll_view"
		if strings.Contains(triggerSelect.Selected, "center") {
			rawTrigger = "on_center_screen"
		} else if strings.Contains(triggerSelect.Selected, "click") {
			rawTrigger = "on_click"
		}

		delayVal, _ := strconv.Atoi(delayEntry.Text)
		volVal := volumeSlider.Value / 100.0

		detail := AudioSyncDetail{
			Src:     audioSrcEntry.Text,
			Trigger: rawTrigger,
			Volume:  volVal,
			Delay:   delayVal,
			Loop:    loopCheck.Checked,
		}

		payload := AudioSyncPayload{AudioSync: detail}
		b, err := json.MarshalIndent(payload, "", "  ")
		if err == nil {
			jsonPreviewBox.SetText(string(b))
		}
	}

	audioSrcEntry.OnChanged = func(_ string) { updateJSONPreview() }
	delayEntry.OnChanged = func(_ string) { updateJSONPreview() }
	triggerSelect.OnChanged = func(_ string) { updateJSONPreview() }
	loopCheck.OnChanged = func(_ bool) { updateJSONPreview() }
	volumeSlider.OnChanged = func(val float64) {
		volumeLabel.SetText(fmt.Sprintf("Âm lượng: %d%%", int(val)))
		updateJSONPreview()
	}

	updateJSONPreview()

	outDirLabel := widget.NewLabel("Thư mục lưu: (Mặc định: Thư mục 'audio_synced_out' cạnh ảnh gốc)")
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
	statusLabel := widget.NewLabel("Sẵn sàng nhúng kịch bản âm thanh.")

	var btnEmbed *widget.Button
	btnEmbed = widget.NewButtonWithIcon("Nhúng Kịch Bản Âm Thanh Hàng Loạt", theme.MediaPlayIcon(), func() {
		if len(selectedFiles) == 0 {
			dialog.ShowInformation("Thông Báo", "Vui lòng chọn ít nhất một file ảnh trang truyện!", win)
			return
		}

		rawTrigger := "on_scroll_view"
		if strings.Contains(triggerSelect.Selected, "center") {
			rawTrigger = "on_center_screen"
		} else if strings.Contains(triggerSelect.Selected, "click") {
			rawTrigger = "on_click"
		}

		delayVal, _ := strconv.Atoi(delayEntry.Text)
		volVal := volumeSlider.Value / 100.0

		detail := AudioSyncDetail{
			Src:     audioSrcEntry.Text,
			Trigger: rawTrigger,
			Volume:  volVal,
			Delay:   delayVal,
			Loop:    loopCheck.Checked,
		}

		if outputDirectory == "" {
			outputDirectory = filepath.Join(filepath.Dir(selectedFiles[0]), "audio_synced_out")
			outDirLabel.SetText(fmt.Sprintf("Thư mục lưu: %s", outputDirectory))
		}

		btnEmbed.Disable()
		progressBar.SetValue(0)
		statusLabel.SetText("Đang nhúng kịch bản vào chunk 'comic_audio_config'...")

		go func() {
			total := len(selectedFiles)
			success := 0
			fail := 0

			for idx, file := range selectedFiles {
				currentIdx := idx + 1
				destPath := filepath.Join(outputDirectory, filepath.Base(file))
				err := InjectAudioSyncConfig(file, destPath, detail)

				progressVal := float64(currentIdx) / float64(total)
				if err != nil {
					fail++
				} else {
					success++
				}

				progressBar.SetValue(progressVal)
				statusLabel.SetText(fmt.Sprintf("Đang nhúng (%d/%d): %s", currentIdx, total, filepath.Base(file)))
			}

			btnEmbed.Enable()
			statusLabel.SetText(fmt.Sprintf("Hoàn tất! Thành công: %d, Thất bại: %d", success, fail))

			dialog.ShowInformation("Hoàn Tất Nhúng Âm Thanh",
				fmt.Sprintf("Đã nhúng thành công kịch bản âm thanh vào %d trang truyện!\nThư mục lưu: %s",
					success, outputDirectory), win)
		}()
	})
	btnEmbed.Importance = widget.HighImportance

	leftPanel := container.NewVBox(
		titleLabel,
		descLabel,
		widget.NewSeparator(),
		container.NewHBox(btnSelectFiles, btnAddFolder, btnClearFiles),
		filesCountLabel,
		widget.NewSeparator(),
		widget.NewLabelWithStyle("Cấu Hình Kịch Bản Âm Thanh (Audio Script):", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
		container.NewBorder(nil, nil, nil, btnPickAudioFile, audioSrcEntry),
		widget.NewLabel("Sự kiện kích hoạt (Trigger):"),
		triggerSelect,
		container.NewGridWithColumns(2,
			widget.NewLabel("Độ trễ kích hoạt (ms):"), delayEntry,
		),
		volumeLabel,
		volumeSlider,
		loopCheck,
		widget.NewSeparator(),
		widget.NewLabelWithStyle("Xem Trước Kịch Bản JSON (Metadata Sẽ Gắn):", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
		container.NewPadded(jsonPreviewBox),
		widget.NewSeparator(),
		widget.NewLabelWithStyle("Vị Trí Lưu:", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
		btnSelectOutDir,
		outDirLabel,
		widget.NewSeparator(),
		btnEmbed,
		progressBar,
		statusLabel,
	)

	split := container.NewHSplit(
		container.NewPadded(leftPanel),
		container.NewPadded(container.NewBorder(
			widget.NewLabelWithStyle("Danh Sách Trang Truyện:", fyne.TextAlignLeading, fyne.TextStyle{Bold: true}),
			nil, nil, nil,
			fileListWidget,
		)),
	)
	split.SetOffset(0.58)

	return split, addFiles
}
