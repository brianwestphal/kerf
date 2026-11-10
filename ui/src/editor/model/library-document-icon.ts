import {
  File,
  FileArchive,
  FileBracesCorner,
  FileCodeCorner,
  FileHeadphone,
  FileImage,
  FilePlay,
  FileSpreadsheet,
  FileText,
} from 'lucide';

import {
  LucideIcon,
  type LucideNode,
} from '../../components/media/lucide-icon/lucide-icon.js';

const categories: readonly [RegExp, LucideNode, string][] = [
  [/\.json$/i, FileBracesCorner, 'file-braces-corner'],
  [
    /\.(?:[cm]?[jt]sx?|html?|css|scss|vue|svelte|xml|ya?ml|sh)$/i,
    FileCodeCorner,
    'file-code-corner',
  ],
  [/\.(?:mdx?|txt|rtf|pdf)$/i, FileText, 'file-text'],
  [/\.(?:png|jpe?g|gif|webp|avif|svg|ico|tiff?)$/i, FileImage, 'file-image'],
  [/\.(?:mp3|wav|ogg|flac|m4a|aac)$/i, FileHeadphone, 'file-headphone'],
  [/\.(?:mp4|webm|mov|avi|mkv)$/i, FilePlay, 'file-play'],
  [/\.(?:zip|tar|gz|bz2|7z|rar)$/i, FileArchive, 'file-archive'],
  [/\.(?:csv|tsv|xlsx?|ods)$/i, FileSpreadsheet, 'file-spreadsheet'],
];

/** Storage provides paths, so choose a decorative file glyph by extension. */
export function libraryDocumentIcon(path: string) {
  const [, icon, name] = categories.find(([pattern]) => pattern.test(path)) ?? [
    null,
    File,
    'file',
  ];
  return LucideIcon({ icon, name });
}
