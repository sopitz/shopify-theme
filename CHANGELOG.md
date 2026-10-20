# Changelog

## [1.0.25] - 2026-10-20

- Die Lieferzeit auf der Produktseite stammt nur noch aus `upswing.delivery_time` der gewählten Variante, ersatzweise des Produkts. Die Zusätze «Sofort verfügbar» und «Online verfügbar» entfallen. Die Abholverfügbarkeit bestimmt die Anzeige nicht mehr, weil Shopify bei Varianten, die ohne Bestand weiterverkauft werden, jeden Abholstandort als verfügbar meldet. Bisher stand deshalb etwa bei ELTEN ohne Bestand «Sofort verfügbar · Lieferzeit: Liefertermin auf Anfrage».
- Anzeige als «Lieferzeit: 2–3 Werktage» und so weiter; Werte, die bereits «Liefer…» enthalten, etwa «Liefertermin auf Anfrage», erscheinen ohne Zusatz. Ohne Wert «Lieferzeit auf Anfrage», nicht lieferbare Varianten «Aktuell nicht lieferbar». «2–3 Werktage» (Bestand in einer Filiale) erhält die Farbe für schnelle Lieferung, alle anderen Fristen die normale.
- Jede Grösse bringt ihre Lieferzeit im Varianten-JSON mit, auch nicht ausgewählte. Die Rückfalltexte im Skript nennen keine Verfügbarkeit mehr.
- Lieferzeit-Tests auf die neue Regel umgestellt; Doku zu `upswing.delivery_time` und zum Shopify-Flow, der die Variantenwerte setzt, ergänzt.

## [1.0.24] - 2026-10-20

- Desktop-Unterkategorien grenzen den wiederholten Elternnamen typografisch ab: «Venen Engel» erscheint leichter und grau, während «Massagegeräte», «Zubehör» beziehungsweise «Mietgeräte» kräftig bleiben. Vollständige Namen und vorhandene Leerzeichen bleiben erhalten; zusätzliche Zeichen oder Abstände entfallen.
- Die Abstufung greift nur bei einem exakten Namenspräfix. Andere Titel bleiben unverändert; Sonderzeichen werden weiterhin sicher als Text ausgegeben. Menüverschachtelung, Links, aktive Seiten und mobile Darstellung bleiben erhalten.
- Bestehende Navigationstests um Präfix- und Fallback-Fälle ergänzt. Die Darstellung bleibt in der Shopify-Vorschau bei 1101 und 1244 px einzeilig.

## [1.0.23] - 2026-10-20

- Produktkarten zeigen alle vorhandenen Farben statt einer auf fünf beziehungsweise sechs Einträge begrenzten Auswahl. Das gilt für native Varianten, verknüpfte Modellprodukte und ältere Farbreferenzen.
- Die zusätzliche Angabe «N Farben» entfällt. Farben umbrechen innerhalb der Karte bei Bedarf in weitere Zeilen.

## [1.0.22] - 2026-10-20

- Warenkorb zeigt unter dem Warenwert, wie viel bis zum kostenlosen Versand fehlt («Noch CHF 12.00 bis zum kostenlosen Versand mit Post Economy.»), und ab der Grenze «Kostenloser Versand mit Post Economy».
- Grenze und Versandart sind im Warenkorb-Abschnitt des Theme-Editors pflegbar (Vorgabe 99 und Post Economy, passend zum aktuellen Shopify-Tarif). Shopify gibt die Versandtarife nicht an das Theme heraus; bei Tarifänderungen beide Werte nachführen. Leer oder 0 blendet den Hinweis aus.
- Die in 1.0.8 gesperrte Einstellung `free_shipping_threshold` ist nur im Warenkorb-Abschnitt wieder zugelassen; feste Versandgebühren und andere Versandschwellen bleiben gesperrt.

## [1.0.21] - 2026-10-20

