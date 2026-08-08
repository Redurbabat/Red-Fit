/* ============================================================
 * 🏋️ RED Gym — Übungskatalog (Nachtschicht Block 5).
 * 107 Übungen (100 AuraGym + 7 Core) (14 Grundübungen + 16 Ausbau Phase 3), je: Muskelgruppen, 4 Technik-Schritte, 3 typische
 * Fehler, 1 Profi-Tipp. Inhalte vor Show — bewusst ohne 3D (Annahme:
 * eisen-3d-gym.jsx existiert nicht im Repo; R3F = Tag-Session-Entscheid).
 * ============================================================ */

export interface GymUebung {
  id: string;
  name: string;
  emoji: string;
  muskeln: string[];
  equipment: GymEquipment;
  schritte: string[];
  fehler: string[];
  tipp: string;
  beschreibung?: string;
  englischerName?: string;
  gruppe?: MuscleGroup;
  level?: GymLevel;
  kalorien10Min?: number;
  sekundarMuskeln?: string[];
  hinweise?: string[];
  animationType?: GymAnimation;
  quelle?: "red-core" | "auragym";
}

export type GymEquipment = "Langhantel" | "Kurzhantel" | "Körpergewicht" | "Maschine/Kabel" | "Kettlebell" | "Bänder";
export type GymLevel = "Anfänger" | "Mittel" | "Fortgeschritten";
export type GymAnimation = Exercise["animationType"];

