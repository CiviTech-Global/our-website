import 'dart:convert';
import 'dart:io';

import 'package:civitech_global_flutter/features/staff/staff_collections.dart';
import 'package:civitech_global_flutter/features/staff/staff_queues.dart';
import 'package:civitech_global_flutter/features/staff/staff_screens.dart';
import 'package:civitech_global_flutter/l10n/generated/strings.g.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/staff_fakes.dart';

void main() {
  final s = Strings(
    jsonDecode(File('assets/l10n/en.json').readAsStringSync())
        as Map<String, Object?>,
  );

  group('every queue describes its row', () {
    for (final q in staffQueues) {
      // The programme is the CV queue with another track.
      final row = staffRows[q.key == 'programme' ? 'resumes' : q.key]!;
      test(q.key, () {
        final view = q.describe(row, s, 'en');
        expect(view.title.trim(), isNotEmpty);
        expect(view.status, isNot(equals('')));
        // A label the dictionary lacks shows the raw code to a reviewer.
        for (final status in q.statuses) {
          expect(q.statusLabel(s, status), isNot(equals(status)));
        }
      });
    }
  });

  test('a queue with no labelled status reads as its current one', () {
    final q = staffQueue('insurance')!;
    expect(q.statusOf(staffRows['insurance']!), 'NEW');
    expect(
      q.statusOf({'request': staffRows['insurance'], 'answers': <Object?>[]}),
      'NEW',
    );
  });

  test('files are served from the staff routes', () {
    final cv = staffQueue('resumes')!.describe(staffRows['resumes']!, s, 'en');
    expect(cv.files.single.$2, '/resumes/admin/c1/file');
    final id = staffQueue(
      'verification',
    )!.describe(staffRows['verification']!, s, 'en');
    expect(id.files.single.$2, '/market/admin/verification-documents/d1');
  });

  test('pictures and project files come from the staff routes', () {
    final product = staffQueue(
      'tradeMasterProducts',
    )!.describe(staffRows['tradeMasterProducts']!, s, 'en');
    expect(product.images, [
      '/trademaster/admin/products/images/i1',
      '/trademaster/admin/products/images/i2',
    ]);
    final project = staffQueue(
      'freelanceProjects',
    )!.describe(staffRows['freelanceProjects']!, s, 'en');
    expect(project.texts, isNotEmpty);
    expect(project.files.single.$2, '/market/admin/project-attachments/fa1');
  });

  test('every setup page can be found by its key, with a form to fill', () {
    for (final c in [...staffCollections, ...staffTools]) {
      expect(staffCollection(c.key), same(c));
      expect(c.fields, isNotEmpty, reason: c.key);
      // A label the dictionary lacks shows the raw key.
      for (final f in c.fields) {
        expect(f.label(s).trim(), isNotEmpty, reason: '${c.key}.${f.key}');
        expect(f.label(s), isNot(equals(f.key)), reason: '${c.key}.${f.key}');
      }
    }
  });

  test('a section keeps its members out of a row of its own parent', () {
    final category = staffCollection('product-categories')!;
    final parent = category.fields.firstWhere((f) => f.key == 'parentId');
    final options = parent.choices!(
      s,
      [
        {'id': 'a', 'name': 'A'},
        {'id': 'b', 'name': 'B'},
      ],
      {'id': 'a'},
    );
    expect(options.map((o) => o.$1), ['', 'b']);
  });

  group('workQueues', () {
    test('lists only what the workload grants', () {
      final queues = workQueues({
        'queues': {
          'insurance': {'open': 2, 'total': 5},
          'messages': {'open': 0, 'total': 1},
          // No screen in the app: staff reach it on the web.
          'disputes': {'open': 4, 'total': 4},
        },
      });
      expect(queues.map((q) => q.$1.key), ['insurance', 'messages']);
      expect(queues.first.$2, 2);
    });

    test('freelance moderators also get the services queue', () {
      final keys = workQueues({
        'queues': {
          'freelanceProjects': {'open': 1, 'total': 1},
        },
      }).map((q) => q.$1.key);
      expect(keys, ['freelanceProjects', 'services']);
    });

    test('an account with no modules has no queues', () {
      expect(workQueues({'queues': <String, Object?>{}}), isEmpty);
    });
  });
}