- Unterkategorien der dritten Menüebene erscheinen auf Desktop als gleichwertige Bildkacheln direkt nach ihrer übergeordneten Kategorie. Vollständige Shopify-Titel bleiben sichtbar; zusätzliche Bänder, verkleinerte Karten und Sonderabstände entfallen.
- Mega-Menüs mit einer dritten Ebene verwenden fünf Spalten. Die zehn Regeneration-Einträge stehen dadurch in zwei vollständigen Reihen; «Venen Engel Massagegeräte» bleibt auch an der schmalsten Desktop-Breite einzeilig. Andere Mega-Menüs behalten sechs Spalten.
- Native Menüverschachtelung, Reihenfolge und Linkziele bleiben erhalten. Mobil bleiben die Unterkategorien aufklappbar; vollständige Titel, aktive Seiten und zugängliche Linkbeschriftungen werden übernommen.
- Regression für vollständige Titel, Bilder, Escaping und unveränderte Menüstruktur ergänzt. Die Menüansicht wurde im Shopify-Entwurf bei 1101 und 1244 px geprüft.

## [1.0.20] - 2026-10-20

- Zahlungslogos im Warenkorb stehen einzeilig direkt unter dem Kassenbutton, mit einheitlichen kompakten Flächen und 6 px Abstand.
- Bei geringer Breite verkleinern sich die Logos proportional innerhalb der verfügbaren Zeile, ohne Umbruch.

## [1.0.19] - 2026-10-20

- Rechnung erhält dasselbe Schweizer Einzahlungsschein-Symbol wie im gezeigten Checkout, ohne unbestätigte Zuordnung zu einem Rechnungsanbieter.
- TWINT und PostFinance Pay verwenden die kompakten Shopify-Zahlungssymbole im gleichen 38×24-Format. Alle Zahlungsmittel stehen in einheitlichen 54×38-Flächen mit zentriertem Inhalt und gleichmässigen Abständen.
- Alternative Shopify-Bezeichnungen für Rechnung und PostFinance Pay werden zur Vermeidung doppelter Logos zusammengeführt.

## [1.0.18] - 2026-10-20

- Warenkorb zeigt TWINT und PostFinance Pay mit ihren Original-Logos statt Textlabels. Logos sind lokal als Theme-Assets enthalten, mit Alternativtext und unverzerrten Proportionen.
- Einheitliche Logoausgabe für automatisch erkannte und ergänzte Zahlungsarten; Rechnung und weitere benannte Methoden bleiben als lesbare Labels erhalten.

## [1.0.17] - 2026-10-20

- Warenkorb ergänzt automatisch gelieferte Zahlungslogos um Rechnung, TWINT und PostFinance Pay als lesbare, einheitlich angeordnete Zahlungslabels.
- Zusätzliche Zahlungsarten sind im Warenkorb-Abschnitt des Theme-Editors pflegbar. Leere Einträge und doppelte Namen werden unterdrückt; Shopify-Zahlungsarten bleiben dynamisch.
- Enthält die vertikale Zentrierung der Mengensteuerung und Preise aus 1.0.16.

## [1.0.16] - 2026-10-20

- Warenkorb: Mengensteuerung und Gesamtpreis stehen auf Desktop und Tablet vertikal mittig zur jeweiligen Produktzeile. Die gemeinsame Spaltenausrichtung mit den Überschriften bleibt erhalten; mobil bleiben die Bedienelemente unter den Produktinformationen.

## [1.0.15] - 2026-10-20

- Warenkorb: Spaltenüberschriften und Produktzeilen verwenden dieselben Spaltenbreiten. «Anzahl» steht mittig über der Mengensteuerung; Preise sind rechts bündig. Die Mengensteuerung richtet sich am oberen Zeilenrand aus.
- Spätere Regeln der Mengensteuerung berücksichtigen die korrigierten Bildbreiten und Abstände auch auf Tablets.

## [1.0.14] - 2026-10-20

- Warenkorb: Bildspalten passen zur tatsächlichen Bildbreite; Produkttexte erhalten abgestufte Abstände für Desktop, Tablet und Mobilgeräte.
- Zahlungslogos unter dem Kassenbutton einheitlich gross und zentriert in einer Reihe angeordnet; bei Platzmangel umbrechend, ohne Aufzählungspunkte.
- Feste Projektregel: Shopify-Themes niemals eigenständig live schalten; die Aktivierung übernimmt der Nutzer.

