export const NOTIFICATION_SETTINGS = {
  /** True when TWILIO_ACCOUNT_SID is set in the environment. */
  smsEnabled: !!process.env.TWILIO_ACCOUNT_SID,

  /** True when SMTP_HOST is set in the environment. */
  emailEnabled: !!process.env.SMTP_HOST,

  /** Send SMS to vendor when a job is dispatched to them. */
  notifyVendorOnDispatch: true,

  /** Send SMS to operator when vendor changes job status. */
  notifyOperatorOnStatusChange: true,

  /** Send SMS to operator when vendor marks work complete. */
  notifyOperatorOnCompletion: true,
};
