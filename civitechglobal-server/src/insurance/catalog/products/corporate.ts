import type { ProductDef } from '../types.js';
import { claimHistory, currencyField } from '../fields.js';

/**
 * Cargo and engineering lines. Every one of these is CALLBACK: the source
 * publishes no intake fields for them because an underwriter prices each
 * shipment or contract by hand against the goods, the route and the terms.
 *
 * What these forms collect is therefore not a quote request — it is enough
 * structure that the specialist making the call already knows the shape of the
 * risk before dialling.
 */

const TRANSPORT_MODES = [
  { value: 'sea', label: 'دریایی', labelEn: 'Sea' },
  { value: 'air', label: 'هوایی', labelEn: 'Air' },
  { value: 'land', label: 'زمینی (جاده‌ای)', labelEn: 'Road' },
  { value: 'rail', label: 'ریلی', labelEn: 'Rail' },
  { value: 'multimodal', label: 'ترکیبی', labelEn: 'Multimodal' },
];

const CARGO_CONDITIONS = [
  {
    value: 'clause-a',
    label: 'شرایط A — تمام خطر',
    labelEn: 'Institute Clauses A — all risks',
  },
  { value: 'clause-b', label: 'شرایط B', labelEn: 'Institute Clauses B' },
  {
    value: 'clause-c',
    label: 'شرایط C — حداقلی',
    labelEn: 'Institute Clauses C — minimum',
  },
  {
    value: 'advise',
    label: 'نمی‌دانم — راهنمایی می‌خواهم',
    labelEn: 'Not sure — please advise',
  },
];

function cargoFields(
  originLabel: string,
  originLabelEn: string,
  destLabel: string,
  destLabelEn: string,
): ProductDef['fields'] {
  return [
    {
      name: 'goodsDescription',
      label: 'شرح کالا',
      labelEn: 'Description of goods',
      type: 'text',
      required: true,
      maxLength: 300,
      help: 'نوع کالا بیشترین اثر را بر نرخ دارد — کالای شکستنی یا فاسدشدنی را ذکر کنید.',
      helpEn: 'The nature of the goods drives the rate — say if they are fragile or perishable.',
    },
    currencyField('cargoValue', 'ارزش محموله', 'Value of the shipment'),
    {
      name: 'transportMode',
      label: 'روش حمل',
      labelEn: 'Mode of transport',
      type: 'select',
      required: true,
      options: TRANSPORT_MODES,
    },
    {
      name: 'origin',
      label: originLabel,
      labelEn: originLabelEn,
      type: 'text',
      required: true,
      maxLength: 150,
    },
    {
      name: 'destination',
      label: destLabel,
      labelEn: destLabelEn,
      type: 'text',
      required: true,
      maxLength: 150,
    },
    {
      name: 'coverConditions',
      label: 'شرایط پوشش',
      labelEn: 'Cover conditions',
      type: 'select',
      required: true,
      options: CARGO_CONDITIONS,
    },
    {
      name: 'shipmentsPerYear',
      label: 'تعداد محموله در سال',
      labelEn: 'Shipments per year',
      type: 'number',
      required: false,
      min: 1,
      max: 10000,
      help: 'برای محموله‌های تکرارشونده می‌توان بیمه‌نامه عمومی (اوپن) صادر کرد.',
      helpEn: 'Repeat shipments can be written under a single open policy.',
    },
  ];
}

