// Reads a GitHub tarball (.tar.gz) entry by entry, in memory, and keeps only the text files worth indexing.
// Nothing is written to disk, nothing is executed. This file has no server-only import and no network code, so a plain
// unit test can feed it a small archive. fetch-repo.ts does the GitHub part.
import type { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { extract } from "tar-stream";

export type SkipReason =
  | "ignored_path"
  | "too_big"
  | "binary"
  | "not_a_file"
  | "unsafe_path"
  | "limit_reached"
  | "generated";

export type RepoFile = { path: string; text: string; sizeBytes: number };

export type UnpackResult = {
  files: RepoFile[];
  skipped: Record<SkipReason, number>;
  totalBytes: number; // bytes of the kept files
};

export const UNPACK_LIMITS = {
  maxFiles: 5000,
  maxFileBytes: 300 * 1024,
  maxUnpackedBytes: 400 * 1024 * 1024,
} as const;

const BINARY_SNIFF_BYTES = 8 * 1024;
const GENERATED_SNIFF_CHARS = 500;

// Folders we never index, at any depth.
const IGNORED_FOLDERS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".vercel", ".turbo", "vendor",
]);
const IGNORED_NAMES = new Set([".ds_store", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
const IGNORED_EXTENSIONS = new Set([
  // images
  "png", "jpg", "jpeg", "gif", "webp", "avif", "ico", "bmp", "tif", "tiff", "svg", "heic",
  // fonts
  "woff", "woff2", "ttf", "otf", "eot",
  // videos
  "mp4", "mov", "webm", "avi", "mkv", "m4v",
  // archives
  "zip", "tar", "gz", "tgz", "bz2", "xz", "7z", "rar",
  // source maps
  "map",
]);

export const emptySkipped = (): Record<SkipReason, number> => ({
  ignored_path: 0,
  too_big: 0,
  binary: 0,
  not_a_file: 0,
  unsafe_path: 0,
  limit_reached: 0,
  generated: 0,
});

// A path from the archive is unsafe if it could point outside the repo: absolute, "..", a backslash or a NUL byte.
function isUnsafePath(name: string): boolean {
  if (name.startsWith("/") || name.includes("\\") || name.includes("\0")) return true;
  return name.split("/").some((segment) => segment === "..");
}

// GitHub puts everything under one folder ("owner-repo-<sha>/"). Remove it.
function stripTopFolder(name: string): string {
  const slash = name.indexOf("/");
  return slash === -1 ? "" : name.slice(slash + 1);
}

export function isIgnoredPath(path: string): boolean {
  const segments = path.split("/");
  const fileName = (segments.at(-1) ?? "").toLowerCase();
  if (segments.slice(0, -1).some((segment) => IGNORED_FOLDERS.has(segment))) return true;
  if (IGNORED_NAMES.has(fileName) || fileName.startsWith("bun.lock")) return true;
  if (fileName.endsWith(".min.js")) return true;
  const dot = fileName.lastIndexOf(".");
  return dot !== -1 && IGNORED_EXTENSIONS.has(fileName.slice(dot + 1));
}

const hasNulByte = (bytes: Uint8Array) => bytes.subarray(0, BINARY_SNIFF_BYTES).includes(0);

function looksGenerated(text: string): boolean {
  const start = text.slice(0, GENERATED_SNIFF_CHARS).toLowerCase();
  return start.includes("@generated") || start.includes("auto-generated");
}

export async function unpackRepoTarball(source: Readable): Promise<UnpackResult> {
  const files: RepoFile[] = [];
  const skipped = emptySkipped();
  const decoder = new TextDecoder("utf-8");
  let totalBytes = 0;
  let unpackedBytes = 0;

  const gunzip = createGunzip();
  const tar = extract();
  // A broken download or a corrupt archive must stop the loop below with an error, not hang it.
  source.on("error", (error) => gunzip.destroy(error));
  gunzip.on("error", (error) => tar.destroy(error));
  source.pipe(gunzip).pipe(tar);

  let stoppedOnPurpose = false;
  try {
    for await (const entry of tar) {
      const { name, size, type } = entry.header;

      if (isUnsafePath(name)) {
        skipped.unsafe_path++;
        entry.resume();
        continue;
      }
      if (type !== "file") {
        skipped.not_a_file++;
        entry.resume();
        continue;
      }

      // Count every file toward the unpacked budget, kept or not. Past it we stop reading altogether.
      unpackedBytes += size;
      if (unpackedBytes > UNPACK_LIMITS.maxUnpackedBytes) {
        skipped.limit_reached++;
        stoppedOnPurpose = true;
        break;
      }

      const path = stripTopFolder(name);
      if (path === "" || isIgnoredPath(path)) {
        skipped.ignored_path++;
        entry.resume();
        continue;
      }
      if (size > UNPACK_LIMITS.maxFileBytes) {
        skipped.too_big++;
        entry.resume();
        continue;
      }
      if (files.length >= UNPACK_LIMITS.maxFiles) {
        skipped.limit_reached++;
        entry.resume();
        continue;
      }

      const chunks: Buffer[] = [];
      // tar-stream types the chunks as unknown; they are always byte buffers.
      for await (const chunk of entry) chunks.push(Buffer.from(chunk as Uint8Array));
      const bytes = Buffer.concat(chunks);

      if (hasNulByte(bytes)) {
        skipped.binary++;
        continue;
      }
      const text = decoder.decode(bytes);
      if (looksGenerated(text)) {
        skipped.generated++;
        continue;
      }
      files.push({ path, text, sizeBytes: bytes.length });
      totalBytes += bytes.length;
    }
  } finally {
    // Stop the download if we quit early (or failed). Harmless when everything was already read.
    if (stoppedOnPurpose) {
      source.destroy();
      gunzip.destroy();
      tar.destroy();
    }
  }

  return { files, skipped, totalBytes };
}
