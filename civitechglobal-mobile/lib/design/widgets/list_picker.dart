import 'package:flutter/material.dart';

import 'sheet.dart';

/// One value from a list, in a sheet; "all" clears it. Null when dismissed.
Future<String?> pickFromList(
  BuildContext context, {
  required String title,
  required String all,
  required List<(String, String)> options,
  bool searchable = false,
}) => showBaghSheet<String>(
  context,
  isScrollControlled: true,
  builder: (_) => _ListPicker(
    title: title,
    all: all,
    options: options,
    searchable: searchable,
  ),
);

class _ListPicker extends StatefulWidget {
  const _ListPicker({
    required this.title,
    required this.all,
    required this.options,
    required this.searchable,
  });

  final String title;
  final String all;
  final List<(String, String)> options;
  final bool searchable;

  @override
  State<_ListPicker> createState() => _ListPickerState();
}

class _ListPickerState extends State<_ListPicker> {
  String _filter = '';

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final needle = _filter.trim().toLowerCase();
    final shown = needle.isEmpty
        ? widget.options
        : [
            for (final o in widget.options)
              if (o.$2.toLowerCase().contains(needle) ||
                  o.$1.toLowerCase() == needle)
                o,
          ];
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.75,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
            child: Text(widget.title, style: text.titleLarge),
          ),
          if (widget.searchable)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                autofocus: false,
                onChanged: (v) => setState(() => _filter = v),
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
            ),
          Expanded(
            // Clear of the phone's own navigation bar.
            child: ListView(
              padding: EdgeInsets.only(
                bottom: MediaQuery.paddingOf(context).bottom + 8,
              ),
              children: [
                ListTile(
                  title: Text(widget.all),
                  onTap: () => Navigator.of(context).pop(''),
                ),
                for (final (value, label) in shown)
                  ListTile(
                    title: Text(label),
                    onTap: () => Navigator.of(context).pop(value),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
