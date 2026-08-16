<template>
  <div class="min-h-screen transition-colors duration-200 com-sidebar">
    <Sidebar />
    <Navbar />

    <main class="p-6 max-w-5xl mx-auto">

      <!-- HEADER -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-1 h-8 bg-orange-500 rounded-full shrink-0"></div>
        <div>
          <h1 class="text-2xl font-black text-gray-900 dark:text-white">Administração</h1>
          <p class="text-sm text-gray-500 dark:text-white/50 mt-0.5">Gerencie funcionários, categorias e métodos de pagamento</p>
        </div>
      </div>

      <!-- ABAS -->
      <div class="flex flex-wrap gap-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-xl p-1 w-fit mb-6">
        <button v-for="tab in tabs" :key="tab.id" @click="abaAtiva = tab.id"
          class="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-black transition-all"
          :class="abaAtiva === tab.id ? 'bg-orange-500 text-white' : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white'">
          <component :is="tab.icon" :size="12" /> {{ tab.label }}
        </button>
      </div>

      <!-- ══ FUNCIONÁRIOS ══════════════════════════════════════ -->
      <div v-if="abaAtiva === 'funcionarios'">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-gray-500 dark:text-white/50">{{ funcionarios.length }} funcionário(s)</p>
          <button @click="abrirModalFunc(null)"
            class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5">
            <Plus :size="13" /> Novo Funcionário
          </button>
        </div>

        <div class="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/[0.08] rounded-2xl overflow-hidden">
          <div v-if="loadingFunc" class="p-8 text-center text-sm text-gray-400 dark:text-white/40">Carregando...</div>
          <div v-else-if="!funcionarios.length" class="p-8 text-center text-sm text-gray-400 dark:text-white/40">Nenhum funcionário cadastrado</div>
          <table v-else class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-white/[0.04]">
              <tr>
                <th class="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Nome</th>
                <th class="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Cargo</th>
                <th class="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">E-mail</th>
                <th class="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Status</th>
                <th class="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in funcionarios" :key="f.id"
                class="border-t border-gray-100 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td class="px-5 py-3">
                  <p class="text-xs font-black text-gray-900 dark:text-white">{{ f.nome }}</p>
                  <p v-if="f.cartao_rfid" class="text-[10px] text-gray-400 dark:text-white/40 font-mono">RFID: {{ f.cartao_rfid }}</p>
                </td>
                <td class="px-5 py-3">
                  <span class="text-[10px] font-black px-2 py-0.5 rounded-full capitalize" :class="corCargo(f.cargo)">{{ f.cargo }}</span>
                </td>
                <td class="px-5 py-3 text-xs text-gray-500 dark:text-white/50">{{ f.email || '—' }}</td>
                <td class="px-5 py-3 text-center">
                  <button @click="toggleAtivo(f)"
                    class="text-[10px] font-black px-2 py-0.5 rounded-full transition-all"
                    :class="f.ativo ? 'bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25' : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 hover:bg-gray-200 dark:hover:bg-white/[0.08]'">
                    {{ f.ativo ? 'Ativo' : 'Inativo' }}
                  </button>
                </td>
                <td class="px-5 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button @click="abrirModalFunc(f)"
                      class="h-7 px-3 rounded-lg text-[11px] font-black text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
                      Editar
                    </button>
                    <button v-if="f.id !== authStore.usuario?.id" @click="excluirFunc(f)"
                      class="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-white/40 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-all">
                      <Trash2 :size="13" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ CATEGORIAS ════════════════════════════════════════ -->
      <div v-else-if="abaAtiva === 'categorias'">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-gray-500 dark:text-white/50">{{ categorias.length }} categoria(s)</p>
          <button @click="abrirModalCat(null)"
            class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5">
            <Plus :size="13" /> Nova Categoria
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="cat in categorias" :key="cat.id"
            class="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <Tag :size="14" class="text-orange-500" />
              </div>
              <p class="text-sm font-black text-gray-900 dark:text-white">{{ cat.nome }}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button @click="alternarCozinha(cat)"
                :title="cat.vai_cozinha ? 'Itens vão para a cozinha — clique para desativar' : 'Itens NÃO vão para a cozinha — clique para ativar'"
                class="h-7 px-2 rounded-lg flex items-center gap-1 justify-center text-[10px] font-black transition-all"
                :class="cat.vai_cozinha
                  ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                  : 'text-gray-300 dark:text-white/20 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-400 dark:hover:text-white/40'">
                <ChefHat :size="12" />
              </button>
              <button @click="abrirModalCat(cat)"
                class="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
                <Pencil :size="12" />
              </button>
              <button @click="excluirCategoria(cat)"
                class="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-white/40 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-all">
                <Trash2 :size="12" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ PERFIS ═════════════════════════════════════════════ -->
      <div v-else-if="abaAtiva === 'perfis'">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-gray-500 dark:text-white/50">{{ perfis.length }} perfil(s)</p>
          <div class="flex items-center gap-2">
            <button v-if="perfis.length" @click="autoAtribuirPerfis" :disabled="atribuindo"
              class="h-9 px-4 rounded-xl border border-orange-500/30 text-orange-500 dark:text-orange-400 text-xs font-black hover:bg-orange-500/10 disabled:opacity-50 transition-all flex items-center gap-1.5">
              <Users :size="13" />
              {{ atribuindo ? 'Atribuindo…' : 'Atribuir por cargo' }}
            </button>
            <button @click="abrirModalPerfil(null)"
              class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5">
              <Plus :size="13" /> Novo Perfil
            </button>
          </div>
        </div>

        <div v-if="!perfis.length" class="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-8 text-center">
          <p class="text-sm text-gray-400 dark:text-white/40 mb-3">Nenhum perfil criado. Usuários usam as permissões padrão do cargo.</p>
          <button @click="seedPerfis" :disabled="seedando"
            class="h-9 px-5 rounded-xl border border-orange-500/30 text-orange-500 dark:text-orange-400 text-xs font-black hover:bg-orange-500/10 disabled:opacity-50 transition-all">
            {{ seedando ? 'Criando...' : 'Criar perfis padrão' }}
          </button>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="p in perfis" :key="p.id"
            class="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4 space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <ShieldCheck :size="15" class="text-orange-400 shrink-0" />
                  <p class="text-sm font-black text-gray-900 dark:text-white">{{ p.nome }}</p>
                </div>
                <p v-if="p.descricao" class="text-[11px] text-gray-400 dark:text-white/40 mt-0.5 ml-5">{{ p.descricao }}</p>
                <p class="text-[11px] text-gray-400 dark:text-white/30 mt-0.5 ml-5">{{ p.total_usuarios }} usuário(s) vinculado(s)</p>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button @click="abrirModalPerfil(p)"
                  class="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
                  <Pencil :size="13" />
                </button>
                <button @click="excluirPerfil(p)"
                  class="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-white/40 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-all">
                  <Trash2 :size="13" />
                </button>
              </div>
            </div>

            <!-- resumo das permissões -->
            <div class="flex flex-wrap gap-1.5">
              <template v-for="grupo in GRUPOS_PERMISSOES" :key="grupo.label">
                <template v-for="item in grupo.itens" :key="item.key">
                  <span v-if="p.permissoes[item.key]"
                    class="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 dark:text-orange-400">
                    {{ item.label }}
                  </span>
                </template>
              </template>
              <span v-if="!Object.values(p.permissoes).some(Boolean)"
                class="text-[10px] text-gray-400 dark:text-white/20 italic">Nenhuma permissão ativa</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ MÉTODOS ════════════════════════════════════════════ -->
      <div v-else-if="abaAtiva === 'metodos'">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-gray-500 dark:text-white/50">{{ metodos.length }} método(s)</p>
          <button @click="modalMetodoAberto = true"
            class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5">
            <Plus :size="13" /> Novo Método
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="m in metodos" :key="m.id"
            class="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                :class="m.ativo ? 'bg-green-500/15' : 'bg-gray-100 dark:bg-white/[0.06]'">
                <CreditCard :size="14" :class="m.ativo ? 'text-green-400' : 'text-gray-400 dark:text-white/30'" />
              </div>
              <div>
                <p class="text-sm font-black text-gray-900 dark:text-white">{{ m.nome }}</p>
                <p class="text-[10px]" :class="m.ativo ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-white/30'">
                  {{ m.ativo ? 'Ativo' : 'Inativo' }}
                </p>
              </div>
            </div>
            <button @click="toggleMetodo(m)"
              class="h-8 px-3 rounded-xl text-xs font-black border transition-all"
              :class="m.ativo
                ? 'border-red-500/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                : 'border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10'">
              {{ m.ativo ? 'Desativar' : 'Ativar' }}
            </button>
          </div>
        </div>
      </div>

    </main>

    <!-- MODAL FUNCIONÁRIO -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalFunc" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="modalFunc = false">
          <div class="bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 class="text-lg font-black text-gray-900 dark:text-white mb-5">
              {{ funcForm.id ? 'Editar Funcionário' : 'Novo Funcionário' }}
            </h2>

            <div class="space-y-3">
              <div>
                <label for="fNome" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1.5">Nome *</label>
                <input id="fNome" v-model="funcForm.nome" type="text" placeholder="Nome completo"
                  class="w-full h-11 px-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25" />
              </div>
              <div>
                <label for="fCargo" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1.5">Cargo *</label>
                <select id="fCargo" v-model="funcForm.cargo"
                  class="w-full h-11 px-4 bg-gray-50 dark:!bg-white/[0.06] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl text-sm outline-none focus:border-orange-500 transition-all appearance-none">
                  <option value="">Selecione...</option>
                  <option value="administrador">Administrador</option>
                  <option value="garcom">Garçom</option>
                  <option value="caixa">Caixa</option>
                  <option value="cozinha">Cozinha</option>
                </select>
              </div>
              <div>
                <label for="fEmail" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1.5">E-mail</label>
                <input id="fEmail" v-model="funcForm.email" type="email" placeholder="email@exemplo.com"
                  class="w-full h-11 px-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25" />
              </div>
              <div>
                <label for="fSenha" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1.5">
                  {{ funcForm.id ? 'Nova Senha (deixe vazio para manter)' : 'Senha' }}
                </label>
                <input id="fSenha" v-model="funcForm.senha" type="password" placeholder="••••••••"
                  class="w-full h-11 px-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25" />
              </div>
              <div>
                <label for="fPerfil" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1.5">Perfil de Permissões</label>
                <div class="flex gap-2 items-center">
                  <select id="fPerfil" v-model="funcForm.perfil_id"
                    class="flex-1 h-11 px-4 bg-gray-50 dark:!bg-white/[0.06] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl text-sm outline-none focus:border-orange-500 transition-all appearance-none">
                    <option :value="null">Sem perfil</option>
                    <option v-for="p in perfis" :key="p.id" :value="p.id">{{ p.nome }}</option>
                  </select>
                  <button
                    v-if="funcForm.perfil_id"
                    type="button"
                    @click="funcForm.perfil_id = null"
                    title="Remover perfil vinculado"
                    class="h-11 w-11 shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all flex items-center justify-center"
                  >
                    <X :size="15" />
                  </button>
                </div>
                <p v-if="!perfis.length" class="text-[10px] text-yellow-500 dark:text-yellow-400 mt-1">
                  Nenhum perfil cadastrado. Crie um perfil na aba "Perfis" primeiro.
                </p>
              </div>
              <div>
                <label for="fRfid" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1.5">Cartão RFID</label>
                <input id="fRfid" v-model="funcForm.cartao_rfid" type="text" placeholder="Código do cartão"
                  class="w-full h-11 px-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm font-mono outline-none focus:border-orange-500/70 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25" />
              </div>
            </div>

            <div v-if="erroFunc" class="mt-3 text-xs text-red-500 font-bold">{{ erroFunc }}</div>

            <div class="flex gap-3 mt-6">
              <button @click="modalFunc = false"
                class="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 text-sm font-black transition-all hover:bg-gray-50 dark:hover:bg-white/5">
                Cancelar
              </button>
              <button @click="salvarFunc" :disabled="salvandoFunc"
                class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 active:scale-95 text-white text-sm font-black transition-all">
                {{ salvandoFunc ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL CATEGORIA -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalCat" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="modalCat = false">
          <div class="bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 class="text-lg font-black text-gray-900 dark:text-white mb-5">{{ catForm.id ? 'Editar' : 'Nova' }} Categoria</h2>
            <label for="cNome" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">Nome *</label>
            <input id="cNome" v-model="catForm.nome" type="text" placeholder="Ex: Bebidas"
              class="w-full h-11 px-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25 mb-5" />
            <div v-if="erroCat" class="mb-3 text-xs text-red-500 font-bold">{{ erroCat }}</div>
            <div class="flex gap-3">
              <button @click="modalCat = false"
                class="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 text-sm font-black hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                Cancelar
              </button>
              <button @click="salvarCategoria" :disabled="salvandoCat"
                class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 active:scale-95 text-white text-sm font-black transition-all">
                {{ salvandoCat ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL PERFIL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalPerfil" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="modalPerfil = false">
          <div class="bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 class="text-lg font-black text-gray-900 dark:text-white mb-5">
              {{ perfilForm.id ? 'Editar Perfil' : 'Novo Perfil' }}
            </h2>

            <div class="space-y-3 mb-5">
              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1.5">Nome *</label>
                <input v-model="perfilForm.nome" type="text" placeholder="Ex: Caixa Sênior"
                  class="w-full h-11 px-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25" />
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1.5">Descrição</label>
                <input v-model="perfilForm.descricao" type="text" placeholder="Descrição opcional"
                  class="w-full h-11 px-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25" />
              </div>
            </div>

            <!-- Permissões agrupadas -->
            <div class="space-y-4">
              <div v-for="grupo in GRUPOS_PERMISSOES" :key="grupo.label">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/30 mb-2">{{ grupo.label }}</p>
                <div class="space-y-1">
                  <button v-for="item in grupo.itens" :key="item.key"
                    @click="perfilForm.permissoes[item.key] = !perfilForm.permissoes[item.key]"
                    class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all"
                    :class="perfilForm.permissoes[item.key]
                      ? 'bg-orange-500/10 border-orange-500/30 text-gray-900 dark:text-white'
                      : 'bg-gray-50 dark:bg-white/[0.03] border-gray-100 dark:border-white/[0.06] text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06]'">
                    <span class="text-xs font-bold">{{ item.label }}</span>
                    <div class="w-8 h-4 rounded-full relative transition-colors shrink-0"
                      :class="perfilForm.permissoes[item.key] ? 'bg-orange-500' : 'bg-gray-200 dark:bg-white/10'">
                      <div class="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                        :class="perfilForm.permissoes[item.key] ? 'left-4' : 'left-0.5'" />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div v-if="erroPerfil" class="mt-3 text-xs text-red-500 font-bold">{{ erroPerfil }}</div>

            <div class="flex gap-3 mt-6">
              <button @click="modalPerfil = false"
                class="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 text-sm font-black hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                Cancelar
              </button>
              <button @click="salvarPerfil" :disabled="salvandoPerfil"
                class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 active:scale-95 text-white text-sm font-black transition-all">
                {{ salvandoPerfil ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL MÉTODO -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalMetodoAberto" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="modalMetodoAberto = false">
          <div class="bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 class="text-lg font-black text-gray-900 dark:text-white mb-5">Novo Método de Pagamento</h2>
            <label for="mNome" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">Nome *</label>
            <input id="mNome" v-model="novoMetodo" type="text" placeholder="Ex: Pix"
              class="w-full h-11 px-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25 mb-5" />
            <div class="flex gap-3">
              <button @click="modalMetodoAberto = false"
                class="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 text-sm font-black hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                Cancelar
              </button>
              <button @click="criarMetodo" :disabled="!novoMetodo.trim()"
                class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 active:scale-95 text-white text-sm font-black transition-all">
                Criar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Users, Tag, CreditCard, Plus, Pencil, Trash2, ChefHat, ShieldCheck, X } from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: false })

const api        = useApi()
const toastStore = useToastStore()
const authStore  = useAuthStore()

const GRUPOS_PERMISSOES = [
  { label: 'Atendimento', itens: [
    { key: 'adicionarPedido',    label: 'Adicionar e editar pedidos' },
    { key: 'cancelarItemPedido', label: 'Cancelar item de pedido' },
    { key: 'abrirMesa',          label: 'Abrir mesa' },
    { key: 'fecharMesa',         label: 'Fechar mesa' },
  ]},
  { label: 'Financeiro', itens: [
    { key: 'gerenciarCaixa',  label: 'Gerenciar caixa' },
    { key: 'verRelatorios',   label: 'Ver relatórios' },
  ]},
  { label: 'Cozinha', itens: [
    { key: 'verCozinha', label: 'Visualizar fila da cozinha' },
  ]},
  { label: 'Gestão', itens: [
    { key: 'gerenciarProdutos',       label: 'Gerenciar produtos e categorias' },
    { key: 'gerenciarConfiguracoes',  label: 'Acessar configurações' },
  ]},
]

const tabs = [
  { id: 'funcionarios', label: 'Funcionários', icon: Users },
  { id: 'perfis',       label: 'Perfis',       icon: ShieldCheck },
  { id: 'categorias',   label: 'Categorias',   icon: Tag },
  { id: 'metodos',      label: 'Métodos',       icon: CreditCard }
]
const abaAtiva = ref('funcionarios')

// ── Funcionários ─────────────────────────────
const funcionarios = ref<any[]>([])
const loadingFunc  = ref(false)
const modalFunc    = ref(false)
const salvandoFunc = ref(false)
const erroFunc     = ref('')
const funcForm     = reactive({ id: null as number | null, nome: '', cargo: '', email: '', senha: '', cartao_rfid: '', perfil_id: null as number | null })

function corCargo(cargo: string) {
  if (cargo === 'administrador') return 'bg-purple-500/15 text-purple-400'
  if (cargo === 'garcom')        return 'bg-blue-500/15 text-blue-400'
  if (cargo === 'caixa')         return 'bg-green-500/15 text-green-400'
  if (cargo === 'cozinha')       return 'bg-orange-500/15 text-orange-400'
  return 'bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/40'
}

async function carregarFuncionarios() {
  loadingFunc.value = true
  try { funcionarios.value = await api.get<any[]>('/users') } finally { loadingFunc.value = false }
}

function abrirModalFunc(f: any) {
  erroFunc.value = ''
  if (f) {
    Object.assign(funcForm, { id: f.id, nome: f.nome, cargo: f.cargo, email: f.email || '', senha: '', cartao_rfid: f.cartao_rfid || '', perfil_id: f.perfil_id || null })
  } else {
    Object.assign(funcForm, { id: null, nome: '', cargo: '', email: '', senha: '', cartao_rfid: '', perfil_id: null })
  }
  modalFunc.value = true
}

async function salvarFunc() {
  if (!funcForm.nome.trim() || !funcForm.cargo) { erroFunc.value = 'Nome e cargo são obrigatórios'; return }
  salvandoFunc.value = true; erroFunc.value = ''
  try {
    const payload = { nome: funcForm.nome, email: funcForm.email || null, cargo: funcForm.cargo,
      cartao_rfid: funcForm.cartao_rfid || null, perfil_id: funcForm.perfil_id || null,
      ...(funcForm.senha ? { senha: funcForm.senha } : {}) }
    if (funcForm.id) await api.put(`/users/${funcForm.id}`, payload)
    else await api.post('/users', payload)
    toastStore.success(funcForm.id ? 'Funcionário atualizado!' : 'Funcionário criado!')
    modalFunc.value = false
    await carregarFuncionarios()
  } catch (e: any) { erroFunc.value = e?.message || 'Erro ao salvar' } finally { salvandoFunc.value = false }
}

async function toggleAtivo(f: any) {
  f.ativo = !f.ativo
  try { await api.patch(`/users/${f.id}/ativo`, { ativo: f.ativo }) }
  catch { f.ativo = !f.ativo; toastStore.error('Erro ao alterar status') }
}

async function excluirFunc(f: any) {
  if (!confirm(`Excluir o funcionário "${f.nome}"? Esta ação não pode ser desfeita.`)) return
  try {
    await api.delete(`/users/${f.id}`)
    toastStore.success('Funcionário excluído!')
    await carregarFuncionarios()
  } catch (e: any) { toastStore.error(e?.message || 'Erro ao excluir funcionário') }
}

// ── Perfis ────────────────────────────────────
const perfis          = ref<any[]>([])
const modalPerfil     = ref(false)
const salvandoPerfil  = ref(false)
const erroPerfil      = ref('')

function todasPermissoesFalse() {
  const obj: Record<string, boolean> = {}
  GRUPOS_PERMISSOES.forEach(g => g.itens.forEach(i => { obj[i.key] = false }))
  return obj
}

const perfilForm = reactive({
  id: null as number | null,
  nome: '',
  descricao: '',
  permissoes: todasPermissoesFalse() as Record<string, boolean>
})

async function carregarPerfis() {
  try { perfis.value = await api.perfis.listar() } catch {}
}

function abrirModalPerfil(p: any) {
  erroPerfil.value = ''
  if (p) {
    perfilForm.id = p.id
    perfilForm.nome = p.nome
    perfilForm.descricao = p.descricao || ''
    perfilForm.permissoes = { ...todasPermissoesFalse(), ...p.permissoes }
  } else {
    perfilForm.id = null
    perfilForm.nome = ''
    perfilForm.descricao = ''
    perfilForm.permissoes = todasPermissoesFalse()
  }
  modalPerfil.value = true
}

async function salvarPerfil() {
  if (!perfilForm.nome.trim()) { erroPerfil.value = 'Nome é obrigatório'; return }
  salvandoPerfil.value = true; erroPerfil.value = ''
  try {
    const payload = { nome: perfilForm.nome, descricao: perfilForm.descricao, permissoes: perfilForm.permissoes }
    if (perfilForm.id) await api.perfis.atualizar(perfilForm.id, payload)
    else await api.perfis.criar(payload)
    toastStore.success(perfilForm.id ? 'Perfil atualizado!' : 'Perfil criado!')
    modalPerfil.value = false
    await carregarPerfis()
  } catch (e: any) { erroPerfil.value = e?.message || 'Erro ao salvar' } finally { salvandoPerfil.value = false }
}

async function excluirPerfil(p: any) {
  if (!confirm(`Excluir o perfil "${p.nome}"? Os usuários vinculados voltarão às permissões padrão do cargo.`)) return
  try {
    await api.perfis.excluir(p.id)
    toastStore.success('Perfil excluído!')
    await Promise.all([carregarPerfis(), carregarFuncionarios()])
  } catch (e: any) { toastStore.error(e?.message || 'Erro ao excluir') }
}

const seedando = ref(false)
async function seedPerfis() {
  seedando.value = true
  try {
    await api.post('/perfis/seed')
    toastStore.success('Perfis padrão criados!')
    await carregarPerfis()
  } catch (e: any) { toastStore.error(e?.message || 'Erro ao criar perfis padrão') }
  finally { seedando.value = false }
}

const atribuindo = ref(false)
async function autoAtribuirPerfis() {
  if (!confirm('Atribuir automaticamente o perfil padrão a todos os funcionários sem perfil, de acordo com o cargo?\n\nAdministradores são ignorados.')) return
  atribuindo.value = true
  try {
    const res = await api.post<any>('/perfis/auto-atribuir')
    const aviso = res.perfisFaltando?.length
      ? ` (perfis não encontrados: ${res.perfisFaltando.join(', ')})`
      : ''
    toastStore.success('Perfis atribuídos!', `${res.atualizados} funcionário(s) atualizado(s)${aviso}`)
    await carregarFuncionarios()
  } catch (e: any) {
    toastStore.error(e?.message || 'Erro ao atribuir perfis')
  } finally {
    atribuindo.value = false
  }
}

// ── Categorias ────────────────────────────────
const categorias   = ref<any[]>([])
const modalCat     = ref(false)
const salvandoCat  = ref(false)
const erroCat      = ref('')
const catForm      = reactive({ id: null as number | null, nome: '' })

async function carregarCategorias() {
  try { categorias.value = await api.get<any[]>('/categorias') } catch {}
}

async function alternarCozinha(cat: any) {
  try {
    const res = await api.patch<{ vai_cozinha: number }>(`/categorias/${cat.id}/cozinha`, {
      vai_cozinha: !cat.vai_cozinha
    })
    cat.vai_cozinha = res.vai_cozinha
    toastStore.success(cat.vai_cozinha
      ? `Itens de "${cat.nome}" agora aparecem na cozinha`
      : `Itens de "${cat.nome}" não vão mais para a cozinha`)
  } catch (e: any) {
    toastStore.error(e?.message || 'Erro ao atualizar categoria')
  }
}

function abrirModalCat(c: any) {
  erroCat.value = ''
  catForm.id   = c?.id ?? null
  catForm.nome = c?.nome ?? ''
  modalCat.value = true
}

async function salvarCategoria() {
  if (!catForm.nome.trim()) { erroCat.value = 'Nome é obrigatório'; return }
  salvandoCat.value = true; erroCat.value = ''
  try {
    if (catForm.id) await api.put(`/categorias/${catForm.id}`, { nome: catForm.nome })
    else await api.post('/categorias', { nome: catForm.nome })
    toastStore.success(catForm.id ? 'Categoria atualizada!' : 'Categoria criada!')
    modalCat.value = false
    await carregarCategorias()
  } catch (e: any) { erroCat.value = e?.message || 'Erro ao salvar' } finally { salvandoCat.value = false }
}

async function excluirCategoria(c: any) {
  if (!confirm(`Excluir a categoria "${c.nome}"?`)) return
  try {
    await api.delete(`/categorias/${c.id}`)
    toastStore.success('Categoria excluída!')
    await carregarCategorias()
  } catch (e: any) { toastStore.error(e?.message || 'Erro ao excluir') }
}

// ── Métodos ───────────────────────────────────
const metodos            = ref<any[]>([])
const modalMetodoAberto  = ref(false)
const novoMetodo         = ref('')

async function carregarMetodos() {
  try { metodos.value = await api.get<any[]>('/pagamentos/metodos/todos') } catch {}
}

async function toggleMetodo(m: any) {
  m.ativo = !m.ativo
  try { await api.patch(`/pagamentos/metodos/${m.id}`, { ativo: m.ativo }) }
  catch { m.ativo = !m.ativo; toastStore.error('Erro ao alterar') }
}

async function criarMetodo() {
  if (!novoMetodo.value.trim()) return
  try {
    await api.post('/pagamentos/metodos', { nome: novoMetodo.value.trim() })
    toastStore.success('Método criado!')
    novoMetodo.value = ''
    modalMetodoAberto.value = false
    await carregarMetodos()
  } catch (e: any) { toastStore.error(e?.message || 'Erro ao criar') }
}

onMounted(() => {
  carregarFuncionarios()
  carregarPerfis()
  carregarCategorias()
  carregarMetodos()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
