/**
 * Shared field definitions.
 *
 * Twelve or so questions recur across the catalog — national ID, plate, area,
 * coverage ceiling, number of people, trip length. Defining each once here is
 * not just less typing: it means «کد ملی» validates identically on the motor
 * form and the accident form, and that renaming a label fixes it everywhere
 * rather than in nineteen places minus the one that gets missed.
 *
 * Every builder takes overrides so a product can adjust bounds or wording
 * without forking the definition.
 */
import type {
  BoolField,
  ChoiceField,
  DateField,
  FieldDef,
  FieldOption,
  NumberField,
  ProductDef,
  SimpleField,
  TextField,
} from './types.js';

type Overrides<T> = Partial<Omit<T, 'type'>>;

// --- Identity and contact ------------------------------------------------

export function nationalId(overrides: Overrides<SimpleField> = {}): SimpleField {
  return {
    name: 'nationalId',
    label: 'کد ملی',
    labelEn: 'National ID',
    type: 'nationalId',
    required: true,
    help: 'کد ملی ۱۰ رقمی مالک',
    helpEn: '10-digit national ID of the owner',
    ...overrides,
  };
}

export function birthDate(overrides: Overrides<DateField> = {}): DateField {
  return {
    name: 'birthDate',
    label: 'تاریخ تولد',
    labelEn: 'Date of birth',
    type: 'date',
    required: true,
    ...overrides,
  };
}

export function gender(overrides: Overrides<ChoiceField> = {}): ChoiceField {
  return {
    name: 'gender',
    label: 'جنسیت',
    labelEn: 'Gender',
    type: 'select',
    required: true,
    options: [
      { value: 'male', label: 'مرد', labelEn: 'Male' },
      { value: 'female', label: 'زن', labelEn: 'Female' },
    ],
    ...overrides,
  };
}

export function age(overrides: Overrides<NumberField> = {}): NumberField {
  return {
    name: 'age',
    label: 'سن',
    labelEn: 'Age',
    type: 'number',
    required: true,
    min: 0,
    max: 120,
    unit: 'سال',
    unitEn: 'years',
    ...overrides,
  };
}

// --- Location -------------------------------------------------------------

/** The 31 provinces. `city` stays free text — a full city table is not worth
 *  the maintenance for a field a human reads off the request. */
export const PROVINCES: FieldOption[] = [
  ['tehran', 'تهران', 'Tehran'],
  ['alborz', 'البرز', 'Alborz'],
  ['isfahan', 'اصفهان', 'Isfahan'],
  ['fars', 'فارس', 'Fars'],
  ['khorasan-razavi', 'خراسان رضوی', 'Razavi Khorasan'],
  ['khorasan-north', 'خراسان شمالی', 'North Khorasan'],
  ['khorasan-south', 'خراسان جنوبی', 'South Khorasan'],
  ['east-azerbaijan', 'آذربایجان شرقی', 'East Azerbaijan'],
  ['west-azerbaijan', 'آذربایجان غربی', 'West Azerbaijan'],
  ['ardabil', 'اردبیل', 'Ardabil'],
  ['bushehr', 'بوشهر', 'Bushehr'],
  ['chaharmahal', 'چهارمحال و بختیاری', 'Chaharmahal and Bakhtiari'],
  ['gilan', 'گیلان', 'Gilan'],
  ['golestan', 'گلستان', 'Golestan'],
  ['hamadan', 'همدان', 'Hamadan'],
  ['hormozgan', 'هرمزگان', 'Hormozgan'],
  ['ilam', 'ایلام', 'Ilam'],
  ['kerman', 'کرمان', 'Kerman'],
  ['kermanshah', 'کرمانشاه', 'Kermanshah'],
  ['kohgiluyeh', 'کهگیلویه و بویراحمد', 'Kohgiluyeh and Boyer-Ahmad'],
  ['kurdistan', 'کردستان', 'Kurdistan'],
  ['lorestan', 'لرستان', 'Lorestan'],
  ['markazi', 'مرکزی', 'Markazi'],
  ['mazandaran', 'مازندران', 'Mazandaran'],
  ['qazvin', 'قزوین', 'Qazvin'],
  ['qom', 'قم', 'Qom'],
  ['semnan', 'سمنان', 'Semnan'],
  ['sistan', 'سیستان و بلوچستان', 'Sistan and Baluchestan'],
  ['zanjan', 'زنجان', 'Zanjan'],
  ['yazd', 'یزد', 'Yazd'],
  ['khuzestan', 'خوزستان', 'Khuzestan'],
].map(([value, label, labelEn]) => ({ value: value!, label: label!, labelEn: labelEn! }));

