import React, { useState } from 'react'
import Button from '@components/ui/Button'
import Modal from '@components/ui/Modal'
import { MoreHorizontal, Edit, Trash2, RotateCcw, Eye } from 'lucide-react'

const TableActions = ({
  item,
  actions = [],
  onEdit,
  onDelete,
  onRestore,
  onView,
  canEdit = true,
  canDelete = true,
  canRestore = false,
  canView = true
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const defaultActions = [
    ...(canView ? [{
      label: 'View',
      icon: Eye,
      onClick: () => onView?.(item),
      variant: 'ghost'
    }] : []),
    ...(canEdit ? [{
      label: 'Edit',
      icon: Edit,
      onClick: () => onEdit?.(item),
      variant: 'ghost'
    }] : []),
    ...(canRestore ? [{
      label: 'Restore',
      icon: RotateCcw,
      onClick: () => onRestore?.(item),
      variant: 'ghost'
    }] : []),
    ...(canDelete ? [{
      label: 'Delete',
      icon: Trash2,
      onClick: () => setShowDeleteModal(true),
      variant: 'ghost',
      className: 'text-error-600 hover:text-error-700'
    }] : [])
  ]

  const allActions = [...defaultActions, ...actions]

  const handleDelete = () => {
    onDelete?.(item)
    setShowDeleteModal(false)
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMenu(!showMenu)}
          className="p-1"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {showMenu && (
          <>
            {/* Overlay to close menu */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu */}
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
              <div className="py-1">
                {allActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        action.onClick()
                        setShowMenu(false)
                      }}
                      className={`flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${action.className || ''}`}
                    >
                      {Icon && <Icon className="h-4 w-4 mr-3" />}
                      {action.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default TableActions
