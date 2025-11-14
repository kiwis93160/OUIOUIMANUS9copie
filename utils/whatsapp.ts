const MOBILE_USER_AGENT_REGEX = /android|iphone|ipad|ipod|windows phone|mobile/i;

export const sanitizeWhatsappNumber = (value: string): string => value.replace(/[^\d]/g, '');

const normalizeWhatsappMessage = (message: string): string => message.replace(/\r?\n/g, '\r\n');

const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return MOBILE_USER_AGENT_REGEX.test(navigator.userAgent.toLowerCase());
};

interface BuildWhatsAppUrlOptions {
  phone?: string | null;
  message: string;
}

export const buildWhatsAppUrl = ({ phone, message }: BuildWhatsAppUrlOptions): string => {
  const normalizedMessage = normalizeWhatsappMessage(message);
  const sanitizedPhone = phone ? sanitizeWhatsappNumber(phone) : '';
  const isMobile = isMobileDevice();

  if (sanitizedPhone) {
    if (isMobile) {
      const mobileUrl = new URL(`https://wa.me/${sanitizedPhone}`);
      mobileUrl.search = new URLSearchParams({
        text: normalizedMessage,
        type: 'phone_number',
        app_absent: '0'
      }).toString();
      return mobileUrl.toString();
    }

    const desktopUrl = new URL('https://web.whatsapp.com/send');
    desktopUrl.search = new URLSearchParams({
      phone: sanitizedPhone,
      text: normalizedMessage,
      type: 'phone_number',
      app_absent: '0'
    }).toString();
    return desktopUrl.toString();
  }

  if (isMobile) {
    const mobileUrl = new URL('https://wa.me/');
    mobileUrl.search = new URLSearchParams({ text: normalizedMessage }).toString();
    return mobileUrl.toString();
  }

  const fallbackDesktopUrl = new URL('https://web.whatsapp.com/send');
  fallbackDesktopUrl.search = new URLSearchParams({ text: normalizedMessage }).toString();
  return fallbackDesktopUrl.toString();
};