export function province(overrides: Overrides<ChoiceField> = {}): ChoiceField {
  return {
    name: 'province',
    label: 'استان',
    labelEn: 'Province',
    type: 'select',
    required: true,
    options: PROVINCES,
    ...overrides,
  };
}

// --- Vehicle --------------------------------------------------------------

export function plate(overrides: Overrides<SimpleField> = {}): SimpleField {
  return {
    name: 'plate',
    label: 'شماره پلاک',
    labelEn: 'Plate number',
    type: 'plate',
    required: true,
    help: 'مثال: ۱۲ ب ۳۴۵ ایران ۶۷',
    helpEn: 'e.g. 12 B 345 IRAN 67',
    ...overrides,
  };
}

export function vehicleModel(overrides: Overrides<TextField> = {}): TextField {
  return {
    name: 'vehicleModel',
    label: 'نوع و مدل خودرو',
    labelEn: 'Vehicle make and model',
    type: 'text',
    required: true,
    maxLength: 100,
    ...overrides,
  };
}

export function buildYear(overrides: Overrides<NumberField> = {}): NumberField {
  return {
    name: 'buildYear',
    label: 'سال ساخت',
    labelEn: 'Year of manufacture',
    type: 'number',
    required: true,
    min: 1340,
    max: 1450,
    ...overrides,
  };
}

// --- Property -------------------------------------------------------------

export function area(overrides: Overrides<NumberField> = {}): NumberField {
  return {
    name: 'area',
    label: 'متراژ',
    labelEn: 'Area',
    type: 'number',
    required: true,
    min: 1,
    max: 100000,
    unit: 'متر مربع',
    unitEn: 'm²',
    ...overrides,
  };
}

export function structureType(overrides: Overrides<ChoiceField> = {}): ChoiceField {
  return {
    name: 'structureType',
    label: 'نوع سازه',
    labelEn: 'Structure type',
    type: 'select',
    required: true,
    options: [
      { value: 'concrete', label: 'بتنی', labelEn: 'Concrete' },
      { value: 'steel', label: 'فلزی', labelEn: 'Steel' },
      { value: 'brick', label: 'آجری', labelEn: 'Brick / masonry' },
      { value: 'other', label: 'سایر', labelEn: 'Other' },
    ],
    ...overrides,
  };
}

/** فقط لوازم / فقط بنا / هر دو — drives which value fields are asked for. */
export function insuredSubject(overrides: Overrides<ChoiceField> = {}): ChoiceField {
  return {
    name: 'insuredSubject',
    label: 'مورد بیمه',
    labelEn: 'What to insure',
    type: 'select',
    required: true,
    options: [
      { value: 'building', label: 'فقط بنا', labelEn: 'Building only' },
      { value: 'contents', label: 'فقط لوازم', labelEn: 'Contents only' },
      { value: 'both', label: 'بنا و لوازم', labelEn: 'Building and contents' },
    ],
    ...overrides,
  };
}

export function buildingAge(overrides: Overrides<NumberField> = {}): NumberField {
  return {
    name: 'buildingAge',
    label: 'سن بنا',
    labelEn: 'Age of building',
    type: 'number',
    required: true,
    min: 0,
    max: 150,
    unit: 'سال',
    unitEn: 'years',
    ...overrides,
  };
}

