import { useState, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'

export const useTable = (data = [], options = {}) => {
  const {
    defaultPageSize = 20,
    defaultSortBy = 'id',
    defaultSortOrder = 'asc',
    storageKey = null
  } = options

  // Persistent state with localStorage
  const [pageSize, setPageSize] = useLocalStorage(
    storageKey ? `${storageKey}_pageSize` : null,
    defaultPageSize
  )
  const [sortBy, setSortBy] = useLocalStorage(
    storageKey ? `${storageKey}_sortBy` : null,
    defaultSortBy
  )
  const [sortOrder, setSortOrder] = useLocalStorage(
    storageKey ? `${storageKey}_sortOrder` : null,
    defaultSortOrder
  )

  // Local state
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [filters, setFilters] = useState({})
  const [searchTerm, setSearchTerm] = useState('')

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = [...data]

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        filtered = filtered.filter(item => {
          if (typeof value === 'boolean') {
            return item[key] === value
          }
          return item[key]?.toString().toLowerCase().includes(value.toString().toLowerCase())
        })
      }
    })

    return filtered
  }, [data, searchTerm, filters])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortBy) return filteredData

    return [...filteredData].sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]

      // Handle null/undefined values
      if (aValue == null) aValue = ''
      if (bValue == null) bValue = ''

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [filteredData, sortBy, sortOrder])

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, pageSize])

  // Calculate pagination info
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const totalItems = sortedData.length

  // Handlers
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    setCurrentPage(1)
  }

  const handleFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
    setCurrentPage(1)
  }

  // Row selection
  const handleRowSelect = (id) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(paginatedData.map(item => item.id)))
    }
  }

  const clearSelection = () => {
    setSelectedRows(new Set())
  }

  return {
    // Data
    data: paginatedData,
    allData: sortedData,
    originalData: data,

    // Pagination
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    handlePageChange,
    handlePageSizeChange,

    // Sorting
    sortBy,
    sortOrder,
    handleSort,

    // Filtering
    searchTerm,
    filters,
    handleSearch,
    handleFilter,
    clearFilters,

    // Selection
    selectedRows,
    selectedCount: selectedRows.size,
    isAllSelected: selectedRows.size === paginatedData.length && paginatedData.length > 0,
    handleRowSelect,
    handleSelectAll,
    clearSelection,

    // Utilities
    isEmpty: data.length === 0,
    isFiltered: searchTerm || Object.keys(filters).length > 0,
    hasSelection: selectedRows.size > 0
  }
}