const CORE_UEBUNGEN: GymUebung[] = [
  {
    id: "kniebeuge", name: "Kniebeuge (Squat)", emoji: "🦵", equipment: "Langhantel",
    muskeln: ["Quadrizeps", "Gesäß", "Rumpf"],
    schritte: [
      "Stange auf dem oberen Trapez ablegen, Füße schulterbreit, Zehen leicht nach außen.",
      "Rumpf anspannen, tief einatmen, Blick nach vorn.",
      "Kontrolliert absenken, bis die Hüfte mindestens auf Kniehöhe ist — Knie folgen der Fußspitze.",
      "Über die ganze Fußsohle kraftvoll aufstehen, oben ausatmen.",
    ],
    fehler: ["Fersen heben ab (Gewicht auf den Zehen)", "Knie kippen nach innen", "Rücken rundet im unteren Bereich ein"],
    tipp: "Erst die Tiefe mit leerem Stab meistern — Beweglichkeit vor Gewicht.",
  },
  {
    id: "bankdruecken", name: "Bankdrücken", emoji: "🛋", equipment: "Langhantel",
    muskeln: ["Brust", "Trizeps", "vordere Schulter"],
    schritte: [
      "Schulterblätter zusammenziehen und in die Bank drücken, Füße fest am Boden.",
      "Stange etwas breiter als schulterbreit greifen, aus dem Ständer heben.",
      "Kontrolliert zur unteren Brust absenken, Ellbogen ~45° zum Körper.",
      "Explosiv nach oben drücken, Handgelenke gerade halten.",
    ],
    fehler: ["Po hebt von der Bank ab", "Stange prellt auf der Brust", "Ellbogen flattern zu weit außen (90°)"],
    tipp: "Ohne Spotter: Sicherheitsablagen einstellen oder in der Multipresse arbeiten.",
  },
  {
    id: "kreuzheben", name: "Kreuzheben (Deadlift)", emoji: "🏋️", equipment: "Langhantel",
    muskeln: ["unterer Rücken", "Gesäß", "Beinbeuger", "Griffkraft"],
    schritte: [
      "Stange über der Fußmitte, Schienbeine fast an der Stange.",
      "Hüfte nach hinten, Rücken lang und neutral, Griff knapp außerhalb der Beine.",
      "Brust raus, Zug aufbauen — dann Beine und Hüfte GLEICHZEITIG strecken.",
      "Oben Hüfte ganz strecken (nicht überstrecken), kontrolliert absetzen.",
    ],
    fehler: ["Runder unterer Rücken", "Stange wandert vom Körper weg", "Hüfte schießt zuerst hoch (Steifbeinheben ungewollt)"],
    tipp: "Jede Wiederholung aus totem Stand aufbauen — kein Abprallen vom Boden.",
  },
  {
    id: "schulterdruecken", name: "Schulterdrücken (Overhead Press)", emoji: "💪", equipment: "Langhantel",
    muskeln: ["Schultern", "Trizeps", "Rumpf"],
    schritte: [
      "Stange auf Schlüsselbeinhöhe, Unterarme senkrecht, Körper fest angespannt.",
      "Gesäß und Bauch anspannen — kein Hohlkreuz.",
      "Stange eng am Gesicht vorbei nach oben drücken.",
      "Oben Kopf leicht „durchs Fenster“ schieben, Arme ganz strecken.",
    ],
    fehler: ["Starkes Hohlkreuz (Rumpf locker)", "Stange weit vor dem Körper", "Schwung aus den Beinen (ungewollt)"],
    tipp: "Wenn du Schwung brauchst, ist das Gewicht (noch) zu schwer.",
  },
  {
    id: "klimmzug", name: "Klimmzug", emoji: "🧗", equipment: "Körpergewicht",
    muskeln: ["Latissimus", "Bizeps", "Unterarme"],
    schritte: [
      "Etwas breiter als schulterbreit greifen, aus dem hängenden Stand starten.",
      "Schulterblätter nach unten-hinten ziehen (Schultern weg von den Ohren).",
      "Ellbogen Richtung Hüfte ziehen, bis das Kinn über der Stange ist.",
      "Langsam und kontrolliert komplett ablassen.",
    ],
    fehler: ["Halbe Wiederholungen (nie ganz gestreckt)", "Kippen/Schwungholen", "Schultern hochgezogen"],
    tipp: "Noch keiner möglich? Negativ-Klimmzüge (nur langsames Ablassen) oder Band-Unterstützung.",
  },
  {
    id: "rudern_lh", name: "Langhantel-Rudern", emoji: "🚣", equipment: "Langhantel",
    muskeln: ["oberer Rücken", "Latissimus", "hintere Schulter"],
    schritte: [
      "Hüfte nach hinten, Oberkörper ~45° oder tiefer, Rücken neutral.",
      "Stange hängen lassen, Schulterblätter aktiv.",
      "Zur unteren Brust/oberen Bauch ziehen, Ellbogen nah am Körper.",
      "Kontrolliert strecken, ohne den Oberkörper aufzurichten.",
    ],
    fehler: ["Aufrichten bei jeder Wiederholung (Schwung)", "Runder Rücken", "Nur Arme statt Rücken ziehen"],
    tipp: "Denk „Ellbogen in die Hosentasche“ — dann arbeitet der Rücken.",
  },
  {
    id: "liegestuetz", name: "Liegestütz", emoji: "🤸", equipment: "Körpergewicht",
    muskeln: ["Brust", "Trizeps", "Rumpf"],
    schritte: [
      "Hände unter den Schultern, Körper eine Linie von Kopf bis Ferse.",
      "Bauch/Gesäß anspannen (Plank-Spannung halten).",
      "Brust kontrolliert Richtung Boden, Ellbogen ~45°.",
      "Kraftvoll hochdrücken, ohne die Hüfte hängen zu lassen.",
    ],
    fehler: ["Hüfte hängt durch", "Nur halbe Tiefe", "Ellbogen zeigen ganz nach außen"],
    tipp: "Zu schwer? Hände erhöht abstützen (Bank/Tisch) statt auf die Knie zu gehen.",
  },
  {
    id: "ausfallschritt", name: "Ausfallschritte (Lunges)", emoji: "🚶", equipment: "Kurzhantel",
    muskeln: ["Quadrizeps", "Gesäß", "Balance"],
    schritte: [
      "Aufrecht stehen, Kurzhanteln seitlich halten.",
      "Großer Schritt nach vorn, Oberkörper bleibt aufrecht.",
      "Hinteres Knie Richtung Boden senken (beide Knie ~90°).",
      "Über die vordere Ferse zurückdrücken in den Stand.",
    ],
    fehler: ["Vorderes Knie schiebt weit über die Zehen hinaus", "Zu kleiner Schritt (Kniewinkel spitz)", "Oberkörper kippt vor"],
    tipp: "Erst ohne Gewicht sauber, dann langsam steigern — Balance ist die halbe Übung.",
  },
  {
    id: "huftheben", name: "Hip Thrust / Hüftheben", emoji: "🍑", equipment: "Langhantel",
    muskeln: ["Gesäß", "Beinbeuger"],
    schritte: [
      "Oberer Rücken auf der Bank, Stange (gepolstert) über der Hüfte.",
      "Füße hüftbreit, Schienbeine am oberen Punkt senkrecht.",
      "Hüfte nach oben drücken, bis Oberschenkel und Rumpf eine Linie bilden.",
      "Oben 1 s das Gesäß bewusst anspannen, langsam ablassen.",
    ],
    fehler: ["Überstrecken im unteren Rücken", "Kinn Richtung Decke (Nacken überstreckt)", "Zu schnelles Abfedern"],
    tipp: "Blick nach vorn (nicht zur Decke) hält die Wirbelsäule neutral.",
  },
  {
    id: "rdl", name: "Rumänisches Kreuzheben (RDL)", emoji: "🦴", equipment: "Langhantel",
    muskeln: ["Beinbeuger", "Gesäß", "unterer Rücken"],
    schritte: [
      "Stange aus dem Stand vor den Oberschenkeln, Knie leicht gebeugt.",
      "Hüfte nach hinten schieben, Stange eng an den Beinen abwärts führen.",
      "Bis zur spürbaren Dehnung im Beinbeuger absenken (Rücken neutral!).",
      "Mit der Hüfte nach vorn wieder aufrichten.",
    ],
    fehler: ["Rücken rundet ein", "Knie beugen zu stark (wird Kniebeuge)", "Stange wandert vom Körper weg"],
    tipp: "Bewegungsende ist dort, wo dein Rücken gerade bleibt — nicht der Boden.",
  },
  {
    id: "seitheben", name: "Seitheben", emoji: "🕊", equipment: "Kurzhantel",
    muskeln: ["seitliche Schulter"],
    schritte: [
      "Aufrecht, leichte Kurzhanteln seitlich, Ellbogen minimal gebeugt.",
      "Arme seitlich bis etwa Schulterhöhe anheben.",
      "Handgelenke neutral — die Ellbogen führen die Bewegung.",
      "Betont langsam (2–3 s) wieder absenken.",
    ],
    fehler: ["Schwung aus dem Oberkörper", "Über Schulterhöhe reißen", "Schultern zu den Ohren gezogen"],
    tipp: "Seitheben lebt von LEICHTEM Gewicht und sauberem Tempo — Ego weglassen.",
  },
  {
    id: "bizepscurl", name: "Bizeps-Curls", emoji: "💪", equipment: "Kurzhantel",
    muskeln: ["Bizeps", "Unterarme"],
    schritte: [
      "Aufrecht stehen, Ellbogen eng am Körper fixiert.",
      "Hanteln kontrolliert nach oben curlen (Unterarm dreht leicht nach außen).",
      "Oben kurz anspannen, ohne die Ellbogen nach vorn zu schieben.",
      "Langsam bis fast zur vollen Streckung ablassen.",
    ],
    fehler: ["Schwungholen mit dem Rücken", "Ellbogen wandern nach vorn", "Nur halbe Streckung unten"],
    tipp: "Die negative Phase (Ablassen) langsam machen — da wächst der Arm.",
  },
  {
    id: "trizepsdruecken", name: "Trizepsdrücken am Kabel", emoji: "🪢", equipment: "Maschine/Kabel",
    muskeln: ["Trizeps"],
    schritte: [
      "Vor dem Kabelzug stehen, Ellbogen eng am Körper „festkleben“.",
      "Griff/Seil aus ~90° Ellbogenwinkel nach unten drücken.",
      "Arme ganz strecken, Trizeps kurz anspannen.",
      "Kontrolliert zurück, Ellbogen bleiben am Körper.",
    ],
    fehler: ["Ellbogen wandern vor/zurück", "Oberkörper drückt mit (Gewicht zu hoch)", "Nur Teilstreckung"],
    tipp: "Beim Seilgriff die Enden unten leicht auseinanderziehen — mehr Spannung am Ende.",
  },
  {
    id: "plank", name: "Plank (Unterarmstütz)", emoji: "🧱", equipment: "Körpergewicht",
    muskeln: ["Rumpf", "Schultern", "Gesäß"],
    schritte: [
      "Unterarme unter den Schultern, Füße hüftbreit.",
      "Körper bildet eine Linie — Bauch UND Gesäß aktiv anspannen.",
      "Ruhig weiteratmen, Spannung halten.",
      "Lieber kürzer und sauber als lang und durchhängend.",
    ],
    fehler: ["Hüfte hängt durch (Hohlkreuz)", "Po zu hoch (Zelt)", "Luft anhalten"],
    tipp: "Steigerung nicht über Dauer, sondern über Varianten (Bein heben, Shoulder-Taps).",
  },
  {
    id: "dips", name: "Dips", emoji: "⬇️", equipment: "Körpergewicht",
    muskeln: ["Brust (unten)", "Trizeps", "vordere Schulter"],
    schritte: [
      "Auf den Barren stützen, Arme gestreckt, Schultern tief.",
      "Leicht nach vorn lehnen (mehr Brust) oder aufrecht bleiben (mehr Trizeps).",
      "Kontrolliert absenken, bis die Oberarme etwa parallel sind.",
      "Kraftvoll hochdrücken, ohne die Schultern hochzuziehen.",
    ],
    fehler: ["Zu tiefes Absinken (Schulter zwickt)", "Schwungholen mit den Beinen", "Schultern wandern zu den Ohren"],
    tipp: "Zu schwer? Band unter die Knie oder Negativ-Dips — zu leicht? Gewicht an den Gürtel.",
  },
  {
    id: "latzug", name: "Latzug (Lat Pulldown)", emoji: "🪂", equipment: "Maschine/Kabel",
    muskeln: ["Latissimus", "Bizeps"],
    schritte: [
      "Etwas breiter als schulterbreit greifen, Oberschenkel fixieren.",
      "Brust raus, leicht zurücklehnen (fixiert bleiben).",
      "Stange Richtung oberes Brustbein ziehen, Ellbogen nach unten.",
      "Langsam bis zur vollen Streckung zurücklassen.",
    ],
    fehler: ["Hinter den Nacken ziehen", "Rumpf schwingt mit", "Nur halbe Streckung oben"],
    tipp: "Denk „Ellbogen in die Hosentasche“ — nicht mit den Händen reißen.",
  },
  {
    id: "facepull", name: "Face Pulls", emoji: "🎯", equipment: "Maschine/Kabel",
    muskeln: ["hintere Schulter", "oberer Rücken", "Rotatoren"],
    schritte: [
      "Seil auf Gesichtshöhe einstellen, beidhändig greifen.",
      "Schulterblätter zusammenziehen.",
      "Seil Richtung Gesicht ziehen, Ellbogen hoch und außen.",
      "Am Ende Daumen nach hinten drehen (Außenrotation), langsam zurück.",
    ],
    fehler: ["Zu viel Gewicht (wird Ruderzug)", "Ellbogen sinken ab", "Rumpf lehnt sich weit zurück"],
    tipp: "DIE Ausgleichsübung für Schreibtisch & Drücktage — leicht und sauber, 15–20 Wdh.",
  },
  {
    id: "schraegbank", name: "Schrägbankdrücken (Kurzhanteln)", emoji: "📐", equipment: "Kurzhantel",
    muskeln: ["obere Brust", "vordere Schulter", "Trizeps"],
    schritte: [
      "Bank auf ca. 30° stellen, Hanteln auf Brusthöhe starten.",
      "Schulterblätter zusammen, Füße fest am Boden.",
      "Hanteln über der oberen Brust zusammenführen (nicht anschlagen).",
      "Kontrolliert absenken, Ellbogen ~45°.",
    ],
    fehler: ["Bank zu steil (wird Schulterdrücken)", "Hohlkreuz übertreiben", "Hanteln prallen oben zusammen"],
    tipp: "Kurzhanteln erlauben eine natürlichere Bahn als die Stange — ideal bei Schulterzwicken.",
  },
  {
    id: "goblet", name: "Goblet Squat", emoji: "🏆", equipment: "Kurzhantel",
    muskeln: ["Quadrizeps", "Gesäß", "Rumpf"],
    schritte: [
      "Kurzhantel/Kettlebell vor der Brust halten (wie einen Kelch).",
      "Füße schulterbreit, Zehen leicht nach außen.",
      "Tief und aufrecht in die Hocke — Ellbogen innen an den Knien vorbei.",
      "Über die ganze Fußsohle aufstehen.",
    ],
    fehler: ["Gewicht kippt den Oberkörper vor", "Fersen heben ab", "Knie kollabieren innen"],
    tipp: "Die beste Kniebeugen-Lernübung — das Frontgewicht balanciert dich automatisch aus.",
  },
  {
    id: "shrugs", name: "Shrugs (Nackenziehen)", emoji: "🤷", equipment: "Kurzhantel",
    muskeln: ["Trapez (oben)"],
    schritte: [
      "Schwere Kurzhanteln seitlich hängen lassen, aufrecht stehen.",
      "Schultern senkrecht Richtung Ohren ziehen.",
      "Oben 1 s halten.",
      "Langsam und vollständig absenken.",
    ],
    fehler: ["Kreisende Bewegung (reizt die Schulter unnötig)", "Kinn schiebt vor", "Abfälschen mit den Beinen"],
    tipp: "Volle Dehnung unten ist die halbe Übung — nicht nur oben zucken.",
  },
  {
    id: "hammercurl", name: "Hammer-Curls", emoji: "🔨", equipment: "Kurzhantel",
    muskeln: ["Bizeps", "Brachialis", "Unterarme"],
    schritte: [
      "Hanteln im neutralen Griff (Daumen nach oben).",
      "Ellbogen am Körper fixieren.",
      "Kontrolliert hochcurlen, Handgelenke gerade.",
      "Langsam bis fast zur Streckung ablassen.",
    ],
    fehler: ["Schwung aus der Hüfte", "Ellbogen wandern nach vorn", "Handgelenk knickt ein"],
    tipp: "Der neutrale Griff schont die Handgelenke und packt den Unterarm gleich mit.",
  },
  {
    id: "beinpresse", name: "Beinpresse", emoji: "🦿", equipment: "Maschine/Kabel",
    muskeln: ["Quadrizeps", "Gesäß", "Beinbeuger"],
    schritte: [
      "Füße schulterbreit mittig auf der Platte, Rücken ganz anlegen.",
      "Sicherung lösen, Gewicht kontrolliert übernehmen.",
      "Knie Richtung Brust beugen bis ~90° — der untere Rücken bleibt angelegt.",
      "Ohne die Knie ganz durchzustrecken wieder hochdrücken.",
    ],
    fehler: ["Unterer Rücken rollt von der Lehne ab (zu tief)", "Knie schlagen durch", "Fersen heben von der Platte ab"],
    tipp: "Fußposition steuert den Reiz: höher = mehr Gesäß/Beuger, tiefer = mehr Quadrizeps.",
  },
  {
    id: "wadenheben", name: "Wadenheben", emoji: "🦶", equipment: "Körpergewicht",
    muskeln: ["Waden"],
    schritte: [
      "Fußballen auf eine Kante/Stufe, Fersen frei.",
      "So hoch wie möglich auf die Zehenspitzen drücken.",
      "Oben 1–2 s halten.",
      "Fersen langsam UNTER die Kante absenken (volle Dehnung).",
    ],
    fehler: ["Federn ohne Kontrolle", "Nur halbe Höhe", "Knie wackeln mit"],
    tipp: "Waden brauchen Geduld: hohe Wiederholungen (15–25) und volle Bewegungslänge.",
  },
  {
    id: "farmerswalk", name: "Farmer's Walk", emoji: "🧳", equipment: "Kurzhantel",
    muskeln: ["Griffkraft", "Trapez", "Rumpf", "Ganzkörper"],
    schritte: [
      "Zwei schwere Hanteln wie Koffer greifen.",
      "Aufrecht: Brust raus, Schultern tief, Bauch fest.",
      "Kontrolliert und zügig gehen (20–40 m oder 30–60 s).",
      "Hanteln mit geradem Rücken absetzen (wie beim Kreuzheben).",
    ],
    fehler: ["Schlurfen mit rundem Rücken", "Schultern hängen nach vorn", "Zu leichte Gewichte (kein Reiz)"],
    tipp: "Einfachste Ganzkörperübung der Welt — Griff, Haltung und Kondition in einem.",
  },
  {
    id: "pullover", name: "Überzüge (Pull-over)", emoji: "🌉", equipment: "Kurzhantel",
    muskeln: ["Latissimus", "Brust", "Sägemuskel"],
    schritte: [
      "Auf die Bank legen, EINE Hantel mit beiden Händen über der Brust.",
      "Ellbogen leicht gebeugt fixieren.",
      "Hantel im Bogen hinter den Kopf absenken (Dehnung im Lat).",
      "Im selben Bogen zurück über die Brust ziehen.",
    ],
    fehler: ["Ellbogen beugen mit (wird Trizepsdrücken)", "Hüfte sinkt ab", "Zu schnelles Absenken"],
    tipp: "Leicht anfangen — die Dehnposition ist ungewohnt und braucht Kontrolle.",
  },
  {
    id: "bulgarian", name: "Bulgarian Split Squat", emoji: "🦵", equipment: "Kurzhantel",
    muskeln: ["Quadrizeps", "Gesäß", "Balance"],
    schritte: [
      "Hinteren Fuß auf eine Bank legen, vorderer Fuß gut 1 Schritt vorn.",
      "Oberkörper aufrecht, Rumpf fest.",
      "Hinteres Knie senkrecht Richtung Boden senken.",
      "Über die vordere Ferse kraftvoll hochdrücken.",
    ],
    fehler: ["Vorderer Fuß zu nah an der Bank", "Knie kollabiert nach innen", "Hüpfen statt kontrolliertem Tempo"],
    tipp: "Brutal effektiv für Beine OHNE schwere Stange auf dem Rücken — erst ohne Gewicht lernen.",
  },
  {
    id: "superman", name: "Superman (Rückenstrecker)", emoji: "🦸", equipment: "Körpergewicht",
    muskeln: ["unterer Rücken", "Gesäß", "hintere Kette"],
    schritte: [
      "Bäuchlings, Arme nach vorn gestreckt.",
      "Arme, Brust und Beine gleichzeitig leicht anheben.",
      "2–3 s oben halten, Blick zum Boden (Nacken neutral).",
      "Kontrolliert ablegen.",
    ],
    fehler: ["Nacken überstrecken (Blick nach vorn)", "Ruckartiges Hochreißen", "Luft anhalten"],
    tipp: "Perfekter Gegenpol zum Sitzen — täglich 2×10 kostet 2 Minuten.",
  },
  {
    id: "seitplank", name: "Seitstütz (Side Plank)", emoji: "🚧", equipment: "Körpergewicht",
    muskeln: ["seitlicher Rumpf", "Schulter", "Gesäß"],
    schritte: [
      "Seitlich auf den Unterarm stützen, Ellbogen unter der Schulter.",
      "Hüfte anheben, bis der Körper eine Linie bildet.",
      "Oben halten, ruhig atmen.",
      "Seite wechseln.",
    ],
    fehler: ["Hüfte hängt durch", "Oberkörper kippt vor/zurück", "Schulter schiebt zum Ohr"],
    tipp: "Steigerung: oberes Bein anheben oder Hüfte kontrolliert heben/senken.",
  },
  {
    id: "burpees", name: "Burpees", emoji: "💥", equipment: "Körpergewicht",
    muskeln: ["Ganzkörper", "Kondition"],
    schritte: [
      "Aus dem Stand in die Hocke, Hände am Boden.",
      "Beine nach hinten in die Liegestützposition springen.",
      "Optional 1 Liegestütz, dann Beine wieder zur Hocke.",
      "Explosiv nach oben strecken/springen.",
    ],
    fehler: ["Durchhängender Rücken in der Stützphase", "Landung mit gestreckten Knien", "Tempo vor Technik"],
    tipp: "Skalieren erlaubt: ohne Sprung/ohne Liegestütz ist es immer noch ein Burpee.",
  },
  {
    id: "kbswing", name: "Kettlebell Swing", emoji: "🔔", equipment: "Kurzhantel",
    muskeln: ["Gesäß", "Beinbeuger", "Rumpf", "Kondition"],
    schritte: [
      "Kettlebell mit beiden Händen, Füße etwas breiter als schulterbreit.",
      "Hüfte nach hinten — die Kugel schwingt zwischen die Beine.",
      "Hüfte EXPLOSIV strecken: der Schwung (nicht die Arme) bringt die Kugel auf Brusthöhe.",
      "Kontrolliert zurückschwingen lassen, Rücken bleibt neutral.",
    ],
    fehler: ["Aus den Armen heben statt aus der Hüfte", "Kniebeuge statt Hüftknick", "Runder Rücken unten"],
    tipp: "Der Swing ist ein Hüft-SCHNIPP, keine Kniebeuge — erst das RDL-Muster beherrschen.",
  },
  {
    id: "good_morning", name: "Good Mornings", emoji: "🌅", equipment: "Langhantel",
    muskeln: ["unterer Rücken", "Beinbeuger", "Gesäß"],
    schritte: ["Stange sicher auf dem oberen Rücken ablegen.", "Knie leicht beugen und den Rumpf fest anspannen.", "Hüfte kontrolliert nach hinten schieben, Rücken neutral halten.", "Über die Hüfte zurück in den aufrechten Stand kommen."],
    fehler: ["Rücken rundet ein", "Zu viel Kniebeugung", "Zu tiefe Position ohne Kontrolle"],
    tipp: "Mit sehr wenig Gewicht starten — die Übung trainiert das Hüftscharnier, nicht die maximale Last.",
  },
  {
    id: "hyperextension", name: "Back Extension", emoji: "↗️", equipment: "Körpergewicht",
    muskeln: ["unterer Rücken", "Gesäß", "Beinbeuger"],
    schritte: ["Becken auf dem Polster fixieren, Füße sicher abstellen.", "Rumpf lang und Bauch leicht angespannt halten.", "Oberkörper bis zur geraden Linie absenken.", "Aus Gesäß und Rückenstreckern kontrolliert aufrichten."],
    fehler: ["Ins Hohlkreuz überstrecken", "Schwung aus dem Oberkörper", "Polster sitzt zu hoch"],
    tipp: "Oben nur bis zur Körperlinie kommen — mehr Bewegungsradius ist nicht automatisch besser.",
  },
  {
    id: "beincurl", name: "Beinbeuger-Maschine", emoji: "🦵", equipment: "Maschine/Kabel",
    muskeln: ["Beinbeuger", "Waden", "Gesäß"],
    schritte: ["Achse des Geräts auf Höhe des Knies ausrichten.", "Bauch und Hüfte auf dem Polster lassen.", "Fersen kontrolliert Richtung Gesäß ziehen.", "Langsam bis fast zur Streckung zurückführen."],
    fehler: ["Hüfte hebt ab", "Gewicht wird gerissen", "Knie wird hart durchgedrückt"],
    tipp: "Die exzentrische Phase zwei bis drei Sekunden führen.",
  },
  {
    id: "preacher_curl", name: "Scott-Curls", emoji: "💪", equipment: "Maschine/Kabel",
    muskeln: ["Bizeps", "Unterarme"],
    schritte: ["Oberarme vollständig auf dem Polster ablegen.", "Griff mit geraden Handgelenken fassen.", "Unterarme ohne Schulterbewegung nach oben curlen.", "Kontrolliert bis fast zur Streckung absenken."],
    fehler: ["Schulter hebt mit", "Ellbogen lösen sich vom Polster", "Unten komplett durchhängen"],
    tipp: "Weniger Gewicht erlaubt eine bessere Spannung im langen Muskelkopf.",
  },
  {
    id: "concentration_curl", name: "Konzentrations-Curl", emoji: "🎯", equipment: "Kurzhantel",
    muskeln: ["Bizeps", "Unterarme"],
    schritte: ["Im Sitzen den Oberarm an der Innenseite des Oberschenkels abstützen.", "Handfläche nach oben drehen.", "Hantel ohne Schwung zur Schulter curlen.", "Langsam absenken und unten Spannung halten."],
    fehler: ["Oberkörper dreht mit", "Schwung aus dem Rücken", "Handgelenk knickt ab"],
    tipp: "Oben kurz halten und die Handfläche aktiv nach außen drehen.",
  },
  {
    id: "reverse_fly", name: "Reverse Fly", emoji: "🪽", equipment: "Kurzhantel",
    muskeln: ["hintere Schulter", "oberer Rücken", "Rotatorenmanschette"],
    schritte: ["Mit geradem Rücken nach vorn beugen, Hanteln hängen unter der Brust.", "Schulterblätter locker lassen.", "Arme seitlich bis auf Schulterhöhe öffnen.", "Kontrolliert in die Ausgangsposition zurückkehren."],
    fehler: ["Schultern ziehen zu den Ohren", "Zu schweres Gewicht", "Schwung aus dem Oberkörper"],
    tipp: "Denk an breite Ellbogen, nicht an hochgezogene Hände.",
  },
  {
    id: "frontheben", name: "Frontheben", emoji: "⬆️", equipment: "Kurzhantel",
    muskeln: ["vordere Schulter", "seitliche Schulter", "Core"],
    schritte: ["Aufrecht stehen, Hanteln vor den Oberschenkeln.", "Bauch und Gesäß anspannen.", "Eine oder beide Hanteln bis etwa Schulterhöhe heben.", "Langsam absenken, ohne abzulegen."],
    fehler: ["Über Schulterhöhe heben", "Schwung aus der Hüfte", "Handgelenke knicken"],
    tipp: "Die Schulter braucht selten viel Gewicht — saubere Kontrolle zählt.",
  },
  {
    id: "dead_bug", name: "Dead Bug", emoji: "🐞", equipment: "Körpergewicht",
    muskeln: ["gerader Bauch", "tiefer Core", "Hüftbeuger"],
    schritte: ["Rückenlage, Arme nach oben, Hüfte und Knie im rechten Winkel.", "Lendenwirbelsäule sanft in den Boden drücken.", "Gegenüberliegenden Arm und Bein langsam strecken.", "Zur Mitte zurückkehren und die Seite wechseln."],
    fehler: ["Rücken hebt ab", "Zu schnelles Tempo", "Schulter wird hochgezogen"],
    tipp: "Bewegungsradius verkleinern, sobald der untere Rücken den Kontakt verliert.",
  },
  {
    id: "ab_rollout", name: "Ab Wheel Rollout", emoji: "🛞", equipment: "Körpergewicht",
    muskeln: ["Core", "Latissimus", "Schultern"],
    schritte: ["Knie unter der Hüfte, Hände am Rad, Rücken neutral.", "Gesäß anspannen und Rippen unten halten.", "Das Rad langsam nach vorne rollen, nur so weit wie kontrollierbar.", "Über den Core zurückziehen, ohne ins Hohlkreuz zu fallen."],
    fehler: ["Hohlkreuz", "Schulter kippt nach vorn", "Zu weit ausrollen"],
    tipp: "Eine Wand als Stopper nutzen und die Reichweite schrittweise erweitern.",
  },
  {
    id: "kabelrudern", name: "Sitzendes Kabelrudern", emoji: "🚣", equipment: "Maschine/Kabel",
    muskeln: ["Latissimus", "mittlerer Rücken", "Bizeps"],
    schritte: ["Aufrecht sitzen, Knie leicht gebeugt, Griff mit langem Rücken halten.", "Schulterblätter zuerst nach hinten unten ziehen.", "Griff zum unteren Brustkorb führen.", "Arme kontrolliert strecken und den Rücken lang halten."],
    fehler: ["Rücken kippt nach hinten", "Schultern rollen nach vorn", "Nur mit den Armen ziehen"],
    tipp: "Am Ende der Bewegung eine Sekunde zwischen den Schulterblättern halten.",
  },
  {
    id: "brustpresse", name: "Brustpresse", emoji: "🫀", equipment: "Maschine/Kabel",
    muskeln: ["Brust", "Trizeps", "vordere Schulter"],
    schritte: ["Sitz so einstellen, dass die Griffe auf Brustmitte stehen.", "Schulterblätter zurück, Füße fest am Boden.", "Griffe kontrolliert nach vorn drücken.", "Bis kurz vor der kompletten Streckung zurückführen."],
    fehler: ["Schultern wandern nach vorn", "Gewicht schlägt zurück", "Handgelenke knicken"],
    tipp: "Maschinen sind gut für kontrollierte Spannung — nicht für Schwung.",
  },
  {
    id: "sissy_squat", name: "Sissy Squat", emoji: "🦿", equipment: "Körpergewicht",
    muskeln: ["Quadrizeps", "Core", "Waden"],
    schritte: ["Aufrecht stehen und an einer Stütze festhalten.", "Fersen anheben und Knie kontrolliert nach vorn führen.", "Rumpf als gerade Linie leicht nach hinten neigen.", "Über den Vorderfuß zurück nach oben drücken."],
    fehler: ["Zu tief ohne Kontrolle", "Knie fallen nach innen", "Schmerz ignorieren"],
    tipp: "Nur schmerzfreie Bewegungsweite nutzen und zunächst an einer Stütze lernen.",
  },
  /* ===== Welle G2 (2026-07-26): Übungen für Redurs 5-Tage-Rotation.
   * butterfly/beinstrecker kommen NICHT hierhin — Aura hat sie schon (ch5/le3),
   * sie bekommen stabile IDs über AURA_ID_ALIASES (kein gespaltener Verlauf). */
  {
    id: "ueberkopf_trizeps", name: "Überkopf-Trizepsstrecken", emoji: "💪", equipment: "Maschine/Kabel",
    englischerName: "Overhead Triceps Extension", level: "Mittel", gruppe: "arms", animationType: "press",
    muskeln: ["Trizeps"],
    schritte: [
      "Mit dem Rücken zum Kabelturm stehen, Seil über Kopf greifen.",
      "Ellbogen neben den Ohren fixieren, Rumpf fest, leichte Schrittstellung.",
      "Unterarme nach vorn-oben strecken, nur der Ellbogen bewegt sich.",
      "Langsam hinter den Kopf zurückführen, Dehnung im Trizeps spüren.",
    ],
    fehler: ["Ellbogen wandern nach außen", "Hohlkreuz beim Strecken", "Zu viel Gewicht — Schultern übernehmen"],
    tipp: "Die Überkopf-Position trainiert den langen Trizepskopf — leichter als beim Pushdown starten.",
  },
  {
    id: "brustgest_rudern", name: "Brustgestütztes Rudern", emoji: "🚣", equipment: "Maschine/Kabel",
    englischerName: "Chest Supported Row", level: "Anfänger", gruppe: "back", animationType: "pull",
    muskeln: ["mittlerer Rücken", "Latissimus", "hintere Schulter", "Bizeps"],
    schritte: [
      "Brust fest aufs Polster der Schrägbank oder Maschine legen.",
      "Griffe fassen, Schulterblätter aktiv nach hinten-unten setzen.",
      "Ellbogen nah am Körper Richtung Hüfte ziehen, Brust bleibt am Polster.",
      "Arme kontrolliert strecken, ohne die Schultern nach vorn fallen zu lassen.",
    ],
    fehler: ["Brust hebt beim Ziehen vom Polster ab", "Schwung aus dem Oberkörper", "Nur Arme statt Rücken ziehen"],
    tipp: "Das Polster nimmt den unteren Rücken raus — ideal nach schwerem Kreuzheben oder bei langer Baustellen-Woche.",
  },
];

