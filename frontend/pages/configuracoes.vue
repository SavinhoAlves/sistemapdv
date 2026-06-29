<template>
  <div class="min-h-screen bg-neutral-100 dark:bg-neutral-950 transition-colors duration-200">
    <Navbar />

    <main class="max-w-6xl mx-auto px-6 py-8">

      <!-- HEADER -->
      <div class="mb-6">
        <h1 class="text-2xl font-black text-neutral-900 dark:text-white">Configurações</h1>
        <p class="text-sm text-neutral-400 mt-1">Personalize o sistema e as fichas impressas</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        <!-- ══ COLUNA ESQUERDA: formulário ══ -->
        <div class="lg:col-span-2 space-y-6">

          <!-- ══ CARD: IDENTIDADE ══ -->
          <div class="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div class="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                <UtensilsCrossed :size="14" class="text-orange-500" />
              </div>
              <div>
                <h2 class="text-sm font-black text-neutral-900 dark:text-white">Identidade</h2>
                <p class="text-[11px] text-neutral-400 mt-0.5">Nome e logotipo exibidos nas fichas</p>
              </div>
            </div>

            <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">

              <!-- LOGO -->
              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Logotipo</label>
                <div class="flex items-start gap-4">
                  <div class="w-24 h-24 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center shrink-0 overflow-hidden bg-neutral-50 dark:bg-neutral-800">
                    <img v-if="form.logo_base64" :src="form.logo_base64" class="w-full h-full object-contain p-1" alt="Logo" />
                    <div v-else class="flex flex-col items-center gap-1 text-neutral-400">
                      <ImageIcon :size="24" />
                      <span class="text-[10px] font-bold">Sem logo</span>
                    </div>
                  </div>
                  <div class="flex flex-col gap-2 pt-1">
                    <button @click="inputLogoRef?.click()"
                      class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-black transition-all active:scale-95 flex items-center gap-1.5">
                      <Upload :size="13" />
                      {{ form.logo_base64 ? 'Trocar logo' : 'Enviar logo' }}
                    </button>
                    <button v-if="form.logo_base64" @click="form.logo_base64 = null"
                      class="h-9 px-4 rounded-xl border border-red-200 dark:border-red-900 text-red-500 text-xs font-black hover:bg-red-50 dark:hover:bg-red-950/40 transition-all">
                      Remover logo
                    </button>
                    <p class="text-[10px] text-neutral-400 leading-relaxed max-w-[160px]">
                      PNG ou JPG. Recomendado: 200×200 px, fundo transparente.
                    </p>
                    <input ref="inputLogoRef" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onLogoChange" />
                  </div>
                </div>
              </div>

              <!-- NOME -->
              <div class="flex flex-col justify-center">
                <label for="nome-restaurante" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                  Nome do estabelecimento
                </label>
                <input
                  id="nome-restaurante" v-model="form.nome_restaurante"
                  type="text" maxlength="100" placeholder="Ex: Restaurante do Chef"
                  class="w-full h-12 px-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-sm outline-none focus:border-orange-500 transition-all"
                />
              </div>

            </div>
          </div>

          <!-- ══ CARD: FICHAS ══ -->
          <div class="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div class="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                <FileText :size="14" class="text-blue-500" />
              </div>
              <div>
                <h2 class="text-sm font-black text-neutral-900 dark:text-white">Fichas</h2>
                <p class="text-[11px] text-neutral-400 mt-0.5">Texto exibido ao final de cada ficha impressa</p>
              </div>
            </div>
            <div class="p-6">
              <label for="mensagem-ficha" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                Mensagem de rodapé
              </label>
              <input
                id="mensagem-ficha" v-model="form.mensagem_ficha"
                type="text" maxlength="200" placeholder="Ex: Obrigado pela preferência!"
                class="w-full h-12 px-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-sm outline-none focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <!-- ══ CARD: IMPRESSORA ══ -->
          <div class="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div class="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center shrink-0">
                <Printer :size="14" class="text-purple-500" />
              </div>
              <div>
                <h2 class="text-sm font-black text-neutral-900 dark:text-white">Impressora</h2>
                <p class="text-[11px] text-neutral-400 mt-0.5">Configurações de impressão das fichas</p>
              </div>
            </div>

            <div class="p-6 space-y-6">

              <!-- LARGURA DO PAPEL + CÓPIAS lado a lado -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">

                <!-- LARGURA DO PAPEL -->
                <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                    Largura do papel
                  </label>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      v-for="op in larguras" :key="op.value"
                      @click="form.impressora_largura = op.value"
                      class="flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left"
                      :class="form.impressora_largura === op.value
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'"
                    >
                      <div class="shrink-0 flex items-end gap-0.5 h-8">
                        <div class="bg-current rounded-sm w-1"
                          :style="{ height: op.value === 58 ? '60%' : '100%' }"
                          :class="form.impressora_largura === op.value ? 'text-orange-500' : 'text-neutral-300 dark:text-neutral-600'"
                        />
                        <div class="bg-current rounded-sm"
                          :style="{ width: op.value === 58 ? '18px' : '26px', height: '100%' }"
                          :class="form.impressora_largura === op.value ? 'text-orange-400' : 'text-neutral-200 dark:text-neutral-700'"
                        />
                      </div>
                      <div>
                        <p class="text-sm font-black"
                          :class="form.impressora_largura === op.value ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-800 dark:text-neutral-200'">
                          {{ op.label }}
                        </p>
                        <p class="text-[10px] text-neutral-400 mt-0.5">{{ op.desc }}</p>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- CÓPIAS -->
                <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                    Cópias por ficha
                  </label>
                  <div class="flex items-center gap-3">
                    <button @click="form.impressora_copias = Math.max(1, form.impressora_copias - 1)"
                      class="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-all active:scale-95 font-black text-neutral-700 dark:text-neutral-300">
                      <Minus :size="14" />
                    </button>
                    <div class="flex-1 h-12 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center">
                      <span class="text-2xl font-black text-neutral-900 dark:text-white">{{ form.impressora_copias }}</span>
                    </div>
                    <button @click="form.impressora_copias = Math.min(5, form.impressora_copias + 1)"
                      class="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-all active:scale-95 font-black text-neutral-700 dark:text-neutral-300">
                      <Plus :size="14" />
                    </button>
                  </div>
                  <p class="text-xs text-neutral-400 mt-2">
                    {{ form.impressora_copias === 1 ? '1 via por produto' : `${form.impressora_copias} vias por produto` }}
                  </p>
                </div>

              </div>

              <!-- AUTO-IMPRIMIR -->
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-black text-neutral-900 dark:text-white">Imprimir automaticamente</p>
                  <p class="text-[11px] text-neutral-400 mt-0.5">Abre a impressão assim que a venda é confirmada, sem precisar clicar em "Imprimir"</p>
                </div>
                <button
                  @click="form.impressora_auto_imprimir = !form.impressora_auto_imprimir"
                  class="shrink-0 w-12 h-6 rounded-full transition-all relative"
                  :class="form.impressora_auto_imprimir ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-neutral-700'"
                >
                  <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                    :class="form.impressora_auto_imprimir ? 'left-[26px]' : 'left-0.5'" />
                </button>
              </div>

            </div>
          </div>

          <!-- SALVAR -->
          <div class="flex justify-end pb-8">
            <button
              @click="salvar"
              :disabled="salvando"
              class="h-12 px-8 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-black text-sm transition-all active:scale-95 flex items-center gap-2"
            >
              <Loader2 v-if="salvando" :size="15" class="animate-spin" />
              <Save v-else :size="15" />
              {{ salvando ? 'Salvando…' : 'Salvar configurações' }}
            </button>
          </div>

        </div>

        <!-- ══ COLUNA DIREITA: preview sticky ══ -->
        <div class="lg:sticky lg:top-6">
          <div class="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div class="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center shrink-0">
                <Eye :size="14" class="text-green-500" />
              </div>
              <div>
                <h2 class="text-sm font-black text-neutral-900 dark:text-white">Preview da Ficha</h2>
                <p class="text-[11px] text-neutral-400 mt-0.5">Como ficará a ficha individual de cada produto</p>
              </div>
            </div>
            <div class="p-6 flex justify-center">
              <div
                class="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-4 font-mono text-center space-y-2 transition-all"
                :style="{ width: form.impressora_largura === 58 ? '180px' : '220px' }"
              >
                <img v-if="form.logo_base64" :src="form.logo_base64" class="h-10 mx-auto object-contain" />
                <div v-else class="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center mx-auto">
                  <UtensilsCrossed :size="16" class="text-white" />
                </div>
                <p class="font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-widest leading-tight"
                  :class="form.impressora_largura === 58 ? 'text-[9px]' : 'text-[11px]'">
                  {{ form.nome_restaurante || 'Restaurante PDV' }}
                </p>
                <p class="text-[8px] text-neutral-400">28/06/26 14:30 · Operador</p>
                <div class="border-t border-b border-dashed border-neutral-300 dark:border-neutral-600 py-2 my-1">
                  <p class="font-black text-neutral-900 dark:text-white uppercase"
                    :class="form.impressora_largura === 58 ? 'text-base' : 'text-lg'">
                    PRODUTO
                  </p>
                </div>
                <p class="text-[8px] text-neutral-400">F1234567890</p>
                <p class="text-[8px] text-neutral-500 italic">{{ form.mensagem_ficha || 'Obrigado pela preferência!' }}</p>
                <div v-if="form.impressora_copias > 1" class="flex items-center justify-center gap-1 pt-1">
                  <span v-for="c in form.impressora_copias" :key="c"
                    class="w-4 h-4 rounded bg-orange-100 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800" />
                  <span class="text-[8px] text-orange-500 font-bold ml-1">{{ form.impressora_copias }}×</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ImageIcon, Upload, Save, Loader2, UtensilsCrossed, Printer, FileText, Eye, Minus, Plus } from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import { useConfigStore } from '~/stores/configuracoes'
