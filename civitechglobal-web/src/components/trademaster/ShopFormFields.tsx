import { lazy, Suspense, useEffect } from 'react';
import { LocateFixed, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useGeolocation } from '@/lib/useGeolocation';
import { parseCoordinate, type FieldErrors, type ShopDraft } from '@/lib/marketForms';
import { BusinessCategorySelect } from '@/components/trademaster/MarketplaceUi';
import { CoverField } from '@/components/marketplace/CoverField';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import type { UploadState } from '@/components/ui/UploadStatus';
import type { BusinessCategoryNode } from '@/types/trademaster';

// Lazy, like every other use of the map: somebody correcting a phone number
// should not download Leaflet to do it.
const LocationPicker = lazy(() =>
  import('@/components/trademaster/ShopMap').then((m) => ({ default: m.LocationPicker }))
);

export interface ShopPicture {
  file: File | null;
  onChange: (file: File | null) => void;
  uploadState: UploadState;
  /** The saved picture, when editing a shop that already has one. */
  previewPath: string | null;
}

/**
 * Every field of a shop, shared by the seller's form and the market desk's.
 *
 * One copy, so the two cannot drift: a field added for sellers is a field the
 * desk can fill, and the validation (lib/marketForms) is the same on both.
 * The parent owns the draft, the errors and the save; this owns only the
 * layout and the "use my location" button, which writes through `onField` like
 * a typed value would.
 */
