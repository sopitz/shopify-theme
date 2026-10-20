# Einrichtung und Konzept für upswing

Stand: **Theme 1.0.9 · 20. Oktober 2026**

Das Theme stellt den vorhandenen Shopify-Katalog dar. Titel, Beschreibungen, Produktbilder, Preise, Varianten und Bestände werden bei der Ausgabe aus den Shop-Ressourcen gelesen. Katalogkarten und Navigation werden über die vorgesehenen Ressourcen-Auswahlen und Shop-Menüs eingerichtet. Produkt- und Kollektions-Handles werden ohne Vorauswahl ausgeliefert.

Die vollständige Arbeitsliste steht in [Katalog-Einrichtung.html](Katalog-Einrichtung.html), mit derselben Checkliste als [Textdatei](Katalog-Einrichtung.txt). Die [AICO-Zusatzfelder für vier Hauptkategorien](AICO-Zusatzfelder-Hauptkategorien.html) ergänzen die Datenpflege für **Gesundheitsschuhe**, **Bewegung & Training**, **Regeneration** und **Arbeitsplatz**. Diese Einteilung dient der Datenpflege; das Theme erzeugt daraus keine zusätzlichen Produktvorlagen oder Kataloginhalte.

## Als unveröffentlichten Entwurf einrichten

1. Das benannte ZIP eines freigegebenen Releases im Shopify-Admin unter **Onlineshop → Themes → Theme importieren** hochladen.
2. Den neuen Theme-Entwurf über **Anpassen** öffnen und die Vorschau zunächst auf der Startseite `/` prüfen.
3. Die tatsächlichen Haupt- und Fussmenüs, Seiten, Kollektionen und Produkte zuordnen. Bei einem leeren Testshop zuerst passende Shop-Ressourcen anlegen und für den Onlineshop verfügbar machen.
4. Shop-Richtlinien, Variantenbestände, Abholstandorte und benötigte Metafelder prüfen. Erst danach den vollständigen Kaufablauf und die Formulare im Entwurf testen.

Ein Upload fügt eine Theme-Version hinzu. Produkte, Kollektionen, Menüs und Seiten werden unabhängig davon verwaltet. Er legt keine Metafelddefinitionen oder Metaobjects an. Eine Veröffentlichung im Shop wird durch dieses Repository nicht ausgelöst.

## Navigation aus Shop-Menüs

Im Kopfbereich das tatsächliche Shopify-Hauptmenü auswählen; im Fussbereich die vorgesehenen Shop-Menüs zuordnen. Produkt- und Kollektionsziele im Shopify-Menü als Ressourcen auswählen, damit Titel und Ziele auf die vorhandenen Shopdaten verweisen. Veraltete, gelöschte oder nicht veröffentlichte Ziele im Entwurf prüfen und korrigieren.

Katalogbilder stammen von den verknüpften Ressourcen. Die Einrichtung ersetzt eine fehlende Zuordnung nicht durch ein eingebautes Produktsortiment. Kontakt-, Beratungs-, Firmen- und redaktionelle Seiten werden entsprechend ihrer Funktion verknüpft. Die vorhandenen statischen Über-uns- und Filialseiten bleiben erhalten.

Unter **Logo & Kontakt** das Original-Logo, Favicon und aktuelle Kontaktdaten prüfen. Die vorhandene Gestaltung und die lokal enthaltene Manrope samt SIL-Lizenz bleiben Bestandteil des Themes.

## Startseite und Produktberater verbinden

**Sortimentswelten:** In jedem Kategorie-Block eine vorhandene Kollektion auswählen. Der aktuelle Kollektionstitel, die URL, die Beschreibung und das Kollektionsbild werden direkt verwendet. Änderungen an der Kollektion erscheinen bei der nächsten Ausgabe. Ein Bild wird bei der Kollektion gepflegt; eine Produktaufnahme oder ein Theme-Foto ersetzt ein fehlendes Kollektionsbild nicht.

