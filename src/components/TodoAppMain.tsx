/* eslint-disable jsx-a11y/label-has-associated-control */
import classNames from 'classnames';
import React, { useState } from 'react';
import { TodoAppMainProps } from '../types/commonTypes';

export const TodoAppMain: React.FC<TodoAppMainProps> = ({
  visibleTodos,
  onUpdate,
  onDelete,
  isCreating,
  tempTodo,
  todoIsLoading,
}) => {
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const handleTodoEdit = (todo: any, newTitle: string) => {
    const trimmedTitle = newTitle.trim();

    if (trimmedTitle && trimmedTitle !== todo.title) {
      setEditingTodoId(null);
      onUpdate({ ...todo, title: trimmedTitle });
    } else if (!trimmedTitle) {
      onDelete(todo.id);
    } else {
      setEditingTodoId(null);
    }
  };

  return (
    <section className="todoapp__main" data-cy="TodoList">
      {visibleTodos.map(todo => (
        <div
          key={todo.id}
          className={classNames('todo', { completed: todo.completed })}
          data-cy="Todo"
        >
          <label className="todo__status-label">
            <input
              data-cy="TodoStatus"
              type="checkbox"
              className="todo__status"
              checked={todo.completed}
              onChange={() => {
                onUpdate({ ...todo, completed: !todo.completed });
              }}
            />
          </label>

          {editingTodoId === todo.id ? (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleTodoEdit(todo, editingTitle);
              }}
            >
              <input
                data-cy="TodoTitleField"
                type="text"
                className="todo__title-field"
                value={editingTitle}
                onChange={e => setEditingTitle(e.target.value)}
                onBlur={() => handleTodoEdit(todo, editingTitle)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setEditingTodoId(null);
                    setEditingTitle('');
                  }
                }}
                disabled={isCreating}
                autoFocus
              />
            </form>
          ) : (
            <span
              data-cy="TodoTitle"
              className="todo__title"
              onDoubleClick={() => {
                setEditingTodoId(todo.id);
                setEditingTitle(todo.title);
              }}
            >
              {todo.title}
            </span>
          )}

          {editingTodoId !== todo.id && (
            <button
              type="button"
              className="todo__remove"
              data-cy="TodoDelete"
              onClick={() => onDelete(todo.id)}
              disabled={todoIsLoading[todo.id]}
            >
              ×
            </button>
          )}

          <div
            data-cy="TodoLoader"
            className={classNames('modal overlay', {
              'is-active': todoIsLoading[todo.id],
            })}
          >
            <div className="modal-background has-background-white-ter" />
            <div className="loader" />
          </div>
        </div>
      ))}

      {/* Temp Todo */}
      {tempTodo && (
        <div className="todo" data-cy="Todo">
          <label className="todo__status-label">
            <input
              type="checkbox"
              className="todo__status"
              checked={tempTodo.completed}
              disabled
            />
          </label>
          <span data-cy="TodoTitle" className="todo__title">
            {tempTodo.title}
          </span>
          <button type="button" className="todo__remove" disabled>
            ×
          </button>
          <div data-cy="TodoLoader" className="modal overlay is-active">
            <div className="modal-background has-background-white-ter" />
            <div className="loader" />
          </div>
        </div>
      )}
    </section>
  );
};
