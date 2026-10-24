import 'package:civitech_global_flutter/features/jobs/job_form.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  JobDraft filled() => JobDraft()
    ..title = '  Backend engineer  '
    ..description = 'x' * 60
    ..salaryMin = '50000000'
    ..salaryMax = '۸۰۰۰۰۰۰۰'
    ..skills = 'node, postgres، react ,'
    ..openings = '۳';

  test('a new posting leaves out what was not given', () {
    final p = JobDraft().toPayload(edit: false, v2: true);
    for (final key in ['province', 'city', 'salaryMin', 'closesAt', 'ageMin']) {
      expect(p.containsKey(key), isFalse, reason: key);
    }
    expect(p['openings'], 1);
    expect(p['skills'], isEmpty);
  });

  test('an edit sends an emptied field as null, so the server clears it', () {
    final draft = JobDraft.fromJob({'city': 'Tehran', 'salaryMin': '100'})
      ..city = '  '
      ..salaryMin = '';
    final p = draft.toPayload(edit: true, v2: true);
    expect(p.containsKey('city'), isTrue);
    expect(p['city'], isNull);
    expect(p['salaryMin'], isNull);
  });

  test(
    'typed values arrive trimmed, in Latin digits, skills split on both commas',
    () {
      final p = filled().toPayload(edit: false, v2: true);
      expect(p['title'], 'Backend engineer');
      expect(p['salaryMax'], '80000000');
      expect(p['openings'], 3);
      expect(p['skills'], ['node', 'postgres', 'react']);
    },
  );

  test('a negotiable salary sends no numbers alongside it', () {
    final p = (filled()..salaryUndisclosed = true).toPayload(
      edit: true,
      v2: true,
    );
    expect(p['salaryUndisclosed'], isTrue);
    expect(p['salaryMin'], isNull);
    expect(p['salaryMax'], isNull);
  });

  test('worldwide only goes with remote work', () {
    final draft = filled()..remoteWorldwide = true;
    expect(draft.toPayload(edit: false, v2: true)['remoteWorldwide'], isFalse);
    draft.workArrangement = 'REMOTE';
    expect(draft.toPayload(edit: false, v2: true)['remoteWorldwide'], isTrue);
  });

  test('the old board gets none of the second-generation fields', () {
    final p = filled().toPayload(edit: true, v2: false);
    for (final key in ['country', 'currency', 'benefits', 'urgent', 'ageMin']) {
      expect(p.containsKey(key), isFalse, reason: key);
    }
  });

  test('a nonsense openings count falls back to one, as the web does', () {
    expect(
      (filled()..openings = '0').toPayload(edit: false, v2: true)['openings'],
      1,
    );
    expect(
      (filled()..openings = '').toPayload(edit: false, v2: true)['openings'],
      1,
    );
  });

  test('a new country brings its currency, unless a salary is typed', () {
    final fresh = JobDraft()..province = 'تهران';
    fresh.setCountry('DE');
    expect(fresh.currency, 'EUR');
    expect(fresh.province, isEmpty);
    final paid = filled()..setCountry('DE');
    expect(paid.currency, 'IRT');
  });

  test('a saved posting fills the form and sends back what it had', () {
    final draft = JobDraft.fromJob({
      'title': 'Designer',
      'description': 'd',
      'skills': ['figma', 'ux'],
      'closesAt': '2026-12-01T00:00:00.000Z',
      'openings': 2,
      'ageMin': 20,
      'benefits': ['LOAN', 'LOAN', 'BONUS'],
      'salaryMin': null,
    });
    expect(draft.skills, 'figma، ux');
    expect(draft.openings, '2');
    expect(draft.ageMin, '20');
    expect(draft.salaryMin, isEmpty);
    expect(draft.benefits, {'LOAN', 'BONUS'});
    final p = draft.toPayload(edit: true, v2: true);
    expect(p['skills'], ['figma', 'ux']);
    expect(p['ageMin'], 20);
    expect(p['closesAt'], matches(RegExp(r'^\d{4}-\d{2}-\d{2}$')));
  });
}
