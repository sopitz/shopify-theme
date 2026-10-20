# Changelog

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
