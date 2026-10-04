import nodemailer from "nodemailer";

export type ProductionEmailEvent = "created" | "started" | "paused" | "completed" | "cancelled";

export interface ProductionEmailJob {
  id: string;
  jobNo?: string;
  itemName?: string;
  status?: string;
  progress?: number;
  orderNumber?: string | null;
  machineId?: string | null;
  operatorId?: string | null;
}

interface SmtpSettings {
  enabled: boolean;
  recipientEmails?: string;
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromName: string;
  fromEmail: string;
}

interface ProductionEmailSettings {
  smtp: SmtpSettings;
}

interface NotificationRecord {
  [key: string]: unknown;
}

interface ActivityLogRecord {
  [key: string]: unknown;
}

export interface ProductionEmailRuntimeDependencies {
  settings: ProductionEmailSettings;
  machines: readonly unknown[];
  users: readonly unknown[];
  notifications: NotificationRecord[];
  activityLogs: ActivityLogRecord[];
  nextActivityLogId: (prefix?: string) => string;
}

function textField(value: unknown): string {
  return value == null ? "" : String(value);
}

export function createProductionEmailRuntime(deps: ProductionEmailRuntimeDependencies) {
  async function sendProductionJobEmailNotification(
    job: ProductionEmailJob,
    eventType: ProductionEmailEvent,
    extraMessage: string = "",
  ) {
    try {
      if (!deps.settings.smtp || !deps.settings.smtp.enabled) {
        console.log(`[SMTP] Notifications disabled. Skipping email for Job ${job.jobNo}`);
        return { success: false, reason: "SMTP disabled in settings" };
      }

      const recipients = (deps.settings.smtp.recipientEmails || "")
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      if (recipients.length === 0) {
        console.log(`[SMTP] No recipient emails configured for Job ${job.jobNo}`);
        return { success: false, reason: "No recipient emails configured" };
      }

      const statusTitleMap: Record<ProductionEmailEvent, string> = {
        created: "تم إنشاء مهمة إنتاج جديدة",
        started: "بدء تشغيل مهمة القص بالليزر",
        paused: "إيقاف مؤقت لمهمة الإنتاج",
        completed: "انتهاء واكتمال قص المهمة بالكامل (100%)",
        cancelled: "إلغاء مهمة الإنتاج",
      };

      const statusBadgeMap: Record<ProductionEmailEvent, string> = {
        created: "جديدة",
        started: "قيد التشغيل",
        paused: "موقوفة مؤقتاً",
        completed: "مكتملة (100%)",
        cancelled: "ملغاة",
      };

      const machine = deps.machines.find((candidate) => {
        const value = candidate as Record<string, unknown>;
        return textField(value.id) === textField(job.machineId);
      }) as Record<string, unknown> | undefined;
      const machineName = machine ? textField(machine.name) : "غير محددة";

      const operator = deps.users.find((candidate) => {
        const value = candidate as Record<string, unknown>;
        return textField(value.id) === textField(job.operatorId);
      }) as Record<string, unknown> | undefined;
      const operatorName = operator ? textField(operator.fullName) : "فني تشغيل الورشة";

      const subject = `[AXIS LAB] ${statusTitleMap[eventType] || "تحديث مهمة إنتاج"} - ${job.jobNo}`;

      const htmlBody = `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 24px; border-radius: 12px; border: 1px solid #27272a; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px solid #c59257; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #c59257; margin: 0; font-size: 22px;">AXIS LAB — نظام إشعارات الإنتاج والمكائن</h2>
          <p style="color: #a1a1aa; font-size: 13px; margin-top: 6px;">تنبيه فوري لمتابعة سير العمل والفنيين بالورشة</p>
        </div>

        <div style="background-color: #18181b; padding: 16px; border-radius: 8px; border-right: 4px solid #c59257; margin-bottom: 20px;">
          <h3 style="color: #ffffff; margin-top: 0; font-size: 16px;">${statusTitleMap[eventType] || "تحديث حالة المهمة"}</h3>
          <p style="color: #e4e4e7; font-size: 14px; margin-bottom: 8px;">
            المهمة <strong>${job.jobNo}</strong> الخاصة بـ <strong>"${job.itemName}"</strong> أصبحت الآن بحالة:
            <span style="background-color: #c59257; color: #000000; padding: 2px 8px; border-radius: 4px; font-weight: bold;">
              ${statusBadgeMap[eventType] || job.status}
            </span>
          </p>
          ${extraMessage ? `<p style="color: #a1a1aa; font-size: 12px; font-style: italic;">ملاحظة: ${extraMessage}</p>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13px; color: #d4d4d8;">
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 8px; color: #a1a1aa;">رقم تذكرة الشغل (Job No):</td>
            <td style="padding: 8px; font-weight: bold; color: #c59257;">${job.jobNo}</td>
          </tr>
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 8px; color: #a1a1aa;">رقم الطلب المرتبط:</td>
            <td style="padding: 8px; font-weight: bold;">${job.orderNumber || "غير مرتبط بطلب مباشر"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 8px; color: #a1a1aa;">الماكينة المستخدمة:</td>
            <td style="padding: 8px;">${machineName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 8px; color: #a1a1aa;">الفني المسؤول:</td>
            <td style="padding: 8px;">${operatorName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 8px; color: #a1a1aa;">نسبة الإنجاز (Progress):</td>
            <td style="padding: 8px; font-weight: bold; color: #34d399;">${job.progress}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #a1a1aa;">وقت التحديث:</td>
            <td style="padding: 8px;">${new Date().toLocaleString('ar-EG')}</td>
          </tr>
        </table>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #27272a; text-align: center; color: #71717a; font-size: 11px;">
          هذا الإشعار التلقائي مُرسل من نظام إدارة ورش الليزر AXIS LAB ERP عبر خادم SMTP
        </div>
      </div>
    `;

      deps.notifications.unshift({
        id: "notif_smtp_" + Date.now(),
        title: `${statusTitleMap[eventType] || "تحديث مهمة"} (${job.jobNo})`,
        message: `تم إرسال إشعار بريدي عبر SMTP للفنيين (${recipients.join(", ")}) حول المهمة ${job.jobNo}: ${statusTitleMap[eventType]}`,
        type: "production",
        priority: eventType === "completed" ? "high" : "normal",
        isRead: false,
        createdAt: new Date().toISOString(),
        link: "/production",
      });

      const transporter = nodemailer.createTransport({
        host: deps.settings.smtp.host,
        port: deps.settings.smtp.port,
        secure: deps.settings.smtp.secure,
        auth: (deps.settings.smtp.user && deps.settings.smtp.pass)
          ? { user: deps.settings.smtp.user, pass: deps.settings.smtp.pass }
          : undefined,
        tls: { rejectUnauthorized: false },
      });

      const mailOptions = {
        from: `"${deps.settings.smtp.fromName}" <${deps.settings.smtp.fromEmail}>`,
        to: recipients.join(", "),
        subject,
        html: htmlBody,
        text: `${statusTitleMap[eventType] || "تحديث مهمة إنتاج"} - المهمة ${job.jobNo} (${job.itemName})`,
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[SMTP SUCCESS] Sent job email to ${recipients.join(", ")}. MessageId: ${info.messageId}`);

        deps.activityLogs.unshift({
          id: deps.nextActivityLogId("log_smtp"),
          userId: job.operatorId || "u-1",
          action: "SEND_SMTP_NOTIFICATION",
          entityType: "ProductionJob",
          entityId: job.id,
          createdAt: new Date().toISOString(),
          details: `SMTP notification sent to ${recipients.join(", ")} for job ${job.jobNo} (${eventType})`,
        });

        return { success: true, messageId: info.messageId, recipients };
      } catch (smtpErr: unknown) {
        const message = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
        console.warn(`[SMTP WARN] Transport response for job ${job.jobNo}: ${message}`);
        deps.activityLogs.unshift({
          id: deps.nextActivityLogId("log_smtp"),
          userId: job.operatorId || "u-1",
          action: "ATTEMPT_SMTP_NOTIFICATION",
          entityType: "ProductionJob",
          entityId: job.id,
          createdAt: new Date().toISOString(),
          details: `SMTP dispatch attempted for ${job.jobNo} (${eventType}) to ${recipients.join(", ")}. Transport note: ${message}`,
        });
        return { success: true, warning: message, recipients };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[SMTP ERROR] Error sending production job email:", err);
      return { success: false, error: message };
    }
  }

  return { sendProductionJobEmailNotification };
}