export const corporateProducts: ProductDef[] = [
  {
    slug: 'cargo-import',
    categorySlug: 'corporate',
    title: 'بیمه باربری مرسولات وارداتی',
    titleEn: 'Marine cargo — imports',
    summary: 'پوشش کالا از مبدأ خارجی تا انبار شما',
    summaryEn: 'Covers goods from the foreign origin to your warehouse',
    description:
      'بیمه باربری وارداتی کالا را از لحظه خروج از انبار فروشنده در مبدأ خارجی تا تحویل در انبار شما پوشش می‌دهد. نرخ آن به نوع کالا، مسیر، روش حمل و شرایط پوششی انتخابی بستگی دارد و برای هر محموله جداگانه تعیین می‌شود. اگر واردات منظم دارید، بیمه‌نامه عمومی (اوپن) به‌صرفه‌تر از صدور تک‌محموله است.',
    descriptionEn:
      'Import cargo insurance covers goods from the moment they leave the seller’s warehouse abroad until they reach yours. The rate depends on the commodity, the route, the mode of carriage and the cover conditions, and is set per shipment. For regular importers, an open policy is cheaper than issuing certificates one at a time.',
    coverages: [
      'خسارت و فقدان کالا در طول حمل',
      'هزینه‌های نجات و خسارت همگانی',
      'پوشش انبار تا انبار',
    ],
    notes: ['امکان صدور بیمه‌نامه عمومی (اوپن) برای واردکنندگان منظم.'],
    intake: 'CALLBACK',
    audience: 'CORPORATE',
    icon: 'Ship',
    order: 1,
    fields: cargoFields(
      'کشور و بندر مبدأ',
      'Country and port of origin',
      'مقصد در ایران',
      'Destination in Iran',
    ),
  },

  {
    slug: 'cargo-export',
    categorySlug: 'corporate',
    title: 'بیمه باربری مرسولات صادراتی',
    titleEn: 'Marine cargo — exports',
    summary: 'پوشش کالای صادراتی از انبار شما تا مقصد خارجی',
    summaryEn: 'Covers exported goods from your warehouse to the foreign destination',
    description:
      'بیمه باربری صادراتی کالای شما را از انبار در ایران تا تحویل به خریدار در مقصد خارجی پوشش می‌دهد. در بسیاری از قراردادهای صادراتی، ارائه بیمه‌نامه معتبر بخشی از شرایط اعتبار اسنادی است و نبود آن پرداخت را متوقف می‌کند. شرایط پوشش باید با شرایط قرارداد فروش هم‌خوانی داشته باشد.',
    descriptionEn:
      'Export cargo insurance covers your goods from the warehouse in Iran until delivery to the buyer abroad. In many export contracts a valid certificate is a condition of the letter of credit, and its absence stops payment. The cover conditions must match what the sales contract requires.',
    coverages: [
      'خسارت و فقدان کالا در طول حمل',
      'هزینه‌های نجات و خسارت همگانی',
      'پوشش مطابق شرایط اعتبار اسنادی',
    ],
    notes: ['شرایط پوشش باید با اعتبار اسنادی و قرارداد فروش هم‌خوان باشد.'],
    intake: 'CALLBACK',
    audience: 'CORPORATE',
    icon: 'Container',
    order: 2,
    fields: cargoFields(
      'مبدأ در ایران',
      'Origin in Iran',
      'کشور و بندر مقصد',
      'Country and port of destination',
    ),
  },

  {
    slug: 'cargo-bank',
    categorySlug: 'corporate',
    title: 'بیمه باربری مرهونات (به نفع بانک)',
    titleEn: 'Marine cargo — bank-assigned',
    summary: 'بیمه‌نامه‌ای که خسارت آن به بانک تسهیلات‌دهنده پرداخت می‌شود',
    summaryEn: 'A cargo policy with the loss payable to the financing bank',
    description:
      'وقتی کالایی با تسهیلات بانکی وارد یا معامله می‌شود، بانک به عنوان ذی‌نفع بیمه‌نامه تعیین می‌شود تا در صورت خسارت، مبلغ مستقیماً به بانک پرداخت شود. بانک‌ها معمولاً متن و شرایط مشخصی برای این بیمه‌نامه می‌خواهند و صدور آن باید با شعبه هماهنگ شود. نام بانک و شماره پرونده تسهیلات را در فرم بنویسید تا هماهنگی سریع‌تر انجام شود.',
    descriptionEn:
      'Where goods are financed by a bank, the bank is named as loss payee so that any claim is settled directly to it. Banks usually require specific wording and conditions, and issuance has to be coordinated with the branch. Give the bank name and facility reference so that coordination can start immediately.',
    coverages: ['پوشش باربری با ذی‌نفع بانک', 'خسارت و فقدان کالا در طول حمل'],
    notes: ['متن و شرایط بیمه‌نامه باید مورد تأیید بانک تسهیلات‌دهنده باشد.'],
    intake: 'CALLBACK',
    audience: 'CORPORATE',
    icon: 'Landmark',
    order: 3,
    fields: [
      ...cargoFields('مبدأ', 'Origin', 'مقصد', 'Destination'),
      {
        name: 'bankName',
        label: 'نام بانک ذی‌نفع',
        labelEn: 'Beneficiary bank',
        type: 'text',
        required: true,
        maxLength: 120,
      },
      {
        name: 'facilityReference',
        label: 'شماره پرونده یا اعتبار اسنادی',
        labelEn: 'Facility or LC reference',
        type: 'text',
        required: false,
        maxLength: 80,
      },
    ],
  },

  {
    slug: 'engineering-all-risk',
    categorySlug: 'corporate',
    title: 'بیمه تمام خطر مهندسی (نصب و پیمانکاران)',
    titleEn: 'Engineering all-risk (erection and contractors)',
    summary: 'پوشش پروژه‌های ساخت و نصب در طول اجرا',
    summaryEn: 'Covers construction and erection projects while they are being built',
    description:
      'بیمه تمام خطر پیمانکاران و نصب، پروژه را در طول دوره اجرا در برابر خسارت‌های ناگهانی و پیش‌بینی‌نشده پوشش می‌دهد — از آتش‌سوزی و سیل تا خطای اجرایی و آسیب به تجهیزات در حال نصب. معمولاً کارفرما یا تأمین‌کننده مالی پروژه ارائه این بیمه‌نامه را شرط شروع کار قرار می‌دهد. نرخ‌گذاری به مبلغ قرارداد، مدت اجرا و ماهیت فنی پروژه بستگی دارد.',
    descriptionEn:
      'Contractors’ and erection all-risk cover protects a project during construction against sudden and unforeseen loss — from fire and flood to workmanship error and damage to plant being installed. The employer or the project’s financier usually requires it before work may start. Rating depends on the contract value, the programme length and the technical nature of the work.',
    coverages: [
      'خسارت‌های ناگهانی و پیش‌بینی‌نشده در دوره اجرا',
      'آتش‌سوزی، انفجار و بلایای طبیعی',
      'خسارت به تجهیزات در حال نصب',
      'مسئولیت در قبال اشخاص ثالث',
    ],
    optionalCoverages: ['دوره نگهداری', 'ماشین‌آلات و تجهیزات پیمانکار', 'هزینه‌های پاکسازی'],
    intake: 'CALLBACK',
    audience: 'CORPORATE',
    icon: 'Wrench',
    order: 4,
    fields: [
      {
        name: 'projectName',
        label: 'عنوان پروژه',
        labelEn: 'Project name',
        type: 'text',
        required: true,
        maxLength: 200,
      },
      {
        name: 'projectType',
        label: 'نوع پروژه',
        labelEn: 'Project type',
        type: 'select',
        required: true,
        options: [
          {
            value: 'car',
            label: 'تمام خطر پیمانکاران (ساختمانی و عمرانی)',
            labelEn: 'Contractors all-risk (civil)',
          },
          {
            value: 'ear',
            label: 'تمام خطر نصب (تجهیزات و ماشین‌آلات)',
            labelEn: 'Erection all-risk (plant)',
          },
          { value: 'both', label: 'هر دو', labelEn: 'Both' },
        ],
      },
      currencyField('contractValue', 'مبلغ قرارداد', 'Contract value'),
      {
        name: 'projectMonths',
        label: 'مدت اجرا',
        labelEn: 'Programme length',
        type: 'number',
        required: true,
        min: 1,
        max: 120,
        unit: 'ماه',
        unitEn: 'months',
      },
      {
        name: 'projectLocation',
        label: 'محل اجرای پروژه',
        labelEn: 'Project location',
        type: 'text',
        required: true,
        maxLength: 200,
      },
      {
        name: 'maintenancePeriod',
        label: 'پوشش دوره نگهداری نیز لازم است',
        labelEn: 'Maintenance-period cover also required',
        type: 'bool',
      },
      claimHistory(),
    ],
  },
];
