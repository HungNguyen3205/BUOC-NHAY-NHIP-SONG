// =====================================================================================
// CẤU HÌNH BAN ĐẦU - BẠN CHỈ CẦN CHẠY HÀM setupProperties() 1 LẦN DUY NHẤT ĐỂ LƯU.
// =====================================================================================

function normalizeDriveFolderId(value) {
  var raw = String(value || "").trim();
  if (!raw || raw.indexOf("THAY_BẰNG") !== -1) {
    throw new Error("DRIVE_FOLDER_ID chưa được cấu hình. Hãy lưu ID thư mục BCNS_BILLS trong Script Properties.");
  }

  var match = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  match = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  if (!/^[a-zA-Z0-9_-]{10,}$/.test(raw)) {
    throw new Error("DRIVE_FOLDER_ID không hợp lệ: " + raw);
  }
  return raw;
}

/**
 * Chạy thủ công hàm này một lần trong Apps Script Editor.
 * Hàm vừa yêu cầu quyền OAuth, vừa kiểm tra đúng thư mục đích.
 */
function KICH_HOAT_QUYEN_DRIVE() {
  var conf = getConfig();
  var folderId = normalizeDriveFolderId(conf.DRIVE_FOLDER_ID);
  var folder = DriveApp.getFolderById(folderId);
  var testFile = folder.createFile(
    Utilities.newBlob("BCNS permission test", "text/plain", "bcns-drive-test.txt")
  );
  testFile.setTrashed(true);
  Logger.log("Đã cấp quyền Drive và ghi thử thành công vào: " + folder.getName());
  return "OK";
}

function setupProperties() {
  var props = PropertiesService.getScriptProperties();
  var currentFolderId = props.getProperty("DRIVE_FOLDER_ID");
  var active = SpreadsheetApp.getActiveSpreadsheet();

  props.setProperties({
    'SPREADSHEET_ID': '10LvabZRxCr4Sa8FDMQHhxqEDcbEhLmbDxZh7svKt_Gs',
    // Không ghi đè ID thật nếu bạn chạy setupProperties() lại.
    'DRIVE_FOLDER_ID': '18pnA1b5TdtVNhJIydVqWxDUskgsx2GeY',
    'SUPPORT_EMAIL': 'nhipsongbuocchay@gmail.com',
    'FACEBOOK_URL': 'https://www.facebook.com/profile.php?id=61593697175095',
    'LOGO_URL': 'https://via.placeholder.com/150x50.png?text=LOGO+BCNS',
    'SHEET_NAME': 'DANG_KY_BCNS',
    'EVENT_NAME': 'BƯỚC CHẠY NHỊP SỐNG 2026',
    'LOCATION': '2782+CMW, Trần Văn Đán, Ngũ Hành Sơn, Đà Nẵng'
  });
  Logger.log("Đã lưu Properties. Hãy kiểm tra DRIVE_FOLDER_ID rồi chạy KICH_HOAT_QUYEN_DRIVE().");
}

function getConfig() {
  return PropertiesService.getScriptProperties().getProperties();
}

function getDriveAccessHelp_(error) {
  return [
    "DriveApp bị từ chối quyền.",
    "Mở Apps Script bằng đúng tài khoản sở hữu thư mục;",
    "chạy KICH_HOAT_QUYEN_DRIVE() trong Editor và bấm Cho phép;",
    "sau đó Deploy > Manage deployments > Edit > New version;",
    "Execute as phải là Me và Who has access là Anyone;",
    "tài khoản chạy script phải có quyền Editor với thư mục.",
    "Chi tiết: " + error
  ].join(" ");
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: "BCNS API đang hoạt động",
      version: "2026-09-10-02"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// =====================================================================================
// 1. NHẬN DỮ LIỆU TỪ WEBSITE (POST) - LƯU TẤT CẢ CÙNG LÚC
// =====================================================================================
function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  if (!e || !e.postData || !e.postData.contents) {
    return output.setContent(JSON.stringify({ success: false, message: "Không có dữ liệu gửi lên." }));
  }

  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    
    if (action === "submitFullRegistration") {
      return output.setContent(JSON.stringify(submitFullRegistration(data)));
    } else {
      return output.setContent(JSON.stringify({ success: false, message: "Action không hợp lệ." }));
    }
  } catch (error) {
    return output.setContent(JSON.stringify({ success: false, message: "Lỗi Server: " + error.toString() }));
  }
}