## [1.0.13] - 2026-10-20

- Mehrfarbige Produkte zeigen einen geteilten Farbpunkt: Liefert AICO alle Farbwerte als `aico.pd_colors_hex` (Liste, Hauptfarbe zuerst), wird der Kreis in bis zu vier gleiche Segmente aufgeteilt. Gilt für Produktkarten, Produktseite, nachgeladene Farbprodukte sowie Kaufleiste und Vollbild. Ohne Liste bleibt `aico.pd_color_hex` die Quelle.
- Produktkarten zeigen höchstens sechs Farbpunkte; die Gesamtzahl der Farben steht weiterhin daneben. Farben ohne Farbwert erscheinen als kurzer Text ohne den gemeinsamen Modellnamen («light grey» statt «Magglingen light grey»).

## [1.0.12] - 2026-10-20

- AICO-Produktinhalte für die vier Hauptkategorien in einer gemeinsamen Produktvorlage vervollständigt. Die Navigation folgt der Kategorie; die gepflegte Grössen-/Auswahlhilfe ist direkt bei den Varianten erreichbar. Keine manuelle Zuweisung separater Produkttemplates nötig.
- Feature- und Themenkarten benötigen Titel und sichtbaren Erklärungstext; FAQ-Einträge Frage und Antwort. Falsche JSON-Strukturen, Objekte statt Text und leere Inhalte erzeugen keine Karten. Richtext bleibt formatiert; exportierte Seiten- und Kaufbereiche werden in den JSON-Texten nicht eingebettet.
- Kaufargumente erscheinen nur beim Preis und werden nicht erneut als Featurekarten ausgegeben. Zusätzliche Featurekarten umbrechen mit gleichmässigen Abständen; lange Produktcodes und Texte bleiben auch mobil innerhalb der Seite; die vollständige Shopify-Produktbeschreibung bleibt bei strukturierten Inhalten aufklappbar erhalten und ohne Zusatzinhalte direkt sichtbar.
- Führende, von Shopify erzeugte JSON-Kommentare in gespeicherten Einstellungen werden von den lokalen Prüfungen korrekt gelesen; aktuelle Editor-Einstellungen bleiben erhalten.
- Feldvertrag und Sync-Hinweise in der AICO-Übersicht und Einrichtung dokumentiert. Lokale Prüfdaten für alle vier Kategorien mit vollständigen, teilweisen und leeren Zusatzfeldern liegen ausschliesslich ausserhalb des Theme-Pakets.

## [1.0.11] - 2026-10-20

- Farbpalette aus dem Original-Logo übernommen: Cyan als Akzent, Anthrazit für Texte und dunkle Bereiche sowie kühle weisse und hellblaue Flächen. Logo-Datei und Gestaltung bleiben erhalten.
- Buttons und Links verwenden dunklere Cyan-Abstufungen für gut lesbare Beschriftungen. Fokus, Navigation, Formulare, Galerien, Kaufleisten und redaktionelle Seiten verwenden gemeinsame Farbwerte; alte dekorative Grün- und Beigetöne entfernt.
- Farbfelder im Theme-Editor verständlich benannt und eine eigene Farbe für Links und Fokus ergänzt. Produktfarben aus AICO beziehungsweise Shopify sowie Liefer-, Erfolgs- und Fehlerstatus behalten ihre jeweiligen Farben.
- Kontrastprüfung für die ausgelieferte Palette und Editor-Vorgaben ergänzt.

## [1.0.10] - 2026-10-20

- Produktseite liest die AICO-Listen `upswing.features`, `upswing.everyday_topics` und `upswing.faq_items` auch als `json`-Metafeld (Titel, Label, HTML-Text beziehungsweise Frage und Antwort). Metaobject-Listen funktionieren weiterhin; leere, unvollständige oder falsch typisierte Einträge bleiben verborgen.
- Überschriften der Informationsbereiche folgen der Hauptkategorie des Produkts (Gesundheitsschuhe, Bewegung & Training, Regeneration, Arbeitsplatz) gemäss AICO-Zusatzfeld-Übersicht. Die Zuordnung erfolgt über Produkt-Tags, einstellbar unter «Produktinhalte nach Hauptkategorie»; ohne Treffer bleiben die neutralen Überschriften.
- AICO-Übersicht und Einrichtungskonzept auf das JSON-Format der drei Listen und die Kategorie-Überschriften aktualisiert.

