-- CreateEnum
CREATE TYPE "role_utilisateur" AS ENUM ('admin', 'caissier');

-- CreateEnum
CREATE TYPE "statut_medicament" AS ENUM ('actif', 'inactif', 'discontinue');

-- CreateEnum
CREATE TYPE "statut_lot" AS ENUM ('disponible', 'epuise', 'expire', 'retire');

-- CreateEnum
CREATE TYPE "mode_paiement" AS ENUM ('especes', 'carte_bancaire', 'mobile money', 'virement');

-- CreateEnum
CREATE TYPE "statut_vente" AS ENUM ('complete', 'annulee', 'remboursee');

-- CreateEnum
CREATE TYPE "statut_commande" AS ENUM ('brouillon', 'envoyee', 'recue_partielle', 'recue_complete', 'annulee');

-- CreateEnum
CREATE TYPE "type_mouvement" AS ENUM ('entree', 'sortie', 'ajustement', 'retour', 'perte');

-- CreateTable
CREATE TABLE "pharmacie" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(200) NOT NULL,
    "adresse" TEXT,
    "telephone" VARCHAR(20),
    "email" VARCHAR(255),
    "licence" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pharmacie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pharmacie_id" UUID NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "mot_de_passe_hash" VARCHAR(255) NOT NULL,
    "role" "role_utilisateur" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dernier_connexion" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorie" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fournisseur" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(200) NOT NULL,
    "contact" VARCHAR(100),
    "telephone" VARCHAR(20),
    "email" VARCHAR(255),
    "adresse" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicament" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categorie_id" UUID,
    "fournisseur_id" UUID,
    "denomination" VARCHAR(300) NOT NULL,
    "dci" VARCHAR(200),
    "forme" VARCHAR(50),
    "dosage" VARCHAR(50),
    "conditionnement" VARCHAR(100),
    "code_barres" VARCHAR(50),
    "prix_achat" DECIMAL(10,2) NOT NULL,
    "prix_vente" DECIMAL(10,2) NOT NULL,
    "stock_minimum" INTEGER NOT NULL DEFAULT 0,
    "stock_actuel" INTEGER NOT NULL DEFAULT 0,
    "prescription_requise" BOOLEAN NOT NULL DEFAULT false,
    "statut" "statut_medicament" NOT NULL DEFAULT 'actif',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "medicament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medicament_id" UUID NOT NULL,
    "numero_lot" VARCHAR(100) NOT NULL,
    "date_expiration" DATE NOT NULL,
    "quantite" INTEGER NOT NULL,
    "quantite_initiale" INTEGER NOT NULL,
    "statut" "statut_lot" NOT NULL DEFAULT 'disponible',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pharmacie_id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "numero_vente" VARCHAR(50) NOT NULL,
    "mode_paiement" "mode_paiement" NOT NULL,
    "montant_total" DECIMAL(12,2) NOT NULL,
    "montant_paye" DECIMAL(12,2) NOT NULL,
    "monnaie" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "statut" "statut_vente" NOT NULL DEFAULT 'complete',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ligne_vente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vente_id" UUID NOT NULL,
    "medicament_id" UUID NOT NULL,
    "lot_id" UUID,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" DECIMAL(10,2) NOT NULL,
    "taux_remise" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "montant_remise" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sous_total" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ligne_vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande_fournisseur" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pharmacie_id" UUID NOT NULL,
    "fournisseur_id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "numero_commande" VARCHAR(50) NOT NULL,
    "date_commande" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_livraison_prevue" DATE,
    "statut" "statut_commande" NOT NULL DEFAULT 'brouillon',
    "montant_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "commande_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ligne_commande" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commande_id" UUID NOT NULL,
    "medicament_id" UUID NOT NULL,
    "quantite_commandee" INTEGER NOT NULL,
    "quantite_recue" INTEGER NOT NULL DEFAULT 0,
    "prix_unitaire" DECIMAL(10,2) NOT NULL,
    "sous_total" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ligne_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_stock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pharmacie_id" UUID NOT NULL,
    "medicament_id" UUID NOT NULL,
    "utilisateur_id" UUID,
    "type_mouvement" "type_mouvement" NOT NULL,
    "quantite" INTEGER NOT NULL,
    "stock_avant" INTEGER NOT NULL,
    "stock_apres" INTEGER NOT NULL,
    "reference_id" UUID,
    "reference_type" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "utilisateur_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categorie_nom_key" ON "categorie"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "medicament_code_barres_key" ON "medicament"("code_barres");

-- CreateIndex
CREATE UNIQUE INDEX "vente_numero_vente_key" ON "vente"("numero_vente");

-- CreateIndex
CREATE UNIQUE INDEX "commande_fournisseur_numero_commande_key" ON "commande_fournisseur"("numero_commande");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_token_key" ON "session_token"("token");

-- AddForeignKey
ALTER TABLE "utilisateur" ADD CONSTRAINT "utilisateur_pharmacie_id_fkey" FOREIGN KEY ("pharmacie_id") REFERENCES "pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicament" ADD CONSTRAINT "medicament_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categorie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicament" ADD CONSTRAINT "medicament_fournisseur_id_fkey" FOREIGN KEY ("fournisseur_id") REFERENCES "fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_medicament_id_fkey" FOREIGN KEY ("medicament_id") REFERENCES "medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vente" ADD CONSTRAINT "vente_pharmacie_id_fkey" FOREIGN KEY ("pharmacie_id") REFERENCES "pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vente" ADD CONSTRAINT "vente_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_vente" ADD CONSTRAINT "ligne_vente_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "vente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_vente" ADD CONSTRAINT "ligne_vente_medicament_id_fkey" FOREIGN KEY ("medicament_id") REFERENCES "medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_vente" ADD CONSTRAINT "ligne_vente_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_fournisseur" ADD CONSTRAINT "commande_fournisseur_pharmacie_id_fkey" FOREIGN KEY ("pharmacie_id") REFERENCES "pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_fournisseur" ADD CONSTRAINT "commande_fournisseur_fournisseur_id_fkey" FOREIGN KEY ("fournisseur_id") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_fournisseur" ADD CONSTRAINT "commande_fournisseur_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_commande" ADD CONSTRAINT "ligne_commande_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commande_fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_commande" ADD CONSTRAINT "ligne_commande_medicament_id_fkey" FOREIGN KEY ("medicament_id") REFERENCES "medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_stock" ADD CONSTRAINT "historique_stock_pharmacie_id_fkey" FOREIGN KEY ("pharmacie_id") REFERENCES "pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_stock" ADD CONSTRAINT "historique_stock_medicament_id_fkey" FOREIGN KEY ("medicament_id") REFERENCES "medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_stock" ADD CONSTRAINT "historique_stock_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_token" ADD CONSTRAINT "session_token_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
