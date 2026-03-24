"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import { useCallback, useEffect, useState } from "react"
import styles from "./wysiwyg-editor.module.css"

interface WysiwygEditorProps {
  value: string
  onChange: (html: string) => void
}

export default function WysiwygEditor({ value, onChange }: WysiwygEditorProps) {
  const [sourceMode, setSourceMode] = useState(false)
  const [sourceValue, setSourceValue] = useState("")

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync external value changes (e.g. initial load)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const toggleSource = useCallback(() => {
    if (!editor) return
    if (sourceMode) {
      // Switching from source to visual
      editor.commands.setContent(sourceValue, { emitUpdate: false })
      onChange(sourceValue)
    } else {
      // Switching from visual to source
      setSourceValue(editor.getHTML())
    }
    setSourceMode(!sourceMode)
  }, [editor, sourceMode, sourceValue, onChange])

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSourceValue(e.target.value)
      onChange(e.target.value)
    },
    [onChange]
  )

  const addLink = useCallback(() => {
    if (!editor) return
    const url = window.prompt("URL du lien :")
    if (!url) return
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    if (!editor) return
    const url = window.prompt("URL de l'image :")
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  if (!editor) return null

  const btn = (active: boolean) =>
    `px-2 py-1 text-xs rounded ${active ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras">
          <b>B</b>
        </button>
        <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique">
          <i>I</i>
        </button>
        <button type="button" className={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Souligné">
          <u>U</u>
        </button>
        <button type="button" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Barré">
          <s>S</s>
        </button>

        <span className="w-px bg-gray-300 mx-1" />

        <button type="button" className={btn(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          H1
        </button>
        <button type="button" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </button>
        <button type="button" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </button>

        <span className="w-px bg-gray-300 mx-1" />

        <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste à puces">
          &bull; Liste
        </button>
        <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numérotée">
          1. Liste
        </button>

        <span className="w-px bg-gray-300 mx-1" />

        <button type="button" className={btn(editor.isActive("link"))} onClick={addLink} title="Lien">
          Lien
        </button>
        <button type="button" className={btn(false)} onClick={addImage} title="Image (URL)">
          Image
        </button>
        <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citation">
          Citation
        </button>

        <span className="w-px bg-gray-300 mx-1" />

        <button type="button" className={btn(sourceMode)} onClick={toggleSource} title="Code source HTML">
          &lt;/&gt;
        </button>
      </div>

      {/* Content */}
      {sourceMode ? (
        <div className={styles.source}>
          <textarea value={sourceValue} onChange={handleSourceChange} />
        </div>
      ) : (
        <div className={styles.editor}>
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  )
}
