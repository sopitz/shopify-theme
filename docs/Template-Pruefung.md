# Prüfung der DOCX-Änderungen

Release 1.0.40 auf Basis von 1.0.39. Die Änderungen sind lokal geprüft und für das GitHub-Release freigegeben. Die Prüfung mit tatsächlichen Shopdaten und die Aktivierung übernimmt der Nutzer im Shopify-Admin.

| DOCX | Umsetzung | Prüfen |
|---|---|---|
| Navigation | Grössere quadratische Bilder und gemeinsame Gruppenüberschrift mit Übersicht und Unterkategorien | Desktop-Menü und mobiles Menü |
| Kategorieseiten | Vorhandener Kategorietext einmal unter den Produkten, kompakter Einstieg, Sprunglinks, volle FAQ-Breite | Standardkollektion und optionale Vorlage `kybun` |
| Weitere Filter | Alle verfügbaren nativen Filter; echte Farbfelder, Muster- und Filterbilder mit Textalternative | [Filter einrichten](Collection-Filter-Einrichtung.md); Farbe/Sohle benötigen vorhandene befüllte Daten und Freigabe in Search & Discovery |
| Artikelseiten | Verlinkte Versand-/Rückgaberichtlinien und persönliche Beratung, einheitliche ruhige Informationsbereiche | Produkt mit und ohne Richtlinien/strukturierte Inhalte |
| Schuhpflege | Karten für die bereits im Pflegeabschnitt verknüpften verfügbaren Produkte | Produkt mit bestehenden Pflege-Links; ohne gültige Links keine erfundenen Empfehlungen |
| Reduzierte Artikel | Vergleichspreis mit «Statt», Prozent-Badge auf dem Produktbild, korrekte Aktualisierung beim Variantenwechsel | Tatsächliches reduziertes Produkt und normaler Artikel; keine Rabattaussage aus fremden Varianten-/Modell-Maximalpreisen |
| Haupttitel | Ruhigere Schriftgrösse auf Inhalts-, Produkt- und Kollektionsseiten | Lange Titel auf Desktop und Mobilgerät |
| Seitenbilder | Natürliche Seitenverhältnisse für Geschichte, Team und Filialfotos | Quer- und Hochformat; Galeriebedienung |
| Beratungsseite | Drei Themen mit bestehenden Buchungslinks für fünf Filialen | Neue Vorlage `beratung` oder `termine`; im Entwurf voranzeigen, anschliessend die vorgesehene Beratungsseite bewusst zuweisen |

## Vorhandene AICO-Daten verwenden

AICO und die Katalogdaten werden nicht durch das Theme verändert. Handles, Tags und automatische Kollektionsregeln bleiben erhalten.

- Die Anzeige entfernt nur konfigurierte, exakt passende Elternpfade am Anfang des Kollektionsnamens. Unter **Theme-Einstellungen → Kollektionsnamen** sind die bestätigten Pfade `Schuhe Pflegemittel & Zubehör` und `Schuhe` hinterlegt. Der längste passende Pfad gewinnt. Unbekannte Namen und Zusätze wie «Outlet» bleiben erhalten. Ein vorhandener eigener SEO-Titel bleibt erhalten.
- Der vollständige Text kommt weiterhin aus `collection.description` / `descriptionHtml`. Er wird nicht in eine zweite «Mehr über»-Box kopiert. Das bekannte native FAQ-Format bleibt ohne JavaScript lesbar und wird mit JavaScript ohne Textkopie aufklappbar.
- `collection.metafields.custom_fields.faq` und `custom_fields.good_to_know` werden als vorhandene typisierte JSON-Arrays aus `{question, answer}` gelesen. Identische geerbte Einträge und Fragen, die bereits im Kategorietext vorkommen, werden nicht erneut ausgegeben. Ungültige oder leere Werte erzeugen keine leeren Bereiche.
- In **Kollektion & Filter → Quelle für Kaufhilfe und FAQ** ist «AICO-Inhalte bevorzugen» voreingestellt. Ein vorhandener Kategorietext hat Vorrang vor den ergänzenden Beispielblöcken. Ohne Kategorietext und ohne gültige AICO-Einträge dienen die Theme-Blöcke als Ersatz; «Theme-Blöcke verwenden» erlaubt die ausdrückliche manuelle Auswahl.
- Produktkarten verwenden vorhandene `aico_metafields.obermaterial_list` und `schuhart_list`. Fehlende Werte bleiben verborgen; ohne Merkmale erscheint der vorhandene Kurztext. Diese Daten werden nicht aus dem Namen oder aus anderen Produkten geraten.

## Gleiche Kartenhöhe

Der vorhandene CSS-Subgrid-Aufbau verwendet gemeinsame Zeilen für Bild, Titel, Kurztext/Merkmale, Preis und Aktionen. Die optische Zwei-Zeilen-Begrenzung des Kurztexts ist entfernt. Der bestehende serverseitige kurze Textauszug bleibt ein Auszug, seine umgebrochenen Zeilen werden aber vollständig angezeigt. Unterschiedliche Textlängen und fehlende Merkmale dürfen die Preis- und Buttonzeile innerhalb einer Reihe nicht versetzen.

## Bestehende Markenseite

`/pages/kybun` hat laut Shop-Abgleich bereits den Suffix `kybun`. Die ergänzte Datei `page.kybun.json` hält diese bestehende Zuordnung im neuen Theme funktionsfähig und verwendet die verifizierte bestehende kybun-Kollektion als native Ressourcenauswahl. Ein nicht vorhandenes Seitenmetafeld ist dafür nicht erforderlich. Ohne gültige Kollektion bleibt die Produktreihe verborgen. Die generische Vorlage `page.marke` unterstützt weiterhin eine individuelle Kollektionsreferenz über das Seitenmetafeld `upswing.kollektion`.

## Beratungsseite

Die bestehenden Kontaktformulare bleiben für echte Kontaktseiten erhalten. Die neuen Vorlagen `page.beratung` und `page.termine` zeigen Venen Engel, bellicon und die BLACKROLL Matratze mit den vorhandenen Microsoft-Bookings-Links für Thun, Zürich, Winterthur, Rüti ZH und Basel. Die Links stammen aus den öffentlichen Buchungsseiten des Shops. Es wurden keine Termine gebucht. Die Verfügbarkeit des Kalenders wird erst beim Anbieter angezeigt.

Ein Theme-Upload weist Vorlagen nicht automatisch zu. Im unveröffentlichten Entwurf lässt sich eine vorhandene Seite mit `?view=beratung` oder `?view=termine` prüfen. Eine bestehende Live-Seitenzuordnung nicht allein für einen Entwurf verändern.
