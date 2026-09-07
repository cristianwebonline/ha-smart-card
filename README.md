# Smart Card

Una card componibile a canvas per Home Assistant: invece di riempire un form fisso, disegni la card trascinando forme singole — un piccolo editor grafico dentro Home Assistant.

## Cosa si può fare

- **Trascinare forme** sulla tela: rettangolo, cerchio, divisore, testo, icona, valore di un sensore, misuratore (arco), badge azione (icona che accende/spegne una presa o una luce al tocco).
- **Spostare e ridimensionare** ogni forma toccandola e trascinandola, o dalle maniglie d'angolo.
- **Livelli**: ogni forma è riordinabile, si può nascondere o eliminare, in un pannello dedicato.
- **Colori separati per tema chiaro e scuro**, con anteprima live di entrambi mentre disegni.
- Una volta salvata, la card si scala da sola a qualunque colonna la contenga, mantenendo le proporzioni disegnate.

## Cosa si configura

Ogni forma ha una posizione/dimensione sulla tela e, a seconda del tipo: testo e allineamento (Testo), l'icona (Icona), il sensore e le sue cifre decimali/unità (Valore sensore), il sensore e i limiti minimo/massimo (Misuratore), l'entità e le due icone acceso/spento (Badge azione). Tutte le forme hanno un colore per il tema chiaro e uno per lo scuro.

## Installazione (HACS)

1. HACS → Repository personalizzati → aggiungi `cristianwebonline/ha-smart-card` come "Lovelace".
2. Installa "Smart Card" e aggiungi la risorsa dashboard.
3. Aggiungi una card di tipo `custom:smart-card` a qualunque vista, oppure trascinala dalla libreria di [Faber Layout](https://github.com/cristianwebonline/ha-studio-card).

## Sicurezza

Il badge azione può accendere/spegnere prese e luci al tocco — usa questa card solo da un account con accesso alle entità che vuoi controllare.
