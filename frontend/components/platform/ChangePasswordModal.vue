<template>
  <UModal :model-value="modelValue" @update:model-value="fechar"
    :ui="{ width: 'max-w-sm', background: 'bg-[#0e0d18]', ring: 'ring-1 ring-white/[0.09]', rounded: 'rounded-2xl' }">
    <UCard :ui="{ background: 'bg-transparent', ring: '', divide: 'divide-white/[0.07]', header: { padding: 'px-5 py-4' }, body: { padding: 'p-5' }, footer: { padding: 'px-5 pb-5 pt-0' } }">

      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
              <UIcon name="i-lucide-key-round" class="text-white size-4" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-white">Alterar minha senha</h2>
              <p class="text-white/30 text-[10px]">Você será desconectado ao concluir</p>
            </div>
          </div>
          <button @click="fechar" class="size-7 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
            <UIcon name="i-lucide-x" class="size-3.5" />
          </button>
        </div>
      </template>

      <form class="space-y-3" @submit.prevent="salvar">
        <div>
          <label class="label-field">Senha atual</label>
          <UInput v-model="form.senhaAtual" type="password" autocomplete="current-password" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
        </div>
        <div>
          <label class="label-field">Nova senha <span class="normal-case font-normal text-white/20">(mín. 8 caracteres)</span></label>
          <UInput v-model="form.novaSenha" type="password" autocomplete="new-password" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
        </div>
        <div>
          <label class="label-field">Confirmar nova senha</label>
          <UInput v-model="form.confirmar" type="password" autocomplete="new-password" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
        </div>
        <p v-if="erro" class="text-[11px] text-red-400">{{ erro }}</p>
        <button type="submit" class="hidden" />
      </form>

      <template #footer>
        <div class="flex gap-2">
          <UButton color="gray" variant="ghost" block :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-sm' }" @click="fechar">Cancelar</UButton>
          <UButton color="violet" block :loading="salvando" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-sm' }" @click="salvar">Salvar</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { usePlatformAuthStore } from '~/stores/platformAuth'

const props = defineProps<{ modelValue: boolean }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean] }>()

const toast             = useToast()
const platformAuth      = usePlatformAuthStore()
const { platformFetch } = usePlatformFetch()

const form     = reactive({ senhaAtual: '', novaSenha: '', confirmar: '' })
const erro     = ref('')
const salvando = ref(false)

watch(() => props.modelValue, aberto => {
  if (aberto) { form.senhaAtual = ''; form.novaSenha = ''; form.confirmar = ''; erro.value = '' }
})

function fechar() { emit('update:modelValue', false) }

async function salvar() {
  erro.value = ''
  if (!form.senhaAtual) { erro.value = 'Informe a senha atual'; return }
  if (form.novaSenha.length < 8) { erro.value = 'A nova senha deve ter no mínimo 8 caracteres'; return }
  if (form.novaSenha !== form.confirmar) { erro.value = 'As senhas não conferem'; return }

  salvando.value = true
  try {
    await platformFetch('/platform/auth/alterar-senha', {
      method: 'POST',
      body: JSON.stringify({ senhaAtual: form.senhaAtual, novaSenha: form.novaSenha }),
    })
    toast.add({ title: 'Senha alterada', description: 'Entre novamente com a nova senha.', color: 'green' })
    fechar()
    // O backend revoga todas as sessões; força novo login já com a senha nova
    platformAuth.logout()
    navigateTo('/platform/login')
  } catch (e: any) {
    erro.value = e.message
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
.label-field { display: block; margin-bottom: 0.375rem; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.3); }
.input-dark :deep(input) { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); }
.input-dark :deep(input):focus { border-color: rgba(139,92,246,0.5); background: rgba(255,255,255,0.06); }
</style>
