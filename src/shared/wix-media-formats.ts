// Every file format Wix Media accepts, grouped as in Wix's "Supported Media File Types and File
// Sizes" help article (support.wix.com, checked 2026-10-01), with Wix's size limit per group.
// Files go to the site's Media Manager, so anything outside this list would fail at Wix.

const MB = 1024 * 1024;

export type FormatGroupId =
  | 'images'
  | 'raw'
  | 'svg'
  | 'icons'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'office'
  | 'openOffice'
  | 'iwork'
  | 'text'
  | 'publishing'
  | 'design'
  | 'cad'
  | 'maps'
  | 'ebooks'
  | 'contacts'
  | 'notebooks'
  | 'archives'
  | 'models';

export interface FormatGroup {
  id: FormatGroupId;
  /** Short English name used on the storefront. */
  name: string;
  /** Wix's per-file limit for this group. */
  maxBytes: number;
  /** Wix Media `mediaType` values a genuine file of this group can be classified as. */
  mediaTypes: readonly string[];
  /** Extension (with dot) → canonical MIME type sent to Wix. */
  formats: Readonly<Record<string, string>>;
}

const DOCUMENT_MEDIA = ['DOCUMENT', 'OTHER', 'UNKNOWN'] as const;

function same(mime: string, extensions: string[]): Record<string, string> {
  return Object.fromEntries(extensions.map((ext) => [ext, mime]));
}

export const FORMAT_GROUPS: readonly FormatGroup[] = [
  {
    id: 'images',
    name: 'images',
    maxBytes: 50 * MB,
    mediaTypes: ['IMAGE', 'VECTOR'],
    formats: {
      ...same('image/jpeg', ['.jpg', '.jpeg', '.jpe', '.jfif']),
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
      ...same('image/tiff', ['.tif', '.tiff']),
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      ...same('image/jp2', ['.jp2', '.jpg2', '.j2k', '.j2c', '.jpc']),
      ...same('image/jpx', ['.jpf', '.jpx']),
      '.jpm': 'image/jpm',
    },
  },
  {
    id: 'raw',
    name: 'camera RAW photos',
    maxBytes: 50 * MB,
    mediaTypes: ['IMAGE', 'DOCUMENT', 'OTHER', 'UNKNOWN'],
    formats: {
      '.arw': 'image/x-sony-arw',
      '.sr2': 'image/x-sony-sr2',
      '.srf': 'image/x-sony-srf',
      '.srw': 'image/x-samsung-srw',
      '.nef': 'image/x-nikon-nef',
      '.cr2': 'image/x-canon-cr2',
      '.cr3': 'image/x-canon-cr3',
      '.crw': 'image/x-canon-crw',
      '.rwl': 'image/x-leica-rwl',
      '.rw2': 'image/x-panasonic-rw2',
      '.raw': 'image/x-panasonic-raw',
      '.raf': 'image/x-fuji-raf',
      '.pef': 'image/x-pentax-pef',
      '.orf': 'image/x-olympus-orf',
      '.mrw': 'image/x-minolta-mrw',
      '.dng': 'image/x-adobe-dng',
      '.kdc': 'image/x-kodak-kdc',
      '.k25': 'image/x-kodak-k25',
      '.dcr': 'image/x-kodak-dcr',
      '.x3f': 'image/x-sigma-x3f',
      '.erf': 'image/x-epson-erf',
      '.3fr': 'image/x-hasselblad-3fr',
    },
  },
  { id: 'svg', name: 'SVG', maxBytes: 250 * 1024, mediaTypes: ['VECTOR', 'IMAGE'], formats: { '.svg': 'image/svg+xml' } },
  { id: 'icons', name: 'ICO', maxBytes: 25 * MB, mediaTypes: ['IMAGE', 'VECTOR', ...DOCUMENT_MEDIA], formats: { '.ico': 'image/x-icon' } },
  {
    id: 'video',
    name: 'videos',
    maxBytes: 4 * 1024 * MB,
    mediaTypes: ['VIDEO'],
    formats: {
      '.avi': 'video/x-msvideo',
      ...same('video/mpeg', ['.mpeg', '.mpg', '.mpe', '.m1v', '.vob']),
      '.mp4': 'video/mp4',
      '.m4v': 'video/x-m4v',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.ogv': 'video/ogg',
      '.3gp': 'video/3gpp',
      '.divx': 'video/divx',
      '.xvid': 'video/x-xvid',
      '.mxf': 'application/mxf',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.m2ts': 'video/mp2t',
    },
  },
  {
    id: 'audio',
    name: 'audio',
    maxBytes: 50 * MB,
    mediaTypes: ['AUDIO'],
    formats: {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.m4a': 'audio/mp4',
      '.wma': 'audio/x-ms-wma',
      '.aac': 'audio/aac',
      ...same('audio/aiff', ['.aif', '.aiff']),
    },
  },
  { id: 'pdf', name: 'PDF', maxBytes: 1000 * MB, mediaTypes: DOCUMENT_MEDIA, formats: { '.pdf': 'application/pdf' } },
  {
    id: 'office',
    name: 'Word, Excel, and PowerPoint',
    maxBytes: 1000 * MB,
    mediaTypes: [...DOCUMENT_MEDIA, 'ARCHIVE'],
    formats: {
      ...same('application/msword', ['.doc', '.dot', '.docb']),
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.dotx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
      ...same('application/vnd.ms-excel', ['.xls', '.xlt']),
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xltx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
      ...same('application/vnd.ms-powerpoint', ['.ppt', '.pot', '.pps']),
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.potx': 'application/vnd.openxmlformats-officedocument.presentationml.template',
      '.ppsx': 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    },
  },
  {
    id: 'openOffice',
    name: 'OpenDocument',
    maxBytes: 1000 * MB,
    mediaTypes: [...DOCUMENT_MEDIA, 'ARCHIVE'],
    formats: {
      '.odt': 'application/vnd.oasis.opendocument.text',
      '.ott': 'application/vnd.oasis.opendocument.text-template',
      '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
      '.ots': 'application/vnd.oasis.opendocument.spreadsheet-template',
      '.odp': 'application/vnd.oasis.opendocument.presentation',
      '.otp': 'application/vnd.oasis.opendocument.presentation-template',
      '.odg': 'application/vnd.oasis.opendocument.graphics',
    },
  },
  {
    id: 'iwork',
    name: 'Apple iWork',
    maxBytes: 1000 * MB,
    mediaTypes: [...DOCUMENT_MEDIA, 'ARCHIVE'],
    formats: { '.pages': 'application/vnd.apple.pages', '.numbers': 'application/vnd.apple.numbers', '.key': 'application/vnd.apple.keynote' },
  },
  {
    id: 'text',
    name: 'text and data',
    maxBytes: 1000 * MB,
    mediaTypes: DOCUMENT_MEDIA,
    formats: { '.txt': 'text/plain', '.rtf': 'application/rtf', '.csv': 'text/csv', '.json': 'application/json' },
  },
  {
    id: 'publishing',
    name: 'XPS and Publisher',
    maxBytes: 1000 * MB,
    mediaTypes: [...DOCUMENT_MEDIA, 'ARCHIVE'],
    formats: { '.xps': 'application/vnd.ms-xpsdocument', '.oxps': 'application/oxps', '.pub': 'application/vnd.ms-publisher' },
  },
  {
    id: 'design',
    name: 'design files',
    maxBytes: 1000 * MB,
    mediaTypes: [...DOCUMENT_MEDIA, 'IMAGE', 'VECTOR', 'ARCHIVE'],
    formats: {
      '.psd': 'image/vnd.adobe.photoshop',
      ...same('application/postscript', ['.ai', '.eps']),
      '.indd': 'application/x-indesign',
      '.fla': 'application/vnd.adobe.fla',
      '.xcf': 'image/x-xcf',
      '.cdr': 'application/vnd.corel-draw',
    },
  },
  { id: 'cad', name: 'CAD drawings', maxBytes: 1000 * MB, mediaTypes: [...DOCUMENT_MEDIA, 'IMAGE', 'VECTOR'], formats: { '.dwg': 'image/vnd.dwg' } },
  {
    id: 'maps',
    name: 'GPS and map files',
    maxBytes: 1000 * MB,
    mediaTypes: [...DOCUMENT_MEDIA, 'ARCHIVE'],
    formats: { '.gpx': 'application/gpx+xml', '.kml': 'application/vnd.google-earth.kml+xml', '.kmz': 'application/vnd.google-earth.kmz' },
  },
  {
    id: 'ebooks',
    name: 'eBooks',
    maxBytes: 1000 * MB,
    mediaTypes: [...DOCUMENT_MEDIA, 'ARCHIVE'],
    formats: { '.epub': 'application/epub+zip', '.mobi': 'application/x-mobipocket-ebook' },
  },
  {
    id: 'contacts',
    name: 'contacts and calendars',
    maxBytes: 1000 * MB,
    mediaTypes: DOCUMENT_MEDIA,
    formats: { '.vcf': 'text/vcard', ...same('text/calendar', ['.ics', '.ical', '.icalendar', '.ifb']) },
  },
  { id: 'notebooks', name: 'Jupyter notebooks', maxBytes: 1000 * MB, mediaTypes: DOCUMENT_MEDIA, formats: { '.ipynb': 'application/x-ipynb+json' } },
  {
    id: 'archives',
    name: 'archives',
    maxBytes: 4000 * MB,
    mediaTypes: ['ARCHIVE', ...DOCUMENT_MEDIA],
    formats: {
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar',
      '.tar': 'application/x-tar',
      ...same('application/gzip', ['.gz', '.gzip', '.fgz']),
      '.jar': 'application/java-archive',
      '.7z': 'application/x-7z-compressed',
      '.webarchive': 'application/x-webarchive',
    },
  },
  { id: 'models', name: '3D models', maxBytes: 25 * MB, mediaTypes: ['MODEL3D', ...DOCUMENT_MEDIA], formats: { '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary' } },
];

