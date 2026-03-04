/**
 * import-exercices.mjs
 * Importe tous les fichiers .ini du dossier EXO_260303 dans la base de données.
 *
 * Usage : node scripts/import-exercices.mjs
 */

import { readFileSync, readdirSync } from "fs"
import { resolve, join, dirname } from "path"
import { fileURLToPath } from "url"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import iconv from "iconv-lite"

// ────────────────────────────────────────────────────────────
// Chargement du .env
// ────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, "..", ".env")
const envContent = readFileSync(envPath, "utf-8")
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=")
  if (key?.trim() && rest.length) process.env[key.trim()] = rest.join("=").trim()
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ────────────────────────────────────────────────────────────
// Répertoire des fichiers .ini
// ────────────────────────────────────────────────────────────
const INI_DIR = "C:\\Users\\rderi\\Dropbox\\MADLEN-Delphi\\div_madlen\\exercices"

// ────────────────────────────────────────────────────────────
// Helpers de parsing
// ────────────────────────────────────────────────────────────

/** Extrait le contenu du premier tag trouvé (insensible à la casse). */
function parseTag(content, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i")
  const match = content.match(regex)
  return match ? match[1].trim() : null
}

/** Extrait le contenu de tous les tags (insensible à la casse). */
function parseAllTags(content, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "gi")
  const results = []
  let match
  while ((match = regex.exec(content)) !== null) {
    results.push(match[1].trim())
  }
  return results
}

/** Supprime les accents pour la correspondance de préfixes. */
function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

/**
 * Mappe la valeur du tag <outils> vers l'enum OutilExercice et outil_param.
 * Retourne { outil, outilParam }.
 */
function parseOutil(outilStr) {
  if (!outilStr?.trim()) return { outil: null, outilParam: null }
  const trimmed = outilStr.trim()
  const norm = stripAccents(trimmed).toLowerCase()

  // Ordre important : préfixes plus longs en premier pour éviter les faux positifs.
  const prefixMap = [
    ["spectrogramme", "SPECTROGRAMME"],
    ["spectro", "SPECTROGRAMME"],
    ["phonetogramme", "PHONETOGRAMME"],
    ["phoneme", "PHONEME"],
    ["prosodie", "PROSODIE"],
    ["puissance", "PUISSANCE"],
    ["image", "IMAGE"],
    ["diado", "DIADO"],
    ["mots", "MOTS"],
    ["traits", "TRAITS"],
    ["praxie", "PRAXIES"], // couvre "praxie" et "praxies"
    ["autoevaluation", "CHOIX"],
    ["choix", "CHOIX"],
    ["video", "VIDEO"],
    ["lien", "LIEN"],
    ["histogramme", "HISTOGRAMME"],
  ]

  for (const [prefix, enumVal] of prefixMap) {
    if (norm === prefix || norm.startsWith(prefix + " ")) {
      const param = trimmed.slice(prefix.length).trim() || null
      return { outil: enumVal, outilParam: param }
    }
  }

  // Valeur non reconnue : pas d'outil, le texte brut va dans outilParam
  return { outil: null, outilParam: trimmed }
}

/**
 * Mappe la valeur du tag <macro> vers l'enum MacroExercice.
 * Le nombre en début de chaîne sert de clé.
 */
function parseMacro(macroStr) {
  if (!macroStr) return null
  const match = macroStr.trim().match(/^(\d+)/)
  if (!match) return null
  const map = {
    100: "AJUSTEMENT_100",
    200: "HYGIENE_PHONATOIRE_200",
    300: "PRAXIES_300",
    400: "RENDEMENT_VOCAL_400",
    500: "FLEXIBILITE_VOCALE_500",
    600: "INTELLIGIBILITE_600",
    700: "FLUENCE_700",
  }
  return map[Number(match[1])] ?? null
}

/**
 * Mappe la valeur du tag <axe> vers l'enum AxeExercice.
 * Le nombre en début de chaîne sert de clé.
 */
