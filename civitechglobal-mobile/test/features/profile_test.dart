import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/auth/auth_user.dart';
import 'package:civitech_global_flutter/core/auth/session.dart';
import 'package:civitech_global_flutter/core/settings.dart';
import 'package:civitech_global_flutter/design/palette.dart';
import 'package:civitech_global_flutter/design/theme.dart';
import 'package:civitech_global_flutter/design/widgets/attachments_field.dart';
import 'package:civitech_global_flutter/features/profile/profile_data.dart';
import 'package:civitech_global_flutter/features/profile/profile_screen.dart';
import 'package:civitech_global_flutter/features/profile/verification_screen.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:cross_file/cross_file.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api_client_test.dart' show FakeServer, MemoryTokens;

final _strings = Strings(
  jsonDecode(File('assets/l10n/en.json').readAsStringSync())
      as Map<String, Object?>,
);

class _SignedIn extends SessionController {
  @override
  Future<AuthUser?> build() async => const AuthUser(
    id: 'u1',
    email: 'a@b.c',
    firstName: 'Maryam',
    lastName: 'Ahmadi',
  );
}

/// The screen on a tall surface (so nothing waits to be scrolled into the
/// list), against [server], with [picker] standing in for the file picker.
Future<void> _pump(
  WidgetTester tester,
  FakeServer server,
  Widget screen, {
  Future<PickedFile?> Function()? picker,
}) async {
  tester.view
    ..physicalSize = const Size(900, 6000)
    ..devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({'settings.reduceMotion': true});
  final prefs = await SharedPreferences.getInstance();
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        l10nProvider.overrideWith(
          () => L10nController(L10nState('en', _strings)),
        ),
        apiClientProvider.overrideWithValue(
          ApiClient(
            tokens: MemoryTokens(),
            language: () => 'en',
            dio: Dio(BaseOptions(baseUrl: 'https://api.test/api/v1'))
              ..httpClientAdapter = server,
          ),
        ),
        sessionProvider.overrideWith(_SignedIn.new),
        if (picker != null) documentPickerProvider.overrideWithValue(picker),
      ],
      child: MaterialApp(
        theme: buildTheme(GardenPalette.pistachio, Brightness.light),
        home: screen,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Finder _field(String label) => find.widgetWithText(TextFormField, label);

void main() {
  group('a public profile review', () {
    PublicProfile parse(Map<String, Object?> review) => PublicProfile.fromJson({
      'username': 'x',
      'reviews': [
        {'rating': 5, 'role': 'client', 'listingCode': 'SRV1', ...review},
      ],
    });

    test('links where the server says', () {
      final r = parse({'listingPath': '/freelance-services/SRV1'}).reviews;
      expect(r.single.listingPath, '/freelance-services/SRV1');
    });

    test('has no link when the server says it has no page', () {
      expect(parse({'listingPath': null}).reviews.single.listingPath, isNull);
    });

    test('falls back to the role for a server that does not say', () {
      expect(parse({}).reviews.single.listingPath, '/projects/SRV1');
    });
  });

  test('skills split on either comma, and at most 30 are kept', () {
    expect(splitSkills('React، Node.js , ,SQL'), ['React', 'Node.js', 'SQL']);
    expect(splitSkills(List.filled(40, 'a').join(',')), hasLength(30));
  });

  testWidgets('the profile saves the name in Latin digits, and the public '
      'profile without touching skills where the form has none', (
    tester,
  ) async {
    final server = FakeServer((o) async {
      final path = o.path;
      if (path == '/auth/me' && o.method == 'PUT') {
        return (
          200,
          {
            'data': {
              'user': {
                'id': 'u1',
                'email': 'a@b.c',
                ...(o.data as Map).cast<String, Object?>(),
              },
            },
          },
        );
      }
      if (path == '/market/me/profile') {
        return (
          200,
          {
            'data': {'username': 'maryam', 'skills': <String>[]},
          },
        );
      }
      return (404, {'success': false, 'message': ''});
    });
    await _pump(tester, server, const ProfileScreen());

    await tester.enterText(_field(_strings.dashboard.phone), '۰۹۱۲۱۲۳۴۵۶۷');
    await tester.tap(find.text(_strings.common.save).first);
    await tester.pumpAndSettle();
    final put = server.requests.lastWhere((o) => o.method == 'PUT');
    expect(put.data, {
      'firstName': 'Maryam',
      'lastName': 'Ahmadi',
      'phone': '09121234567',
    });
    expect(find.text(_strings.dashboard.profileSaved), findsOneWidget);

    await tester.enterText(_field(_strings.market.websiteLabel), 'nope');
    await tester.tap(find.text(_strings.common.save).last);
    await tester.pumpAndSettle();
    expect(find.text(_strings.volunteer.errUrl), findsOneWidget);
    expect(server.requests.where((o) => o.method == 'PATCH'), isEmpty);

    // Fixed, the mistake stops being flagged as it is typed.
    await tester.enterText(
      _field(_strings.market.websiteLabel),
      'https://maryam.example',
    );
    await tester.pump();
    expect(find.text(_strings.volunteer.errUrl), findsNothing);
    await tester.tap(find.text(_strings.common.save).last);
    await tester.pumpAndSettle();
    final patch = server.requests.lastWhere((o) => o.method == 'PATCH');
    expect(patch.data, {
      'headline': '',
      'bio': '',
      'website': 'https://maryam.example',
    });
  });

  testWidgets('verification: sent, waiting, then turned down while open', (
    tester,
  ) async {
    var status = 'UNVERIFIED';
    FormData? sent;
    final server = FakeServer((o) async {
      if (o.path != '/market/me/verification') {
        return (404, {'success': false, 'message': ''});
      }
      if (o.method == 'POST') {
        sent = o.data as FormData;
        status = 'PENDING';
        return (201, {'data': <String, Object?>{}});
      }
      return (
        200,
        {
          'data': {
            'status': status,
            if (status == 'REJECTED') 'reviewNote': 'Unreadable card.',
          },
        },
      );
    });
    await _pump(
      tester,
      server,
      const VerificationScreen(),
      picker: () async => PickedFile(
        name: 'card.png',
        file: XFile.fromData(Uint8List.fromList([1, 2, 3]), name: 'card.png'),
        bytes: 3,
      ),
    );
    final m = _strings.market;

    // Without the required document, nothing is sent.
    await tester.enterText(_field(m.legalFirstName), 'Ali');
    await tester.enterText(_field(m.legalLastName), 'Rezaei');
    await tester.enterText(_field(m.nationalId), '0084575948');
    await tester.enterText(_field(m.phone), '+98 912 123 4567');
    await tester.tap(find.text(m.submitVerification).last);
    await tester.pumpAndSettle();
    expect(find.text(m.requiredDocumentsIndividual), findsNWidgets(2));
    expect(sent, isNull);

    await tester.tap(find.text(_strings.upload.choose));
    await tester.pumpAndSettle();
    await tester.tap(find.text(m.submitVerification).last);
    await tester.pumpAndSettle();

    final fields = {for (final f in sent!.fields) f.key: f.value};
    expect(jsonDecode(fields['payload']!), {
      'kind': 'INDIVIDUAL',
      'legalFirstName': 'Ali',
      'legalLastName': 'Rezaei',
      'nationalId': '0084575948',
      'phone': '09121234567',
    });
    expect(jsonDecode(fields['kinds']!), ['NATIONAL_ID_CARD']);
    expect(sent!.files.single.key, 'documents');
    // Waiting: the confirmation, and no form to send it again.
    expect(find.text(m.verificationSubmitted), findsOneWidget);
    expect(find.text(m.label('PENDING')), findsOneWidget);
    expect(_field(m.nationalId), findsNothing);

    // Turned down while the screen is open: the note, and the form again.
    status = 'REJECTED';
    // A quarter of the (tall) viewport, the pull a refresh needs.
    await tester.drag(find.byType(ListView), const Offset(0, 2000));
    await tester.pumpAndSettle();
    expect(find.text('Unreadable card.'), findsOneWidget);
    expect(find.text(m.verificationSubmitted), findsNothing);
    expect(_field(m.nationalId), findsOneWidget);
    // Fresh rows: the refused file is not offered again.
    expect(find.text('card.png'), findsNothing);
  });
}
