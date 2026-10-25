'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronDown, Search, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';
import { COUNTRIES } from './country-phone-input';

import { Input } from './input';
// ─── Nepal data ────────────────────────────────────────────────────────────────
export const NEPAL_PROVINCES: Record<string, string[]> = {
    // JHAPA WAS MISSING. Found by counting: this map held 76 districts and Nepal has 77, and the
    // one absent was one of the largest in the country (Birtamod, Damak, Bhadrapur). Any picker
    // built on this - including the school and volunteer forms on /yatra - simply could not accept
    // a school from Jhapa.
    'Koshi Province': [
        'Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Khotang', 'Morang', 'Okhaldhunga',
        'Panchthar', 'Sankhuwasabha', 'Solukhumbu', 'Sunsari', 'Taplejung',
        'Terhathum', 'Udayapur',
    ],
    'Madhesh Province': [
        'Bara', 'Dhanusha', 'Mahottari', 'Parsa', 'Rautahat', 'Saptari',
        'Sarlahi', 'Siraha',
    ],
    'Bagmati Province': [
        'Bhaktapur', 'Chitwan', 'Dhading', 'Dolakha', 'Kathmandu',
        'Kavrepalanchok', 'Lalitpur', 'Makwanpur', 'Nuwakot', 'Ramechhap',
        'Rasuwa', 'Sindhuli', 'Sindhupalchok',
    ],
    'Gandaki Province': [
        'Baglung', 'Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang',
        'Myagdi', 'Nawalpur', 'Parbat', 'Syangja', 'Tanahun',
    ],
    // NAMING NOTE, deliberately NOT changed here: the entry below reads 'Nawalparasi (East)', but
    // the eastern half of old Nawalparasi is Nawalpur, which is correctly listed under Gandaki.
    // Lumbini's half is Nawalparasi WEST (Parasi). Left as-is because this string may already be
    // stored against records in the app database, and silently renaming a value a picker has been
    // writing for months is a data-migration decision, not a typo fix. Worth doing - with a
    // migration - rather than worth doing quietly.
    'Lumbini Province': [
        'Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Eastern Rukum',
        'Gulmi', 'Kapilvastu', 'Nawalparasi (East)', 'Palpa', 'Pyuthan', 'Rolpa',
        'Rupandehi',
    ],
    'Karnali Province': [
        'Dailekh', 'Dolpa', 'Humla', 'Jajarkot', 'Jumla', 'Kalikot',
        'Mugu', 'Salyan', 'Surkhet', 'Western Rukum',
    ],
    'Sudurpashchim Province': [
        'Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula',
        'Doti', 'Kailali', 'Kanchanpur',
    ],
};

// ─── India states ──────────────────────────────────────────────────────────────
export const INDIA_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    // Union Territories
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// ─── Types ────────────────────────────────────────────────────────────────────
export type LocationValue = {
    country: string;    // ISO-2
    province?: string;  // Nepal province / India state / other
    district?: string;  // Nepal only
    city?: string;
};

interface LocationSelectorProps {
    value: LocationValue;
    onChange: (v: LocationValue) => void;
    className?: string;
}

