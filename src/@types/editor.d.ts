// This example is for an Editor with `ReactEditor` and `HistoryEditor`
import { BaseEditor,Node as SlateNode} from 'slate'
import { ReactEditor } from 'slate-react'

export type CustomEditor = BaseEditor & ReactEditor 

export type ParagraphElement = {
  type: 'paragraph'
  children: Descendant[]
}
export type HeadingElement = {
  type: 'heading'
  level: number
  children: CustomText[]
}
export type CodeElement = {
  type: 'code'
  children: CustomText[]
}
export type LinkElement = { type: 'link'; url: string; children: Descendant[] }
export type ButtonElement = { type: 'button'; children: Descendant[] }

export type FormattedText = { text: string; bold?: true|null,type?:string,decoration?:string,url?:string}

export type CustomElement = ParagraphElement | HeadingElement |CodeElement |FormattedText | LinkElement

export type CustomText = FormattedText

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor
    Element: CustomElement
    Text: CustomText
  }
 
}