**Marken-Kollektionen:** Jede Marke mit ihrer tatsächlichen Kollektion verknüpfen. Titel und Ziel kommen aus dieser Kollektion. Optional das Kollektionsmetafeld `upswing.brand_logo` als `file_reference`, auf Bilder beschränkt, anlegen und befüllen. Es wird vor dem Kollektionsbild verwendet. Ohne geeignetes Bild erscheint der aktuelle Kollektionstitel. Das Theme liefert keine festen Markenlogos oder Marken-Zieladressen aus.

**Ausgewählte Modelle:** Entweder einzelne Produkte in den Produkt-Blöcken auswählen oder ohne Produkt-Blöcke eine Kollektion wählen. Vorhandene Produkt-Blöcke bestimmen die Einzelauswahl; ein gelöschtes Produkt löst keinen Wechsel auf die Kollektion aus. In der Kollektionsansicht die gewünschte Produktanzahl einstellen. Der zusätzliche Kollektionslink erscheint nur mit einem gültigen, befüllten Kollektionsziel und sichtbaren Produkten.

**Einstieg nach Bedürfnis:** Jeder Themen-Block verknüpft eine reale Shopify-Seite oder Kollektion. Folgende Einstellungen stehen zur Verfügung:

| Einstellung | Aufgabe |
|---|---|
| `target_type` | Zwischen Shopify-Seite und Kollektion wählen |
| `page` | Vorhandene Themen-Seite auswählen |
| `collection` | Vorhandene Themen-Kollektion auswählen |
| `image` | Optionales redaktionelles Bild ausschliesslich für ein Seitenziel |
| `topic_label` | Optionale redaktionelle Dachzeile |
| `link_label` | Beschriftung der Handlungsaufforderung |

Titel und Beschreibung beziehungsweise Seiteninhalt stammen vom gewählten Ziel. Bei Kollektionszielen stammt auch das Bild immer aus der Kollektion. Die redaktionellen Bezeichnungen ergänzen den Einstieg; Produktmerkmale werden weiterhin am Produkt gepflegt.

**Produktberater:** Für jeden Einstieg eine echte Kollektion im vorgesehenen Auswahlfeld wählen. Titel, Beschreibung und Ziel stammen aus dieser Kollektion. Symbole und Linktexte bleiben redaktionell einstellbar. Die Seite mit der Vorlage `page.guide` im Shopify-Admin anlegen beziehungsweise zuweisen und anschliessend im gewünschten Shop-Menü verlinken.

Nicht verknüpfte oder gelöschte Katalogreferenzen erzeugen im Shop keine verlinkten Beispielkarten. Leere Katalogbereiche bleiben verborgen; im Theme-Editor zeigen Hinweise die erforderliche Einrichtung. Eine gültige Kollektion ohne eigenes Bild kann weiterhin über ihren tatsächlichen Titel erreichbar sein. Ein leerer Produktberater behält seine redaktionelle Seiten- und Beratungsinformation, aber keine ungebundenen Katalogkarten.

## Produktinhalte pflegen

Die native Shopify-Beschreibung bleibt vollständig erhalten. Die kurze Einleitung nutzt einen gültigen vorhandenen Kurztext oder den ersten Absatz dieser Beschreibung. Zusätzliche Informationsbereiche erscheinen nur mit befüllten und passend typisierten Shopdaten. Eine Artikelmarke oder ein Produkthandle erzeugt keine zusätzlichen Aussagen zu Eigenschaften, Eignung oder Serviceleistungen.

Die gemeinsame Produktvorlage unterstützt unter anderem:

- `upswing.short_description` und `custom_fields.small_description` als vorhandene Kurztexte.
- `upswing.features`, `upswing.everyday_topics`, `upswing.technical_specs` und `upswing.faq_items` als Listen referenzierter Metaobjects.
- `upswing.benefits`, `upswing.suitability`, `upswing.specifications`, `upswing.introduction`, `upswing.size_guide`, `upswing.care` und `upswing.faq` als ergänzende Inhalte entsprechend ihrer vorgesehenen Feldtypen.
- `upswing.knowledge_heading` und `upswing.knowledge_intro` als redaktionelle Einleitung zum Informationsbereich.
- Bestehende Artikelmerkmale in `aico_metafields` als technische Tabelle, wenn keine gültigen strukturierten technischen Angaben vorhanden sind.
- `upswing.related_products` als explizite Produktempfehlungen sowie Shopifys native Produktempfehlungen.

