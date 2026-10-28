/**
 * Google Apps Script web app used by the Laravel backend to send mail.
 * Deploy this while signed in as cyrustadoy@gmail.com.
 * Gmail sends as the Google account that owns the deployment.
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * SECRET_KEY must match GSCRIPT_SECRET in backend-app/.env
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var SECRET_KEY = "secret_key_123";

    if (data.secret !== SECRET_KEY) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Unauthorized request."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    GmailApp.sendEmail(data.to, data.subject, data.body, {
      from: data.from_email || "cyrustadoy@gmail.com",
      name: data.from_name || "PHINMA COC",
      htmlBody: data.html_body || null
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Email sent successfully!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
