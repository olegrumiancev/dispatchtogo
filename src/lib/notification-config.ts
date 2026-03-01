export const NOTIFICATION_SETTINGS = {
  /** True when TWILIO_ACCOUNT_SID is set in the environment. */
  smsEnabled: !!process.env.TWILIO_ACCOUNT_SID,

  /** True when RESEND_API_KEY is set in the environment. */
  emailEnabled: !!process.env.RESEND_API_KEY,

  /** Send SMS to vendor when a job is dispatched to them. */
  notifyVendorOnDispatch: true,

  /** Send SMS to operator when vendor changes job status. */
  notifyOperatorOnStatusChange: true,

  /** Send SMS to operator when vendor marks work complete. */
  notifyOperatorOnCompletion: true,
};