export function ShopFormFields({
  idPrefix,
  draft,
  errors,
  onField,
  businessCategories,
  logo,
  cover,
  onRetryUpload,
}: {
  idPrefix: string;
  draft: ShopDraft;
  errors: FieldErrors<keyof ShopDraft>;
  onField: (name: keyof ShopDraft) => (value: string) => void;
  businessCategories: BusinessCategoryNode[] | undefined;
  logo: ShopPicture;
  cover: ShopPicture;
  onRetryUpload: () => void;
}) {
  const { t } = useLocale();
  const hub = t.trademaster.hub;
  const geo = useGeolocation();
  const errorOf = (name: keyof ShopDraft) => (errors[name] ? hub[errors[name]] : undefined);
  const id = (name: string) => `${idPrefix}-${name}`;

  // The device's location, into the two boxes, when asked for.
  const { state: geoState, clear: clearGeo } = geo;
  useEffect(() => {
    if (geoState.status !== 'ready') return;
    onField('latitude')(geoState.latitude.toFixed(6));
    onField('longitude')(geoState.longitude.toFixed(6));
    clearGeo();
  }, [geoState, clearGeo, onField]);

  const lat = parseCoordinate(draft.latitude, 90);
  const lng = parseCoordinate(draft.longitude, 180);

  const text = (
    name: 'industry' | 'province' | 'city' | 'phone' | 'email' | 'website' | 'address',
    label: string,
    maxLength: number,
    extra: { type?: string; inputMode?: 'tel'; ltr?: boolean; placeholder?: string } = {}
  ) => (
    <FormField htmlFor={id(name)} label={label} error={errorOf(name)}>
      <Input
        id={id(name)}
        type={extra.type}
        inputMode={extra.inputMode}
        value={draft[name]}
        onChange={(e) => onField(name)(e.target.value)}
        invalid={Boolean(errors[name])}
        maxLength={maxLength}
        dir={extra.ltr ? 'ltr' : undefined}
        placeholder={extra.placeholder}
      />
    </FormField>
  );

  return (
    <>
      <p className="text-caption text-app-text-3">{hub.requiredHint}</p>

      <FormField htmlFor={id('shop-name')} label={`${t.trademaster.shopName} *`} error={errorOf('name')}>
        <Input
          id={id('shop-name')}
          value={draft.name}
          onChange={(e) => onField('name')(e.target.value)}
          invalid={Boolean(errors.name)}
          maxLength={120}
          required
        />
      </FormField>

      <FormField
        htmlFor={id('shop-summary')}
        label={`${t.trademaster.shopSummary} *`}
        error={errorOf('summary')}
        hint={hub.summaryHint}
      >
        <TextArea
          id={id('shop-summary')}
          value={draft.summary}
          onChange={(e) => onField('summary')(e.target.value)}
          invalid={Boolean(errors.summary)}
          rows={2}
          maxLength={300}
          required
        />
      </FormField>

      <FormField
        htmlFor={id('business-category')}
        label={`${hub.businessCategory} *`}
        hint={hub.businessCategoryHint}
        error={errorOf('businessCategoryId')}
      >
        <BusinessCategorySelect
          id={id('business-category')}
          categories={businessCategories}
          value={draft.businessCategoryId}
          onChange={(value) => onField('businessCategoryId')(value)}
          emptyLabel={hub.chooseBusinessCategory}
          showCounts={false}
          invalid={Boolean(errors.businessCategoryId)}
        />
      </FormField>

      <FormField htmlFor={id('shop-description')} label={t.trademaster.shopDescription} error={errorOf('description')}>
        <TextArea
          id={id('shop-description')}
          value={draft.description}
          onChange={(e) => onField('description')(e.target.value)}
          invalid={Boolean(errors.description)}
          rows={4}
          maxLength={5000}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-label text-app-text-2">{t.trademaster.logo}</span>
          <CoverField
            value={logo.file}
            previewPath={logo.previewPath}
            onChange={logo.onChange}
            uploadState={logo.uploadState}
            onRetryUpload={onRetryUpload}
          />
          <span className="text-caption text-app-text-3">{t.trademaster.logoHint}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-label text-app-text-2">{hub.coverField}</span>
          <CoverField
            value={cover.file}
            previewPath={cover.previewPath}
            onChange={cover.onChange}
            uploadState={cover.uploadState}
            onRetryUpload={onRetryUpload}
          />
          <span className="text-caption text-app-text-3">{hub.coverHint}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {text('industry', t.trademaster.industry, 80)}
        {text('province', t.trademaster.province, 60)}
        {text('city', t.trademaster.city, 60)}
        {text('phone', t.trademaster.phone, 30, { type: 'tel', inputMode: 'tel', ltr: true })}
        {text('email', t.trademaster.email, 160, { type: 'email', ltr: true })}
        {text('website', t.trademaster.website, 200, { type: 'url', ltr: true, placeholder: 'https://' })}
      </div>

      {text('address', t.trademaster.address, 300)}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-label text-app-text-2">{t.trademaster.location}</legend>
        <p className="col-span-full text-caption text-app-text-3">{hub.shopLocationHint}</p>

        <div className="col-span-full flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={geo.locate} disabled={geo.state.status === 'locating'}>
            <LocateFixed className="size-4" aria-hidden="true" />
            {geo.state.status === 'locating' ? t.trademaster.locating : hub.useMyLocationForShop}
          </Button>
          {(draft.latitude || draft.longitude) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onField('latitude')('');
                onField('longitude')('');
              }}
            >
              <X className="size-4" aria-hidden="true" />
              {hub.removeLocation}
            </Button>
          )}
        </div>
        {(geo.state.status === 'denied' || geo.state.status === 'unavailable') && (
          <p className="col-span-full text-caption text-app-text-3" role="status">
            {geo.state.status === 'denied' ? hub.locationDenied : hub.locationUnavailable}
          </p>
        )}

        <FormField htmlFor={id('latitude')} label={t.trademaster.latitude} error={errorOf('latitude')}>
          <Input
            id={id('latitude')}
            value={draft.latitude}
            onChange={(e) => onField('latitude')(e.target.value)}
            invalid={Boolean(errors.latitude)}
            inputMode="decimal"
            maxLength={20}
            dir="ltr"
          />
        </FormField>
        <FormField htmlFor={id('longitude')} label={t.trademaster.longitude} error={errorOf('longitude')}>
          <Input
            id={id('longitude')}
            value={draft.longitude}
            onChange={(e) => onField('longitude')(e.target.value)}
            invalid={Boolean(errors.longitude)}
            inputMode="decimal"
            maxLength={20}
            dir="ltr"
          />
        </FormField>

        {/* The map fills the boxes above; it does not replace them. A map
            cannot be used with a keyboard alone, and somebody who already has
            their coordinates should not hunt for the right pixel. */}
        <div className="col-span-full">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-app-fill" />}>
            <LocationPicker
              latitude={lat ?? undefined}
              longitude={lat !== null ? (lng ?? undefined) : undefined}
              onPick={(pickedLat, pickedLng) => {
                // Six decimals is about 10 cm: far past what a shop front
                // needs, and still readable in the box.
                onField('latitude')(pickedLat.toFixed(6));
                onField('longitude')(pickedLng.toFixed(6));
              }}
            />
          </Suspense>
        </div>
      </fieldset>
    </>
  );
}
