# Einrichtung und Konzept für upswing

## Version 1.0.2 · Suche, vorhandene Farbfelder und kompakte Karten

Die Suchformulare verwenden die native Shopify-Suche. Header und mobiles Menü zeigen jetzt Shopify-Suchvorschläge mit Bildern, Preisen und weiterführenden Ergebnissen. Ohne JavaScript oder bei einer fehlgeschlagenen Anfrage bleibt die normale Suche nutzbar.

Für die Farbauswahl wird das vorhandene Feld `custom_fields.custom_rel_farbe` zusätzlich unterstützt. Native Farboptionen und `upswing.model_products` haben Vorrang. Das sprachweise JSON wird anhand geprüfter Produkt-Handles aufgelöst; alte Beziehungs-IDs sind keine Shopify-Produkt-IDs. Die gültigen deutschen Quell-Handles verhindern, dass leere französische/italienische oder veraltete englische Zuordnungen zu falschen Produkten führen. Die erzeugten Links bleiben in der aktuellen Sprachroute. Unterstützt sind typisiertes JSON, das direkt ausgegebene ältere JSON-Format und echte JSON-Textfelder. Karten nutzen bei Bedarf sichtbarkeitsgesteuertes Nachladen. Für die Farbauswahl vorhandener Aarau-Verknüpfungen müssen keine neuen Metafelder angelegt werden.

Die Quelle für das konkrete Datenbeispiel ist die Nutzerangabe; der private Metafield-Inhalt wurde nicht aus der öffentlichen Produktseite ausgelesen. Die öffentlichen Aarau-Produktseiten bestätigen die Zielprodukte. Diese Farbauswahl ändert keine Katalogdaten und entfernt keine Produkte aus der bestehenden Shopify-Pagination.

Produktkarten verwenden kompakte Inhaltsabstände bei weiterhin gleichen Höhen und bündigen Preisen/Links pro sichtbarer Reihe. Die PDP-Einleitung übernimmt den vollständigen ersten Absatz; alle weiteren Produktinformationen bleiben darunter verfügbar. Der Link unter der Galerie führt direkt zur Filialauswahl.

Das Redesign führt durch Bedürfnisse, Modellvergleich und Beratung. Produktinformationen, transparente Kosten und eine übersichtliche Farbauswahl unterstützen die Entscheidung bei hochwertigen Produkten. Das Shopify Theme verwendet den bestehenden Produktkatalog; die lokale Vorschau zeigt ausgewählte reale Produkte und Preise als Entwurf.

Die Überschriften verwenden die serifenlose Manrope: besonders kräftig im Einstieg, mit abgestuften Gewichten für Bereiche und Produktnamen. Die farbige letzte Zeile bleibt aufrecht gesetzt. Die variablen WOFF2-Schriftdateien sind lokal im Theme enthalten; die Original-SIL-Lizenz liegt unter `assets/manrope-license.txt`. Lange Überschriften können auf kleinen Bildschirmen sauber umbrechen. Das Original-Logo bleibt erhalten.

## Lokale Vorschau starten

Den Ordner **upswing-preview** öffnen und auf diesem Mac **START.command** doppelklicken. Die Vorschau öffnet sich unter **http://127.0.0.1:4173**; das Terminalfenster geöffnet lassen. Mit Ctrl+C wird der lokale Server beendet. Das Vorschaupaket kann auch entpackt auf einem anderen Rechner mit Python 3 gestartet werden.

Die interaktive Vorschau enthält acht echte Produktmodelle mit Farben, Grössen und Preisen als Momentaufnahme vom 12. Oktober 2026. Die vollständigen Originalbeschreibungen der 13 dargestellten Produktseiten wurden am 13. Oktober 2026 erneut abgeglichen. Produktberater, Modellvergleich, Suchvorschläge, Filter, Sortierung und ein lokal gespeicherter Warenkorb sind ausprobierbar. Der Checkout ist als Vorschau gekennzeichnet. Formulare versenden keine Nachrichten; die Anfrage kann als Text gespeichert werden.

Zusätzlich zeigt **/theme-preview.html** die Startseite aus den tatsächlichen Theme-Dateien mit lokalen Produkt- und Menübeispielen. Beide Ansichten benutzen das gemeinsame Gestaltungssystem. Diese lokale Renderingprüfung ersetzt keine Prüfung im Shopify-Shop.

## Shopify Theme installieren

**Aktuelles Installationspaket: Version 1.0.1, korrigiert am 14. Oktober 2026.**
Der erste Upload enthielt 13 von Shopify nicht erlaubte Link-Voreinstellungen in acht Section-Schemas. Sie sind entfernt; dieselben Ziele bleiben als gespeicherte Einstellungen und Liquid-Fallbacks erhalten. Alle 24 Section-Schemas, 21 JSON-Vorlagen und gespeicherten Einstellungen wurden zusätzlich zur offiziellen Theme-Prüfung gegen die betreffenden Shopify-Regeln geprüft. Der tatsächliche Upload und Betrieb im Shop bleiben die abschliessende Kontrolle.

Im bestehenden upswing-Shop sind Logo, Gestaltung, Originalbilder, bekannte Seiten- und Sortimentsziele sowie ausgewählte Produkt-Handles bereits vorbereitet. Produkte, Varianten, Kollektionen, Menüs und vorhandene Seiten müssen für die erste Vorschau nicht neu angelegt werden. Neue Seitenressourcen und die spätere Modellzuordnung sind separate Einrichtungsschritte. Ein leerer Testshop benötigt zunächst Shopdaten.