## [1.0.9] - 2026-10-20

- Das vorhandene Produktmetafeld `aico.pd_color_hex` liefert die Farbpunkte für Produktseite, Produktkarten, nachgeladene Farbprodukte sowie die Farbauswahl in Kaufleiste und Vollbild. Es hat Vorrang vor dem bisherigen `upswing.color_hex`; ein zusätzliches Farbfeld ist nicht erforderlich.
- Fehlende oder ungültige Farbwerte verwenden weiterhin vorhandene gültige Quellen beziehungsweise lesbare Farbnamen. Keine Farben aus Namen geschätzt; native Farbvarianten behalten ihre jeweils eigenen Shopify-Swatches.
- Einfarbige Produkte zeigen den gepflegten Farbpunkt unmittelbar vor dem Farbnamen. Einrichtungsliste und AICO-Übersicht entsprechend aktualisiert.

## [1.0.8] - 2026-10-15

- Feste Produkt- und Collection-Auswahlen, kopierte Kategorietexte, Markenlogos, Katalogfotos und Menü-Fallbacks aus dem ausgelieferten Theme entfernt. Echte Shopify-Menüs werden auch ohne Untermenüs verwendet.
- Sortiments-, Marken-, Themen- und Produktberaterkarten verwenden ausgewählte Shopify-Ressourcen und deren aktuelle Titel, Ziele, Beschreibungen und Bilder. Gelöschte oder fehlende Verknüpfungen bleiben im Shop verborgen und erhalten nur im Editor Einrichtungshinweise.
- Keine geschätzten Farbtöne aus Farbnamen. Farbflächen verwenden explizite Produkt-Farbwerte oder native Shopify-Swatches; sonst bleibt die Auswahl als Text nutzbar.
- Lieferfristen stammen ausschliesslich aus dem Varianten- oder Produktmetafeld. Ohne bestätigte Frist bleibt die Lieferzeit auf Anfrage. Verfügbarkeit und Abholung verwenden die tatsächliche Variante.
- Feste Versandgebühren, Freigrenzen und Rückgabeangaben entfernt; Produkt und Warenkorb verwenden die Shopify-Richtlinien. Keine globalen Marken- oder Tagesregeln mehr.
- Konkrete Katalog-Einrichtungsliste und AICO-Tabelle für vier Hauptkategorien ergänzt. Den überholten 35-Typen-Datenvertrag durch diese Arbeitsgrundlage ersetzt. Redaktionelle Filial- und Unternehmensseiten bleiben erhalten.

## [1.0.7] - 2026-10-15

- Fest hinterlegte PDP-Produkttexte und Produkt-Handle-Sonderfälle entfernt. Informationsbereiche verwenden echte Metafields, Metaobject-Referenzen und die vollständige native Produktbeschreibung; leere Inhalte bleiben verborgen.
- Bestehende Artikelmerkmale aus `aico_metafields` als Fallback erhalten; neue strukturierte technische Werte haben Vorrang. Kurzbeschreibungen unterstützen vorhandene Text- und Richtext-Felder.
- Lieferfristen und Markenregeln sind Händler-Einstellungen; variantenspezifische beziehungsweise produktspezifische Live-Fristen können sie ergänzen. Reale Verfügbarkeit und Abholbestand bleiben massgeblich.
- Produktkarten zeigen beim Hover oder Tastaturfokus die zweite echte Ansicht. Farbhover hat Vorrang, anschliessend wird die passende Originalansicht wiederhergestellt; Touch erzeugt keinen anhaltenden Hover.
- Vergleichsfunktion einschliesslich Kartenknöpfen, Leiste, Dialog, Skript und Styles entfernt.
- Datenvertrag für alle Hauptkategorien: 35 vorgeschlagene PDP-Typen, Zuordnung sämtlicher 49 Menülinks, Feldtypen, Inhalte, Beispiele und AICO-/Shopify-Exportregeln. Separate Typvorlagen sind ein nachfolgender Schritt.

