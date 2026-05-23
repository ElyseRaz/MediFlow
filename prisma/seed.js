// seed.js — données de test MediFlow
// node prisma/seed.js

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PHARMACIE_ID   = "5f8acb4c-0443-422e-b1c1-94f7ce81b2eb";
const UTILISATEUR_ID = "f406b62e-f260-4e29-8455-f57c5dad9967";

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── 1. Catégories ───────────────────────────────────────────────────────────
    const categoriesData = [
      { nom: "Antibiotiques",          description: "Médicaments anti-infectieux" },
      { nom: "Antipaludéens",          description: "Traitement et prévention du paludisme" },
      { nom: "Antalgiques",            description: "Analgésiques et anti-inflammatoires" },
      { nom: "Vitamines & Minéraux",   description: "Compléments nutritionnels et vitamines" },
      { nom: "Antihypertenseurs",      description: "Traitement de l'hypertension artérielle" },
    ];

    const catIds = {};
    for (const c of categoriesData) {
      const res = await client.query(
        `INSERT INTO categorie (nom, description)
         VALUES ($1, $2)
         ON CONFLICT (nom) DO UPDATE SET description = EXCLUDED.description
         RETURNING id`,
        [c.nom, c.description]
      );
      catIds[c.nom] = res.rows[0].id;
    }
    console.log("✓ Catégories insérées :", Object.keys(catIds).length);

    // ── 2. Fournisseurs ─────────────────────────────────────────────────────────
    const fournisseursData = [
      { nom: "SOPHARMA Madagascar",  contact: "Jean Rakoto",    telephone: "+261 20 22 345 67", email: "contact@sopharma.mg" },
      { nom: "PCM – Pharmacie Centrale", contact: "Marie Rabe", telephone: "+261 20 22 111 22", email: "pcm@pharmacie.mg" },
      { nom: "BIOMAD Import",        contact: "Paul Razafy",   telephone: "+261 34 56 789 01", email: "import@biomad.mg" },
    ];

    const fouIds = {};
    for (const f of fournisseursData) {
      const res = await client.query(
        `INSERT INTO fournisseur (nom, contact, telephone, email, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [f.nom, f.contact, f.telephone, f.email]
      );
      fouIds[f.nom] = res.rows[0].id;
    }
    console.log("✓ Fournisseurs insérés :", Object.keys(fouIds).length);

    const sopharma = fouIds["SOPHARMA Madagascar"];
    const pcm      = fouIds["PCM – Pharmacie Centrale"];
    const biomad   = fouIds["BIOMAD Import"];

    const AB = catIds["Antibiotiques"];
    const AP = catIds["Antipaludéens"];
    const AN = catIds["Antalgiques"];
    const VI = catIds["Vitamines & Minéraux"];
    const AH = catIds["Antihypertenseurs"];

    // ── 3. Médicaments (20) ─────────────────────────────────────────────────────
    const meds = [
      // Antibiotiques
      { denomination: "Amoxicilline 500mg gélules",            dci: "Amoxicilline",              forme: "Gélule",     dosage: "500 mg",   conditionnement: "Boîte 16 gél.",   prixAchat: 3200,  prixVente: 5500,  stockMinimum: 30, stockActuel: 85,  catId: AB, fouId: sopharma, prescription: true  },
      { denomination: "Amoxicilline/Acide clav. 500/125mg",    dci: "Amoxicilline + Clav.",       forme: "Comprimé",   dosage: "500/125mg", conditionnement: "Boîte 14 cpr.",   prixAchat: 6500,  prixVente: 10200, stockMinimum: 20, stockActuel: 42,  catId: AB, fouId: pcm,      prescription: true  },
      { denomination: "Ciprofloxacine 500mg comprimés",        dci: "Ciprofloxacine",            forme: "Comprimé",   dosage: "500 mg",   conditionnement: "Boîte 10 cpr.",   prixAchat: 4800,  prixVente: 7800,  stockMinimum: 20, stockActuel: 28,  catId: AB, fouId: biomad,   prescription: true  },
      { denomination: "Cotrimoxazole 480mg comprimés",         dci: "Sulfaméthoxazole + TMP",    forme: "Comprimé",   dosage: "480 mg",   conditionnement: "Boîte 100 cpr.",  prixAchat: 1200,  prixVente: 2100,  stockMinimum: 50, stockActuel: 7,   catId: AB, fouId: sopharma, prescription: false },
      { denomination: "Cotrimoxazole sirop 240mg/5ml",         dci: "Sulfaméthoxazole + TMP",    forme: "Sirop",      dosage: "240mg/5ml", conditionnement: "Flacon 100ml",    prixAchat: 2800,  prixVente: 4500,  stockMinimum: 20, stockActuel: 15,  catId: AB, fouId: sopharma, prescription: false },

      // Antipaludéens
      { denomination: "Artéméther-Luméfantrine 20/120mg",      dci: "Artéméther + Luméfantrine", forme: "Comprimé",   dosage: "20/120 mg", conditionnement: "Boîte 24 cpr.",   prixAchat: 8500,  prixVente: 14000, stockMinimum: 25, stockActuel: 60,  catId: AP, fouId: pcm,      prescription: false },
      { denomination: "Quinine sulfate 500mg comprimés",       dci: "Quinine",                   forme: "Comprimé",   dosage: "500 mg",   conditionnement: "Boîte 20 cpr.",   prixAchat: 3600,  prixVente: 5800,  stockMinimum: 20, stockActuel: 35,  catId: AP, fouId: biomad,   prescription: false },
      { denomination: "Chloroquine 250mg comprimés",           dci: "Chloroquine",               forme: "Comprimé",   dosage: "250 mg",   conditionnement: "Boîte 100 cpr.",  prixAchat: 1500,  prixVente: 2800,  stockMinimum: 15, stockActuel: 0,   catId: AP, fouId: pcm,      prescription: false },

      // Antalgiques
      { denomination: "Paracétamol 500mg comprimés",           dci: "Paracétamol",               forme: "Comprimé",   dosage: "500 mg",   conditionnement: "Boîte 16 cpr.",   prixAchat: 800,   prixVente: 1500,  stockMinimum: 100,stockActuel: 220, catId: AN, fouId: sopharma, prescription: false },
      { denomination: "Ibuprofène 400mg comprimés",            dci: "Ibuprofène",                forme: "Comprimé",   dosage: "400 mg",   conditionnement: "Boîte 20 cpr.",   prixAchat: 2200,  prixVente: 3800,  stockMinimum: 40, stockActuel: 68,  catId: AN, fouId: biomad,   prescription: false },
      { denomination: "Diclofénac 75mg injectable",            dci: "Diclofénac sodique",        forme: "Injectable", dosage: "75 mg",    conditionnement: "Boîte 5 amp.",     prixAchat: 3500,  prixVente: 5900,  stockMinimum: 10, stockActuel: 8,   catId: AN, fouId: pcm,      prescription: true  },
      { denomination: "Oméprazole 20mg gélules",               dci: "Oméprazole",                forme: "Gélule",     dosage: "20 mg",    conditionnement: "Boîte 28 gél.",   prixAchat: 4200,  prixVente: 6800,  stockMinimum: 30, stockActuel: 55,  catId: AN, fouId: sopharma, prescription: false },
      { denomination: "Tramadol 50mg gélules",                 dci: "Tramadol",                  forme: "Gélule",     dosage: "50 mg",    conditionnement: "Boîte 20 gél.",   prixAchat: 5800,  prixVente: 9200,  stockMinimum: 10, stockActuel: 18,  catId: AN, fouId: biomad,   prescription: true  },

      // Vitamines
      { denomination: "Vitamine C 500mg comprimés",            dci: "Acide ascorbique",          forme: "Comprimé",   dosage: "500 mg",   conditionnement: "Boîte 30 cpr.",   prixAchat: 1800,  prixVente: 3200,  stockMinimum: 40, stockActuel: 95,  catId: VI, fouId: sopharma, prescription: false },
      { denomination: "Sulfate ferreux 200mg + Acide folique",  dci: "Fer sulfate",               forme: "Comprimé",   dosage: "200 mg",   conditionnement: "Boîte 100 cpr.",  prixAchat: 1400,  prixVente: 2600,  stockMinimum: 30, stockActuel: 74,  catId: VI, fouId: pcm,      prescription: false },
      { denomination: "Vitamine B complexe comprimés",         dci: "Vitamines B1 B6 B12",       forme: "Comprimé",   dosage: "Complexe", conditionnement: "Boîte 30 cpr.",   prixAchat: 2600,  prixVente: 4400,  stockMinimum: 20, stockActuel: 42,  catId: VI, fouId: biomad,   prescription: false },
      { denomination: "Zinc sulfate 20mg sachets",             dci: "Zinc sulfate",              forme: "Sachet",     dosage: "20 mg",    conditionnement: "Boîte 30 sach.",   prixAchat: 1600,  prixVente: 2900,  stockMinimum: 20, stockActuel: 11,  catId: VI, fouId: sopharma, prescription: false },

      // Antihypertenseurs
      { denomination: "Amlodipine 10mg comprimés",             dci: "Amlodipine",                forme: "Comprimé",   dosage: "10 mg",    conditionnement: "Boîte 30 cpr.",   prixAchat: 5500,  prixVente: 8800,  stockMinimum: 20, stockActuel: 50,  catId: AH, fouId: pcm,      prescription: true  },
      { denomination: "Énalapril 10mg comprimés",              dci: "Énalapril maléate",         forme: "Comprimé",   dosage: "10 mg",    conditionnement: "Boîte 30 cpr.",   prixAchat: 4800,  prixVente: 7600,  stockMinimum: 20, stockActuel: 37,  catId: AH, fouId: biomad,   prescription: true  },
      { denomination: "Nifédipine LP 30mg comprimés",          dci: "Nifédipine",                forme: "Comprimé LP",dosage: "30 mg",    conditionnement: "Boîte 30 cpr.",   prixAchat: 6200,  prixVente: 9800,  stockMinimum: 15, stockActuel: 23,  catId: AH, fouId: sopharma, prescription: true  },
    ];

    const medIds = [];
    for (const m of meds) {
      const res = await client.query(
        `INSERT INTO medicament
          (categorie_id, fournisseur_id, denomination, dci, forme, dosage, conditionnement,
           prix_achat, prix_vente, stock_minimum, stock_actuel, prescription_requise, statut, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'actif',NOW())
         RETURNING id`,
        [m.catId, m.fouId, m.denomination, m.dci, m.forme, m.dosage, m.conditionnement,
         m.prixAchat, m.prixVente, m.stockMinimum, m.stockActuel, m.prescription]
      );
      medIds.push({ id: res.rows[0].id, ...m });
    }
    console.log("✓ Médicaments insérés :", medIds.length);

    // ── 4. Lots ─────────────────────────────────────────────────────────────────
    const today = new Date();
    function dateExp(daysFromNow) {
      const d = new Date(today);
      d.setDate(d.getDate() + daysFromNow);
      return d.toISOString().slice(0, 10);
    }

    // Lots : quelques-uns prochainement expirés pour les alertes
    const lotsData = [
      { medIndex: 0,  lot: "LOT-AMX-2501", exp: dateExp(180), qty: 85 },
      { medIndex: 1,  lot: "LOT-AUG-2502", exp: dateExp(210), qty: 42 },
      { medIndex: 2,  lot: "LOT-CIP-2503", exp: dateExp(90),  qty: 28 },
      { medIndex: 3,  lot: "LOT-CTX-2504", exp: dateExp(25),  qty: 7  },  // critique
      { medIndex: 4,  lot: "LOT-SYR-2505", exp: dateExp(45),  qty: 15 },  // proche
      { medIndex: 5,  lot: "LOT-ART-2506", exp: dateExp(270), qty: 60 },
      { medIndex: 6,  lot: "LOT-QUI-2507", exp: dateExp(180), qty: 35 },
      { medIndex: 7,  lot: "LOT-CHL-2508", exp: dateExp(-10), qty: 0  },  // expiré
      { medIndex: 8,  lot: "LOT-PCT-2509", exp: dateExp(365), qty: 220 },
      { medIndex: 9,  lot: "LOT-IBU-2510", exp: dateExp(240), qty: 68 },
      { medIndex: 10, lot: "LOT-DIC-2511", exp: dateExp(60),  qty: 8  },  // proche
      { medIndex: 11, lot: "LOT-OME-2512", exp: dateExp(300), qty: 55 },
      { medIndex: 12, lot: "LOT-TRM-2513", exp: dateExp(150), qty: 18 },
      { medIndex: 13, lot: "LOT-VTC-2514", exp: dateExp(540), qty: 95 },
      { medIndex: 14, lot: "LOT-FER-2515", exp: dateExp(365), qty: 74 },
      { medIndex: 15, lot: "LOT-VTB-2516", exp: dateExp(400), qty: 42 },
      { medIndex: 16, lot: "LOT-ZNC-2517", exp: dateExp(30),  qty: 11 },  // proche
      { medIndex: 17, lot: "LOT-AML-2518", exp: dateExp(180), qty: 50 },
      { medIndex: 18, lot: "LOT-ENA-2519", exp: dateExp(270), qty: 37 },
      { medIndex: 19, lot: "LOT-NIF-2520", exp: dateExp(200), qty: 23 },
    ];

    const lotIds = [];
    for (const l of lotsData) {
      const med = medIds[l.medIndex];
      const isExpired = l.qty === 0;
      const res = await client.query(
        `INSERT INTO lot (medicament_id, numero_lot, date_expiration, quantite, quantite_initiale, statut, updated_at)
         VALUES ($1, $2, $3, $4, $4, $5, NOW())
         RETURNING id`,
        [med.id, l.lot, l.exp, l.qty, isExpired ? "expire" : "disponible"]
      );
      lotIds.push({ id: res.rows[0].id, medId: med.id, ...l });
    }
    console.log("✓ Lots insérés :", lotIds.length);

    // ── 5. Ventes (12) ─────────────────────────────────────────────────────────
    function daysAgo(n) {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString();
    }

    const ventesConfig = [
      { daysAgo: 0,  mode: "especes",         lignes: [{ mi: 8, qi: 2 }, { mi: 13, qi: 1 }] },
      { daysAgo: 0,  mode: "mobile money",     lignes: [{ mi: 5, qi: 1 }, { mi: 9,  qi: 1 }] },
      { daysAgo: 1,  mode: "especes",          lignes: [{ mi: 0, qi: 1 }, { mi: 8,  qi: 3 }] },
      { daysAgo: 1,  mode: "carte_bancaire",   lignes: [{ mi: 17, qi:1 }, { mi: 11, qi: 1 }] },
      { daysAgo: 2,  mode: "especes",          lignes: [{ mi: 6, qi: 1 }, { mi: 8,  qi: 2 }] },
      { daysAgo: 3,  mode: "mobile money",     lignes: [{ mi: 9, qi: 2 }, { mi: 13, qi: 1 }] },
      { daysAgo: 5,  mode: "especes",          lignes: [{ mi: 1, qi: 1 }, { mi: 11, qi: 2 }] },
      { daysAgo: 7,  mode: "virement",         lignes: [{ mi: 17, qi:1 }, { mi: 18, qi: 1 }] },
      { daysAgo: 10, mode: "especes",          lignes: [{ mi: 8, qi: 5 }, { mi: 9,  qi: 2 }] },
      { daysAgo: 12, mode: "mobile money",     lignes: [{ mi: 5, qi: 2 }, { mi: 14, qi: 1 }] },
      { daysAgo: 15, mode: "especes",          lignes: [{ mi: 0, qi: 2 }, { mi: 2,  qi: 1 }] },
      { daysAgo: 20, mode: "carte_bancaire",   lignes: [{ mi: 19, qi:1 }, { mi: 17, qi: 1 }] },
    ];

    let venteCounter = 1;
    for (const v of ventesConfig) {
      // Calcul du montant total
      let montantTotal = 0;
      for (const l of v.lignes) {
        montantTotal += medIds[l.mi].prixVente * l.qi;
      }

      const numeroVente = `VNT-${String(venteCounter).padStart(4, "0")}`;
      venteCounter++;

      const createdAt = daysAgo(v.daysAgo);

      const venteRes = await client.query(
        `INSERT INTO vente
          (pharmacie_id, utilisateur_id, numero_vente, mode_paiement,
           montant_total, montant_paye, monnaie, statut, created_at, updated_at)
         VALUES ($1,$2,$3,$4::mode_paiement,$5,$5,0,'complete',$6,$6)
         RETURNING id`,
        [PHARMACIE_ID, UTILISATEUR_ID, numeroVente, v.mode, montantTotal, createdAt]
      );
      const venteId = venteRes.rows[0].id;

      for (const l of v.lignes) {
        const med = medIds[l.mi];
        const sousTotal = med.prixVente * l.qi;
        await client.query(
          `INSERT INTO ligne_vente
            (vente_id, medicament_id, quantite, prix_unitaire, taux_remise, montant_remise, sous_total)
           VALUES ($1,$2,$3,$4,0,0,$5)`,
          [venteId, med.id, l.qi, med.prixVente, sousTotal]
        );
      }
    }
    console.log("✓ Ventes insérées :", ventesConfig.length);

    // ── 6. Commandes fournisseurs (3) ───────────────────────────────────────────
    const commandesConfig = [
      {
        fournisseurId: sopharma,
        numero: "CMD-0001",
        statut: "recue_complete",
        daysAgo: 30,
        lignes: [
          { mi: 0,  qCmd: 100, qRec: 100, prix: medIds[0].prixAchat  },
          { mi: 8,  qCmd: 200, qRec: 200, prix: medIds[8].prixAchat  },
          { mi: 13, qCmd: 100, qRec: 100, prix: medIds[13].prixAchat },
        ],
      },
      {
        fournisseurId: pcm,
        numero: "CMD-0002",
        statut: "envoyee",
        daysAgo: 5,
        lignes: [
          { mi: 1,  qCmd: 50,  qRec: 0,  prix: medIds[1].prixAchat  },
          { mi: 5,  qCmd: 80,  qRec: 0,  prix: medIds[5].prixAchat  },
        ],
      },
      {
        fournisseurId: biomad,
        numero: "CMD-0003",
        statut: "brouillon",
        daysAgo: 1,
        lignes: [
          { mi: 3,  qCmd: 150, qRec: 0,  prix: medIds[3].prixAchat  },
          { mi: 7,  qCmd: 60,  qRec: 0,  prix: medIds[7].prixAchat  },
          { mi: 16, qCmd: 80,  qRec: 0,  prix: medIds[16].prixAchat },
        ],
      },
    ];

    for (const c of commandesConfig) {
      let montantTotal = c.lignes.reduce((s, l) => s + l.prix * l.qCmd, 0);
      const createdAt = daysAgo(c.daysAgo);

      const cmdRes = await client.query(
        `INSERT INTO commande_fournisseur
          (pharmacie_id, fournisseur_id, utilisateur_id, numero_commande,
           statut, montant_total, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5::statut_commande,$6,$7,$7)
         RETURNING id`,
        [PHARMACIE_ID, c.fournisseurId, UTILISATEUR_ID, c.numero, c.statut, montantTotal, createdAt]
      );
      const cmdId = cmdRes.rows[0].id;

      for (const l of c.lignes) {
        const sousTotal = l.prix * l.qCmd;
        await client.query(
          `INSERT INTO ligne_commande
            (commande_id, medicament_id, quantite_commandee, quantite_recue, prix_unitaire, sous_total)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [cmdId, medIds[l.mi].id, l.qCmd, l.qRec, l.prix, sousTotal]
        );
      }
    }
    console.log("✓ Commandes fournisseurs insérées :", commandesConfig.length);

    await client.query("COMMIT");
    console.log("\n✅ Seed terminé avec succès !");
    console.log("   • 5  catégories");
    console.log("   • 3  fournisseurs");
    console.log("   • 20 médicaments");
    console.log("   • 20 lots (dont 3 proches expiration, 1 expiré)");
    console.log("   • 12 ventes avec lignes");
    console.log("   • 3  commandes fournisseurs");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur :", err.message);
    console.error(err.detail || "");
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