export const AURA_ID_ALIASES: Record<string, string> = {
  // Welle G2: stabile IDs für Redurs Rotations-Pläne
  ch5: "butterfly",
  le3: "beinstrecker",
  ch1: "bankdruecken",
  ch2: "schraegbank",
  ch6: "liegestuetz",
  ch11: "dips",
  ba1: "kreuzheben",
  ba2: "klimmzug",
  ba3: "latzug",
  ba4: "rudern_lh",
  ba7: "kabelrudern",
  ba8: "facepull",
  ba9: "hyperextension",
  ba12: "shrugs",
  le1: "kniebeuge",
  le2: "beinpresse",
  le4: "beincurl",
  le5: "rdl",
  le6: "ausfallschritt",
  le7: "bulgarian",
  le8: "goblet",
  le9: "wadenheben",
  le15: "huftheben",
  sh1: "schulterdruecken",
  sh3: "seitheben",
  sh4: "frontheben",
  sh5: "reverse_fly",
  ar2: "bizepscurl",
  ar3: "hammercurl",
  ar4: "preacher_curl",
  ar5: "concentration_curl",
  ar8: "trizepsdruecken",
  co3: "plank",
  co6: "ab_rollout",
  co8: "seitplank",
  fu2: "kbswing",
  fu3: "burpees",
};