Die [Katalog-Checkliste](Katalog-Einrichtung.html) beschreibt die benötigten Definitionen und Quellen. Neue Metafelder und Metaobjects im Shopify-Admin mit dem erforderlichen Storefront-Zugriff anlegen; ein Theme-Upload übernimmt diesen Schritt nicht. Die AICO-Datei beschreibt die fachliche Ergänzung je Hauptkategorie. Zusätzliche Datenfelder erst nach Prüfung mit echten Artikeln im Sync befüllen.

## Farben und Modellzuordnung

Native Shopify-Farboptionen verwenden die vorhandenen Varianten und Swatches. Bei einer nativen Option **Farbe**, **Color** oder **Colour** wird kein paralleler Modellfarben-Picker eingeblendet. Für separate Farbprodukte kann `upswing.model_products` als `list.product_reference` die zugehörigen Produkte verknüpfen. Bestehende Beziehungen in `custom_fields.custom_rel_farbe` werden zusätzlich unterstützt; deren Ziele müssen auf vorhandene, zugängliche Produkte verweisen.

Die Felder `aico.pd_color_v2`, `mm-google-shopping.color` und `aico.pd_colors_v2` liefern lesbare Farbnamen. Der exakte Farbwert kommt zuerst aus dem bereits vorhandenen `aico.pd_color_hex`. Ein bestehendes `upswing.color_hex` bleibt als optionale bisherige Quelle kompatibel; danach wird der native ausgewählte Shopify-Swatch verwendet. Ein neues paralleles Farbfeld ist nicht erforderlich. Ein Name allein legt keinen Farbton fest. Ohne bestätigten Farbwert bleibt die Farbe als Text auswählbar; aus Namen werden keine Farbtöne geschätzt. Produktbilder werden als Produktansicht verwendet.

Für einen Katalog mit einer Karte je Modell die Modellzuordnung vollständig pflegen: stabiler `upswing.model_key`, genau ein `upswing.model_primary` je Modell, die Referenzen in `upswing.model_products` und bei Bedarf ein gemeinsamer `upswing.model_name`. Kollektionen mit ausschliesslich den Primärprodukten erhalten passende Zählung und Pagination. Eine normale Kollektion zeigt weiterhin ihre tatsächlich enthaltenen Produkte.

Die Suchgruppierung unter **Theme-Einstellungen → Modellkatalog** erst aktivieren, wenn alle betroffenen Produkte, auch einfarbige Modelle, korrekt markiert sind und der Filter `upswing.model_primary` in Shopify Search & Discovery eingerichtet ist. Für eine Farbunion kann `upswing.model_colors` am Primärprodukt gepflegt werden. Filter, Preis-Sortierung und Verfügbarkeit mit den tatsächlichen Modellkollektionen prüfen; die Verknüpfung anderer Farbprodukte führt deren Filterdaten nicht automatisch zusammen.

## Lieferzeit, Versand und Rückgabe

Eine bestätigte Lieferfrist in `upswing.delivery_time` als `single_line_text_field` am Produkt oder an der Variante pflegen, einschliesslich Einheit. Eine Variantenangabe hat Vorrang vor der Produktangabe. Fehlt beides, lautet die Frist **auf Anfrage**. Aus einer Marke werden keine Versandtage oder Lieferzusagen abgeleitet.

Verfügbarkeit und Abholhinweise stammen von der gewählten Shopify-Variante und ihren tatsächlichen Abholbeständen. Beim Wechsel von Grösse oder Farbe muss die passende Variante geprüft werden. Abholstandorte und Bestandsführung im Shopify-Admin korrekt einrichten.

Versand- und Rückgabetexte werden aus den tatsächlichen Shopify-Richtlinien übernommen. Diese unter **Einstellungen → Richtlinien** pflegen. Versandtarife, Schwellenwerte und Zuschläge in den Versand- beziehungsweise Checkout-Einstellungen verwalten und im Entwurf testen. Ein optionales produktspezifisches `upswing.delivery_note` ergänzt die gepflegten Angaben. Das Theme liefert keine festen Versandkosten oder Rückgabefristen als Produktfakten aus.

