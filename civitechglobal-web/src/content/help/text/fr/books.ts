import type { HelpArticleText } from '../../types';

const books: Record<string, HelpArticleText> = {
  books: {
    title: 'Marché du livre',
    summary: 'Livres neufs et d’occasion de lecteurs et de libraires : tous les exemplaires d’un livre sur une page.',
    intro:
      'Dans le marché du livre, chaque livre a une page, et tous les exemplaires en vente y sont réunis, le moins cher en premier. Chaque exemplaire appartient à un vendeur ; vous voyez son état (de Neuf à Acceptable), ses photos, son prix, les frais de port et le mode de remise. L’achat commence par une demande d’achat ; aucun paiement ne passe par le site, acheteur et vendeur organisent paiement et remise directement.',
    steps: [
      ['Trouvez le livre', 'Recherchez ou parcourez les rayons ; filtrez par état, prix, livraison gratuite ou sous le prix éditeur.'],
      ['Choisissez un exemplaire', 'Sur la page du livre, comparez les exemplaires par état, photos, prix et mode de remise.'],
      ['Envoyez une demande d’achat', 'Choisissez le mode de remise et, si vous le souhaitez, proposez un prix ; vous devez être connecté et vérifié.'],
      ['Organisez la remise', 'Quand le vendeur accepte, convenez du paiement et de la remise dans l’échange de cette demande.'],
    ],
    points: [
      ['Un état noté', 'Chaque exemplaire a l’un de cinq niveaux — Neuf, Comme neuf, Très bon, Bon ou Acceptable — avec photos.'],
      ['Vendre des livres', 'Mettez votre exemplaire en vente depuis votre tableau de bord avec photos, état et prix ; il est vérifié avant publication.'],
      ['Avis réciproques', 'Après une vente, acheteur et vendeur se notent mutuellement.'],
    ],
    tips: [
      ['Proposer un prix', 'Si le prix d’un exemplaire est négociable, proposez le vôtre ; laissez vide pour accepter le prix du vendeur.'],
    ],
    faqs: [
      ['Est-ce que je paie le site ?', 'Non. Aucun paiement ne passe par le site ; une fois votre demande acceptée, vous organisez paiement et remise directement avec le vendeur.'],
      ['Pourquoi vérifier mon identité pour acheter ?', 'Pour que le vendeur sache qu’il a affaire à une vraie personne ; la même règle vaut pour les vendeurs.'],
      ['Comment vendre un livre ?', 'Dans Mes livres en vente de votre tableau de bord, mettez votre exemplaire en vente avec photos, état et prix, et envoyez-le pour vérification.'],
      ['Le vendeur a refusé ma demande.', 'Vous pouvez demander un autre exemplaire du même livre à un autre vendeur.'],
    ],
    related: {
      'my-books': 'Vendre des livres et suivre vos achats depuis le tableau de bord.',
      messages: 'Échanger avec l’acheteur ou le vendeur.',
      verification: 'Requise pour acheter et vendre.',
    },
  },
};

export default books;
