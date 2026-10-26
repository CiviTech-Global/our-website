import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../palette.dart';
import 'girih.dart';

/// An image from the API (a photo, a logo, a cover), cached on the device.
///
/// While it loads, and if it never does (offline, deleted, filtered), the
/// space shows a tinted tile with a girih star or the given initials, so a
/// missing picture never leaves a hole or a broken-image icon.
class RemoteImage extends StatelessWidget {
  const RemoteImage({
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.radius = 16,
    this.initials,
    this.tint = 0,
    this.semanticLabel,
    super.key,
  });

  final String? url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final double radius;
  final String? initials;
  final int tint;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final tone = c.tints[tint % c.tints.length];
    final placeholder = Container(
      width: width,
      height: height,
      color: tone.fill,
      alignment: Alignment.center,
      child: initials != null && initials!.isNotEmpty
          ? Text(
              initials!,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(color: tone.ink),
            )
          : GirihStar(color: tone.ink, size: 28),
    );
    final image = url == null
        ? placeholder
        // Decoded at the size it is shown, not the size it was uploaded: a
        // 1600-pixel photo in an 80-point tile is most of a low-end phone's
        // image memory once a list has a few dozen of them.
        : LayoutBuilder(
            builder: (context, box) {
              final w = width ?? box.maxWidth;
              final h = height ?? box.maxHeight;
              // Cropping to cover, a wide photo in a tall tile is cut to
              // the tile's height: decode by the longer side, with room to
              // spare, so the crop is never blurred.
              final side = fit == BoxFit.cover && h.isFinite
                  ? (w > h ? w : h) * 2
                  : w;
              final px = side * MediaQuery.devicePixelRatioOf(context);
              // Uploads are at most 1600 pixels: past that, nothing to save.
              final decode = px.isFinite && px < 1600 ? px.round() : null;
              return CachedNetworkImage(
                imageUrl: url!,
                width: width,
                height: height,
                fit: fit,
                memCacheWidth: decode,
                fadeInDuration: const Duration(milliseconds: 180),
                placeholder: (_, _) => placeholder,
                errorWidget: (_, _, _) => placeholder,
              );
            },
          );
    return Semantics(
      image: true,
      label: semanticLabel,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: image,
      ),
    );
  }
}

/// The first letter of each of the first two words: "MA" for Maryam Ahmadi.
/// Marks before a letter go, so a handle reads "R" for @reza_data, not "@".
String initialsOf(String name) => name
    .trim()
    .split(RegExp(r'\s+'))
    .map((w) => w.replaceFirst(RegExp(r'^[^\p{L}\p{N}]+', unicode: true), ''))
    .where((w) => w.isNotEmpty)
    .take(2)
    .map((w) => w.characters.first.toUpperCase())
    .join();
