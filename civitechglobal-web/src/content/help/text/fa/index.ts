import type { HelpLibraryText } from '../../types';
import company from './company';
import insurance from './insurance';
import consult from './consult';
import jobs from './jobs';
import freelance from './freelance';
import books from './books';
import marketplace from './marketplace';
import account from './account';
import member from './member';
import staff from './staff';

const fa: HelpLibraryText = {
  collections: {
    company: { title: 'شرکت و خدمات نرم‌افزار', description: 'آشنایی با رایان تمدن جهان گستر، خدمات توسعهٔ نرم‌افزار، درخواست پروژه، تماس و همکاری با ما.' },
    insurance: { title: 'بیمه', description: 'ثبت آنلاین درخواست انواع بیمه، فرم اختصاصی هر رشته و پیگیری با کد رهگیری.' },
    consult: { title: 'مشاوره و متخصصان', description: 'درخواست مشاورهٔ فنی یا شغلی و آشنایی با باشگاه متخصصان.' },
    jobs: { title: 'فرصت‌های شغلی', description: 'جستجو و درخواست فرصت‌های شغلی، صفحهٔ شرکت‌ها و ثبت آگهی استخدام.' },
    freelance: { title: 'پروژه‌های فریلنسری', description: 'ثبت پروژه، ارسال پیشنهاد، خدمات آماده و فهرست فریلنسرها.' },
    books: { title: 'بازار کتاب', description: 'خرید و فروش کتاب‌های نو و دست‌دوم میان اعضا.' },
    marketplace: { title: 'بازارچهٔ محلی', description: 'فروشگاه‌ها و کالاهای محلی روی نقشه، و ثبت فروشگاه.' },
    account: { title: 'حساب کاربری', description: 'ثبت‌نام، ورود، بازیابی رمز عبور و تأیید ایمیل.' },
    member: { title: 'پنل کاربری', description: 'داشبورد اعضا: پروفایل، احراز هویت، درخواست‌ها، پیام‌ها و فعالیت‌های شما در بازارگاه.' },
    staff: { title: 'پنل مدیریت', description: 'راهنمای کارکنان برای بررسی درخواست‌ها، صف‌های تأیید و مدیریت سایت.' },
  },
  articles: {
    ...company,
    ...insurance,
    ...consult,
    ...jobs,
    ...freelance,
    ...books,
    ...marketplace,
    ...account,
    ...member,
    ...staff,
  },
};

export default fa;
