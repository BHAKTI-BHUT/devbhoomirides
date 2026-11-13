// Display labels for driver verification and documents (shared by driver app and admin panel).
export const VERIFICATION_STYLE = {
  pending: { label: 'Pending Verification', cls: 'bg-marigold-light text-marigold-dark' },
  verified: { label: 'Verified', cls: 'bg-pine-50 text-pine-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700' },
  suspended: { label: 'Suspended', cls: 'bg-line text-stone' },
} as const

export const DOC_LABELS = {
  driving_licence: 'Driving licence',
  vehicle_rc: 'Vehicle RC',
  profile_photo: 'Your photo',
  vehicle_photo: 'Vehicle photo',
  other: 'Other document',
} as const
