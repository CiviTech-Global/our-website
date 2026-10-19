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
        : CachedNetworkImage(
            imageUrl: url!,
            width: width,
            height: height,
            fit: fit,
            fadeInDuration: const Duration(milliseconds: 180),
            placeholder: (_, _) => placeholder,
            errorWidget: (_, _, _) => placeholder,
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
