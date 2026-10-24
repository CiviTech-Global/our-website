import 'package:flutter/services.dart';

/// Hands a downloaded file to the phone's own viewer (see MainActivity.open).
///
/// False when nothing on the phone opens that kind of file, so the caller
/// can say so instead of failing silently.
Future<bool> openDownloaded({
  required List<int> bytes,
  required String name,
  required String mimeType,
}) async {
  const channel = MethodChannel('ir.rayantamaddonjahangostar.app/files');
  final opened = await channel.invokeMethod<bool>('open', {
    'bytes': Uint8List.fromList(bytes),
    'name': name,
    'mimeType': mimeType,
  });
  return opened ?? false;
}
