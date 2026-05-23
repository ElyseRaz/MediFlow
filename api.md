ROUTES :

Authentification: 
POST : /api/auth/loginConnexion Public
Body: email, mot_de_passe, role — Retourne: access_token (JWT 24h) + refresh_token (7j)
POST /api/auth/registerInscription Public
Body: nom, prenom, email, mot_de_passe, role, nom_pharmacie, ville — Crée compte + pharmacie
POST /api/auth/refreshRenouveler token Public
Body: refresh_token — Retourne nouveau access_token
POST /api/auth/logoutDéconnexion Auth
Révoque le refresh_token en base. Header: Authorization: Bearer {token}
POST /api/auth/forgot-passwordRéinitialisation Public
Body: email — Envoie email avec lien de reset valable 1h

Médicaments:
GET/api/medicamentsListe paginée Auth
Query: page, limit, search, categorie, statut_stock, fournisseur_id, actif — Retourne stock calculé depuis LOT
GET/api/medicaments/:idDétail + lots Auth
Retourne médicament + liste des lots actifs avec quantite_restante et date_expiration
POST/api/medicamentsCréer médicament Admin
Body: tous les champs MEDICAMENT. Valide que prix_vente ≥ prix_achat, stock_max ≥ stock_min
PUT/api/medicaments/:idModifier Admin
Body: champs modifiables. Met à jour updated_at. Log dans MOUVEMENT_STOCK si prix change
PATCH/api/medicaments/:id/actifActiver/désactiver Admin
Body: actif: boolean — Désactivation douce, ne supprime pas
GET/api/medicaments/alertesStock faible + expirants Auth
Retourne médicaments sous stock_minimum + lots expirant dans < 90 jours. Utilisé dashboard
GET/api/medicaments/searchRecherche rapide Auth
Query: q (min 2 chars) — Recherche sur nom_commercial, DCI, code_barre. Retourne top 10

Lots
GET/api/lotsListe des lots Auth
Query: medicament_id, statut, expiration_avant, expiration_apres, fournisseur_id
GET/api/lots/:idDétail lot Auth
Retourne lot + médicament associé + historique mouvements du lot
POST/api/lotsCréer lot Admin
Body: medicament_id, fournisseur_id, numero_lot, date_fabrication, date_expiration, quantite_initiale. Génère MOUVEMENT type ENTREE
PATCH/api/lots/:id/statutChanger statut Admin
Body: statut: actif | epuise | retire | expire — Log automatique alerte si retire
GET/api/lots/expirationExpirations proches Auth
Query: jours=90 — Lots expirant dans N jours. Trié par date_expiration ASC
GET/api/medicaments/:id/lotsLots d'un médicament Auth
Retourne tous les lots actifs d'un médicament, triés FIFO (date_expiration ASC) pour la vente

Ventes (POS)
GET/api/ventesHistorique ventes Auth
Query: page, limit, date_debut, date_fin, caissier_id, statut, mode_paiement
GET/api/ventes/:idDétail ticket Auth
Retourne vente + lignes_vente + lot par ligne + info caissier
POST/api/ventesEnregistrer vente Auth
Body: lignes:[{lot_id, quantite}], mode_paiement, remise — Décremente lot.quantite_restante, génère MOUVEMENT SORTIE, vérifie stock
PATCH/api/ventes/:id/statutRembourser / annuler Admin
Body: statut: rembourse | annule, motif — Réincrémente lot.quantite_restante si annulé
GET/api/ventes/:id/recuGénérer reçu PDF Auth
Retourne PDF binaire (Content-Type: application/pdf). Inclut: ticket N°, lignes, total, caissier, date
GET/api/ventes/stats/jourStats du jour Auth
Retourne: nb_ventes, ca_total, panier_moyen, top_medicaments[5] pour le dashboard
POST/api/ventes/simulationVérifier disponibilité Auth
Body: lignes:[{medicament_id, quantite}] — Vérifie stock sans valider. Retourne lot_id proposé (FIFO)

