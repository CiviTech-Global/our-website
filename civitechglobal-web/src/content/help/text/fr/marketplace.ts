import type { HelpArticleText } from '../../types';

const marketplace: Record<string, HelpArticleText> = {
  marketplace: {
    title: 'Marché local',
    summary: 'Trouvez sur la carte les boutiques, produits et services près de chez vous, et contactez directement la boutique.',
    intro:
      'Le marché local montre sur une carte les boutiques et commerces autour de vous : leurs produits, services, photos et moyens de contact. Pour l’instant, c’est une vitrine et non une boutique en ligne ; achat, réservation et arrangements se font directement avec la boutique.',
    steps: [
      ['Fixez votre point', 'Autorisez l’accès à votre position ou cliquez sur la carte pour centrer la recherche sur ce point.'],
      ['Recherchez', 'Cherchez un nom de boutique, un métier, ou le produit ou service voulu ; réglez le rayon de recherche et choisissez « Le plus proche » pour trier.'],
      ['Ouvrez une boutique ou un produit', 'Voyez la présentation, les photos, les produits et services, et l’emplacement sur la carte.'],
      ['Prenez contact', 'Pour acheter ou réserver, utilisez les coordonnées de cette boutique.'],
    ],
    tips: [
      ['Position indisponible ?', 'Les navigateurs ne partagent la position que sur une connexion sécurisée, et vous ne l’avez peut-être pas autorisé ; choisissez alors un point sur la carte.'],
    ],
    faqs: [
      ['Puis-je acheter et payer ici ?', 'Pas encore. Le panier et le paiement en ligne ne sont pas activés ; contactez la boutique.'],
      ['Les boutiques sont-elles vérifiées ?', 'Oui. Chaque propriétaire a vérifié son identité et chaque boutique est vérifiée avant d’apparaître.'],
      ['Ma boutique n’est pas ici.', 'Ajoutez-la en quatre étapes depuis la page Inscrire votre boutique.'],
    ],
    related: {
      'marketplace-join': 'Inscrire votre propre boutique.',
      'my-shops': 'Pour les vendeurs : gérer votre boutique et vos produits.',
    },
  },

  'marketplace-join': {
    title: 'Inscrire votre boutique',
    summary: 'Inscrivez votre boutique en quatre étapes pour que les clients proches la trouvent sur la carte.',
    intro:
      'Tout commerce qui propose des produits ou des services à une clientèle proche peut inscrire sa boutique. Une boutique étant une identité commerciale et les acheteurs devant savoir qui est derrière, la vérification d’identité est requise et la boutique est vérifiée avant d’apparaître. Une fois approuvée, vous publiez et modifiez vous-même vos produits et services.',
    steps: [
      ['Créez un compte', 'Inscrivez-vous ou connectez-vous.'],
      ['Vérifiez votre identité', 'Confirmez votre identité dans votre tableau de bord.'],
      ['Créez la boutique', 'Saisissez le nom, la présentation, le métier, le logo, une photo, les coordonnées et l’emplacement, puis envoyez pour vérification.'],
      ['Ajoutez produits et services', 'Une fois la boutique approuvée, publiez, modifiez et retirez vos produits et services.'],
    ],
    tips: [
      ['Placez-vous sur la carte', 'Sans emplacement, votre boutique n’apparaît pas dans les recherches « près de moi ».'],
    ],
    faqs: [
      ['Combien de temps prend la vérification ?', 'Cela dépend de la file d’attente. Si le vérificateur demande des modifications, vous en êtes informé dans votre tableau de bord et renvoyez après correction.'],
      ['Les produits sont-ils vérifiés aussi ?', 'Une fois la boutique approuvée, les produits sont publiés aussitôt, mais l’équipe peut renvoyer tout produit pour correction.'],
    ],
    related: {
      marketplace: 'Le marché vu par un acheteur.',
      'my-shops': 'Gérer votre boutique une fois inscrite.',
      verification: 'Deuxième étape : la vérification d’identité.',
    },
  },
};

export default marketplace;
