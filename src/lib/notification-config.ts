export const NOTIFICATION_SETTINGS = {
  /** True when textbee credentials are set in the environment. */
  smsEnabled: !!(process.env.TEXTBEE_API_KEY && process.env.TEXTBEE_DEVICE_ID),

  /** True when SMTP credentials are set in the environment. */
  emailEnabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),

  /** Send SMS to vendor when a job is dispatched to them. */
  notifyVendorOnDispatch: true,

  /** Send SMS to operator when vendor changes job status. */
  notifyOperatorOnStatusChange: true,

  /** Send SMS to operator when vendor marks work complete. */
  notifyOperatorOnCompletion: true,
};