Commandes fournisseurs:
GET/api/commandesListe commandes Auth
Query: statut, fournisseur_id, date_debut, date_fin. Statuts: brouillon | confirmee | en_transit | livree | annulee
GET/api/commandes/:idDétail commande Auth
Retourne commande + lignes_commande + fournisseur + créateur
POST/api/commandesCréer commande Admin
Body: fournisseur_id, lignes:[{medicament_id, quantite_commandee, prix_unitaire}], date_livraison_prevue, notes
PUT/api/commandes/:idModifier (brouillon) Admin
Modifiable seulement si statut = brouillon. Body: mêmes champs que POST
PATCH/api/commandes/:id/statutAvancer statut Admin
Body: statut. Transition livree déclenche création automatique des LOT et MOUVEMENT ENTREE
POST/api/commandes/:id/receptionRéceptionner livraison Admin
Body: lignes:[{ligne_commande_id, quantite_recue, numero_lot, date_expiration, date_fabrication}] — Crée LOT par ligne
GET/api/commandes/suggestionsSuggestions réappro Admin
Retourne médicaments sous stock_minimum avec quantité suggérée = stock_maximum - quantite_restante

Fournisseurs:
GET/api/fournisseurs Liste Auth
Query: actif, pays, search. Inclut stats: nb_commandes, ca_total, note_evaluation
GET/api/fournisseurs/:id Détail Auth
Retourne fournisseur + historique commandes + médicaments fournis (via LOT)
POST/api/fournisseurs Créer Admin
Body: nom, contact, email, telephone, adresse, ville, pays
PUT/api/fournisseurs/:id Modifier Admin
Body: tous les champs. note_evaluation calculée auto, non modifiable manuellement
PATCH/api/fournisseurs/:id/actif Activer/désactiver Admin
Body: actif: boolean. Bloque la création de nouvelles commandes si désactivé

Utilisateurs:
GET/api/utilisateurs  Liste Admin
Query: role, actif. Retourne sans mot_de_passe_hash

GET/api/utilisateurs/me Profil courant Auth
Retourne profil de l'utilisateur connecté via JWT. Utilisé par le composant navbar
GET/api/utilisateurs/:id Détail Admin
Retourne utilisateur + stats: nb_ventes, ca_genere, derniere_connexion
POST/api/utilisateurs Créer compte Admin
Body: nom, prenom, email, role, mot_de_passe_temp — Envoie email d'invitation
PUT/api/utilisateurs/:idModifier Admin
Body: nom, prenom, email, role. Ne permet pas de modifier mot_de_passe ici
PATCH/api/utilisateurs/me/passwordChanger mdp Auth
Body: ancien_mot_de_passe, nouveau_mot_de_passe. Valide complexité: min 8 chars, 1 majuscule, 1 chiffre
GET/api/alertesMes alertes Auth
Query: lue, type_alerte, limit. Types: stock_faible | expiration_proche | lot_expire | rupture
PATCH/api/alertes/:id/lueMarquer lue Auth
Met lue = true. Utilisé au clic sur une alerte dans la navbar
PATCH/api/alertes/tout-lireTout marquer lu Auth
Marque toutes les alertes non lues de l'utilisateur courant
POST/api/alertes/verifierDéclenchement manuel Admin
Lance le scan complet: lots expirants + stocks sous seuil → crée alertes manquantes. Normalement automatique (cron)

Rapports & Dashboard: 
GET/api/dashboard/kpisKPIs accueil Auth
Retourne: nb_medicaments, ca_jour, nb_fournisseurs, nb_alertes, stock_faible_count — 1 appel pour les 5 cards
GET/api/dashboard/ventes-mensuellesHistogramme Auth
Query: annee. Retourne tableau 12 mois: [{mois, ca, nb_ventes}]
GET/api/dashboard/revenu-categoriesDonut revenus Auth
Query: mois, annee. Retourne: [{categorie, montant, pourcentage}]
GET/api/rapports/stockRapport stock Auth
Query: format=json|pdf. Retourne valeur stock, rotation, top 20 médicaments par valeur
GET/api/rapports/ventesRapport ventes Auth
Query: date_debut, date_fin, format. CA, marge brute, top médicaments, répartition paiement
GET/api/rapports/fournisseursRapport fournisseurs Admin
Query: date_debut, date_fin, format. CA par fournisseur, délais livraison, note performance
GET/api/rapports/lots-expirationRapport péremptions Auth
Query: jours=90, format. Liste lots + valeur exposée au risque de perte
GET/api/rapports/mouvementsJournal stock Admin
Query: lot_id, medicament_id, type, date_debut, date_fin. Trace complète entrées/sorties
GET/api/rapports/export/csvExport CSV Admin
Query: type=ventes|stock|commandes. Retourne fichier CSV (Content-Type: text/csv)
GET/api/rapports/export/pdfExport PDF Admin
Query: type, date_debut, date_fin. Retourne PDF signé avec en-tête pharmacie
GET/api/rapports/inventaireInventaire complet Admin
Snapshot complet: tous médicaments + tous lots actifs + stock + valeur. Base de l'inventaire physique




