# Smart Card

Una card componibile a canvas per Home Assistant: invece di riempire un form fisso, disegni la card trascinando forme singole — un piccolo editor grafico dentro Home Assistant.

## Cosa si può fare

- **Trascinare forme** sulla tela: rettangolo, cerchio, divisore, testo, icona, valore di un sensore, misuratore (arco), badge azione (icona che accende/spegne una presa o una luce al tocco).
- **Spostare e ridimensionare** ogni forma toccandola e trascinandola, o dalle maniglie d'angolo — oppure scrivendo X/Y/larghezza/altezza a numeri, per allineare due forme con precisione.
- **Livelli**: ogni forma è riordinabile, duplicabile, bloccabile (non si sposta più per sbaglio), nascondibile o eliminabile, in un pannello dedicato.
- **Aspetto della tela**: proporzioni, raggio degli angoli, sfondo e bordo — separati per tema chiaro e scuro.
- **Colori** con tavolozza pronta della famiglia, selettore di sistema e campo hex scrivibile a mano.
- **Zoom** sull'anteprima, per piazzare una forma con precisione anche dal telefono.
- **Codice JSON**: si esporta, si copia e si può incollare per ricreare una card identica altrove.
- Una volta salvata, la card si scala da sola a qualunque colonna la contenga, mantenendo le proporzioni disegnate.

## Cosa si configura

Ogni forma ha posizione, dimensione, bordo (spessore e colore), raggio degli angoli, opacità e un nome interno; a seconda del tipo si aggiungono: testo e allineamento (Testo), l'icona (Icona), il sensore con cifre decimali/unità (Valore sensore), il sensore con i limiti minimo/massimo (Misuratore), l'entità e le due icone acceso/spento (Badge azione). Ogni colore esiste in due versioni, una per il tema chiaro e una per lo scuro: si passa dall'una all'altra col selettore in alto.

## Installazione (HACS)

1. HACS → Repository personalizzati → aggiungi `cristianwebonline/ha-smart-card` come "Lovelace".
2. Installa "Smart Card" e aggiungi la risorsa dashboard.
3. Aggiungi una card di tipo `custom:smart-card` a qualunque vista, oppure trascinala dalla libreria di [Faber Layout](https://github.com/cristianwebonline/ha-studio-card).

## Sicurezza

Il badge azione può accendere/spegnere prese e luci al tocco — usa questa card solo da un account con accesso alle entità che vuoi controllare.
