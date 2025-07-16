import React from 'react'
import { cn } from '@utils/helpers'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@components/ui/Table'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import Pagination from '@components/ui/Pagination'
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react'

const DataTable = ({
  columns,
  data,
  sortBy,
  sortOrder,
  onSort,
  selectedRows,
  onRowSelect,
  onSelectAll,
  isAllSelected,
  pagination,
  onPageChange,
  loading = false,
  emptyMessage = 'No data available',
  className
}) => {
  const getSortIcon = (column) => {
    if (sortBy !== column.key) return null
    
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    )
  }

  const renderCell = (item, column) => {
    if (column.render) {
      return column.render(item[column.key], item)
    }

    const value = item[column.key]

    // Handle different data types
    if (column.type === 'badge') {
      return (
        <Badge variant={column.getBadgeVariant?.(value) || 'default'}>
          {value}
        </Badge>
      )
    }

    if (column.type === 'boolean') {
      return (
        <Badge variant={value ? 'success' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      )
    }

    if (column.type === 'date') {
      return value ? new Date(value).toLocaleDateString() : '-'
    }

    if (column.type === 'datetime') {
      return value ? new Date(value).toLocaleString() : '-'
    }

    return value || '-'
  }

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Selection checkbox */}
              {onRowSelect && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </TableHead>
              )}

              {/* Column headers */}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.sortable && 'cursor-pointer hover:bg-gray-50',
                    column.width && `w-${column.width}`,
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  onClick={() => column.sortable && onSort?.(column.key)}
                >
                  <div className="flex items-center">
                    {column.title}
                    {column.sortable && getSortIcon(column)}
                  </div>
                </TableHead>
              ))}

              {/* Actions column */}
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (onRowSelect ? 2 : 1)}
                  className="text-center py-12 text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow
                  key={item.id}
                  className={cn(
                    'hover:bg-gray-50',
                    selectedRows?.has(item.id) && 'bg-primary-50'
                  )}
                >
                  {/* Selection checkbox */}
                  {onRowSelect && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedRows?.has(item.id) || false}
                        onChange={() => onRowSelect(item.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </TableCell>
                  )}

                  {/* Data cells */}
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {renderCell(item, column)}
                    </TableCell>
                  ))}

                  {/* Actions */}
                  <TableCell>
                    <Button variant="ghost" size="sm" className="p-1">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
          showInfo={true}
        />
      )}
    </div>
  )
}

export default DataTable
