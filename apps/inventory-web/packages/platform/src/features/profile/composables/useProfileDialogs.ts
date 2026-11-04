import { ref, type Ref } from 'vue'
import { toast } from 'vue-sonner'

export interface ProfileDialogsReturn {
  showEditAddress: Ref<boolean>
  handleActionClick: (tabId: string) => void
}

export function useProfileDialogs(): ProfileDialogsReturn {
  const showEditAddress = ref(false)

  const handleActionClick = (tabId: string) => {
    if (tabId === 'address') {
      showEditAddress.value = true
    } else {
      toast.info(`Fitur edit untuk tab ${tabId} akan segera hadir`)
    }
  }

  return {
    showEditAddress,
    handleActionClick,
  }
}
