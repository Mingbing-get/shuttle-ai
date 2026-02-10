import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkFrontmatter from 'remark-frontmatter'
import rehypeRaw from 'rehype-raw'

import 'github-markdown-css/github-markdown.css'

interface MarkdownRenderProps {
  children: string
}

export default function MarkdownRender({ children }: MarkdownRenderProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks, remarkFrontmatter]} rehypePlugins={[rehypeRaw]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
