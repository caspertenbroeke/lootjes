# Lootjes trekken – familie ten Broeke & ten Voorde

Eigen lootjes-app met verlanglijstjes. De lootjes worden versleuteld, dus niemand kan zien wie wie heeft. Ook de organisator niet, en ook niet in de Google Sheet.

Twee bestanden:

- `Code.gs` – de backend (Google Apps Script, bewaart alles in een Google Sheet)
- `index.html` – de website (zet je gratis op GitHub Pages)

## 1. Backend in Google Sheets (5 minuten)

1. Maak een nieuwe Google Sheet, bijvoorbeeld "Lootjes".
2. Ga naar **Extensies → Apps Script**.
3. Verwijder wat in `Code.gs` staat en plak de hele inhoud van `Code.gs` erin. Klik op opslaan.
4. Klik rechtsboven op **Implementeren → Nieuwe implementatie**.
   - Type: **Web-app**
   - Uitvoeren als: **Ik**
   - Wie heeft toegang: **Iedereen**
5. Klik op **Implementeren** en geef toestemming (Google waarschuwt omdat het je eigen script is: kies *Geavanceerd → Ga naar … (onveilig)*).
6. Kopieer de **web-app-URL** (eindigt op `/exec`).

Controle: open die URL in je browser. Je ziet dan "De lootjes-backend werkt".

## 2. Website koppelen

Open `index.html` in een teksteditor en zoek bovenin:

```js
const API_URL = '';
```

Plak daar je URL tussen de aanhalingstekens:

```js
const API_URL = 'https://script.google.com/macros/s/....../exec';
```

Zolang `API_URL` leeg is draait de site in **demomodus**: alles blijft in je eigen browser.

## 3. Online zetten met GitHub Pages

1. Maak op GitHub een nieuwe repository, bijvoorbeeld `lootjes`.
2. Upload `index.html` (Add file → Upload files).
3. Ga naar **Settings → Pages**, kies bij Source **Deploy from a branch**, branch **main**, map **/ (root)**, en sla op.
4. Na een minuutje staat de site op `https://<jouw-gebruikersnaam>.github.io/lootjes/`.

## Zo gebruik je het

1. Open de site en maak de groep aan. Jij (de eerste naam) bent de organisator.
2. Je komt op de organisatorpagina. **Bewaar de organisatorlink**, daarmee beheer je de groep.
3. Kopieer per persoon de uitnodiging en stuur die via WhatsApp. Geen wachtwoorden of accounts: de persoonlijke link is de sleutel.
4. Iedereen opent zijn link en vult zijn verlanglijstje in. Jij doet dat ook via **Mijn lootje**.
5. Stel in wie elkaar niet mogen trekken en druk op **Trek de lootjes**.
6. Iedereen opent wanneer het uitkomt weer zijn link en drukt op **Onthul mijn lootje**. Daaronder staat het verlanglijstje van wie je hebt getrokken. Dat werkt zichzelf bij als die persoon iets toevoegt.
7. Op de organisatorpagina zie je wie zijn lootje al heeft bekeken.

## Waarom niemand het kan zien

- Elke persoonlijke link bevat een eigen sleutel. Bij het trekken versleutelt jouw browser ieders lootje met die sleutel. Alleen die versleutelde tekst gaat naar de Sheet, de uitkomst wordt nergens getoond of bewaard.
- In de Sheet staat dus alleen onleesbare tekst. Verlanglijstjes staan er wel leesbaar in, die zijn niet geheim.
- Jij verstuurt de links, dus jij zou technisch gezien andermans link kunnen openen. Daarom is er een **spiek-alarm**: elk lootje onthoudt op welk apparaat het is geopend. Opent iemand anders jouw link, dan zie jij een melding met het tijdstip.

## Handig om te weten

- **Link kwijt of per ongeluk doorgestuurd?** Klik op de organisatorpagina op **Nieuwe link** bij die persoon. De oude link werkt dan niet meer, het verlanglijstje blijft. Dat kan alleen vóór het trekken. Daarna kun je de oude uitnodiging gewoon opnieuw kopiëren.
- **Spiek-alarm terwijl je het zelf was?** Dat gebeurt als je je link op twee apparaten opent, bijvoorbeeld telefoon en tablet. Dan is er niets aan de hand.
- **Opnieuw trekken** kan altijd vanaf de organisatorpagina. De oude lootjes vervallen, iedereen houdt dezelfde link.
- **Code.gs aangepast?** Kies *Implementeren → Implementaties beheren → bewerken → Nieuwe versie*, anders blijft de oude versie draaien.
