/**
 * The account's phone, password reset by SMS, and the staff SMS page. A
 * section of its own, imported into each dictionary as `sms`; the reference
 * shape is this file.
 */
const fa = {
  // ---- The account's phone ---------------------------------------------------
  phoneTitle: 'شمارهٔ همراه',
  phoneIntro: 'شمارهٔ همراه تأییدشده برای بازیابی رمز عبور و هشدارهای امنیتی به کار می‌رود.',
  phoneLabel: 'شمارهٔ همراه',
  verified: 'تأییدشده',
  notVerified: 'تأییدنشده',
  sendCode: 'ارسال کد',
  codeLabel: 'کد پیامک‌شده',
  confirm: 'تأیید',
  codeSent: 'کد تأیید برای {phone} پیامک شد.',
  phoneVerified: 'شمارهٔ همراه تأیید شد.',
  changeNumber: 'تغییر شماره',
  smsUnavailable: 'ارسال پیامک در این سایت فعال نیست.',
  optOutLabel: 'پیامک‌های اطلاع‌رسانی (درخواست‌ها و پیشنهادهای تازه) را نمی‌خواهم',
  optOutHint: 'کدهای تأیید و هشدارهای امنیتی همیشه فرستاده می‌شوند.',
  saved: 'ذخیره شد.',

  // ---- Password reset by SMS ---------------------------------------------------
  resetTitle: 'بازیابی رمز با پیامک',
  resetIntro: 'ایمیل یا نام کاربری حساب را وارد کنید. اگر حساب شمارهٔ همراه تأییدشده داشته باشد، کد بازیابی برای آن پیامک می‌شود.',
  identifier: 'ایمیل یا نام کاربری',
  sendResetCode: 'ارسال کد بازیابی',
  resetCodeSent: 'اگر این حساب شمارهٔ همراه تأییدشده داشته باشد، کد برای آن پیامک شد.',
  newPassword: 'رمز عبور تازه',
  resetSubmit: 'تغییر رمز عبور',
  resetDone: 'رمز عبور تغییر کرد. با رمز تازه وارد شوید.',
  byEmail: 'بازیابی با ایمیل',
  noPhoneHint: 'شمارهٔ تأییدشده ندارید؟ با پشتیبانی تماس بگیرید.',

  // ---- Staff: the SMS page -------------------------------------------------------
  adminTitle: 'پیامک‌ها',
  adminIntro: 'هزینهٔ پیامک‌ها و آخرین ارسال‌ها. شمارهٔ گیرندگان ذخیره نمی‌شود.',
  provider: 'سرویس',
  canSendYes: 'ارسال فعال',
  canSendNo: 'ارسال غیرفعال',
  memberAlertsOn: 'پیامک به اعضا: روشن',
  memberAlertsOff: 'پیامک به اعضا: خاموش',
  dailyCap: 'سقف روزانه برای هر شماره: {count}',
  totalCost: 'هزینهٔ {days} روز اخیر: {amount} ریال',
  kind: 'نوع',
  template: 'قالب',
  sent: 'ارسال‌شده',
  failed: 'ناموفق',
  skipped: 'ارسال‌نشده',
  costRials: 'هزینه (ریال)',
  recent: 'آخرین پیامک‌ها',
  reason: 'دلیل',
  when: 'زمان',
  kinds: {
    otp: 'کد تأیید',
    passwordChanged: 'تغییر رمز عبور',
    twoStepOff: 'خاموش‌شدن ورود دومرحله‌ای',
    accountDeleted: 'حذف حساب',
    received: 'ثبت درخواست',
    scheduled: 'زمان هماهنگ‌شده',
    proposalReady: 'پیشنهاد پروژه آماده',
    resumeUpdate: 'نتیجهٔ بررسی رزومه',
    account: 'حساب آماده',
    waiting: 'منتظر پاسخ',
    verification: 'نتیجهٔ احراز هویت',
  },
  statuses: {
    SENT: 'ارسال‌شده',
    FAILED: 'ناموفق',
    SKIPPED: 'ارسال‌نشده',
  },
};

export default fa;
