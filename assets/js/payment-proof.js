// ==========================================================================
// UPLOAD BILL LOGIC (NÉN ẢNH VÀ GỬI LÊN APPS SCRIPT)
// ==========================================================================

let processedBase64Image = null;

document.addEventListener("DOMContentLoaded", () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('billUploadInput');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const resetBtn = document.getElementById('resetUploadBtn');
    const submitBillBtn = document.getElementById('submitBillBtn');

    if (!dropZone || !fileInput) return; // Nếu không ở trang chứa form upload thì bỏ qua

    // Mở khung chọn file khi click vào dropZone
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Ngăn chặn hành vi mặc định của drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Hiệu ứng hover khi kéo file vào
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('highlight'), false);
    });

    // Xử lý khi drop file
    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleFiles(files[0]);
        }
    }

    // Xử lý khi chọn file qua input
    fileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            handleFiles(this.files[0]);
        }
    });

    // Reset upload
    resetBtn.addEventListener('click', () => {
        processedBase64Image = null;
        fileInput.value = '';
        previewContainer.style.display = 'none';
        dropZone.style.display = 'flex';
        submitBillBtn.disabled = true;
    });

    // Xử lý file: Kiểm tra loại, dung lượng và nén bằng Canvas
    function handleFiles(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert("Chỉ chấp nhận file hình ảnh (JPG, JPEG, PNG, WEBP).");
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                // Resize ảnh nhỏ lại để tải lên siêu tốc
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert sang JPEG chất lượng 60% để siêu nhẹ
                let dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                
                // Tính toán dung lượng Base64 (khoảng 3/4 độ dài chuỗi)
                const sizeInBytes = Math.round((dataUrl.length * 3) / 4);
                if (sizeInBytes > 2 * 1024 * 1024) { // Lớn hơn 2MB
                    // Thử nén thêm nếu vẫn lớn hơn 2MB
                    dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    const newSize = Math.round((dataUrl.length * 3) / 4);
                    if (newSize > 2 * 1024 * 1024) {
                        alert("Hình ảnh quá phức tạp và dung lượng quá lớn. Vui lòng chọn ảnh khác nhẹ hơn.");
                        return;
                    }
                }

                processedBase64Image = dataUrl;
                previewImage.src = dataUrl;
                
                dropZone.style.display = 'none';
                previewContainer.style.display = 'block';
                submitBillBtn.disabled = false;
            }
        }
    }

    // Submit Hóa Đơn
    submitBillBtn.addEventListener('click', () => {
        if (!processedBase64Image) {
            alert("Vui lòng chọn hoặc kéo thả ảnh hóa đơn.");
            return;
        }

        if (CONFIG.APPS_SCRIPT_URL === "CHƯA_CẬP_NHẬT") {
            alert("Hệ thống đang bảo trì hoặc chưa cấu hình. Bạn đang chạy chế độ TEST.");
            // Giả lập redirect chế độ Test
            const localData = JSON.parse(localStorage.getItem('bcns_registration') || '{}');
            window.location.href = `thu-cam-on.html?code=${localData.code || 'TEST'}`;
            return;
        }

        const localData = JSON.parse(localStorage.getItem('bcns_registration') || '{}');
        const code = localData.code;

        if (!code) {
            alert("Không tìm thấy mã đăng ký. Vui lòng đăng ký lại.");
            return;
        }

        // Tách chuỗi data:image/jpeg;base64,... lấy phần nội dung base64
        const base64Content = processedBase64Image.split(',')[1];
        // Lấy tên file gốc hoặc tạo tên ngẫu nhiên
        const fileExt = "jpg"; 
        const filename = `${code}_BILL.${fileExt}`;

        submitBillBtn.innerHTML = '<span class="loader"></span> Đang tải bill...';
        submitBillBtn.disabled = true;
        resetBtn.disabled = true;

        const payload = {
            action: "submitFullRegistration",
            ...localData,
            filename: filename,
            mimeType: "image/jpeg",
            fileData: base64Content
        };

        fetch(CONFIG.APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
            redirect: "follow"
        })
        .then(async (res) => {
            const rawText = await res.text();
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (parseError) {
                throw new Error(
                    "Máy chủ không trả về JSON. HTTP " + res.status +
                    ". Phản hồi: " + rawText.slice(0, 180)
                );
            }
            if (!res.ok) {
                throw new Error(data.message || ("HTTP " + res.status));
            }
            return data;
        })
        .then(data => {
            if (data.success) {
                // Xóa nháp vì đã upload bill thành công
                localStorage.removeItem('bcns_form_draft');
                window.location.href = `thu-cam-on.html?code=${code}`;
            } else {
                alert("Lỗi tải hóa đơn: " + (data.message || "Vui lòng thử lại."));
                submitBillBtn.innerHTML = 'GỬI BILL XÁC NHẬN';
                submitBillBtn.disabled = false;
                resetBtn.disabled = false;
            }
        })
        .catch(err => {
            console.error("Lỗi:", err);
            alert("Không thể gửi bill. Chi tiết: " + (err.message || err));
            submitBillBtn.innerHTML = 'GỬI BILL XÁC NHẬN';
            submitBillBtn.disabled = false;
            resetBtn.disabled = false;
        });
    });
});
