import 'package:civitech_global_flutter/features/jobs/companies.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('a province travels only where it can be, in Iran', () {
    expect(const CompanyQuery(province: 'تهران').toParams(), {
      'province': 'تهران',
    });
    // Left from before the country changed: it would only match nothing.
    expect(const CompanyQuery(country: 'DE', province: 'تهران').toParams(), {
      'country': 'DE',
    });
    expect(
      const CompanyQuery(search: '  co ', industry: 'TELECOM').toParams(),
      {'search': 'co', 'industry': 'TELECOM'},
    );
  });

  test("a company's roles carry the company, so their cards link back", () {
    final company = Company.fromJson({
      'slug': 'acme',
      'name': 'Acme',
      'logoUrl': '/logo',
      'jobs': [
        {
          'id': 'j1',
          'code': 'J1',
          'title': 'Engineer',
          'employmentType': 'FULL_TIME',
          'workArrangement': 'ONSITE',
          'salaryUndisclosed': true,
        },
      ],
    });
    final job = company.jobs.single;
    expect(job.company, 'Acme');
    expect(job.companySlug, 'acme');
    expect(job.companyLogo, '/logo');
  });

  test('every industry the server knows is listed once', () {
    expect(companyIndustries.toSet(), hasLength(companyIndustries.length));
    expect(companyIndustries, hasLength(40));
  });
}
