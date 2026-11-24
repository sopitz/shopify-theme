# Performance-Prüfung vom 24. November 2026

## Ausgangsmessung

Der geprüfte PageSpeed-Insights-Bericht betrifft die Startseite des
unveröffentlichten Shopify-Vorschauthemes. Desktop-Messung vom 24. November 2026,
22:28 Uhr GMT+2, Lighthouse 13.6.0, emulierter Desktop und gedrosselte Verbindung.
Felddaten tatsächlicher Besucher waren für diese Vorschau nicht vorhanden.

| Kategorie | Ausgangswert |
|---|---:|
| Performance | 98 |
| Barrierefreiheit | 97 |
| Best Practices | 92 |
| SEO | 69 |

| Messgrösse | Ausgangswert |
|---|---:|
| First Contentful Paint | 0,6 s |
| Largest Contentful Paint | 1,0 s |
| Total Blocking Time | 60 ms |
| Cumulative Layout Shift | 0,002 |
| Speed Index | 1,1 s |

Die beschriebenen Performance-Änderungen gehören zu Version 1.0.44. Die
Ausgangswerte bleiben als Vergleich zur folgenden Nachmessung erhalten.

## Nachmessung mit Version 1.0.44

Die erneute Desktop-Messung vom 24. November 2026, 23:05 Uhr GMT+2, verwendete
weiterhin Lighthouse 13.6.0 und das unveröffentlichte Vorschautheme.

| Messgrösse | Ausgangsmessung | Nachmessung 1.0.44 |
|---|---:|---:|
| Performance | 98 | 96 |
| Barrierefreiheit | 97 | 97 |
| Best Practices | 92 | 92 |
| SEO | 69 | 69 |
| First Contentful Paint | 0,6 s | 0,6 s |
| Largest Contentful Paint | 1,0 s | 1,2 s |
| Total Blocking Time | 60 ms | 0 ms |
| Cumulative Layout Shift | 0,002 | 0,001 |
| Speed Index | 1,1 s | 1,1 s |
| Geschätztes verbleibendes Bild-Einsparpotenzial | 253 KiB | 63 KiB |

Der Gesamtscore fiel in dieser Messung von 98 auf 96. Der LCP betrug
1,2 statt 1,0 Sekunden. Gleichzeitig sanken die gemessene
Blockierungszeit, Layoutverschiebung und das gemeldete Bild-Einsparpotenzial.
Aus zwei einzelnen Labormessungen lässt sich keine dauerhafte Verbesserung des
Gesamtscores oder eine eindeutige Ursache für dessen Änderung ableiten. Die
Vorschau-/Plattformgrenzen im folgenden Abschnitt gelten weiterhin.

## Umgesetzte Änderungen

Die drei konkret beanstandeten Bilder waren die gebündelten Theme-Dateien
`hero-mobile.jpg`, `shop-thun.jpg` und `upswing-logo.png`. Ihr bisheriger Abruf
über `asset_url` lieferte die vollständige Datei auch für kleine Darstellungen.
Der gemeinsame Baustein `responsive-asset-image` verwendet nun grössenabhängige
Shopify-CDN-Adressen über `asset_img_url`, ein `srcset` und zur Darstellung
passende `sizes`. Das Logo im Fussbereich verwendet denselben Mechanismus.

Die ursprünglichen Fotografien, vorhandenen HTML-Abmessungen und Bildausschnitte
bleiben erhalten. Die volle Originalauflösung bleibt als Auswahl für dichte
Displays vorhanden. Das Hauptbild bleibt `eager` mit hoher Abrufpriorität;
weiter unten liegende Bilder bleiben verzögert geladen. Vom Händler ausgewählte
Bilder verwenden weiterhin die ausgewählte Shopify-Ressource über `image_url`
und `image_tag`, mit ergänzten Grössenangaben. Das Theme erzwingt weder ein
Dateiformat noch einen neuen Kompressionsgrad.

Einzelne öffentliche CDN-Vergleichsabrufe mit normalen Browser-Formatangaben
bestätigten die verkleinerten Dateien:

