import { Children, useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps,useSlate, ReactEditor } from 'slate-react'
import { createEditor, Descendant, Transforms, Range, Editor,Text, Element as SlateElement, NodeEntry, Path as SlateNodePath, Node as SlateNode, BaseEditor, Location } from 'slate'
import { LeafEdge } from 'slate/dist/interfaces/types'
import { withHistory } from "slate-history";
import { CustomElement, LinkElement } from './@types/editor';
type HighlightFragement = {
  id:number;
  payload:any;
  range:Range
}

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [
      {
        text:
          'In addition to block nodes, you can create inline nodes. Here is a ',
      },
      {
        type: 'link',
        url: 'https://en.wikipedia.org/wiki/Hypertext',
        children: [{ text: 'hyperlink' }],
      },
      {
        text: ', and here is a more unusual inline: an ',
      },
      {
        type: 'button',
        children: [{ text: 'editable button' }],
      },
      {
        text: '!',
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          '我们的竟争对手事智能AI.There are two ways to add links. You can either add a link via the toolbar icon above, or if you want in on a little secret, copy a URL to your keyboard and paste it while a range of text is selected. ',
      },
      // The following is an example of an inline at the end of a block.
      // This is an edge case that can cause issues.
      {
        type: 'link',
        url: 'https://twitter.com/JustMissEmma/status/1448679899531726852',
        children: [{ text: 'Finally, here is our favorite dog video.' }],
      },
      { text: '' },
    ],
  },
]

const isUrl = (text: string) => {
  const urlRegex =
    /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/gim;
  return text.match(urlRegex)
}
//@ts-expect-error
const EditableButtonComponent = ({ attributes, children, element }) => {
  return (
    <span
      {...attributes}
      onClick={ev => ev.preventDefault()}
      // Margin is necessary to clearly show the cursor adjacent to the button
      style={
        {
          margin: "0 0.1em",
          backgroundColor: "#efefef",
          padding: "2px 6px",
          border: "1px solid #767676",
          borderRadius: "2px",
          fontSize: "0.9em"
        }
      }
    >
      {children}
    </span>
  )
}

//@ts-expect-error
const LinkComponent = ({ attributes, children, element }) => {
  return (
    <a {...attributes} href={element.url}>
      {children}
    </a>
  )
}

const AddLinkButton = (props: { editor: any; children: any }) => {
  const { editor, children } = props
  console.log('AddLinkButton', editor, children);
  return (
    <button
      onClick={event => {
        const url = window.prompt('Enter the URL of the Link');
        if (!url) return;
        insertLink(editor, url);
      }}
      autoFocus={false} tabIndex={0}>
      {children}
    </button>
  )
}
const UnlinkLinkButton = (props: { editor: any; children: any }) => {
  const { editor, children } = props
  console.log('AddLinkButton', editor, children);
  return (
    <button
      onClick={(event) => {
        unwrapLink(editor);
      }}
    >{children}</button>
  )
}

const SpellCheckButton = (props: { editor: any; children: any,setHighlight:any }) => {
  const { editor, children,setHighlight} = props
  return (
    <button
      onClick={(event) => {
        spellCheck(editor,setHighlight);
      }}
    >
      {children}
    </button>)
}
const CheckIgnoreButton = (props: { editor: any; children: any,setHighlight:any}) => {
  const { editor, children,setHighlight} = props;
  return (
    <button
      onClick={(event) => {
        setHighlight([]);
      }}
    >
      {children}
    </button>)
}
type T = { text: string, fragments: { beginIndex: number, endIndex: number, originalText: string, correctText: string }[] };
const mockNlpServer = async (text: string): Promise<T> => {
  return (new Promise((res, rej) => {
    setTimeout(() => res({
      text: "我们的竟争对手事智能AI",
      fragments: [
        {
          "beginIndex": 3,
          "endIndex": 7,
          "originalText": "竟争对手",
          "correctText": "竞争对手"
        },
        {
          "beginIndex": 7,
          "endIndex": 8,
          "originalText": "事",
          "correctText": "是"
        }
      ]
    }), 200)
  }))
}



const spellCheck = async (editor: any,setHighlight:any) => {
  const { selection } = editor;
  if(!selection)return;
  // console.log('spellCheck', selection);
  const { anchor, focus } = selection;
  const fragments = SlateNode.fragment(editor, selection);
  //todo:多选区
  //@ts-expect-error
  const { children } = fragments[0];
  const { text } = children[0];
  // console.log('fragments,text', text, fragments)
  //请求服务端:
  const startTime = Date.now();
  const res = await mockNlpServer(text);
  console.log(`请求服务端请求完毕耗时:${Date.now() - startTime}毫秒`, res)
  if(!res) return;
  //创建新的range

  const ranges: HighlightFragement[] = res.fragments.map((frag)=>{
      return {
        id:Math.round(Math.random()*10000000),
        payload:{
          correctText:frag.correctText
        },
        range:{
          anchor:{
          offset: anchor.offset + frag.beginIndex,
          path: anchor.path},
        focus: {
          offset: anchor.offset + frag.endIndex,
          path: anchor.path}
        }
      }
  })


  //设置decoration更新
  if(ranges && ranges.length > 0) setHighlight(ranges);

}