## [1.0.6] - 2026-10-14

- Sortierung in Kollektion und Suche wird bei Auswahl sofort angewendet. Aktive URL-Filter und Suchbegriffe bleiben erhalten, die Pagination wird zurückgesetzt; ohne JavaScript bleibt der Anwendenbutton nutzbar.
- PDP-Vorschaubilder verwenden vier quadratische Kacheln pro Reihe und brechen bei weiteren Bildern um. Vollbildnavigation bleibt erhalten.
- Native Produktempfehlungen auf der PDP ergänzt, mit bestehenden Produktkarten und echten Shopify-Empfehlungsdaten; Farbwechsel aktualisieren das zugrunde liegende Produkt.

## [1.0.5] - 2026-10-14

- No-JavaScript-Fallbacks beim vorgeladenen Farbwechsel aus dem eingesetzten Produktbereich entfernt. Der obere Kaufbutton und seine Auswahl bleiben sichtbar; die Kaufleiste erscheint erst nach tatsächlichem Vorbeiscrollen.
- Preisfilter verwenden zwei gleich breite Eingabefelder mit Beschriftung darüber; Checkbox-Regeln verkleinern die Felder nicht mehr.
- Regressionen für Farbwechsel mit No-JavaScript-Markup und die initiale Sichtbarkeit der Kaufleiste ergänzt.

## [1.0.4] - 2026-10-14

### Farben und Produktkarten

- Bestehende V2-Farbnamen aus `aico.pd_color_v2`, `mm-google-shopping.color` und `aico.pd_colors_v2` angeschlossen. Benannte Hauptfarben erhalten repräsentative Farbpunkte; explizite Farbwerte behalten Vorrang, unbekannte Namen bleiben als Text nutzbar.
- Farbprodukte liefern ihre Metafelder über eine kleine Shopify-Section. Karten zeigen runde Punkte mit Farbanzahl; die PDP zeigt beschriftete Auswahlfelder, beide ohne verkleinerte Produktfotos.
- Produkttyp neben Marke und Modelllink rechts unten angeordnet; doppelte Typzeile entfernt.

### Produktseite und Kaufsteuerung

- Artikelnummer direkt unter dem Namen, Steuer- und Versandhinweis direkt unter dem Preis; Bildunterschrift entfernt.
- Farbe, Grösse, Menge und Kaufbutton in Kaufleisten und Vollbild auf 46 px angeglichen, Beschriftungen ausgerichtet und Grössenpfeil vereinheitlicht.
- Bestehende Lieferregeln aus dem exportierten Händler-Theme übernommen: Filialbestand 2–3 Werktage, weitere Fristen nach Marke. Grössenwechsel fragen echte Abhol-/Bestandsdaten für die ausgewählte Variante ab und synchronisieren Hauptformular, Leiste und Vollbild.
- Farbwechsel laden variantengenaue Produktbereiche und Bilder vor. Sichere Antworten werden direkt wiederverwendet; gewählte Grösse, Menge und Vollbild bleiben erhalten. Fehler, abweichende Produktdaten und ausführbare App-Scripts nutzen normale Navigation.
- Fehlt die bisherige Grösse in einer anderen Farbe, bleibt der Kauf bis zur erneuten Auswahl gesperrt.
- Gezielte Regressionen für Farbfelder, Lieferfristen, Datenrennen, native Formulare und Vorladen ergänzt. Datenübersicht in `docs/Shopdaten.txt` dokumentiert bestehende und optionale Angaben.

## [1.0.3] - 2026-10-14

### Vollbildgalerien

