/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import * as serverManager from './api/todos';
import { Todo } from './types/Todo';
import classNames from 'classnames';

export const App: React.FC = () => {
  if (!serverManager.USER_ID) {
    return <UserWarning />;
  }

  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoadingTodos, setIsLoadingTodos] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'active' | 'completed'>(
    'all',
  );
  const [todoTitle, setTodoTitle] = useState('');
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [hasTitleError, setHasTitleError] = useState(false);
  const [unableToLoadTodos, setUnableToLoadTodos] = useState(false);
  const [unableToAddTodo, setUnableToAddTodo] = useState(false);
  const [unableToUpdateTodo, setUnableToUpdateTodo] = useState(false);
  const [unableToDeleteTodo, setUnableToDeleteTodo] = useState(false);
  const [hasAnyError, setHasAnyError] = useState(false);
  const [showError, setShowError] = useState(false);

  const [todoIsLoading, setTodoIsLoading] = useState<{ [id: number]: boolean }>(
    {},
  );
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [tempTitles, setTempTitles] = useState<{ [id: number]: string }>({});
  const [tempStatuses, setTempStatuses] = useState<{ [id: number]: boolean }>(
    {},
  );

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const inputDisabled =
    isCreating || Object.values(todoIsLoading).some(Boolean);

  const visibleTodos = todos.filter(todo => {
    // For filtering, use the original status during optimistic updates to prevent hiding
    // Only use temp status if the todo is not currently being updated
    const statusForFiltering = todoIsLoading[todo.id]
      ? todo.completed
      : tempStatuses.hasOwnProperty(todo.id)
        ? tempStatuses[todo.id]
        : todo.completed;

    if (filterType === 'active') {
      return !statusForFiltering;
    }

    if (filterType === 'completed') {
      return statusForFiltering;
    }

    return true;
  });

  const clearErrors = () => {
    setHasTitleError(false);
    setUnableToLoadTodos(false);
    setUnableToAddTodo(false);
    setUnableToUpdateTodo(false);
    setUnableToDeleteTodo(false);
  };

  function loadTodos() {
    setIsLoadingTodos(true);
    serverManager
      .getTodos()
      .then(setTodos)
      .catch(() => setUnableToLoadTodos(true))
      .finally(() => setIsLoadingTodos(false));
  }

  function createTodo(title: string) {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setHasTitleError(true);
      inputRef.current?.focus();

      return;
    }

    const temp: Todo = {
      id: 0,
      title: trimmedTitle,
      completed: false,
      userId: serverManager.USER_ID,
    };

    setTempTodo(temp);
    setIsCreating(true);
    inputRef.current?.blur();

    serverManager
      .addTodo({
        title: trimmedTitle,
        userId: serverManager.USER_ID,
        completed: false,
      })
      .then(newTodo => {
        setTodos(prev => [...prev, newTodo]);
        setTodoTitle('');
      })
      .catch(() => setUnableToAddTodo(true))
      .finally(() => {
        setTempTodo(null);
        setIsCreating(false);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      });
  }

  function updateTodo(todo: Todo, isFromTitleEdit = false) {
    setTodoIsLoading(prev => ({ ...prev, [todo.id]: true }));

    serverManager
      .updateTodo({ ...todo, title: todo.title.trim() })
      .then(updated => {
        setTodos(prev => prev.map(t => (t.id === updated.id ? updated : t)));
        // Remove temp data since update succeeded
        setTempTitles(prev => {
          const copy = { ...prev };

          delete copy[todo.id];

          return copy;
        });
        setTempStatuses(prev => {
          const copy = { ...prev };

          delete copy[todo.id];

          return copy;
        });
      })
      .catch(() => {
        setUnableToUpdateTodo(true);
        // Remove temp data to show original values on failure
        setTempTitles(prev => {
          const copy = { ...prev };

          delete copy[todo.id];

          return copy;
        });
        setTempStatuses(prev => {
          const copy = { ...prev };

          delete copy[todo.id];

          return copy;
        });
        // Only reopen edit mode for failed title edits
        if (isFromTitleEdit) {
          setEditingTodoId(todo.id);
          setEditingTitle(todo.title);
        }
      })
      .finally(() => {
        setTodoIsLoading(prev => {
          const copy = { ...prev };

          delete copy[todo.id];

          return copy;
        });
      });
  }

  function deleteTodo(
    todoId: number,
    fromTitleEdit = false,
    originalTitle = '',
  ) {
    setTodoIsLoading(prev => ({ ...prev, [todoId]: true }));

    serverManager
      .deleteTodo(todoId)
      .then(() => {
        setTodos(prev => prev.filter(t => t.id !== todoId));
        // Only close edit mode on successful delete from title edit
        if (fromTitleEdit) {
          setEditingTodoId(null);
        }
      })
      .catch(() => {
        setUnableToDeleteTodo(true);
        // For title edit deletion failures, keep edit mode open with original title
        if (fromTitleEdit) {
          setEditingTitle(originalTitle);
        }
      })
      .finally(() => {
        setTodoIsLoading(prev => {
          const copy = { ...prev };

          delete copy[todoId];

          return copy;
        });
        if (!fromTitleEdit) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
        }
      });
  }

  useEffect(() => {
    loadTodos();
    setHasAnyError(
      hasTitleError ||
        unableToLoadTodos ||
        unableToAddTodo ||
        unableToUpdateTodo ||
        unableToDeleteTodo,
    );
  }, [
    hasTitleError,
    unableToLoadTodos,
    unableToAddTodo,
    unableToUpdateTodo,
    unableToDeleteTodo,
  ]);

  useEffect(() => {
    if (hasAnyError) {
      setShowError(true);

      const timer = setTimeout(() => {
        setShowError(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [hasAnyError]);

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>
      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length > 0 && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: todos.every(t => t.completed),
              })}
              data-cy="ToggleAllButton"
              onClick={() => {
                const allCompleted = todos.every(t => t.completed);

                todos.forEach(t => {
                  if (t.completed === allCompleted) {
                    updateTodo({ ...t, completed: !allCompleted }, false);
                  }
                });
              }}
            />
          )}

          <form
            onSubmit={e => {
              e.preventDefault();
              if (isCreating) {
                return;
              }

              createTodo(todoTitle);
            }}
          >
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={todoTitle}
              onChange={e => setTodoTitle(e.target.value)}
              disabled={inputDisabled}
            />
          </form>
        </header>

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
                  checked={
                    tempStatuses.hasOwnProperty(todo.id)
                      ? tempStatuses[todo.id]
                      : todo.completed
                  }
                  onChange={() => {
                    const newStatus = !todo.completed;

                    setTempStatuses(prev => ({
                      ...prev,
                      [todo.id]: newStatus,
                    }));
                    updateTodo({ ...todo, completed: newStatus }, false);
                  }}
                />
              </label>

              {editingTodoId === todo.id ? (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const trimmedTitle = editingTitle.trim();

                    if (trimmedTitle && trimmedTitle !== todo.title) {
                      setEditingTodoId(null);
                      // Set temporary title for optimistic update
                      setTempTitles(prev => ({
                        ...prev,
                        [todo.id]: trimmedTitle,
                      }));
                      updateTodo({ ...todo, title: trimmedTitle }, true);
                    } else if (!trimmedTitle) {
                      // Delete todo if title is empty - keep edit mode open until success
                      deleteTodo(todo.id, true, todo.title);
                    } else {
                      // Title is the same, just cancel editing
                      setEditingTodoId(null);
                    }
                  }}
                >
                  <input
                    data-cy="TodoTitleField"
                    type="text"
                    className="todo__title-field"
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onBlur={() => {
                      const trimmedTitle = editingTitle.trim();

                      if (trimmedTitle && trimmedTitle !== todo.title) {
                        setEditingTodoId(null);
                        // Set temporary title for optimistic update
                        setTempTitles(prev => ({
                          ...prev,
                          [todo.id]: trimmedTitle,
                        }));
                        updateTodo({ ...todo, title: trimmedTitle }, true);
                      } else if (!trimmedTitle) {
                        // Delete todo if title is empty - keep edit mode open until success
                        deleteTodo(todo.id, true, todo.title);
                      } else {
                        // Title is the same, just cancel editing
                        setEditingTodoId(null);
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setEditingTodoId(null);
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
                  {tempTitles[todo.id] || todo.title}
                </span>
              )}

              {editingTodoId !== todo.id && (
                <button
                  type="button"
                  className="todo__remove"
                  data-cy="TodoDelete"
                  onClick={() => deleteTodo(todo.id, false, '')}
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
              <button type="button" className="todo__remove">
                ×
              </button>
              <div data-cy="TodoLoader" className="modal overlay is-active">
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          )}
        </section>

        {todos.length > 0 && !isLoadingTodos && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(t => !t.completed).length} items left
            </span>
            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                data-cy="FilterLinkAll"
                className={classNames('filter__link', {
                  selected: filterType === 'all',
                })}
                onClick={() => setFilterType('all')}
              >
                All
              </a>
              <a
                href="#/active"
                data-cy="FilterLinkActive"
                className={classNames('filter__link', {
                  selected: filterType === 'active',
                })}
                onClick={() => setFilterType('active')}
              >
                Active
              </a>
              <a
                href="#/completed"
                data-cy="FilterLinkCompleted"
                className={classNames('filter__link', {
                  selected: filterType === 'completed',
                })}
                onClick={() => setFilterType('completed')}
              >
                Completed
              </a>
            </nav>
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={todos.filter(t => t.completed).length === 0}
              onClick={() =>
                todos
                  .filter(t => t.completed)
                  .forEach(t => deleteTodo(t.id, false, ''))
              }
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          { hidden: !showError },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={clearErrors}
        />
        {unableToLoadTodos && <p>Unable to load todos</p>}
        {hasTitleError && <p>Title should not be empty</p>}
        {unableToAddTodo && <p>Unable to add a todo</p>}
        {unableToDeleteTodo && <p>Unable to delete a todo</p>}
        {unableToUpdateTodo && <p>Unable to update a todo</p>}
      </div>
    </div>
  );
};