function parseAxe(axeStr) {
  if (!axeStr) return null
  const match = axeStr.trim().match(/^(\d+)/)
  if (!match) return null
  const map = {
    100: "AJUSTEMENT_100",
    130: "REGULATION_ECHANGES_130",
    140: "POSTURE_140",
    210: "HYGIENE_ALIMENTAIRE_210",
    220: "ECONOMIE_VOCALE_220",
    230: "ECHAUFFEMENT_RECUPERATION_230",
    240: "EXERCICES_SPECIFIQUES_240",
    310: "PROPRIOCEPTION_ARTICULATOIRE_310",
    320: "PRAXIES_SIMPLES_320",
    330: "PRAXIES_COORDONNEES_330",
    410: "RESPIRATION_410",
    420: "RESPIRATION_AVANCEE_420",
    430: "TONICITE_LABIALE_430",
    440: "TONICITE_VELAIRE_440",
    450: "TONICITE_LINGUALE_450",
    510: "CONTROLE_HAUTEUR_510",
    520: "PASSAGES_MECANISMES_520",
    530: "CONTROLE_INTENSITE_530",
    540: "DISSOCIATION_PARAMETRES_540",
    550: "DYNAMIQUE_VOCALE_550",
    610: "PRODUCTION_VOYELLES_610",
    620: "PRODUCTION_CONSONNES_620",
    630: "SYLLABES_PROCESSUS_630",
    640: "TRAVAIL_PROSODIE_640",
    710: "DIADOCOCINETIQUES_CONSONANTIQUES_710",
    720: "DIADOCOCINETIQUES_VOCALIQUES_720",
    730: "DIADOCOCINETIQUES_COORDONNEES_730",
    740: "DIADOCOCINETIQUES_MOTS_740",
    750: "PHRASES_FONCTIONNELLES_750",
  }
  return map[Number(match[1])] ?? null
}

/** Parse une date au format jj/MM/aaaa → objet Date ou null. */
function parseDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.trim().split("/")
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  const d = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Parse les items du tag <liste>.
 * Chaque ligne est un élément ; les tags <oui>/<non> indiquent ReponseElement.
 */
function parseListe(listeStr) {
  if (!listeStr) return []
  return listeStr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      let reponse = "NULL"
      let element = line
      if (/<oui>/i.test(line)) {
        reponse = "OUI"
        element = line.replace(/<oui>/gi, "").trim()
      } else if (/<non>/i.test(line)) {
        reponse = "NON"
        element = line.replace(/<non>/gi, "").trim()
      }
      return { element, reponse, order: i + 1 }
    })
}

/**
 * Parse tous les blocs <bouton>…</bouton> et retourne un tableau JSON.
 * Chaque bouton peut contenir <titre>, <parametres>, <option>/<options>.
 */
function parseBoutons(content) {
  const blocks = parseAllTags(content, "bouton")
  if (!blocks.length) return null

  return blocks.map((inner) => {
    const bouton = {}

    // Première ligne non-tag = type du bouton (ex: "Micro", "modele", "Curseur")
    const firstLine = inner
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("<"))
    if (firstLine) bouton.type = firstLine

    const titre = parseTag(inner, "titre")
    if (titre) bouton.titre = titre.replace(/^"|"$/g, "").trim()

    // <option> ou <options> (les deux variantes existent dans les fichiers)
    const option = parseTag(inner, "option") ?? parseTag(inner, "options")
    if (option) bouton.option = option

    const parametresStr = parseTag(inner, "parametres")
    if (parametresStr) {
      bouton.parametres = {}
      for (const line of parametresStr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
        // Formats : `nom "Vitesse"` ou `position 10`
        const quoted = line.match(/^(\w+)\s+"([^"]*)"/)
        const plain = line.match(/^(\w+)\s+(\S+)/)
        if (quoted) {
          bouton.parametres[quoted[1]] = quoted[2]
        } else if (plain) {
          const val = plain[2]
          bouton.parametres[plain[1]] = isNaN(val) ? val : Number(val)
        }
      }
    }

    return bouton
  })
}

