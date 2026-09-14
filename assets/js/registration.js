// ==========================================================================
// SCROLL EFFECTS & NAVBAR
// ==========================================================================
const header = document.getElementById('header');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileNav = document.querySelector('.mobile-nav');
const mobileLinks = document.querySelectorAll('.mobile-nav a');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Mobile Menu Toggle
if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('open');
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('open');
        });
    });
}

// ==========================================================================
// INTERSECTION OBSERVER FOR FADE-UP ANIMATIONS
// ==========================================================================
const fadeElements = document.querySelectorAll('.fade-up');
const observerOptions = { root: null, rootMargin: '0px', threshold: 0.15 };
const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);
fadeElements.forEach(el => observer.observe(el));

// ==========================================================================
// FORM LOGIC
// ==========================================================================

function selectDistance(value) {
    const select = document.getElementById('distance-select');
    if (select) {
        select.value = value;
        updateFee();
        document.getElementById('register').scrollIntoView({ behavior: 'smooth' });
    }
}

function updateFee() {
    const select = document.getElementById('distance-select');
    const displayFee = document.getElementById('displayFee');
    if (select && select.value) {
        const fee = CONFIG.FEES[select.value];
        if (displayFee) {
            displayFee.textContent = new Intl.NumberFormat('vi-VN').format(fee) + ' VNĐ';
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const distanceSelect = document.getElementById("distance-select");
    if (distanceSelect) {
        distanceSelect.addEventListener("change", event => {
            updateFee();
        });
    }
});

const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const typoDomains = ['gmai.com', 'gmial.com', 'gmal.com', 'gmail.con', 'gmail.co'];

function showError(inputId, message) {
    const errorEl = document.getElementById(`error-${inputId}`);
    const inputEl = document.getElementById(inputId);
    if (errorEl) errorEl.innerHTML = message; // Dùng innerHTML để cho phép click sửa
    if (inputEl) inputEl.style.borderColor = 'var(--error)';
}

function clearError(inputId) {
    const errorEl = document.getElementById(`error-${inputId}`);
    const inputEl = document.getElementById(inputId);
    if (errorEl) errorEl.textContent = '';
    if (inputEl) inputEl.style.borderColor = '#D1D5DB';
}

function fixEmail(inputObj, correctEmail) {
    const inputEl = document.getElementById(inputObj);
    if (inputEl) {
        inputEl.value = correctEmail;
        clearError(inputObj);
        saveFormDraft(); // Cập nhật bản nháp
    }
}

// ==========================================================================
// AUTO-SAVE FORM DRAFT
// ==========================================================================
const formDraftKey = 'bcns_form_draft';

function saveFormDraft() {
    const draft = {
        fullname: document.getElementById('fullname')?.value || '',
        dob: document.getElementById('dob')?.value || '',
        gender: document.getElementById('gender')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        email: document.getElementById('email')?.value || '',
        confirmEmail: document.getElementById('confirmEmail')?.value || '',
        address: document.getElementById('address')?.value || '',
        distance: document.getElementById('distance-select')?.value || '',
        size: document.getElementById('size')?.value || '',
        emergencyName: document.getElementById('emergencyName')?.value || '',
        emergencyPhone: document.getElementById('emergencyPhone')?.value || ''
    };
    localStorage.setItem(formDraftKey, JSON.stringify(draft));
}

function loadFormDraft() {
    const draftStr = localStorage.getItem(formDraftKey);
    if (draftStr) {
        try {
            const draft = JSON.parse(draftStr);
            if (draft.fullname) document.getElementById('fullname').value = draft.fullname;
            if (draft.dob) document.getElementById('dob').value = draft.dob;
            if (draft.gender) document.getElementById('gender').value = draft.gender;
            if (draft.phone) document.getElementById('phone').value = draft.phone;
            if (draft.email) document.getElementById('email').value = draft.email;
            if (draft.confirmEmail) document.getElementById('confirmEmail').value = draft.confirmEmail;
            if (draft.address) document.getElementById('address').value = draft.address;
            if (draft.size) document.getElementById('size').value = draft.size;
            if (draft.emergencyName) document.getElementById('emergencyName').value = draft.emergencyName;
            if (draft.emergencyPhone) document.getElementById('emergencyPhone').value = draft.emergencyPhone;
            
            if (draft.distance) {
                document.getElementById('distance-select').value = draft.distance;
                updateFee();
            }
        } catch(e) {}
    }
}

// Lắng nghe sự thay đổi trên toàn bộ form để lưu nháp
document.addEventListener("DOMContentLoaded", () => {
    loadFormDraft();
    
    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('input', saveFormDraft);
        form.addEventListener('change', saveFormDraft);
    }
});

// Biến lưu trữ dữ liệu tạm để submit
let pendingFormData = null;

