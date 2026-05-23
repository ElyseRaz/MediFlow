export type TicketData = {
  numeroVente: string;
  date: Date | string;
  caissier?: string;
  montantTotal: number;
  montantPaye: number;
  monnaie: number;
  modePaiement: string;
  lignes: {
    denomination: string;
    quantite: number;
    prixUnitaire: number;
    tauxRemise: number;
    sousTotal: number;
  }[];
};

const MODE_LABELS: Record<string, string> = {
  especes: "Espèces",
  carte_bancaire: "Carte bancaire",
  mobile_money: "Mobile Money",
  virement: "Virement",
};

// SVG logo inline (ne dépend pas du réseau dans la fenêtre d'impression)
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 160" width="210" height="65">
  <circle cx="80" cy="80" r="68" fill="#085041"/>
  <circle cx="80" cy="80" r="60" fill="#0F6E56"/>
  <rect x="58" y="52" width="44" height="56" rx="7" fill="#1D9E75"/>
  <rect x="52" y="58" width="56" height="44" rx="7" fill="#1D9E75"/>
  <rect x="58" y="52" width="44" height="10" rx="7" fill="#5DCAA5" opacity="0.3"/>
  <path d="M30 80 Q44 62 58 80 Q72 98 86 80 Q100 62 114 80 Q128 98 130 80"
        fill="none" stroke="#E1F5EE" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="30" cy="80" r="5" fill="#5DCAA5"/>
  <circle cx="130" cy="80" r="5" fill="#5DCAA5"/>
  <text x="162" y="95" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif"
        font-size="58" font-weight="700" fill="#085041" letter-spacing="-1.5">Medi</text>
  <text x="284" y="95" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif"
        font-size="58" font-weight="300" fill="#1D9E75" letter-spacing="-1.5">Flow</text>
  <line x1="162" y1="106" x2="510" y2="106" stroke="#9FE1CB" stroke-width="0.8"/>
  <text x="162" y="126" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif"
        font-size="12" font-weight="400" fill="#0F6E56" letter-spacing="2.8">GESTION DE STOCK PHARMACEUTIQUE</text>
</svg>`;

export function openTicket(data: TicketData) {
  const lignesHtml = data.lignes
    .map(
      (l) => `
    <div class="item">
      <div class="item-name">${l.denomination}</div>
      <div class="item-row">
        <span>${l.quantite} &times; ${Math.round(l.prixUnitaire).toLocaleString("fr-FR")} Ar${
        l.tauxRemise > 0 ? ` (&minus;${l.tauxRemise}%)` : ""
      }</span>
        <span class="bold">${Math.round(l.sousTotal).toLocaleString("fr-FR")} Ar</span>
      </div>
    </div>`
    )
    .join("");

  const dateStr = new Date(data.date).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Ticket &mdash; ${data.numeroVente}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',Courier,monospace;font-size:12px;width:320px;margin:0 auto;padding:16px 10px;color:#111;background:#fff}
    .logo{text-align:center;margin-bottom:4px}
    .pharmacie{text-align:center;font-size:11px;color:#555;margin-bottom:2px}
    .bold{font-weight:bold}
    .dashed{border-top:1px dashed #888;margin:8px 0}
    .solid{border-top:2px solid #111;margin:8px 0}
    .row{display:flex;justify-content:space-between;align-items:baseline;margin:4px 0;font-size:11px}
    .item{margin:5px 0}
    .item-name{font-weight:bold;font-size:12px;word-break:break-word}
    .item-row{display:flex;justify-content:space-between;font-size:11px;color:#444;margin-top:2px}
    .total-row{display:flex;justify-content:space-between;font-size:15px;font-weight:bold;margin:6px 0}
    .footer{font-size:11px;color:#555;text-align:center;line-height:1.6}
    .print-btn{display:block;margin:20px auto 0;padding:10px 36px;background:#0F6E56;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;font-family:sans-serif;letter-spacing:.3px}
    .print-btn:hover{background:#0a5a45}
    @media print{.print-btn{display:none}body{width:100%;padding:0}}
  </style>
</head>
<body>
  <div class="logo">${LOGO_SVG}</div>
  <div class="pharmacie">Pharmacie Grace &mdash; Madagascar</div>
  <div class="dashed"></div>
  <div class="row"><span>N&deg; vente</span><span class="bold">${data.numeroVente}</span></div>
  <div class="row"><span>Date</span><span>${dateStr}</span></div>
  ${data.caissier ? `<div class="row"><span>Caissier</span><span>${data.caissier}</span></div>` : ""}
  <div class="dashed"></div>
  ${lignesHtml}
  <div class="solid"></div>
  <div class="total-row"><span>TOTAL</span><span>${Math.round(data.montantTotal).toLocaleString("fr-FR")} Ar</span></div>
  <div class="dashed"></div>
  <div class="row"><span>Mode paiement</span><span>${MODE_LABELS[data.modePaiement] ?? data.modePaiement}</span></div>
  <div class="row"><span>Montant re&ccedil;u</span><span>${Math.round(data.montantPaye).toLocaleString("fr-FR")} Ar</span></div>
  <div class="row bold"><span>Monnaie rendue</span><span>${Math.round(data.monnaie).toLocaleString("fr-FR")} Ar</span></div>
  <div class="dashed"></div>
  <div class="footer">
    <div>Merci de votre confiance !</div>
    <div>Bonne sant&eacute; !</div>
  </div>
  <button class="print-btn" onclick="window.print()">Imprimer</button>
</body>
</html>`;

  const win = window.open("", "_blank", "width=400,height=700,scrollbars=yes");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