export function unitCount(overrides: Overrides<NumberField> = {}): NumberField {
  return {
    name: 'unitCount',
    label: 'تعداد واحد',
    labelEn: 'Number of units',
    type: 'number',
    required: true,
    min: 1,
    max: 1000,
    ...overrides,
  };
}

// --- Money ----------------------------------------------------------------

export function currencyField(
  name: string,
  label: string,
  labelEn: string,
  overrides: Overrides<NumberField> = {},
): NumberField {
  return {
    name,
    label,
    labelEn,
    type: 'currency',
    required: true,
    min: 0,
    unit: 'تومان',
    unitEn: 'IRT',
    ...overrides,
  };
}

export function coverageCeiling(options: FieldOption[], overrides: Overrides<ChoiceField> = {}): ChoiceField {
  return {
    name: 'coverageCeiling',
    label: 'سقف تعهدات',
    labelEn: 'Coverage limit',
    type: 'select',
    required: true,
    options,
    ...overrides,
  };
}

export function deductible(overrides: Overrides<ChoiceField> = {}): ChoiceField {
  return {
    name: 'deductible',
    label: 'درصد فرانشیز',
    labelEn: 'Deductible',
    type: 'select',
    required: true,
    options: [
      { value: '10', label: '۱۰ درصد', labelEn: '10%' },
      { value: '20', label: '۲۰ درصد', labelEn: '20%' },
      { value: '30', label: '۳۰ درصد', labelEn: '30%' },
    ],
    ...overrides,
  };
}

export function paymentMethod(overrides: Overrides<ChoiceField> = {}): ChoiceField {
  return {
    name: 'paymentMethod',
    label: 'روش پرداخت',
    labelEn: 'Payment method',
    type: 'select',
    required: true,
    options: [
      { value: 'cash', label: 'نقدی', labelEn: 'Cash' },
      { value: 'instalments', label: 'اقساطی', labelEn: 'Instalments' },
    ],
    ...overrides,
  };
}

// --- History and risk -----------------------------------------------------

export function noClaimYears(overrides: Overrides<NumberField> = {}): NumberField {
  return {
    name: 'noClaimYears',
    label: 'سال‌های عدم خسارت',
    labelEn: 'Claim-free years',
    type: 'number',
    required: false,
    min: 0,
    max: 20,
    unit: 'سال',
    unitEn: 'years',
    help: 'برای اعمال تخفیف عدم خسارت',
    helpEn: 'Used to apply the no-claims discount',
    ...overrides,
  };
}

export function previousInsurer(overrides: Overrides<TextField> = {}): TextField {
  return {
    name: 'previousInsurer',
    label: 'شرکت بیمه‌گر قبلی',
    labelEn: 'Previous insurer',
    type: 'text',
    required: false,
    maxLength: 100,
    ...overrides,
  };
}

export function claimHistory(overrides: Overrides<TextField> = {}): TextField {
  return {
    name: 'claimHistory',
    label: 'سابقه خسارت',
    labelEn: 'Claims history',
    type: 'textarea',
    required: false,
    maxLength: 500,
    ...overrides,
  };
}

/** The five occupational risk bands Iranian accident underwriters price on. */
export function jobRiskGroup(overrides: Overrides<ChoiceField> = {}): ChoiceField {
  return {
    name: 'jobRiskGroup',
    label: 'گروه شغلی',
    labelEn: 'Occupational risk group',
    type: 'select',
    required: true,
    options: [
      { value: '1', label: 'گروه ۱ — کم‌خطر (اداری، دفتری)', labelEn: 'Group 1 — low risk (office)' },
      { value: '2', label: 'گروه ۲ — کم‌خطر با تردد', labelEn: 'Group 2 — low risk, mobile' },
      { value: '3', label: 'گروه ۳ — متوسط (فنی، تولیدی)', labelEn: 'Group 3 — medium (technical)' },
      { value: '4', label: 'گروه ۴ — پرخطر (ساختمانی، صنعتی)', labelEn: 'Group 4 — high (construction)' },
      { value: '5', label: 'گروه ۵ — بسیار پرخطر', labelEn: 'Group 5 — very high risk' },
    ],
    ...overrides,
  };
}

