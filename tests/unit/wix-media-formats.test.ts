import { describe, expect, it } from 'vitest';
import { checkFile, describeAcceptedTypes, effectiveMaxBytes, isAcceptedFile, isSupportedAcceptedType, resolveMimeType } from '../../src/shared/file-rules';
import { FORMAT_GROUPS, formatForExtension, groupExtensions, LARGEST_WIX_FILE_BYTES } from '../../src/shared/wix-media-formats';
import { parseAcceptedTypes } from '../../src/server/domain/settings';

const MB = 1024 * 1024;

// Extensions from Wix's "Supported Media File Types and File Sizes" help article.
const WIX_DOCUMENTED = [
  'jpg', 'png', 'gif', 'jpeg', 'jpe', 'jfif', 'bmp', 'heic', 'heif', 'tiff', 'tif', 'webp', 'avif',
  'jp2', 'jpg2', 'j2k', 'jpf', 'jpm', 'j2c', 'jpc', 'jpx',
  'arw', 'srw', 'nef', 'cr2', 'cr3', 'crw', 'rwl', 'rw2', 'raw', 'raf', 'pef', 'orf', 'mrw', 'dng', 'sr2', 'srf', 'kdc', 'k25', 'dcr', 'x3f', 'erf', '3fr',
  'avi', 'mpeg', 'mpg', 'mpe', 'mp4', 'mkv', 'webm', 'mov', 'ogv', 'vob', 'm4v', '3gp', 'divx', 'xvid', 'mxf', 'wmv', 'm1v', 'flv', 'm2ts',
  'mp3', 'wav', 'flac', 'm4a', 'wma', 'aac', 'aif', 'aiff',
  'svg', 'ico',
  'zip', 'rar', 'tar', 'gz', 'gzip', 'jar', '7z', 'fgz', 'webarchive',
  'doc', 'docx', 'docb', 'dot', 'dotx', 'xls', 'xlsx', 'xlt', 'xltx', 'ppt', 'pptx', 'pot', 'potx', 'pps', 'ppsx',
  'pdf', 'xps', 'oxps', 'pub', 'csv', 'txt', 'rtf', 'json', 'odt', 'ott', 'ods', 'ots', 'odp', 'otp', 'odg',
  'pages', 'numbers', 'key', 'vcf', 'ics', 'ical', 'icalendar', 'ifb', 'epub', 'mobi',
  'psd', 'ai', 'indd', 'fla', 'eps', 'xcf', 'cdr', 'dwg', 'gpx', 'kml', 'kmz', 'ipynb',
  'gltf', 'glb',
];

describe('Wix media format catalog', () => {
  it('covers every extension Wix documents', () => {
    const missing = WIX_DOCUMENTED.filter((ext) => formatForExtension(`.${ext}`) === null);
    expect(missing).toEqual([]);
  });

  it('lists each extension in exactly one group', () => {
    const all = FORMAT_GROUPS.flatMap(groupExtensions);
    expect(new Set(all).size).toBe(all.length);
  });

  it('applies Wix size limits per format', () => {
    expect(formatForExtension('.gif')?.maxBytes).toBe(15 * MB);
    expect(formatForExtension('.png')?.maxBytes).toBe(50 * MB);
    expect(formatForExtension('.svg')?.maxBytes).toBe(250 * 1024);
    expect(formatForExtension('.zip')?.maxBytes).toBe(4000 * MB);
    expect(formatForExtension('.mp4')?.maxBytes).toBe(4096 * MB);
    expect(LARGEST_WIX_FILE_BYTES).toBe(4096 * MB);
  });
});

describe('resolveMimeType', () => {
  it('uses the canonical type for known extensions, even when the browser reports none', () => {
    expect(resolveMimeType('logo.AI', '')).toBe('application/postscript');
    expect(resolveMimeType('photo.HEIC', '')).toBe('image/heic');
    expect(resolveMimeType('scene.glb', 'application/octet-stream')).toBe('model/gltf-binary');
    expect(resolveMimeType('notes.txt', 'text/plain')).toBe('text/plain');
  });

  it('falls back to the browser type, then octet-stream', () => {
    expect(resolveMimeType('thing.xyz', 'application/x-thing')).toBe('application/x-thing');
    expect(resolveMimeType('thing.xyz', '')).toBe('application/octet-stream');
  });
});

describe('checkFile', () => {
  const rule = { acceptedTypes: ['image/*', '.psd', '.zip'], maxFileSizeBytes: 100 * MB };

  it('accepts a supported, accepted file within limits', () => {
    expect(checkFile({ name: 'mock.psd', type: '', size: 10 * MB }, rule)).toEqual({ ok: true, mimeType: 'image/vnd.adobe.photoshop', maxBytes: 100 * MB });
  });

  it('accepts HEIC under an image wildcard even when the browser gives no type', () => {
    expect(checkFile({ name: 'IMG_1.heic', type: '', size: 1 * MB }, rule).ok).toBe(true);
  });

  it('rejects formats Wix does not accept', () => {
    expect(checkFile({ name: 'setup.exe', type: 'application/x-msdownload', size: 1 }, { ...rule, acceptedTypes: ['.exe'] })).toMatchObject({ ok: false, reason: 'UNSUPPORTED_BY_WIX' });
  });

  it('rejects supported formats the merchant did not accept', () => {
    expect(checkFile({ name: 'song.mp3', type: 'audio/mpeg', size: 1 }, rule)).toMatchObject({ ok: false, reason: 'NOT_ACCEPTED' });
  });

  it('applies the lower of the merchant and Wix limits', () => {
    expect(checkFile({ name: 'anim.gif', type: 'image/gif', size: 20 * MB }, rule)).toMatchObject({ ok: false, reason: 'TOO_LARGE', maxBytes: 15 * MB, limitedByWix: true });
    expect(checkFile({ name: 'big.zip', type: '', size: 200 * MB }, rule)).toMatchObject({ ok: false, reason: 'TOO_LARGE', maxBytes: 100 * MB, limitedByWix: false });
    expect(effectiveMaxBytes(10 * MB, 'icon.svg')).toBe(250 * 1024);
  });
});

describe('accepted type tokens', () => {
  it('allows only formats Wix can store', () => {
    expect(isSupportedAcceptedType('.stl')).toBe(false);
    expect(isSupportedAcceptedType('.dwg')).toBe(true);
    expect(isSupportedAcceptedType('video/*')).toBe(true);
    expect(isSupportedAcceptedType('application/*')).toBe(false);
    expect(isSupportedAcceptedType('application/pdf')).toBe(true);
    expect(() => parseAcceptedTypes(['.pdf', '.exe'])).toThrow(/Wix Media/);
    expect(parseAcceptedTypes(FORMAT_GROUPS.flatMap(groupExtensions)).length).toBeGreaterThan(100);
  });

  it('keeps extension tokens matching by extension', () => {
    expect(isAcceptedFile('a.cr3', 'image/x-canon-cr3', ['.cr3'])).toBe(true);
  });

  it('summarizes whole groups by name', () => {
    const images = FORMAT_GROUPS.find((g) => g.id === 'images');
    const tokens = [...(images ? groupExtensions(images) : []), '.pdf', 'video/*'];
    expect(describeAcceptedTypes(tokens)).toEqual(['videos', 'images', 'PDF']);
    expect(describeAcceptedTypes(['.psd', '.ai'])).toEqual(['PSD', 'AI']);
  });
});
