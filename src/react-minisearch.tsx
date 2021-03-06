import MiniSearch, { Options, SearchOptions, Suggestion } from 'minisearch'
import React, { useEffect, useState, PropsWithChildren } from 'react'

export interface UseMiniSearch<T = object> {
  search: (query: string, options?: SearchOptions<T>) => void,
  searchResults: T[] | null,
  autoSuggest: (query: string, options?: SearchOptions<T>) => void,
  suggestions: Suggestion[] | null,
  add: (document: T) => void,
  addAll: (documents: T[]) => void,
  addAllAsync: (documents: T[], options?: { chunkSize?: number }) => Promise<void>,
  remove: (document: T) => void,
  removeById: (id: any) => void,
  isIndexing: boolean,
  clearSearch: () => void,
  clearSuggestions: () => void,
  miniSearch: MiniSearch<T>
}

export function useMiniSearch<T = object> (documents: T[], options: Options<T>): UseMiniSearch<T> {
  const [miniSearch] = useState(new MiniSearch<T>(options))
  const [searchResults, setSearchResults] = useState(null)
  const [suggestions, setSuggestions] = useState(null)
  const [documentById, setDocumentById] = useState<{ [key: string]: T }>({})
  const [isIndexing, setIsIndexing] = useState(false)
  const idField = options.idField || 'id'

  useEffect(() => {
    addAll(documents)
  }, [])

  const search = (query: string, searchOptions?: SearchOptions<T>): void => {
    const results = miniSearch.search(query, searchOptions)
    const searchResults = results.map(({ id }) => documentById[id])
    setSearchResults(searchResults)
  }

  const autoSuggest = (query: string, searchOptions?: SearchOptions<T>): void => {
    const suggestions = miniSearch.autoSuggest(query, searchOptions)
    setSuggestions(suggestions)
  }

  const add = (document: T): void => {
    setDocumentById({ ...documentById, [document[idField]]: document })
    miniSearch.add(document)
  }

  const addAll = (documents: T[]): void => {
    const byId = documents.reduce((acc, doc) => {
      acc[doc[idField]] = doc
      return acc
    }, {})

    setDocumentById(Object.assign({}, documentById, byId))
    miniSearch.addAll(documents)
  }

  const addAllAsync = (documents: T[], options?: { chunkSize?: number }): Promise<void> => {
    const byId = documents.reduce((acc, doc) => {
      acc[doc[idField]] = doc
      return acc
    }, {})

    setDocumentById(Object.assign({}, documentById, byId))
    setIsIndexing(true)

    return miniSearch.addAllAsync(documents, options || {}).then(() => {
      setIsIndexing(false)
    })
  }

  const remove = (document: T): void => {
    miniSearch.remove(document)
    setDocumentById(removeFromMap<T>(documentById, document[idField]))
  }

  const removeById = (id: any): void => {
    const document = documentById[id]
    if (document == null) {
      throw new Error(`react-minisearch: document with id ${id} does not exist in the index`)
    }
    miniSearch.remove(document)
    setDocumentById(removeFromMap<T>(documentById, id))
  }

  const clearSearch = (): void => {
    setSearchResults(null)
  }

  const clearSuggestions = (): void => {
    setSuggestions(null)
  }

  return {
    search,
    searchResults,
    autoSuggest,
    suggestions,
    add,
    addAll,
    addAllAsync,
    remove,
    removeById,
    isIndexing,
    clearSearch,
    clearSuggestions,
    miniSearch
  }
}

function removeFromMap<T> (map: { [key: string]: T }, keyToRemove: any): { [key: string]: T } {
  const newMap = Object.assign({}, map)
  delete newMap[keyToRemove]
  return newMap
}

function getDisplayName<PropsT> (Component: React.ComponentType<PropsT>): string {
  return Component.displayName || Component.name || 'Component'
}

export function withMiniSearch<OwnProps, T = object> (
  documents: T[],
  options: Options<T>,
  Component: React.ComponentType<OwnProps & UseMiniSearch<T>>,
): React.FC<OwnProps> {
  const WithMiniSearch = (props: OwnProps) => {
    const miniSearchProps = useMiniSearch<T>(documents, options)
    return <Component {...miniSearchProps} {...props} />
  }

  WithMiniSearch.displayName = `WithMiniSearch(${getDisplayName(Component)})`

  return WithMiniSearch
}

export interface WithMiniSearchProps<T = object> {
  documents: T[],
  options: Options<T>,
  children: (props: UseMiniSearch<T>) => JSX.Element | null,
}

export const WithMiniSearch = <T, >({ documents, options, children }: PropsWithChildren<WithMiniSearchProps<T>>) => {
  const miniSearchProps = useMiniSearch<T>(documents, options)
  return children(miniSearchProps)
}