## Kaufbereich und Bilder prüfen

Produktformular, Kaufleiste und Vollbildgalerie verwenden die tatsächlichen Varianten, Preise, Mengenregeln und Bestände. Die Mengenwahl erhält die vorhandenen Formularfelder. Die mobile Kaufleiste erscheint beim Weiterlesen nach dem ursprünglichen Kaufbutton. Die Vollbildgalerie enthält die Produktauswahl und lässt sich mit Tastatur oder Schliessen-Schaltfläche beenden.

Produktkarten zeigen bei Hover oder Tastaturfokus eine vorhandene zweite Produktansicht. Eine Farbvorschau verwendet das Bild der tatsächlichen Auswahl. Beim Verlassen kehrt die Karte zur normalen Ansicht zurück. Native Produktempfehlungen kommen von Shopify; ohne Ergebnisse bleiben sie verborgen. Diese Funktionen im Entwurf besonders mit Artikeln ohne Zweitbild, nicht verfügbaren Varianten und unterschiedlichen Farbgrössen testen.

## Redaktionelle Seiten und separate Designvorschau

Die bestehenden Filial-, Über-uns-, Chronik-, Team- und Serviceinhalte bleiben als erlaubte statische redaktionelle Inhalte erhalten. Sie werden durch die Katalogbereinigung nicht in ein neues Datenmodell überführt. Kontakte, Öffnungszeiten und angebotene Leistungen vor der Freigabe redaktionell prüfen. Vorhandene Shopify-Seiten können weiterhin Seiteninhalt und die vorgesehenen Editor-Blöcke verwenden.

Die lokale Designvorschau liegt getrennt von den nativen Theme-Quellen. Ihre Beispielprodukte, Preise und Bestände sind gekennzeichnete Momentaufnahmen für die Gestaltung. Lokaler Warenkorb, interaktive Beratung und Vorschauformulare belegen keine aktuelle Shopify-Verfügbarkeit, Formularzustellung oder funktionierende Shop-Zahlung. Für die Freigabe zählt die Prüfung des unveröffentlichten Themes mit den echten Shopdaten.

## Prüfung vor Veröffentlichung

Im unveröffentlichten Shopify-Theme mindestens Folgendes prüfen:

- Alle Haupt- und Fussmenüs, Themenziele, Kollektionen, Produkte und Richtlinien öffnen; fehlende oder gelöschte Referenzen im Editor korrigieren.
- Einen Kollektionstitel, ein Bild und eine Produktbeschreibung testweise ändern und die aktuelle Ausgabe kontrollieren; anschliessend den vorgesehenen Inhalt wiederherstellen.
- Produkte mit und ohne optionale Metafelder, mit einer Farbe, mehreren Farbprodukten, nativen Farbvarianten und fehlenden Bildern prüfen.
- Grössen- und Farbwechsel, Preis, Bestand, Abholung, Lieferzeit, Mengenregeln, Warenkorb und Checkout mit tatsächlichen Shopdaten prüfen.
- Versandtarife, Steuern, Rückgaberichtlinie, Zahlungsarten und Rabatte in den zutreffenden Fällen prüfen.
- Kontakt- und Unternehmensformulare auf erfolgreiche Zustellung, vorhandene Apps sowie Suche und Filter prüfen.
- Mobile Ansicht, Tastaturbedienung, Bildgalerien, Dialoge, lesbare Farbnamen und erreichbare Kaufaktionen kontrollieren.

Lokale Funktionsprüfungen, Schema-Prüfung und offizieller Theme Check sind Teil der technischen Freigabe. Sie ersetzen keine bestätigte Shopify-Laufzeit. Prüfzahlen und Ergebnisse gehören zu den Änderungsnotizen beziehungsweise dem jeweiligen Freigabebericht und werden hier nicht als dauerhafte Laufzeitbestätigung festgeschrieben.