- Produkt- und Filialgalerien laden die nächsten zwei Bilder und das vorherige Bild in ihrer tatsächlichen Vollbildgrösse vor. Das Vorladen beginnt auch bei Hover oder Tastaturfokus auf dem Öffner.
- Bilder werden vorab dekodiert und in einem begrenzten Cache gehalten. Maximal zwei Anfragen laufen gleichzeitig, mit niedriger Priorität gegenüber sichtbaren Bildern.
- Schliessen entfernt wartende Anfragen; beim Wiederöffnen werden vorhandene Bilder und laufende Anfragen wiederverwendet. Fehler und späte Antworten ändern keine Bildauswahl oder Kaufsteuerung.
- Gezielte Prüfungen für Vorladen, Navigation, Schliessen, Wiederöffnen und Seitenwechsel ergänzt.

## [1.0.2] - 2026-10-14

### Suche

- Native Shopify-Suchvorschläge in Header und mobilem Menü ergänzt: Produktbilder, Preise, Suchbegriffe, Sortiments- und Informationsseiten.
- Tastatursteuerung, verzögerte Anfragen, Abbruch veralteter Antworten und normale Suche bei Fehlern oder ohne JavaScript erhalten.

### Bestehende Farbdaten

- `custom_fields.custom_rel_farbe` direkt als zusätzliche Quelle für die Farbauswahl integriert. JSON-Objekte und ältere JSON-Textfelder benötigen dafür keine Migration.
- Native Farboptionen und `upswing.model_products` behalten Vorrang. Nur vorhandene Produktziele werden angezeigt; leere oder veraltete Sprach-Handles werden geprüft.
- Farbwahl funktioniert auf der Produktseite, in Karten, Kaufleiste und Vollbild. Nachgeladene Farben erhalten die gewählte Grösse und Menge und schliessen eine offene Bildansicht nicht.
- Karten laden die Farbreferenzen erst nahe dem sichtbaren Bereich, mit gemeinsamem Cache und begrenzten parallelen Anfragen.

### Gestaltung

- Übermässige Zwischenräume innerhalb der Produktkarten entfernt, auch im spezifischen Kollektionsraster. Preise und Links bleiben pro Zeile bündig, die Bedienelemente gut erreichbar.
- Der erste Produktbeschreibungsabsatz wird vollständig angezeigt statt mitten im Satz abgeschnitten.
- Der Beratungslink unter den Produktbildern führt direkt zur Filialauswahl.

### Prüfung und Installation

Die Funktionen wurden mit Offline-Regressionen sowie nativen Liquid-Vorschauen auf Desktop und Mobile geprüft. Aarau blue/black wurden öffentlich abgeglichen; die Metafield-Zuordnung stammt aus dem bereitgestellten Datenbeispiel. Shopify-Suche, Metafields und echter Checkout sind nach Upload im Shop abschliessend zu prüfen. Das Asset **upswing-shopify-theme-1.0.2.zip** als unveröffentlichten Theme-Entwurf installieren.

## [1.0.1] - 2026-10-14

### Korrigiert

- 13 unzulässige URL-Voreinstellungen in acht Section-Schemas entfernt. Sie verhinderten unter anderem das Laden von Kopf- und Fussbereich in Shopify.
- Bestehende Linkziele durch gespeicherte Einstellungen und Liquid-Fallbacks erhalten; die Links müssen nicht erneut eingerichtet werden.
- Kontakt- und Über-uns-Ziele bleiben auch bei noch leeren Header-Einstellungen erreichbar.

### Release und Prüfung

- Theme-Quellen, Changelog und installierbare Pakete werden über dieses Repository versioniert.
- Zusätzliche Schema-Prüfung ergänzt den offiziellen Shopify Theme Check.
- Versionierte ZIPs, SHA-256-Prüfsummen und Dateimanifeste werden nach erfolgreichen Prüfungen automatisch veröffentlicht.
- Lokal geprüft: 24 Section-Schemas, 21 JSON-Vorlagen, 290 gespeicherte Werte, 18 gezielte Prüffälle und unveränderte Links im lokalen Rendering.

### Installation

Das Asset **upswing-shopify-theme-1.0.1.zip** als neuen, unveröffentlichten Theme-Entwurf hochladen. Der tatsächliche erneute Shopify-Upload und Betrieb im Shop sind noch nicht abschliessend bestätigt. Die auf dem Fehlerscreenshot zusätzlich sichtbare 404 unter `/en` betrifft eine separat zu prüfende Sprachroute.
