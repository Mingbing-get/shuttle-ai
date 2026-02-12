import classNames from 'classnames'
import { UnorderedListOutlined } from '@ant-design/icons'

import { useTool } from '../../context'

import './render.scss'

export interface TodoItem {
  content: string
  status: 'in_progress' | 'pending' | 'completed'
}

export default function WriteTodosRender() {
  const { args } = useTool<{ todos: TodoItem[] }>()

  return (
    <ul className="shuttle-ai-tool-todo">
      <li className="shuttle-ai-tool-todo-header">
        <UnorderedListOutlined /> 待办
      </li>
      {args.todos.map((todo, index) => (
        <li
          key={todo.content}
          className={classNames(
            'shuttle-ai-tool-todo-item',
            `status-${todo.status}`,
          )}
        >
          {index + 1}. {todo.content}
        </li>
      ))}
    </ul>
  )
}