// =====================================================================================
// 1.A. LƯU TOÀN BỘ ĐĂNG KÝ VÀ BILL
// =====================================================================================
function submitFullRegistration(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  
  try {
    var conf = getConfig();
    if (!conf.DRIVE_FOLDER_ID) {
      return { success: false, message: "LỖI CHƯA CÀI ĐẶT DRIVE_FOLDER_ID" };
    }
    
    var sheet = SpreadsheetApp.openById(conf.SPREADSHEET_ID).getSheetByName(conf.SHEET_NAME);
    if (!sheet) {
      return { success: false, message: "LỖI: Không tìm thấy Sheet " + conf.SHEET_NAME };
    }
    
    var timestamp = new Date();
    if (!data.code || !data.fileData) {
      return { success: false, message: "Thiếu thông tin bắt buộc hoặc ảnh hóa đơn." };
    }
    
    var folderId = normalizeDriveFolderId(conf.DRIVE_FOLDER_ID);
    var timeStr = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss");
    var safeName = String(data.fullname || "RUNNER")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, "-")
      .toUpperCase();
    var mimeType = data.mimeType || "image/jpeg";
    var extension = mimeType === "image/png" ? ".png" :
                    mimeType === "image/webp" ? ".webp" : ".jpg";
    var finalFileName = data.code + "_" + safeName + "_" + timeStr + extension;
    var blob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      mimeType,
      finalFileName
    );

    var folder;
    var file;
    try {
      folder = DriveApp.getFolderById(folderId);
      file = folder.createFile(blob);
    } catch (driveError) {
      throw new Error(getDriveAccessHelp_(driveError.toString()));
    }

    // Giữ bill ở chế độ riêng tư. Ảnh xem trước sẽ được chèn trực tiếp vào Sheet.
    var fileId = file.getId();
    var imageFormula = "";

    var newRow = [
      timestamp, data.code, data.fullname, data.dob, data.gender, data.phone, data.email, data.address,
      data.distance, data.size, data.emergencyName, data.emergencyPhone, data.fee || 0,
      data.transferContent, fileId, imageFormula, "", "", "", "", "", "", 
      "[" + Utilities.formatDate(new Date(), "GMT+7", "dd/MM HH:mm") + "] Tạo mới đăng ký và tải bill."
    ];
    
    sheet.appendRow(newRow);
    var appendedRow = sheet.getLastRow();

    // Hiển thị bill ngay trên Sheet mà không công khai file Drive.
    // Nếu chèn preview lỗi, dữ liệu đăng ký vẫn được giữ và cột P có link dự phòng.
    var previewWarning = "";
    try {
      sheet.setRowHeight(appendedRow, 130);
      sheet.setColumnWidth(16, 200);
      var preview = sheet.insertImage(blob, 16, appendedRow);
      preview.setWidth(180).setHeight(120);
    } catch (previewError) {
      var privateViewUrl = "https://drive.google.com/file/d/" + fileId + "/view";
      sheet.getRange(appendedRow, 16).setFormula(
        '=HYPERLINK("' + privateViewUrl + '","Mở hóa đơn")'
      );
      previewWarning = "Bill đã lưu; không chèn được ảnh xem trước.";
      Logger.log(previewWarning + " " + previewError);
    }
    SpreadsheetApp.flush();

    return {
      success: true,
      code: data.code,
      fileId: fileId,
      warning: previewWarning,
      message: "Tải lên thành công"
    };
    
  } catch (err) {
    // Trả về DÒNG LỖI chính xác để debug
    var line = err.lineNumber ? " (Dòng: " + err.lineNumber + ")" : "";
    return { success: false, message: "LỖI HỆ THỐNG: " + err.toString() + line };
  } finally {
    lock.releaseLock();
  }
}

// =====================================================================================
// 2. TRIGGER ADMIN DUYỆT TRẠNG THÁI (ONEDIT)
// =====================================================================================
function handleStatusChange(e) {
  if (!e || !e.range) return;
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  
  // Kiểm tra cấu hình có sẵn không
  var conf = getConfig();
  if (!conf || sheet.getName() !== conf.SHEET_NAME) return;
  
  // Chỉ chạy khi sửa cột Q (Cột 17)
  if (range.getColumn() !== 17 || range.getRow() <= 1) return;
  
  var status = range.getValue().toString().trim().toUpperCase();
  var row = range.getRow();
  
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (status === "THANH TOÁN THÀNH CÔNG") {
      processApproved(sheet, row, conf);
    } else if (status === "THANH TOÁN THẤT BẠI") {
      processRejected(sheet, row, conf);
    }
  } finally {
    lock.releaseLock();
  }
}

