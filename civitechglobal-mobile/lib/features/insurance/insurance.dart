import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import 'insurance_rules.dart';

/// A product as the catalog lists it.
class InsuranceProduct {
  const InsuranceProduct({
    required this.slug,
    required this.title,
    required this.titleEn,
    required this.summary,
    required this.summaryEn,
    required this.callback,
    required this.corporate,
  });

  factory InsuranceProduct.fromJson(Map<String, Object?> j) => InsuranceProduct(
    slug: '${j['slug']}',
    title: '${j['title'] ?? ''}',
    titleEn: '${j['titleEn'] ?? j['title'] ?? ''}',
    summary: '${j['summary'] ?? ''}',
    summaryEn: '${j['summaryEn'] ?? j['summary'] ?? ''}',
    callback: j['intakeMode'] == 'CALLBACK',
    corporate: j['audience'] == 'CORPORATE',
  );

  final String slug;
  final String title;
  final String titleEn;
  final String summary;
  final String summaryEn;

  /// Priced by a specialist on a call (CALLBACK), rather than routed from
  /// the form alone (SELF_SERVE).
  final bool callback;
  final bool corporate;

  /// The catalog is written in Persian and English; every other language
  /// reads the English.
  String titleIn(String language) => language == 'fa' ? title : titleEn;
  String summaryIn(String language) => language == 'fa' ? summary : summaryEn;
}

class InsuranceCategory {
  const InsuranceCategory({
    required this.slug,
    required this.title,
    required this.titleEn,
    required this.emoji,
    required this.products,
  });

  factory InsuranceCategory.fromJson(Map<String, Object?> j) =>
      InsuranceCategory(
        slug: '${j['slug']}',
        title: '${j['title'] ?? ''}',
        titleEn: '${j['titleEn'] ?? j['title'] ?? ''}',
        emoji: j['emoji'] as String?,
        products: [
          for (final p in (j['products'] as List? ?? const []))
            if (p is Map<String, Object?>) InsuranceProduct.fromJson(p),
        ],
      );

  final String slug;
  final String title;
  final String titleEn;
  final String? emoji;
  final List<InsuranceProduct> products;

  String titleIn(String language) => language == 'fa' ? title : titleEn;
}

/// Everything about one product: what it covers and does not, how a claim
/// goes, and the questions its request asks.
class InsuranceProductDetail {
  const InsuranceProductDetail({
    required this.product,
    required this.description,
    required this.descriptionEn,
    required this.category,
    required this.coverages,
    required this.optionalCoverages,
    required this.exclusions,
    required this.claimSteps,
    required this.requiredDocuments,
    required this.premiumFactors,
    required this.notes,
    required this.faq,
    required this.keyFacts,
    required this.form,
  });

  factory InsuranceProductDetail.fromJson(Map<String, Object?> j) {
    List<String> list(String key) => [
      for (final v in (j[key] as List? ?? const [])) '$v',
    ];
    final category = j['category'] as Map<String, Object?>? ?? const {};
    return InsuranceProductDetail(
      product: InsuranceProduct.fromJson(j),
      description: '${j['description'] ?? ''}',
      descriptionEn: '${j['descriptionEn'] ?? j['description'] ?? ''}',
      category: InsuranceCategory.fromJson(category),
      coverages: list('coverages'),
      optionalCoverages: list('optionalCoverages'),
      exclusions: list('exclusions'),
      claimSteps: list('claimSteps'),
      requiredDocuments: list('requiredDocuments'),
      premiumFactors: list('premiumFactors'),
      notes: list('notes'),
      faq: [
        for (final f in (j['faq'] as List? ?? const []))
          if (f is Map)
            (question: '${f['question']}', answer: '${f['answer']}'),
      ],
      keyFacts: [
        for (final f in (j['keyFacts'] as List? ?? const []))
          if (f is Map) (label: '${f['label']}', value: '${f['value']}'),
      ],
      form: [
        for (final f in (j['formSchema'] as List? ?? const []))
          if (f is Map<String, Object?>) FieldDef.fromJson(f),
      ],
    );
  }

  final InsuranceProduct product;
  final String description;
  final String descriptionEn;
  final InsuranceCategory category;
  final List<String> coverages;
  final List<String> optionalCoverages;
  final List<String> exclusions;
  final List<String> claimSteps;
  final List<String> requiredDocuments;
  final List<String> premiumFactors;
  final List<String> notes;
  final List<({String question, String answer})> faq;
  final List<({String label, String value})> keyFacts;
  final List<FieldDef> form;

  String descriptionIn(String language) =>
      language == 'fa' ? description : descriptionEn;
}

/// `GET /insurance/catalog`: the categories and their products.
final insuranceCatalogProvider = FutureProvider<List<InsuranceCategory>>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/insurance/catalog',
        parse: (d) => [
          for (final c in (d as List? ?? const []))
            if (c is Map<String, Object?>) InsuranceCategory.fromJson(c),
        ],
      ),
);

/// `GET /insurance/products/:slug`.
final insuranceProductProvider =
    FutureProvider.family<InsuranceProductDetail, String>(
      (ref, slug) => ref
          .read(apiClientProvider)
          .get(
            '/insurance/products/${Uri.encodeComponent(slug)}',
            parse: (d) =>
                InsuranceProductDetail.fromJson(d! as Map<String, Object?>),
          ),
    );