const GRUPPEN_MUSKEL: Record<MuscleGroup, string> = {
  chest: "Brust",
  back: "Rücken",
  legs: "Beine",
  shoulders: "Schultern",
  arms: "Arme",
  core: "Core",
  fullbody: "Ganzkörper",
};

const GRUPPEN_EMOJI: Record<MuscleGroup, string> = {
  chest: "◆",
  back: "◇",
  legs: "△",
  shoulders: "◈",
  arms: "○",
  core: "◎",
  fullbody: "✦",
};

const EQUIPMENT_LABELS: Record<Equipment, GymEquipment> = {
  barbell: "Langhantel",
  dumbbell: "Kurzhantel",
  machine: "Maschine/Kabel",
  cable: "Maschine/Kabel",
  bodyweight: "Körpergewicht",
  kettlebell: "Kettlebell",
  bands: "Bänder",
};

const LEVEL_LABELS: Record<Exercise["difficulty"], GymLevel> = {
  beginner: "Anfänger",
  intermediate: "Mittel",
  advanced: "Fortgeschritten",
};

const MUSKEL_UEBERSETZUNG: Record<string, string> = {
  Triceps: "Trizeps",
  Biceps: "Bizeps",
  Shoulders: "Schultern",
  "Front Delts": "vordere Schulter",
  "Rear Delts": "hintere Schulter",
  Glutes: "Gesäß",
  Hamstrings: "Beinbeuger",
  Quads: "Quadrizeps",
  Calves: "Waden",
  Forearms: "Unterarme",
  Core: "Core",
  Lats: "Latissimus",
  Traps: "Trapez",
  Chest: "Brust",
  Abs: "Bauch",
};