/** Parse un fichier .ini complet et retourne un objet structuré. */
function parseExerciceFile(filePath) {
  // Décodage Windows-1252 (cp1252) — gère les apostrophes typographiques (0x92 = ')
  const content = iconv.decode(readFileSync(filePath), "cp1252")

  const numeroStr = parseTag(content, "numero")
  const numero = parseInt(numeroStr, 10)
  if (isNaN(numero)) return null

  const outilStr = parseTag(content, "outils")
  const { outil, outilParam } = parseOutil(outilStr)

  return {
    numero,
    nom: parseTag(content, "nom") || null,
    sigle: parseTag(content, "sigle") || null,
    bref: parseTag(content, "bref") || null,
    but: parseTag(content, "but") || null,
    instructions: parseTag(content, "instructions") || null,
    astuce: parseTag(content, "astuce") || null,
    commentaires: parseTag(content, "commentaires") || null,
    macro: parseMacro(parseTag(content, "macro")),
    axe: parseAxe(parseTag(content, "axe")),
    outil,
    outilParam,
    date: parseDate(parseTag(content, "date")),
    auteur: parseTag(content, "auteur") || null,
    version: parseTag(content, "version") || null,
    fichier: parseTag(content, "fichier") || null,
    boutons: parseBoutons(content),
    listeItems: parseListe(parseTag(content, "liste")),
  }
}

// ────────────────────────────────────────────────────────────
// Import principal
// ────────────────────────────────────────────────────────────

const files = readdirSync(INI_DIR)
  .filter((f) => f.endsWith(".ini"))
  .sort()
  .map((f) => join(INI_DIR, f))

console.log(`\nDossier : ${INI_DIR}`)
console.log(`Fichiers trouvés : ${files.length}\n`)

let created = 0
let updated = 0
let skipped = 0
let errors = 0

for (const filePath of files) {
  try {
    const data = parseExerciceFile(filePath)

    if (!data) {
      console.warn(`⚠  Ignoré (numéro manquant) : ${filePath}`)
      skipped++
      continue
    }

    const { numero, listeItems, outilParam, ...rest } = data

    const payload = {
      nom: rest.nom,
      sigle: rest.sigle,
      bref: rest.bref,
      but: rest.but,
      instructions: rest.instructions,
      astuce: rest.astuce,
      commentaires: rest.commentaires,
      macro: rest.macro,
      axe: rest.axe,
      outil: rest.outil,
      outil_param: outilParam,
      date: rest.date,
      auteur: rest.auteur,
      version: rest.version,
      fichier: rest.fichier,
      boutons: rest.boutons ?? undefined,
      publishedAt: new Date(),
    }

    const existing = await prisma.exercice.findUnique({ where: { numero } })

    const upserted = await prisma.exercice.upsert({
      where: { numero },
      update: payload,
      create: { numero, ...payload },
    })

    // Recrée les ListeElements à chaque import (source de vérité = fichier .ini)
    await prisma.listeElement.deleteMany({ where: { exerciceId: upserted.id } })
    if (listeItems.length) {
      await prisma.listeElement.createMany({
        data: listeItems.map((item) => ({
          exerciceId: upserted.id,
          element: item.element,
          reponse: item.reponse,
          order: item.order,
        })),
      })
    }

    if (existing) {
      updated++
      console.log(`↻  Mis à jour  : ${numero} — ${rest.nom ?? "(sans nom)"}`)
    } else {
      created++
      console.log(`✓  Créé        : ${numero} — ${rest.nom ?? "(sans nom)"}`)
    }
  } catch (err) {
    errors++
    console.error(`✗  Erreur (${filePath}) : ${err.message}`)
  }
}

await prisma.$disconnect()
await pool.end()

console.log(`\n${"─".repeat(50)}`)
console.log(`Créés    : ${created}`)
console.log(`Mis à jour : ${updated}`)
console.log(`Ignorés  : ${skipped}`)
console.log(`Erreurs  : ${errors}`)
console.log(`${"─".repeat(50)}\n`)
