import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { BoxSize, Language, OrderSpec, OrderStatus, SizeUnit, UserRole } from '../types';
import { en, type MessageKey } from './en';
import { gu } from './gu';
import { hi } from './hi';

export type { MessageKey };

/** The three app languages, each shown in its own script. */
export const LANGUAGES: { code: Language; label: string; locale: string }[] = [
  { code: 'en', label: 'English', locale: 'en-IN' },
  { code: 'hi', label: 'हिन्दी', locale: 'hi-IN' },
  { code: 'gu', label: 'ગુજરાતી', locale: 'gu-IN' },
];

const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { en, hi, gu };
const STORAGE_KEY = 'ti_lang';

type Vars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: Vars) => string;

const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'hi' || value === 'gu';

function fill(template: string, vars?: Vars) {
  return vars ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : template;
}

function makeTranslate(lang: Language): Translate {
  const dict = DICTIONARIES[lang];
  return (key, vars) => fill(dict[key] ?? en[key] ?? key, vars);
}

/** Saved choice on this device, else the phone/browser language, else English. */
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : '';
  if (browser.startsWith('gu')) return 'gu';
  if (browser.startsWith('hi')) return 'hi';
  return 'en';
}

// Translator for code outside React components (API error messages).
let currentTranslate: Translate = makeTranslate(initialLanguage());
export const translate: Translate = (key, vars) => currentTranslate(key, vars);

/* ---------- Server messages → current language ---------- */

const SERVER_MESSAGES: Record<string, MessageKey> = {
  'Incorrect username or password': 'err.badLogin',
  'This account has been disabled. Contact the admin': 'err.disabled',
  'Too many login attempts. Please wait 15 minutes and try again': 'err.tooMany',
  'Please log in to continue': 'err.loginRequired',
  'Your session has expired. Please log in again': 'err.sessionExpired',
  'You do not have access to this section': 'err.noAccess',
  'Please correct the highlighted fields': 'err.fixFields',
  'Validation failed': 'err.fixFields',
  'Something went wrong on the server': 'err.server',
  'Order not found': 'err.orderNotFound',
  'Customer not found': 'err.customerNotFound',
  'Selected customer does not exist': 'err.customerNotFound',
  'User not found': 'err.userNotFound',
  'You cannot remove your own admin access': 'err.ownRole',
  'You cannot disable your own account': 'err.ownDisable',
  'Select a valid status': 'err.invalidStatus',
  'Enter the quantity produced': 'v.produced',
  'Enter your username': 'login.missing',
  'Enter your password': 'login.missing',
  'Select a customer': 'v.selectCustomer',
  'Enter the product name': 'v.productName',
  'Select 3-ply or 5-ply': 'v.ply',
  'Select printed or plain': 'v.paper',
  'Select 4-color or single color': 'v.print',
  'Select laminated yes or no': 'v.yesNo',
  'Enter the lamination size': 'v.laminationSize',
  'Enter the rate per box': 'v.rate',
  'Select whether GST applies': 'v.gst',
  'Select the expected delivery date': 'v.deliveryDate',
  'Customer name is required': 'v.customerName',
  'Phone number is required': 'v.phoneRequired',
  'Enter a valid phone number': 'v.phone',
  'Enter a valid 15-character GSTIN': 'v.gstin',
  'Name is required': 'v.name',
  'Password must be at least 8 characters': 'v.password',
};

const SERVER_PATTERNS: [RegExp, MessageKey, (m: RegExpMatchArray) => Vars][] = [
  [/^This customer has (\d+) orders? and cannot be deleted$/, 'err.customerHasOrders', (m) => ({ n: m[1] })],
  [/^Username "(.+)" is already taken$/, 'err.usernameTaken', (m) => ({ username: m[1] })],
  [/^Request failed \((\d+)\)$/, 'err.requestFailed', (m) => ({ status: m[1] })],
];

/** Shows a known server message in the current language; unknown ones pass through unchanged. */
export function translateServerMessage(message: string): string {
  const plain = message.trim().replace(/\.$/, '');
  const key = SERVER_MESSAGES[plain];
  if (key) return translate(key);
  for (const [pattern, patternKey, vars] of SERVER_PATTERNS) {
    const match = plain.match(pattern);
    if (match) return translate(patternKey, vars(match));
  }
  return message;
}

