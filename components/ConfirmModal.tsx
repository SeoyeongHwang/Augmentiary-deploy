import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Button } from './index'

interface ConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
}

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title = "저장되지 않은 정보",
  message = "저장되지 않은 정보는 사라집니다. 뒤로가시겠습니까?",
  confirmText = "뒤로가기",
  cancelText = "취소"
}: ConfirmModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onCancel}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-[opacity,transform]">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />
                  </div>
                  <Dialog.Title
                    as="h3"
                    className="text-balance text-lg font-medium leading-6 text-gray-900"
                  >
                    {title}
                  </Dialog.Title>
                </div>

                <div className="mt-2">
                  <p className="text-pretty text-sm text-gray-600">
                    {message}
                  </p>
                </div>

                <div className="mt-6 flex space-x-3">
                  <Button
                    onClick={onCancel}
                    className="flex-1 bg-stone-300 text-stone-700 hover:bg-stone-400"
                  >
                    {cancelText}
                  </Button>
                  <Button
                    onClick={onConfirm}
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    {confirmText}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