| Bild und Beispielbreite | Bisheriger Abruf | Verkleinerter Abruf |
|---|---:|---:|
| Hauptbild, 640 px | 245.590 Byte | 121.920 Byte |
| Thun-Foto, 720 px | 158.936 Byte | 59.254 Byte |
| Logo, 156 px | 10.956 Byte | 4.215 Byte |

Diese drei Beispielabrufe sparen zusammen 230.093 Byte, rund 225 KiB. Sie sind
kein neuer Lighthouse-Lauf. Die tatsächlich gewählte Datei hängt von
Bildschirmbreite, Pixeldichte und Browser ab.

Funktionsbezogene Stylesheets werden passend zum Seitentyp oder zum tatsächlich
gerenderten Abschnitt geladen. Dazu gehören Produktinformationen, Produktwissen,
Medien, Mengenfelder, redaktionelle Inhalte, Kontaktstandorte und
Kollektionsfilter. Der Theme-Editor behält alle erforderlichen Abschnittsstile.
Gemeinsame Navigation und Produktkarten bleiben sofort gestaltet; die
Über-uns-Menüstile liegen dafür im gemeinsamen Navigations-Stylesheet.

Die Bewertungszeile im Kopfbereich reserviert ihre Fläche bereits vor dem
Laden der tatsächlichen Zusammenfassung. Bewertung und Anzahl verwenden feste
innere Spalten. Damit muss der Kopfbereich beim Wechsel vom vorhandenen
Google-Link zu den geladenen Bewertungsdaten weniger neu angeordnet werden.
Es werden keine Bewertungszahlen vorgetäuscht.

Produktkarten erhalten am Link «Modell entdecken» beziehungsweise «Produkt
ansehen» einen zugänglichen Namen mit dem tatsächlichen Produkttitel. Die
sichtbare Beschriftung und das Produktziel bleiben erhalten. Aktive
Hauptmenüpunkte verlieren die zusätzliche Text-Unterstreichung; Menümarkierung,
Tastaturfokus und aktive Unterpunkte behalten ihre Darstellung.

## Grenzen der Vorschau

Der Bericht enthält erhebliche Anteile der Shopify-Vorschauleiste und des
Shopify-Pixel-/Shop-Systems. Deren Cache-Zeiten, Bibliotheken und
Sicherheitsrichtlinien werden nicht durch Theme-Dateien gesteuert. Die im
Bericht aufgeführten Pixel-404-/MIME-Fehler und die blockierte Shop-App-Einbettung
müssen im passenden Shopify-/App-Kontext geprüft werden. Die Theme-Umsetzung
entfernt dafür keine Plattformskripte und lockert keine Sicherheitsrichtlinien.

Für erzwungene Layoutberechnungen nennt der Bericht unter anderem den
Shopify-Pixelmanager mit 14 ms und die Vorschauleiste mit 3 ms; weitere 49 ms
sind nicht zugeordnet. Daraus lässt sich kein bestimmter eigener
Theme-JavaScript-Aufruf als Ursache ableiten.

Der SEO-Ausgangswert 69 enthält die Indexierungssperre der unveröffentlichten
Vorschau durch `noindex,nofollow` und `robots.txt`. Diese Sperre bleibt erhalten.
Die Prüfung der später veröffentlichten Domain ist ein eigener Messkontext.
Auch das beanstandete titellose iframe muss nach seiner Plattform-/App-Herkunft
bewertet werden; ein fremdes iframe wird nicht pauschal umgeschrieben.

Nach dem Upload sind Startseite, Produkt-, Kollektions-, Kontakt- und
redaktionelle Seiten sowie der Theme-Editor zu prüfen. Anschliessend die
Desktop- und Mobilmessung wiederholen und die ausgewählte Bilddatei im
Netzwerkprotokoll kontrollieren. Ein Release veröffentlicht kein Theme im Shop.

## Technische Quellen

- [Shopify: asset_img_url](https://shopify.dev/docs/api/liquid/filters/asset_img_url)
  für grössenabhängige Bilder aus dem Theme-Assets-Verzeichnis.
- [Shopify: image_url](https://shopify.dev/docs/api/liquid/filters/image_url)
  für Bildbreiten, proportionale Skalierung und automatische Formatauswahl.
- [Shopify: image_tag](https://shopify.dev/docs/api/liquid/filters/image_tag)
  für responsive Bildattribute und Ladeverhalten.
