# Navigation im unveröffentlichten Theme

Stand: 24. November 2026. Der Entwurf `shopify-theme/main` verwendet im Kopfbereich `[Simon] Hauptmenü` (`simon-hauptmen`, ID `336014836096`) und `[Simon] Über Uns` (`simon-ber-uns`, ID `336014868864`). Das aktive bisherige Theme verwendet das separate `Hauptmenu`. Änderungen für den Entwurf erfolgen ausschliesslich in den beiden Menüs mit `[Simon]`-Präfix.

Die Menüeinträge sind Shopify-Shopdaten. Ein GitHub-Release liefert die Darstellung und die gespeicherten Bildvorgaben; es legt keine Shopify-Menüs an. Bei einer neuen Installation die beiden Menüs im Theme-Editor auswählen und die verknüpften Ressourcen prüfen.

## Sortiment und Aktionen

Die bestehenden Sortiments-Unterpunkte bleiben erhalten. Die beiden zuvor nicht vorhandenen Zieladressen `/collections/bewegung` und `/collections/regeneration` werden durch die tatsächlich vorhandenen Kollektionen ersetzt:

| Menüeintrag | Vorhandenes Ziel |
| --- | --- |
| Bewegung & Training | `/collections/trainingsgerate` |
| Regeneration | `/collections/vitalitat` |
| Aktionen → leguano Aktion | `/collections/leguano-outlet` |
| Aktionen → Venen Engel Aktion | `/collections/venen-engel-211` |
| Aktionen → Geschenkideen | `/collections/geschenkideen` |

Joya-Sale und reduziertes Schuhzubehör behalten ihre bestehenden Einträge. Leere Aktionskollektionen werden nicht allein aufgrund ihres Vorhandenseins in das Menü aufgenommen. Kollektionen und ihre Regeln, Titel, Handles und AICO-Daten werden durch die Menüpflege nicht geändert.

## Wissen, Beratung und Kurse

Der eigene Hauptmenüpunkt `Wissen & Ratgeber` verweist auf `/pages/themen`. Folgende vorhandene Seiten stehen als direkte Unterpunkte darunter:

| Unterpunkt | Vorhandene Seite |
| --- | --- |
| Fersensporn & Fussschmerzen | `/pages/fersensporn-und-andere-fussschmerzen` |
| Rückenschmerzen | `/pages/ruckenschmerzen` |
| Arthrose & Gelenkschmerzen | `/pages/arthrose-und-gelenkschmerzen` |
| Regeneration im Schlaf | `/pages/regeneration-im-schlaf` |
| Venen Engel Beratung | `/pages/venen-engel-beratung-buchen` |
| bellicon Beratung | `/pages/bellicon-beratung-buchen` |
| BLACKROLL Matratzenberatung | `/pages/blackroll-base-beratung-buchen` |
| Sypoba Training in Thun | `/pages/sypoba-training-in-thun` |
| bellicon Training in Rüti ZH | `/pages/bellicon-training-ruti-zh` |

Die zusätzliche Wissenslink-Einstellung im Kopfbereich bleibt auf `/pages/themen`. Wenn diese Adresse bereits als echter Menüpunkt vorhanden ist, unterdrückt das Theme den automatisch ergänzten Link. So erscheinen die neun Unterpunkte in einem einzigen Menü.

Für jede dieser Seiten ist im Kopfbereich ein Block `Navigation · Bild` mit der jeweiligen ursprünglichen Seitenfotografie gespeichert. Die Vorgaben verwenden bestehende Shopify-Dateien und bleiben im Theme-Editor austauschbar. Gemeinsam verwendete Fotografien benötigen keine zusätzlichen Bildkopien.

Die erfasste Einrichtung enthält 67 eindeutige Einträge im Hauptmenü und zehn Einträge im separaten Über-uns-Menü. Alle bisherigen Verkaufs-, Beratungs- und Kursziele des alten Menüs bleiben über diese Einstiege erreichbar; die vier Sortiments-Übersichten führen im neuen Menü bewusst zu den entsprechenden Kollektionen.

## Prüfung vor Aktivierung

- Das ausgewählte Hauptmenü des Entwurfs muss `[Simon] Hauptmenü` sein; das bisherige Live-Theme behält seine eigene Zuordnung.
- Alle vorhandenen Verkaufs-Unterpunkte und die bisherigen Beratungs- und Kursziele auf Desktop und Mobil prüfen. Die geänderten Sortiments-Übersichten führen bewusst zu Kollektionen; die zugehörigen Inhaltsseiten bleiben unter ihren bestehenden URLs erreichbar.
- Aktionen und Wissen-Menü öffnen und die nativen Vorschaubilder prüfen. Für Bilder von Kollektionen dienen deren vorhandene Shopify-Bilder beziehungsweise Produktbilder als Quelle.
- Eine längere Menüstruktur erzeugt weder doppelte Wissenslinks noch doppelte Zielkarten. `Über uns`, Filialen, Beratung und `Für Unternehmen` behalten ihre eigenständigen Einstiege.
- Ein Theme-Release veröffentlicht das Theme nicht im Shop. Die Aktivierung übernimmt der Shopbetreiber nach Prüfung der Vorschau.

## Bilder vorbereiten

Nach dem vollständigen Seitenaufbau werden die vorhandenen responsiven Menübilder in Leerlaufphasen mit niedriger Ladepriorität vorbereitet. Höchstens zwei Hintergrundbilder laden gleichzeitig; Hover und Tastaturfokus ziehen das betreffende Menü vor. Bildadressen, `srcset` und `sizes` bleiben erhalten.

Automatisches Vorladen pausiert in ausgeblendeten Tabs, kleinen Touch-Ansichten, bei Datensparmodus und erkannten langsamen Verbindungen. Ein bewusst geöffnetes Menü lädt seine Bilder regulär. Im Theme-Editor werden Zeitgeber und Ereignisbeobachter beim Entfernen des Kopfbereichs aufgeräumt.
