import 'package:flutter/material.dart';

import '../../core/format.dart';

/// A text field's "19/120" in the reader's digits. Flutter's own counter
/// writes Latin digits whatever the language, so a Persian form showed
/// them beside Persian ones everywhere else.
InputCounterWidgetBuilder localCounter(String language) =>
    (context, {required currentLength, required isFocused, maxLength}) =>
        maxLength == null
        ? null
        : Text(
            localDigits('$currentLength/$maxLength', language),
            style: Theme.of(context).textTheme.bodySmall,
            semanticsLabel: '$currentLength / $maxLength',
          );