Zum erneuten Testen **upswing-shopify-theme-1.0.1.zip** als neuen unveröffentlichten Theme-Entwurf hochladen und die Startseite `/` öffnen. Die auf dem Screenshot sichtbare Route `/en` lieferte zusätzlich eine 404-Seite; Sprach- und Market-Konfiguration werden durch dieses Paket nicht verändert.


1. Im Shopify Admin **Onlineshop → Themes** öffnen. **upswing-shopify-theme.zip** im Bereich der Theme Entwürfe über **Theme importieren → ZIP Datei hochladen** hinzufügen.
2. Das neue Theme über **Anpassen** öffnen und zuerst als unveröffentlichten Entwurf einrichten. Shopify bietet dafür eine Vorschau und einen teilbaren Vorschaulink. [Shopify Theme Upload und Vorschau](https://help.shopify.com/en/manual/online-store/themes/adding-themes).
3. Die vorbereiteten Einstellungen in der Vorschau ansehen. Das Original-Logo und Beispielgestaltung sind bereits enthalten; eigene Bilder, Menüzuordnungen und Auswahlprodukte bei Bedarf im Theme Editor ändern.
4. Produktvorlage, Kollektion, Suche und Warenkorb mit dem echten Katalog prüfen. Anschliessend kann das Theme im Shopify Admin veröffentlicht werden.

Der Upload ist eine separate Theme Version. Produktdaten, Kollektionen, Menüs und Seiten werden unabhängig vom Theme verwaltet. Das Paket führt keine Produktlöschung, Migration oder automatische Katalogänderung aus. [Shopify Theme Wechsel](https://help.shopify.com/en/manual/online-store/themes/adding-themes).

## Startseite und Navigation einrichten

Die Startseite beginnt mit acht konkreten Anliegen: Fersensporn und Fussschmerzen, Rücken, Arthrose und Gelenke, müde Beine, Sport, sicheres Arbeiten, Beweglichkeit und Schlaf. Jede Bildkarte erklärt den Einstieg, nennt Produktbereiche und führt direkt zum bestehenden Themenziel. Bilder, Texte und Ziele lassen sich in der Sektion **Einstieg nach Bedürfnis** bearbeiten.

Das Sortiment ist zusätzlich über vier Einkaufswege erreichbar: **Gesund gehen**, **Bewegung und Training**, **Regeneration**, **Gesunder Arbeitsplatz**. Dazu kommen **Beratung und Filialen** und **Für Unternehmen**. Ein gut sichtbares Suchfeld unterstützt Menschen, die bereits Marke oder Modell kennen.

Im Theme Editor unter **Logo & Kontakt** das Original Logo, Logobreite, Favicon und aktuelle Kontaktdaten wählen; unter **Farben** Waldgrün, Hintergrund, Salbei, Text und Akzent prüfen. Der **Kopfbereich** erhält das Hauptmenü sowie Beratungs- und Unternehmensziel. Im **Fussbereich** die drei Menüblöcke zuordnen; Richtlinien stammen aus den Shopify Einstellungen, Zahlungslogos aus den tatsächlich aktiven Zahlungsarten.

Die Startseite enthält **Startseite · Einstieg**, **Einstieg nach Bedürfnis**, **Sortimentswelten**, **Ausgewählte Modelle**, **Persönliche Beratung**, **Für Unternehmen** und **Unsere Marken**. Bilder und Zielkollektionen zuordnen; die Auswahl mit den Primärprodukten der Modellgruppen bestücken. Beratung und Filialen verlinken. Die Servicehinweise müssen den tatsächlich angebotenen Leistungen entsprechen.

Neue Seiten anlegen und Vorlagen zuweisen: **produktberater → page.guide**, **firmenkunden → page.b2b**, **kontakt → page.contact**. Bekannte Über-uns- und Filialseiten werden in der Standardseitenvorlage anhand ihres Handles erkannt; passende Spezialvorlagen sind ebenfalls enthalten. Anschliessend die neuen Seiten in die Menüs aufnehmen.

Die Produktseite beantwortet zuerst: Was ist das Produkt, für wen passt es, was unterscheidet es, welche Farbe und Grösse ist verfügbar, was kostet es insgesamt? Die Kaufaktion bleibt sichtbar; Beratung ist eine zusätzliche Entscheidungshilfe. Ausführliche Eigenschaften, Anwendung und Pflege folgen strukturiert darunter.

## Produktinformationen als gestaltete Bereiche

Die Produktseite führt mit vier kurzen Einstiegen durch Überblick, Alltag, Details und Fragen. Drei konkrete Eigenschaften eröffnen den Informationsbereich; Anwendungen und Eignung folgen als gegliederte Abschnitte. Material und technische Werte stehen in einer übersichtlichen Tabelle, Grössenhilfe und Pflege in eigenen Bereichen. Häufige Fragen öffnen sich einzeln. Ein Beratungsabschluss erscheint einmal am Ende.

Die acht Beispielmodelle sind als kuratierte Designinhalte im Theme und in der Vorschau enthalten. Sie zeigen die spätere Darstellung vor einer Katalogmigration. Quell-Emojis, unzugeordnete Kundenstimmen und die wiederholte Beratungsaside werden in diesen Beispielen nicht dargestellt. Die gespeicherten Originalbeschreibungen bleiben in den Vorschau-Daten als Quelle erhalten; Beispielinhalte sind bewusst gegliedert und redaktionell für das Layout aufbereitet.

Für die spätere Datenpflege bevorzugt das Theme die strukturierten Produktfelder. Ohne solche Felder greifen bei den gezeigten Modellen die Designbeispiele; bei weiteren Produkten bleibt die vollständige native Beschreibung als einmaliger, formatierter Fallback erhalten. Die Inhalte werden im Shopify-Theme serverseitig ausgegeben. Kaufbereich, echte Varianten und Warenkorb bleiben an die Shopify-Produktdaten gebunden.

## Galerie beim Auswählen und Lesen

Auf dem Desktop bleiben Hauptbild und Vorschaubilder innerhalb des Kaufbereichs beim Scrollen sichtbar; vor dem Produktwissen endet diese Bindung. Sobald der obere Warenkorb-Button hinter der Navigation verschwunden ist, erscheint beim Lesen eine kompakte Produktleiste darunter. Sie belegt vorher keinen Platz im Seitenfluss und erscheint erst, wenn der ursprüngliche Warenkorb-Button nicht mehr sichtbar ist. Sie zeigt die gewählte Galerieansicht und führt auf Wunsch zur grossen Galerie zurück.

Die Leiste enthält ausserdem Preis, verfügbare Auswahlmöglichkeiten, Anzahl und „In den Warenkorb“. Das eigene Farbdropdown übernimmt Farbpunkte beziehungsweise vorhandene Bildswatches aus der Hauptauswahl. Die aktuelle Farbe ist in Auslöser und Liste markiert; Pfeiltasten bewegen den Fokus, erst Bestätigung wechselt die Farbe. Escape, Tab und ein Klick ausserhalb schliessen die Auswahl. Grösse, native Varianten, Menge und Verfügbarkeit bleiben mit dem Hauptformular synchron; Modellfarben über separate Produkte führen weiterhin zum passenden Produkt. Produkte ohne Varianten erhalten keine künstliche Auswahl. Mengenregeln und Pflichtfelder gelten auch beim Kauf aus der Leiste. Im Shopify-Theme wird das bestehende Produktformular inklusive Kaufoptionen und App-Feldern abgesendet. Die Vorschau verwendet ihren lokalen Warenkorb. Auswahl, Mengenvalidierung und Warenkorb wurden im Browser geprüft; die Formularbindung und Variantenrandfälle wurden zusätzlich mit gezielten Regressionen verifiziert.

Auf Mobilgeräten bleibt die grosse Galerie im normalen Seitenfluss; die Kaufleiste verteilt Bild, Preis und Bedienelemente auf mehrere Zeilen. Ihre tatsächliche Höhe fliesst in die Sprunglink-Abstände ein. Bei sehr wenig Bildschirmhöhe bleibt sie ausgeblendet, solange sie nicht gerade bedient wird, damit genügend Leseraum bleibt. Der obere Kaufbereich bleibt erreichbar. Bei Video- oder 3D-Medien bleibt auch die Hauptgalerie im normalen Fluss. Diese Führung ist in Vorschau und Theme integriert. Bild- und Farbwechsel, Sprunglinks, Rücksprung, das Ende des Lesebereichs und mobile Umbrüche wurden mit den Beispielprodukten geprüft. Auch in Desktopfenstern mit 720 beziehungsweise 900 Pixel Höhe bleibt die Bildergalerie vollständig bedienbar.

## Karten in einer Reihe ausrichten

Nebeneinanderstehende Karten richten ihre Höhe nach dem längsten Inhalt der jeweiligen sichtbaren Reihe. Bei Wissens-, Kategorie- und Produktkarten teilen sich Titel, Beschreibung, Preis und Abschluss ihre Zeilen, soweit diese Elemente vorhanden sind. Die Handlungslinks stehen dadurch unten bündig. Produktfarben und Modelllink stehen klar untereinander, sodass unterschiedliche Farbanzahlen die Ausrichtung erhalten.

Nach einem mobilen Umbruch wird jede neue Reihe eigenständig ausgerichtet. Die Höhenanpassung verwendet weder eine globale feste Maximalhöhe noch eine zusätzliche Textkürzung. Die gemeinsame Datei `assets/row-alignment.css` gilt für Theme und Vorschau, ohne zusätzliche Datenpflege. Sie nutzt CSS Subgrid mit einem Flex Fallback für ältere Browser. Desktop- und Mobilansichten sowie die aus den tatsächlichen Theme-Dateien gerenderten Karten wurden geprüft. In den gemessenen Kartenreihen stimmen Höhe, Preiszeilen und Linkabschlüsse überein.

## Bebilderte Produktnavigation

Alle fünf ursprünglichen Sortimentsmenüs sind wieder verfügbar: Gesundheitsschuhe, Trainingsgeräte unter Bewegung & Training, Vitalität unter Regeneration, Arbeitsplatz und Aktionen. Die Navigation enthält alle 49 Original-Unterlinks und 46 Bilder, einschliesslich der 16 Schuhbereiche und der drei Venen-Unterlinks. Desktop unterstützt Hover, Klick und Tastatur; auf Mobilgeräten öffnen sich die Bereiche als Akkordeons.

Ein Shopify-Hauptmenü mit Unterlinks wird bevorzugt. Bei einem noch flachen Menü steht die vollständige Originalstruktur als konfigurierbarer Fallback bereit. Bilder stammen zunächst aus den Original-Assets, später aus den zugeordneten Kollektionen beziehungsweise Header-Bildblöcken. Die Vorschau zeigt weiterhin die ausgewählten Beispielprodukte; ein eigener Kategoriename bleibt beim Einstieg erhalten und führt bei Bedarf zum vollständigen Sortiment des bestehenden Shops.

## Über uns und Filialen

Elf Seiten sind gestaltet: die zehn Originalrouten und der neue Einstieg **/pages/ueber-uns**. Dazu gehören die Filialübersicht, Thun, Rüti ZH, Zürich, Winterthur, Basel, Premium Service, upswing Werte, Geschichte und Offene Stellen. Die Quellseiten wurden am 13. Oktober 2026 frisch abgeglichen. Die Filialseiten enthalten Öffnungszeiten, Kontaktdaten, originale Ladenfotos und insgesamt 17 Teammitglieder mit ihren tatsächlichen Funktionen. Zwei Teamprofile verwenden die bereits im Original vorhandene Umrissgrafik.

Die Geschichte zeigt 25 belegte Chronikereignisse von 2010 bis 2025; die doppelte Basel-Meldung vom Februar 2024 erscheint einmal. Die Werte bleiben mit ihrer Verpflichtung zur biblischen Ethik und zum Schöpfer sowie **Version November 2021** erhalten. Premium Service beschreibt die vollständigen Originalleistungen und Bedingungen. [Originalfilialen](https://upswing.ch/pages/filialubersicht), [Werte](https://upswing.ch/pages/upswing-werte), [Geschichte](https://upswing.ch/pages/geschichte), [Premium Service](https://upswing.ch/pages/premium-service).

Die Standardseitenvorlage erkennt die bekannten Original-Handles automatisch und verwendet das kuratierte Seitendesign. Die bestehenden Seiten und URLs bleiben als Shop-Inhalte erhalten. Für eine ausdrückliche Zuordnung oder weitere Gestaltung sind diese sieben Vorlagen enthalten:

| Seite und Route | Shopify Vorlage |
|---|---|
| Neuer Einstieg `/pages/ueber-uns` | `page.about` |
| Übersicht `/pages/filialubersicht` | `page.locations` |
| Filialen `/pages/standort-thun`, `/pages/standort-ruti-zh`, `/pages/standort-zurich`, `/pages/standort-winterthur`, `/pages/standort-basel` | `page.location` |
| `/pages/premium-service` | `page.premium-service` |
| `/pages/upswing-werte` | `page.values` |
| `/pages/geschichte` | `page.history` |
| `/pages/offene-stellen` | `page.careers` |

Den neuen Hub später im Shopify Admin als Seite **Über uns** mit Handle **ueber-uns** anlegen, `page.about` zuweisen und im Hauptmenü verlinken. Ein Theme Upload erstellt diese neue Page nicht. Falls eine bestehende Seite eine alte Spezialvorlage verwendet, die Zuordnung im neuen Theme prüfen und bei Bedarf die passende Vorlage aus der Tabelle wählen.

Im Editor bietet die Sektion **Über uns & Filialen** einen **Seitentyp** sowie drei **Inhaltsquellen**: **Kuratiertes Seitendesign**, **Shopify Seiteninhalt** und **Template-Blöcke als Ersatz**. Beratungsziel und Filialübersicht lassen sich zuordnen. Ausserhalb des kuratierten Designs sind Kurztext, Titel, Einleitung und Titelbild einstellbar. Textabschnitt, Karte, Bild, Nächster Schritt und App-Block können ergänzt werden; im Ersatzmodus bilden sie den Seiteninhalt. Einstellungen und Blöcke gelten für alle Seiten, die dieselbe Vorlage nutzen. Für individuelle Filialpflege eigene Vorlagen oder später dynamische Datenquellen einrichten.

Die kuratierten Inhalte sind zurzeit als überprüfte Designbeispiele eingebunden. Das strukturierte Datenmodell für Filialen, Team, Galerien, Chronik und Stellen wird später eingerichtet. Der ZIP Upload legt dafür keine Metaobjects oder Datenmigration an. Zur laufenden Inhaltspflege können zunächst der Shopify Seiteninhalt oder die Editor-Blöcke verwendet werden; Änderungen am nativen Seiteninhalt erscheinen erst bei Auswahl dieser Inhaltsquelle.

Die Originalseite nennt eine **Verkaufsstelle in Winterthur mit 20 %**. Ihr verlinktes PDF lieferte beim Abgleich HTTP 404. Die Gestaltung verweist deshalb auf **Stelleninfos anfragen** beziehungsweise **Kontakt aufnehmen**; Anforderungen, Eintrittsdatum und Bewerbungskontakt werden nicht erfunden. Vor Veröffentlichung die aktuelle Ausschreibung und den Kontaktweg prüfen. [Originalseite Offene Stellen](https://upswing.ch/pages/offene-stellen).

## Farben zu Modellen gruppieren

Die sechs Beispielprodukte in **modellzuordnung-beispiel.csv** sind zwei reale Modelle: kybun Magglingen Herren und kybun Burgdorf Herren, jeweils in drei Farben zu CHF 320. Die CSV ist eine Zuordnungsvorlage und kein direkt importierbares Shopify Produktformat. `sibling_handles` trennt die anderen Farbprodukte mit `|`; im Admin werden daraus Produktreferenzen.

Für **Produkte** diese Metafield Definitionen anlegen. Die technischen Typnamen entsprechen Shopify; einzeiliger Text heisst dort `single_line_text_field`. Definitionen lassen sich über ein geöffnetes Produkt im Bereich Metafields hinzufügen. [Shopify Metafield Definitionen](https://help.shopify.com/en/manual/custom-data/metafields/metafield-definitions/creating-custom-metafield-definitions), [Datentypen](https://shopify.dev/docs/apps/build/metafields/list-of-data-types).

| Namespace und Schlüssel | Shopify Typ | Verwendung |
|---|---|---|
| `upswing.model_key` | `single_line_text_field` | Gemeinsamer stabiler Schlüssel, z. B. `kybun-magglingen-men` |
| `upswing.model_primary` | `boolean` | Genau ein Primärprodukt je Modell |
| `upswing.model_products` | `list.product_reference` | Andere Farbprodukte des Modells, ohne das aktuelle Produkt |
| `upswing.color_name` | `single_line_text_field` | Lesbarer Farbname neben Farbauswahl |
| `upswing.color_hex` | `color` | Farbwert für den Farbpunkte; Name bleibt lesbar |
| `upswing.model_name` | `single_line_text_field` | Modellname ohne Farbe, z. B. kybun Magglingen Herren |

Alle Farbprodukte erhalten denselben Modellschlüssel und Modellnamen. `model_products` enthält jeweils die anderen Farben, ohne das aktuelle Produkt; dessen Farbpunkt ergänzt das Theme selbst. Einzelfarbige Modelle erhalten ebenfalls `model_primary = true`. Die jeweilige Farbe bleibt ein eigenständiges Produkt mit ihren vorhandenen Varianten, Lagerdaten und URLs. Geschlecht, technische Ausführung, Modellgeneration und Bundle Inhalte sind Kriterien für getrennte Modellgruppen.

Für saubere Zählung und Pagination eigene **Modellkollektionen** mit nur den Primärprodukten pflegen und diese in Navigation und Startseite zuordnen. Das Theme unterdrückt keine Farbprodukte automatisch: Eine bestehende Kollektion mit allen Farben zeigt weiterhin alle Einträge. Die Farbauswahl öffnet die verknüpften Produktseiten. Farb- und Grössenfilter vor Veröffentlichung mit den tatsächlichen Kollektionen prüfen. Native Shopify Filter berücksichtigen die Daten der Primärprodukte; verknüpfte Farbgeschwister werden nicht automatisch als Filterdaten zusammengeführt. Im Modellmodus werden deshalb nur ausdrücklich erlaubte Filter angezeigt. Die Editor Einstellung `model_filter_parameters` enthält standardmässig Marke, Produkttyp und `filter.p.m.upswing.model_colors`. Ein optionales `upswing.model_colors` als `list.single_line_text_field` muss dafür alle Farben des Modells am Primärprodukt abbilden und in Shopify Search & Discovery als Filter eingerichtet werden. Preis, Grösse, einzelne Produktfarben und Lagerfilter bleiben im Modellmodus verborgen, bis passende Modelldaten geprüft sind. [Shopify Filter einrichten](https://help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-filters).

Optional ergänzen diese Produkt Metafields die ausführliche Kaufberatung. Die strukturierten Bereiche bevorzugen diese Felder; die native Produktbeschreibung bleibt als Fallback erhalten.

| Schlüssel im Namespace `upswing` | Shopify Typ | Inhalt |
|---|---|---|
| `short_description` | `multi_line_text_field` | Kurze verständliche Einordnung |
| `benefits` | `list.single_line_text_field` | Wenige belegte Eigenschaften beziehungsweise Nutzen Hinweise |
| `suitability`, `specifications`, `size_guide`, `care`, `faq` | `rich_text_field` | Eignung, technische Daten, Grössenhilfe, Pflege und häufige Fragen |
| `delivery_note` | `multi_line_text_field` | Produktspezifische Lieferinformation |
| `related_products` | `list.product_reference` | Passende ergänzende Produkte |

Für die gestalteten Informationsbereiche sind zusätzlich diese optionalen Felder vorgesehen. Listen referenzieren Metaobjects mit den genannten Feldern; deren Pflichtfelder werden bei der späteren Dateneinrichtung festgelegt.

| Schlüssel im Namespace `upswing` | Shopify Typ | Felder beziehungsweise Inhalt |
|---|---|---|
| `features` | `list.metaobject_reference` | `title` als Text, `body` als mehrzeiliger Text; bis zu drei Eigenschaften |
| `everyday_topics` | `list.metaobject_reference` | `title` als Text, `body` als Richtext; Anwendung und Gehgefühl |
| `introduction` | `rich_text_field` | Eingewöhnung beziehungsweise erste Anwendung |
| `technical_specs` | `list.metaobject_reference` | `label` und `value` als Text; technische Angaben |
| `faq_items` | `list.metaobject_reference` | `question` als Text, `answer` als Richtext |

Ein Modellvergleich kann bis zu drei Modelle auf dem jeweiligen Gerät merken. Er verwendet localStorage; gespeicherte Preise sind eine Orientierung und werden auf der Produktseite erneut geprüft.

## Unternehmen und Fachhandel getrennt führen

Die neue Unternehmensseite spricht Betriebe an, die Produkte für Mitarbeitende einkaufen: Arbeitsplatz, Bewegung und Regeneration. Die Anfrage erfasst Firma, Bedarf, Anzahl Mitarbeitende beziehungsweise gewünschte Menge und Kontakt. Konkrete Konditionen werden im Angebot vereinbart.

Die bestehende Route **Fachhandel und Wiederverkauf** bleibt separat erreichbar. Die aktuelle upswing B2B Seite richtet sich an Fachgeschäfte; sie belegt keine pauschalen Mengenrabatte, Rechnungskauf oder Mitarbeitendenprogramme. [Aktuelle B2B Ausrichtung](https://upswing.ch/pages/b2b).

## Aktuelle Shopinformationen

Stand 12. Oktober 2026: Versand in Schweiz und Liechtenstein; CHF 8, ab CHF 99 kostenlos, unter CHF 20 zusätzlich CHF 5 Mindermengenzuschlag. [Versand](https://upswing.ch/policies/shipping-policy).

Rückgabe innerhalb 14 Tagen anfordern; ungetragene, ungenutzte Ware mit Etiketten und Originalverpackung. Ausnahmen gelten unter anderem für Hygieneartikel, reduzierte Artikel und Gutscheine. Die Kurzfassung auf der Produktseite verlinkt die vollständigen Bedingungen. [Rückgabe](https://upswing.ch/policies/refund-policy).

Zwei Jahre Premium Service sind beim Kauf von kybun und Joya enthalten. Beratung ist in Thun, Rüti ZH, Zürich, Winterthur und Basel verfügbar. [Premium Service](https://upswing.ch/pages/premium-service), [Filialen](https://upswing.ch/). Der Betreiber pflegt aktuelle Produkttexte, Servicebedingungen, Bildrechte und Markenfreigaben.

## Forschung und Erfolgsmessung

Eine Modellkarte mit Farbanzahl und Farbauswahl verbessert den Sortimentüberblick. [Baymard Varianten bündeln](https://baymard.com/research-articles/combine-variations-one-list-item). Verständliche Feature Highlights unterstützen die Prüfung komplexer Produkte. [Baymard Produktinformationen](https://baymard.com/research-articles/structure-descriptions-by-highlights). Rückgabeinformationen gehören unmittelbar auf die Produktseite, besonders bei hohen Preisen. [Baymard Produktseiten](https://baymard.com/research-articles/current-state-ecommerce-product-page-ux).

Sichtbarer Tastaturfokus, ausreichender Kontrast, lesbare Farbnamen und bedienbare Dialoge folgen den [Shopify Accessibility Empfehlungen](https://shopify.dev/docs/storefronts/themes/best-practices/accessibility). Die Wirkung auf upswing ist eine Conversion Hypothese und keine Umsatzgarantie. Nach Einführung Kaufquote, Produktseite zu Warenkorb, Sucherfolg und qualifizierte Beratungsanfragen messen; keine erfundenen Bewertungen oder Dringlichkeit einsetzen.

## Prüfung vor Veröffentlichung

Mit dem unveröffentlichten Theme prüfen: reale Farben und Grössen, Bestände, Preisänderungen, Warenkorb hinzufügen/ändern/entfernen, Versandkosten und Zuschlag, Checkout und Zahlungsarten, Konto und Rabatte. Unternehmensanfrage inklusive erfolgreicher Zustellung testen. Mobile Ansicht, Tastatur, Dialoge, Kontrast und Ladezeit prüfen. Bestehende Apps, Analytics und Einwilligung integrieren; alle Navigationsziele, Richtlinien und Beratungstermine durchgehen.

## Modellgruppierung in der Suche

Unter **Theme-Einstellungen → Modellkatalog** lässt sich **Suche nach Produktmodellen gruppieren** aktivieren. Zuvor auf jedem Produkt `upswing.model_primary` pflegen und diesen Boolean-Metafieldfilter in Shopify Search & Discovery einrichten. Alle Einzelmodelle ebenfalls als Primärprodukt markieren. Die Suchformulare fragen dann serverseitig nur Primärmodelle ab; so bleiben Trefferanzahl und Pagination korrekt. Ohne diese Einrichtung bleibt die native Suche vollständig und zeigt die bestehenden Farbprodukte.

Die erlaubten Modellfilter in der Suche sind explizit konfigurierbar. Für die verfügbaren Farben kann `upswing.model_colors` als `list.single_line_text_field` am Primärprodukt die Farbunion abbilden. Preis-, Grössen- und Lagerfilter erst freigeben, wenn die hinterlegten Daten das ganze Modell zuverlässig abbilden. Bei unterschiedlichen Farbpreisen das günstigste Farbprodukt als Primärprodukt bestimmen, damit Preis-Sortierung und angezeigter Modell-Abpreis zusammenpassen.

## Durchgeführte Prüfung

Shopifys offizieller Theme Check: **keine Fehler und keine Warnungen**. JSON-Vorlagen, Section-Schemas und Assetverweise geprüft. In der interaktiven Vorschau wurden Produktberater, Farbwechsel, Vergleich, Grössenwahl, Warenkorb hinzufügen/ändern/entfernen, Suche, Preisfilter, Sortierung und lokale Firmenanfrage ausprobiert. Desktop und 390-Pixel-Mobilansicht geprüft; keine fehlenden Bilder oder horizontale Überläufe in den geprüften Ansichten.

Die Originalbeschreibungen aller 13 Produktseiten sind als Quellen gespeichert. Die aktuelle gestaltete Ausgabe wurde auf eindeutige Fakten, gegliederte Inhalte, einen einzigen Beratungsabschluss, FAQ-Bedienung und mobile Umbrüche geprüft. Die 49 Menülinks und 46 Bildzuordnungen wurden gegen das Originalmenü abgeglichen.

Eine authentifizierte Shopify-Laufzeit wurde nicht verbunden. Reale Formularzustellung, Shop-Apps, Checkout, Zahlungsarten und Katalogzuordnungen sind deshalb im unveröffentlichten Shop-Theme zu prüfen.

## Native Farben und Modellfarben

Hat ein Shopify-Produkt bereits eine native Option **Farbe**, **Color** oder **Colour**, zeigt die Produktseite nur diese Farbauswahl. Eine zusätzliche statische Modellfarbe beziehungsweise ein paralleler Farbschwister-Picker wird dann unterdrückt. Produkte ohne native Farboption nutzen die explizite Modellzuordnung. Schuhgrössen bleiben eine eigene Auswahl.

Die lokale Vorschau übernimmt bei den 46-cm- und 96-cm-Stehmatten die echten Farbvarianten und ihre IDs. Ein einziger Farbwechsel aktualisiert Bild, verfügbare Variante und Warenkorbeintrag.

Bei der bestehenden 46-cm-Matte verweisen die öffentlich übernommenen Daten für beide Farben auf das Anthrazitbild; bei der 96-cm-Matte sind keine Variantenbilder zugeordnet. Vor der Live-Freigabe die vorhandenen Bordeaux-/Anthrazitbilder im Shopify-Admin der jeweiligen Variante richtig zuordnen. Die Vorschau verwendet dafür bereits die eindeutig passenden Originalbilder.

## Vollbildgalerie und Kaufbereich

Unter dem Hauptbild zeigt die Vorschaureihe vier gleich grosse, quadratische Bilder pro sichtbarer Reihe. Zusammen mit den Abständen füllen sie die gesamte Breite des Hauptbilds aus. Weitere Shopify-Originalbilder bleiben horizontal erreichbar. Die lokale Magglingen-Vorschau enthält je Farbe die ersten vier Originalbilder.

Die Produktbilder öffnen per Klick eine Vollbildgalerie. Auf dem Desktop stehen die Kaufoptionen rechts, mobil unter dem Bild. Dieser Kaufbereich ist ausschliesslich in der geöffneten Galerie sichtbar. Bildpfeile und Vorschaubilder wechseln die Ansicht; X beziehungsweise Escape schliessen den Dialog. Ein geöffnetes Farbmenü wird mit dem ersten Escape geschlossen, die Bildansicht mit dem nächsten.

Die Galerie verwendet dieselben Kaufsteuerungen wie der Produktstreifen beim Lesen und übermittelt über das ursprüngliche Produktformular. Preis, Bestand, Farboptionen, Grössen, Mengenregeln, Verkaufspläne und Formularfelder bleiben erhalten. Beim Wechsel auf eine andere Modellfarbe werden verfügbare Auswahlen anhand ihrer Bezeichnung übernommen. Nach erfolgreichem Hinzufügen schliesst die Vollbildgalerie. Die Produktauswahl und Bildansicht bleiben erhalten; in der lokalen Vorschau erscheint die normale Warenkorbbestätigung auf der Produktseite. Ungültige Mengen und nicht verfügbare Varianten werden nicht hinzugefügt. Formularfehler bleiben sichtbar; notwendige Eingaben im ursprünglichen Formular werden zur Korrektur freigegeben. Im Shopify-Theme gilt weiterhin das normale Verhalten des bestehenden Warenkorbformulars; nach dessen erfolgreicher Rückkehr wird die Galerie ebenfalls geschlossen gehalten.

Geprüft wurden Desktop und Mobil, Bildwechsel, Maus- und Tastaturbedienung des Farbmenüs, erhaltene Grösse und Menge bei Farbwechsel, Direktkauf mit anschliessend korrektem lokalen Warenkorbeintrag und das Schliessen der Galerie. Die ergänzenden Formularprüfungen kontrollieren Verkaufspläne, eigene Produktfelder, Mengenregeln sowie das Freigeben des Originalformulars bei erforderlichen Eingaben.

## Einheitliche Mengenwahl

Produktformular, Kaufstreifen beim Lesen, Vollbildgalerie und Warenkorb verwenden sichtbare Minus- und Plus-Tasten neben dem Mengenfeld. Der gemeinsame Mengen-Stepper erhält die ursprünglichen Eingabefelder und Formulardaten. Er liest die Mengenregeln bei Variantenwechsel neu; Plus beziehungsweise Minus sind an den zulässigen Grenzen deaktiviert. Direkte Eingabe bleibt möglich. Der native Warenkorb unterstützt weiterhin 0 zum Entfernen und hält positive Mengen an das Variantenminimum und die Schrittweite. Änderungen werden dort mit dem bestehenden Aktualisieren- beziehungsweise Checkout-Formular gespeichert.

## Beratung vor Ort direkt zur Filialauswahl

Verweise zur persönlichen Beratung oder Anprobe vor Ort führen direkt zu `/pages/filialubersicht#Filialen`. Dort beginnt die bestehende Auswahl der fünf Schweizer Filialen. Dies gilt für Produkte und Produktwissen, Grössenhilfe, Ratgeber, Startseitenberatung sowie die passenden Verweise in Header, Footer und About-Seiten. Die Vorschau unterstützt weiterhin `/pages/beratung` als Seitenalias.

Das native Theme normalisiert konfigurierte Links zur Filialübersicht mit einem Liquid-Helfer. Bereits gezielt gesetzte Filialanker bleiben erhalten. Ein gemeinsamer Linkabgleich unterstützt zusätzlich Navigation und importierte Seiten- beziehungsweise Produktinhalte, ohne deren Quelldaten zu ändern. Kontakt-, Firmen-, Telefon- und E-Mail-Ziele bleiben entsprechend ihrer Funktion erreichbar.


Kontaktseite: Die fünf Standorte stehen als anklickbare Namen in einer Zeile. Jeder Name bringt die passende Filialkarte in der horizontalen Reihe ins Blickfeld; die sichtbare Filiale wird markiert. Darunter lassen sich dieselben Filialkarten wie in der Übersicht horizontal durchscrollen – mit Pfeilen, Touch-Gesten oder den Pfeil-/Home-/End-Tasten bei fokussierter Reihe. Die Karten haben dieselbe Höhe und verlinken direkt zu Öffnungszeiten und Team der jeweiligen Filiale.


## Mobile Kaufleiste und Bildansicht

Auf Mobilgeräten sitzt die Kaufleiste am unteren Bildschirmrand. Beim Weiterlesen erscheint sie, sobald die ursprüngliche Schaltfläche **In den Warenkorb** den sichtbaren Bereich verlassen hat. Marke, Modell und Produkttyp bleiben sichtbar; Farbe und Grösse stehen in der ersten Auswahlreihe; Menge mit Minus-/Plus-Tasten und Kaufbutton folgen in einer kompakten, 46 px hohen Kaufreihe. Die Auswahl bleibt mit dem ursprünglichen Produktformular synchron. Die Desktop-Führung bleibt wie beschrieben.

Die mobile Vollbildgalerie verwendet wieder die bisherige Bildgalerie mit eigenem Kaufpanel. Dort bleiben Produktname, Farbe, Preis und Verfügbarkeit sichtbar. Die kompakte mobile Leseleiste erscheint ausschliesslich ausserhalb der Vollbildgalerie. Bildwechsel, Produktauswahl und Mengenregeln verwenden weiterhin das ursprüngliche Formular.

Für die spätere Datenpflege kann optional `upswing.product_kind` als `single_line_text_field` eingerichtet werden. Ohne dieses Feld dient der native Shopify Wert `product.type` als Grundlage. Eine kybun- oder leguano-Schuhart wird nur bei einem bestätigten Produkttyp **Schuh** verwendet; die Marke allein bestimmt den Produkttyp nicht.


Die mobile Quick-buy-Leiste bleibt nach dem Verschwinden des ursprünglichen Kaufbuttons bis zum Seitenende verfügbar, auch bei den Produktempfehlungen und im Footer. Beim Zurückscrollen zum ursprünglichen Kaufbutton blendet sie sich wieder aus. Ein reservierter Abstand am Seitenende hält die Footer-Links erreichbar. Die Desktop-Begrenzung und die mobile Vollbildansicht bleiben unverändert.


Filialbilder im Menü: Unter «Unsere Filialen» stehen die fünf Standorte als zweispaltige Bildkarten mit Direktlinks zur jeweiligen Filiale. Der gemeinsame Link zu allen Filialen und Öffnungszeiten bleibt oberhalb erhalten. Im Shopify-Theme lassen sich die Bilder über die vorhandenen Header-Blöcke «Navigation · Bild» überschreiben.


Premium-Service-Gestaltung: Die fünf Leistungskarten enthalten kleine Icons und sanftes Einblenden beim Scrollen. Tasse, Reinigung, Ozon-Schutz und Schuhabdrücke greifen die ursprünglichen Motive auf; die Pflegeflasche ergänzt den Vorteil auf Pflegemittel. Die Icon-Bewegungen laufen kurz und enden automatisch. Bei reduzierter Bewegung oder ohne JavaScript bleiben die Karten statisch und lesbar. Der Absatz im Werte-Banner nutzt die volle Textbreite; Ausschreibungen nutzen die gesamte Inhaltsbreite.

Filialgalerien in mehreren Zeilen: Sämtliche Vorschaubilder sind sichtbar, mit bis zu vier quadratischen Bildern pro Zeile. Weitere Fotos beginnen in einer zweiten Zeile. Die zusätzliche Bildanzahl und Scroll-Pfeile über der Vorschauleiste entfallen. Hauptbild-Pfeile und Vollbildansicht bleiben erhalten; auch im Vollbild stehen alle Vorschaubilder in Zeilen.

Filialbesuch im Überblick: Auf Desktop stehen Einstieg und kompakte Kontaktkarte mit Adresse, Kontaktdaten und Öffnungszeiten direkt links neben der Galerie. Auf mobile folgen Einstieg, Galerie und Kontaktkarte untereinander. Der Sprung zu Kontakt & Öffnungszeiten führt weiterhin zum Kontaktblock. Die Karte zur Anreise steht danach in voller Inhaltsbreite.