import { useToastStore }  from '~/stores/toast'

definePageMeta({ layout: false })

const configStore = useConfigStore()
const toastStore  = useToastStore()

const inputLogoRef = ref<HTMLInputElement | null>(null)
const salvando     = ref(false)

const larguras = [
  { value: 58, label: '58 mm', desc: 'Bobina pequena' },
  { value: 80, label: '80 mm', desc: 'Bobina padrão' }
]

const form = reactive({
  nome_restaurante:         '',
  logo_base64:              null as string | null,
  mensagem_ficha:           '',
  impressora_largura:       80,
  impressora_copias:        1,
  impressora_auto_imprimir: false
})

onMounted(async () => {
  await configStore.carregar()
  form.nome_restaurante         = configStore.nome_restaurante
  form.logo_base64              = configStore.logo_base64
  form.mensagem_ficha           = configStore.mensagem_ficha
  form.impressora_largura       = configStore.impressora_largura
  form.impressora_copias        = configStore.impressora_copias
  form.impressora_auto_imprimir = configStore.impressora_auto_imprimir
})

function onLogoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 1_000_000) {
    toastStore.error('Logo muito grande', 'Use uma imagem menor que 1 MB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => { form.logo_base64 = reader.result as string }
  reader.readAsDataURL(file)
  ;(e.target as HTMLInputElement).value = ''
}

async function salvar() {
  if (!form.nome_restaurante.trim()) {
    toastStore.error('Informe o nome do estabelecimento')
    return
  }
  salvando.value = true
  try {
    await configStore.salvar({
      nome_restaurante:         form.nome_restaurante.trim(),
      logo_base64:              form.logo_base64,
      mensagem_ficha:           form.mensagem_ficha.trim() || 'Obrigado pela preferência!',
      impressora_largura:       form.impressora_largura,
      impressora_copias:        form.impressora_copias,
      impressora_auto_imprimir: form.impressora_auto_imprimir
    })
    toastStore.success('Configurações salvas!')
  } catch (e: any) {
    toastStore.error('Erro ao salvar', e?.message)
  } finally {
    salvando.value = false
  }
}
</script>
