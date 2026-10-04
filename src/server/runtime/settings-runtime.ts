export interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  recipientEmails: string;
  [key: string]: unknown;
}

export interface SettingsRuntimeRecord {
  exchangeRate: number;
  partnerSharePercent: number;
  partnerShareHistory: Array<ShareHistoryEntry>;
  smtp: SmtpSettings;
  [key: string]: unknown;
}

interface ShareHistoryEntry {
  effectiveFrom: string;
  percent: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function createSettingsRuntime(settings: SettingsRuntimeRecord) {
  function publicSettings() {
    const { pass: _smtpPassword, ...safeSmtp } = settings.smtp;
    return {
      ...settings,
      smtp: {
        ...safeSmtp,
        configured: Boolean(settings.smtp.user && settings.smtp.pass),
        hasPassword: Boolean(settings.smtp.pass),
      },
    };
  }

  function getPartnerSharePercentAt(dateValue?: string | Date) {
    const history = Array.isArray(settings.partnerShareHistory)
      ? settings.partnerShareHistory
          .filter((entry) => Number.isFinite(Number(entry.percent)) && entry.effectiveFrom)
          .sort((a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime())
      : [];
    const target = dateValue ? new Date(dateValue).getTime() : Date.now();
    const match = history.filter((entry) => new Date(entry.effectiveFrom).getTime() <= target).pop();
    const value = match ? Number(match.percent) : Number(settings.partnerSharePercent);
    return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  }

  function mergeSmtpSettings(input: unknown) {
    const value = asRecord(input);
    if (Object.keys(value).length === 0) return;
    const { pass, ...safeInput } = value;
    settings.smtp = { ...settings.smtp, ...safeInput };
    if (typeof pass === "string" && pass.trim()) settings.smtp.pass = pass;
  }

  return {
    publicSettings,
    getPartnerSharePercentAt,
    mergeSmtpSettings,
  };
}