function processApproved(sheet, row, conf) {
  var rowData = sheet.getRange(row, 1, 1, 23).getValues()[0];
  var email = rowData[6];
  var lastEmailType = rowData[20]; // Cột U
  
  if (!email) return;
  if (lastEmailType === "XÁC NHẬN HỢP LỆ") return; // Tránh gửi trùng
  
  var success = sendApprovedEmail(rowData, conf);
  
  var timeNow = new Date();
  sheet.getRange(row, 19).setValue(timeNow); // Thời gian xử lý
  if (success) {
    sheet.getRange(row, 20).setValue("ĐÃ GỬI"); // Đã gửi mail
    sheet.getRange(row, 21).setValue("XÁC NHẬN HỢP LỆ"); // Loại mail cuối
    sheet.getRange(row, 22).setValue(timeNow); // TG gửi mail
    sheet.getRange(row, 17).setValue("THANH TOÁN THÀNH CÔNG");
  } else {
    sheet.getRange(row, 20).setValue("GỬI LỖI");
  }
}

function processRejected(sheet, row, conf) {
  var rowData = sheet.getRange(row, 1, 1, 23).getValues()[0];
  var reason = rowData[17]; // Cột R
  var email = rowData[6];
  
  if (!reason || reason.toString().trim() === "") {
    SpreadsheetApp.getUi().alert("Bắt buộc phải nhập 'Lý do không hợp lệ' (Cột R) trước khi chọn KHÔNG HỢP LỆ.");
    sheet.getRange(row, 17).clearContent(); // Hoàn tác
    return;
  }
  
  if (!email) return;
  
  var success = sendRejectedEmail(rowData, conf);
  
  var timeNow = new Date();
  sheet.getRange(row, 19).setValue(timeNow); // Thời gian xử lý
  if (success) {
    sheet.getRange(row, 20).setValue("ĐÃ GỬI"); 
    sheet.getRange(row, 21).setValue("THÔNG BÁO KHÔNG HỢP LỆ"); 
    sheet.getRange(row, 22).setValue(timeNow); 
    sheet.getRange(row, 17).setValue("THANH TOÁN THẤT BẠI");
  } else {
    sheet.getRange(row, 20).setValue("GỬI LỖI");
  }
}