/* ---------- Formatters ---------- */

export interface Formatters {
  date: (iso: string) => string;
  dateTime: (iso: string) => string;
  number: (n: number) => string;
  inr: (rupees: number) => string;
  boxes: (n: number) => string;
  unit: (unit: SizeUnit) => string;
  size: (size: BoxSize) => string;
  ply: (spec: Pick<OrderSpec, 'ply'>) => string;
  paper: (spec: Pick<OrderSpec, 'paperType' | 'printType'>) => string;
  laminationSize: (spec: Pick<OrderSpec, 'laminationSize'>) => string;
  laminated: (spec: Pick<OrderSpec, 'laminated' | 'laminationSize'>) => string;
  /** One-line box summary: "14 × 10 × 8 inch · 3 ply · Plain · Laminated 12 × 15 inch". */
  spec: (order: OrderSpec) => string;
  status: (status: OrderStatus) => string;
  role: (role: UserRole) => string;
}

// Numbers and money always use normal digits (2,500 and ₹13,125.00) so they are easy to check.
const numberFormatter = new Intl.NumberFormat('en-IN');
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function makeFormatters(locale: string, t: Translate): Formatters {
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const unit = (u: SizeUnit) => t(`unit.${u}`);
  const laminationSize: Formatters['laminationSize'] = (spec) =>
    spec.laminationSize
      ? `${spec.laminationSize.length} × ${spec.laminationSize.width}${spec.laminationSize.unit ? ` ${unit(spec.laminationSize.unit)}` : ''}`
      : '';
  const size: Formatters['size'] = (s) => `${s.length} × ${s.width} × ${s.height} ${unit(s.unit)}`;
  const ply: Formatters['ply'] = (spec) => t(`ply.${spec.ply}`);
  const paper: Formatters['paper'] = (spec) =>
    spec.paperType === 'printed' && spec.printType
      ? `${t('paper.printed')} · ${t(`print.${spec.printType}`)}`
      : t(`paper.${spec.paperType}`);
  const laminated: Formatters['laminated'] = (spec) =>
    spec.laminated ? `${t('fmt.laminated')}${spec.laminationSize ? ` ${laminationSize(spec)}` : ''}` : '';

  return {
    date: (iso) => dateFormatter.format(new Date(iso)),
    dateTime: (iso) => dateTimeFormatter.format(new Date(iso)),
    number: (n) => numberFormatter.format(n),
    inr: (rupees) => inrFormatter.format(rupees),
    boxes: (n) => t('fmt.boxes', { n: numberFormatter.format(n) }),
    unit,
    size,
    ply,
    paper,
    laminationSize,
    laminated,
    spec: (order) => [size(order.size), ply(order), paper(order), laminated(order) || null].filter(Boolean).join(' · '),
    status: (status) => t(`status.${status}`),
    role: (role) => t(`role.${role}`),
  };
}

/* ---------- Provider ---------- */

interface I18nValue {
  lang: Language;
  locale: string;
  /** Changes the language on this device (AuthContext also saves it to the account). */
  setLang: (lang: Language) => void;
  t: Translate;
  /** Picks the singular or plural form: tn('orders.count', 3) → "3 orders". */
  tn: (base: 'orders.count' | 'customers.count', n: number) => string;
  f: Formatters;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const initial = initialLanguage();
    if (typeof document !== 'undefined') document.documentElement.lang = initial;
    return initial;
  });

  const setLang = useCallback((next: Language) => {
    currentTranslate = makeTranslate(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    setLangState(next);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const locale = LANGUAGES.find((l) => l.code === lang)?.locale ?? 'en-IN';
    const t = makeTranslate(lang);
    return {
      lang,
      locale,
      setLang,
      t,
      tn: (base, n) => t(n === 1 ? `${base}.one` : `${base}.other`, { n: numberFormatter.format(n) }),
      f: makeFormatters(locale, t),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>');
  return ctx;
}

export { isLanguage };