const insertLink = (editor: any, url: any) => {
  console.log('insertLink', editor, url, editor.selection);
  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection)
  const link: LinkElement = {
    type: 'link',
    url,
    children: isCollapsed ? [{ text: url }] : [],
  }
  if (isCollapsed) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: 'end' });
  }
}

const unwrapLink = (editor: any) => {
  Transforms.unwrapNodes(editor, {
    match: node => !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === "link",
  })
}
//强制将button和link重写为inline
const withInlineElement = (editor: ReactEditor) => {
  const { insertData, insertTextData, isInline } = editor;
  editor.isInline = (element) => {
    return (element.type ? ['link', 'button'].includes(element.type) : null) || isInline(element);
  }
  editor.insertData = data => {
    const text = data.getData('text/plain');
    if (text && isUrl(text)) {
      insertLink(editor, text)
    } else {
      insertData(data);
    }
  }
  editor.insertTextData = textData => {
    const text = textData.getData('text/plain');
    if (text && isUrl(text)) {
      insertLink(editor, text)
      return true;
    }
    return insertTextData(textData)
  }

  return editor;
}



function App() {
  // const [editor] = useState(() => withReact(createEditor()))
  const editor = useMemo<Editor>(() => withInlineElement(withHistory(withReact(createEditor()))), [])
  const [value, setValue] = useState(initialValue);
  //需要纠错高亮的文字
  const [textToHighlightCheck,setTextToHighlightCheck] = useState<HighlightFragement[]>();
  const [editor2] = useState(() => withReact(createEditor()))

  const renderElementProcess = useCallback((props: RenderElementProps) => {
    const { attributes, children, element } = props
    switch (element.type) {
      case 'link':
        return <LinkComponent {...props} />
      case 'button':
        return <EditableButtonComponent {...props} />
      default:
        return <p {...attributes}>{children}</p>
    }

  }, []);

  const renderLeafProcess = useCallback((props: RenderLeafProps) => {
    const { attributes, children, text, leaf } = props;
    if (leaf.decoration == 'errorText') {
      // console.log('errorText', props)
      //添加下划线
      return <span
      //@ts-ignore
        {...attributes} data-id={leaf.id} style={{ borderBottom: "2px solid red" }}
        onClick={(event) =>{
           //@ts-ignore
          const {range,correctText} = leaf.data;
          //@ts-ignore
          const {id} = leaf;
          const YES:boolean = confirm(`是否修改为"${correctText}"?`)
          if(YES){
             console.log('修改1',props,event,leaf);
             Transforms.select(editor,range);
             Transforms.insertText(editor,correctText);
             //解除掉
            if(textToHighlightCheck){
              // console.log('textToHighlightCheck 2222',textToHighlightCheck.findIndex(item=>item.id === id));
              textToHighlightCheck.splice(textToHighlightCheck.findIndex(item=>item.id === id),1)
            }
   
          }
        }}
      >
        {children}
      </span>
    }
    return <span {...attributes} >{children}</span>
  }, [textToHighlightCheck])

  const decorateProcess = useCallback((entry:NodeEntry)=>{
    // console.log('decorateProcess',entry);
    const [node,path] = entry;
    // console.log('decorateProcess',textToHighlightCheck);
    const rangesToDectrate:Range[] =[]
    if(Text.isText(node) && textToHighlightCheck && textToHighlightCheck.length >0){
      for (const fragment of textToHighlightCheck) {
        const intersection = Range.intersection(fragment.range,Editor.range(editor, path));
        if (intersection != null) {
          // console.log('fragment of textToHighlightCheck',fragment,fragment.range)
            const newRange = {
            id:fragment.id,
            decoration: 'errorText',
            data:{
              range:{...intersection},
              ...fragment.payload
            },
            ...intersection
            };
            rangesToDectrate.push(newRange);
           
            // console.log('textToHighlightCheck1111',rangesToDectrate,textToHighlightCheck)
        }
      }
    }
    
    return rangesToDectrate

  },[textToHighlightCheck]);

  useEffect(() => {
    editor2.children = value;

  }, [value])

  return (
    <div className="App">
      <div className='editor'>
        <Slate
          editor={editor}
          //@ts-ignore
          value={value}
          onChange={value => {
            setValue(value)
          }}
        >
          <div className='toolbar'>
            <AddLinkButton editor={editor} >Link</AddLinkButton>
            <UnlinkLinkButton editor={editor}>Unlink</UnlinkLinkButton>
            <SpellCheckButton editor={editor}  setHighlight={setTextToHighlightCheck}>纠错</SpellCheckButton>
            <CheckIgnoreButton editor={editor} setHighlight={setTextToHighlightCheck}>忽略错误</CheckIgnoreButton>
          </div>
          <Editable
            onKeyDown={event => {
            }}
            renderElement={renderElementProcess}
            renderLeaf={renderLeafProcess}
            decorate={decorateProcess}
          />
        </Slate>

      </div>
      <div className='preview'>
        <h4>Preview</h4>
        <Slate editor={editor2}
          //@ts-ignore
          value={value}
        >
          <Editable
            renderElement={renderElementProcess}
            renderLeaf={renderLeafProcess} 
            readOnly
          ></Editable>
        </Slate>
      </div>
    </div>
  )
}


export default App