// =====================================================================================
// 3. GỬI EMAIL THÔNG BÁO
// =====================================================================================
function sendApprovedEmail(rowData, conf) {
  var code = rowData[1];
  var fullname = rowData[2];
  var email = rowData[6];
  var distance = rowData[8];
  var size = rowData[9];
  var fee = rowData[12];
  
  var subject = "[BCNS 2026] Xác nhận đăng ký thành công – " + code;
  
  var htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #071B33; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
      <div style="background: #071B33; color: #FFC535; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">${conf.EVENT_NAME}</h2>
      </div>
      <div style="padding: 30px;">
        <p>Xin chào <strong>${fullname}</strong>,</p>
        <p>Chúc mừng bạn đã đăng ký thành công chương trình BƯỚC CHẠY NHỊP SỐNG.</p>
        <p>Ban tổ chức đã kiểm tra và xác nhận thông tin thanh toán của bạn là hợp lệ.</p>
        
        <div style="background: #F3F4F6; border-left: 4px solid #27AAE1; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 5px 0;"><strong>Mã đăng ký:</strong> <span style="color: #27AAE1;">${code}</span></p>
          <p style="margin: 5px 0;"><strong>Cự ly:</strong> ${distance}</p>
          <p style="margin: 5px 0;"><strong>Size áo:</strong> ${size}</p>
          <p style="margin: 5px 0;"><strong>Số tiền:</strong> ${new Intl.NumberFormat('vi-VN').format(fee)} VNĐ</p>
          <p style="margin: 5px 0;"><strong>Trạng thái:</strong> <span style="color: #10B981; font-weight: bold;">ĐÃ XÁC NHẬN</span></p>
        </div>
        
        <h3 style="color: #0C2948; border-bottom: 2px solid #FFC535; display: inline-block;">THỜI GIAN CHƯƠNG TRÌNH</h3>
        <ul style="padding-left: 20px; margin-bottom: 20px;">
          <li><strong>05:00</strong> – Tập trung, check-in và khởi động</li>
          <li><strong>06:00</strong> – Khai mạc và xuất phát</li>
          <li><strong>08:00</strong> – Về đích và bế mạc</li>
        </ul>
        
        <h3 style="color: #0C2948; border-bottom: 2px solid #FFC535; display: inline-block;">ĐỊA ĐIỂM</h3>
        <p style="margin-bottom: 20px;">${conf.LOCATION}</p>
        
        <div style="background: #FEF3C7; color: #92400E; padding: 10px 15px; border-radius: 4px; margin-bottom: 20px; font-size: 0.9rem;">
          <strong>Lưu ý:</strong> Vui lòng lưu email và mã đăng ký để đối chiếu khi nhận BIB.
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${conf.FACEBOOK_URL}" style="background: #27AAE1; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">LIÊN HỆ FANPAGE</a>
        </div>
      </div>
    </div>
  `;
  
  var textBody = `Xin chào ${fullname},\n\nChúc mừng bạn đã đăng ký thành công chương trình BƯỚC CHẠY NHỊP SỐNG.\nBan tổ chức đã kiểm tra và xác nhận thông tin thanh toán của bạn là hợp lệ.\n\nMã đăng ký: ${code}\nCự ly: ${distance}\nTrạng thái: ĐÃ XÁC NHẬN\n\nTrân trọng,\nBAN TỔ CHỨC`;
  
  try {
    MailApp.sendEmail({ to: email, subject: subject, body: textBody, htmlBody: htmlBody });
    return true;
  } catch (e) {
    Logger.log(e); return false;
  }
}

function sendRejectedEmail(rowData, conf) {
  var code = rowData[1];
  var fullname = rowData[2];
  var email = rowData[6];
  var distance = rowData[8];
  var reason = rowData[17];
  
  var subject = "[BCNS 2026] Cần kiểm tra lại thanh toán – " + code;
  
  var htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #071B33; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
      <div style="background: #071B33; color: #FFC535; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">${conf.EVENT_NAME}</h2>
      </div>
      <div style="padding: 30px;">
        <p>Xin chào <strong>${fullname}</strong>,</p>
        <p>Ban tổ chức đã kiểm tra thông tin đăng ký và hình ảnh thanh toán của bạn.</p>
        <p>Hiện tại, chúng tôi chưa thể xác nhận đăng ký vì:</p>
        
        <div style="background: #FEE2E2; color: #991B1B; padding: 15px; margin: 20px 0; border-radius: 4px; font-weight: bold;">
          ${reason}
        </div>
        
        <p><strong>Mã đăng ký:</strong> ${code}</p>
        <p><strong>Cự ly:</strong> ${distance}</p>
        <p style="margin-bottom: 20px;"><strong>Trạng thái:</strong> <span style="color: #DC2626; font-weight: bold;">CHƯA ĐƯỢC XÁC NHẬN</span></p>
        
        <p>Vui lòng kiểm tra lại giao dịch và liên hệ Fanpage BƯỚC CHẠY NHỊP SỐNG để được hỗ trợ.</p>
        <p style="font-weight: bold; color: #DC2626;">Không thực hiện chuyển khoản lại khi chưa trao đổi với Ban tổ chức.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${conf.FACEBOOK_URL}" style="background: #27AAE1; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">LIÊN HỆ FANPAGE</a>
        </div>
      </div>
    </div>
  `;
  
  var textBody = `Xin chào ${fullname},\n\nBan tổ chức đã kiểm tra thông tin. Hiện tại chúng tôi chưa thể xác nhận đăng ký vì:\n${reason}\n\nVui lòng liên hệ Fanpage để được hỗ trợ.\nKhông thực hiện chuyển khoản lại khi chưa trao đổi với Ban tổ chức.\n\nTrân trọng,\nBAN TỔ CHỨC`;
  
  try {
    MailApp.sendEmail({ to: email, subject: subject, body: textBody, htmlBody: htmlBody });
    return true;
  } catch (e) {
    Logger.log(e); return false;
  }
}