// ─── Sub-selectors ────────────────────────────────────────────────────────────
function ListPicker({
    options,
    value,
    onChange,
    placeholder,
}: {
    options: string[];
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    const [search, setSearch] = useState('');
    const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <Input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${placeholder.toLowerCase()}…`}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 h-auto text-inherit dark:text-inherit hover:bg-neutral-50 dark:hover:bg-neutral-900"
                />
            </div>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-neutral-400 text-center">No results</p>
                ) : (
                    filtered.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onChange(opt)}
                            className={cn(
                                'flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors',
                                value === opt && 'bg-neutral-50 dark:bg-neutral-800 font-medium',
                            )}
                        >
                            <span>{opt}</span>
                            {value === opt && <Check className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

// ─── Country Picker ────────────────────────────────────────────────────────────
function CountryPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
    const [search, setSearch] = useState('');
    const PRIORITY = ['NP', 'IN', 'US', 'GB', 'AE', 'CA', 'AU'];

    const priority = COUNTRIES.filter((c) => PRIORITY.includes(c.code));
    const rest = COUNTRIES.filter((c) => !PRIORITY.includes(c.code));
    const all = [...priority, ...rest];

    const filtered = search
        ? all.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
        : all;

    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <Input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search country…"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 h-auto text-inherit dark:text-inherit hover:bg-neutral-50 dark:hover:bg-neutral-900"
                />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((c) => (
                    <button
                        key={c.code}
                        type="button"
                        onClick={() => onChange(c.code)}
                        className={cn(
                            'flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors',
                            value === c.code && 'bg-neutral-50 dark:bg-neutral-800',
                        )}
                    >
                        <span className="text-base leading-none">{c.flag}</span>
                        <span className={cn('flex-1', value === c.code && 'font-medium')}>{c.name}</span>
                        {value === c.code && <Check className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function LocationSelector({ value, onChange, className }: LocationSelectorProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'country' | 'province' | 'district' | 'city'>('country');
    const ref = useRef<HTMLDivElement>(null);

    const country = COUNTRIES.find((c) => c.code === value.country);

    // Close on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleCountry = useCallback((code: string) => {
        onChange({ country: code });
        if (code === 'NP') setStep('province');
        else if (code === 'IN') setStep('province');
        else setStep('city');
    }, [onChange]);

    const handleProvince = useCallback((prov: string) => {
        onChange({ ...value, province: prov, district: undefined, city: undefined });
        if (value.country === 'NP') setStep('district');
        else setStep('city');
    }, [onChange, value]);

    const handleDistrict = useCallback((dist: string) => {
        onChange({ ...value, district: dist, city: undefined });
        setStep('city');
    }, [onChange, value]);

    const summary = [
        country ? `${country.flag} ${country.name}` : 'Select country',
        value.province,
        value.district,
        value.city,
    ].filter(Boolean).join(' · ');

    const stepLabels: Record<typeof step, string> = {
        country: 'Select Country',
        province: value.country === 'NP' ? 'Select Province' : 'Select State',
        district: 'Select District',
        city: 'Enter City',
    };

    return (
        <div ref={ref} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => { setOpen((o) => !o); setStep('country'); }}
                className="flex items-center gap-2 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm text-left hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
            >
                <MapPin className="h-4 w-4 text-neutral-400 shrink-0" />
                <span className={cn('flex-1 truncate', !value.country && 'text-neutral-400')}>{summary}</span>
                <ChevronDown className={cn('h-4 w-4 text-neutral-400 shrink-0 transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="absolute z-50 top-full mt-2 left-0 right-0 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 shadow-lg space-y-3">
                    {/* Step breadcrumb */}
                    <div className="flex items-center gap-1 text-xs text-neutral-500">
                        {(['country', ...(value.country === 'NP' ? ['province', 'district'] : value.country === 'IN' ? ['province'] : []), 'city'] as (typeof step)[])
                            .map((s, i, arr) => (
                                <span key={s} className="flex items-center gap-1">
                                    {i > 0 && <span className="text-neutral-300">›</span>}
                                    <button
                                        type="button"
                                        onClick={() => setStep(s)}
                                        className={cn(
                                            'hover:text-neutral-900 dark:hover:text-white transition-colors',
                                            step === s ? 'font-semibold text-neutral-900 dark:text-white' : '',
                                        )}
                                    >
                                        {stepLabels[s]}
                                    </button>
                                </span>
                            ))}
                    </div>

                    {/* Step content */}
                    {step === 'country' && (
                        <CountryPicker value={value.country} onChange={handleCountry} />
                    )}

                    {step === 'province' && value.country === 'NP' && (
                        <ListPicker
                            options={Object.keys(NEPAL_PROVINCES)}
                            value={value.province ?? ''}
                            onChange={handleProvince}
                            placeholder="Province"
                        />
                    )}

                    {step === 'province' && value.country === 'IN' && (
                        <ListPicker
                            options={INDIA_STATES}
                            value={value.province ?? ''}
                            onChange={handleProvince}
                            placeholder="State"
                        />
                    )}

                    {step === 'district' && value.country === 'NP' && value.province && (
                        <ListPicker
                            options={NEPAL_PROVINCES[value.province] ?? []}
                            value={value.district ?? ''}
                            onChange={handleDistrict}
                            placeholder="District"
                        />
                    )}

                    {step === 'city' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                {value.country === 'NP' ? 'Municipality / City' : 'City / Town'}
                            </label>
                            <Input
                                autoFocus
                                value={value.city ?? ''}
                                onChange={(e) => onChange({ ...value, city: e.target.value })}
                                placeholder="e.g. Kathmandu"
                                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 h-auto text-inherit dark:text-inherit hover:bg-neutral-50 dark:hover:bg-neutral-900"
                                onKeyDown={(e) => { if (e.key === 'Enter') setOpen(false); }}
                            />
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={!value.city?.trim()}
                                className="w-full rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium py-2.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
                            >
                                Confirm
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
