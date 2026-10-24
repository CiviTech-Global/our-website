import 'package:flutter/services.dart';

const _channel = MethodChannel('ir.rayantamaddonjahangostar.app/files');

/// A picture made ready to upload: WebP, at most 1600 px on its longest
/// edge, within the server's 300 KB (see MainActivity.prepareImage).
typedef PreparedImage = ({Uint8List bytes, String name});

/// Why a picture could not be made ready.
enum ImageProblem { unreadable, tooLarge }

class ImageNotReady implements Exception {
  const ImageNotReady(this.problem);

  final ImageProblem problem;
}

/// Shrinks the picture at [path] the way the web does before it uploads.
/// Throws [ImageNotReady] for a file that is not a readable picture, or one
/// still over the limit at the lowest quality.
Future<PreparedImage> prepareImage(String path, String name) async {
  try {
    final result = await _channel.invokeMapMethod<String, Object?>(
      'prepareImage',
      {'path': path},
    );
    final bytes = result?['bytes'];
    if (bytes is! Uint8List) {
      throw const ImageNotReady(ImageProblem.unreadable);
    }
    final stem = name.replaceFirst(RegExp(r'\.[^.]+$'), '');
    return (bytes: bytes, name: '${stem.isEmpty ? 'image' : stem}.webp');
  } on PlatformException catch (e) {
    throw ImageNotReady(
      e.code == 'too_large' ? ImageProblem.tooLarge : ImageProblem.unreadable,
    );
  }
}

/// Hands a downloaded file to the phone's own viewer (see MainActivity.open).
///
/// False when nothing on the phone opens that kind of file, so the caller
/// can say so instead of failing silently.
Future<bool> openDownloaded({
  required List<int> bytes,
  required String name,
  required String mimeType,
}) async {
  final opened = await _channel.invokeMethod<bool>('open', {
    'bytes': Uint8List.fromList(bytes),
    'name': name,
    'mimeType': mimeType,
  });
  return opened ?? false;
}