// =====================================================================================
// 4. MENU QUẢN TRỊ TRÊN GOOGLE SHEETS
// =====================================================================================
function setupStatusTrigger() {
  var conf = getConfig();
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "handleStatusChange") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger("handleStatusChange")
    .forSpreadsheet(conf.SPREADSHEET_ID)
    .onEdit()
    .create();
  Logger.log("Đã tạo trigger gửi email khi thay đổi trạng thái.");
}

function createAdminMenu() {
  SpreadsheetApp.getUi().createMenu('BCNS')
    .addItem('Thanh toán thành công', 'menuMarkValid')
    .addItem('Thanh toán thất bại', 'menuMarkInvalid')
    .addItem('Gửi lại email dòng đang chọn', 'resendEmailForSelectedRow')
    .addItem('Mở bill dòng đang chọn', 'menuOpenBill')
    .addItem('Kiểm tra dữ liệu dòng đang chọn', 'menuCheckData')
    .addItem('Kiểm tra hạn mức Gmail', 'checkEmailQuota')
    .addToUi();
}

function onOpen() {
  createAdminMenu();
}

function menuMarkValid() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveCell().getRow();
  if (row <= 1) return;
  sheet.getRange(row, 17).setValue("THANH TOÁN THÀNH CÔNG");
  handleStatusChange({ source: SpreadsheetApp.getActiveSpreadsheet(), range: sheet.getRange(row, 17) });
}

function menuMarkInvalid() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveCell().getRow();
  if (row <= 1) return;
  
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt("Từ chối thanh toán", "Nhập lý do không hợp lệ (Bắt buộc):", ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() === ui.Button.OK) {
    var reason = res.getResponseText();
    if (reason.trim() === "") {
      ui.alert("Vui lòng không để trống lý do.");
      return;
    }
    sheet.getRange(row, 18).setValue(reason); // Cột R
    sheet.getRange(row, 17).setValue("THANH TOÁN THẤT BẠI");
    handleStatusChange({ source: SpreadsheetApp.getActiveSpreadsheet(), range: sheet.getRange(row, 17) });
  }
}

function resendEmailForSelectedRow() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveCell().getRow();
  if (row <= 1) return;
  
  var conf = getConfig();
  var status = sheet.getRange(row, 17).getValue();
  
  if (status === "THANH TOÁN THÀNH CÔNG") {
    processApproved(sheet, row, conf);
    SpreadsheetApp.getUi().alert("Đã gửi lại email Xác Nhận Tham Gia.");
  } else if (status === "THANH TOÁN THẤT BẠI") {
    processRejected(sheet, row, conf);
    SpreadsheetApp.getUi().alert("Đã gửi lại email Thông Báo Không Hợp Lệ.");
  } else {
    SpreadsheetApp.getUi().alert("Không có email nào khả dụng cho trạng thái này.");
  }
}

function menuOpenBill() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveCell().getRow();
  if (row <= 1) return;
  
  var fileId = sheet.getRange(row, 15).getValue(); // Cột O chứa File ID
  if (fileId) {
    var url = "https://drive.google.com/file/d/" + fileId + "/view";
    // Hiển thị một khung nhỏ chứa link click được
    var html = HtmlService.createHtmlOutput('<a href="' + url + '" target="_blank" style="font-size: 16px;">Mở Bill ở Tab mới</a>')
      .setWidth(250).setHeight(100);
    SpreadsheetApp.getUi().showModalDialog(html, 'Liên kết hóa đơn');
  } else {
    SpreadsheetApp.getUi().alert("Người dùng chưa tải bill lên.");
  }
}

function checkEmailQuota() {
  var quota = MailApp.getRemainingDailyQuota();
  if (quota < 20) {
    SpreadsheetApp.getUi().alert("CẢNH BÁO: Hạn mức Gmail còn lại rất thấp: " + quota + " emails.");
  } else {
    SpreadsheetApp.getUi().alert("Hạn mức gửi mail còn lại hôm nay: " + quota + " emails.");
  }
}

function menuCheckData() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveCell().getRow();
  if (row <= 1) return;
  var code = sheet.getRange(row, 2).getValue();
  var name = sheet.getRange(row, 3).getValue();
  var status = sheet.getRange(row, 17).getValue();
  SpreadsheetApp.getUi().alert("Thông tin:\n- Mã: " + code + "\n- Tên: " + name + "\n- Trạng thái: " + status);
}