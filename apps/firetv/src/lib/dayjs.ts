import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/it';
import 'dayjs/locale/de';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

export { dayjs };

export function setDayjsLocale(localeTag: string): void {
  const short = localeTag.split('-')[0] ?? 'en';
  dayjs.locale(short);
}

export function setDayjsTimezone(tz: string | null): void {
  if (tz) dayjs.tz.setDefault(tz);
}