// --- Counts and durations -------------------------------------------------

export function peopleCount(overrides: Overrides<NumberField> = {}): NumberField {
  return {
    name: 'peopleCount',
    label: 'تعداد نفرات',
    labelEn: 'Number of people',
    type: 'number',
    required: true,
    min: 1,
    max: 10000,
    unit: 'نفر',
    unitEn: 'people',
    ...overrides,
  };
}

export function durationDays(overrides: Overrides<NumberField> = {}): NumberField {
  return {
    name: 'durationDays',
    label: 'مدت',
    labelEn: 'Duration',
    type: 'number',
    required: true,
    min: 1,
    max: 365,
    unit: 'روز',
    unitEn: 'days',
    ...overrides,
  };
}

export function startDate(overrides: Overrides<DateField> = {}): DateField {
  return {
    name: 'startDate',
    label: 'تاریخ شروع',
    labelEn: 'Start date',
    type: 'date',
    required: true,
    min: 'today',
    ...overrides,
  };
}

export function boolField(
  name: string,
  label: string,
  labelEn: string,
  overrides: Overrides<BoolField> = {},
): BoolField {
  return { name, label, labelEn, type: 'bool', required: false, ...overrides };
}

// --- The universal contact block -----------------------------------------

export const PREFERRED_CONTACT_TIMES: FieldOption[] = [
  { value: 'morning', label: 'صبح (۹ تا ۱۲)', labelEn: 'Morning (9–12)' },
  { value: 'noon', label: 'ظهر (۱۲ تا ۱۶)', labelEn: 'Midday (12–16)' },
  { value: 'evening', label: 'عصر (۱۶ تا ۲۰)', labelEn: 'Evening (16–20)' },
  { value: 'any', label: 'فرقی ندارد', labelEn: 'Any time' },
];

/**
 * Appended to every product, in this order, as the final step of the form.
 *
 * `phone` is deliberately absent: it arrives on the verified phone token, not
 * from the form body, so the number we call is the number that received the
 * one-time code. See `services/insurance-request.service.ts`.
 */
export function contactFields(audience: ProductDef['audience']): FieldDef[] {
  const fields: FieldDef[] = [
    {
      name: 'fullName',
      label: 'نام و نام خانوادگی',
      labelEn: 'Full name',
      type: 'text',
      required: true,
      minLength: 3,
      maxLength: 100,
    },
  ];

  if (audience === 'CORPORATE') {
    fields.push({
      name: 'organizationName',
      label: 'نام سازمان',
      labelEn: 'Organisation name',
      type: 'text',
      required: true,
      minLength: 2,
      maxLength: 150,
    });
    fields.push({
      name: 'role',
      label: 'سمت شما',
      labelEn: 'Your role',
      type: 'text',
      required: false,
      maxLength: 100,
    });
  }

  fields.push(
    province(),
    {
      name: 'city',
      label: 'شهر',
      labelEn: 'City',
      type: 'text',
      required: true,
      minLength: 2,
      maxLength: 100,
    },
    {
      name: 'preferredContactTime',
      label: 'زمان مناسب تماس',
      labelEn: 'Best time to call',
      type: 'select',
      required: true,
      options: PREFERRED_CONTACT_TIMES,
    },
    {
      name: 'notes',
      label: 'توضیحات تکمیلی',
      labelEn: 'Additional notes',
      type: 'textarea',
      required: false,
      maxLength: 1000,
    },
  );

  return fields;
}

/** Names the contact block owns. Product definitions must not reuse them. */
export const CONTACT_FIELD_NAMES = new Set([
  'fullName',
  'organizationName',
  'role',
  'province',
  'city',
  'preferredContactTime',
  'notes',
]);