function handleFormSubmit(event) {
    event.preventDefault();
    
    const fields = ['fullname', 'dob', 'gender', 'phone', 'email', 'confirmEmail', 'address', 'distance-select', 'size', 'emergencyName', 'emergencyPhone', 'agreement', 'confirmEmailCheck'];
    fields.forEach(id => clearError(id));
    
    let isValid = true;
    
    // Kiểm tra honeypot (ẩn) - nếu có dữ liệu tức là bot spam
    const honeypot = document.getElementById('website_url');
    if (honeypot && honeypot.value !== '') {
        console.warn('Bot detected');
        return; // Dừng ngầm
    }

    const phone = document.getElementById('phone').value;
    if (!phoneRegex.test(phone)) {
        showError('phone', 'Số điện thoại không hợp lệ.');
        isValid = false;
    }
    
    const emergencyPhone = document.getElementById('emergencyPhone').value;
    if (!phoneRegex.test(emergencyPhone)) {
        showError('emergencyPhone', 'Số điện thoại không hợp lệ.');
        isValid = false;
    }
    
    if (phone === emergencyPhone) {
        showError('emergencyPhone', 'SĐT khẩn cấp phải khác SĐT của bạn.');
        isValid = false;
    }

    let email = document.getElementById('email').value.trim().toLowerCase();
    let confirmEmail = document.getElementById('confirmEmail').value.trim().toLowerCase();
    
    document.getElementById('email').value = email;
    document.getElementById('confirmEmail').value = confirmEmail;

    if (!emailRegex.test(email)) {
        showError('email', 'Email không hợp lệ.');
        isValid = false;
    } else {
        // Kiểm tra typo
        const domain = email.split('@')[1];
        if (typoDomains.includes(domain)) {
            const correctEmail = email.split('@')[0] + '@gmail.com';
            showError('email', `Có phải bạn muốn nhập: <a href="javascript:void(0)" onclick="fixEmail('email', '${correctEmail}')" style="color: var(--blue-sport); text-decoration: underline;">${correctEmail}</a>?`);
            isValid = false;
        }
    }

    if (email !== confirmEmail) {
        showError('confirmEmail', 'Hai địa chỉ Email không khớp nhau.');
        isValid = false;
    }

    if (!document.getElementById('agreement').checked) {
        showError('agreement', 'Bạn cần đồng ý với điều lệ.');
        isValid = false;
    }

    if (!document.getElementById('confirmEmailCheck').checked) {
        showError('confirmEmailCheck', 'Bạn cần xác nhận Gmail là chính xác.');
        isValid = false;
    }

    if (!isValid) return;

    // Chuẩn bị dữ liệu
    const distanceSelect = document.getElementById('distance-select');
    const distanceText = distanceSelect.options[distanceSelect.selectedIndex].text;
    const distanceVal = distanceSelect.value;
    const fee = CONFIG.FEES[distanceVal];

    pendingFormData = {
        fullname: document.getElementById('fullname').value.trim(),
        dob: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        phone: phone,
        email: email,
        address: document.getElementById('address').value.trim(),
        distance: distanceText,
        distanceValue: distanceVal,
        fee: fee,
        size: document.getElementById('size').value,
        emergencyName: document.getElementById('emergencyName').value.trim(),
        emergencyPhone: emergencyPhone
    };

    // Hiển thị Popup xác nhận
    document.getElementById('confirmModalEmailTxt').textContent = email;
    document.getElementById('confirmSubmitModal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmSubmitModal').classList.remove('active');
    pendingFormData = null;
}

// Xử lý gửi dữ liệu thật (Chỉ sinh Code Offline, không gọi API ở bước này)
// Xử lý gửi dữ liệu thật (Chỉ sinh Code Offline, không gọi API ở bước này)
function submitRegistration() {
    if (!pendingFormData) return;
    
    const confirmBtn = document.getElementById('finalSubmitBtn');
    
    // Trạng thái loading
    confirmBtn.innerHTML = '<span class="loader"></span> Đang xử lý...';
    
    // Sinh mã ngẫu nhiên Offline, dài 6-10 ký tự, không dấu, in hoa
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = randomStr;
    
    const distanceValue = pendingFormData.distanceValue;
    
    const transferContent = buildTransferContent(code, distanceValue);
    const qrUrl = buildVietQrUrl(code, distanceValue);
    
    // Cập nhật thêm vào formData để gửi backend
    pendingFormData.code = code; // Bảo toàn tên trường cũ
    pendingFormData.registrationCode = code;
    pendingFormData.transferContent = transferContent;
    // (distanceValue, fee đã có ở bước trước)
    
    // Lưu tạm TOÀN BỘ dữ liệu Form vào localStorage để bước Gửi Bill dùng lại
    localStorage.setItem('bcns_registration', JSON.stringify(pendingFormData));
    
    // Xóa bản nháp form vì đã submit thành công bước 1
    localStorage.removeItem(formDraftKey);
    
    // Chuyển sang bước thanh toán (SPA)
    document.getElementById('register').style.display = 'none';
    document.getElementById('paymentSection').style.display = 'block';
    
    // Render thông tin thanh toán
    document.getElementById('paymentCode').textContent = code;
    document.getElementById('paymentDistance').textContent = pendingFormData.distance;
    document.getElementById('paymentBankName').textContent = CONFIG.BANK_NAME;
    document.getElementById('paymentAccountName').textContent = CONFIG.ACCOUNT_NAME;
    document.getElementById('paymentBankAccount').textContent = CONFIG.BANK_ACCOUNT;
    document.getElementById('paymentFee').textContent = new Intl.NumberFormat('vi-VN').format(pendingFormData.fee) + ' VNĐ';
    
    const qrImg = document.getElementById('paymentQrImage');
    const transferContentElement = document.getElementById("paymentTransferContent");
    
    if (!qrImg) {
        console.error("Không tìm thấy vùng hiển thị QR");
    }
    
    if (!transferContentElement) {
        console.error("Không tìm thấy nội dung chuyển khoản");
    }

    transferContentElement.textContent = transferContent;
    qrImg.src = qrUrl;
    qrImg.alt = `QR thanh toán ${distanceValue.toUpperCase()} - ${new Intl.NumberFormat("vi-VN").format(pendingFormData.fee)} VNĐ`;

    qrImg.onload = () => {
        qrImg.classList.add("is-loaded");
        qrImg.classList.remove("has-error");
    };

    qrImg.onerror = () => {
        qrImg.classList.remove("is-loaded");
        qrImg.classList.add("has-error");
        console.error("Không thể tải VietQR:", qrUrl);
    };
    
    closeConfirmModal();
    
    // Khôi phục nút
    setTimeout(() => {
        confirmBtn.innerHTML = 'Xác nhận gửi';
    }, 500);
}

