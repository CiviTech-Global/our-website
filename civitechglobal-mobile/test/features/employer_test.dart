import 'package:civitech_global_flutter/features/jobs/employer_data.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('an own posting reads as the board does, with its review state', () {
    final job = OwnJob.fromJson({
      'id': 'j1',
      'code': 'J1',
      'title': 'Engineer',
      'employmentType': 'PART_TIME',
      'workArrangement': 'REMOTE',
      'salaryUndisclosed': true,
      'moderationStatus': 'CHANGES_REQUESTED',
      'state': 'OPEN',
      'reviewNote': 'Add the city.',
      'viewCount': 12,
      '_count': {'applications': 3},
    });
    expect(job.posting.employmentType, 'PART_TIME');
    expect(job.posting.salaryUndisclosed, isTrue);
    expect(job.reviewNote, 'Add the city.');
    expect(job.applicationCount, 3);
    expect(job.viewCount, 12);
  });

  test('only drafts and sent-back postings go to review again', () {
    OwnJob of(String status, [String state = 'OPEN']) => OwnJob.fromJson({
      'id': 'j',
      'moderationStatus': status,
      'state': state,
    });
    expect(of('DRAFT').editable, isTrue);
    expect(of('CHANGES_REQUESTED').editable, isTrue);
    expect(of('PENDING_REVIEW').editable, isFalse);
    expect(of('APPROVED').editable, isFalse);
    expect(of('REJECTED').editable, isFalse);
    // Closing is for a live, open posting only.
    expect(of('APPROVED').closable, isTrue);
    expect(of('APPROVED', 'AWARDED').closable, isFalse);
    expect(of('DRAFT').closable, isFalse);
  });

  test('the pipeline keeps each posting and stage it was given', () {
    final pipelines = parsePipelines({
      'j1': {
        'total': 5,
        'unseen': 2,
        'byOutcome': {'SHORTLISTED': 1, 'WITHDRAWN': 1},
      },
      'j2': {'total': 0},
      'junk': 3,
    });
    expect(pipelines.keys, ['j1', 'j2']);
    expect(pipelines['j1']!.unseen, 2);
    expect(pipelines['j1']!.byOutcome, {'SHORTLISTED': 1, 'WITHDRAWN': 1});
    expect(pipelines['j2']!.byOutcome, isEmpty);
    expect(parsePipelines(null), isEmpty);
  });

  test('an applicant is new until opened, and never once withdrawn', () {
    EmployerApplication of(String outcome, {String? seen}) =>
        EmployerApplication.fromJson({
          'id': 'a',
          'outcome': outcome,
          'employerSeenAt': seen,
          'applicant': {'firstName': 'Sara', 'lastName': 'Moradi'},
        });
    expect(of('PENDING').isNew, isTrue);
    expect(of('PENDING', seen: '2026-10-01T10:00:00Z').isNew, isFalse);
    expect(of('WITHDRAWN').isNew, isFalse);
    expect(of('PENDING').name, 'Sara Moradi');
  });

  test('a skill fit shows only when the posting asked for skills', () {
    EmployerApplication of(Object? match) =>
        EmployerApplication.fromJson({'id': 'a', 'skillMatch': match});
    expect(of({'matched': 2, 'total': 5}).skillFit, (matched: 2, total: 5));
    expect(of({'matched': 0, 'total': 0}).skillFit, isNull);
    expect(of(null).skillFit, isNull);
  });

  test('the public profile card is optional', () {
    final a = EmployerApplication.fromJson({
      'id': 'a',
      'applicant': {'firstName': 'Ali', 'lastName': '', 'email': 'a@b.c'},
      'applicantProfile': null,
    });
    expect(a.username, isNull);
    expect(a.verified, isFalse);
    expect(a.name, 'Ali');
    expect(a.email, 'a@b.c');
  });
}
