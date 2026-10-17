import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../motion.dart';
import '../tokens.dart';

/// A curve that follows a spring from 0 to 1 over [duration], overshoot
/// included, so timed animations share the springs' physics.
class SpringCurve extends Curve {
  SpringCurve(SpringDescription spring, this.duration)
    : _sim = SpringSimulation(spring, 0, 1, 0);

  final SpringSimulation _sim;
  final Duration duration;

  @override
  double transformInternal(double t) =>
      _sim.x(t * duration.inMicroseconds / Duration.microsecondsPerSecond);
}

/// A headline whose words rise into place one after another.
///
/// Persian is joined script: animating it letter by letter splits the shaped
/// glyphs apart. So the unit is the word, split on spaces only, which keeps a
/// half-space (ZWNJ) inside its word and every word shaped whole. The last
/// word then gains weight along Vazirmatn's `wght` axis. Screen readers get
/// the sentence once; with reduced motion it is simply there.
class KineticWords extends ConsumerStatefulWidget {
  const KineticWords(
    this.text, {
    this.style,
    this.emphasisColor,
    this.textAlign = TextAlign.start,
    super.key,
  });

  final String text;
  final TextStyle? style;
  final Color? emphasisColor;
  final TextAlign textAlign;

  @override
  ConsumerState<KineticWords> createState() => _KineticWordsState();
}

class _KineticWordsState extends ConsumerState<KineticWords>
    with SingleTickerProviderStateMixin {
  static const _wordDelay = Duration(milliseconds: 90);
  static const _rise = Duration(milliseconds: 620);
  static const _weigh = Duration(milliseconds: 700);

  late List<String> _words;
  late final AnimationController _t = AnimationController(vsync: this);
  final _curve = SpringCurve(BaghSprings.expressive, _rise);

  @override
  void initState() {
    super.initState();
    _split();
  }

  @override
  void didUpdateWidget(KineticWords old) {
    super.didUpdateWidget(old);
    if (old.text != widget.text) {
      _split();
      _play();
    }
  }

  /// Played once on arrival, not again when the theme or language around it
  /// changes; a new text plays again (see didUpdateWidget).
  bool _played = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_played) return;
    _played = true;
    _play();
  }

  void _split() => _words = widget.text
      .split(RegExp(' +'))
      .where((w) => w.isNotEmpty)
      .toList();

  Duration get _total => _wordDelay * (_words.length - 1) + _rise + _weigh ~/ 2;

  void _play() {
    _t.duration = _total;
    if (reduceMotion(context, ref, watch: false)) {
      _t.value = 1;
    } else {
      _t.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _t.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = widget.style ?? Theme.of(context).textTheme.displayMedium!;
    final total = _total.inMicroseconds;
    return Semantics(
      label: widget.text,
      header: true,
      excludeSemantics: true,
      child: AnimatedBuilder(
        animation: _t,
        builder: (context, _) {
          final now = _t.value * total;
          return Wrap(
            alignment: switch (widget.textAlign) {
              TextAlign.center => WrapAlignment.center,
              TextAlign.end || TextAlign.right => WrapAlignment.end,
              _ => WrapAlignment.start,
            },
            spacing: (base.fontSize ?? 30) * 0.28,
            children: [
              for (var i = 0; i < _words.length; i++) _word(i, now, base),
            ],
          );
        },
      ),
    );
  }

  Widget _word(int i, double now, TextStyle base) {
    final start = (_wordDelay * i).inMicroseconds;
    final local = ((now - start) / _rise.inMicroseconds).clamp(0.0, 1.0);
    final rise = _curve.transform(local);
    final last = i == _words.length - 1;

    var style = base;
    if (last) {
      final weighStart = start + _rise.inMicroseconds * 0.6;
      final w = ((now - weighStart) / _weigh.inMicroseconds).clamp(0.0, 1.0);
      final weight = 600 + 250 * Curves.easeOut.transform(w);
      style = BaghType.weight(
        base,
        weight,
      ).copyWith(color: widget.emphasisColor ?? base.color);
    }

    return Opacity(
      opacity: local.clamp(0.0, 1.0),
      child: Transform.translate(
        offset: Offset(0, (1 - rise) * (base.fontSize ?? 30) * 0.55),
        child: Text(_words[i], style: style),
      ),
    );
  }
}
