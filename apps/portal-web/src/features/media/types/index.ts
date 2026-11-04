export interface MediaLibraryItem {
  id: string
  filename: string
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  previewUrl: string
  publicUrl: string
}

export interface MediaSelection {
  fileId: string
  publicUrl: string
  altText: string
  caption?: string
}

export interface MediaUsageOwner {
  kind: 'COVER' | 'BODY' | 'ATTACHMENT' | 'ALBUM_PHOTO'
  ownerType: 'post' | 'agenda' | 'album' | 'page'
  ownerId: string
  title: string
  isPublic: boolean
}

export interface MediaUsage {
  fileId: string
  isPubliclyReachable: boolean
  usedBy: MediaUsageOwner[]
}