function auraZuGym(exercise: Exercise): GymUebung {
  const sekundaer = (exercise.secondaryMuscles ?? []).map((muscle) => MUSKEL_UEBERSETZUNG[muscle] ?? muscle);
  return {
    id: AURA_ID_ALIASES[exercise.id] ?? `aura-${exercise.id}`,
    name: exercise.germanName,
    englischerName: exercise.name,
    emoji: GRUPPEN_EMOJI[exercise.muscleGroup],
    gruppe: exercise.muscleGroup,
    muskeln: Array.from(new Set([GRUPPEN_MUSKEL[exercise.muscleGroup], ...sekundaer])),
    sekundarMuskeln: sekundaer,
    equipment: EQUIPMENT_LABELS[exercise.equipment],
    level: LEVEL_LABELS[exercise.difficulty],
    kalorien10Min: exercise.caloriesBurned,
    beschreibung: exercise.germanDescription,
    schritte: exercise.germanSteps,
    fehler: [],
    hinweise: exercise.germanTips,
    tipp: exercise.germanTips[0] ?? "Kontrolliert trainieren und die Technik vor dem Gewicht priorisieren.",
    animationType: exercise.animationType,
    quelle: "auragym",
  };
}

const AURA_GYM_UEBUNGEN = AURA_EXERCISES.map(auraZuGym);
const AURA_IDS = new Set(AURA_GYM_UEBUNGEN.map((exercise) => exercise.id));

export const GYM_UEBUNGEN: GymUebung[] = [
  ...AURA_GYM_UEBUNGEN,
  ...CORE_UEBUNGEN.filter((exercise) => !AURA_IDS.has(exercise.id)).map((exercise) => ({
    ...exercise,
    quelle: "red-core" as const,
  })),
];

/** 1RM nach Epley: geschätztes Maximalgewicht für 1 Wiederholung. */
export function epley1RM(gewicht: number, wdh: number): number {
  if (gewicht <= 0 || wdh <= 0) return 0;
  if (wdh === 1) return gewicht;
  return Math.round(gewicht * (1 + wdh / 30) * 10) / 10;
}
import { EXERCISES as AURA_EXERCISES } from "./auraExercises";
import type { Equipment, Exercise, MuscleGroup } from "./auraTypes";