// ==========================================================================
// TẠO NỘI DUNG CHUYỂN KHOẢN VÀ QR ĐỘNG
// ==========================================================================
function buildTransferContent(registrationCode, distance) {
    const normalizedCode = String(registrationCode || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

    const distanceMap = {
        "3km": "3K",
        "5km": "5K"
    };

    const shortDistance = distanceMap[distance];

    if (!normalizedCode) {
        throw new Error("Thiếu mã đăng ký");
    }

    if (!shortDistance) {
        throw new Error("Cự ly không hợp lệ");
    }

    return `BCNS ${normalizedCode} ${shortDistance}`;
}

function buildVietQrUrl(registrationCode, distance) {
    const amount = CONFIG.FEES[distance];

    if (!amount) {
        throw new Error("Không xác định được lệ phí");
    }

    if (!CONFIG.BANK_CODE) {
        throw new Error("Thiếu mã ngân hàng");
    }

    if (!CONFIG.BANK_ACCOUNT) {
        throw new Error("Thiếu số tài khoản");
    }

    const transferContent = buildTransferContent(registrationCode, distance);

    const bankCode = encodeURIComponent(CONFIG.BANK_CODE);
    const accountNumber = encodeURIComponent(CONFIG.BANK_ACCOUNT);
    const accountName = encodeURIComponent(CONFIG.ACCOUNT_NAME);
    const addInfo = encodeURIComponent(transferContent);

    return (
        `https://img.vietqr.io/image/`
        + `${bankCode}-${accountNumber}-compact2.png`
        + `?amount=${amount}`
        + `&addInfo=${addInfo}`
        + `&accountName=${accountName}`
    );
}

// ==========================================================================
// SPA NAVIGATION & FOOTER SYNC
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const btnShowUploadSection = document.getElementById('btnShowUploadSection');
    if (btnShowUploadSection) {
        btnShowUploadSection.addEventListener('click', () => {
            document.getElementById('paymentSection').style.display = 'none';
            document.getElementById('uploadSection').style.display = 'block';
        });
    }

    // Sync Footer Contacts from CONFIG
    const footerEmail = document.getElementById('footerEmail');
    const footerPhone = document.getElementById('footerPhone');
    const footerFacebook = document.getElementById('footerFacebook');

    if (footerEmail && CONFIG.SUPPORT_EMAIL) {
        footerEmail.textContent = CONFIG.SUPPORT_EMAIL;
        footerEmail.href = `mailto:${CONFIG.SUPPORT_EMAIL}`;
    }
    if (footerPhone && CONFIG.SUPPORT_PHONE) {
        footerPhone.textContent = CONFIG.SUPPORT_PHONE;
        footerPhone.href = `tel:${CONFIG.SUPPORT_PHONE}`;
    }
    if (footerFacebook && CONFIG.FACEBOOK_URL) {
        footerFacebook.href = CONFIG.FACEBOOK_URL;
    }
});

// ==========================================================================
// TIỆN ÍCH COPY
// ==========================================================================
function copyText(elementId, customToastMsg) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    let textToCopy = el.textContent || el.innerText;
    
    if (elementId === 'paymentFee') {
        textToCopy = textToCopy.replace(/\D/g, ''); 
    }
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = customToastMsg || "Đã copy thành công!";
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }).catch(err => {
        console.error("Không thể copy:", err);
        alert("Copy thất bại, vui lòng bôi đen và copy thủ công.");
    });
}