/** GIFs have a lower limit than other images in Wix. */
const EXTENSION_LIMITS: Readonly<Record<string, number>> = { '.gif': 15 * MB };

export interface WixFormat {
  extension: string;
  mimeType: string;
  group: FormatGroup;
  maxBytes: number;
}

const BY_EXTENSION = new Map<string, WixFormat>(
  FORMAT_GROUPS.flatMap((group) =>
    Object.entries(group.formats).map(([extension, mimeType]) => [
      extension,
      { extension, mimeType, group, maxBytes: EXTENSION_LIMITS[extension] ?? group.maxBytes },
    ]),
  ),
);

const KNOWN_MIME_TYPES = new Set(FORMAT_GROUPS.flatMap((group) => Object.values(group.formats)));

export function groupExtensions(group: FormatGroup): string[] {
  return Object.keys(group.formats);
}

export function findGroup(id: string): FormatGroup | undefined {
  return FORMAT_GROUPS.find((group) => group.id === id);
}

export function formatForExtension(extension: string | null): WixFormat | null {
  return extension ? BY_EXTENSION.get(extension.toLowerCase()) ?? null : null;
}

export function isKnownMimeType(mimeType: string): boolean {
  return KNOWN_MIME_TYPES.has(mimeType.toLowerCase());
}

/** Largest file Wix accepts for any supported format. */
export const LARGEST_WIX_FILE_BYTES = Math.max(...FORMAT_GROUPS.map((group) => group.maxBytes));
