import 'package:cross_file/cross_file.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../palette.dart';
import '../tokens.dart';
import 'bagh_key.dart';
import 'soft_surface.dart';

/// The limits the server enforces on intake attachments
/// (civitechglobal-server/src/services/attachment.service.ts): up to 8 files,
/// 10 MB each, 25 MB in all, of these types (checked by content there, by
/// extension here, so a refusal is explained before the upload, not after).
abstract final class AttachmentRules {
  static const maxFiles = 8;
  static const maxFileBytes = 10 * 1024 * 1024;
  static const maxTotalBytes = 25 * 1024 * 1024;
  static const extensions = [
    'pdf',
    'png',
    'jpg',
    'jpeg',
    'webp',
    'docx',
    'xlsx',
    'pptx',
    'txt',
    'md',
    'csv',
    'tex',
  ];
}

/// A picked file, with its size known before anything is sent.
///
/// Held as the picker's XFile rather than a path: Android often hands over a
/// content:// address with no file path behind it.
class PickedFile {
  const PickedFile({
    required this.name,
    required this.file,
    required this.bytes,
  });

  final String name;
  final XFile file;
  final int bytes;
}

/// The multipart parts for [files], read into memory once. The returned
/// function builds fresh parts for every attempt (a retry after a token
/// refresh cannot reuse a part already sent). Within the 25 MB total the
/// server allows, holding the bytes is the simplest thing that works.
Future<List<MultipartFile> Function()> multipartParts(
  List<PickedFile> files,
) async {
  final contents = [
    for (final f in files) (f.name, await f.file.readAsBytes()),
  ];
  return () => [
    for (final (name, bytes) in contents)
      MultipartFile.fromBytes(bytes, filename: name),
  ];
}

/// Picks and lists attachments, refusing at once what the server would.
class AttachmentsField extends StatelessWidget {
  const AttachmentsField({
    required this.files,
    required this.onChanged,
    required this.chooseLabel,
    required this.rulesText,
    required this.removeLabel,
    required this.tooManyText,
    required this.tooBigText,
    required this.totalTooBigText,
    required this.language,
    this.extensions = AttachmentRules.extensions,
    this.maxFiles = AttachmentRules.maxFiles,
    super.key,
  });

  final List<PickedFile> files;
  final ValueChanged<List<PickedFile>> onChanged;
  final String chooseLabel;
  final String rulesText;
  final String removeLabel;
  final String tooManyText;
  final String tooBigText;
  final String totalTooBigText;
  final String language;

  /// The types this field takes, and how many files; the intake defaults,
  /// narrowed for a CV (one PDF, Word or LaTeX file).
  final List<String> extensions;
  final int maxFiles;

  Future<void> _pick(BuildContext context) async {
    final picked = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: extensions,
    );
    if (picked.isEmpty || !context.mounted) return;
    final next = [...files];
    String? problem;
    for (final f in picked) {
      if (next.length >= maxFiles) {
        problem = tooManyText;
        break;
      }
      final size = await f.xFile.length();
      if (size > AttachmentRules.maxFileBytes) {
        problem = '${f.name}: $tooBigText';
        continue;
      }
      final total = next.fold<int>(0, (sum, x) => sum + x.bytes) + size;
      if (total > AttachmentRules.maxTotalBytes) {
        problem = totalTooBigText;
        continue;
      }
      next.add(PickedFile(name: f.name, file: f.xFile, bytes: size));
    }
    if (!context.mounted) return;
    onChanged(next);
    if (problem != null && context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(problem)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 10,
      children: [
        Text(rulesText, style: text.bodySmall),
        for (final (i, f) in files.indexed)
          SoftSurface(
            tint: c.tints[(i + 2) % c.tints.length],
            radius: BaghRadius.tile,
            padding: const EdgeInsetsDirectional.fromSTEB(14, 6, 4, 6),
            child: Row(
              spacing: 10,
              children: [
                const Icon(Icons.attach_file_rounded, size: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        f.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textDirection: TextDirection.ltr,
                        style: text.bodyMedium,
                      ),
                      Text(
                        formatBytes(f.bytes, language),
                        style: text.bodySmall,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: removeLabel,
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => onChanged([...files]..removeAt(i)),
                ),
              ],
            ),
          ),
        if (files.length < maxFiles)
          BaghKey(
            label: chooseLabel,
            icon: Icons.upload_file_rounded,
            kind: BaghKeyKind.outline,
            expand: true,
            onPressed: () => _pick(context),
          ),
      ],
    );
  }
}

/// 1.4 MB, 820 KB: in the reader's digits.
String formatBytes(int bytes, String language) {
  final String value;
  if (bytes >= 1024 * 1024) {
    value = '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  } else {
    value = '${(bytes / 1024).ceil()} KB';
  }
  return localDigits(value, language);
}
