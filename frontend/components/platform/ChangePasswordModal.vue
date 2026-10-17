<template>
  <PlatformModal :model-value="modelValue" titulo="Alterar minha senha" subtitulo="Você será desconectado ao concluir" pequena @update:model-value="fechar">
    <template #icone><KeyRound :size="18" /></template>
    <form class="pf-boxm" @submit.prevent="salvar">
      <div class="pf-fld">
        <label class="pf-lab" for="cp-atual">Senha atual</label>
        <input id="cp-atual" v-model="form.senhaAtual" class="pf-inp" type="password" autocomplete="current-password">
      </div>
      <div class="pf-fld">
        <label class="pf-lab" for="cp-nova">Nova senha <small>(mínimo 8 caracteres)</small></label>
        <input id="cp-nova" v-model="form.novaSenha" class="pf-inp" type="password" autocomplete="new-password">
      </div>
      <div class="pf-fld">
        <label class="pf-lab" for="cp-conf">Confirmar nova senha</label>
        <input id="cp-conf" v-model="form.confirmar" class="pf-inp" type="password" autocomplete="new-password" :aria-invalid="!!form.confirmar && form.confirmar !== form.novaSenha">
      </div>
      <p v-if="erro" class="pf-err" role="alert">{{ erro }}</p>
      <button type="submit" hidden />
    </form>
    <template #rodape>
      <button class="pf-btn" @click="fechar">Cancelar</button>
      <button class="pf-btn p" :disabled="salvando" @click="salvar">
        <Loader2 v-if="salvando" :size="16" class="animate-spin" /> Salvar
      </button>
    </template>
  </PlatformModal>
</template>

<script setup lang="ts">
import { KeyRound, Loader2 } from 'lucide-vue-next'
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
