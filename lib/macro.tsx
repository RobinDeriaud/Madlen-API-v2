export type MacroConfig = {
  label: string
  bg: string
  border: string
  text: string
}

export const MACRO_CONFIG: Record<string, MacroConfig> = {
  AJUSTEMENT_100:         { label: "Ajustement",        bg: "#7A8C28", border: "#636F20", text: "#fff" },
  HYGIENE_PHONATOIRE_200: { label: "Hygiène phonatoire", bg: "#C0D060", border: "#A4B448", text: "#333" },
  PRAXIES_300:            { label: "Praxies",            bg: "#DCE878", border: "#C4D060", text: "#444" },
  RENDEMENT_VOCAL_400:    { label: "Rendement vocal",    bg: "#C87860", border: "#AA6048", text: "#fff" },
  FLEXIBILITE_VOCALE_500: { label: "Flexibilité vocale", bg: "#E8AA90", border: "#CC9070", text: "#333" },
  INTELLIGIBILITE_600:    { label: "Intelligibilité",    bg: "#7890A0", border: "#607888", text: "#fff" },
  FLUENCE_700:            { label: "Fluence",            bg: "#A0B4C0", border: "#889CA8", text: "#333" },
}

export function MacroBadge({ macro }: { macro: string }) {
  const config = MACRO_CONFIG[macro]
  if (!config) return <span className="text-gray-400 text-xs">{macro}</span>

  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border"
      style={{ backgroundColor: config.bg, borderColor: config.border, color: config.text }}
    >
      {config.label}
    </span>
  )
}
